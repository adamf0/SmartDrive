export interface DocumentItem {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  categoryBadgeBg: string;
  categoryBadgeText: string;
  uploadedBy: string;
  date: string;
  tags: string[];
  icon: 'pdf' | 'docx' | 'xlsx' | 'jpg';
  samplePresetId?: string;
}

export const RECENT_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    name: 'Laporan Keuangan Q1 2024.pdf',
    category: 'keuangan',
    categoryName: 'Keuangan',
    categoryBadgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    categoryBadgeText: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    uploadedBy: 'Admin Keuangan',
    date: '30 Mei 2024',
    tags: ['laporan', 'keuangan', 'q1'],
    icon: 'pdf',
    samplePresetId: 'mou-plaque-ceremony',
  },
  {
    id: 'doc-2',
    name: 'Kurikulum Informatika 2024.docx',
    category: 'akademik',
    categoryName: 'Akademik',
    categoryBadgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    categoryBadgeText: 'text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    uploadedBy: 'Dr. Andi Wijaya',
    date: '29 Mei 2024',
    tags: ['kurikulum', 'informatika', '2024'],
    icon: 'docx',
    samplePresetId: 'auditorium-formal-seminar',
  },
  {
    id: 'doc-3',
    name: 'Surat Izin Penelitian AI.pdf',
    category: 'penelitian',
    categoryName: 'Penelitian',
    categoryBadgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    categoryBadgeText: 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    uploadedBy: 'Yuni Sri Melani',
    date: '28 Mei 2024',
    tags: ['penelitian', 'izin', 'ai'],
    icon: 'pdf',
    samplePresetId: 'posko-pakuan-disaster',
  },
  {
    id: 'doc-4',
    name: 'Data Mahasiswa Baru 2024.xlsx',
    category: 'kemahasiswaan',
    categoryName: 'Kemahasiswaan',
    categoryBadgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    categoryBadgeText: 'text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    uploadedBy: 'Admin Akademik',
    date: '28 Mei 2024',
    tags: ['mahasiswa', 'data', '2024'],
    icon: 'xlsx',
    samplePresetId: 'balaikota-student-rally',
  },
  {
    id: 'doc-5',
    name: 'Surat Keputusan Rektor.pdf',
    category: 'umum',
    categoryName: 'Umum',
    categoryBadgeBg: 'bg-slate-100 dark:bg-slate-800',
    categoryBadgeText: 'text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    uploadedBy: 'Sekretariat',
    date: '27 Mei 2024',
    tags: ['surat', 'keputusan', 'rektor'],
    icon: 'pdf',
    samplePresetId: 'mou-plaque-ceremony',
  },
];
