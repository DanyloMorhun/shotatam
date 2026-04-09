'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UserBasicInfo {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getSessionId(): string {
  const KEY = 'test_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ── sub-components ───────────────────────────────────────────────────────────

function OnlineCounter() {
  const [onlineHttp, setOnlineHttp] = useState<number | null>(null);
  const [onlineSocket, setOnlineSocket] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [hbActive, setHbActive] = useState(false);
  const [lastHb, setLastHb] = useState<string>('—');
  const [log, setLog] = useState<{ msg: string; ok: boolean }[]>([]);
  const hbRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const sessionId = useRef<string>('');

  useEffect(() => {
    sessionId.current = getSessionId();
    return () => {
      hbRef.current && clearInterval(hbRef.current);
      socketRef.current?.disconnect();
    };
  }, []);

  function addLog(msg: string, ok = true) {
    setLog((prev) => [...prev.slice(-49), { msg: `[${new Date().toLocaleTimeString()}] ${msg}`, ok }]);
  }

  async function sendHeartbeat() {
    try {
      const res = await fetch(`${API_URL}/api/system/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current }),
      });
      if (res.status === 204) {
        setLastHb(new Date().toLocaleTimeString());
        addLog('Heartbeat sent ✓');
      } else {
        addLog(`Heartbeat ${res.status}`, false);
      }
    } catch (e) {
      addLog(`Heartbeat error: ${e}`, false);
    }
  }

  function startHeartbeat() {
    if (hbRef.current) return;
    sendHeartbeat();
    hbRef.current = setInterval(sendHeartbeat, 30_000);
    setHbActive(true);
    addLog('Heartbeat started (every 30s)');
    connectSocket();
  }

  function stopHeartbeat() {
    if (hbRef.current) { clearInterval(hbRef.current); hbRef.current = null; }
    setHbActive(false);
    addLog('Heartbeat stopped');
  }

  function connectSocket() {
    if (socketRef.current) return;
    const base = API_URL?.replace('/api', '') ?? '';
    const s = io(`${base}/system`, { transports: ['websocket'] });
    socketRef.current = s;

    s.on('connect', () => { setSocketConnected(true); addLog(`Socket connected (${s.id})`); });
    s.on('disconnect', () => { setSocketConnected(false); addLog('Socket disconnected', false); });
    s.on('system:online', (d: { online: number }) => {
      setOnlineSocket(d.online);
      addLog(`system:online → ${d.online}`);
    });
    s.on('server:time', (d: { timestamp: number }) => {
      addLog(`server:time → ${new Date(d.timestamp).toLocaleTimeString()}`);
    });
  }

  async function fetchOnline() {
    try {
      const res = await fetch(`${API_URL}/api/system/online`);
      const json = await res.json();
      const n: number = json?.result?.online ?? json?.online;
      setOnlineHttp(n);
      addLog(`GET /system/online → ${n}`);
    } catch (e) {
      addLog(`GET /system/online error: ${e}`, false);
    }
  }

  const cellStyle: React.CSSProperties = {
    border: '1px solid #ddd', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
  };
  const btnStyle: React.CSSProperties = {
    padding: '4px 12px', fontFamily: 'monospace', cursor: 'pointer', marginRight: 6, borderRadius: 4, border: '1px solid #ccc',
  };

  return (
    <section style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h2 style={{ marginBottom: '0.75rem' }}>Online Counter Test</h2>

      <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.75rem' }}>
        Session ID: <code>{sessionId.current}</code>
      </p>

      {/* Heartbeat + counts */}
      <div style={cellStyle}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <button style={btnStyle} onClick={startHeartbeat} disabled={hbActive}>
            {hbActive ? '● Heartbeat running' : 'Start heartbeat'}
          </button>
          <button style={btnStyle} onClick={stopHeartbeat} disabled={!hbActive}>Stop</button>
          <button style={btnStyle} onClick={fetchOnline}>Poll /system/online</button>
          <span style={{ fontSize: '0.8rem', color: socketConnected ? 'green' : '#aaa' }}>
            {socketConnected ? '● Socket connected' : '○ Socket disconnected'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
          <div>HTTP count: <strong>{onlineHttp ?? '—'}</strong></div>
          <div>Socket count: <strong>{onlineSocket ?? '—'}</strong></div>
          <div style={{ color: '#888' }}>Last heartbeat: {lastHb}</div>
        </div>
      </div>

      {/* Log */}
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
