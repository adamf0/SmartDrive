export interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

export type User = AccountUser;

const API_BASE_URL = 'http://localhost:3001/api';
const SESSION_USER_KEY = 'luminous_session_user';

// Get Current Logged-in User Session (null if not logged in)
export function getCurrentUser(): AccountUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse current user session:', e);
  }
  return null;
}

// Set Current User Session
export function setCurrentUserSession(user: AccountUser | null): void {
  try {
    if (user) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_USER_KEY);
    }
  } catch (e) {
    console.warn('Failed to set user session:', e);
  }
}

// Logout
export function logoutUser(): void {
  setCurrentUserSession(null);
}

// Login via MariaDB Backend API
export async function loginAccount(email: string, password?: string): Promise<{ success: boolean; user?: AccountUser; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.user) {
      setCurrentUserSession(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Login gagal. Silakan coba lagi.' };
  } catch {
    return { success: false, error: 'Tidak dapat terhubung ke server MariaDB. Pastikan backend aktif.' };
  }
}

// Register via MariaDB Backend API
export async function registerAccount(name: string, email: string, password?: string, role: string = 'Pengguna'): Promise<{ success: boolean; user?: AccountUser; error?: string }> {
  try {
    const avatar = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;
    const res = await fetch(`${API_BASE_URL}/account/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email: email.trim().toLowerCase(),
        password: password || '123456',
        role,
        avatar,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.user) {
      setCurrentUserSession(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Registrasi gagal.' };
  } catch {
    return { success: false, error: 'Tidak dapat terhubung ke server MariaDB.' };
  }
}

// Fetch all registered accounts from MariaDB
export async function getAllAccounts(): Promise<AccountUser[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/account`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Failed to fetch accounts from MariaDB:', e);
  }
  return [];
}

// Update Account Profile (Name, Email, Password, Avatar) via MariaDB Backend API
export async function updateAccountProfile(payload: {
  currentEmail: string;
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  avatar?: string;
}): Promise<{ success: boolean; user?: AccountUser; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/account/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      setCurrentUserSession(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Gagal memperbarui profil akun.' };
  } catch {
    // Fallback local update if backend fails
    const currentUser = getCurrentUser();
    if (currentUser) {
      const updated = {
        ...currentUser,
        name: payload.name || currentUser.name,
        email: payload.email || currentUser.email,
        avatar: payload.avatar || currentUser.avatar,
      };
      setCurrentUserSession(updated);
      return { success: true, user: updated };
    }
    return { success: false, error: 'Tidak dapat terhubung ke server MariaDB.' };
  }
}
