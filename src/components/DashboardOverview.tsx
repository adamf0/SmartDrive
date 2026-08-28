import React from 'react';
import type { DriveItem } from '../services/driveDatabase';
import { StorageCard } from './StorageCard';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Table,
  Presentation,
  Clock,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react';

export interface RecentActivityItem {
  activityId?: number;
  uuid: string;
  id?: number | string;
  name: string;
  isFolder: boolean;
  fileType: string;
  fileSizeKB: number;
  category: string;
  categoryName: string;
  color?: string;
  openedAt: string;
  createdAt?: string;
  action?: 'opened' | 'uploaded' | 'created';
}

interface DashboardOverviewProps {
  recentActivities: RecentActivityItem[];
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
  onOpenFolder: (folderUuid: string) => void;
  onOpenFile: (file: DriveItem) => void;
  allItems: DriveItem[];
  userName: string;
  onTrackActivity?: (item: DriveItem) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  recentActivities,
  classificationStats,
  onOpenFolder,
  onOpenFile,
  allItems,
  userName,
  onTrackActivity,
}) => {
  // Limit to max 10 recent items
  const displayRecent = recentActivities.slice(0, 10);

  const getFileIcon = (item: RecentActivityItem | DriveItem) => {
    if (item.isFolder) {
      return <Folder className="w-6 h-6 text-indigo-600 fill-indigo-600" />;
    }
    const type = (item.fileType || '').toLowerCase();
    if (type.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv'))
      return <Table className="w-6 h-6 text-emerald-600" />;
    if (type.includes('presentation') || type.includes('powerpoint'))
      return <Presentation className="w-6 h-6 text-amber-500" />;
    if (type.includes('word') || type.includes('document'))
      return <FileText className="w-6 h-6 text-blue-500" />;
    return <ImageIcon className="w-6 h-6 text-indigo-500" />;
  };

  const handleItemClick = (item: RecentActivityItem) => {
    const fullItem = allItems.find((f) => f.uuid === item.uuid || String(f.id) === String(item.id));
    if (item.isFolder) {
      if (fullItem && onTrackActivity) onTrackActivity(fullItem);
      onOpenFolder(item.uuid);
    } else {
      if (fullItem) {
        if (onTrackActivity) onTrackActivity(fullItem);
        onOpenFile(fullItem);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Smart Multimodal AI Drive System</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Selamat Datang di SmartDrive, {userName}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
            Semua dokumen Anda tersimpan aman, terorganisasi dalam struktur direktori MariaDB, dan di-ekstraksi secara otomatis menggunakan Gemini AI Vision.
          </p>
        </div>

        {/* Decorative Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      </div>

      {/* 2. Section: Aktivitas Terbaru (Recent Activity Limit 10, Auto MinMax Grid) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Aktivitas Terbaru
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Berkas &amp; folder yang baru saja Anda akses (Maks. 10 item)
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-400 font-mono">
            {displayRecent.length}/10 Item
          </span>
        </div>

        {displayRecent.length > 0 ? (
          /* Auto MinMax Responsive Grid */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {displayRecent.map((item, idx) => (
              <div
                key={item.activityId || `${item.uuid}-${idx}`}
                onClick={() => handleItemClick(item)}
                className="group relative bg-white hover:bg-slate-50/80 rounded-2xl p-4 border border-slate-100 shadow-[0px_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      item.isFolder
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    {getFileIcon(item)}
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                    {item.isFolder ? 'Folder' : item.categoryName || 'Umum'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span>{item.openedAt}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="font-mono">
                    {item.isFolder ? 'Direktori' : `${item.fileSizeKB || 0} KB`}
                  </span>
                  <span className="text-indigo-600 flex items-center text-xs font-bold group-hover:translate-x-0.5 transition-transform">
                    Buka <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 text-slate-400 text-xs">
            Belum ada aktivitas berkas. Buka atau upload berkas di menu <strong>Arsip Saya</strong> untuk mulai bekerja.
          </div>
        )}
      </div>

      {/* 3. Bottom Grid: Section AI Klasifikasi Otomatis (Col 6) + Section Storage (Col 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section: AI Klasifikasi Otomatis */}
        <div className="lg:col-span-6 space-y-3">
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI Klasifikasi Otomatis</span>
          </h3>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0px_4px_25px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Status Ekstraksi Konten &amp; Kategori
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Analisis otomatis dokumen berdasarkan teks OCR &amp; Vision
                </p>
              </div>

              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>94.2% Akurasi</span>
              </span>
            </div>

            {/* Donut & Stats Breakdown */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Donut Chart */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 transition-all duration-700"
                    strokeDasharray={`${classificationStats.aiPercentage}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-slate-900 font-mono">
                    {classificationStats.aiCount}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">File AI</span>
                </div>
              </div>

              {/* Progress Breakdown Bars */}
              <div className="space-y-3 flex-1 w-full text-xs">
                {/* 1. Terklasifikasi AI (Done) */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Terklasifikasi AI (Done)</span>
                    </span>
                    <span className="font-mono text-slate-900">
                      {classificationStats.aiCount} ({classificationStats.aiPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${classificationStats.aiPercentage}%` }}
                    />
                  </div>
                </div>

                {/* 2. Manual Klasifikasi */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Klasifikasi Manual</span>
                    </span>
                    <span className="font-mono text-slate-900">
                      {classificationStats.manualCount} ({classificationStats.manualPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${classificationStats.manualPercentage}%` }}
                    />
                  </div>
                </div>

                {/* 3. Sedang Diproses (Process) */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span>Sedang Diproses (Process)</span>
                    </span>
                    <span className="font-mono text-slate-900">
                      {classificationStats.unclassifiedCount} ({classificationStats.unclassifiedPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${classificationStats.unclassifiedPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Storage Capacity (Exact match user image) */}
        <div className="lg:col-span-6">
          <StorageCard />
        </div>
      </div>
    </div>
  );
};
