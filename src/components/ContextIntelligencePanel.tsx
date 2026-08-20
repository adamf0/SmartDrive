import React from 'react';
import { BrainCircuit, Compass, Box, Sun, Star, MapPin, CheckCircle2 } from 'lucide-react';
import type { DetectedObject, SceneContext } from '../types/vision';

interface ContextIntelligencePanelProps {
  sceneContext: SceneContext;
  objects: DetectedObject[];
}

export const ContextIntelligencePanel: React.FC<ContextIntelligencePanelProps> = ({
  sceneContext,
  objects,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Pengenalan Konteks Lingkungan & Objek Gambar
          </h3>
        </div>
        <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
          <Star className="w-3.5 h-3.5 fill-amber-400" />
          <span>Skor Komposisi: {sceneContext.compositionRating} / 10</span>
        </div>
      </div>

      {/* 1. Scene Intelligence Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scene Type */}
        <div className="glass-panel rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Tipe & Klasifikasi Scene
          </span>
          <p className="text-sm font-bold text-cyan-400 leading-snug">
            {sceneContext.sceneType}
          </p>
          <span className="text-[10px] text-slate-500 block font-mono">
            {sceneContext.primaryDomain}
          </span>
        </div>

        {/* Setting Indoor/Outdoor */}
        <div className="glass-panel rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            Setting Lingkungan
          </span>
          <p className="text-sm font-bold text-slate-100">
            {sceneContext.indoorOutdoor}
          </p>
          <span className="text-[10px] text-purple-400 block font-semibold">
            {sceneContext.lightingCondition}
          </span>
        </div>

        {/* Mood & Vibe */}
        <div className="glass-panel rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            Atmosphere / Vibe
          </span>
          <p className="text-sm font-bold text-amber-300">
            {sceneContext.moodVibe}
          </p>
          <span className="text-[10px] text-slate-500 block">Visual Tone & Palette</span>
        </div>

        {/* Visual Focus Rating */}
        <div className="glass-panel rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Visual Quality Index
          </span>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full"
              style={{ width: `${sceneContext.compositionRating * 10}%` }}
            />
          </div>
          <span className="text-[10px] text-emerald-400 font-bold block pt-1">
            Excellent Sharpness & Exposure
          </span>
        </div>
      </div>

      {/* 2. Detected Objects Breakdown Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            Objek Terdeteksi & Spesifikasi ({objects.length})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {objects.map((obj) => (
            <div
              key={obj.id}
              className="glass-panel rounded-2xl p-4 space-y-2 border border-slate-800 hover:border-cyan-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  {obj.labelId}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {obj.confidence}% Conf
                </span>
              </div>

              <p className="text-xs text-slate-400 italic">
                English Name: {obj.label}
              </p>

              {obj.attributes && obj.attributes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {obj.attributes.map((attr, aIdx) => (
                    <span
                      key={aIdx}
                      className="text-[10px] font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700"
                    >
                      {attr}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Spatial Relationships Hierarchy */}
      {sceneContext.spatialRelations && sceneContext.spatialRelations.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Hubungan Spasial Objek (Spatial Geometry & Positioning)
          </span>

          <div className="space-y-2">
            {sceneContext.spatialRelations.map((sr, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs font-semibold bg-slate-900/60 p-3 rounded-xl border border-slate-800"
              >
                <span className="text-cyan-400 font-bold">{sr.subject}</span>
                <span className="text-slate-400 font-mono text-[11px] px-2 py-0.5 bg-slate-800 rounded">
                  {sr.relation}
                </span>
                <span className="text-emerald-400 font-bold">{sr.object}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
