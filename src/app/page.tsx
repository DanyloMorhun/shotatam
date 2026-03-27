'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UserBasicInfo {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
}

export default function HomePage() {
  const [user, setUser] = useState<UserBasicInfo | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    silentRefresh();
  }, []);

  async function silentRefresh() {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data = (await res.json()) as { accessToken: string; user: UserBasicInfo };
        setUser(data.user);
      }
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  if (checking) {
    return <main style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>Checking session...</main>;
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>SkinSlott Auth Test</h1>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}>
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt={user.nickname} width={48} height={48} style={{ borderRadius: '50%' }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>{user.nickname}</div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>ID: {user.userId}</div>
          </div>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <>
          <p>Click the button to log in via Steam.</p>
          <a href={`${API_URL}/api/auth/steam?age=1&terms=1&privacy=1`}>
            <button>Login with Steam</button>
          </a>
        </>
      )}
    </main>
  );
}
