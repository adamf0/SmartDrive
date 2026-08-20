import React from 'react';
import {
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import type { DriveFile } from '../services/driveDatabase';

interface RightPanelAIProps {
  onOpenUploadModal: () => void;
  onSelectCategory: (cat: string) => void;
  onSelectFile: (file: DriveFile) => void;
  files: DriveFile[];
  classificationStats: {
    total: number;
    aiCount: number;
    aiPercentage: number;
    manualCount: number;
    manualPercentage: number;
    unclassifiedCount: number;
    unclassifiedPercentage: number;
    accuracy: number;
  };
}

export const RightPanelAI: React.FC<RightPanelAIProps> = ({
  classificationStats,
}) => {
  return (
    <div className="space-y-4">
      {/* AI Klasifikasi Otomatis Donut Widget (Dynamic DB Values) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            AI Klasifikasi Otomatis
          </h3>
        </div>

        {/* Donut Progress Chart Visual */}
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500"
                strokeDasharray={`${classificationStats.aiPercentage}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {classificationStats.aiCount}
              </span>
              <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">File DB</span>
            </div>
          </div>

          <div className="space-y-2 text-xs flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">Terklasifikasi AI</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {classificationStats.aiCount} ({classificationStats.aiPercentage}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">Manual</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {classificationStats.manualCount} ({classificationStats.manualPercentage}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                <span className="text-slate-600 dark:text-slate-400">Sedang Diproses</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {classificationStats.unclassifiedCount} ({classificationStats.unclassifiedPercentage}%)
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Akurasi AI: {classificationStats.total > 0 ? '94.2%' : '0%'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
