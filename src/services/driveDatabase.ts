import type { AnalysisResult } from '../types/vision';

export interface DriveItem {
  id: number | string;
  uuid: string;
  name: string;
  originalName: string;
  isFolder: boolean;
  parentId: string; // Parent folder UUID (or 'root')
  folderId: string; // Folder UUID (or 'root')
  fileType: string;
  fileSizeKB: number;
  filePath?: string; // Physical file path: uploads/[account]/[folder]/[filename]
  fileDataUrl?: string;
  ownerEmail: string;
  sharedWithEmails: string[];
  category: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum';
  categoryName: string;
  tags?: string[];
  tagsList?: { tagName: string; categoryName: string; score: number; isHashtag: boolean }[];
  color?: string;
  status: 'process' | 'done' | 'fail';
  processingProgress: number;
  currentJobTask: string;
  uploadedAt: string;
  updatedAt?: string;
  uploadedBy: string;
  classificationMethod: 'ai' | 'manual' | 'unclassified';
  analysisResult?: AnalysisResult | null;
}

export type DriveFile = DriveItem;

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * 1. Fetch All Unified Drive Items (Folders & Files) from MariaDB Backend
 */
export async function fetchFilesFromBackend(): Promise<DriveItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/files`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data: DriveItem[] = await res.json();
    return data;
  } catch (err) {
    console.warn('Backend API /files unavailable:', err);
    return [];
  }
}

/**
 * 2. Upload File to MariaDB & Physical Disk Storage with INT ID + UUID
 */
export async function uploadFileToBackend(
  name: string,
  fileType: string,
  fileSizeKB: number,
  fileDataUrl: string,
  ownerEmail: string,
  uploadedBy: string,
  folderId: string = 'root',
  category: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum' = 'umum'
): Promise<DriveItem | null> {
  const fileUuid = 'file-' + crypto.randomUUID();
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const payload = {
    uuid: fileUuid,
    name,
    originalName: name,
    fileType,
    fileSizeKB,
    fileDataUrl,
    ownerEmail,
    uploadedBy,
    folderId,
    category,
    categoryName: category.charAt(0).toUpperCase() + category.slice(1),
    uploadedAt: dateStr,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed ${res.status}: ${errText}`);
    }
    const json = await res.json();
    return json.file;
  } catch (err) {
    console.error('Failed to upload file to backend:', err);
    return null;
  }
}

/**
 * 3. Create Folder / Subfolder with INT ID + UUID in MariaDB
 */
export async function createFolderInBackend(
  name: string,
  ownerEmail: string,
  parentId: string = 'root',
  color: string = 'bg-indigo-500',
  uploadedBy: string = 'User'
): Promise<DriveItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/files/folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        ownerEmail,
        parentId,
        color,
        uploadedBy,
      }),
    });

    if (!res.ok) throw new Error(`Create folder failed ${res.status}`);
    const json = await res.json();
    return json.folder;
  } catch (err) {
    console.error('Failed to create folder in backend:', err);
    return null;
  }
}

/**
 * 4. Update Category in MariaDB by UUID or ID
 */
export async function updateFileCategoryInBackend(
  fileUuid: string,
  category: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum'
): Promise<boolean> {
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  try {
    const res = await fetch(`${API_BASE_URL}/files/${fileUuid}/category`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, categoryName }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to update category in backend:', err);
    return false;
  }
}

/**
 * 5. Rename Item (Folder / File) in MariaDB by UUID or ID
 */
export async function renameItemInBackend(
  uuid: string,
  newName: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/files/${uuid}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to rename item in backend:', err);
    return false;
  }
}

/**
 * 6. Delete Item (Folder / File) from MariaDB and physical disk storage by UUID or ID
 */
export async function deleteItemInBackend(uuid: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/files/${uuid}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to delete item from backend:', err);
    return false;
  }
}

/**
 * 7. Update Background Job Progress in MariaDB (status: 'process' | 'fail' | 'done')
 */
export async function updateJobProgressInBackend(
  fileUuid: string,
  progress: number,
  taskDescription: string,
  status: 'process' | 'fail' | 'done' | 'processing' | 'failed' | 'completed' = 'process'
): Promise<boolean> {
  const normStatus = status === 'fail' || status === 'failed' ? 'fail' : status === 'done' || status === 'completed' ? 'done' : 'process';
  try {
    const res = await fetch(`${API_BASE_URL}/jobs/${fileUuid}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress, taskDescription, status: normStatus }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to update job progress in backend:', err);
    return false;
  }
}

/**
 * 8. Complete AI Job and Store in file_contexts & files_tags (status: 'done')
 */
export async function completeAIJobInBackend(
  fileUuid: string,
  analysisResult: AnalysisResult,
  categoryKey: string
): Promise<boolean> {
  const categoryName = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
  try {
    const res = await fetch(`${API_BASE_URL}/jobs/${fileUuid}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisResult,
        categoryKey,
        categoryName,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to complete AI job in backend:', err);
    return false;
  }
}

/**
 * 9. Share Item with another User Email (using file_id in shared_items table)
 */
export async function shareItemInBackend(
  fileId: string,
  targetEmail: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, targetEmail }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to share item in backend:', err);
    return false;
  }
}

/**
 * 10. Remove / Delete Collaborator from shared_items in MariaDB
 */
export async function unshareItemInBackend(
  fileId: string,
  targetEmail: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, targetEmail }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to unshare item in backend:', err);
    return false;
  }
}

/**
 * Record user access in MariaDB recent_activity table (double-click file/folder or download file)
 */
export async function recordRecentActivityInBackend(
  fileUuidOrId: string | number,
  accountIdOrEmail: string | number
): Promise<boolean> {
  try {
    const isFileInt = typeof fileUuidOrId === 'number' || /^\d+$/.test(String(fileUuidOrId));
    const isAccountInt = typeof accountIdOrEmail === 'number' || /^\d+$/.test(String(accountIdOrEmail));

    const payload: {
      fileId?: number;
      fileUuid?: string;
      accountId?: number;
      userEmail?: string;
    } = {};

    if (isFileInt) {
      payload.fileId = Number(fileUuidOrId);
    } else {
      payload.fileUuid = String(fileUuidOrId);
    }

    if (isAccountInt) {
      payload.accountId = Number(accountIdOrEmail);
    } else {
      payload.userEmail = String(accountIdOrEmail);
    }

    const res = await fetch(`${API_BASE_URL}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to record recent activity in backend:', err);
    return false;
  }
}

/**
 * Fetch 10 most recent activities for a specific account from MariaDB
 */
export async function fetchRecentActivitiesFromBackend(
  accountIdOrEmail: string | number
): Promise<any[]> {
  try {
    const isAccountInt = typeof accountIdOrEmail === 'number' || /^\d+$/.test(String(accountIdOrEmail));
    const queryParam = isAccountInt ? `accountId=${accountIdOrEmail}` : `email=${encodeURIComponent(String(accountIdOrEmail))}`;

    const res = await fetch(`${API_BASE_URL}/activity?${queryParam}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch recent activities from backend:', err);
  }
  return [];
}

/**
 * Auto-classify category from AI Analysis
 */
export function classifyCategoryFromAI(analysis: AnalysisResult): {
  categoryId: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum';
  categoryName: string;
  confidence: number;
} {
  const textContent = [
    analysis.captions.detailedId,
    analysis.captions.shortId,
    analysis.captions.altText,
    analysis.ocr.rawText,
    analysis.sceneContext.sceneType,
    analysis.sceneContext.primaryDomain,
    ...analysis.captions.hashtags,
    ...analysis.detectedObjects.map((o) => `${o.label} ${o.labelId}`),
    ...analysis.tagCategories.flatMap((c) => c.tags.map((t) => `${t.name} ${t.nameId}`)),
  ]
    .join(' ')
    .toLowerCase();

  const financeKeywords = [
    'keuangan', 'rupiah', 'rp', 'total', 'pembayaran', 'kuitansi', 'struk', 'invoice', 'pajak', 'anggaran',
    'kasir', 'biaya', 'rekening', 'bni', 'bca', 'mandiri', 'nominal', 'harga', 'receipt', 'bank', 'transfer'
  ];
  const academicKeywords = [
    'akademik', 'kuliah', 'dosen', 'mahasiswa', 'skripsi', 'ijazah', 'transkrip', 'rektor', 'universitas pakuan',
    'kurikulum', 'semester', 'wisuda', 'fakultas', 'prodi', 'pendidikan', 'seminar', 'simposium', 'auditorium'
  ];
  const sdmKeywords = [
    'sdm', 'pegawai', 'karyawan', 'kepegawaian', 'kontrak', 'gaji', 'absensi', 'rekrutmen', 'cuti',
    'hrd', 'pejabat', 'surat tugas', 'sk', 'jabatan', 'batik'
  ];
  const studentKeywords = [
    'kemahasiswaan', 'almamater', 'bem', 'himpunan', 'organisasi', 'beasiswa', 'lomba', 'kegiatan mahasiswa',
    'posko', 'relawan', 'bantuan', 'peduli', 'aksi mahasiswa', 'balaikota', 'orasi', 'demonstrasi'
  ];
  const researchKeywords = [
    'penelitian', 'jurnal', 'riset', 'publikasi', 'laboratorium', 'paten', 'karya ilmiah', 'pengabdian', 'mou', 'plakat', 'diplomasi'
  ];

  const countMatches = (keywords: string[]) =>
    keywords.reduce((acc, kw) => acc + (textContent.includes(kw) ? 1 : 0), 0);

  const scores = {
    keuangan: countMatches(financeKeywords),
    akademik: countMatches(academicKeywords),
    sdm: countMatches(sdmKeywords),
    kemahasiswaan: countMatches(studentKeywords),
    penelitian: countMatches(researchKeywords),
  };

  let maxCategory: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum' = 'umum';
  let maxScore = 0;

  (Object.keys(scores) as (keyof typeof scores)[]).forEach((cat) => {
    if (scores[cat] > maxScore) {
      maxScore = scores[cat];
      maxCategory = cat;
    }
  });

  const names: Record<string, string> = {
    akademik: 'Akademik',
    keuangan: 'Keuangan',
    sdm: 'SDM',
    kemahasiswaan: 'Kemahasiswaan',
    penelitian: 'Penelitian',
    umum: 'Umum',
  };

  return {
    categoryId: maxCategory,
    categoryName: names[maxCategory] || 'Umum',
    confidence: maxScore > 0 ? Math.min(95 + maxScore * 2, 99) : 85,
  };
}

export function getDriveCategoryCounts(items: DriveItem[]): Record<string, number> {
  const counts: Record<string, number> = {
    all: items.length,
    akademik: 0,
    keuangan: 0,
    sdm: 0,
    kemahasiswaan: 0,
    penelitian: 0,
    umum: 0,
  };

  items.forEach((item) => {
    if (counts[item.category] !== undefined) {
      counts[item.category]++;
    } else {
      counts.umum++;
    }
  });

  return counts;
}

export function getDriveTotalStorage(items: DriveItem[]): string {
  const totalKB = items.reduce((acc, item) => acc + (item.fileSizeKB || 0), 0);
  if (totalKB >= 1024 * 1024) {
    return `${(totalKB / (1024 * 1024)).toFixed(2)} GB`;
  }
  if (totalKB >= 1024) {
    return `${(totalKB / 1024).toFixed(1)} MB`;
  }
  return `${totalKB} KB`;
}
