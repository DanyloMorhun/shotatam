'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { API_URL } from '@/config';
const BASE_URL = new URL(API_URL).origin;

// A real duplicate for main:order means two fires within 2s (one per lifecycle change is the rule).
// For main:lottery_updated the 100ms debounce intentionally produces consecutive batches when many
// lotteries change at once — only flag if two flushes arrive faster than the debounce period itself.
const BURST_WINDOW: Record<string, number> = {
  'main:order': 2_000,
  'main:lottery_updated': 80, // below the 100ms debounce — any shorter gap is a real duplicate
};

interface LogEntry {
  id: number;
  time: string;
  event: 'main:order' | 'main:lottery_updated';
  payload: unknown;
  isBurst: boolean;
  isArray: boolean | null; // only meaningful for lottery_updated
}

function timestamp(): string {
  const d = new Date();
  const hms = d.toLocaleTimeString('en', { hour12: false });
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hms}.${ms}`;
}

export default function MainWsPage() {
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [updateCount, setUpdateCount] = useState(0);

  const lastFired = useRef<Record<string, number>>({});
  const entryId = useRef(0);

  useEffect(() => {
    const socket = io(`${BASE_URL}/main`, { transports: ['websocket'] });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinMainPage');
    });

    socket.on('disconnect', () => setConnected(false));

    function push(event: LogEntry['event'], payload: unknown) {
      const now = Date.now();
      const isBurst = (now - (lastFired.current[event] ?? 0)) < (BURST_WINDOW[event] ?? 2_000);
      lastFired.current[event] = now;

      const isArray = event === 'main:lottery_updated' ? Array.isArray(payload) : null;

      setLog(prev => [
        { id: ++entryId.current, time: timestamp(), event, payload, isBurst, isArray },
        ...prev.slice(0, 199),
      ]);
    }

    socket.on('main:order', (p) => {
      push('main:order', p);
      setOrderCount(c => c + 1);
    });

    socket.on('main:lottery_updated', (p) => {
      push('main:lottery_updated', p);
      setUpdateCount(c => c + 1);
    });

    return () => { socket.disconnect(); };
  }, []);

  function clearLog() {
    setLog([]);
    setOrderCount(0);
    setUpdateCount(0);
    lastFired.current = {};
    entryId.current = 0;
  }

  const burstCount = log.filter(e => e.isBurst).length;
  const nonArrayUpdates = log.filter(e => e.event === 'main:lottery_updated' && !e.isArray).length;

  // ── styles ─────────────────────────────────────────────────────────────────

  const s = {
    page:    { fontFamily: 'monospace', maxWidth: 960, margin: '1.5rem auto', padding: '0 1rem' } as React.CSSProperties,
    heading: { fontFamily: 'sans-serif', marginBottom: '1rem' } as React.CSSProperties,
    bar:     { display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.75rem 1rem', background: '#f5f5f5', borderRadius: 8, marginBottom: '1rem' } as React.CSSProperties,
    log:     { height: 640, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 8, padding: '0.5rem' } as React.CSSProperties,
    empty:   { color: '#aaa', padding: '1rem', textAlign: 'center' as const },
  };

  const entryBg = (e: LogEntry) => e.isBurst ? '#fff5f5' : '#fafafa';
  const entryBorder = (e: LogEntry) => e.isBurst ? 'crimson' : e.event === 'main:order' ? '#2563eb' : '#16a34a';
  const eventColor = (e: LogEntry) => e.event === 'main:order' ? '#2563eb' : '#16a34a';

  return (
    <main style={s.page}>
      <h1 style={s.heading}>/main namespace — WebSocket event log</h1>

      {/* ── status bar ── */}
      <div style={s.bar}>
        <span style={{ color: connected ? 'green' : 'crimson', fontWeight: 'bold' }}>
          {connected ? '● /main connected' : '○ disconnected'}
        </span>

        <span>main:order ×<strong>{orderCount}</strong></span>
        <span>main:lottery_updated ×<strong>{updateCount}</strong></span>

        {burstCount > 0 && (
          <span style={{ color: 'crimson', fontWeight: 'bold' }}>
            ⚠ {burstCount} burst{burstCount !== 1 ? 's' : ''}
          </span>
        )}

        {nonArrayUpdates > 0 && (
          <span style={{ color: 'orange', fontWeight: 'bold' }}>
            ⚠ {nonArrayUpdates} single-object lottery_updated (not array — old format)
          </span>
        )}

        {burstCount === 0 && log.length > 0 && (
          <span style={{ color: 'green', fontWeight: 'bold' }}>✓ no bursts</span>
        )}

        <button onClick={clearLog} style={{ marginLeft: 'auto', padding: '4px 14px', cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      {/* ── legend ── */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#666' }}>
        <span style={{ borderLeft: '4px solid #2563eb', paddingLeft: 6 }}>main:order</span>
        <span style={{ borderLeft: '4px solid #16a34a', paddingLeft: 6 }}>main:lottery_updated</span>
        <span style={{ borderLeft: '4px solid crimson', paddingLeft: 6, color: 'crimson' }}>burst — order &lt;{BURST_WINDOW['main:order']}ms · updated &lt;{BURST_WINDOW['main:lottery_updated']}ms</span>
      </div>

      {/* ── event log ── */}
      <div style={s.log}>
        {log.length === 0 && <div style={s.empty}>Waiting for events…</div>}

        {log.map(entry => (
          <div
            key={entry.id}
            style={{
              marginBottom: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              borderLeft: `4px solid ${entryBorder(entry)}`,
              background: entryBg(entry),
            }}
          >
            {/* header row */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ color: '#888', fontSize: '0.78rem' }}>{entry.time}</span>

              <span style={{ fontWeight: 'bold', color: eventColor(entry) }}>
                {entry.event}
              </span>

              {entry.event === 'main:lottery_updated' && (
                <span style={{ fontSize: '0.78rem', color: entry.isArray ? '#16a34a' : 'orange' }}>
                  {entry.isArray
                    ? `array[${(entry.payload as unknown[]).length}]`
                    : 'single object'}
                </span>
              )}

              {entry.event === 'main:order' && (() => {
                const p = entry.payload as Record<string, string[]> | null;
                if (p && typeof p === 'object') {
                  const total = Object.values(p).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);
                  return <span style={{ fontSize: '0.78rem', color: '#888' }}>{total} lottery IDs across {Object.keys(p).length} tier(s)</span>;
                }
                return null;
              })()}

              {entry.isBurst && (
                <span style={{ color: 'crimson', fontSize: '0.78rem', fontWeight: 'bold', marginLeft: 'auto' }}>
                  ⚠ BURST — &lt;{BURST_WINDOW[entry.event]}ms since previous {entry.event}
                </span>
              )}
            </div>

            {/* payload */}
            <pre style={{ margin: 0, fontSize: '0.72rem', color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflowY: 'auto' }}>
              {JSON.stringify(entry.payload, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </main>
  );
}
