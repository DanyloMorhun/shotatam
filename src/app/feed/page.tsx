'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { API_URL } from '@/config';
const WS_BASE = API_URL.replace('/api', '');

interface FeedPrize {
  name: string;
  iconUrl: string;
  quality: string;
}

interface FeedWinner {
  steamId: string;
  username: string;
  avatarUrl: string | null;
  ticketsCount: number;
}

interface FeedEntry {
  lotteryId: string;
  tier: 'low' | 'mid' | 'high';
  prize: FeedPrize;
  winner: FeedWinner | null;
}

interface WsEvent {
  id: number;
  time: string;
  entries: FeedEntry[];
}

function timestamp(): string {
  const d = new Date();
  const hms = d.toLocaleTimeString('en', { hour12: false });
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hms}.${ms}`;
}

const TIER_COLOR: Record<string, string> = { low: '#6b7280', mid: '#2563eb', high: '#d97706' };

function EntryCard({ entry }: { entry: FeedEntry }) {
  return (
    <div style={{ padding: '0.5rem 0.75rem', borderRadius: 6, background: '#f9f9f9', border: '1px solid #e5e7eb', marginBottom: 6 }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: TIER_COLOR[entry.tier] ?? '#333', textTransform: 'uppercase', letterSpacing: 1 }}>
          {entry.tier}
        </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{entry.prize.name}</span>
        <span style={{ fontSize: '0.72rem', color: '#888', marginLeft: 'auto' }}>{entry.prize.quality}</span>
      </div>
      {entry.winner ? (
        <div style={{ fontSize: '0.72rem', color: '#555' }}>
          winner: <strong>{entry.winner.username}</strong> · {entry.winner.ticketsCount} ticket{entry.winner.ticketsCount !== 1 ? 's' : ''} · steam:{entry.winner.steamId}
        </div>
      ) : (
        <div style={{ fontSize: '0.72rem', color: '#d97706' }}>server win (no player winner)</div>
      )}
    </div>
  );
}

// ── REST panel ────────────────────────────────────────────────────────────────

function RestPanel() {
  const [entries, setEntries] = useState<FeedEntry[] | null>(null);
  const [activeTier, setActiveTier] = useState<'all' | 'high'>('all');
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchFeed(tier: 'all' | 'high') {
    setLoading(true);
    setError(null);
    setActiveTier(tier);
    try {
      const url = tier === 'high'
        ? `${API_URL}/api/lotteries/feed?tier=high`
        : `${API_URL}/api/lotteries/feed`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { result } = await res.json() as { result: FeedEntry[] };
      setEntries(result);
      setFetchedAt(timestamp());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchFeed('all'); }, []);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 14px', cursor: 'pointer', borderRadius: 4,
    border: '1px solid #d1d5db',
    background: active ? '#2563eb' : '#fff',
    color: active ? '#fff' : '#333',
    fontFamily: 'monospace',
  });

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: 'sans-serif' }}>REST — GET /api/lotteries/feed</h2>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={btnStyle(activeTier === 'all')} onClick={() => void fetchFeed('all')}>all tiers</button>
        <button style={btnStyle(activeTier === 'high')} onClick={() => void fetchFeed('high')}>?tier=high</button>
        {fetchedAt && <span style={{ fontSize: '0.75rem', color: '#888' }}>fetched at {fetchedAt}</span>}
        {loading && <span style={{ fontSize: '0.75rem', color: '#888' }}>loading…</span>}
        {error && <span style={{ fontSize: '0.75rem', color: 'crimson' }}>{error}</span>}
        {entries && <span style={{ fontSize: '0.75rem', color: '#555' }}>{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 8, padding: '0.5rem' }}>
        {!entries && !loading && <div style={{ color: '#aaa', textAlign: 'center', padding: '1rem' }}>No data yet</div>}
        {entries?.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: '1rem' }}>Empty — no completed lotteries found</div>}
        {entries?.map(e => <EntryCard key={e.lotteryId} entry={e} />)}
      </div>
    </div>
  );
}

// ── WebSocket panel ───────────────────────────────────────────────────────────

function WsPanel() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<WsEvent[]>([]);
  const eventId = useRef(0);

  useEffect(() => {
    const socket = io(`${WS_BASE}/feed`, { transports: ['websocket'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('feed:update', (entries: FeedEntry[]) => {
      setEvents(prev => [
        { id: ++eventId.current, time: timestamp(), entries },
        ...prev.slice(0, 99),
      ]);
    });

    return () => { socket.disconnect(); };
  }, []);

  const totalEntries = events.reduce((n, e) => n + e.entries.length, 0);

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: 'sans-serif' }}>WebSocket — /feed namespace</h2>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.5rem 0.75rem', background: '#f5f5f5', borderRadius: 8 }}>
        <span style={{ fontWeight: 'bold', color: connected ? 'green' : 'crimson' }}>
          {connected ? '● connected' : '○ disconnected'}
        </span>
        <span style={{ fontSize: '0.8rem', color: '#555' }}>
          feed:update ×{events.length} · {totalEntries} total entr{totalEntries !== 1 ? 'ies' : 'y'}
        </span>
        {events.length > 0 && (
          <button onClick={() => setEvents([])} style={{ marginLeft: 'auto', padding: '2px 10px', cursor: 'pointer', fontFamily: 'monospace' }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 8, padding: '0.5rem' }}>
        {events.length === 0 && (
          <div style={{ color: '#aaa', textAlign: 'center', padding: '1rem' }}>
            Waiting for feed:update events…
          </div>
        )}
        {events.map(ev => (
          <div key={ev.id} style={{ marginBottom: '0.75rem', borderLeft: '4px solid #7c3aed', paddingLeft: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>
              {ev.time} · <strong style={{ color: '#7c3aed' }}>feed:update</strong> · {ev.entries.length} entr{ev.entries.length !== 1 ? 'ies' : 'y'}
            </div>
            {ev.entries.map(e => <EntryCard key={e.lotteryId} entry={e} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FeedPage() {
  return (
    <main style={{ fontFamily: 'monospace', maxWidth: 1280, margin: '1.5rem auto', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(100vh - 3rem)' }}>
      <h1 style={{ fontFamily: 'sans-serif', margin: 0 }}>/feed — Live Winnings Feed test</h1>
      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        <RestPanel />
        <div style={{ width: 1, background: '#e5e7eb', flexShrink: 0 }} />
        <WsPanel />
      </div>
    </main>
  );
}
