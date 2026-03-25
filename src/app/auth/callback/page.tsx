'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);

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

      const data = (await res.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      setStatus('Cookie round-trip confirmed');
    } catch (err) {
      setStatus(`Refresh error — ${String(err)}`);
    }
  }

  async function callLogout() {
    setStatus('Calling POST /api/auth/logout...');
    try {
      const res = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        setStatus(`Logout failed — ${res.status} ${res.statusText}`);
        return;
      }

      setAccessToken(null);
      setLoggedOut(true);
      setStatus('Logged out — cookie cleared');
    } catch (err) {
      setStatus(`Logout error — ${String(err)}`);
    }
  }

  return (
    <main>
      <h1>Auth Callback</h1>

      <section>
        <strong>Status:</strong>
        <pre style={{ background: '#f0f0f0', padding: '1rem', whiteSpace: 'pre-wrap' }}>{status}</pre>
      </section>

      {accessToken && (
        <section>
          <strong>Access token (JWT):</strong>
          <pre style={{ background: '#e8f5e9', padding: '1rem', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
            {accessToken}
          </pre>
          <button onClick={callLogout}>Logout</button>
        </section>
      )}

      {loggedOut && (
        <p>
          <a href="/">Back to login</a>
        </p>
      )}
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
