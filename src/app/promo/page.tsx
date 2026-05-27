'use client';

import { useEffect, useState } from 'react';

import API_URL, { ADMIN_SECRET } from '@/config';

// ─── DTOs ────────────────────────────────────────────────────────────────────

type PromoRewardType = 'free_tickets' | 'balance_topup_bonus' | 'free_balance';

interface ActivatePromoResponse {
  promoId: string;
  rewardType: PromoRewardType;
  activatedAt: string;
  rewardDetails: { tier: string; quantity: number } | null;
}

interface AdminPromoResponse {
  id: string;
  code: string;
  status: 'active' | 'inactive';
  rewardType: PromoRewardType;
  rewardConfig: Record<string, unknown>;
  activationLimit: number | null;
  activationCount: number;
  remainingActivations: number | null;
  activeUntil: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminPromoListResponse {
  data: AdminPromoResponse[];
  total: number;
}

interface PromoActivationItem {
  id: string;
  promoId: string;
  userSteamId: string;
  rewardType: PromoRewardType;
  rewardConfig: Record<string, unknown>;
  activatedAt: string;
}

interface AdminPromoActivationsResponse {
  data: PromoActivationItem[];
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function token() {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '';
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };
}

function adminHeaders() {
  return { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET };
}

function adminHeadersNoBody() {
  return { 'x-admin-secret': ADMIN_SECRET };
}

const REWARD_CONFIG_DEFAULTS: Record<PromoRewardType, string> = {
  free_tickets: JSON.stringify({ tier: 'low', quantity: 3 }, null, 2),
  balance_topup_bonus: JSON.stringify({ bonusType: 'percentage', bonusValue: 20, minTopUpAmountCents: 1000 }, null, 2),
  free_balance: JSON.stringify({ amountCents: 5000 }, null, 2),
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#111',
  border: '1px solid #1f1f1f',
  borderRadius: 8,
  padding: '1.25rem',
  marginBottom: '1.25rem',
};

const label: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: '0.78rem',
  color: '#888',
};

const input: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 4,
  padding: '6px 10px',
  color: '#e5e7eb',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  width: '100%',
  boxSizing: 'border-box',
};

const btn = (color = '#3b82f6'): React.CSSProperties => ({
  background: color,
  border: 'none',
  borderRadius: 4,
  padding: '7px 16px',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '0.82rem',
  cursor: 'pointer',
  flexShrink: 0,
});

const row: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-end' };

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

// ─── Reusable field ───────────────────────────────────────────────────────────

function Field({ label: l, value, onChange, placeholder, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={label}>{l}</label>
      <input style={input} type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

// ─── Section: Activate ───────────────────────────────────────────────────────

function ActivateSection({ onFreeTickets }: { onFreeTickets: () => void }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ActivatePromoResponse | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function activate() {
    setErr(''); setResult(null); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/promo/activate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? res.statusText);
      const activated: ActivatePromoResponse = json.result ?? json;
      setResult(activated);
      if (activated.rewardType === 'free_tickets') onFreeTickets();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '0.9rem' }}>Activate Promo Code</h3>
      <div style={row}>
        <div style={{ flex: 1 }}>
          <label style={label}>Promo code</label>
          <input style={input} value={code} placeholder="SUMMER2025" onChange={e => setCode(e.target.value.toUpperCase())} />
        </div>
        <button style={btn()} disabled={loading || !code} onClick={activate}>
          {loading ? '…' : 'Activate'}
        </button>
      </div>
      {err && <p style={errorStyle}>{err}</p>}
      {result && (
        <>
          <p style={{ color: '#4ade80', fontSize: '0.8rem', marginTop: 8 }}>✓ Activated</p>
          {result.rewardDetails && (
            <div style={{
              background: '#0d2a1a', border: '1px solid #166534', borderRadius: 6,
              padding: '8px 12px', marginTop: 8, fontSize: '0.8rem',
            }}>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>Free tickets credited: </span>
              <span style={{ color: '#a3e635', fontFamily: 'monospace' }}>
                {result.rewardDetails.quantity}× {result.rewardDetails.tier}
              </span>
            </div>
          )}
          <pre style={pre}>{JSON.stringify(result, null, 2)}</pre>
        </>
      )}
    </div>
  );
}

// ─── Section: Admin ───────────────────────────────────────────────────────────

function AdminSection() {
  const [promos, setPromos] = useState<AdminPromoResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [activations, setActivations] = useState<{ promoId: string; data: PromoActivationItem[]; total: number } | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // Create form state
  const [createCode, setCreateCode] = useState('');
  const [createRewardType, setCreateRewardType] = useState<PromoRewardType>('free_balance');
  const [createRewardConfig, setCreateRewardConfig] = useState(REWARD_CONFIG_DEFAULTS.free_balance);
  const [createLimit, setCreateLimit] = useState('');
  const [createUntil, setCreateUntil] = useState('');
  const [createBy, setCreateBy] = useState('admin');
  const [createResult, setCreateResult] = useState<AdminPromoResponse | null>(null);
  const [createErr, setCreateErr] = useState('');

  // Update form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updateCode, setUpdateCode] = useState('');
  const [updateRewardType, setUpdateRewardType] = useState<PromoRewardType>('free_balance');
  const [updateRewardConfig, setUpdateRewardConfig] = useState('');
  const [updateLimit, setUpdateLimit] = useState('');
  const [updateUntil, setUpdateUntil] = useState('');
  const [updateResult, setUpdateResult] = useState<AdminPromoResponse | null>(null);
  const [updateErr, setUpdateErr] = useState('');

  async function listPromos() {
    setErr(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/promo?limit=50`, { headers: adminHeadersNoBody() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? res.statusText);
      const body: AdminPromoListResponse = json.result ?? json;
      setPromos([...body.data].reverse());
      setTotal(body.total);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deactivate(id: string) {
    setErr('');
    try {
      const res = await fetch(`${API_URL}/api/admin/promo/${id}/deactivate`, {
        method: 'PUT',
        headers: adminHeadersNoBody(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? res.statusText);
      await listPromos();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function reactivate(id: string) {
    setErr('');
    try {
      const res = await fetch(`${API_URL}/api/admin/promo/${id}/reactivate`, {
        method: 'PUT',
        headers: adminHeadersNoBody(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? res.statusText);
      await listPromos();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function getActivations(id: string) {
    setErr('');
    try {
      const res = await fetch(`${API_URL}/api/admin/promo/${id}/activations`, { headers: adminHeadersNoBody() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? res.statusText);
      const body: AdminPromoActivationsResponse = json.result ?? json;
      setActivations({ promoId: id, data: body.data, total: body.total });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function createPromo() {
    setCreateErr(''); setCreateResult(null);
    let rewardConfig: unknown;
    try {
      rewardConfig = JSON.parse(createRewardConfig);
    } catch {
      setCreateErr('rewardConfig is not valid JSON');
      return;
    }
    try {
      const body: Record<string, unknown> = {
        code: createCode,
        rewardType: createRewardType,
        rewardConfig,
        createdBy: createBy,
      };
      if (createLimit) body.activationLimit = Number(createLimit);
      if (createUntil) body.activeUntil = new Date(createUntil).toISOString();

      const res = await fetch(`${API_URL}/api/admin/promo`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json?.message ?? json));
      setCreateResult(json.result ?? json);
      await listPromos();
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : String(e));
    }
  }

  function startEdit(p: AdminPromoResponse) {
    setEditingId(p.id);
    setUpdateCode(p.code);
    setUpdateRewardType(p.rewardType);
    setUpdateRewardConfig(JSON.stringify(p.rewardConfig, null, 2));
    setUpdateLimit(p.activationLimit !== null ? String(p.activationLimit) : '');
    setUpdateUntil(p.activeUntil ? new Date(p.activeUntil).toISOString().slice(0, 16) : '');
    setUpdateResult(null);
    setUpdateErr('');
  }

  async function updatePromo(id: string) {
    setUpdateErr(''); setUpdateResult(null);
    let rewardConfig: unknown;
    try {
      rewardConfig = JSON.parse(updateRewardConfig);
    } catch {
      setUpdateErr('rewardConfig is not valid JSON');
      return;
    }
    try {
      const body: Record<string, unknown> = {
        code: updateCode,
        rewardType: updateRewardType,
        rewardConfig,
      };
      body.activationLimit = updateLimit !== '' ? Number(updateLimit) : null;
      if (updateUntil) body.activeUntil = new Date(updateUntil).toISOString();

      const res = await fetch(`${API_URL}/api/admin/promo/${id}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json?.message ?? json));
      setUpdateResult(json.result ?? json);
      await listPromos();
    } catch (e: unknown) {
      setUpdateErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '0.9rem' }}>Admin</h3>

      <div style={{ marginBottom: 16 }}>
        <button style={btn('#059669')} disabled={loading} onClick={listPromos}>
          {loading ? '…' : 'List promos'}
        </button>
      </div>

      {err && <p style={errorStyle}>{err}</p>}

      {/* Create form */}
      <details style={{ marginBottom: 16 }}>
        <summary style={{ color: '#a3e635', fontSize: '0.82rem', cursor: 'pointer', marginBottom: 10 }}>
          + Create promo
        </summary>
        <div style={{ paddingTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Code" value={createCode} onChange={v => setCreateCode(v.toUpperCase())} placeholder="SUMMER2025" />
            <div style={{ marginBottom: 10 }}>
              <label style={label}>Reward type</label>
              <select
                style={{ ...input, cursor: 'pointer' }}
                value={createRewardType}
                onChange={e => {
                  const t = e.target.value as PromoRewardType;
                  setCreateRewardType(t);
                  setCreateRewardConfig(REWARD_CONFIG_DEFAULTS[t]);
                }}
              >
                <option value="free_balance">free_balance</option>
                <option value="free_tickets">free_tickets</option>
                <option value="balance_topup_bonus">balance_topup_bonus</option>
              </select>
            </div>
            <Field label="Activation limit (empty = unlimited)" value={createLimit} onChange={setCreateLimit} placeholder="100" type="number" />
            <Field label="Active until (empty = permanent)" value={createUntil} onChange={setCreateUntil} type="datetime-local" />
            <Field label="Created by" value={createBy} onChange={setCreateBy} placeholder="admin" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={label}>Reward config (JSON)</label>
            <textarea
              style={{ ...input, height: 80, resize: 'vertical' }}
              value={createRewardConfig}
              onChange={e => setCreateRewardConfig(e.target.value)}
            />
          </div>
          <button style={btn('#a3e635')} onClick={createPromo} disabled={!createCode}>
            <span style={{ color: '#000' }}>Create</span>
          </button>
          {createErr && <p style={errorStyle}>{createErr}</p>}
          {createResult && <pre style={pre}>{JSON.stringify(createResult, null, 2)}</pre>}
        </div>
      </details>

      {/* Promo list */}
      {promos.length > 0 && (
        <div>
          <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: 8 }}>
            {total} promo{total !== 1 ? 's' : ''} total
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {promos.map(p => (
              <div key={p.id} style={{ background: '#0d0d0d', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{p.code}</span>
                  <span style={{
                    fontSize: '0.7rem', padding: '1px 6px', borderRadius: 3,
                    background: p.status === 'active' ? '#14532d' : '#3b1414',
                    color: p.status === 'active' ? '#4ade80' : '#f87171',
                  }}>
                    {p.status}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#6366f1', marginLeft: 2 }}>{p.rewardType}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button style={btn('#374151')} onClick={() => editingId === p.id ? setEditingId(null) : startEdit(p)}>
                      {editingId === p.id ? 'cancel' : 'edit'}
                    </button>
                    <button style={btn('#b45309')} onClick={() => getActivations(p.id)}>activations</button>
                    {p.status === 'active'
                      ? <button style={btn('#7f1d1d')} onClick={() => deactivate(p.id)}>deactivate</button>
                      : <button style={btn('#059669')} onClick={() => reactivate(p.id)}>reactivate</button>
                    }
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {[
                    ['activations', `${p.activationCount}${p.activationLimit !== null ? ` / ${p.activationLimit}` : ' / ∞'}`],
                    ['remaining', p.remainingActivations !== null ? String(p.remainingActivations) : '∞'],
                    ['active until', p.activeUntil ? new Date(p.activeUntil).toLocaleString() : '∞'],
                    ['created by', p.createdBy],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: '#444', fontSize: '0.68rem' }}>{k}</div>
                      <div style={{ color: '#aaa', fontSize: '0.75rem', fontFamily: 'monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 6 }}>
                  <div style={{ color: '#444', fontSize: '0.68rem' }}>reward config</div>
                  <div style={{ color: '#6b7280', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                    {JSON.stringify(p.rewardConfig)}
                  </div>
                </div>

                {/* Inline edit form */}
                {editingId === p.id && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #1f1f1f', paddingTop: 10 }}>
                    <p style={{ color: '#888', fontSize: '0.72rem', margin: '0 0 10px' }}>Edit promo</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <Field label="Code" value={updateCode} onChange={v => setUpdateCode(v.toUpperCase())} placeholder="SUMMER2025" />
                      <div style={{ marginBottom: 10 }}>
                        <label style={label}>Reward type</label>
                        <select
                          style={{ ...input, cursor: 'pointer' }}
                          value={updateRewardType}
                          onChange={e => {
                            const t = e.target.value as PromoRewardType;
                            setUpdateRewardType(t);
                            setUpdateRewardConfig(REWARD_CONFIG_DEFAULTS[t]);
                          }}
                        >
                          <option value="free_balance">free_balance</option>
                          <option value="free_tickets">free_tickets</option>
                          <option value="balance_topup_bonus">balance_topup_bonus</option>
                        </select>
                      </div>
                      <Field label="Activation limit (empty = unlimited)" value={updateLimit} onChange={setUpdateLimit} placeholder="100" type="number" />
                      <Field label="Active until (empty = permanent)" value={updateUntil} onChange={setUpdateUntil} type="datetime-local" />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={label}>Reward config (JSON)</label>
                      <textarea
                        style={{ ...input, height: 80, resize: 'vertical' }}
                        value={updateRewardConfig}
                        onChange={e => setUpdateRewardConfig(e.target.value)}
                      />
                    </div>
                    <button style={btn('#3b82f6')} onClick={() => updatePromo(p.id)}>Save changes</button>
                    {updateErr && <p style={errorStyle}>{updateErr}</p>}
                    {updateResult && <pre style={pre}>{JSON.stringify(updateResult, null, 2)}</pre>}
                  </div>
                )}

                {/* Activations sub-panel */}
                {activations?.promoId === p.id && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #1f1f1f', paddingTop: 10 }}>
                    <p style={{ color: '#888', fontSize: '0.72rem', margin: '0 0 6px' }}>
                      {activations.total} activation{activations.total !== 1 ? 's' : ''}
                    </p>
                    {activations.data.length === 0 ? (
                      <p style={{ color: '#555', fontSize: '0.75rem' }}>No activations yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {activations.data.map(a => (
                          <div key={a.id} style={{
                            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
                            gap: 8, fontSize: '0.72rem', fontFamily: 'monospace', color: '#aaa',
                          }}>
                            <span>{a.userSteamId}</span>
                            <span style={{ color: '#6366f1' }}>{a.rewardType}</span>
                            <span>{new Date(a.activatedAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Free Tickets ────────────────────────────────────────────────────

type FreeTicketTier = 'low' | 'mid' | 'high';
type FreeTicketBalancesMap = Partial<Record<FreeTicketTier, number>>;

function FreeTicketsSection({ autoToken, refreshKey }: { autoToken: string; refreshKey: number }) {
  const [balances, setBalances] = useState<FreeTicketBalancesMap | null>(null);
  const [balanceErr, setBalanceErr] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [qaTier, setQaTier] = useState<FreeTicketTier>('low');
  const [qaAmount, setQaAmount] = useState('3');
  const [qaErr, setQaErr] = useState('');

  useEffect(() => {
    if (autoToken) void fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoToken, refreshKey]);

  async function fetchBalance() {
    setBalanceErr(''); setBalanceLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/free-tickets/balance`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? res.statusText);
      const body = json.result ?? json;
      setBalances(body.balances ?? body);
    } catch (e: unknown) {
      setBalanceErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBalanceLoading(false);
    }
  }

  async function addTickets() {
    setQaErr('');
    try {
      const res = await fetch(`${API_URL}/api/free-tickets/add`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ tier: qaTier, amount: Number(qaAmount) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json?.message ?? json));
      await fetchBalance();
    } catch (e: unknown) {
      setQaErr(e instanceof Error ? e.message : String(e));
    }
  }

  const TIERS: FreeTicketTier[] = ['low', 'mid', 'high'];

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '0.9rem' }}>Free Ticket Balances</h3>

      {/* Balance check */}
      <div style={{ marginBottom: 16 }}>
        <button style={btn('#0369a1')} disabled={balanceLoading} onClick={fetchBalance}>
          {balanceLoading ? '…' : 'GET my balance'}
        </button>
        {balanceErr && <p style={errorStyle}>{balanceErr}</p>}
        {balances && (
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            {TIERS.map(t => (
              <div key={t} style={{
                flex: 1, textAlign: 'center', background: '#0d0d0d',
                borderRadius: 6, padding: '8px 0', border: '1px solid #1f1f1f',
              }}>
                <div style={{ color: '#555', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 1 }}>{t}</div>
                <div style={{ color: '#a3e635', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace' }}>
                  {balances[t] ?? 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QA: add directly */}
      <details>
        <summary style={{ color: '#b45309', fontSize: '0.82rem', cursor: 'pointer', marginBottom: 10 }}>
          [QA] Add free tickets directly (no auth)
        </summary>
        <div style={{ paddingTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={label}>Tier</label>
              <select style={{ ...input, cursor: 'pointer' }} value={qaTier} onChange={e => setQaTier(e.target.value as FreeTicketTier)}>
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Amount</label>
              <input style={input} type="number" value={qaAmount} min="1" onChange={e => setQaAmount(e.target.value)} />
            </div>
          </div>
          <button style={btn('#b45309')} onClick={addTickets}>Add tickets</button>
          {qaErr && <p style={errorStyle}>{qaErr}</p>}
        </div>
      </details>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromoPage() {
  const [accessToken, setAccessToken] = useState('');
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(res => { if (res.ok) return res.json(); })
      .then((json) => {
        if (json?.result?.accessToken) {
          localStorage.setItem('access_token', json.result.accessToken);
          setAccessToken(json.result.accessToken);
        }
      })
      .catch(() => { });
  }, []);

  return (
    <main style={{ maxWidth: 860, margin: '2rem auto', padding: '0 1.5rem' }}>
      <h2 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1.5rem', letterSpacing: '0.02em' }}>
        Promo Testing
      </h2>
      <ActivateSection onFreeTickets={() => setTicketRefreshKey(k => k + 1)} />
      <FreeTicketsSection autoToken={accessToken} refreshKey={ticketRefreshKey} />
      <AdminSection />
    </main>
  );
}
