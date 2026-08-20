import { useState, useEffect } from 'react';
import { loginAccount, registerAccount, getAllAccounts, type AccountUser } from '../services/authService';
import { Cloud, Lock, Mail, User as UserIcon, Shield, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: AccountUser) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('yuni@pakuan.ac.id');
  const [password, setPassword] = useState<string>('123456');
  const [role, setRole] = useState<string>('Administrator');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [presetAccounts, setPresetAccounts] = useState<AccountUser[]>([]);

  useEffect(() => {
    getAllAccounts().then((accounts) => {
      if (accounts && accounts.length > 0) {
        setPresetAccounts(accounts);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (isRegisterMode) {
      if (!name.trim()) {
        setErrorMsg('Silakan masukkan nama lengkap.');
        setIsLoading(false);
        return;
      }
      const res = await registerAccount(name, email, password, role);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Gagal mendaftar.');
      }
    } else {
      const res = await loginAccount(email, password);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Email atau password salah.');
      }
    }
  };

  const handleQuickLogin = async (acc: AccountUser) => {
    setIsLoading(true);
    setErrorMsg('');
    const res = await loginAccount(acc.email, '123456');
    setIsLoading(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      // Fallback
      onLoginSuccess(acc);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#191C1E] font-sans relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Gradient Blurs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute w-[700px] h-[700px] bg-indigo-500/10 rounded-full blur-3xl -top-40 -right-40" />
        <div className="absolute w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl -bottom-32 -left-32" />
      </div>

      {/* Main Login/Register Container */}
      <main className="relative z-10 w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl shadow-[0px_4px_25px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3 justify-center mb-1">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Cloud className="w-6 h-6 fill-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-950 font-display tracking-tight">
              Luminous Files
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Smart AI Cloud Archive & Collaborative Workspace
          </p>
        </header>

        {/* Auth Mode Tabs */}
        <div className="flex bg-slate-100 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isRegisterMode
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Masuk (Sign In)
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isRegisterMode
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegisterMode && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700" htmlFor="name">
                Nama Lengkap
              </label>
              <div className="relative flex items-center">
                <UserIcon className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Yuni Sri Melani"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-xs font-medium text-slate-900 transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700" htmlFor="email">
              Alamat Email
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@pakuan.ac.id"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-xs font-medium text-slate-900 transition-all"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700" htmlFor="password">
                Kata Sandi (Password)
              </label>
              <span className="text-[11px] text-indigo-600 font-semibold">Default: 123456</span>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-xs font-medium text-slate-900 transition-all"
                required
              />
            </div>
          </div>

          {isRegisterMode && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Role / Posisi</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-600 outline-none text-xs font-medium text-slate-900"
              >
                <option value="Administrator">Administrator</option>
                <option value="Dosen Akademik">Dosen Akademik</option>
                <option value="Staf Keuangan">Staf Keuangan</option>
                <option value="Mahasiswa">Mahasiswa</option>
                <option value="Peneliti">Peneliti</option>
                <option value="Pengguna">Pengguna Umum</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <span>{isLoading ? 'Memproses...' : isRegisterMode ? 'Daftar Akun Baru' : 'Masuk ke Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Fast Switch Demo Accounts */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              1-Klik Masuk Akun Ujicoba (MariaDB)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {(presetAccounts.length > 0
              ? presetAccounts
              : [
                  {
                    id: 'user-yuni',
                    name: 'Yuni Sri Melani',
                    email: 'yuni@pakuan.ac.id',
                    role: 'Administrator',
                    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                  },
                  {
                    id: 'user-andi',
                    name: 'Dr. Andi Wijaya',
                    email: 'andi@pakuan.ac.id',
                    role: 'Dosen Akademik',
                    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                  },
                  {
                    id: 'user-keuangan',
                    name: 'Admin Keuangan',
                    email: 'keuangan@pakuan.ac.id',
                    role: 'Staf Keuangan',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                  },
                ]
            ).map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickLogin(acc)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                      {acc.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">{acc.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-white px-2 py-1 rounded-lg border border-slate-200 group-hover:border-indigo-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pilih</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
