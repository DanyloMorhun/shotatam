'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UserBasicInfo {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
}

// ── sub-components ───────────────────────────────────────────────────────────

function OnlineCounter() {
  const [online, setOnline] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastHb, setLastHb] = useState<string>('—');
  const [log, setLog] = useState<{ msg: string; ok: boolean }[]>([]);
  const hbRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = connectSocket();
    return () => {
      hbRef.current && clearInterval(hbRef.current);
      s.disconnect();
    };
  }, []);

  function addLog(msg: string, ok = true) {
    setLog((prev) => [...prev.slice(-49), { msg: `[${new Date().toLocaleTimeString()}] ${msg}`, ok }]);
  }

  function startHeartbeatLoop(s: Socket) {
    hbRef.current && clearInterval(hbRef.current);
    hbRef.current = setInterval(() => {
      if (!document.hidden) {
        s.emit('heartbeat');
        setLastHb(new Date().toLocaleTimeString());
        addLog('heartbeat emitted');
      }
    }, 30_000);
  }

  function connectSocket(): Socket {
    const base = API_URL?.replace('/api', '') ?? '';
    const s = io(`${base}/system`, { transports: ['websocket'] });
    socketRef.current = s;

    s.on('connect', () => {
      setSocketConnected(true);
      addLog(`Socket connected (${s.id})`);
      startHeartbeatLoop(s);
    });

    s.on('disconnect', () => {
      setSocketConnected(false);
      addLog('Socket disconnected', false);
      hbRef.current && clearInterval(hbRef.current);
    });

    s.on('system:online', (d: { online: number }) => {
      setOnline(d.online);
      addLog(`system:online → ${d.online}`);
    });

    s.on('server:time', (d: { timestamp: number }) => {
      addLog(`server:time → ${new Date(d.timestamp).toLocaleTimeString()}`);
    });

    // resume/pause heartbeats with tab visibility
    const onVisibility = () => {
      if (!document.hidden) {
        s.emit('heartbeat');
        setLastHb(new Date().toLocaleTimeString());
        addLog('Tab visible — heartbeat emitted');
        startHeartbeatLoop(s);
      } else {
        hbRef.current && clearInterval(hbRef.current);
        addLog('Tab hidden — heartbeats paused');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    s.on('disconnect', () => document.removeEventListener('visibilitychange', onVisibility));

    return s;
  }

  const cellStyle: React.CSSProperties = {
    border: '1px solid #ddd', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
  };

  return (
    <section style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h2 style={{ marginBottom: '0.75rem' }}>Online Counter Test</h2>

      <div style={cellStyle}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{online ?? '—'} <span style={{ fontSize: '1rem', color: '#888' }}>online</span></div>
          <span style={{ fontSize: '0.85rem', color: socketConnected ? 'green' : '#aaa' }}>
            {socketConnected ? '● connected' : '○ disconnected'}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Last heartbeat: {lastHb}</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.5rem' }}>
          Heartbeats sent every 30s while tab is active. Paused when tab is hidden (AFK simulation).
        </p>
      </div>

      <div style={{ ...cellStyle, background: '#f8f8f8' }}>
        <strong style={{ fontSize: '0.9rem' }}>Log</strong>
        <div style={{ marginTop: '0.5rem', height: 160, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {log.length === 0 && <span style={{ color: '#aaa' }}>No events yet</span>}
          {log.map((e, i) => (
            <div key={i} style={{ color: e.ok ? '#1a7a1a' : 'crimson' }}>{e.msg}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── main page ────────────────────────────────────────────────────────────────

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
        const { result } = (await res.json()) as { result: { accessToken: string; user: UserBasicInfo } };
        setUser(result.user);
      }
    } finally {
      setChecking(false);
    }
  }

  async function handleSteamLogin() {
    const res = await fetch(`${API_URL}/api/auth/steam`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age: true, terms: true, privacy: true }),
    });
    if (res.ok) {
      const { result } = (await res.json()) as { result: { url: string } };
      window.location.href = result.url;
    }
  }

  async function handleLogout() {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  if (checking) {
    return <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>Checking session...</main>;
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
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
          <button onClick={handleSteamLogin}>Login with Steam</button>
        </>
      )}

      <OnlineCounter />
    </main>
  );
}
