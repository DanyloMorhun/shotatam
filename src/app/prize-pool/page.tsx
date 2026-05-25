'use client';

import { useEffect, useState } from 'react';

import { API_URL } from '@/config';

const TIER_COLOR: Record<string, string> = {
  low: '#6b7280',
  mid: '#2563eb',
  high: '#d97706',
  mystery: '#7c3aed',
};

interface PrizePoolItem {
  lotteryId: string;
  tier: string;
  fullName: string;
  price: number;
  ticketPrice: number;
  ticketCount: number;
  margin: number;
}

export default function PrizePoolPage() {
  const [items, setItems] = useState<PrizePoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/prize-pool`);
      if (!res.ok) throw new Error(`Prize Pool API: HTTP ${res.status}`);
      const { result } = (await res.json()) as { result: PrizePoolItem[] };
      setItems(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const th: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #333',
    whiteSpace: 'nowrap', color: '#888', fontSize: '0.8rem',
  };
  const td: React.CSSProperties = { padding: '7px 12px', borderBottom: '1px solid #1f1f1f', fontSize: '0.85rem' };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 1000, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Prize Pool</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => void load()} disabled={loading} style={{ padding: '6px 16px' }}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        {!loading && !error && (
          <span style={{ fontSize: '0.85rem', color: '#888' }}>{items.length} active prize{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead style={{ background: '#1a1a1a' }}>
              <tr>
                <th style={th}>Tier</th>
                <th style={th}>Skin</th>
                <th style={{ ...th, textAlign: 'right' }}>Skinvend</th>
                <th style={{ ...th, textAlign: 'center', width: 32 }}>cmp</th>
                <th style={{ ...th, textAlign: 'right' }}>Client</th>
                <th style={th}>Lottery ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const skinvend = item.price;
                const client = item.ticketPrice * item.ticketCount;
                const diff = skinvend - client;
                const isGood = diff <= 0;
                const isEqual = diff === 0;
                const cmp = isEqual ? '=' : isGood ? '<' : '>';
                const cmpColor = isEqual ? '#888' : isGood ? '#4ade80' : '#f87171';

                return (
                  <tr key={item.lotteryId}>
                    <td style={{ ...td, fontWeight: 700, color: TIER_COLOR[item.tier] ?? '#aaa', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>
                      {item.tier}
                    </td>
                    <td style={td}>{item.fullName}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: isGood ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                      ${skinvend.toFixed(2)}
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: cmpColor, fontSize: '1rem' }}>
                      {cmp}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      ${client.toFixed(2)}
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.72rem', color: '#555' }}>{item.lotteryId}</td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...td, color: '#555', textAlign: 'center' }}>No reserved prize pool items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
