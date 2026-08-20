import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DashboardOverview, type RecentActivityItem } from './components/DashboardOverview';
import { AuthScreen } from './components/AuthScreen';

import { ImageUploader } from './components/ImageUploader';
import { ImageCanvasViewer } from './components/ImageCanvasViewer';
import { CaptionPanel } from './components/CaptionPanel';
import { TaggingPanel } from './components/TaggingPanel';
import { ExportModal } from './components/ExportModal';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { ShareModal } from './components/ShareModal';

import { Sparkles as SparklesIcon } from 'lucide-react';
import { GlobalAiChatPanel } from './components/GlobalAiChatPanel';

import { getAccumulatedTokenUsage, type AccumulatedTokenUsage } from './utils/tokenManager';
import {
  getCurrentUser,
  logoutUser,
  type AccountUser,
} from './services/authService';

import {
  fetchFilesFromBackend,
  uploadFileToBackend,
  createFolderInBackend,
  renameItemInBackend,
  updateFileCategoryInBackend,
  deleteItemInBackend,
  recordRecentActivityInBackend,
  fetchRecentActivitiesFromBackend,
  getDriveCategoryCounts,
  getDriveTotalStorage,
  type DriveItem,
} from './services/driveDatabase';

import {
  enqueueBackgroundProcessing,
  subscribeBackgroundQueue,
} from './services/backgroundWorker';

import type { AnalysisResult } from './types/vision';
import { isDocumentFileType, synthesizeDocumentAnalysis } from './utils/documentContextEngine';

import {
  MessageSquare,
  Tag,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Zap,
  ArrowLeft,
  LayoutDashboard,
} from 'lucide-react';

const DEFAULT_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Helper to determine initial active tab from URL hash or sessionStorage (strips ?q=...)
const getInitialActiveTab = (): 'dashboard' | 'arsip_saya' | 'arsip_bersama' => {
  const hash = window.location.hash.replace('#', '').split('?')[0];
  if (hash === 'arsip_saya' || hash === 'arsip_bersama' || hash === 'dashboard') {
    return hash;
  }
  const saved = sessionStorage.getItem('luminous_active_tab');
  if (saved === 'arsip_saya' || saved === 'arsip_bersama' || saved === 'dashboard') {
    return saved;
  }
  return 'dashboard';
};

export default function App() {
  // 1. Auth Guard State (Only authenticated users access dashboard)
  const [currentUser, setCurrentUser] = useState<AccountUser | null>(() => getCurrentUser());

  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem('gemini_api_key') || DEFAULT_GEMINI_API_KEY
  );

  const [accumulatedTokens] = useState<AccumulatedTokenUsage>(() =>
    getAccumulatedTokenUsage()
  );

  // 2. Pure MariaDB Backend Items State with INT ID & UUID
  const [allItems, setAllItems] = useState<DriveItem[]>([]);

  // 3. Recent Activity Tracking State (Max 10 items from MariaDB recent_activity table)
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);

  // Load Recent Activities for current logged-in account from MariaDB
  const refreshRecentActivities = useCallback(async () => {
    if (!currentUser) return;
    const accountTarget = currentUser.id || currentUser.email;
    const acts = await fetchRecentActivitiesFromBackend(accountTarget);
    if (acts && Array.isArray(acts)) {
      setRecentActivities(acts);
    }
  }, [currentUser]);

  // Track Recent Activity directly into MariaDB `recent_activity` table
  const trackActivity = useCallback(
    async (item: DriveItem) => {
      if (!currentUser) return;
      const fileTarget = item.id || item.uuid;
      const accountTarget = currentUser.id || currentUser.email;

      await recordRecentActivityInBackend(fileTarget, accountTarget);
      await refreshRecentActivities();
    },
    [currentUser, refreshRecentActivities]
  );

  // 4. Tab State with URL Hash & Session Storage Persistence on Page Refresh
  const [activeTabNav, setActiveTabNav] = useState<'dashboard' | 'arsip_saya' | 'arsip_bersama'>(getInitialActiveTab);
  const [activeView, setActiveView] = useState<'dashboard' | 'workbench'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // 5. Track Current Folder UUID from URL hash/search for Navbar button visibility
  const [currentFolderUuid, setCurrentFolderUuid] = useState<string>(() => {
    const hashMatch = window.location.hash.match(/[?&]q=([^&]+)/);
    if (hashMatch && hashMatch[1]) return decodeURIComponent(hashMatch[1]);
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || 'root';
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'captions' | 'tags'>('captions');

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState<boolean>(false);
  const [autoRefFile, setAutoRefFile] = useState<DriveItem | null>(null);

  const handleAskAiAboutFile = (file: DriveItem) => {
    setAutoRefFile(file);
    setIsGlobalChatOpen(true);
  };

  // Share / Collaboration Modal State
  const [shareTarget, setShareTarget] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
    itemType: 'file' | 'folder';
    sharedWithEmails: string[];
  }>({
    isOpen: false,
    itemId: '',
    itemName: '',
    itemType: 'file',
    sharedWithEmails: [],
  });

  // Reload live data from MariaDB backend
  const refreshBackendData = useCallback(async () => {
    const items = await fetchFilesFromBackend();
    setAllItems(items);
    setShareTarget((prev) => {
      if (prev.isOpen && prev.itemId) {
        const found = items.find((i) => i.uuid === prev.itemId || String(i.id) === prev.itemId);
        if (found) {
          return { ...prev, sharedWithEmails: found.sharedWithEmails || [] };
        }
      }
      return prev;
    });
  }, []);

  // Synchronize Tab Navigation & URL Hash on Change
  const handleSelectTabNav = (tab: 'dashboard' | 'arsip_saya' | 'arsip_bersama') => {
    setActiveTabNav(tab);
    setCurrentFolderUuid('root');
    sessionStorage.setItem('luminous_active_tab', tab);
    window.location.hash = tab;
  };

  // Listen to browser hash changes (Back/Forward navigation & Subfolder queries)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').split('?')[0];
      if (hash === 'arsip_saya' || hash === 'arsip_bersama' || hash === 'dashboard') {
        setActiveTabNav(hash);
        sessionStorage.setItem('luminous_active_tab', hash);
      }
      const hashMatch = window.location.hash.match(/[?&]q=([^&]+)/);
      if (hashMatch && hashMatch[1]) {
        setCurrentFolderUuid(decodeURIComponent(hashMatch[1]));
      } else {
        const params = new URLSearchParams(window.location.search);
        setCurrentFolderUuid(params.get('q') || 'root');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Fetch Items from MariaDB Backend on mount or user change
  useEffect(() => {
    if (!localStorage.getItem('gemini_api_key')) {
      localStorage.setItem('gemini_api_key', DEFAULT_GEMINI_API_KEY);
    }
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');

    if (currentUser) {
      refreshBackendData();
      refreshRecentActivities();
    }
  }, [currentUser, refreshBackendData, refreshRecentActivities]);

  // Subscribe to real-time background worker progress
  useEffect(() => {
    const unsubscribe = subscribeBackgroundQueue((fileUuid, progress, task, status) => {
      const normStatus: 'process' | 'done' | 'fail' =
        status === 'fail' || status === 'failed'
          ? 'fail'
          : status === 'done' || status === 'completed'
          ? 'done'
          : 'process';

      setAllItems((prev) =>
        prev.map((item) =>
          item.uuid === fileUuid || String(item.id) === fileUuid
            ? {
                ...item,
                processingProgress: progress,
                currentJobTask: task,
                status: normStatus,
              }
            : item
        )
      );
    });
    return () => unsubscribe();
  }, []);

  // Compute Active Tab Items (Arsip Saya vs Arsip Bersama vs Dashboard)
  const userEmail = (currentUser?.email || '').toLowerCase();

  const ownedItems = allItems.filter(
    (item) => item.ownerEmail.toLowerCase() === userEmail
  );

  const sharedItems = allItems.filter(
    (item) =>
      item.ownerEmail.toLowerCase() !== userEmail &&
      item.sharedWithEmails.map((e) => e.toLowerCase()).includes(userEmail)
  );

  const displayItems =
    activeTabNav === 'arsip_saya'
      ? ownedItems
      : activeTabNav === 'arsip_bersama'
      ? sharedItems
      : allItems;

  const activeTabTitle =
    activeTabNav === 'arsip_saya'
      ? `Arsip Saya (${currentUser?.name})`
      : activeTabNav === 'arsip_bersama'
      ? `Arsip Bersama (Dibagikan ke ${currentUser?.email})`
      : 'Semua Berkas';

  const categoryCounts = getDriveCategoryCounts(displayItems);
  const totalStorageSize = getDriveTotalStorage(displayItems);
  const activeJobsCount = allItems.filter(
    (f) => !f.isFolder && f.status === 'process'
  ).length;

  // AI Classification Stats
  const nonFolderFiles = allItems.filter((i) => !i.isFolder);
  const totalNonFolders = nonFolderFiles.length;
  const aiCount = nonFolderFiles.filter((f) => f.classificationMethod === 'ai').length;
  const manualCount = nonFolderFiles.filter((f) => f.classificationMethod === 'manual').length;
  const unclassifiedCount = nonFolderFiles.filter((f) => f.status === 'process').length;

  const classificationStats = {
    total: totalNonFolders,
    aiCount,
    aiPercentage: totalNonFolders > 0 ? Math.round((aiCount / totalNonFolders) * 100) : 0,
    manualCount,
    manualPercentage: totalNonFolders > 0 ? Math.round((manualCount / totalNonFolders) * 100) : 0,
    unclassifiedCount,
    unclassifiedPercentage: totalNonFolders > 0 ? Math.round((unclassifiedCount / totalNonFolders) * 100) : 0,
    accuracy: totalNonFolders > 0 ? 94.2 : 0,
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  // Upload File directly to MariaDB + Disk with UUID (Images & All Document Formats)
  const handleUploadFile = async (src: string, name: string, sizeKB: number) => {
    setIsUploadModalOpen(false);
    if (!currentUser) return;

    // Check if current view is inside a subfolder (?q=fld-...)
    let uploadFolderUuid = 'root';
    const hashMatch = window.location.hash.match(/[?&]q=([^&]+)/);
    if (hashMatch && hashMatch[1]) {
      uploadFolderUuid = decodeURIComponent(hashMatch[1]);
    } else {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) uploadFolderUuid = q;
    }

    const ext = name.split('.').pop()?.toLowerCase() || '';
    let fileMimeType = 'image/png';
    if (ext === 'pdf') fileMimeType = 'application/pdf';
    else if (ext === 'xlsx' || ext === 'xls') fileMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === 'docx' || ext === 'doc') fileMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === 'pptx' || ext === 'ppt') fileMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    else if (ext === 'csv') fileMimeType = 'text/csv';
    else if (ext === 'jpg' || ext === 'jpeg') fileMimeType = 'image/jpeg';
    else if (ext === 'webp') fileMimeType = 'image/webp';

    const newFile = await uploadFileToBackend(
      name,
      fileMimeType,
      sizeKB,
      src,
      currentUser.email,
      currentUser.name,
      uploadFolderUuid
    );

    if (newFile) {
      await refreshBackendData();
      enqueueBackgroundProcessing(newFile.uuid, newFile.name, src, sizeKB, apiKey, () => {
        refreshBackendData();
      });
    }
  };

  // Create Folder directly in MariaDB with UUID
  const handleCreateFolder = async (name: string, parentId: string, color: string) => {
    if (!currentUser) return;
    await createFolderInBackend(name, currentUser.email, parentId, color, currentUser.name);
    await refreshBackendData();
  };

  // Update Category directly in MariaDB by UUID
  const handleUpdateCategory = async (
    fileUuid: string,
    category: 'akademik' | 'keuangan' | 'sdm' | 'kemahasiswaan' | 'penelitian' | 'umum'
  ) => {
    await updateFileCategoryInBackend(fileUuid, category);
    await refreshBackendData();
  };

  // Rename Item directly in MariaDB by UUID
  const handleRenameItem = async (uuid: string, newName: string) => {
    await renameItemInBackend(uuid, newName);
    await refreshBackendData();
  };

  // Delete Item directly in MariaDB + Disk by UUID
  const handleDeleteFile = async (uuid: string) => {
    await deleteItemInBackend(uuid);
    await refreshBackendData();
    await refreshRecentActivities();
  };

  // Logout
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const handleSelectFile = (file: DriveItem) => {
    trackActivity(file);
    if (file.analysisResult) {
      setAnalysisResult(file.analysisResult);
      setActiveView('workbench');
    } else if (isDocumentFileType(file.name, file.fileType)) {
      const docAnalysis = synthesizeDocumentAnalysis(
        file.name,
        file.fileDataUrl || (file.filePath ? `http://localhost:3001/${file.filePath}` : ''),
        file.fileSizeKB || 0,
        file.fileType
      );
      setAnalysisResult(docAnalysis);
      setActiveView('workbench');
    }
  };

  const handleResetWorkbench = () => {
    setAnalysisResult(null);
    setActiveView('dashboard');
  };

  const handleOpenShareModal = (
    itemUuid: string,
    itemName: string,
    itemType: 'file' | 'folder',
    sharedWithEmails: string[]
  ) => {
    setShareTarget({
      isOpen: true,
      itemId: itemUuid,
      itemName,
      itemType,
      sharedWithEmails,
    });
  };

  // -------------------------------------------------------------
  // AUTH GUARD: If not logged in, render AuthScreen
  // -------------------------------------------------------------
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  // -------------------------------------------------------------
  // AUTHENTICATED: Render Protected Dashboard Panel
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#191C1E] flex flex-col font-sans transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
        totalTokensUsed={accumulatedTokens.totalUsedTokens}
        userName={currentUser.name}
        userRole={currentUser.role}
        userAvatar={currentUser.avatar}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeJobsCount={activeJobsCount}
        onLogout={handleLogout}
        activeTabNav={activeTabNav}
        currentFolderUuid={currentFolderUuid}
      />

      {/* Main Responsive Layout */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Left Column: SideNavBar */}
        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          categoryCounts={categoryCounts}
          activeTabNav={activeTabNav}
          onSelectTabNav={handleSelectTabNav}
          onLogout={handleLogout}
          userName={currentUser.name}
          userEmail={currentUser.email}
          userRole={currentUser.role}
          userAvatar={currentUser.avatar}
          currentFolderUuid={currentFolderUuid}
          totalTokensUsed={accumulatedTokens.totalUsedTokens}
        />

        {/* Center Main Content Area */}
        <main className="flex-1 md:ml-64 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeView === 'dashboard' ? (
            /* 1. If Tab is #dashboard -> Render DashboardOverview (Recent Activity + AI Klasifikasi + Storage) */
            activeTabNav === 'dashboard' ? (
              <DashboardOverview
                recentActivities={recentActivities}
                classificationStats={classificationStats}
                allItems={allItems}
                userName={currentUser.name}
                onOpenFolder={(folderUuid) => {
                  setActiveTabNav('arsip_saya');
                  window.location.hash = `#arsip_saya?q=${folderUuid}`;
                }}
                onOpenFile={handleSelectFile}
                onTrackActivity={trackActivity}
              />
            ) : (
              /* 2. If Tab is #arsip_saya or #arsip_bersama -> Render Full Width Table WITHOUT "AI Klasifikasi Otomatis" */
              <div className="w-full">
                <DashboardView
                  items={displayItems}
                  categoryCounts={categoryCounts}
                  totalStorageSize={totalStorageSize}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onOpenUploadModal={() => setIsUploadModalOpen(true)}
                  onSelectFile={handleSelectFile}
                  onDeleteFile={handleDeleteFile}
                  onRenameItem={handleRenameItem}
                  onCollaborationItem={handleOpenShareModal}
                  onUpdateCategory={handleUpdateCategory}
                  onAskAiAboutFile={handleAskAiAboutFile}
                  onCreateFolder={handleCreateFolder}
                  searchQuery={searchQuery}
                  activeTabTitle={activeTabTitle}
                  currentUserEmail={currentUser.email}
                  isCreateFolderOpen={isCreateFolderOpen}
                  onCloseCreateFolder={() => setIsCreateFolderOpen(false)}
                  activeTabNav={activeTabNav}
                  onTrackActivity={trackActivity}
                />
              </div>
            )
          ) : (
            /* Multimodal Vision & Document AI Intelligence Workbench View */
            <div className="space-y-6">
              {/* Back to Dashboard Breadcrumb Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl px-5 py-3.5 border border-slate-100 shadow-[0px_4px_20px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Drive</span>
                  </button>

                  <div className="h-4 w-px bg-slate-200 hidden xs:block" />

                  <div className="flex items-center gap-2 text-xs">
                    <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                    <span className="text-slate-500">Luminous Files</span>
                    <span className="text-slate-400">/</span>
                    <span className="font-bold text-slate-900">
                      Ekstraksi AI Workbench
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upload File Lain</span>
                  </button>
                </div>
              </div>

              {analysisResult && (
                /* Workbench Grid Layout */
                <div className="space-y-6">
                  {/* Top Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl px-5 py-3.5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                          <span>Hasil Ekstraksi AI: {analysisResult.imageName}</span>
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>Engine: <strong className="text-indigo-600">{analysisResult.engineUsed}</strong></span>
                          <span>•</span>
                          <span>{analysisResult.detectedObjects.length} Objek/Struktur</span>
                          {analysisResult.usageMetadata && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-800 font-mono font-bold text-[11px]">
                                <Zap className="w-3 h-3 text-amber-500" />
                                {analysisResult.usageMetadata.totalTokenCount.toLocaleString('id-ID')} Tokens
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsExportOpen(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Ekspor Laporan</span>
                      </button>

                      <button
                        onClick={handleResetWorkbench}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                        title="Kembali ke Dashboard Drive"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Split Screen Grid Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Interactive Canvas Viewer (5 Cols) */}
                    <div className="lg:col-span-5 flex flex-col">
                      <ImageCanvasViewer analysis={analysisResult} />
                    </div>

                    {/* Right Column: Tabbed Intelligence Panels (7 Cols) */}
                    <div className="lg:col-span-7 flex flex-col space-y-4">
                      {/* Tab Bar Navigation (2 Tab: Caption & Narasi, Tagging) */}
                      <div className="bg-white p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto scrollbar-none border border-slate-100 shadow-sm">
                        <button
                          onClick={() => setActiveTab('captions')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === 'captions'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Caption & Narasi</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('tags')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === 'tags'
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Tag className="w-4 h-4" />
                          <span>Tagging</span>
                        </button>
                      </div>

                      {/* Active Tab Panel Content */}
                      <div className="bg-white rounded-3xl p-5 flex-1 border border-slate-100 shadow-sm min-h-[460px]">
                        {activeTab === 'captions' && (
                          <CaptionPanel captions={analysisResult.captions} />
                        )}

                        {activeTab === 'tags' && (
                          <TaggingPanel
                            categories={analysisResult.tagCategories}
                            hashtags={analysisResult.captions?.hashtags}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Upload Modal Window */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-6 border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Upload File Ke Cloud Drive ({currentUser.name})
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <ImageUploader
              onImageSelected={(src, name, sizeKB) => handleUploadFile(src, name, sizeKB)}
            />
          </div>
        </div>
      )}

      {/* Share / Collaboration Item Modal */}
      <ShareModal
        isOpen={shareTarget.isOpen}
        onClose={() => setShareTarget((prev) => ({ ...prev, isOpen: false }))}
        itemId={shareTarget.itemId}
        itemName={shareTarget.itemName}
        itemType={shareTarget.itemType}
        sharedWithEmails={shareTarget.sharedWithEmails}
        onItemShared={refreshBackendData}
      />

      {/* Export Modal */}
      {analysisResult && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          analysis={analysisResult}
        />
      )}

      {/* Floating Action Button (FAB) for Realtime AI Chat Panel */}
      <button
        onClick={() => setIsGlobalChatOpen(!isGlobalChatOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
        title="Tanya AI & Cari Konteks Berkas"
      >
        <SparklesIcon className="w-6 h-6 text-amber-300 group-hover:rotate-12 transition-transform" />
        {allItems.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* Global AI Chat Sidebar Panel */}
      <GlobalAiChatPanel
        isOpen={isGlobalChatOpen}
        onClose={() => setIsGlobalChatOpen(false)}
        allItems={allItems}
        onSelectFile={handleSelectFile}
        onOpenFolder={(folderUuid) => {
          setActiveTabNav('arsip_saya');
          window.location.hash = `#arsip_saya?q=${folderUuid}`;
        }}
        autoRefFile={autoRefFile}
        onClearAutoRefFile={() => setAutoRefFile(null)}
      />

      {/* API & Account Settings Modal */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        currentUser={currentUser}
        onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
      />
    </div>
  );
}
