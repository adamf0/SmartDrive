import { createWorker } from 'tesseract.js';
import type { OCRBlock, KeyValuePair } from '../types/vision';

export interface OCRProgressCallback {
  (status: string, progress: number): void;
}

export async function processImageOCR(
  imageSrc: string,
  onProgress?: OCRProgressCallback
): Promise<{
  hasText: boolean;
  rawText: string;
  blocks: OCRBlock[];
  keyValuePairs: KeyValuePair[];
  language: string;
}> {
  try {
    if (onProgress) onProgress('Memuat Engine OCR Tesseract.js...', 0.1);

    // Initialize Tesseract worker for Indonesian + English
    const worker = await createWorker('ind+eng');

    if (onProgress) onProgress('Pemindaian Karakter Teks Visual...', 0.4);

    const { data } = await worker.recognize(imageSrc);
    await worker.terminate();

    if (onProgress) onProgress('Menganalisis Struktur Teks & Key-Value...', 0.85);

    const rawText = data.text ? data.text.trim() : '';
    const hasText = rawText.length > 2;

    const blocks: OCRBlock[] = [];
    const lines = (data as any).lines || (data as any).blocks?.flatMap((b: any) => b.paragraphs?.flatMap((p: any) => p.lines)) || [];

    if (lines && lines.length > 0) {
      lines.forEach((line: any, index: number) => {
        const text = line.text ? line.text.trim() : '';
        if (!text) return;

        const isHeading = index === 0 || (text.toUpperCase() === text && text.length < 35);
        const isKeyValue = text.includes(':') || text.includes('=') || /Rp|\$|EUR|IDR|\d+,\d{2}|\d+\.\d{3}/i.test(text);
        const isNumber = /^\d+$/.test(text.replace(/\s+/g, ''));

        let blockType: OCRBlock['type'] = 'body';
        if (isHeading) blockType = 'heading';
        else if (isKeyValue) blockType = 'key-value';
        else if (isNumber) blockType = 'number';

        const bbox = line.bbox
          ? {
              x: line.bbox.x0,
              y: line.bbox.y0,
              width: line.bbox.x1 - line.bbox.x0,
              height: line.bbox.y1 - line.bbox.y0,
            }
          : { x: 10, y: 10 + index * 25, width: 200, height: 20 };

        blocks.push({
          id: `ocr-block-${index}-${Date.now()}`,
          text,
          confidence: Math.round(line.confidence || 85),
          bbox,
          type: blockType,
        });
      });
    }

    const keyValuePairs = extractKeyValuePairsFromText(rawText);

    if (onProgress) onProgress('Selesai OCR!', 1.0);

    return {
      hasText,
      rawText,
      blocks,
      keyValuePairs,
      language: hasText ? 'Indonesian / English' : 'Tidak Ada Teks',
    };
  } catch (error) {
    console.warn('OCR Processing error:', error);
    // Pure fallback with zero hardcoded strings
    return {
      hasText: false,
      rawText: '',
      blocks: [],
      keyValuePairs: [],
      language: 'Tidak Ada Teks',
    };
  }
}

// Pure dynamic Key-Value extractor using Regex patterns
function extractKeyValuePairsFromText(text: string): KeyValuePair[] {
  if (!text) return [];

  const pairs: KeyValuePair[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  lines.forEach((line) => {
    // 1. Generic Key : Value pairs
    if (line.includes(':')) {
      const parts = line.split(':');
      if (parts.length >= 2 && parts[0].trim().length > 1 && parts[1].trim().length > 0) {
        pairs.push({
          key: parts[0].trim().toUpperCase(),
          value: parts.slice(1).join(':').trim(),
          confidence: 92,
        });
        return;
      }
    }

    // 2. Generic Key = Value pairs
    if (line.includes('=')) {
      const parts = line.split('=');
      if (parts.length >= 2 && parts[0].trim().length > 1 && parts[1].trim().length > 0) {
        pairs.push({
          key: parts[0].trim().toUpperCase(),
          value: parts.slice(1).join('=').trim(),
          confidence: 90,
        });
        return;
      }
    }

    // 3. Financial / Currency detection (Rp, $, EUR, IDR, Subtotal, Total, PPN, Tax)
    const currencyMatch = line.match(/(total|subtotal|jumlah|bayar|ppn|tax|price|harga|grand total)\s*([:\-=]?)\s*(Rp\.?\s*[\d.,]+|[\d.,]+\s*IDR|\$\s*[\d.,]+|€\s*[\d.,]+)/i);
    if (currencyMatch) {
      pairs.push({
        key: currencyMatch[1].toUpperCase(),
        value: currencyMatch[3],
        confidence: 95,
      });
      return;
    }

    // 4. Date Detection (Tanggal / Date)
    const dateMatch = line.match(/(tanggal|date|tgl)\s*[:=]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i);
    if (dateMatch) {
      pairs.push({
        key: 'TANGGAL / DATE',
        value: dateMatch[2],
        confidence: 94,
      });
      return;
    }

    // 5. Code / Number / Ref Detection
    const refMatch = line.match(/(no|nomor|inv|invoice|ref|trx|resi|rek|rekening)\s*[:=]?\s*([A-Za-z0-9-]+)/i);
    if (refMatch) {
      pairs.push({
        key: refMatch[1].toUpperCase(),
        value: refMatch[2],
        confidence: 88,
      });
    }
  });

  return pairs;
}
