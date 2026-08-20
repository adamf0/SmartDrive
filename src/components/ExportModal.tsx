import React, { useState } from 'react';
import { X, Download, Copy, Check, FileJson, FileText, Table } from 'lucide-react';
import type { AnalysisResult } from '../types/vision';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResult;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  analysis,
}) => {
  const [format, setFormat] = useState<'json' | 'markdown' | 'csv'>('json');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateJson = () => JSON.stringify(analysis, null, 2);

  const generateMarkdown = () => {
    return `# Laporan Analisis Multimodal Vision AI: ${analysis.imageName}

## 1. Informasi Gambar
- **Nama File:** ${analysis.imageName}
- **Resolusi:** ${analysis.dimensions.width} x ${analysis.dimensions.height} px (${analysis.aspectRatio})
- **Ukuran File:** ${analysis.fileSizeKB} KB
- **Waktu Analisis:** ${analysis.analyzedAt}
- **Engine Vision:** ${analysis.engineUsed}

## 2. Automatic Image Captioning
- **Deskripsi Rinci (ID):** ${analysis.captions.detailedId}
- **Detailed Description (EN):** ${analysis.captions.detailedEn}
- **Ringkasan Singkat:** ${analysis.captions.shortId}
- **Alt-Text Aksesibilitas:** ${analysis.captions.altText}

## 3. Konteks Scene & Objek
- **Tipe Scene:** ${analysis.sceneContext.sceneType} (${analysis.sceneContext.primaryDomain})
- **Setting:** ${analysis.sceneContext.indoorOutdoor} | ${analysis.sceneContext.lightingCondition}
- **Atmosphere / Mood:** ${analysis.sceneContext.moodVibe}
- **Skor Komposisi:** ${analysis.sceneContext.compositionRating} / 10

### Objek Terdeteksi:
${analysis.detectedObjects.map((o) => `- **${o.labelId}** (${o.label}): ${o.confidence}% Confidence`).join('\n')}

## 4. Ekstraksi OCR Teks Terstruktur
${analysis.ocr.hasText ? `\`\`\`text\n${analysis.ocr.rawText}\n\`\`\`` : '*Tidak ada teks terdeteksi*'}

### Pasangan Key-Value:
${analysis.ocr.keyValuePairs.map((kv) => `- **${kv.key}:** ${kv.value} (${kv.confidence}%)`).join('\n')}

---
*Generated automatically by MultiVision AI v2.5*
`;
  };

  const generateCsv = () => {
    let csv = 'Category,Property,Value\n';
    csv += `Metadata,ImageName,"${analysis.imageName}"\n`;
    csv += `Metadata,Dimensions,"${analysis.dimensions.width}x${analysis.dimensions.height}"\n`;
    csv += `Caption,DetailedId,"${analysis.captions.detailedId.replace(/"/g, '""')}"\n`;
    csv += `Caption,DetailedEn,"${analysis.captions.detailedEn.replace(/"/g, '""')}"\n`;
    csv += `Scene,SceneType,"${analysis.sceneContext.sceneType}"\n`;
    analysis.ocr.keyValuePairs.forEach((kv) => {
      csv += `OCR_KeyValue,"${kv.key}","${kv.value}"\n`;
    });
    return csv;
  };

  const getContent = () => {
    if (format === 'markdown') return generateMarkdown();
    if (format === 'csv') return generateCsv();
    return generateJson();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = getContent();
    const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md';
    const mime = format === 'json' ? 'application/json' : 'text/plain';

    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vision_Analysis_${analysis.imageId}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-3xl rounded-3xl p-6 space-y-5 border border-slate-700 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Download className="w-5 h-5 text-cyan-400" />
            <span>Ekspor Hasil Analisis Multimodal</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Options */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFormat('json')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              format === 'json'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>JSON Metadata</span>
          </button>
          <button
            onClick={() => setFormat('markdown')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              format === 'markdown'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Markdown Report</span>
          </button>
          <button
            onClick={() => setFormat('csv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              format === 'csv'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>CSV Table</span>
          </button>
        </div>

        {/* Output Preview */}
        <div className="relative">
          <pre className="font-mono text-xs text-slate-200 bg-slate-950/90 p-4 rounded-2xl border border-slate-800 overflow-x-auto max-h-[320px] leading-relaxed">
            {getContent()}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Salin Ke Clipboard</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-slate-950 flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh File (.{format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
