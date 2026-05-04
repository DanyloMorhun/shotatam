'use client';

import { useEffect, useState } from 'react';

import { API_URL } from '@/config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LotteryPrize {
  fullName: string;
  skinName: string;
  type: string;
  quality: string;
  price: number;
}

interface Lottery {
  id: string;
  tier: 'low' | 'mid' | 'high' | 'mystery';
  status: string;
  ticketCount: number;
  ticketPrice: number;
  soldTickets: number;
  quickBuySteps?: number[] | null;
  endsAt: string;
  prize: LotteryPrize | null;
}

interface PaginatedResult {
  data: Lottery[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  low: '#6b7280',
  mid: '#2563eb',
  high: '#d97706',
  mystery: '#7c3aed',
};

function timeLeft(endsAt: string): string {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── BuyPanel ──────────────────────────────────────────────────────────────────

function BuyPanel({ lottery, token, onDone }: { lottery: Lottery; token: string | null; onDone: () => void }) {
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const available = lottery.ticketCount - lottery.soldTickets;
  const totalCost = qty * lottery.ticketPrice;

  async function buy() {
    if (!token) return;
    setBuying(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/lotteries/${lottery.id}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: qty }),
      });
      const body = await res.json() as { result?: { balance: number }; message?: string };
      if (res.ok && body.result) {
        setResult({ ok: true, msg: `Bought ${qty} ticket${qty !== 1 ? 's' : ''}! New balance: $${(body.result.balance / 100).toFixed(2)}` });
        onDone();
      } else {
        setResult({ ok: false, msg: String(body.message ?? `HTTP ${res.status}`) });
      }
    } catch (e) {
      setResult({ ok: false, msg: String(e) });
    } finally {
      setBuying(false);
    }
  }

  const panelStyle: React.CSSProperties = {
    border: `2px solid ${TIER_COLOR[lottery.tier] ?? '#ccc'}`,
    borderRadius: 10,
    padding: '1rem',
    background: '#111',
    marginTop: '1rem',
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '4px 12px', cursor: 'pointer', borderRadius: 4,
    border: '1px solid #444',
    background: active ? TIER_COLOR[lottery.tier] : '#222',
    color: active ? '#fff' : '#ccc',
    fontFamily: 'monospace', fontSize: '0.85rem',
  });

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontWeight: 700, color: TIER_COLOR[lottery.tier], textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>
            {lottery.tier}
          </span>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 2 }}>
            {lottery.prize?.skinName || lottery.prize?.fullName || 'Unknown prize'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>
            {lottery.prize?.type && <span style={{ color: '#a78bfa', marginRight: 6 }}>{lottery.prize.type}</span>}
            {lottery.prize?.quality} · ${(lottery.prize?.price ?? 0) / 100} prize · ${lottery.ticketPrice / 100} / ticket
          </div>
        </div>
        <button onClick={onDone} style={{ ...btnStyle(), padding: '2px 8px', fontSize: '0.75rem' }}>✕ close</button>
      </div>

      <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.75rem' }}>
        {lottery.soldTickets}/{lottery.ticketCount} tickets sold · {available} available · ends in {timeLeft(lottery.endsAt)}
      </div>

      {!token && (
        <div style={{ color: '#d97706', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          ⚠ Log in on the home page to buy tickets.
        </div>
      )}

      {/* Quick-pick buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {(lottery.quickBuySteps?.length ? lottery.quickBuySteps : [1, 5, 10, 25, 50].filter(n => n <= available)).map(n => (
          <button key={n} style={btnStyle(qty === n)} onClick={() => setQty(n)}>{n}</button>
        ))}
        <input
          type="number"
          min={1}
          max={available}
          value={qty}
          onChange={e => setQty(Math.max(1, Math.min(available, Number(e.target.value))))}
          style={{ width: 64, padding: '4px 8px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.85rem' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={buy}
          disabled={buying || !token || available === 0}
          style={{
            padding: '6px 20px', cursor: buying || !token ? 'not-allowed' : 'pointer',
            background: !token || available === 0 ? '#333' : TIER_COLOR[lottery.tier],
            color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.9rem',
          }}
        >
          {buying ? 'Buying…' : `Buy ${qty} ticket${qty !== 1 ? 's' : ''} — $${(totalCost / 100).toFixed(2)}`}
        </button>
      </div>

      {result && (
        <div style={{
          marginTop: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: 6,
          background: result.ok ? '#0d2d16' : '#2a0000',
          color: result.ok ? '#4ade80' : '#f87171',
          fontFamily: 'monospace', fontSize: '0.82rem',
          border: `1px solid ${result.ok ? '#166534' : '#991b1b'}`,
        }}>
          {result.ok ? '✓ ' : '✗ '}{result.msg}
        </div>
      )}
    </div>
  );
}

// ── LotteryCard ───────────────────────────────────────────────────────────────

function LotteryCard({ lottery, selected, onSelect }: { lottery: Lottery; selected: boolean; onSelect: () => void }) {
  const fill = lottery.ticketCount > 0 ? lottery.soldTickets / lottery.ticketCount : 0;

  return (
    <div
      onClick={onSelect}
      style={{
        border: `2px solid ${selected ? TIER_COLOR[lottery.tier] : '#333'}`,
        borderRadius: 8, padding: '0.75rem', cursor: 'pointer',
        background: selected ? '#1a1a1a' : '#0d0d0d',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: TIER_COLOR[lottery.tier], textTransform: 'uppercase', letterSpacing: 1 }}>
          {lottery.tier}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#666' }}>{timeLeft(lottery.endsAt)}</span>
      </div>

      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {lottery.prize?.skinName || lottery.prize?.fullName || 'Unknown'}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>
        ${(lottery.prize?.price ?? 0) / 100} · ${lottery.ticketPrice / 100}/ticket
      </div>
      {lottery.prize?.type && (
        <div style={{ fontSize: '0.7rem', color: '#a78bfa', marginBottom: 6 }}>
          {lottery.prize.type}
        </div>
      )}

      {/* fill bar */}
      <div style={{ height: 4, background: '#222', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${fill * 100}%`, background: TIER_COLOR[lottery.tier], borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 4 }}>
        {lottery.soldTickets}/{lottery.ticketCount} tickets
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LotteriesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lottery | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [skinTypeFilter, setSkinTypeFilter] = useState<string>('all');
  const [skinTypes, setSkinTypes] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void silentRefresh();
    void fetchCategories();
    void fetchSkinTypes();
  }, []);

  useEffect(() => {
    void fetchLotteries();
  }, [categoryFilter]);

  async function silentRefresh() {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const { result } = await res.json() as { result: { accessToken: string; user: { nickname: string } } };
        setToken(result.accessToken);
        setUsername(result.user.nickname);
      }
    } catch { /* no session */ }
  }

  async function fetchSkinTypes() {
    try {
      const res = await fetch(`${API_URL}/api/lotteries/skin-type-filters`);
      if (res.ok) {
        const data = await res.json();
        const list: string[] = Array.isArray(data) ? data : Array.isArray(data?.result) ? data.result : [];
        setSkinTypes(list);
      }
    } catch { /* ignore */ }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`${API_URL}/api/lotteries/categories`);
      if (res.ok) {
        const data = await res.json();
        const list: string[] = Array.isArray(data) ? data : Array.isArray(data?.result) ? data.result : [];
        setCategories(list);
      }
    } catch { /* ignore */ }
  }

  async function fetchLotteries() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const res = await fetch(`${API_URL}/api/lotteries?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { result } = await res.json() as { result: PaginatedResult };
      setLotteries(result.data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = lotteries.filter(l => {
    if (skinTypeFilter !== 'all' && l.prize?.type !== skinTypeFilter) return false;
    if (!q) return true;
    const prizeName = (l.prize?.fullName ?? '').toLowerCase();
    return l.id.toLowerCase().includes(q) || prizeName.includes(q);
  });

  const catBtn = (active: boolean): React.CSSProperties => ({
    padding: '4px 14px', cursor: 'pointer', borderRadius: 4,
    border: '1px solid #444',
    background: active ? '#2563eb' : '#1a1a1a',
    color: active ? '#fff' : '#aaa',
    fontFamily: 'monospace', fontSize: '0.82rem',
  });

  return (
    <main style={{ fontFamily: 'monospace', maxWidth: 1100, margin: '1.5rem auto', padding: '0 1rem', color: '#e5e7eb' }}>

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontFamily: 'sans-serif', margin: 0, fontSize: '1.4rem' }}>Lotteries — ticket purchase test</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.82rem' }}>
          {username
            ? <span style={{ color: '#4ade80' }}>● {username}</span>
            : <span style={{ color: '#f87171' }}>○ not logged in — <a href="/" style={{ color: '#60a5fa' }}>go log in</a></span>
          }
          <button onClick={fetchLotteries} disabled={loading} style={{ padding: '3px 10px', cursor: 'pointer', background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 4 }}>
            {loading ? '…' : '↺ refresh'}
          </button>
        </div>
      </div>

      {/* category filter + search */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={catBtn(categoryFilter === 'all')} onClick={() => setCategoryFilter('all')}>all</button>
        {Array.isArray(categories) && categories.map(c => (
          <button key={c} style={catBtn(categoryFilter === c)} onClick={() => setCategoryFilter(c)}>{c}</button>
        ))}
        <input
          type="text"
          placeholder="Search by ID or prize name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '4px 10px',
            background: '#1a1a1a', border: '1px solid #444', color: '#e5e7eb',
            borderRadius: 4, fontFamily: 'monospace', fontSize: '0.82rem',
          }}
        />
        <span style={{ color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          {filtered.length} lotter{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* skin type filter */}
      {skinTypes.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: '0.78rem' }}>skin type:</span>
          <button style={catBtn(skinTypeFilter === 'all')} onClick={() => setSkinTypeFilter('all')}>all</button>
          {skinTypes.map(t => (
            <button key={t} style={catBtn(skinTypeFilter === t)} onClick={() => setSkinTypeFilter(t)}>{t}</button>
          ))}
        </div>
      )}

      {error && <div style={{ color: '#f87171', marginBottom: '0.75rem' }}>{error}</div>}

      {/* grid */}
      {filtered.length === 0 && !loading && (
        <div style={{ color: '#666', textAlign: 'center', padding: '3rem 0' }}>No active lotteries</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {filtered.map(l => (
          <LotteryCard
            key={l.id}
            lottery={l}
            selected={selected?.id === l.id}
            onSelect={() => setSelected(prev => prev?.id === l.id ? null : l)}
          />
        ))}
      </div>

      {/* buy panel */}
      {selected && (
        <BuyPanel
          lottery={selected}
          token={token}
          onDone={() => { setSelected(null); void fetchLotteries(); }}
        />
      )}
    </main>
  );
}
