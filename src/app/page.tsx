'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

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
  email: string | null;
  telegram: string | null;
  tradeUrl: string | null;
  invitationLink: string;
}

// ── ProfileSection ────────────────────────────────────────────────────────────

function ProfileSection({ token }: { token: string }) {
  const [details, setDetails] = useState<UserPrivateProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tradeUrlInput, setTradeUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetchDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDetails() {
    setLoadError(null);
    try {
      const res = await fetch(`${API_URL}/api/profile/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setLoadError(`HTTP ${res.status}: ${body.message ?? 'unknown error'}`);
        return;
      }
      const { result } = (await res.json()) as { result: UserPrivateProfile };
      setDetails(result);
      setTradeUrlInput(result.tradeUrl ?? '');
    } catch (e) {
      setLoadError(String(e));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/profile/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tradeUrl: tradeUrlInput.trim() || null }),
      });

      if (res.ok) {
        const { result } = (await res.json()) as { result: UserPrivateProfile };
        setDetails(result);
        setTradeUrlInput(result.tradeUrl ?? '');
        setSaveStatus({ ok: true, msg: `Saved. tradeUrl = ${result.tradeUrl ?? 'null'}` });
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveStatus({ ok: false, msg: `${res.status}: ${body.message ?? 'unknown error'}` });
      }
    } catch (e) {
      setSaveStatus({ ok: false, msg: String(e) });
    } finally {
      setSaving(false);
    }
  }

  const cellStyle: React.CSSProperties = {
    border: '1px solid #ddd', borderRadius: 8, padding: '1rem',
  };

  return (
    <section style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h2 style={{ marginBottom: '0.75rem' }}>Profile Details</h2>

      {loadError && (
        <div style={{ color: 'crimson', marginBottom: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          Failed to load profile: {loadError}
          <button onClick={fetchDetails} style={{ marginLeft: 8, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {details && (
        <div style={{ ...cellStyle, marginBottom: '1rem', fontSize: '0.85rem', fontFamily: 'monospace', background: '#f8f8f8' }}>
          <div><strong>email:</strong> {details.email ?? <em style={{ color: '#aaa' }}>not set</em>}</div>
          <div><strong>telegram:</strong> {details.telegram ?? <em style={{ color: '#aaa' }}>not set</em>}</div>
          <div><strong>tradeUrl:</strong> {details.tradeUrl
            ? <span style={{ wordBreak: 'break-all' }}>{details.tradeUrl}</span>
            : <em style={{ color: '#aaa' }}>not set</em>}
          </div>
          <div><strong>invitationLink:</strong> {details.invitationLink}</div>
        </div>
      )}

      <form onSubmit={handleSave} style={cellStyle}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
          Set Trade URL
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={tradeUrlInput}
            onChange={(e) => setTradeUrlInput(e.target.value)}
            placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..."
            style={{ flex: 1, minWidth: 280, padding: '0.4rem 0.6rem', fontFamily: 'monospace', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: 4 }}
          />
          <button type="submit" disabled={saving} style={{ padding: '0.4rem 1rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {details?.tradeUrl && (
            <button
              type="button"
              disabled={saving}
              onClick={() => { setTradeUrlInput(''); }}
              style={{ padding: '0.4rem 0.75rem', cursor: 'pointer', color: 'crimson' }}
            >
              Clear
            </button>
          )}
        </div>

        {saveStatus && (
          <div style={{
            marginTop: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: 6,
            background: saveStatus.ok ? '#f0fdf4' : '#fff5f5',
            color: saveStatus.ok ? '#15803d' : 'crimson',
            fontFamily: 'monospace', fontSize: '0.85rem',
            border: `1px solid ${saveStatus.ok ? '#86efac' : '#fca5a5'}`,
          }}>
            {saveStatus.ok ? '✓ ' : '✗ '}{saveStatus.msg}
          </div>
        )}
      </form>
    </section>
  );
}

// ── WalletEventListener ───────────────────────────────────────────────────────

function WalletEventListener({ token }: { token: string }) {
  const [events, setEvents] = useState<{ balance: number; time: string }[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const base = API_URL?.replace('/api', '') ?? '';
    const s = io(`${base}/notifications`, {
      transports: ['websocket'],
      auth: { token },
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('wallet:balance_updated', (d: { balance: number }) => {
      setEvents((prev) => [{ balance: d.balance, time: new Date().toLocaleTimeString() }, ...prev]);
    });

    return () => { s.disconnect(); };
  }, [token]);

  const boxStyle: React.CSSProperties = {
    border: '2px solid', borderRadius: 8, padding: '1rem', marginTop: '1rem',
    borderColor: connected ? 'green' : '#aaa',
  };

  return (
    <section style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h2>wallet:balance_updated listener</h2>
      <div style={boxStyle}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: connected ? 'green' : '#aaa' }}>
          {connected ? '● connected to /notifications' : '○ disconnected'}
        </div>
        {events.length === 0 ? (
          <div style={{ color: '#aaa', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            Waiting for wallet:balance_updated event...
          </div>
        ) : (
          events.map((e, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.9rem', padding: '0.4rem 0', borderBottom: '1px solid #eee', color: i === 0 ? 'green' : '#555' }}>
              [{e.time}] balance = {e.balance} cents ({(e.balance / 100).toFixed(2)} $)
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ── OnlineCounter ─────────────────────────────────────────────────────────────

function OnlineCounter() {
  const [online, setOnline] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [log, setLog] = useState<{ msg: string; ok: boolean }[]>([]);

  useEffect(() => {
    const base = API_URL?.replace('/api', '') ?? '';
    const s = io(`${base}/system`, { transports: ['websocket'] });

    function addLog(msg: string, ok = true) {
      setLog((prev) => [...prev.slice(-49), { msg: `[${new Date().toLocaleTimeString()}] ${msg}`, ok }]);
    }

    s.on('connect', () => {
      setSocketConnected(true);
      addLog(`Socket connected (${s.id})`);
    });

    s.on('disconnect', () => {
      setSocketConnected(false);
      addLog('Socket disconnected', false);
    });

    s.on('system:online', (d: { online: number }) => {
      setOnline(d.online);
      addLog(`system:online → ${d.online}`);
    });

    s.on('server:time', (d: { timestamp: number }) => {
      addLog(`server:time → ${new Date(d.timestamp).toLocaleTimeString()}`);
    });

    return () => { s.disconnect(); };
  }, []);

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
        </div>
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

// ── main page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [user, setUser] = useState<UserBasicInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
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
        setToken(result.accessToken);
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
    setToken(null);
  }

  if (checking) {
    return <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>Checking session...</main>;
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>SkinSlott Auth Test</h1>

      <nav style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => { window.location.href = '/main-ws'; }}>→ /main-ws</button>
      </nav>

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

      {token && <ProfileSection token={token} />}
      <OnlineCounter />
      {token && <WalletEventListener token={token} />}
    </main>
  );
}
