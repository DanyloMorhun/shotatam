'use client';

import { useEffect, useState } from 'react';

import { API_URL } from '@/config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryPrize {
  fullName: string;
  name: string;
  skinName: string;
  type: string;
  quality: string;
  price: number;
  iconUrl: string;
  backgroundColor: string;
}

interface PrivateEntry {
  lotteryId: string;
  tier: string;
  isWinner: boolean;
  ticketsBought: number;
  winRate: number;
  prize: HistoryPrize;
  endsAt: string;
}

interface PublicEntry {
  lotteryId: string;
  tier: string;
  ticketsBought: number;
  winRate: number;
  prize: HistoryPrize;
  endsAt: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MostExpensiveWin {
  prize: {
    fullName: string;
    name: string;
    skinName: string;
    iconUrl: string;
    quality: string;
    price: number;
    backgroundColor: string;
  };
  winnerInfo: {
    ticketsBought: number;
    winRate: number;
  };
}

interface ActivityResponse {
  mostExpensiveWin: MostExpensiveWin | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  low: '#6b7280',
  mid: '#2563eb',
  high: '#d97706',
  mystery: '#7c3aed',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── HistoryCard ───────────────────────────────────────────────────────────────

function HistoryCard({ entry }: { entry: PrivateEntry }) {
  const tierColor = TIER_COLOR[entry.tier] ?? '#666';
  return (
    <div style={{
      border: `1px solid ${entry.isWinner ? '#166534' : '#333'}`,
      borderRadius: 8,
      padding: '0.75rem',
      background: entry.isWinner ? '#0d2d16' : '#0d0d0d',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
          padding: '2px 8px', borderRadius: 4,
          background: entry.isWinner ? '#166534' : '#1f1f1f',
          color: entry.isWinner ? '#4ade80' : '#888',
        }}>
          {entry.isWinner ? '🏆 Win' : 'Lose'}
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: tierColor, textTransform: 'uppercase' }}>
          {entry.tier}
        </span>
      </div>

      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {entry.prize.fullName || entry.prize.skinName}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 6 }}>
        <span style={{ color: '#a78bfa', marginRight: 6 }}>{entry.prize.quality}</span>
        ${entry.prize.price.toFixed(2)}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#aaa', marginBottom: 4 }}>
        <span>🎫 {entry.ticketsBought} tickets</span>
        <span>🏆 {entry.winRate.toFixed(2)}% chance</span>
      </div>

      <div style={{ fontSize: '0.7rem', color: '#555' }}>
        {formatDate(entry.endsAt)} · #{entry.lotteryId.slice(0, 8)}
      </div>
    </div>
  );
}

// ── WinCard ───────────────────────────────────────────────────────────────────

function WinCard({ entry }: { entry: PublicEntry }) {
  const tierColor = TIER_COLOR[entry.tier] ?? '#666';
  return (
    <div style={{
      border: '1px solid #166534',
      borderRadius: 8,
      padding: '0.75rem',
      background: '#0d2d16',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
          padding: '2px 8px', borderRadius: 4,
          background: '#166534', color: '#4ade80',
        }}>
          🏆 Win
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: tierColor, textTransform: 'uppercase' }}>
          {entry.tier}
        </span>
      </div>

      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {entry.prize.fullName || entry.prize.skinName}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 6 }}>
        <span style={{ color: '#a78bfa', marginRight: 6 }}>{entry.prize.quality}</span>
        ${entry.prize.price.toFixed(2)}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#aaa', marginBottom: 4 }}>
        <span>🎫 {entry.ticketsBought} tickets</span>
        <span>🏆 {entry.winRate.toFixed(2)}% chance</span>
      </div>

      <div style={{ fontSize: '0.7rem', color: '#555' }}>
        {formatDate(entry.endsAt)} · #{entry.lotteryId.slice(0, 8)}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [token, setToken] = useState<string | null>(null);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [privateHistory, setPrivateHistory] = useState<PaginatedResult<PrivateEntry> | null>(null);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [privateError, setPrivateError] = useState<string | null>(null);

  const [publicHistory, setPublicHistory] = useState<PaginatedResult<PublicEntry> | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    void silentRefresh();
  }, []);

  async function silentRefresh() {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const { result } = await res.json() as { result: { accessToken: string; user: { userId: string; nickname: string } } };
        setToken(result.accessToken);
        setSteamId(result.user.userId);
        setUsername(result.user.nickname);
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!token || !steamId) return;
    void fetchPrivateHistory(token);
    void fetchPublicHistory(steamId);
    void fetchActivity(steamId);
  }, [token, steamId]);

  async function fetchPrivateHistory(accessToken: string) {
    setPrivateLoading(true);
    setPrivateError(null);
    try {
      const res = await fetch(`${API_URL}/api/lotteries/history?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { result } = await res.json() as { result: PaginatedResult<PrivateEntry> };
      setPrivateHistory(result);
    } catch (e) {
      setPrivateError(String(e));
    } finally {
      setPrivateLoading(false);
    }
  }

  async function fetchActivity(id: string) {
    setActivityLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${id}/activity`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { result } = await res.json() as { result: ActivityResponse };
      setActivity(result);
    } finally {
      setActivityLoading(false);
    }
  }

  async function fetchPublicHistory(id: string) {
    setPublicLoading(true);
    setPublicError(null);
    try {
      const res = await fetch(`${API_URL}/api/lotteries/users/${id}/history?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { result } = await res.json() as { result: PaginatedResult<PublicEntry> };
      setPublicHistory(result);
    } catch (e) {
      setPublicError(String(e));
    } finally {
      setPublicLoading(false);
    }
  }

  if (checking) {
    return <main style={{ fontFamily: 'monospace', maxWidth: 1100, margin: '2rem auto', padding: '0 1rem', color: '#e5e7eb' }}>Checking session…</main>;
  }

  if (!token || !steamId) {
    return (
      <main style={{ fontFamily: 'monospace', maxWidth: 1100, margin: '2rem auto', padding: '0 1rem', color: '#e5e7eb' }}>
        <p style={{ color: '#f87171' }}>Not logged in — <a href="/" style={{ color: '#60a5fa' }}>go log in</a></p>
      </main>
    );
  }

  const sectionHeader = (title: string, subtitle: string, total: number | undefined, loading: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'sans-serif' }}>{title}</h2>
        <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 2 }}>{subtitle}</div>
      </div>
      <span style={{ fontSize: '0.78rem', color: '#555' }}>
        {loading ? '…' : total !== undefined ? `${total} total` : ''}
      </span>
    </div>
  );

  return (
    <main style={{ fontFamily: 'monospace', maxWidth: 1100, margin: '1.5rem auto', padding: '0 1rem', color: '#e5e7eb' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'sans-serif', margin: 0, fontSize: '1.4rem' }}>Lottery History</h1>
        <span style={{ fontSize: '0.82rem', color: '#4ade80' }}>● {username}</span>
      </div>

      {/* Activity banner */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'sans-serif', fontSize: '1.1rem', margin: '0 0 0.75rem' }}>Most expensive win</h2>
        {activityLoading && <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading…</div>}
        {!activityLoading && activity && !activity.mostExpensiveWin && (
          <div style={{ color: '#555', fontSize: '0.82rem' }}>No wins yet</div>
        )}
        {!activityLoading && activity?.mostExpensiveWin && (() => {
          const { prize, winnerInfo } = activity.mostExpensiveWin;
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              background: '#0d1a0d', border: '1px solid #166534', borderRadius: 10,
              padding: '0.75rem 1rem', maxWidth: 520,
            }}>
              <img
                src={prize.iconUrl}
                alt={prize.fullName}
                style={{ width: 80, height: 60, objectFit: 'contain', flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: 2, textTransform: 'uppercase' }}>
                  {prize.quality}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#e74c3c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {prize.fullName || `${prize.name} | ${prize.skinName}`}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#e5e7eb', margin: '2px 0 6px' }}>
                  ${(prize.price ?? 0).toFixed(2)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: '0.72rem', background: '#1f2d1f', padding: '2px 8px', borderRadius: 20 }}>
                    🎫 {winnerInfo.ticketsBought}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#1f2d1f', padding: '2px 8px', borderRadius: 20 }}>
                    🏆 {winnerInfo.winRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Private history */}
        <section>
          {sectionHeader(
            'Private History',
            'All participated lotteries · with auth',
            privateHistory?.total,
            privateLoading,
          )}
          {privateError && <div style={{ color: '#f87171', marginBottom: '0.5rem', fontSize: '0.82rem' }}>{privateError}</div>}
          {!privateLoading && privateHistory?.data.length === 0 && (
            <div style={{ color: '#555', padding: '2rem 0', textAlign: 'center' }}>No history yet</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
            {privateHistory?.data.map(entry => (
              <HistoryCard key={entry.lotteryId} entry={entry} />
            ))}
          </div>
        </section>

        {/* Public history */}
        <section>
          {sectionHeader(
            'Public History (Wins only)',
            'Won lotteries · no auth',
            publicHistory?.total,
            publicLoading,
          )}
          {publicError && <div style={{ color: '#f87171', marginBottom: '0.5rem', fontSize: '0.82rem' }}>{publicError}</div>}
          {!publicLoading && publicHistory?.data.length === 0 && (
            <div style={{ color: '#555', padding: '2rem 0', textAlign: 'center' }}>No wins yet</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
            {publicHistory?.data.map(entry => (
              <WinCard key={entry.lotteryId} entry={entry} />
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
