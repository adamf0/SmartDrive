import {
  Cloud,
  FolderOpen,
  Share2,
  Settings,
  Plus,
  LayoutDashboard,
  LogOut,
  FolderPlus,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  activeView: 'dashboard' | 'workbench';
  onSelectView: (view: 'dashboard' | 'workbench') => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onOpenSettings: () => void;
  onOpenUploadModal: () => void;
  onOpenCreateFolder: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  categoryCounts: Record<string, number>;
  activeTabNav: 'dashboard' | 'arsip_saya' | 'arsip_bersama';
  onSelectTabNav: (tab: 'dashboard' | 'arsip_saya' | 'arsip_bersama') => void;
  onLogout: () => void;
  userName: string;
  userEmail: string;
  userRole?: string;
  userAvatar: string;
  currentFolderUuid?: string;
  totalTokensUsed?: number;
}

const CATEGORIES = [
  { id: 'akademik', name: 'Akademik', color: 'bg-blue-500' },
  { id: 'keuangan', name: 'Keuangan', color: 'bg-emerald-500' },
  { id: 'sdm', name: 'SDM & Pegawai', color: 'bg-amber-500' },
  { id: 'kemahasiswaan', name: 'Kemahasiswaan', color: 'bg-purple-500' },
  { id: 'penelitian', name: 'Penelitian', color: 'bg-cyan-500' },
  { id: 'umum', name: 'Umum', color: 'bg-slate-500' },
];

export function Sidebar({
  activeView,
  onSelectView,
  selectedCategory,
  onSelectCategory,
  onOpenSettings,
  onOpenUploadModal,
  onOpenCreateFolder,
  isMobileOpen,
  onCloseMobile,
  categoryCounts,
  activeTabNav,
  onSelectTabNav,
  onLogout,
  userName,
  userEmail,
  userAvatar,
  currentFolderUuid = 'root',
  totalTokensUsed = 0,
}: SidebarProps) {
  const handleNavClick = (tab: 'dashboard' | 'arsip_saya' | 'arsip_bersama') => {
    onSelectTabNav(tab);
    onSelectView('dashboard');
    onCloseMobile();
  };

  const isInsideSubfolder = Boolean(currentFolderUuid && currentFolderUuid !== 'root');
  const showArsipActionButtons =
    activeTabNav === 'arsip_saya' || (activeTabNav === 'arsip_bersama' && isInsideSubfolder);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main SmartDrive Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-slate-100 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] flex flex-col p-5 transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25">
            <Cloud className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-indigo-950 font-display tracking-tight leading-tight">
              SmartDrive
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Smart AI Cloud Drive</p>
          </div>
        </div>

        {/* Primary Action Buttons (+ Folder Baru & + Upload File) for MOBILE mode only */}
        {showArsipActionButtons && (
          <div className="md:hidden flex flex-col gap-2 mb-4">
            <button
              onClick={() => {
                onOpenCreateFolder();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 shadow-sm transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <span>+ Folder Baru</span>
            </button>

            <button
              onClick={() => {
                onOpenUploadModal();
                onCloseMobile();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Upload File</span>
            </button>
          </div>
        )}

        {/* Token Usage Counter Badge in Sidebar (Tersedia untuk Mobile & Desktop) */}
        <div className="mb-6 px-1">
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-200/80 hover:bg-amber-500/20 text-slate-800 font-mono text-xs font-bold shadow-sm transition-all cursor-pointer group"
            title="Penggunaan Token Gemini Vision API (Klik untuk Pengaturan)"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-mono text-xs text-slate-900 font-extrabold">
                {totalTokensUsed.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-slate-500 font-sans font-semibold">Tokens</span>
            </div>
          </button>
        </div>

        {/* Main Nav Links */}
        <div className="space-y-1 mb-6">
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabNav === 'dashboard' && activeView === 'dashboard'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border-r-4 border-indigo-600'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('arsip_saya')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabNav === 'arsip_saya'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border-r-4 border-indigo-600'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-4 h-4" />
              <span>Arsip Saya</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('arsip_bersama')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabNav === 'arsip_bersama'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border-r-4 border-indigo-600'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Share2 className="w-4 h-4" />
              <span>Arsip Bersama</span>
            </div>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between mb-2.5 px-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Kategori AI (Tags)
            </span>
            {selectedCategory && (
              <button
                onClick={() => onSelectCategory(null)}
                className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-1">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(isSelected ? null : cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* User Profile & Account Actions at Bottom */}
        <div className="pt-4 mt-auto border-t border-slate-100 space-y-3">
          {/* Active User Card */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={userAvatar}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-slate-900 truncate">{userName}</h4>
                <p className="text-[10px] text-slate-500 font-mono truncate">{userEmail}</p>
              </div>
            </div>

            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Pengaturan API Gemini"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun (Sign Out)</span>
          </button>
        </div>
      </aside>
    </>
  );
}
