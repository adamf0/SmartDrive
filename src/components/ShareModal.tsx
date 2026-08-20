import { useState, useEffect } from 'react';
import { shareItemInBackend, unshareItemInBackend } from '../services/driveDatabase';
import { getAllAccounts, type AccountUser } from '../services/authService';
import { Share2, Mail, Users, Trash2, Send } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string; // File or Folder UUID
  itemName: string;
  itemType: 'file' | 'folder';
  sharedWithEmails: string[];
  onItemShared: () => void;
}

export function ShareModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  itemType,
  sharedWithEmails,
  onItemShared,
}: ShareModalProps) {
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [availableAccounts, setAvailableAccounts] = useState<AccountUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getAllAccounts().then((accounts) => {
        if (accounts) setAvailableAccounts(accounts);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsSubmitting(true);
    const success = await shareItemInBackend(itemId, cleanEmail);
    setIsSubmitting(false);

    if (success) {
      setTargetEmail('');
      onItemShared();
    }
  };

  const handleRemoveCollaborator = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setRemovingEmail(cleanEmail);
    const success = await unshareItemInBackend(itemId, cleanEmail);
    setRemovingEmail(null);

    if (success) {
      onItemShared();
    }
  };

  // Find user details for a shared email from accounts list
  const getUserDetails = (email: string) => {
    const acc = availableAccounts.find(
      (a) => a.email.toLowerCase() === email.toLowerCase()
    );
    if (acc) {
      return {
        name: acc.name,
        avatar: acc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        email: acc.email,
        role: acc.role || 'Pengguna',
      };
    }
    const defaultName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      name: defaultName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=6366f1&color=fff`,
      email,
      role: 'Pengguna',
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-100 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Kolaborasi &amp; Berbagi {itemType === 'folder' ? 'Folder' : 'File'}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs">{itemName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            title="Tutup Modal"
          >
            ✕
          </button>
        </div>

        {/* Share Form (Ketik Alamat Email Penerima Kolaborasi) */}
        <form onSubmit={handleShare} className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700">
            Ketik Alamat Email Penerima Kolaborasi
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="misal: andi@pakuan.ac.id"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-indigo-600 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Kirim'}</span>
            </button>
          </div>
        </form>

        {/* Section: Bersama Dengan (Daftar Akun dari shared_items) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bersama dengan</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100">
              {sharedWithEmails.length} Kolaborator
            </span>
          </div>

          {sharedWithEmails.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sharedWithEmails.map((email) => {
                const user = getUserDetails(email);
                const isRemoving = removingEmail === email.toLowerCase();

                return (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                      />
                      <div className="overflow-hidden">
                        <h5 className="text-xs font-bold text-slate-800 truncate">
                          {user.name}
                        </h5>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() => handleRemoveCollaborator(email)}
                      className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shrink-0 ml-2"
                      title="Hapus Hak Akses Kolaborasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-600">
                Belum ada pengguna lain dalam kolaborasi ini.
              </p>
              <p className="text-[11px] text-slate-400">
                Gunakan form di atas untuk menambahkan email rekan kerja.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
