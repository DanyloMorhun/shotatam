'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { API_URL } from '@/config';

interface UserBasicInfo {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
}

interface UserProfileStats {
  wonLotteries: number;
  purchasedTickets: number;
  totalEarnings: number;
  smallestWinChance: number | null;
}

interface UserPrivateProfile {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  profileUrl: string;
  createdAt: string;
  lastLoginAt: string | null;
  email: string | null;
  telegram: string | null;
  tradeUrl: string | null;
  invitationLink: string;
  stats: UserProfileStats;
}

// ── ProfileSection — read-only info + always-visible edit fields ──────────────

function ProfileSection({ token, user, onLogout }: { token: string; user: UserBasicInfo; onLogout: () => void }) {
  const [details, setDetails] = useState<UserPrivateProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState({ email: '', telegram: '', tradeUrl: '' });
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
      setDraft({ email: result.email ?? '', telegram: result.telegram ?? '', tradeUrl: result.tradeUrl ?? '' });
    } catch (e) {
      setLoadError(String(e));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!details) return;
    setSaving(true);
    setSaveStatus(null);

    const prev = details;
    const prevDraft = { ...draft };
    try {
      const res = await fetch(`${API_URL}/api/profile/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: draft.email.trim() || null,
          telegram: draft.telegram.trim() || null,
          tradeUrl: draft.tradeUrl.trim() || null,
        }),
      });

      if (res.ok) {
        const { result } = (await res.json()) as { result: UserPrivateProfile };
        setDetails(result);
        setDraft({ email: result.email ?? '', telegram: result.telegram ?? '', tradeUrl: result.tradeUrl ?? '' });
        setSaveStatus({ ok: true, msg: 'Saved.' });
      } else {
        const body = await res.json().catch(() => ({}));
        setDetails(prev);
        setDraft(prevDraft);
        setSaveStatus({ ok: false, msg: `${res.status}: ${body.message ?? 'unknown error'}` });
      }
    } catch (e) {
      setDetails(prev);
      setDraft(prevDraft);
      setSaveStatus({ ok: false, msg: String(e) });
    } finally {
      setSaving(false);
    }
  }

  const cell: React.CSSProperties = { border: '1px solid #333', borderRadius: 8, padding: '1rem' };
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '0.35rem 0.6rem', fontFamily: 'monospace', fontSize: '0.85rem',
    border: '1px solid #444', borderRadius: 4, background: '#222', color: '#e5e7eb',
  };
  const labelStyle: React.CSSProperties = { width: 100, fontSize: '0.82rem', color: '#888', flexShrink: 0 };

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ marginBottom: '0.75rem' }}>Profile</h2>

      {loadError && (
        <div style={{ color: 'crimson', marginBottom: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          Failed to load profile: {loadError}
          <button onClick={fetchDetails} style={{ marginLeft: 8, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      <div style={{ ...cell, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ── avatar / name / logout ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt={user.nickname} width={48} height={48} style={{ borderRadius: '50%' }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>{user.nickname}</div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>ID: {user.userId}</div>
          </div>
          <button onClick={onLogout}>Logout</button>
        </div>

      {details && (
        <>
          {/* ── read-only info ── */}
          <div style={{ background: '#1a1a1a', borderRadius: 6, padding: '0.75rem', fontSize: '0.85rem', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><strong>userId:</strong> {details.userId}</div>
              <div><strong>profileUrl:</strong> <a href={details.profileUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{details.profileUrl}</a></div>
              <div><strong>createdAt:</strong> {new Date(details.createdAt).toLocaleString()}</div>
              <div><strong>lastLoginAt:</strong> {details.lastLoginAt ? new Date(details.lastLoginAt).toLocaleString() : <em style={{ color: '#aaa' }}>—</em>}</div>
              <div style={{ marginTop: 4 }}>
                <strong>invitationLink:</strong>{' '}
                <span style={{ wordBreak: 'break-all' }}>{details.invitationLink}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#aaa' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Stats</div>
              <div>won lotteries: {details.stats.wonLotteries}</div>
              <div>purchased tickets: {details.stats.purchasedTickets}</div>
              <div>total earnings: ${(details.stats.totalEarnings / 100).toFixed(2)}</div>
              <div>best win chance: {details.stats.smallestWinChance != null ? `${details.stats.smallestWinChance}%` : '—'}</div>
            </div>
          </div>

          {/* ── editable fields ── */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(['email', 'telegram', 'tradeUrl'] as const).map(field => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={labelStyle}>{field}</span>
                <input
                  type="text"
                  value={draft[field]}
                  onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                  placeholder={
                    field === 'tradeUrl' ? 'https://steamcommunity.com/tradeoffer/new/?partner=...&token=...'
                    : field === 'telegram' ? '@username'
                    : 'email@example.com'
                  }
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 4 }}>
              <button type="submit" disabled={saving} style={{ padding: '5px 16px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saveStatus && (
                <span style={{
                  padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.82rem',
                  background: saveStatus.ok ? '#f0fdf4' : '#fff5f5',
                  color: saveStatus.ok ? '#15803d' : 'crimson',
                  border: `1px solid ${saveStatus.ok ? '#86efac' : '#fca5a5'}`,
                }}>
                  {saveStatus.ok ? '✓ ' : '✗ '}{saveStatus.msg}
                </span>

              )}
            </div>
          </form>
        </>
      )}
      </div>
    </section>
  );
}

// ── SystemConsole — unified stats + log ───────────────────────────────────────

interface PlatformStats {
  lotteriesPlayed: number;
  totalEarned: number;
  registeredUsers: number;
}

interface LogEntry {
  id: number;
  time: string;
  source: 'system' | 'wallet';
  event: string;
  payload: unknown;
}

function SystemConsole({ token }: { token: string | null }) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [systemConnected, setSystemConnected] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  // latest known values
  const [latestTime, setLatestTime] = useState<string | null>(null);
  const [latestOnline, setLatestOnline] = useState<number | null>(null);
  const [latestBalance, setLatestBalance] = useState<number | null>(null);
  const [latestStats, setLatestStats] = useState<PlatformStats | null>(null);

  const entryId = useRef(0);

  function addLog(source: LogEntry['source'], event: string, payload: unknown) {
    const d = new Date();
    const hms = d.toLocaleTimeString('en', { hour12: false });
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    const time = `${hms}.${ms}`;
    setLog(prev => [{ id: ++entryId.current, time, source, event, payload }, ...prev.slice(0, 199)]);
  }

  useEffect(() => {
    const base = new URL(API_URL).origin;
    const sys = io(`${base}/system`, { transports: ['websocket'] });

    sys.on('connect', () => setSystemConnected(true));
    sys.on('disconnect', () => setSystemConnected(false));

    sys.on('server:time', (d: { timestamp: number }) => {
      const t = new Date(d.timestamp).toLocaleTimeString();
      setLatestTime(t);
      addLog('system', 'server:time', d);
    });

    sys.on('system:online', (d: { online: number }) => {
      setLatestOnline(d.online);
      addLog('system', 'system:online', d);
    });

    sys.on('system:stats', (d: PlatformStats) => {
      setLatestStats(d);
      addLog('system', 'system:stats', d);
    });

    return () => { sys.disconnect(); };
  }, []);

  useEffect(() => {
    if (!token) return;
    const base = new URL(API_URL).origin;
    const notif = io(`${base}/notifications`, { transports: ['websocket'], auth: { token } });

    notif.on('connect', () => setWalletConnected(true));
    notif.on('disconnect', () => setWalletConnected(false));

    notif.on('wallet:balance_updated', (d: { balance: number }) => {
      setLatestBalance(d.balance);
      addLog('wallet', 'wallet:balance_updated', d);
    });

    return () => { notif.disconnect(); };
  }, [token]);

  const statCell: React.CSSProperties = {
    background: '#1a1a1a', border: '1px solid #333', borderRadius: 6,
    padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.82rem',
  };

  return (
    <section style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
      <h2 style={{ marginBottom: '0.75rem' }}>Logs</h2>

      {/* connection status */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.82rem', fontFamily: 'monospace' }}>
        <span style={{ color: systemConnected ? 'green' : '#aaa' }}>{systemConnected ? '●' : '○'} /system</span>
        {token && <span style={{ color: walletConnected ? 'green' : '#aaa' }}>{walletConnected ? '●' : '○'} /notifications</span>}
      </div>

      {/* latest stats bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div style={statCell}>
          <div style={{ color: '#888', fontSize: '0.72rem' }}>server time</div>
          <div>{latestTime ?? '—'}</div>
        </div>
        <div style={statCell}>
          <div style={{ color: '#888', fontSize: '0.72rem' }}>online</div>
          <div>{latestOnline ?? '—'}</div>
        </div>
        {token && (
          <div style={statCell}>
            <div style={{ color: '#888', fontSize: '0.72rem' }}>balance</div>
            <div>{latestBalance !== null ? `${(latestBalance / 100).toFixed(2)} $` : '—'}</div>
          </div>
        )}
        <div style={statCell}>
          <div style={{ color: '#888', fontSize: '0.72rem' }}>lotteries played</div>
          <div>{latestStats?.lotteriesPlayed ?? '—'}</div>
        </div>
        <div style={statCell}>
          <div style={{ color: '#888', fontSize: '0.72rem' }}>total earned</div>
          <div>{latestStats ? `${(latestStats.totalEarned / 100).toFixed(2)} $` : '—'}</div>
        </div>
        <div style={statCell}>
          <div style={{ color: '#888', fontSize: '0.72rem' }}>registered users</div>
          <div>{latestStats?.registeredUsers ?? '—'}</div>
        </div>
      </div>

      {/* log console */}
      <div style={{ border: '1px solid #333', borderRadius: 8, background: '#111', height: 260, overflowY: 'auto', padding: '0.5rem' }}>
        {log.length === 0 && <div style={{ color: '#555', fontFamily: 'monospace', fontSize: '0.82rem', padding: '0.5rem' }}>Waiting for events…</div>}
        {log.map(e => (
          <div key={e.id} style={{ fontFamily: 'monospace', fontSize: '0.78rem', padding: '2px 0', borderBottom: '1px solid #1f1f1f', display: 'flex', gap: 8 }}>
            <span style={{ color: '#555', flexShrink: 0 }}>{e.time}</span>
            <span style={{ color: e.source === 'wallet' ? '#60a5fa' : '#4ade80', flexShrink: 0 }}>[{e.source}]</span>
            <span style={{ color: '#ccc', flexShrink: 0 }}>{e.event}</span>
            <span style={{ color: '#888', wordBreak: 'break-all' }}>{JSON.stringify(e.payload)}</span>
          </div>
        ))}
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
    <main style={{ fontFamily: 'sans-serif', maxWidth: 700, margin: '2rem auto', padding: '0 1rem' }}>

      {!user && (
        <>
          <p>Click the button to log in via Steam.</p>
          <button onClick={handleSteamLogin}>Login with Steam</button>
        </>
      )}

      {user && token && <ProfileSection token={token} user={user} onLogout={handleLogout} />}
      <SystemConsole token={token} />
    </main>
  );
}
