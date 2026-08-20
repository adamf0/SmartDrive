import React, { useState } from 'react';
import { FileText, Copy, Check, Download, Table, List, AlertCircle } from 'lucide-react';
import type { KeyValuePair, OCRBlock } from '../types/vision';

interface OcrPanelProps {
  rawText: string;
  keyValuePairs: KeyValuePair[];
  blocks: OCRBlock[];
  hasText: boolean;
  language: string;
}

export const OcrPanel: React.FC<OcrPanelProps> = ({
  rawText,
  keyValuePairs,
  blocks,
  hasText,
  language,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'structured' | 'raw' | 'blocks'>('structured');

  const handleCopyText = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OCR_Extraction_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hasText) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h4 className="text-base font-bold text-slate-200">
          Tidak Ada Teks Terdeteksi Pada Gambar
        </h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Gambar ini didominasi elemen visual/foto objek tanpa teks yang menonjol. Engine OCR Tesseract tidak menemukan teks terstruktur yang dapat diekstrak.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800/60 gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              OCR & Multimodal Text Information Extraction
            </h3>
            <p className="text-xs text-slate-400">Bahasa: {language}</p>
          </div>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setViewMode('structured')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'structured'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Data Terstruktur ({keyValuePairs.length})</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'raw'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Teks Asli (Raw)</span>
            </button>
            <button
              onClick={() => setViewMode('blocks')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'blocks'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Blok Teks ({blocks.length})</span>
            </button>
          </div>

          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Salin Teks</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadTxt}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Download TXT"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode 1: Structured Key-Value Table */}
      {viewMode === 'structured' && (
        <div className="space-y-4">
          {keyValuePairs.length > 0 ? (
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Entitas / Parameter (Key)</th>
                    <th className="py-3 px-4">Nilai Terekstrak (Value)</th>
                    <th className="py-3 px-4 text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {keyValuePairs.map((kv, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-cyan-400 font-mono">
                        {kv.key}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-100">
                        {kv.value}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {kv.confidence}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 text-center text-slate-400 text-xs">
              Tidak ada pasangan key-value otomatis yang cocok, silakan lihat tab &quot;Teks Asli (Raw)&quot; untuk seluruh teks yang terbaca.
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Raw Text View */}
      {viewMode === 'raw' && (
        <div className="glass-panel rounded-2xl p-5 space-y-2">
          <span className="text-xs font-mono text-slate-400 block">
            RAW TEXT STRING OUTPUT:
          </span>
          <pre className="font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-slate-200 bg-slate-950/80 p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-[400px]">
            {rawText}
          </pre>
        </div>
      )}

      {/* Mode 3: Text Blocks with Bounding Box Coordinates */}
      {viewMode === 'blocks' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="glass-panel rounded-xl p-3 space-y-1.5 border border-slate-800 hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                  {block.type}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {block.confidence}% Conf
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-100">{block.text}</p>
              <div className="text-[10px] font-mono text-slate-500">
                BBox: X={block.bbox.x}, Y={block.bbox.y}, W={block.bbox.width}, H={block.bbox.height}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
