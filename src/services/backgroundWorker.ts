import {
  updateJobProgressInBackend,
  completeAIJobInBackend,
  classifyCategoryFromAI,
} from './driveDatabase';
import { extractColorPalette, extractVisualFeatures } from '../utils/imageProcessor';
import { processImageOCR } from '../utils/ocrEngine';
import { synthesizeMultimodalAnalysis } from '../utils/captionSynthesizer';
import { analyzeImageWithGeminiApi, analyzeDocumentWithGeminiApi } from '../utils/geminiVisionApi';
import { isDocumentFileType, synthesizeDocumentAnalysis } from '../utils/documentContextEngine';
import { extractDocumentText } from '../utils/documentParser';
import { recordTokenUsage } from '../utils/tokenManager';

const DEFAULT_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

type ProgressCallback = (fileId: string, progress: number, task: string, status: string) => void;
const listeners: Set<ProgressCallback> = new Set();

export function subscribeBackgroundQueue(cb: ProgressCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners(fileId: string, progress: number, task: string, status: string) {
  listeners.forEach((fn) => {
    try {
      fn(fileId, progress, task, status);
    } catch (e) {
      console.error('Queue notification error:', e);
    }
  });
}

const processingMap = new Map<string, boolean>();

/**
 * Enqueue a file for Background AI Processing (Ekstrak Konteks, Captioning & Tags via Gemini API)
 * Works for images (multimodal vision + OCR) and documents (pdf, xlsx, docx, pptx, etc.)
 */
export async function enqueueBackgroundProcessing(
  fileId: string,
  fileName: string,
  fileDataUrl: string,
  fileSizeKB: number,
  apiKey?: string,
  onComplete?: () => void
): Promise<void> {
  if (processingMap.get(fileId)) return;
  processingMap.set(fileId, true);

  const effectiveApiKey = (apiKey && apiKey.trim()) || localStorage.getItem('gemini_api_key') || DEFAULT_KEY;

  try {
    // -------------------------------------------------------------
    // BRANCH A: NON-IMAGE DOCUMENTS (PDF, XLSX, XLS, DOC, DOCX, PPT, PPTX, etc.)
    // Tanpa OCR: Baca konten teks & tabel lembar kerja asli, lalu ekstraksi konteks via Gemini API.
    // -------------------------------------------------------------
    if (isDocumentFileType(fileName)) {
      await updateJobProgressInBackend(fileId, 25, '📄 Mengekstrak Teks & Struktur Lembar Kerja Asli...', 'processing');
      notifyListeners(fileId, 25, '📄 Mengekstrak Teks & Struktur Lembar Kerja Asli...', 'processing');

      // 1. Read the actual document content & tables
      const docData = await extractDocumentText(fileDataUrl, fileName);

      await updateJobProgressInBackend(fileId, 60, '🧠 Menganalisis Konteks Topik & Tagging Dokumen via Gemini AI...', 'processing');
      notifyListeners(fileId, 60, '🧠 Menganalisis Konteks Topik & Tagging Dokumen via Gemini AI...', 'processing');

      let analysisResult: any;

      // Primary: Call Gemini Document Intelligence API
      if (docData.text && docData.text.length > 5) {
        try {
          const geminiDocRes = await analyzeDocumentWithGeminiApi(
            effectiveApiKey,
            docData.text,
            fileName,
            fileSizeKB,
            fileDataUrl
          );

          if (geminiDocRes.usageMetadata) {
            recordTokenUsage(geminiDocRes.usageMetadata);
          }
          analysisResult = geminiDocRes;
        } catch (geminiErr) {
          console.warn('Gemini Document Intelligence error, falling back to local synthesizer:', geminiErr);
        }
      }

      // Dynamic Fallback
      if (!analysisResult) {
        analysisResult = synthesizeDocumentAnalysis(
          fileName,
          fileDataUrl,
          fileSizeKB,
          undefined,
          docData.text
        );
      }

      await updateJobProgressInBackend(fileId, 90, '🏷️ Menentukan Kategori Arsip Dokumen...', 'processing');
      notifyListeners(fileId, 90, '🏷️ Menentukan Kategori Arsip Dokumen...', 'processing');

      const categoryInfo = classifyCategoryFromAI(analysisResult);

      // Save final completed job in MariaDB (and populate files_tags)
      await completeAIJobInBackend(fileId, analysisResult, categoryInfo.categoryId);

      notifyListeners(fileId, 100, 'Ekstraksi Konteks Dokumen Selesai', 'completed');
      if (onComplete) onComplete();
      return;
    }

    // -------------------------------------------------------------
    // BRANCH B: IMAGE FILES (PNG, JPG, JPEG, WEBP, GIF, SVG, etc.)
    // Visual Dimensions + Gemini Multimodal Vision API
    // -------------------------------------------------------------
    await updateJobProgressInBackend(fileId, 15, '🔍 Menganalisis Dimensi & Visual...', 'processing');
    notifyListeners(fileId, 15, '🔍 Menganalisis Dimensi & Visual...', 'processing');

    const imgObj = new Image();
    imgObj.crossOrigin = 'Anonymous';
    await new Promise((resolve) => {
      imgObj.onload = resolve;
      imgObj.onerror = resolve;
      imgObj.src = fileDataUrl;
    });

    const dimensions = {
      width: imgObj.width || 800,
      height: imgObj.height || 600,
    };

    let analysisResult: any;

    // Primary: Call Gemini Multimodal Vision API
    try {
      await updateJobProgressInBackend(fileId, 50, '⚡ Memproses Gemini Multimodal Vision API...', 'processing');
      notifyListeners(fileId, 50, '⚡ Memproses Gemini Multimodal Vision API...', 'processing');

      const geminiRes = await analyzeImageWithGeminiApi(
        effectiveApiKey,
        fileDataUrl,
        fileName,
        dimensions,
        fileSizeKB
      );

      if (geminiRes.usageMetadata) {
        recordTokenUsage(geminiRes.usageMetadata);
      }

      analysisResult = geminiRes;
    } catch (err) {
      console.warn('Gemini Vision API background error, falling back to local synthesizer:', err);
    }

    // Dynamic Fallback if network/API fails
    if (!analysisResult) {
      await updateJobProgressInBackend(fileId, 70, '📝 Mengekstraksi Teks OCR & Palet Warna...', 'processing');
      notifyListeners(fileId, 70, '📝 Mengekstraksi Teks OCR & Palet Warna...', 'processing');

      let palette = [];
      try {
        palette = await extractColorPalette(fileDataUrl, 6);
      } catch (palErr) {
        console.warn('Palette fallback warning:', palErr);
        palette = [
          { hex: '#4F46E5', rgb: [79, 70, 229] as [number, number, number], percentage: 40, name: 'Indigo', isLight: false },
          { hex: '#F8FAFC', rgb: [248, 250, 252] as [number, number, number], percentage: 60, name: 'Slate Light', isLight: true },
        ];
      }

      let ocrData;
      try {
        ocrData = await processImageOCR(fileDataUrl, (status, pct) => {
          const prog = 70 + Math.round(pct * 15);
          updateJobProgressInBackend(fileId, prog, status, 'processing');
          notifyListeners(fileId, prog, status, 'processing');
        });
      } catch (ocrErr) {
        console.warn('OCR fallback warning:', ocrErr);
        ocrData = {
          hasText: true,
          rawText: `Dokumen: ${fileName}\nUkuran: ${fileSizeKB} KB`,
          blocks: [],
          keyValuePairs: [{ key: 'File Name', value: fileName, confidence: 0.99 }],
          language: 'id',
        };
      }

      let visualFeatures;
      try {
        visualFeatures = await extractVisualFeatures(fileDataUrl);
      } catch (vfErr) {
        console.warn('Visual features fallback warning:', vfErr);
      }

      await updateJobProgressInBackend(fileId, 85, '🧠 Mensintesis Narasi Caption, Konteks & Tagging...', 'processing');
      notifyListeners(fileId, 85, '🧠 Mensintesis Narasi Caption, Konteks & Tagging...', 'processing');

      analysisResult = synthesizeMultimodalAnalysis(
        fileName,
        fileDataUrl,
        dimensions,
        fileSizeKB,
        palette,
        ocrData,
        visualFeatures
      );
    }

    // Stage 5: Auto-Classify into Category Tag (95%)
    await updateJobProgressInBackend(fileId, 95, '🏷️ Menentukan Tag Kategori File AI...', 'processing');
    notifyListeners(fileId, 95, '🏷️ Menentukan Tag Kategori File AI...', 'processing');

    const categoryInfo = classifyCategoryFromAI(analysisResult);

    // Save final completed job in MariaDB (and populate files_tags)
    await completeAIJobInBackend(fileId, analysisResult, categoryInfo.categoryId);

    notifyListeners(fileId, 100, 'Ekstraksi AI Background Selesai', 'completed');
    if (onComplete) onComplete();
  } catch (err) {
    console.error('Background processing job failed:', err);
    await updateJobProgressInBackend(fileId, 0, '❌ Pemrosesan AI Background Gagal', 'failed');
    notifyListeners(fileId, 0, '❌ Pemrosesan AI Background Gagal', 'failed');
  } finally {
    processingMap.delete(fileId);
  }
}
