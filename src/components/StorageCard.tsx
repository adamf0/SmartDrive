import React, { useState, useEffect } from 'react';
import { HardDrive, Database } from 'lucide-react';

interface StorageData {
  totalGB: number;
  usedGB: number;
  freeGB: number;
  usagePercentage: number;
  diskPath: string;
}

interface StorageCardProps {
  totalUsedKB?: number;
}

export const StorageCard: React.FC<StorageCardProps> = () => {
  const [storage, setStorage] = useState<StorageData>({
    totalGB: 98.31,
    usedGB: 13.22,
    freeGB: 85.08,
    usagePercentage: 13.5,
    diskPath: '/',
  });

  useEffect(() => {
    fetch('http://localhost:3001/api/storage')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.totalGB) {
          setStorage(data);
        }
      })
      .catch(() => {
        // Fallback default matching design
      });
  }, []);

  return (
    <div className="space-y-3">
      {/* Title */}
      <h3 className="text-base font-bold text-slate-800 tracking-tight">
        Storage
      </h3>

      {/* Main Storage Card matching exact design */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0px_4px_25px_rgba(0,0,0,0.03)] space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600">
              <HardDrive className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                Storage Capacity
              </h4>
              <p className="text-xs text-slate-400 font-medium">
                Disk Path: {storage.diskPath}
              </p>
            </div>
          </div>

          <span className="text-lg font-black text-emerald-500 font-mono">
            {storage.usagePercentage}%
          </span>
        </div>

        {/* Multi-Segment Color Progress Bar with Current Marker */}
        <div className="space-y-2">
          <div className="relative w-full h-3.5 rounded-full overflow-hidden bg-slate-100 flex">
            {/* Green Segment (0% - 60%) */}
            <div className="h-full bg-emerald-500" style={{ width: '60%' }} />
            {/* Yellow Segment (60% - 90%) */}
            <div className="h-full bg-amber-400" style={{ width: '30%' }} />
            {/* Red Segment (90% - 100%) */}
            <div className="h-full bg-rose-500" style={{ width: '10%' }} />

            {/* Current Position Marker Pin */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-md pointer-events-none"
              style={{ left: `${Math.min(Math.max(storage.usagePercentage, 2), 98)}%` }}
            />
          </div>

          {/* Percentage Milestones */}
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-0.5">
            <span>0%</span>
            <span>60%</span>
            <span>90%</span>
            <span>100%</span>
          </div>

          {/* Usage & Free Labels */}
          <div className="flex justify-between text-xs font-bold pt-1">
            <span className="text-slate-600">{storage.usedGB} GB Used</span>
            <span className="text-slate-600">{storage.freeGB} GB Free</span>
          </div>
        </div>

        {/* 3 Metric Summary Boxes in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80">
            <p className="text-xs text-slate-400 font-semibold mb-1">Total</p>
            <p className="text-base font-extrabold text-slate-900 font-mono">
              {storage.totalGB} GB
            </p>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80">
            <p className="text-xs text-slate-400 font-semibold mb-1">Used</p>
            <p className="text-base font-extrabold text-slate-900 font-mono">
              {storage.usedGB} GB
            </p>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80">
            <p className="text-xs text-slate-400 font-semibold mb-1">Remaining</p>
            <p className="text-base font-extrabold text-slate-900 font-mono">
              {storage.freeGB} GB
            </p>
          </div>
        </div>

        {/* Bottom Alert Pill */}
        <div className="bg-blue-50/70 border border-blue-100/80 rounded-2xl py-3 px-4 flex items-center gap-2.5 text-xs font-bold text-blue-700">
          <Database className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Usage of {storage.diskPath}: {storage.usagePercentage}% of {storage.totalGB}GB
          </span>
        </div>
      </div>
    </div>
  );
};
