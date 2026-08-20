import { useState, useEffect } from 'react';
import {
  loginAccount,
  registerAccount,
  getAllAccounts,
  type AccountUser,
} from '../services/authService';
import { Shield, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AccountUser;
  onUserChanged: (user: AccountUser) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'switch' | 'register'>('switch');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('Dosen Akademik');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [users, setUsers] = useState<AccountUser[]>([]);

  useEffect(() => {
    if (isOpen) {
      getAllAccounts().then((data) => {
        if (data) setUsers(data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectUser = async (user: AccountUser) => {
    const res = await loginAccount(user.email, '123456');
    if (res.success && res.user) {
      onUserChanged(res.user);
    } else {
      onUserChanged(user);
    }
    onClose();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Nama dan Email wajib diisi.');
      return;
    }

    const res = await registerAccount(name, email, '123456', role);
    if (res.success && res.user) {
      onUserChanged(res.user);
      setName('');
      setEmail('');
      onClose();
    } else {
      setErrorMsg(res.error || 'Gagal mendaftarkan akun.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-100 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Manajemen Akun (MariaDB)
              </h3>
              <p className="text-xs text-slate-500">
                Login sebagai: <strong className="text-indigo-600">{currentUser.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('switch')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'switch' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Ganti Akun Pengguna</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Akun Baru</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Switch User List */}
        {activeTab === 'switch' ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {users.map((u) => {
              const isCurrent = u.email === currentUser.email;
              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                    isCurrent
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{u.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                      <span className="text-[10px] text-indigo-600 font-semibold">{u.role}</span>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="flex items-center gap-1 text-xs text-indigo-600 font-bold bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Aktif</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Pilih</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="misal: Dr. Rian Pratama"
                className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-indigo-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Email Kampus / Instansi</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="misal: rian@pakuan.ac.id"
                className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-indigo-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Role / Peran</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:border-indigo-600 outline-none"
              >
                <option value="Administrator">Administrator</option>
                <option value="Dosen Akademik">Dosen Akademik</option>
                <option value="Staf Keuangan">Staf Keuangan</option>
                <option value="Mahasiswa">Mahasiswa</option>
                <option value="Peneliti">Peneliti</option>
                <option value="Pengguna">Pengguna Umum</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all mt-2"
            >
              Simpan & Masuk Akun
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
