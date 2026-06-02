'use client';

import { useEffect, useState } from 'react';

import { API_URL } from '@/config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TransactionRow {
  id: string;
  userSteamId: string;
  nickname: string | null;
  type: string;
  status: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string | null;
  createdAt: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  deposit: '#4ade80',
  withdrawal: '#f87171',
  ticket_purchase: '#f59e0b',
  skin_sell: '#60a5fa',
  referral: '#a78bfa',
  promo: '#34d399',
  daily_free: '#fb923c',
  refund: '#94a3b8',
};

const STATUS_COLOR: Record<string, string> = {
  success: '#4ade80',
  processing: '#facc15',
  canceled: '#f87171',
};

function centsToDisplay(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 8px',
      borderRadius: 4,
      fontSize: '0.68rem',
      fontWeight: 700,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LIMIT = 50;

export default function TransactionsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [mySteamId, setMySteamId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [globalMode, setGlobalMode] = useState(false);
  const [result, setResult] = useState<PaginatedResult<TransactionRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    void silentRefresh();
  }, []);

  async function silentRefresh() {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const { result: r } = await res.json() as { result: { accessToken: string; user: { steamId: string } } };
        setToken(r.accessToken);
        setMySteamId(r.user.steamId);
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (checking) return;
    void fetchTransactions(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, globalMode, checking]);

  async function fetchTransactions(p: number) {
    setLoading(true);
    setError(null);
    try {
      const steamId = globalMode ? undefined : mySteamId;
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (steamId) params.set('steamId', steamId);

      const res = await fetch(`${API_URL}/api/wallet/transactions?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { result: r } = await res.json() as { result: PaginatedResult<TransactionRow> };
      setResult(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    setGlobalMode(v => !v);
    setPage(1);
    setResult(null);
  }

  if (checking) {
    return <main style={mainStyle}>Checking session…</main>;
  }

  if (!token) {
    return (
      <main style={mainStyle}>
        <p style={{ color: '#f87171' }}>Not logged in — <a href="/" style={{ color: '#60a5fa' }}>go log in</a></p>
      </main>
    );
  }

  const totalPages = result?.totalPages ?? 1;

  return (
    <main style={mainStyle}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'sans-serif', margin: 0, fontSize: '1.4rem' }}>Balance Transactions</h1>
          {result && (
            <div style={{ fontSize: '0.78rem', color: '#555', marginTop: 3 }}>
              {result.total} record{result.total !== 1 ? 's' : ''} total
            </div>
          )}
        </div>

        {/* Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ fontSize: '0.82rem', color: globalMode ? '#555' : '#e5e7eb' }}>My transactions</span>
          <div
            onClick={handleToggle}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: globalMode ? '#4ade80' : '#333',
              position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: globalMode ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: '0.82rem', color: globalMode ? '#e5e7eb' : '#555' }}>All users</span>
        </label>
      </div>

      {error && (
        <div style={{ color: '#f87171', marginBottom: '1rem', fontSize: '0.82rem' }}>{error}</div>
      )}

      {loading && (
        <div style={{ color: '#555', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>
      )}

      {!loading && result?.data.length === 0 && (
        <div style={{ color: '#555', padding: '3rem 0', textAlign: 'center' }}>No transactions yet</div>
      )}

      {/* Table */}
      {!loading && result && result.data.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222', color: '#555', textAlign: 'left' }}>
                {globalMode && <th style={th}>User</th>}
                <th style={th}>Type</th>
                <th style={th}>Status</th>
                <th style={th}>Amount</th>
                <th style={th}>Before → After</th>
                <th style={th}>Reference</th>
                <th style={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((row, i) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid #111',
                    background: i % 2 === 0 ? 'transparent' : '#0a0a0a',
                  }}
                >
                  {globalMode && (
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: '#e5e7eb' }}>{row.nickname ?? '—'}</div>
                      <div style={{ color: '#444', fontSize: '0.68rem', marginTop: 1 }}>{row.userSteamId}</div>
                    </td>
                  )}
                  <td style={td}>
                    <Badge label={row.type.replace('_', ' ')} color={TYPE_COLOR[row.type] ?? '#888'} />
                  </td>
                  <td style={td}>
                    <Badge label={row.status} color={STATUS_COLOR[row.status] ?? '#888'} />
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: row.type === 'withdrawal' || row.type === 'ticket_purchase' ? '#f87171' : '#4ade80' }}>
                    {row.type === 'withdrawal' || row.type === 'ticket_purchase' ? '−' : '+'}{centsToDisplay(row.amount)}
                  </td>
                  <td style={{ ...td, color: '#888' }}>
                    {centsToDisplay(row.balanceBefore)}
                    <span style={{ color: '#333', margin: '0 5px' }}>→</span>
                    {centsToDisplay(row.balanceAfter)}
                  </td>
                  <td style={{ ...td, color: '#444', fontFamily: 'monospace', fontSize: '0.68rem' }}>
                    {row.referenceId ? row.referenceId.slice(0, 8) + '…' : '—'}
                  </td>
                  <td style={{ ...td, color: '#555', whiteSpace: 'nowrap' }}>
                    {formatDate(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            style={paginationBtn(page === 1 || loading)}
          >
            ← prev
          </button>
          <span style={{ padding: '5px 12px', fontSize: '0.82rem', color: '#555' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            style={paginationBtn(page === totalPages || loading)}
          >
            next →
          </button>
        </div>
      )}
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const mainStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  maxWidth: 1100,
  margin: '1.5rem auto',
  padding: '0 1rem',
  color: '#e5e7eb',
};

const th: React.CSSProperties = {
  padding: '8px 12px',
  fontWeight: 600,
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const td: React.CSSProperties = {
  padding: '9px 12px',
  verticalAlign: 'middle',
};

function paginationBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '5px 14px', borderRadius: 6, border: '1px solid #333',
    background: disabled ? '#111' : '#1f1f1f',
    color: disabled ? '#444' : '#aaa',
    fontFamily: 'monospace', fontSize: '0.82rem',
    cursor: disabled ? 'default' : 'pointer',
  };
}
