'use client';

// Backend sets an httpOnly cookie on login — we never touch the token directly.
// All authenticated requests just need credentials: 'include'.
// Middleware reads the cookie server-side to gate routes.

export function authFetchOptions(): RequestInit {
  return { credentials: 'include' };
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch { /* ignore */ }
  window.location.href = '/';
}