'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyFreeStatus {
  spentAmountCents: number;
  currentLevel: number;
  accessExpiresAt: string | null;
  lastOpenedAt: string | null;
  cooldownEndsAt: string | null;
  canOpen: boolean;
  levels: { level: number; thresholdCents: number }[];
}

interface SkinData {
  name: string;
  fullName: string;
  iconUrl: string;
  price: number;
  phase: string | null;
  float: number | null;
  backgroundColor: string;
}

interface FreeTicketsData {
  tier: 'low' | 'mid' | 'high';
  quantity: number;
}

interface CardReveal {
  index: number;
  type: 'balance' | 'free_tickets' | 'skin' | 'topup_bonus';
  amountCents: number;
  isWinning: boolean;
  skin?: SkinData;
  freeTickets?: FreeTicketsData;
}

interface OpenResult {
  cards: CardReveal[];
  winningIndex: number;
  reward: {
    type: 'balance' | 'free_tickets' | 'skin' | 'topup_bonus';
    amountCents: number;
    skin?: SkinData;
    freeTickets?: FreeTicketsData;
  };
  cooldownEndsAt: string;
  luckyHit: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cents(c: number) {
  return `$${(c / 100).toFixed(2)}`;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const TIER_COLOR: Record<string, string> = { low: '#6b7280', mid: '#2563eb', high: '#d97706' };

// ── Card ──────────────────────────────────────────────────────────────────────

function Card({ card, revealed }: { card: CardReveal; revealed: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const bgColor = card.skin?.backgroundColor ? `#${card.skin.backgroundColor}` : '#111';

  return (
    <div style={{
      border: card.isWinning ? '2px solid #4ade80' : '1px solid #1f1f1f',
      borderRadius: 10,
      background: '#0d0d0d',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 180,
      opacity: revealed ? 1 : 0.5,
      transition: 'opacity 0.3s',
      position: 'relative',
    }}>
      {card.isWinning && (
        <div style={{
          position: 'absolute', top: 6, right: 6, zIndex: 1,
          background: '#14532d', color: '#4ade80',
          fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>WIN</div>
      )}

      {/* Image area */}
      <div style={{
        background: card.type === 'skin' ? bgColor : '#0a0a0a',
        height: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {card.type === 'skin' && card.skin?.iconUrl && !imgErr ? (
          <img
            src={card.skin.iconUrl}
            alt={card.skin.fullName}
            style={{ maxHeight: 76, maxWidth: '90%', objectFit: 'contain' }}
            onError={() => setImgErr(true)}
          />
        ) : card.type === 'balance' ? (
          <span style={{ fontSize: '1.6rem' }}>💰</span>
        ) : card.type === 'free_tickets' ? (
          <span style={{ fontSize: '1.6rem' }}>🎫</span>
        ) : card.type === 'topup_bonus' ? (
          <span style={{ fontSize: '1.6rem' }}>🎁</span>
        ) : (
          <span style={{ fontSize: '1.6rem' }}>🎁</span>
        )}
      </div>

      {/* Details */}
      <div style={{ padding: '0.5rem 0.65rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#555', fontSize: '0.62rem' }}>
          {card.type === 'balance' ? 'Bonus' : card.type === 'free_tickets' ? 'Free Tickets' : card.type === 'topup_bonus' ? 'Top-up Bonus' : 'Skin'}
        </div>

        {card.type === 'skin' && card.skin && (
          <div style={{ fontWeight: 600, color: '#e5e7eb', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {card.skin.fullName}
          </div>
        )}
        {card.type === 'skin' && card.skin && (
          <div style={{ color: '#4ade80', fontWeight: 700 }}>${card.skin.price.toFixed(2)}</div>
        )}

        {card.type === 'balance' && (
          <div style={{ color: '#facc15', fontWeight: 700, fontSize: '0.9rem' }}>{cents(card.amountCents)}</div>
        )}

        {card.type === 'free_tickets' && card.freeTickets && (
          <div>
            <span style={{
              background: TIER_COLOR[card.freeTickets.tier] ?? '#333',
              color: '#fff',
              padding: '1px 6px', borderRadius: 4,
              fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
              marginRight: 5,
            }}>
              {card.freeTickets.tier}
            </span>
            <span style={{ fontWeight: 700, color: '#a5b4fc' }}>×{card.freeTickets.quantity}</span>
          </div>
        )}

        {card.type === 'topup_bonus' && (
          <div style={{ color: '#a3e635', fontWeight: 700, fontSize: '0.9rem' }}>
            +{(card.amountCents / 100).toFixed(2)} top-up bonus
          </div>
        )}

        <div style={{ color: '#333', fontSize: '0.65rem', marginTop: 'auto' }}>
          card #{card.index + 1}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DailyFreePage() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [status, setStatus] = useState<DailyFreeStatus | null>(null);
  const [result, setResult] = useState<OpenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [qaLoading, setQaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spentInput, setSpentInput] = useState('');

  useEffect(() => { void init(); }, []);

  async function init() {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const { result: r } = await res.json() as { result: { accessToken: string; user: { nickname: string } } };
        setToken(r.accessToken);
        setUsername(r.user.nickname);
        await fetchStatus(r.accessToken);
      }
    } finally {
      setChecking(false);
    }
  }

  async function fetchStatus(t: string) {
    try {
      const res = await fetch(`${API_URL}/api/v1/daily-free/status`, { headers: authHeader(t) });
      if (!res.ok) throw new Error(`status: HTTP ${res.status}`);
      const { result: r } = await res.json() as { result: DailyFreeStatus };
      setStatus(r);
    } catch (e) {
      setError(String(e));
    }
  }

  async function openCard() {
    if (!token) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/daily-free/open`, {
        method: 'POST',
        headers: authHeader(token),
      });
      const body = await res.json() as { result?: OpenResult; message?: string };
      if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
      setResult(body.result!);
      await fetchStatus(token);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function qaSetLevel(level: number) {
    if (!token) return;
    setQaLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/daily-free/qa/set-level`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ level }),
      });
      if (!res.ok) {
        const b = await res.json() as { message?: string };
        throw new Error(b.message ?? `HTTP ${res.status}`);
      }
      await fetchStatus(token);
    } catch (e) {
      setError(String(e));
    } finally {
      setQaLoading(false);
    }
  }

  async function qaSetSpent(dollars: string) {
    if (!token) return;
    const parsed = parseFloat(dollars);
    if (isNaN(parsed) || parsed < 0) { setError('Invalid amount'); return; }
    setQaLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/daily-free/qa/set-spent`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ amountCents: Math.round(parsed * 100) }),
      });
      if (!res.ok) {
        const b = await res.json() as { message?: string };
        throw new Error(b.message ?? `HTTP ${res.status}`);
      }
      setSpentInput('');
      await fetchStatus(token);
    } catch (e) {
      setError(String(e));
    } finally {
      setQaLoading(false);
    }
  }

  async function qaResetCooldown() {
    if (!token) return;
    setQaLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/daily-free/qa/reset-cooldown`, {
        method: 'POST',
        headers: authHeader(token),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchStatus(token);
    } catch (e) {
      setError(String(e));
    } finally {
      setQaLoading(false);
    }
  }

  if (checking) return <main style={pageStyle}>Checking session…</main>;
  if (!token) {
    return (
      <main style={pageStyle}>
        <p style={{ color: '#f87171' }}>Not logged in — <a href="/" style={{ color: '#60a5fa' }}>log in</a></p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <h1 style={{ fontFamily: 'sans-serif', margin: 0, fontSize: '1.4rem' }}>Daily Free</h1>
        <span style={{ fontSize: '0.82rem', color: '#4ade80' }}>● {username}</span>
      </div>

      {error && (
        <div style={{ color: '#f87171', background: '#1a0000', padding: '0.6rem 0.85rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.82rem' }}>
          {error}
        </div>
      )}

      {/* Status */}
      {status && (
        <div style={{ background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Level</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: status.currentLevel > 0 ? '#4ade80' : '#f87171' }}>
                {status.currentLevel > 0 ? `L${status.currentLevel}` : 'None'}
              </div>
            </div>
            <div>
              <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Spent</div>
              <div style={{ fontWeight: 600 }}>{cents(status.spentAmountCents)}</div>
            </div>
            <div>
              <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Access</div>
              <div style={{ color: status.accessExpiresAt ? '#a5b4fc' : '#555' }}>
                {status.accessExpiresAt ? new Date(status.accessExpiresAt).toLocaleDateString('en') : '—'}
              </div>
            </div>
            <div>
              <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Cooldown ends</div>
              <div style={{ color: status.cooldownEndsAt ? '#facc15' : '#555' }}>
                {status.cooldownEndsAt ? new Date(status.cooldownEndsAt).toLocaleTimeString('en') : '—'}
              </div>
            </div>
            <div>
              <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Can open</div>
              <div style={{ fontWeight: 700, color: status.canOpen ? '#4ade80' : '#f87171' }}>
                {status.canOpen ? 'YES' : 'NO'}
              </div>
            </div>
          </div>

          {/* Thresholds */}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {status.levels.map(l => (
              <span key={l.level} style={{
                padding: '2px 9px', borderRadius: 4, fontSize: '0.7rem',
                background: status.currentLevel >= l.level ? '#14532d' : '#111',
                color: status.currentLevel >= l.level ? '#4ade80' : '#555',
                border: '1px solid',
                borderColor: status.currentLevel >= l.level ? '#166534' : '#1f1f1f',
              }}>
                L{l.level} @ {cents(l.thresholdCents)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* QA Controls */}
      <details style={{ marginBottom: '1rem', opacity: 0.6 }}>
        <summary style={{ fontSize: '0.7rem', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}>
          QA Controls (temporary)
        </summary>
        <div style={{ background: '#0a0a14', border: '1px solid #1e1b4b', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#555', marginRight: 4 }}>Set level:</span>
            {[1, 2, 3].map(lvl => (
              <button
                key={lvl}
                onClick={() => qaSetLevel(lvl)}
                disabled={qaLoading}
                style={btnStyle('#1e1b4b', '#a5b4fc')}
              >
                L{lvl}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: '#1f1f1f', margin: '0 4px' }} />
            <button
              onClick={qaResetCooldown}
              disabled={qaLoading}
              style={btnStyle('#1a1000', '#facc15')}
            >
              Reset cooldown
            </button>
            <div style={{ width: 1, height: 20, background: '#1f1f1f', margin: '0 4px' }} />
            <span style={{ fontSize: '0.75rem', color: '#555', marginRight: 4 }}>Set spent ($):</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 150.00"
              value={spentInput}
              onChange={e => setSpentInput(e.target.value)}
              style={{
                width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid #1f1f1f',
                background: '#0a0a0a', color: '#e5e7eb', fontFamily: 'monospace', fontSize: '0.8rem',
              }}
            />
            <button
              onClick={() => qaSetSpent(spentInput)}
              disabled={qaLoading || spentInput === ''}
              style={btnStyle('#140a1e', '#c084fc')}
            >
              Apply
            </button>
          </div>
        </div>
      </details>

      {/* Open button */}
      <button
        onClick={openCard}
        disabled={loading || !status?.canOpen}
        style={{
          padding: '10px 28px',
          borderRadius: 8,
          border: 'none',
          background: status?.canOpen && !loading ? '#15803d' : '#111',
          color: status?.canOpen && !loading ? '#fff' : '#444',
          fontFamily: 'monospace',
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: status?.canOpen && !loading ? 'pointer' : 'default',
          marginBottom: '1.5rem',
          transition: 'background 0.2s',
          letterSpacing: 1,
        }}
      >
        {loading ? 'Opening…' : 'Open Card'}
      </button>

      {/* Result */}
      {result && (
        <div>
          {/* Lucky Hit banner */}
          {result.luckyHit && (
            <div style={{
              background: 'linear-gradient(90deg, #431407, #7c2d12)',
              border: '1px solid #ea580c',
              borderRadius: 8,
              padding: '0.65rem 1rem',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}>
              <span style={{ fontSize: '1.2rem' }}>⚡</span>
              <div>
                <div style={{ color: '#fb923c', fontWeight: 700, fontSize: '0.85rem', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Lucky Hit!
                </div>
                <div style={{ color: '#fed7aa', fontSize: '0.72rem' }}>
                  Your reward was amplified by the Lucky Hit multiplier.
                </div>
              </div>
            </div>
          )}

          {/* Winning reward summary */}
          <div style={{
            background: '#0d1a0d', border: '1px solid #166534', borderRadius: 8,
            padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem',
          }}>
            <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 6 }}>
              You won — card #{result.winningIndex + 1}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: '#555' }}>Type: </span>
                <span style={{ fontWeight: 600 }}>{result.reward.type}</span>
              </div>
              {result.reward.type === 'skin' && result.reward.skin && (
                <div>
                  <span style={{ color: '#555' }}>Skin: </span>
                  <span style={{ fontWeight: 600 }}>{result.reward.skin.fullName}</span>
                  <span style={{ color: '#4ade80', marginLeft: 8 }}>${result.reward.skin.price.toFixed(2)}</span>
                </div>
              )}
              {result.reward.type === 'balance' && (
                <div>
                  <span style={{ color: '#555' }}>Bonus: </span>
                  <span style={{ color: '#facc15', fontWeight: 700 }}>{cents(result.reward.amountCents)}</span>
                </div>
              )}
              {result.reward.type === 'free_tickets' && result.reward.freeTickets && (
                <div>
                  <span style={{ color: '#555' }}>Tickets: </span>
                  <span style={{
                    background: TIER_COLOR[result.reward.freeTickets.tier] ?? '#333',
                    color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: '0.72rem',
                    fontWeight: 700, textTransform: 'uppercase', marginRight: 5,
                  }}>
                    {result.reward.freeTickets.tier}
                  </span>
                  <span style={{ fontWeight: 700, color: '#a5b4fc' }}>×{result.reward.freeTickets.quantity}</span>
                </div>
              )}
              {result.reward.type === 'topup_bonus' && (
                <div>
                  <span style={{ color: '#555' }}>Top-up bonus: </span>
                  <span style={{ color: '#a3e635', fontWeight: 700 }}>${(result.reward.amountCents / 100).toFixed(2)}</span>
                  <span style={{ color: '#555', marginLeft: 8 }}>• Added to your bonus inventory</span>
                </div>
              )}
              <div>
                <span style={{ color: '#555' }}>Next open: </span>
                <span>{new Date(result.cooldownEndsAt).toLocaleTimeString('en')}</span>
              </div>
            </div>
          </div>

          {/* 6 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.6rem' }}>
            {result.cards.map(card => (
              <Card key={card.index} card={card} revealed />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  maxWidth: 1100,
  margin: '1.5rem auto',
  padding: '0 1rem',
  color: '#e5e7eb',
};

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: '5px 14px',
    borderRadius: 6,
    border: '1px solid',
    borderColor: color + '44',
    background: bg,
    color,
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: 600,
  };
}
