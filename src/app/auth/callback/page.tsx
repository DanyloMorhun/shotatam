'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const login = searchParams.get('login');
    const error = searchParams.get('error');
    const missing = searchParams.get('missing');

    if (error) {
      setIsError(true);
      setStatus(`Error: ${error}${missing ? ` (missing: ${missing})` : ''}`);
      return;
    }

    if (login === 'success') {
      void callRefresh();
    }
  }, [searchParams]);

  async function callRefresh() {
    setStatus('Calling POST /api/auth/refresh...');
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.text();
        setIsError(true);
        setStatus(`Refresh failed — ${res.status} ${res.statusText}\n${body}`);
        return;
      }

      window.location.href = '/';
    } catch (err) {
      setIsError(true);
      setStatus(`Refresh error — ${String(err)}`);
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Auth Callback</h1>
      <p style={{ color: isError ? 'crimson' : '#555' }}>{status}</p>
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
