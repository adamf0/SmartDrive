import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Key,
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
  RotateCcw,
  BarChart3,
  User,
  Mail,
  Lock,
  Camera,
  AlertCircle,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import { getAccumulatedTokenUsage, resetTokenUsage, type AccumulatedTokenUsage } from '../utils/tokenManager';
import { updateAccountProfile, type AccountUser } from '../services/authService';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  currentUser: AccountUser | null;
  onUpdateUser: (user: AccountUser) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
];

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  currentUser,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'api'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account Profile States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Handle Local Image File Upload for Avatar
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setProfileError('Berkas yang diunggah harus berupa berkas gambar (JPG, PNG, WEBP, GIF, SVG).');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setProfileError('Ukuran berkas gambar terlalu besar. Maksimal 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatar(event.target.result as string);
          setProfileError('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // API & Token States
  const [inputKey, setInputKey] = useState(apiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<AccumulatedTokenUsage>(getAccumulatedTokenUsage());

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setAvatar(currentUser.avatar || PRESET_AVATARS[0]);
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTokenUsage(getAccumulatedTokenUsage());
      setProfileSuccess('');
      setProfileError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Save Account Profile
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setProfileSuccess('');
    setProfileError('');

    if (newPassword && newPassword !== confirmPassword) {
      setProfileError('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setProfileError('Password baru minimal 6 karakter.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await updateAccountProfile({
        currentEmail: currentUser.email,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        currentPassword: currentPassword ? currentPassword.trim() : undefined,
        newPassword: newPassword ? newPassword.trim() : undefined,
        avatar: avatar.trim(),
      });

      if (res.success && res.user) {
        onUpdateUser(res.user);
        setProfileSuccess('Profil akun dan password berhasil diperbarui!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setProfileError(res.error || 'Gagal memperbarui profil akun.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Save API Key
  const handleSaveApi = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(inputKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1500);
  };

  const handleResetTokens = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset statistik jumlah token yang terpakai ke 0?')) {
      const resetStats = resetTokenUsage();
      setTokenUsage(resetStats);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-3xl p-6 space-y-6 border border-slate-200 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header & Tabs */}
        <div className="space-y-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-extrabold text-slate-900 font-display">
                Pengaturan Akun &amp; Sistem
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4 text-indigo-600" />
              <span>Profil &amp; Password</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'api'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key className="w-4 h-4 text-purple-600" />
              <span>API Key &amp; Token</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Account Profile & Password Settings */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateAccount} className="space-y-5">
            {profileSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {/* Premium Avatar Profile Picture Uploader */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/30 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Foto Profil (Avatar)</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Format: JPG, PNG, WEBP (Max 8MB)</span>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileUpload}
              />

              <div className="flex items-center gap-5">
                {/* Avatar Preview with Camera Overlay Badge */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group shrink-0 cursor-pointer"
                  title="Klik untuk memilih foto dari komputer Anda"
                >
                  <img
                    src={avatar}
                    alt="Preview Avatar"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md ring-4 ring-indigo-500/20 group-hover:ring-indigo-500/50 transition-all"
                  />
                  <div className="absolute inset-0 bg-slate-950/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 backdrop-blur-2xs">
                    <Camera className="w-5 h-5 text-indigo-300 animate-bounce" />
                    <span>Ganti Foto</span>
                  </div>
                </div>

                {/* Action Buttons & Presets */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Foto Komputer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      {showUrlInput ? 'Sembunyikan Link' : 'Gunakan Link URL'}
                    </button>
                  </div>

                  {/* Preset Avatars Row */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Atau pilih avatar default:
                    </span>
                    <div className="flex items-center gap-2">
                      {PRESET_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatar(url)}
                          className={`w-8 h-8 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                            avatar === url
                              ? 'border-indigo-600 ring-2 ring-indigo-500/40 scale-105 shadow-sm'
                              : 'border-white opacity-70 hover:opacity-100 hover:scale-105'
                          }`}
                          title={`Gunakan Preset #${idx + 1}`}
                        >
                          <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable URL Input */}
              {showUrlInput && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="Tempelkan URL gambar (https://...)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                  />
                </div>
              )}
            </div>

            {/* User Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Nama Lengkap</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Alamat Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all"
                />
              </div>
            </div>

            {/* Password Update Section */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Ganti Password Akun (Opsional)
                </h4>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Password Saat Ini (Dibutuhkan jika ganti password)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 karakter"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {isUpdatingProfile ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan Profil</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: API Key & Token Manager */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* Token Usage Dashboard */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Statistik Penggunaan Total Token
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleResetTokens}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-[11px] font-semibold text-slate-600 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Reset hitungan token ke 0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Token</span>
                </button>
              </div>

              {/* Token Stats Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
                  <span className="text-[10px] text-slate-500 font-medium block">Input (Prompt)</span>
                  <span className="text-sm font-extrabold font-mono text-blue-600">
                    {tokenUsage.totalPromptTokens.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
                  <span className="text-[10px] text-slate-500 font-medium block">Output (Gen)</span>
                  <span className="text-sm font-extrabold font-mono text-purple-600">
                    {tokenUsage.totalCandidateTokens.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-200 text-center shadow-sm">
                  <span className="text-[10px] text-amber-800 font-medium block flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                    <span>Total Token</span>
                  </span>
                  <span className="text-base font-black font-mono text-amber-700">
                    {tokenUsage.totalUsedTokens.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
                <span>Total Permintaan Foto: <strong className="text-slate-800">{tokenUsage.requestCount} Request</strong></span>
                <span>Rata-rata: <strong className="text-slate-800">{tokenUsage.requestCount > 0 ? Math.round(tokenUsage.totalUsedTokens / tokenUsage.requestCount) : 0} Token/Req</strong></span>
              </div>
            </div>

            {/* API Key Form */}
            <form onSubmit={handleSaveApi} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Gemini Multimodal API Key
                </label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 border border-purple-100 text-[11px] text-purple-700">
                <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600" />
                <span>API Key &amp; statistik token disimpan secara aman di Local Storage browser Anda.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Simpan API Key</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
