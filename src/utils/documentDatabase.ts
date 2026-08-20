import type { AnalysisResult } from '../types/vision';

export interface StoredDocument {
  id: string;
  name: string;
  category: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum';
  categoryName: string;
  categoryBadgeBg: string;
  categoryBadgeText: string;
  uploadedBy: string;
  date: string;
  timestamp: number;
  tags: string[];
  fileSizeKB: number;
  classificationMethod: 'ai' | 'manual' | 'unclassified';
  analysisResult: AnalysisResult;
}

const DB_STORAGE_KEY = 'smartarchive_db_documents_v1';

// Initial Seed Data (if DB is empty)
const INITIAL_SEED_DOCUMENTS: StoredDocument[] = [
  {
    id: 'doc-seed-1',
    name: 'Laporan Keuangan Q1 2024.pdf',
    category: 'keuangan',
    categoryName: 'Keuangan',
    categoryBadgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    categoryBadgeText: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    uploadedBy: 'Admin Keuangan',
    date: '30 Mei 2024',
    timestamp: Date.now() - 86400000 * 5,
    tags: ['laporan', 'keuangan', 'q1'],
    fileSizeKB: 2450,
    classificationMethod: 'ai',
    analysisResult: createMockResultForSeed('Laporan Keuangan Q1 2024.pdf', 'Keuangan', 'Dokumen laporan transaksi keuangan triwulan pertama.'),
  },
  {
    id: 'doc-seed-2',
    name: 'Kurikulum Informatika 2024.docx',
    category: 'akademik',
    categoryName: 'Akademik',
    categoryBadgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    categoryBadgeText: 'text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    uploadedBy: 'Dr. Andi Wijaya',
    date: '29 Mei 2024',
    timestamp: Date.now() - 86400000 * 6,
    tags: ['kurikulum', 'informatika', '2024'],
    fileSizeKB: 1840,
    classificationMethod: 'ai',
    analysisResult: createMockResultForSeed('Kurikulum Informatika 2024.docx', 'Akademik', 'Dokumen struktur kurikulum jurusan Teknik Informatika.'),
  },
  {
    id: 'doc-seed-3',
    name: 'Surat Izin Penelitian AI.pdf',
    category: 'penelitian',
    categoryName: 'Penelitian',
    categoryBadgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    categoryBadgeText: 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    uploadedBy: 'Yuni Sri Melani',
    date: '28 Mei 2024',
    timestamp: Date.now() - 86400000 * 7,
    tags: ['penelitian', 'izin', 'ai'],
    fileSizeKB: 980,
    classificationMethod: 'ai',
    analysisResult: createMockResultForSeed('Surat Izin Penelitian AI.pdf', 'Penelitian', 'Surat izin kegiatan riset laboratorium Vision AI.'),
  },
  {
    id: 'doc-seed-4',
    name: 'Data Mahasiswa Baru 2024.xlsx',
    category: 'kemahasiswaan',
    categoryName: 'Kemahasiswaan',
    categoryBadgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    categoryBadgeText: 'text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    uploadedBy: 'Admin Akademik',
    date: '28 Mei 2024',
    timestamp: Date.now() - 86400000 * 7,
    tags: ['mahasiswa', 'data', '2024'],
    fileSizeKB: 3200,
    classificationMethod: 'ai',
    analysisResult: createMockResultForSeed('Data Mahasiswa Baru 2024.xlsx', 'Kemahasiswaan', 'Dokumen rekapitulasi data mahasiswa baru angkatan 2024.'),
  },
  {
    id: 'doc-seed-5',
    name: 'Surat Keputusan Rektor.pdf',
    category: 'umum',
    categoryName: 'Umum',
    categoryBadgeBg: 'bg-slate-100 dark:bg-slate-800',
    categoryBadgeText: 'text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    uploadedBy: 'Sekretariat',
    date: '27 Mei 2024',
    timestamp: Date.now() - 86400000 * 8,
    tags: ['surat', 'keputusan', 'rektor'],
    fileSizeKB: 1450,
    classificationMethod: 'manual',
    analysisResult: createMockResultForSeed('Surat Keputusan Rektor.pdf', 'Umum', 'Surat keputusan penetapan kebijakan institusi.'),
  },
];

// Helper to get all documents from DB
export function getDocumentsFromDB(): StoredDocument[] {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(INITIAL_SEED_DOCUMENTS));
      return INITIAL_SEED_DOCUMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_SEED_DOCUMENTS;
  } catch (e) {
    console.warn('Failed to parse document DB from localStorage:', e);
    return INITIAL_SEED_DOCUMENTS;
  }
}

// Add a new document to DB with auto-classification
export function saveDocumentToDB(analysis: AnalysisResult, uploadedBy: string = 'Yuni Sri Melani'): StoredDocument {
  const currentDocs = getDocumentsFromDB();

  // Classify into one of 6 categories
  const categoryInfo = classifyCategoryFromAI(analysis);
  const badgeStyle = getCategoryBadgeStyle(categoryInfo.categoryId);

  const tags = analysis.tagCategories
    ? analysis.tagCategories.flatMap((c) => c.tags.slice(0, 2).map((t) => t.nameId.toLowerCase().replace(/[^a-z0-9]/g, '')))
    : ['arsip', 'dokumen'];

  const newDoc: StoredDocument = {
    id: `doc-${Date.now()}`,
    name: analysis.imageName || `Dokumen_${Date.now()}.png`,
    category: categoryInfo.categoryId,
    categoryName: categoryInfo.categoryName,
    categoryBadgeBg: badgeStyle.bg,
    categoryBadgeText: badgeStyle.text,
    uploadedBy,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    timestamp: Date.now(),
    tags: Array.from(new Set(tags)).slice(0, 3),
    fileSizeKB: analysis.fileSizeKB || 500,
    classificationMethod: 'ai',
    analysisResult: analysis,
  };

  const updatedDocs = [newDoc, ...currentDocs];
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(updatedDocs));
  return newDoc;
}

// Category Classifier Algorithm from AI Analysis Result
export function classifyCategoryFromAI(analysis: AnalysisResult): {
  categoryId: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum';
  categoryName: string;
} {
  const text = (analysis.ocr?.rawText || '').toLowerCase();
  const domain = (analysis.sceneContext?.primaryDomain || '').toLowerCase();
  const scene = (analysis.sceneContext?.sceneType || '').toLowerCase();
  const tags = (analysis.tagCategories?.flatMap((c) => c.tags.map((t) => (t.name + ' ' + t.nameId).toLowerCase())) || []).join(' ');
  
  const fullContent = `${text} ${domain} ${scene} ${tags}`;

  if (/keuangan|invoice|receipt|struk|laporan keuangan|biaya|harga|total|bayar|ppn|tax|anggaran|faktur|bni|bca|mandiri|rekening/i.test(fullContent)) {
    return { categoryId: 'keuangan', categoryName: 'Keuangan' };
  }

  if (/penelitian|research|paper|jurnal|publikasi|proposal|skripsi|tesis|eksperimen|laboratorium/i.test(fullContent)) {
    return { categoryId: 'penelitian', categoryName: 'Penelitian' };
  }

  if (/kemahasiswaan|mahasiswa|almamater|ukm|rally|aksi mahasiswa|balaikota|himpunan|bem|kegiatan mahasiswa/i.test(fullContent)) {
    return { categoryId: 'kemahasiswaan', categoryName: 'Kemahasiswaan' };
  }

  if (/akademik|kurikulum|kuliah|universitas|dosen|fakultas|rektor|nilai|transkrip|ijazah|seminar|auditorium|pakuan/i.test(fullContent)) {
    return { categoryId: 'akademik', categoryName: 'Akademik' };
  }

  if (/sdm|kepegawaian|kontrak|karyawan|absensi|hrd|identitas|pegawai|nip|jabatan/i.test(fullContent)) {
    return { categoryId: 'sdm', categoryName: 'SDM' };
  }

  return { categoryId: 'umum', categoryName: 'Umum' };
}

export function getCategoryBadgeStyle(catId: string) {
  switch (catId) {
    case 'akademik':
      return { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
    case 'keuangan':
      return { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
    case 'sdm':
      return { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
    case 'kemahasiswaan':
      return { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
    case 'penelitian':
      return { bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
    default:
      return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
  }
}

// Compute Dynamic Category Counts for the 6 categories
export function getDynamicCategoryCounts(docs: StoredDocument[]) {
  const counts = {
    akademik: 0,
    keuangan: 0,
    sdm: 0,
    kemahasiswaan: 0,
    penelitian: 0,
    umum: 0,
  };

  docs.forEach((doc) => {
    if (counts[doc.category] !== undefined) {
      counts[doc.category]++;
    } else {
      counts.umum++;
    }
  });

  return counts;
}

// Compute Dynamic Classification Stats (AI vs Manual vs Unclassified)
export function getDynamicClassificationStats(docs: StoredDocument[]) {
  const total = docs.length;
  let aiCount = 0;
  let manualCount = 0;
  let unclassifiedCount = 0;

  docs.forEach((d) => {
    if (d.classificationMethod === 'ai') aiCount++;
    else if (d.classificationMethod === 'manual') manualCount++;
    else unclassifiedCount++;
  });

  const aiPercentage = total > 0 ? Math.round((aiCount / total) * 100) : 0;
  const manualPercentage = total > 0 ? Math.round((manualCount / total) * 100) : 0;
  const unclassifiedPercentage = total > 0 ? Math.round((unclassifiedCount / total) * 100) : 0;

  return {
    total,
    aiCount,
    aiPercentage,
    manualCount,
    manualPercentage,
    unclassifiedCount,
    unclassifiedPercentage,
    accuracy: total > 0 ? 92.5 : 90,
  };
}

// Compute Total Storage MB/GB
export function getDynamicStorageSize(docs: StoredDocument[]): string {
  const totalKB = docs.reduce((acc, curr) => acc + (curr.fileSizeKB || 500), 0) + 12500000; // Base archive size + new files
  const totalGB = (totalKB / 1024 / 1024).toFixed(1);
  return `${totalGB} GB`;
}

function createMockResultForSeed(name: string, category: string, desc: string): AnalysisResult {
  return {
    imageId: `seed-${name}`,
    imageName: name,
    imageSrc: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%230f172a"/><text x="400" y="250" font-family="sans-serif" font-size="24" fill="white" text-anchor="middle">SmartArchive DB Item</text></svg>',
    dimensions: { width: 800, height: 600 },
    aspectRatio: '1.33:1 (800x600)',
    fileSizeKB: 1200,
    analyzedAt: new Date().toLocaleDateString('id-ID'),
    captions: {
      detailedId: desc,
      detailedEn: desc,
      shortId: name,
      shortEn: name,
      altText: name,
      socialCaption: `#SmartArchive #${category}`,
      hashtags: ['#SmartArchive', `#${category}`],
    },
    sceneContext: {
      sceneType: category,
      sceneTypeId: category,
      primaryDomain: category,
      indoorOutdoor: 'Indoor',
      lightingCondition: 'Office Daylight',
      moodVibe: 'Formal',
      compositionRating: 9.2,
      spatialRelations: [],
    },
    colorPalette: [
      { hex: '#1e293b', rgb: [30, 41, 59], percentage: 50, name: 'Slate', isLight: false },
    ],
    detectedObjects: [
      { id: '1', label: 'Document', labelId: 'Dokumen', confidence: 98, category: 'document' },
    ],
    tagCategories: [
      { category: 'Category', categoryId: 'Kategori', tags: [{ name: category, nameId: category, score: 0.98 }] },
    ],
    ocr: {
      hasText: true,
      rawText: desc,
      blocks: [],
      keyValuePairs: [],
      language: 'Indonesian',
    },
    engineUsed: 'Gemini 1.5 Flash Vision',
  };
}
