import { useState, useEffect, useCallback, useRef } from 'react';
import type { DriveItem } from '../services/driveDatabase';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Presentation,
  Trash2,
  Download,
  FolderPlus,
  ChevronRight,
  Home,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowUpDown,
  Filter,
  ChevronDown,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  Bot,
  Share2,
} from 'lucide-react';

interface DashboardViewProps {
  items: DriveItem[];
  categoryCounts: Record<string, number>;
  totalStorageSize: string;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onOpenUploadModal: () => void;
  onSelectFile: (file: DriveItem) => void;
  onDeleteFile: (fileUuid: string) => void;
  onRenameItem: (fileUuid: string, newName: string) => void;
  onShareItem?: (
    itemUuid: string,
    itemName: string,
    itemType: 'file' | 'folder',
    sharedWithEmails: string[]
  ) => void;
  onCollaborationItem: (
    itemUuid: string,
    itemName: string,
    itemType: 'file' | 'folder',
    sharedWithEmails: string[]
  ) => void;
  onUpdateCategory: (
    fileUuid: string,
    category: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum'
  ) => void;
  onAskAiAboutFile?: (file: DriveItem) => void;
  onCreateFolder: (name: string, parentId: string, color: string) => void;
  searchQuery: string;
  activeTabTitle: string;
  currentUserEmail: string;
  isCreateFolderOpen?: boolean;
  onCloseCreateFolder?: () => void;
  activeTabNav?: 'dashboard' | 'arsip_saya' | 'arsip_bersama';
  onTrackActivity?: (item: DriveItem) => void;
}

const CATEGORY_OPTIONS: {
  id: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum';
  name: string;
  color: string;
}[] = [
  { id: 'akademik', name: 'Akademik', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'keuangan', name: 'Keuangan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'sdm', name: 'SDM', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'kemahasiswaan', name: 'Kemahasiswaan', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'penelitian', name: 'Penelitian', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'umum', name: 'Umum', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export function DashboardView({
  items,
  selectedCategory,
  onSelectCategory,
  onSelectFile,
  onDeleteFile,
  onRenameItem,
  onCollaborationItem,
  onUpdateCategory,
  onAskAiAboutFile,
  onCreateFolder,
  searchQuery,
  activeTabTitle,
  currentUserEmail,
  isCreateFolderOpen = false,
  onCloseCreateFolder,
  activeTabNav = 'dashboard',
  onTrackActivity,
}: DashboardViewProps) {
  // Folder Hierarchy Navigation using UUID (Breadcrumbs)
  const [currentFolderUuid, setCurrentFolderUuid] = useState<string>('root');
  const [folderHistory, setFolderHistory] = useState<{ uuid: string; name: string }[]>([
    { uuid: 'root', name: 'Drive Saya' },
  ]);

  // Inline Rename State
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  // Single click vs double click timer to prevent conflict
  const clickTimerRef = useRef<any>(null);

  // Helper to extract ?q=[uuid] from current location
  const getQueryUuidFromUrl = useCallback((): string | null => {
    if (window.location.hash.includes('?q=')) {
      const match = window.location.hash.match(/[?&]q=([^&]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('q');
  }, []);

  // Synchronize folder hierarchy with ?q=[uuid] in URL on load and items change
  useEffect(() => {
    const qUuid = getQueryUuidFromUrl();
    if (qUuid && qUuid !== 'root') {
      const targetFolder = items.find((i) => i.isFolder && (i.uuid === qUuid || String(i.id) === qUuid));
      if (targetFolder) {
        setCurrentFolderUuid(targetFolder.uuid);
        const pathArr: { uuid: string; name: string }[] = [{ uuid: targetFolder.uuid, name: targetFolder.name }];
        let curr = targetFolder;
        while (curr.parentId && curr.parentId !== 'root') {
          const parent = items.find((i) => i.isFolder && i.uuid === curr.parentId);
          if (parent) {
            pathArr.unshift({ uuid: parent.uuid, name: parent.name });
            curr = parent;
          } else {
            break;
          }
        }
        setFolderHistory([{ uuid: 'root', name: 'Drive Saya' }, ...pathArr]);
        return;
      } else {
        setCurrentFolderUuid(qUuid);
        setFolderHistory([
          { uuid: 'root', name: 'Drive Saya' },
          { uuid: qUuid, name: `Folder (${qUuid.slice(0, 8)}...)` },
        ]);
      }
    } else if (!qUuid) {
      setCurrentFolderUuid('root');
      setFolderHistory([{ uuid: 'root', name: 'Drive Saya' }]);
    }
  }, [getQueryUuidFromUrl, items]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingUuid && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingUuid]);

  // Create Subfolder state
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderColor] = useState<string>('bg-indigo-500');

  useEffect(() => {
    if (isCreateFolderOpen) {
      setIsCreatingFolder(true);
    }
  }, [isCreateFolderOpen]);

  // Sorting state (name, date, size)
  const [sortField, setSortField] = useState<'name' | 'date' | 'size'>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Navigate to Subfolder
  const handleOpenFolder = (folder: DriveItem) => {
    setCurrentFolderUuid(folder.uuid);
    setFolderHistory((prev) => [...prev, { uuid: folder.uuid, name: folder.name }]);
    const newHash = `#${activeTabNav}?q=${folder.uuid}`;
    window.location.hash = newHash;
    if (onTrackActivity) onTrackActivity(folder);
  };

  // Breadcrumb navigation click
  const handleNavigateBreadcrumb = (index: number) => {
    const target = folderHistory[index];
    setCurrentFolderUuid(target.uuid);
    setFolderHistory((prev) => prev.slice(0, index + 1));
    if (index === 0 || target.uuid === 'root') {
      window.location.hash = `#${activeTabNav}`;
    } else {
      window.location.hash = `#${activeTabNav}?q=${target.uuid}`;
    }
  };

  // Submit New Folder / Subfolder
  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), currentFolderUuid, newFolderColor);
    setNewFolderName('');
    setIsCreatingFolder(false);
    if (onCloseCreateFolder) onCloseCreateFolder();
  };

  // Start Inline Rename on Single Click
  const handleStartRename = (item: DriveItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingUuid(item.uuid);
    setEditingName(item.name);
  };

  // Save Inline Rename
  const handleSaveRename = (uuid: string) => {
    if (editingName.trim()) {
      onRenameItem(uuid, editingName.trim());
    }
    setEditingUuid(null);
  };

  // Cancel Inline Rename
  const handleCancelRename = () => {
    setEditingUuid(null);
    setEditingName('');
  };

  // Direct Native Download Item (Google Drive Style - Downloads directly to disk)
  const handleDownloadFile = async (item: DriveItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.isFolder) {
      alert(`Folder "${item.name}" dapat diakses langsung.`);
      return;
    }

    const fileUrl = item.fileDataUrl || (item.filePath ? `http://localhost:3001/${item.filePath}` : '');
    if (!fileUrl) return;

    if (onTrackActivity) onTrackActivity(item);

    try {
      if (fileUrl.startsWith('data:')) {
        const parts = fileUrl.split(',');
        const mime = parts[0].split(':')[1].split(';')[0];
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobUrl;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      } else {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobUrl;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      }
    } catch (err) {
      console.warn('Native download fallback:', err);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = fileUrl;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Single Click: Enables Rename / Selection
  const handleRowSingleClick = (item: DriveItem) => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      handleStartRename(item);
    }, 220);
  };

  // Double Click: Access folder or open file in Workbench (Images, PDF, Excel, Word, PPT)
  const handleRowDoubleClick = (item: DriveItem) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setEditingUuid(null);

    if (item.isFolder) {
      handleOpenFolder(item);
    } else {
      if (onTrackActivity) onTrackActivity(item);

      const isViewableInWorkbench =
        (item.fileType &&
          (item.fileType.includes('image') ||
            item.fileType.includes('pdf') ||
            item.fileType.includes('sheet') ||
            item.fileType.includes('excel') ||
            item.fileType.includes('word') ||
            item.fileType.includes('document') ||
            item.fileType.includes('presentation') ||
            item.fileType.includes('powerpoint'))) ||
        Boolean(item.name.match(/\.(png|jpe?g|webp|gif|svg|pdf|xlsx|xls|docx|doc|pptx|ppt|csv|txt)$/i));

      if (isViewableInWorkbench) {
        onSelectFile(item);
      } else {
        handleDownloadFile(item);
      }
    }
  };

  // 1. Filter Items belonging to current folder level by UUID & search/category
  const filteredCurrentItems = items.filter((item) => {
    const inCurrentFolder =
      currentFolderUuid === 'all' ||
      item.parentId === currentFolderUuid ||
      item.folderId === currentFolderUuid ||
      (currentFolderUuid === 'root' && (!item.parentId || item.parentId === 'root'));

    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.originalName.toLowerCase().includes(q) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) ||
      (item.analysisResult?.captions?.hashtags &&
        item.analysisResult.captions.hashtags.some((h) => h.toLowerCase().includes(q))) ||
      (item.analysisResult?.captions?.shortId || '').toLowerCase().includes(q) ||
      (item.analysisResult?.captions?.detailedId || '').toLowerCase().includes(q) ||
      (item.analysisResult?.captions?.socialCaption || '').toLowerCase().includes(q) ||
      (item.analysisResult?.sceneContext?.sceneType || '').toLowerCase().includes(q) ||
      (item.analysisResult?.sceneContext?.primaryDomain || '').toLowerCase().includes(q) ||
      (item.analysisResult?.ocr?.rawText || '').toLowerCase().includes(q) ||
      (item.analysisResult?.tagCategories &&
        item.analysisResult.tagCategories.some((tc) =>
          tc.tags.some((t) => t.name.toLowerCase().includes(q) || t.nameId.toLowerCase().includes(q))
        ));

    return inCurrentFolder && matchesCategory && matchesSearch;
  });

  // 2. Sort Items: FOLDERS ALWAYS COME FIRST, followed by Files!
  const sortedItems = [...filteredCurrentItems].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;

    if (sortField === 'name') {
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    if (sortField === 'size') {
      return sortAsc ? a.fileSizeKB - b.fileSizeKB : b.fileSizeKB - a.fileSizeKB;
    }
    return 0;
  });

  const getFileIcon = (item: DriveItem) => {
    if (item.isFolder) {
      return <Folder className="w-5 h-5 text-indigo-600 fill-indigo-600" />;
    }
    const ext = item.name.split('.').pop()?.toLowerCase() || '';
    const type = (item.fileType || '').toLowerCase();
    if (ext === 'pdf' || type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || type.includes('sheet') || type.includes('excel'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (ext === 'pptx' || ext === 'ppt' || type.includes('presentation') || type.includes('powerpoint'))
      return <Presentation className="w-5 h-5 text-amber-500" />;
    if (ext === 'docx' || ext === 'doc' || type.includes('word') || type.includes('document'))
      return <FileText className="w-5 h-5 text-blue-500" />;
    return <ImageIcon className="w-5 h-5 text-indigo-500" />;
  };

  const toggleSort = (field: 'name' | 'date' | 'size') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* 1. Google Drive Breadcrumb Navigation & Category Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] space-y-4">
        {/* Breadcrumb Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto text-sm sm:text-base font-bold text-slate-800 scrollbar-none">
            {folderHistory.map((crumb, idx) => {
              const isLast = idx === folderHistory.length - 1;
              return (
                <div key={crumb.uuid} className="flex items-center gap-1.5 whitespace-nowrap">
                  {idx === 0 ? (
                    <button
                      onClick={() => handleNavigateBreadcrumb(0)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                        isLast
                          ? 'bg-indigo-50 text-indigo-700 font-extrabold shadow-sm'
                          : 'hover:bg-slate-100 text-slate-600 font-semibold'
                      }`}
                    >
                      <Home className="w-4 h-4 text-indigo-600" />
                      <span>{crumb.name}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNavigateBreadcrumb(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                        isLast
                          ? 'bg-indigo-50 text-indigo-700 font-extrabold shadow-sm'
                          : 'hover:bg-slate-100 text-slate-600 font-semibold'
                      }`}
                    >
                      <Folder className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                      <span>{crumb.name}</span>
                    </button>
                  )}
                  {!isLast && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            {sortedItems.length} item di folder ini
          </div>
        </div>

        {/* Category Filter Dropdown Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filter Kategori:</span>
            </span>

            {/* Dropdown Menu Filter */}
            <div className="relative inline-block">
              <select
                value={selectedCategory || ''}
                onChange={(e) => onSelectCategory(e.target.value ? e.target.value : null)}
                className="pl-3 pr-8 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition-all shadow-sm"
              >
                <option value="">Semua Kategori (Tampilkan Semua)</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    🏷️ {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Clear Filter Button */}
            {selectedCategory && (
              <button
                onClick={() => onSelectCategory(null)}
                className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Hapus Filter Kategori"
              >
                <span>Reset ({selectedCategory})</span>
                <span>✕</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Kategori Aktif: <strong className="text-indigo-600">{selectedCategory ? selectedCategory.toUpperCase() : 'SEMUA'}</strong>
          </div>
        </div>
      </div>

      {/* New Folder Modal / Inline Box */}
      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolderSubmit}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200 shadow-lg space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <span>
                Buat Folder Baru di{' '}
                <strong className="text-indigo-600">{folderHistory[folderHistory.length - 1].name}</strong>
              </span>
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(false);
                if (onCloseCreateFolder) onCloseCreateFolder();
              }}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Batal
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nama folder baru (misal: Folder Uji Coba)..."
              className="flex-1 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-indigo-600 outline-none"
              autoFocus
              required
            />

            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
            >
              Simpan Folder
            </button>
          </div>
        </form>
      )}

      {/* 2. Unified Google Drive Table with 3 Action Buttons (Collaboration, Download, Delete) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs text-slate-500">
          <span className="font-bold text-slate-800">
            {activeTabTitle} • {sortedItems.length} Item
          </span>
          <span className="text-[11px] text-slate-400">
            Klik 1x: Rename | Double Klik: Akses Folder / Buka File
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-3 cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Pemilik</th>
                {/* Kolom Kategori (Kategorisasi Otomatis AI / Manual) */}
                <th className="py-3 px-3">Kategori</th>
                {/* Kolom Tags (Tag Visual & Hashtags dari files_tags) */}
                <th className="py-3 px-3">Tags</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Tanggal Diubah</th>
                <th
                  onClick={() => toggleSort('size')}
                  className="py-3 px-3 cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Ukuran File</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedItems.map((item) => {
                const isOwner = item.ownerEmail.toLowerCase() === currentUserEmail.toLowerCase();
                const isEditing = editingUuid === item.uuid;

                return (
                  <tr
                    key={item.uuid}
                    onClick={() => handleRowSingleClick(item)}
                    onDoubleClick={() => handleRowDoubleClick(item)}
                    className={`hover:bg-slate-50/90 transition-colors cursor-pointer group select-none ${
                      item.isFolder ? 'bg-slate-50/40 font-semibold' : ''
                    } ${isEditing ? 'bg-indigo-50/40 ring-1 ring-indigo-300' : ''}`}
                  >
                    {/* 1. Item Name & Inline Rename on Single Click */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            item.isFolder
                              ? 'bg-indigo-50 text-indigo-600'
                              : 'bg-slate-100 border border-slate-200/60'
                          }`}
                        >
                          {getFileIcon(item)}
                        </div>

                        <div className="overflow-hidden flex-1 max-w-sm">
                          {isEditing ? (
                            /* Inline Rename Form on Single Click */
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                ref={renameInputRef}
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(item.uuid);
                                  if (e.key === 'Escape') handleCancelRename();
                                }}
                                className="px-2.5 py-1 bg-white border-2 border-indigo-500 rounded-lg text-xs font-bold text-slate-900 outline-none w-full shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(item.uuid)}
                                className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shrink-0"
                                title="Simpan Nama"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelRename}
                                className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors cursor-pointer shrink-0"
                                title="Batal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-slate-900 truncate group-hover:text-indigo-600 flex items-center gap-1.5">
                                <span>{item.name}</span>
                                <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                UUID: {item.uuid}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Owner */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {item.ownerEmail.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-slate-700 font-medium text-[11px]">
                          {isOwner ? 'Saya' : item.ownerEmail.split('@')[0]}
                        </span>
                      </div>
                    </td>

                    {/* 3. Kategori Column (Kategorisasi Otomatis AI / Manual Dropdown) */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <select
                          value={item.category}
                          onChange={(e) =>
                            onUpdateCategory(
                              item.uuid,
                              e.target.value as
                                | 'akademik'
                                | 'keuangan'
                                | 'sdm'
                                | 'kemahasiswaan'
                                | 'penelitian'
                                | 'umum'
                            )
                          }
                          className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none pr-7 transition-all shadow-sm"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              🏷️ {opt.name}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-indigo-500">
                          ▼
                        </span>
                      </div>
                    </td>

                    {/* 4. Kolom Tags (Tag Visual & Hashtags dari files_tags) */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      {item.isFolder ? (
                        <span className="text-slate-400 text-[11px] font-medium">—</span>
                      ) : item.tags && item.tags.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                          {item.tags.slice(0, 2).map((t, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono truncate max-w-[100px] ${
                                t.startsWith('#')
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                              title={t}
                            >
                              {t}
                            </span>
                          ))}
                          {item.tags.length > 2 && (
                            <span
                              className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold"
                              title={item.tags.slice(2).join(', ')}
                            >
                              +{item.tags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : item.analysisResult?.captions?.hashtags && item.analysisResult.captions.hashtags.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                          {item.analysisResult.captions.hashtags.slice(0, 2).map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200 truncate max-w-[100px]"
                              title={t}
                            >
                              {t}
                            </span>
                          ))}
                          {item.analysisResult.captions.hashtags.length > 2 && (
                            <span
                              className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold"
                              title={item.analysisResult.captions.hashtags.slice(2).join(', ')}
                            >
                              +{item.analysisResult.captions.hashtags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : item.status === 'process' ? (
                        <span className="text-amber-600 text-[10px] font-bold animate-pulse">Ekstraksi...</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* 5. Status Job AI (3 State: process | done | fail) */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      {item.isFolder ? (
                        <span className="text-slate-400 text-[11px] font-medium">—</span>
                      ) : item.status === 'done' ? (
                        /* State 1: done */
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Done</span>
                        </div>
                      ) : item.status === 'fail' ? (
                        /* State 2: fail */
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Fail</span>
                        </div>
                      ) : (
                        /* State 3: process */
                        <div className="space-y-1 w-36">
                          <div className="flex items-center justify-between text-[11px] text-amber-700 font-bold">
                            <span className="truncate flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-amber-600 shrink-0" />
                              <span>Process</span>
                            </span>
                            <span>{item.processingProgress || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full transition-all duration-300"
                              style={{ width: `${Math.max(item.processingProgress || 10, 8)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 6. Tanggal Diubah */}
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {item.uploadedAt}
                    </td>

                    {/* 7. Ukuran File (Folder = "—") */}
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {item.isFolder ? '—' : `${item.fileSizeKB} KB`}
                    </td>

                    {/* 8. Action Table Column: Clean UX with Text Badge for Tanya AI & Distinct Action Icons */}
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {/* 1. Primary Action: Tanya AI (Explicit Label + Bot Icon) */}
                        {!item.isFolder && (
                          <button
                            type="button"
                            onClick={() => onAskAiAboutFile && onAskAiAboutFile(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                            title="Tanyakan isi berkas ini di AI Chat"
                          >
                            <Bot className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Tanya AI</span>
                          </button>
                        )}

                        {/* 2. Secondary Action Group: Kolaborasi, Download, Hapus */}
                        <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
                          {/* Kolaborasi / Hak Akses */}
                          <button
                            type="button"
                            onClick={() =>
                              onCollaborationItem(
                                item.uuid,
                                item.name,
                                item.isFolder ? 'folder' : 'file',
                                item.sharedWithEmails
                              )
                            }
                            className="p-1.5 rounded-lg hover:bg-purple-100 text-slate-600 hover:text-purple-700 transition-colors cursor-pointer"
                            title="Kelola Kolaborator & Hak Akses Berkas"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Download / Unduh */}
                          <button
                            type="button"
                            onClick={(e) => handleDownloadFile(item, e)}
                            className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                            title="Unduh Berkas ke Komputer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete / Hapus */}
                          <button
                            type="button"
                            onClick={() => {
                              const label = item.isFolder ? 'folder' : 'file';
                              if (confirm(`Hapus ${label} "${item.name}"?`)) {
                                onDeleteFile(item.uuid);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Hapus Berkas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    Direktori ini kosong. Gunakan tombol <strong className="text-indigo-600">+ Folder Baru</strong> atau <strong className="text-indigo-600">Upload File</strong> di navbar atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
