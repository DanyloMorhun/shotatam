'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { API_URL } from '@/config';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationType = 'win' | 'deposit' | 'withdraw' | 'system' | 'error';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface PaginatedResult {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface WsLogEntry {
  id: number;
  time: string;
  payload: Notification;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const TYPE_COLOR: Record<NotificationType, string> = {
  win: '#4ade80',
  deposit: '#60a5fa',
  withdraw: '#f87171',
  system: '#a78bfa',
  error: '#f59e0b',
};

// ── Page ──────────────────────────────────────────────────────────────────────

const LIMIT = 10;

export default function NotificationsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  const [result, setResult] = useState<PaginatedResult | null>(null);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [wsConnected, setWsConnected] = useState(false);
  const [wsLog, setWsLog] = useState<WsLogEntry[]>([]);
  const wsLogId = useRef(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => { void init(); }, []);

  async function init() {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const { result: r } = await res.json() as { result: { accessToken: string; user: { nickname: string } } };
        setToken(r.accessToken);
        setUsername(r.user.nickname);
        await Promise.all([fetchList(r.accessToken, 1), fetchUnreadCount(r.accessToken)]);
        connectWs(r.accessToken);
      }
    } finally {
      setChecking(false);
    }
  }

  function connectWs(t: string) {
    const base = new URL(API_URL).origin;
    const socket = io(`${base}/notifications`, { transports: ['websocket'], auth: { token: t } });
    socketRef.current = socket;

    socket.on('connect', () => setWsConnected(true));
    socket.on('disconnect', () => setWsConnected(false));

    socket.on('notification:new', (payload: Notification) => {
      const d = new Date();
      const time = `${d.toLocaleTimeString('en', { hour12: false })}.${String(d.getMilliseconds()).padStart(3, '0')}`;
      setWsLog(prev => [{ id: ++wsLogId.current, time, payload }, ...prev.slice(0, 49)]);
      setUnreadCount(prev => (prev ?? 0) + 1);
      // Refresh list if on page 1 so the new item appears immediately
      setPage(1);
      void fetchList(t, 1);
    });

    return () => { socket.disconnect(); };
  }

  useEffect(() => {
    return () => { socketRef.current?.disconnect(); };
  }, []);

  async function fetchList(t: string, p: number) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications?page=${p}&limit=${LIMIT}`, { headers: authHeader(t) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { result: r } = await res.json() as { result: PaginatedResult };
      setResult(r);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnreadCount(t: string) {
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/unread-count`, { headers: authHeader(t) });
      if (!res.ok) return;
      const { result: r } = await res.json() as { result: { count: number } };
      setUnreadCount(r.count);
    } catch { }
  }

  async function handleSeed() {
    if (!token) return;
    setActionStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/qa/seed`, { method: 'POST', headers: authHeader(token) });
      if (res.ok) {
        setActionStatus({ ok: true, msg: 'Test notification created — check WS log below.' });
      } else {
        const body = await res.json().catch(() => ({})) as { message?: string };
        setActionStatus({ ok: false, msg: `HTTP ${res.status}: ${body.message ?? 'error'}` });
      }
    } catch (e) {
      setActionStatus({ ok: false, msg: String(e) });
    }
  }

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleMarkManyRead() {
    if (!token || selected.size === 0) return;
    setActionStatus(null);
    const ids = [...selected];
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/read-many`, {
        method: 'PATCH',
        headers: { ...authHeader(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setActionStatus({ ok: true, msg: `${ids.length} notification(s) marked as read.` });
        setSelected(new Set());
        setResult(prev => prev ? { ...prev, data: prev.data.map(n => ids.includes(n.id) ? { ...n, isRead: true } : n) } : prev);
        setUnreadCount(prev => prev !== null ? Math.max(0, prev - ids.length) : 0);
      } else {
        setActionStatus({ ok: false, msg: `HTTP ${res.status}` });
      }
    } catch (e) {
      setActionStatus({ ok: false, msg: String(e) });
    }
  }

  async function handleMarkAllRead() {
    if (!token) return;
    setActionStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/read-all`, { method: 'PATCH', headers: authHeader(token) });
      if (res.ok) {
        setActionStatus({ ok: true, msg: 'All notifications marked as read.' });
        setUnreadCount(0);
        await fetchList(token, page);
      } else {
        setActionStatus({ ok: false, msg: `HTTP ${res.status}` });
      }
    } catch (e) {
      setActionStatus({ ok: false, msg: String(e) });
    }
  }

  async function handleMarkRead(id: string) {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/${id}/read`, { method: 'PATCH', headers: authHeader(token) });
      if (res.ok) {
        setResult(prev => prev ? {
          ...prev,
          data: prev.data.map(n => n.id === id ? { ...n, isRead: true } : n),
        } : prev);
        setUnreadCount(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
      }
    } catch { }
  }

  async function goToPage(p: number) {
    if (!token) return;
    setPage(p);
    setSelected(new Set());
    await fetchList(token, p);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const cell: React.CSSProperties = { border: '1px solid #333', borderRadius: 8, padding: '1rem', background: '#0d0d0d' };
  const btnStyle: React.CSSProperties = { padding: '5px 14px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.82rem', borderRadius: 5, border: '1px solid #444', background: '#1a1a1a', color: '#e5e7eb' };

  if (checking) {
    return <main style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '2rem auto', padding: '0 1rem', color: '#e5e7eb' }}>Checking session…</main>;
  }

  if (!token) {
    return <main style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '2rem auto', padding: '0 1rem', color: '#e5e7eb' }}>Not logged in — go to <a href="/" style={{ color: '#60a5fa' }}>Profile</a> to log in.</main>;
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 860, margin: '2rem auto', padding: '0 1rem', color: '#e5e7eb' }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Notifications — {username}</h1>

      {/* ── Status bar ── */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>
        <span style={{ color: wsConnected ? '#4ade80' : '#888' }}>{wsConnected ? '●' : '○'} /notifications WS</span>
        <span style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 6, padding: '2px 10px' }}>
          unread: <strong style={{ color: unreadCount ? '#f59e0b' : '#4ade80' }}>{unreadCount ?? '—'}</strong>
        </span>
        <span style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 6, padding: '2px 10px' }}>
          total: <strong>{result?.total ?? '—'}</strong>
        </span>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button style={{ ...btnStyle, background: '#1e3a5f', borderColor: '#2563eb', color: '#93c5fd' }} onClick={handleSeed}>
          + Seed Test Notification
        </button>
        {selected.size > 0 && (
          <button style={{ ...btnStyle, background: '#1e3a2f', borderColor: '#16a34a', color: '#4ade80' }} onClick={handleMarkManyRead}>
            ✓ Mark Selected Read ({selected.size})
          </button>
        )}
        <button style={btnStyle} onClick={handleMarkAllRead}>
          ✓ Mark All Read
        </button>
        <button style={btnStyle} onClick={() => token && void fetchList(token, page)}>
          ↻ Refresh
        </button>
        {actionStatus && (
          <span style={{
            padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.8rem',
            background: actionStatus.ok ? '#14532d' : '#450a0a',
            color: actionStatus.ok ? '#4ade80' : '#f87171',
            border: `1px solid ${actionStatus.ok ? '#166534' : '#7f1d1d'}`,
          }}>
            {actionStatus.ok ? '✓ ' : '✗ '}{actionStatus.msg}
          </span>
        )}
      </div>

      {/* ── Notifications list ── */}
      <section style={{ ...cell, marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Notifications list</h2>

        {loading && <div style={{ color: '#888', fontFamily: 'monospace', fontSize: '0.82rem', padding: '0.5rem 0' }}>Loading…</div>}

        {!loading && result && result.data.length === 0 && (
          <div style={{ color: '#555', fontFamily: 'monospace', fontSize: '0.82rem', padding: '0.5rem 0' }}>No notifications yet. Use "Seed" to create one.</div>
        )}

        {!loading && result && result.data.map(n => (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.6rem 0', borderBottom: '1px solid #1f1f1f',
            opacity: n.isRead ? 0.55 : 1,
          }}>
            <input
              type="checkbox"
              disabled={n.isRead}
              checked={selected.has(n.id)}
              onChange={() => toggleSelected(n.id)}
              style={{ marginTop: 4, flexShrink: 0, cursor: n.isRead ? 'default' : 'pointer' }}
            />
            <span style={{
              marginTop: 2, flexShrink: 0,
              background: TYPE_COLOR[n.type] + '22',
              border: `1px solid ${TYPE_COLOR[n.type]}55`,
              color: TYPE_COLOR[n.type],
              borderRadius: 4, padding: '1px 7px',
              fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700,
            }}>
              {n.type}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: n.isRead ? 'normal' : 600, fontSize: '0.88rem', marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: '0.8rem', color: '#aaa', wordBreak: 'break-word' }}>{n.message}</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 3, fontFamily: 'monospace' }}>{formatDate(n.createdAt)}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              {n.isRead
                ? <span style={{ fontSize: '0.72rem', color: '#555', fontFamily: 'monospace' }}>read</span>
                : <button style={{ ...btnStyle, padding: '2px 10px', fontSize: '0.72rem', borderColor: '#555' }} onClick={() => void handleMarkRead(n.id)}>Mark Read</button>
              }
              <span style={{ fontSize: '0.62rem', color: '#444', fontFamily: 'monospace', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.id}</span>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {result && result.totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <button style={btnStyle} disabled={page <= 1} onClick={() => void goToPage(page - 1)}>← Prev</button>
            <span style={{ color: '#888' }}>page {page} / {result.totalPages}</span>
            <button style={btnStyle} disabled={page >= result.totalPages} onClick={() => void goToPage(page + 1)}>Next →</button>
          </div>
        )}
      </section>

      {/* ── WebSocket live log ── */}
      <section style={{ ...cell }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
          WebSocket live — <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#a78bfa' }}>notification:new</span>
        </h2>
        <div style={{ height: 220, overflowY: 'auto', background: '#080808', borderRadius: 6, padding: '0.5rem', border: '1px solid #1f1f1f' }}>
          {wsLog.length === 0 && (
            <div style={{ color: '#444', fontFamily: 'monospace', fontSize: '0.8rem', padding: '0.25rem' }}>
              Waiting for events… (use "Seed" to trigger one)
            </div>
          )}
          {wsLog.map(e => (
            <div key={e.id} style={{ fontFamily: 'monospace', fontSize: '0.77rem', padding: '3px 0', borderBottom: '1px solid #111', display: 'flex', gap: 8 }}>
              <span style={{ color: '#555', flexShrink: 0 }}>{e.time}</span>
              <span style={{ color: TYPE_COLOR[e.payload.type], flexShrink: 0 }}>[{e.payload.type}]</span>
              <span style={{ color: '#ccc', flexShrink: 0 }}>{e.payload.title}</span>
              <span style={{ color: '#888', wordBreak: 'break-all' }}>{e.payload.message}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
