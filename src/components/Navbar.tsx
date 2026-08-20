import { Search, Settings, Menu, Sparkles, LogOut, FolderPlus } from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenUploadModal: () => void;
  onOpenCreateFolder: () => void;
  totalTokensUsed?: number;
  userName: string;
  userRole?: string;
  userAvatar: string;
  onToggleMobileSidebar: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeJobsCount: number;
  onLogout: () => void;
  activeTabNav: 'dashboard' | 'arsip_saya' | 'arsip_bersama';
  currentFolderUuid?: string;
}

export function Navbar({
  onOpenSettings,
  onOpenUploadModal,
  onOpenCreateFolder,
  userName,
  userAvatar,
  onToggleMobileSidebar,
  searchQuery,
  onSearchChange,
  activeJobsCount,
  onLogout,
  activeTabNav,
  currentFolderUuid = 'root',
}: NavbarProps) {
  // Check if currently inside a subfolder (not root)
  const isInsideSubfolder = Boolean(currentFolderUuid && currentFolderUuid !== 'root');

  // Rule:
  // - #arsip_saya: always show buttons (root & subfolder)
  // - #arsip_bersama: ONLY show buttons when inside a subfolder (if not accessed any folder yet, DO NOT show)
  // - #dashboard: do not show buttons
  const showArsipActionButtons =
    activeTabNav === 'arsip_saya' || (activeTabNav === 'arsip_bersama' && isInsideSubfolder);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center h-16 sm:h-20 px-4 sm:px-8 md:ml-64 transition-all">
      {/* Left: Mobile Toggle & Global Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Luminous Search Bar */}
        <div className="relative flex items-center w-full max-w-md h-10 sm:h-11 rounded-full bg-slate-100/90 px-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-600/30 border border-slate-200/60 transition-all shadow-inner">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari file, folder, teks OCR..."
            className="w-full bg-transparent border-none focus:outline-none text-xs sm:text-sm font-medium placeholder:text-slate-400 text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Action Area */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Action Buttons: [+ Folder Baru] & [+ Upload File] (Desktop only, hidden on mobile) */}
        {showArsipActionButtons && (
          <div className="hidden md:flex items-center gap-2 mr-1 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={onOpenCreateFolder}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/80 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <span>+ Folder Baru</span>
            </button>

            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Upload File</span>
            </button>
          </div>
        )}

        {/* Active AI Jobs Pill */}
        {activeJobsCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{activeJobsCount} Background Job</span>
          </div>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all cursor-pointer"
          title="Pengaturan API Gemini & Token"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* User Profile Avatar with Logout */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
          <img
            src={userAvatar}
            alt={userName}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-slate-200 shadow-sm"
          />
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Keluar Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
