'use client';

import { useEffect } from 'react';

import { API_URL } from '@/config';

const INTERVAL = 10 * 60 * 1000;

export default function TokenRefresher() {
  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (res.ok) {
          const { result } = await res.json();
          localStorage.setItem('access_token', result.accessToken);
          window.dispatchEvent(new CustomEvent('access-token', { detail: result.accessToken }));
        }
      } catch {}
    }
    refresh();
    const id = setInterval(refresh, INTERVAL);
    return () => clearInterval(id);
  }, []);
  return null;
}
