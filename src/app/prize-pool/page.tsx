'use client';

import { useEffect, useState } from 'react';

import { API_URL } from '@/config';

const TIER_COLOR: Record<string, string> = {
  low: '#6b7280',
  mid: '#2563eb',
  high: '#d97706',
  mystery: '#7c3aed',
};

interface LotteryPrize {
  fullName: string;
  skinName: string;
  price: number;
}

interface Lottery {
  id: string;
  tier: string;
  ticketCount: number;
  ticketPrice: number;
  soldTickets: number;
  prize: LotteryPrize | null;
}

export default function PrizePoolPage() {
  const [token, setToken] = useState<string | null>(null);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void init(); }, []);

  async function init() {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const { result } = await res.json() as { result: { accessToken: string } };
        setToken(result.accessToken);
        await load(result.accessToken);
        return;
      }
    } catch { /* no refresh token, proceed unauthenticated */ }
    await load(null);
  }

  async function load(accessToken: string | null = token) {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch(`${API_URL}/api/lotteries?limit=50`, { headers });
      if (!res.ok) throw new Error(`Lotteries API: HTTP ${res.status}`);
      const { result } = (await res.json()) as { result: { data: Lottery[] } };
      setLotteries(result.data.filter((l) => l.prize !== null));
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
          <span style={{ fontSize: '0.85rem', color: '#888' }}>{lotteries.length} active prize{lotteries.length !== 1 ? 's' : ''}</span>
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
              {lotteries.map((l) => {
                const skinvend = l.prize!.price;
                const client = l.ticketPrice * l.ticketCount;
                const diff = skinvend - client;
                const isGood = diff <= 0;
                const isEqual = diff === 0;
                const cmp = isEqual ? '=' : isGood ? '<' : '>';
                const cmpColor = isEqual ? '#888' : isGood ? '#4ade80' : '#f87171';

                return (
                  <tr key={l.id}>
                    <td style={{ ...td, fontWeight: 700, color: TIER_COLOR[l.tier] ?? '#aaa', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>
                      {l.tier}
                    </td>
                    <td style={td}>{l.prize!.fullName || l.prize!.skinName}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: isGood ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                      ${skinvend.toFixed(2)}
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: cmpColor, fontSize: '1rem' }}>
                      {cmp}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      ${client.toFixed(2)}
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.72rem', color: '#555' }}>{l.id}</td>
                  </tr>
                );
              })}
              {lotteries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...td, color: '#555', textAlign: 'center' }}>No active lotteries with prizes</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
