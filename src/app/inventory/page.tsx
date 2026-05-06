'use client';

import { useEffect, useState } from 'react';

import { API_URL } from '@/config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InventoryItemSkin {
  name: string;
  fullName: string;
  iconUrl: string;
  price: number;
  quality: string;
  type: string;
  phase: string | null;
  float: number | null;
  backgroundColor: string;
}

interface InventoryItemLotteryInfo {
  id: string;
  ticketsBought: number;
  totalTickets: number;
  winChance: number;
  roomStatus: 'available' | 'overdue';
}

interface InventoryItemResponse {
  id: string;
  status: 'got' | 'sold';
  source: 'lottery' | 'daily_free';
  wonAt: string;
  skin: InventoryItemSkin;
  lottery: InventoryItemLotteryInfo | null;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUALITY_COLOR: Record<string, string> = {
  'Consumer Grade': '#b0b0b0',
  'Industrial Grade': '#6496e1',
  'Mil-Spec Grade': '#4b69ff',
  'Restricted': '#8847ff',
  'Classified': '#d32ce6',
  'Covert': '#eb4b4b',
  'Contraband': '#e4ae39',
  'Unknown': '#888',
};

function qualityColor(quality: string) {
  return QUALITY_COLOR[quality] ?? '#888';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── InventoryCard ─────────────────────────────────────────────────────────────

function InventoryCard({ item }: { item: InventoryItemResponse }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div style={{
      border: '1px solid #1f2d1f',
      borderRadius: 8,
      background: '#0d0d0d',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Skin image */}
      <div style={{
        background: item.skin.backgroundColor ? `#${item.skin.backgroundColor}` : '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 110,
        flexShrink: 0,
      }}>
        {item.skin.iconUrl && !imgError ? (
          <img
            src={item.skin.iconUrl}
            alt={item.skin.fullName}
            style={{ maxHeight: 90, maxWidth: '100%', objectFit: 'contain' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span style={{ color: '#333', fontSize: '0.7rem' }}>no image</span>
        )}
      </div>

      {/* Details */}
      <div style={{ padding: '0.6rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            padding: '1px 7px', borderRadius: 4,
            background: item.status === 'got' ? '#14532d' : '#1f1f1f',
            color: item.status === 'got' ? '#4ade80' : '#888',
          }}>
            {item.status}
          </span>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            padding: '1px 7px', borderRadius: 4,
            background: '#1e1b4b', color: '#a5b4fc',
          }}>
            {item.source === 'lottery' ? 'lottery' : 'daily free'}
          </span>
        </div>

        {/* Skin name */}
        <div style={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.skin.fullName || item.skin.name || '—'}
        </div>

        {/* Quality + price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
          <span style={{ color: qualityColor(item.skin.quality), fontWeight: 500 }}>
            {item.skin.quality || '—'}
          </span>
          <span style={{ color: '#4ade80', fontWeight: 700 }}>
            ${item.skin.price.toFixed(2)}
          </span>
        </div>

        {/* Float + phase */}
        {(item.skin.float !== null || item.skin.phase) && (
          <div style={{ fontSize: '0.7rem', color: '#555', display: 'flex', gap: 8 }}>
            {item.skin.float !== null && <span>float: {item.skin.float.toFixed(4)}</span>}
            {item.skin.phase && <span>phase: {item.skin.phase}</span>}
          </div>
        )}

        {/* Lottery info */}
        {item.lottery && (
          <div style={{ marginTop: 4, padding: '0.4rem 0.5rem', background: '#111', borderRadius: 4, fontSize: '0.7rem', color: '#aaa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>#{item.lottery.id.slice(0, 8)}</span>
              <span style={{
                color: item.lottery.roomStatus === 'available' ? '#4ade80' : '#f87171',
                fontWeight: 600,
              }}>
                {item.lottery.roomStatus}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span>🎫 {item.lottery.ticketsBought}/{item.lottery.totalTickets}</span>
              <span>🏆 {(item.lottery.winChance * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Won at */}
        <div style={{ fontSize: '0.68rem', color: '#444', marginTop: 'auto', paddingTop: 4 }}>
          Won {formatDate(item.wonAt)}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LIMIT = 20;

export default function InventoryPage() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [inventory, setInventory] = useState<PaginatedResult<InventoryItemResponse> | null>(null);
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
        const { result } = await res.json() as { result: { accessToken: string; user: { nickname: string } } };
        setToken(result.accessToken);
        setUsername(result.user.nickname);
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void fetchInventory(token, page);
  }, [token, page]);

  async function fetchInventory(accessToken: string, p: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/inventory?page=${p}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { result } = await res.json() as { result: PaginatedResult<InventoryItemResponse> };
      setInventory(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <main style={{ fontFamily: 'monospace', maxWidth: 1200, margin: '2rem auto', padding: '0 1rem', color: '#e5e7eb' }}>Checking session…</main>;
  }

  if (!token) {
    return (
      <main style={{ fontFamily: 'monospace', maxWidth: 1200, margin: '2rem auto', padding: '0 1rem', color: '#e5e7eb' }}>
        <p style={{ color: '#f87171' }}>Not logged in — <a href="/" style={{ color: '#60a5fa' }}>go log in</a></p>
      </main>
    );
  }

  const totalPages = inventory?.totalPages ?? 1;

  return (
    <main style={{ fontFamily: 'monospace', maxWidth: 1200, margin: '1.5rem auto', padding: '0 1rem', color: '#e5e7eb' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'sans-serif', margin: 0, fontSize: '1.4rem' }}>My Inventory</h1>
          {inventory && (
            <div style={{ fontSize: '0.78rem', color: '#555', marginTop: 3 }}>
              {inventory.total} item{inventory.total !== 1 ? 's' : ''} total
            </div>
          )}
        </div>
        <span style={{ fontSize: '0.82rem', color: '#4ade80' }}>● {username}</span>
      </div>

      {error && (
        <div style={{ color: '#f87171', marginBottom: '1rem', fontSize: '0.82rem' }}>{error}</div>
      )}

      {loading && (
        <div style={{ color: '#555', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>
      )}

      {!loading && inventory?.data.length === 0 && (
        <div style={{ color: '#555', padding: '3rem 0', textAlign: 'center' }}>No inventory items yet</div>
      )}

      {!loading && inventory && inventory.data.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {inventory.data.map(item => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            style={{
              padding: '5px 14px', borderRadius: 6, border: '1px solid #333',
              background: page === 1 ? '#111' : '#1f1f1f', color: page === 1 ? '#444' : '#aaa',
              fontFamily: 'monospace', fontSize: '0.82rem', cursor: page === 1 ? 'default' : 'pointer',
            }}
          >
            ← prev
          </button>
          <span style={{ padding: '5px 12px', fontSize: '0.82rem', color: '#555' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            style={{
              padding: '5px 14px', borderRadius: 6, border: '1px solid #333',
              background: page === totalPages ? '#111' : '#1f1f1f', color: page === totalPages ? '#444' : '#aaa',
              fontFamily: 'monospace', fontSize: '0.82rem', cursor: page === totalPages ? 'default' : 'pointer',
            }}
          >
            next →
          </button>
        </div>
      )}
    </main>
  );
}
