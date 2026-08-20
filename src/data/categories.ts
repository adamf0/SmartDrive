export interface CategoryItem {
  id: string;
  name: string;
  count: number;
  color: string;
  bgLight: string;
  textLight: string;
}

export const CATEGORIES: CategoryItem[] = [
  { id: 'akademik', name: 'Akademik', count: 120, color: 'bg-purple-500', bgLight: 'bg-purple-100 dark:bg-purple-950/50', textLight: 'text-purple-700 dark:text-purple-300' },
  { id: 'keuangan', name: 'Keuangan', count: 85, color: 'bg-emerald-500', bgLight: 'bg-emerald-100 dark:bg-emerald-950/50', textLight: 'text-emerald-700 dark:text-emerald-300' },
  { id: 'sdm', name: 'SDM', count: 64, color: 'bg-amber-500', bgLight: 'bg-amber-100 dark:bg-amber-950/50', textLight: 'text-amber-700 dark:text-amber-300' },
  { id: 'kemahasiswaan', name: 'Kemahasiswaan', count: 92, color: 'bg-blue-500', bgLight: 'bg-blue-100 dark:bg-blue-950/50', textLight: 'text-blue-700 dark:text-blue-300' },
  { id: 'penelitian', name: 'Penelitian', count: 45, color: 'bg-rose-500', bgLight: 'bg-rose-100 dark:bg-rose-950/50', textLight: 'text-rose-700 dark:text-rose-300' },
  { id: 'umum', name: 'Umum', count: 38, color: 'bg-slate-400', bgLight: 'bg-slate-200 dark:bg-slate-800', textLight: 'text-slate-700 dark:text-slate-300' },
];
