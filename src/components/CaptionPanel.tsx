import React, { useState } from 'react';
import { Copy, Check, MessageSquare, Sparkles } from 'lucide-react';
import type { CaptionData } from '../types/vision';

interface CaptionPanelProps {
  captions: CaptionData;
}

export const CaptionPanel: React.FC<CaptionPanelProps> = ({ captions }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Caption &amp; Narasi Konteks Dokumen &amp; Visual
          </h3>
        </div>
      </div>

      {/* 1. Detailed Narrative Caption */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 relative">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deskripsi Rinci Konteks</span>
          </span>
          <button
            onClick={() => handleCopy(captions.detailedId || captions.detailedEn, 'detailed')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            {copiedKey === 'detailed' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Salin</span>
              </>
            )}
          </button>
        </div>
        <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
          {captions.detailedId || captions.detailedEn}
        </p>
      </div>

      {/* 2. Short Summary (1 Sentence) */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Ringkasan Singkat (1 Kalimat)
          </span>
          <button
            onClick={() => handleCopy(captions.shortId || captions.shortEn, 'short')}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Salin Ringkasan Singkat"
          >
            {copiedKey === 'short' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
          {captions.shortId || captions.shortEn}
        </p>
      </div>
    </div>
  );
};
