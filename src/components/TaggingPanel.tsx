import React, { useState } from 'react';
import { Tag, Check, Copy, Sliders, Hash } from 'lucide-react';
import type { TagCategory } from '../types/vision';

interface TaggingPanelProps {
  categories: TagCategory[];
  hashtags?: string[];
}

export const TaggingPanel: React.FC<TaggingPanelProps> = ({ categories, hashtags }) => {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleCopyTag = (tagName: string) => {
    navigator.clipboard.writeText(tagName);
    setCopiedTag(tagName);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const totalTags = categories.reduce((acc, cat) => acc + cat.tags.length, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Multimodal Tagging &amp; Taksonomi Visual
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Tag kategori dan entitas visual yang terekstrak secara otomatis
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold font-mono">
          {totalTags} Tags Terdeteksi
        </span>
      </div>

      {/* 2. Categorized Tag Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-[0px_2px_12px_rgba(0,0,0,0.02)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>{cat.categoryId || cat.category}</span>
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-400">
                {cat.tags.length} tag
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {cat.tags.map((tag, tIdx) => {
                const confPct = Math.round(tag.score * 100);
                const isCopied = copiedTag === tag.nameId;
                return (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={() => handleCopyTag(tag.nameId)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 cursor-pointer transition-all duration-200 text-left"
                    title="Klik untuk salin tag"
                  >
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                      {tag.nameId}
                    </span>
                    <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md bg-white text-indigo-600 border border-slate-200 shadow-2xs">
                      {confPct}%
                    </span>
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-600 ml-0.5" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Social Hashtags Section */}
      {hashtags && hashtags.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-purple-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Rekomendasi Tagar Visual (#Hashtags)
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((h, i) => {
              const isCopied = copiedTag === h;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleCopyTag(h)}
                  className="px-3 py-1 rounded-xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{h}</span>
                  {isCopied && <Check className="w-3 h-3 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
