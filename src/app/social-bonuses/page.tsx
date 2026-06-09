'use client';

import { useEffect, useRef, useState } from 'react';

import { API_URL } from '@/config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelBonusDto {
  id: string;
  channel: string;
  rewardType: 'balance' | 'free_tickets';
  rewardAmount: number;
  tier?: 'low' | 'mid' | 'high';
  channelUrl: string;
  status: 'active' | 'inactive';
  redirected: boolean;
  claimed: boolean;
  claimedAt: string | null;
}

interface ClaimResponse {
  id: string;
  channel: string;
  rewardType: string;
  rewardAmount: number;
  claimedAt: string;
}

interface RedirectResponse {
  channelId: string;
  redirectedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function token() {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '';
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#111',
  border: '1px solid #1f1f1f',
  borderRadius: 8,
  padding: '1.25rem',
  marginBottom: '1.25rem',
};

const btn = (color = '#3b82f6', disabled = false): React.CSSProperties => ({
  background: disabled ? '#1f1f1f' : color,
  border: 'none',
  borderRadius: 4,
  padding: '7px 16px',
  color: disabled ? '#444' : '#fff',
  fontFamily: 'monospace',
  fontSize: '0.82rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  flexShrink: 0,
});

const pre: React.CSSProperties = {
  background: '#0d0d0d',
  border: '1px solid #1f1f1f',
  borderRadius: 4,
  padding: '0.75rem',
  fontSize: '0.75rem',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  marginTop: 8,
  color: '#a3e635',
};

const errorStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.8rem', marginTop: 6 };

const CHANNEL_COLOR: Record<string, string> = {
  telegram: '#0088cc',
  discord: '#5865f2',
  instagram: '#e1306c',
  youtube: '#ff0000',
};

function channelColor(ch: string) {
  return CHANNEL_COLOR[ch] ?? '#6b7280';
}

// ─── Section: List, Redirect & Claim ─────────────────────────────────────────

function SubscriptionBonusesSection() {
  const [channels, setChannels] = useState<ChannelBonusDto[] | null>(null);
  const [listErr, setListErr] = useState('');
  const [listLoading, setListLoading] = useState(false);

  // per-channel redirect state
  const [redirectLoading, setRedirectLoading] = useState<Record<string, boolean>>({});
  const [redirected, setRedirected] = useState<Record<string, boolean>>({});
  const [redirectErr, setRedirectErr] = useState<Record<string, string>>({});

  // per-channel claim state
  const [claimLoading, setClaimLoading] = useState<Record<string, boolean>>({});
  const [claimResult, setClaimResult] = useState<Record<string, ClaimResponse | undefined>>({});
  const [claimErr, setClaimErr] = useState<Record<string, string>>({});
  const [claimSeconds, setClaimSeconds] = useState<Record<string, number>>({});
  const timerRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  async function listChannels() {
    setListErr('');
    setListLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/social-bonuses`, { headers: authHeaders() });
      const json = await res.json() as { result?: unknown; message?: string };
      if (!res.ok) throw new Error(json?.message ?? res.statusText);
      const body = (json.result ?? json) as { channels?: ChannelBonusDto[] } | ChannelBonusDto[];
      const resolved = (Array.isArray(body) ? body : body.channels) ?? [];
      setChannels(resolved);
      setRedirected(Object.fromEntries(resolved.map(ch => [ch.channel, ch.redirected])));
    } catch (e: unknown) {
      setListErr(e instanceof Error ? e.message : String(e));
    } finally {
      setListLoading(false);
    }
  }

  async function trackRedirect(channel: string, channelUrl: string) {
    setRedirectErr(prev => ({ ...prev, [channel]: '' }));
    setRedirectLoading(prev => ({ ...prev, [channel]: true }));
    try {
      const res = await fetch(`${API_URL}/api/social-bonuses/${channel}/redirect`, {
        method: 'POST',
        headers: authHeaders(),
        body: '{}',
      });
      const json = await res.json() as { result?: unknown; message?: string };
      if (!res.ok) throw new Error(json?.message ?? res.statusText);
      const data = (json.result ?? json) as RedirectResponse;
      setRedirected(prev => ({ ...prev, [channel]: true }));
      // open the channel URL after redirect is recorded
      window.open(channelUrl, '_blank', 'noreferrer');
      return data;
    } catch (e: unknown) {
      setRedirectErr(prev => ({ ...prev, [channel]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setRedirectLoading(prev => ({ ...prev, [channel]: false }));
    }
  }

  function startTimer(channel: string) {
    setClaimSeconds(prev => ({ ...prev, [channel]: 0 }));
    timerRefs.current[channel] = setInterval(() => {
      setClaimSeconds(prev => ({ ...prev, [channel]: (prev[channel] ?? 0) + 1 }));
    }, 1000);
  }

  function stopTimer(channel: string) {
    clearInterval(timerRefs.current[channel]);
    delete timerRefs.current[channel];
  }

  async function claimBonus(channel: string) {
    setClaimErr(prev => ({ ...prev, [channel]: '' }));
    setClaimResult(prev => ({ ...prev, [channel]: undefined }));
    setClaimLoading(prev => ({ ...prev, [channel]: true }));
    startTimer(channel);
    try {
      const res = await fetch(`${API_URL}/api/social-bonuses/${channel}/claim`, {
        method: 'POST',
        headers: authHeaders(),
        body: '{}',
      });
      const json = await res.json() as { result?: unknown; message?: string };
      if (!res.ok) throw new Error(json?.message ?? res.statusText);
      setClaimResult(prev => ({ ...prev, [channel]: (json.result ?? json) as ClaimResponse }));
      await listChannels();
    } catch (e: unknown) {
      setClaimErr(prev => ({ ...prev, [channel]: e instanceof Error ? e.message : String(e) }));
    } finally {
      stopTimer(channel);
      setClaimLoading(prev => ({ ...prev, [channel]: false }));
    }
  }

  function formatReward(ch: ChannelBonusDto) {
    if (ch.rewardType === 'balance') return `$${(ch.rewardAmount / 100).toFixed(2)}`;
    return `${ch.rewardAmount}× ${ch.tier ?? '?'} tickets`;
  }

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 0.25rem', color: '#fff', fontSize: '0.9rem' }}>Subscription Bonuses</h3>
      <p style={{ color: '#888', fontSize: '0.75rem', margin: '0 0 1rem' }}>
        Flow: <strong style={{ color: '#aaa' }}>Subscribe</strong> records the redirect + opens the channel →{' '}
        <strong style={{ color: '#aaa' }}>Get Bonus</strong> verifies (3–5 s mock) and credits the reward.
      </p>

      <div style={{ marginBottom: 16 }}>
        <button style={btn('#059669')} disabled={listLoading} onClick={listChannels}>
          {listLoading ? '…' : 'GET /social-bonuses'}
        </button>
      </div>

      {listErr && <p style={errorStyle}>{listErr}</p>}

      {channels !== null && (
        channels.length === 0
          ? <p style={{ color: '#555', fontSize: '0.8rem' }}>No channels configured.</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {channels.map(ch => {
                const isRedirected = !!redirected[ch.channel];
                const isClaiming = !!claimLoading[ch.channel];
                const isRedirecting = !!redirectLoading[ch.channel];
                const color = channelColor(ch.channel);

                return (
                  <div key={ch.channel} style={{ background: '#0d0d0d', borderRadius: 6, padding: '12px 14px' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

                      <span style={{
                        fontSize: '0.75rem', padding: '2px 8px', borderRadius: 3, fontFamily: 'monospace',
                        fontWeight: 700, textTransform: 'uppercase',
                        background: color + '22', color,
                      }}>
                        {ch.channel}
                      </span>

                      <span style={{ color: '#a3e635', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        {formatReward(ch)}
                      </span>

                      <span style={{
                        fontSize: '0.7rem', padding: '1px 6px', borderRadius: 3,
                        background: ch.status === 'active' ? '#14532d' : '#3b1414',
                        color: ch.status === 'active' ? '#4ade80' : '#f87171',
                      }}>
                        {ch.status}
                      </span>

                      {ch.claimed && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 3, background: '#1e3a5f', color: '#60a5fa' }}>
                          claimed
                        </span>
                      )}

                      {isRedirected && !ch.claimed && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 3, background: '#1a2a1a', color: '#4ade80' }}>
                          redirected
                        </span>
                      )}

                      <a href={ch.channelUrl} target="_blank" rel="noreferrer"
                        style={{ color: '#444', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                        {ch.channelUrl}
                      </a>

                      {/* Action buttons */}
                      {!ch.claimed && ch.status === 'active' && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isClaiming && (
                            <span style={{ color: '#888', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              verifying… {claimSeconds[ch.channel] ?? 0}s
                            </span>
                          )}
                          <button
                            style={btn(color, isRedirecting)}
                            disabled={isRedirecting}
                            onClick={() => trackRedirect(ch.channel, ch.channelUrl)}
                          >
                            {isRedirecting ? '…' : 'Subscribe'}
                          </button>
                          <button
                            style={btn('#3b82f6', !isRedirected || isClaiming)}
                            disabled={!isRedirected || isClaiming}
                            onClick={() => claimBonus(ch.channel)}
                          >
                            {isClaiming ? '…' : 'Get Bonus'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    {ch.claimed && ch.claimedAt && (
                      <p style={{ color: '#444', fontSize: '0.72rem', margin: '6px 0 0', fontFamily: 'monospace' }}>
                        claimed at: {new Date(ch.claimedAt).toLocaleString()}
                      </p>
                    )}

                    {/* Errors */}
                    {redirectErr[ch.channel] && <p style={errorStyle}>{redirectErr[ch.channel]}</p>}
                    {claimErr[ch.channel] && <p style={errorStyle}>{claimErr[ch.channel]}</p>}

                    {/* Claim result */}
                    {claimResult[ch.channel] && (
                      <>
                        <p style={{ color: '#4ade80', fontSize: '0.8rem', marginTop: 8 }}>✓ Bonus claimed</p>
                        <pre style={pre}>{JSON.stringify(claimResult[ch.channel], null, 2)}</pre>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialBonusesPage() {
  useEffect(() => {
    fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(res => { if (res.ok) return res.json(); })
      .then((json: unknown) => {
        const j = json as { result?: { accessToken?: string } };
        if (j?.result?.accessToken) localStorage.setItem('access_token', j.result.accessToken);
      })
      .catch(() => {});
  }, []);

  return (
    <main style={{ maxWidth: 860, margin: '2rem auto', padding: '0 1.5rem' }}>
      <h2 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1.5rem', letterSpacing: '0.02em' }}>
        Social Bonuses Testing
      </h2>
      <SubscriptionBonusesSection />
    </main>
  );
}
