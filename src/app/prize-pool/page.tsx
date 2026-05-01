'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const NORMALIZATION_URL = process.env.NEXT_PUBLIC_NORMALIZATION_URL ?? '';
const SKINVEND_MARGIN = 1.05;
const PRICE_LIMIT_INDEX = 4;

type Status = 'ok' | 'filtered' | 'missing';

interface PrizeRow {
  lotteryId: string;
  tier: string;
  fullName: string;
  skinvendPrice: number;
  effectivePrice: number;
  priceLimit: number | null;
  status: Status;
}

export default function PrizePoolPage() {
  const [rows, setRows] = useState<PrizeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [lotteriesRes, normRes] = await Promise.all([
        fetch(`${API_URL}/api/lotteries`),
        fetch(NORMALIZATION_URL),
      ]);

      if (!lotteriesRes.ok) throw new Error(`Lotteries API: HTTP ${lotteriesRes.status}`);
      if (!normRes.ok) throw new Error(`Normalization API: HTTP ${normRes.status}`);

      const lotteriesBody = await lotteriesRes.json();
      const normBody = await normRes.json();

      const lotteries: { id: string; tier: string; prize: { fullName: string; price: number } | null }[] =
        lotteriesBody.data ?? lotteriesBody;
      const midData: Record<string, number[]> = normBody.mid_data ?? {};

      const result: PrizeRow[] = lotteries
        .filter((l) => l.prize !== null)
        .map((l) => {
          const { fullName, price } = l.prize!;
          const entry = midData[fullName];
          const effectivePrice = price * SKINVEND_MARGIN;

          if (!entry) {
            return { lotteryId: l.id, tier: l.tier, fullName, skinvendPrice: price, effectivePrice, priceLimit: null, status: 'missing' as Status };
          }

          const priceLimit = entry[PRICE_LIMIT_INDEX];
          const status: Status = effectivePrice > priceLimit ? 'filtered' : 'ok';
          return { lotteryId: l.id, tier: l.tier, fullName, skinvendPrice: price, effectivePrice, priceLimit, status };
        });

      setRows(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const summary = {
    ok: rows.filter((r) => r.status === 'ok').length,
    filtered: rows.filter((r) => r.status === 'filtered').length,
    missing: rows.filter((r) => r.status === 'missing').length,
  };

  const statusColor = (s: Status) => (s === 'ok' ? '#1a7a1a' : 'crimson');
  const statusLabel = (s: Status) => ({ ok: '✅ OK', filtered: '❌ Should be filtered', missing: '❌ Missing from API' }[s]);

  const th: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #ddd', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '7px 12px', borderBottom: '1px solid #eee', fontSize: '0.85rem' };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 1100, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Prize Pool Validation</h1>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Checks active lottery prizes against the normalization API.<br />
        Filter condition: <code>skinvendPrice × 1.05 ≤ priceLimit (array[4])</code>
      </p>

      <button onClick={load} disabled={loading} style={{ marginBottom: '1rem', padding: '6px 16px' }}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>

      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {!loading && !error && (
        <>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#1a7a1a', fontWeight: 'bold' }}>✅ OK: {summary.ok}</span>
            <span style={{ color: 'crimson', fontWeight: 'bold' }}>❌ Should be filtered: {summary.filtered}</span>
            <span style={{ color: 'crimson', fontWeight: 'bold' }}>❌ Missing from API: {summary.missing}</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: '#f5f5f5' }}>
                <tr>
                  <th style={th}>Status</th>
                  <th style={th}>Tier</th>
                  <th style={th}>Skin</th>
                  <th style={th}>Skinvend price</th>
                  <th style={th}>× 1.05</th>
                  <th style={th}>Price limit (array[4])</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.lotteryId} style={{ background: row.status !== 'ok' ? '#fff5f5' : undefined }}>
                    <td style={{ ...td, color: statusColor(row.status), fontWeight: 'bold' }}>{statusLabel(row.status)}</td>
                    <td style={td}>{row.tier}</td>
                    <td style={td}>{row.fullName}</td>
                    <td style={td}>${row.skinvendPrice}</td>
                    <td style={{ ...td, color: row.status === 'filtered' ? 'crimson' : undefined }}>
                      ${row.effectivePrice.toFixed(3)}
                    </td>
                    <td style={td}>{row.priceLimit !== null ? `$${row.priceLimit}` : '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} style={{ ...td, color: '#aaa', textAlign: 'center' }}>No active lotteries with prizes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
