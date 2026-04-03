'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UserBasicInfo {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
}

interface UserPrivateProfile {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  profileUrl: string;
  createdAt: string;
  lastLoginAt: string | null;
}

function UserCard({ user, details, onLogout }: { user: UserBasicInfo; details: UserPrivateProfile | null; onLogout: () => void }) {
  return (
    <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem', margin: '1rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user.avatarUrl && (
          <img src={user.avatarUrl} alt={user.nickname} width={64} height={64} style={{ borderRadius: '50%' }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user.nickname}</div>
          <div style={{ fontSize: '0.8rem', color: '#888' }}>ID: {user.userId}</div>
          {details && (
            <>
              <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                <a href={details.profileUrl} target="_blank" rel="noopener noreferrer">Steam profile ↗</a>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                Member since: {new Date(details.createdAt).toLocaleDateString()}
                {details.lastLoginAt && ` · Last login: ${new Date(details.lastLoginAt).toLocaleString()}`}
              </div>
            </>
          )}
        </div>
        <button onClick={onLogout}>Logout</button>
      </div>
    </section>
  );
}

function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');
  const [user, setUser] = useState<UserBasicInfo | null>(null);
  const [details, setDetails] = useState<UserPrivateProfile | null>(null);

  useEffect(() => {
    const login = searchParams.get('login');
    const error = searchParams.get('error');
    const missing = searchParams.get('missing');

    if (error) {
      setStatus(`Error: ${error}${missing ? ` (missing: ${missing})` : ''}`);
      return;
    }

    if (login === 'success') {
      callRefresh();
    }
  }, []);

  async function callRefresh() {
    setStatus('Calling POST /api/auth/refresh...');
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.text();
        setStatus(`Refresh failed — ${res.status} ${res.statusText}\n${body}`);
        return;
      }

      const { result } = (await res.json()) as { result: { accessToken: string; user: UserBasicInfo } };
      setUser(result.user);
      setStatus('Authenticated — fetching profile details...');
      await fetchDetails(result.accessToken);
    } catch (err) {
      setStatus(`Refresh error — ${String(err)}`);
    }
  }

  async function fetchDetails(token: string) {
    try {
      const res = await fetch(`${API_URL}/api/profile/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setStatus(`Authenticated (profile details unavailable — ${res.status})`);
        return;
      }

      const { result } = (await res.json()) as { result: UserPrivateProfile };
      setDetails(result);
      setStatus('Authenticated');
    } catch (err) {
      setStatus(`Authenticated (profile details error — ${String(err)})`);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
      setDetails(null);
      setStatus('Logged out');
      window.location.href = '/';
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Auth Callback</h1>

      <p style={{ color: status.startsWith('Error') || status.startsWith('Refresh failed') ? 'crimson' : '#555' }}>
        {status}
      </p>

      {user && <UserCard user={user} details={details} onLogout={handleLogout} />}
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <CallbackContent />
    </Suspense>
  );
}
