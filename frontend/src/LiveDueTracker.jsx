import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import Assignee from './Assignee';
import Brand from './Brand';
import { shortDueType, formatDueSoonDate } from './dueConstants';

const REFRESH_MS = 60000;
// TV board (departure-board) config constants — kept here, not magic
// numbers inline, per spec ("keep rows-per-page and rotation time as
// config constants").
const TV_ROWS_PER_PAGE = 5;
const TV_TICKER_SECONDS_PER_ITEM = 4;
const TV_EMPTY_COPY = {
  today: { title: 'No dues today', sub: 'All clear — nothing is due today.' },
  overdue: { title: 'Nothing overdue', sub: 'No missed deadlines this month. Great work.' },
  next7: { title: 'Nothing due in the next 7 days', sub: 'A quiet week ahead.' },
  completed: { title: 'Nothing filed yet', sub: 'Filed items will show up here this month.' },
};
const TV_EMPTY_AUTO_SWITCH_MS = 10000;
const TV_COUNT_UP_MS = 900;
const TV_PAGE_ROTATE_MS = 12000;
const TV_BUSY_DAY_THRESHOLD = 8;

// Real status values -> one of the 3 status colour groups. Only 'pending',
// 'overdue' and 'completed' actually exist in the data (see dueBuilder.js) —
// no 'in_progress'/'filed'/etc. value is invented here.
const TV_STATUS_META = {
  pending: { label: 'PENDING', tone: 'in-progress' },
  overdue: { label: 'OVERDUE', tone: 'overdue' },
  completed: { label: 'COMPLETED', tone: 'positive' },
};
// Below this viewport height, this is treated as a laptop, not a TV/large
// monitor: the screen scrolls normally instead of being squeezed to fit,
// per spec ("Also check it looks fine at a normal laptop width — this can
// scroll normally, doesn't need to be TV-fit").
const TV_FIT_MIN_HEIGHT = 850;

const SCALE_KEY = 'liveDueTracker.textScale';
const SCALE_MIN = 0.7;
const SCALE_MAX = 1.5;
const SCALE_STEP = 0.1;

const AUTO_SCROLL_PX_PER_SEC = 8; // as slow as still visibly moving
const AUTO_SCROLL_PAUSE_MS = 2200;
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The left table's current category — also each card's own key, so a
// card's colour variable is always just `--ldt-${selection}`.
const CARD_TITLES = {
  today: 'Due today',
  next7: 'Next 7 days',
  overdue: 'Overdue',
  completed: 'Completed (this month)',
};

const pad2 = (n) => String(n).padStart(2, '0');
const formatClock = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
// 12-hour + am/pm, distinct from the main clock's 24-hour display — matches
// how "Synced" reads in the reference design.
function formatSyncedTime(d) {
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${pad2(d.getMinutes())} ${ampm}`;
}
const formatHeaderDate = (d) => `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
// 'YYYY-MM-DD' -> "Fri 25" for the Next 7 days panel's row labels.
function formatDayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS_SHORT[date.getDay()]} ${d}`;
}
// 'YYYY-MM-DD' + n days -> 'YYYY-MM-DD', used to find "tomorrow" for the
// TOMORROW row tag/tint.
function addIsoDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

// Split-flap tile: used for both the clock digits and the KPI numbers.
// Flips (briefly) only when its own character actually changes, so a 60s
// data refresh doesn't re-flip every digit, only the clock's ticking ones.
function TvFlapDigit({ ch, size }) {
  const prevRef = useRef(ch);
  const [flipping, setFlipping] = useState(false);
  useEffect(() => {
    if (prevRef.current === ch) return undefined;
    prevRef.current = ch;
    setFlipping(true);
    const t = setTimeout(() => setFlipping(false), 450);
    return () => clearTimeout(t);
  }, [ch]);
  return (
    <span className={`tv-flap tv-flap-${size} ${flipping ? 'is-flipping' : ''}`}>
      <span className="tv-flap-face">{ch}</span>
    </span>
  );
}

function TvClock({ now }) {
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());
  return (
    <div className="tv-clock">
      <TvFlapDigit ch={hh[0]} size="clock" />
      <TvFlapDigit ch={hh[1]} size="clock" />
      <span className="tv-clock-colon">:</span>
      <TvFlapDigit ch={mm[0]} size="clock" />
      <TvFlapDigit ch={mm[1]} size="clock" />
      <span className="tv-clock-colon">:</span>
      <TvFlapDigit ch={ss[0]} size="clock" />
      <TvFlapDigit ch={ss[1]} size="clock" />
    </div>
  );
}

// KPI number, padded to at least 2 digits ("0" -> "00"); a 3+ digit number
// just grows (shows every digit), per spec.
function TvKpiNumber({ value, tone }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (value <= 0) return undefined;
    const step = TV_COUNT_UP_MS / Math.min(value, 30);
    let n = 0;
    const id = setInterval(() => {
      n = Math.min(value, n + Math.max(1, Math.ceil(value / 30)));
      setShown(n);
      if (n >= value) clearInterval(id);
    }, step);
    return () => clearInterval(id);
  }, [value]);
  const str = String(Math.min(shown, Math.max(0, value))).padStart(2, '0');
  return (
    <div className={`tv-kpi-number is-${tone}`}>
      {str.split('').map((ch, i) => (
        <TvFlapDigit key={i} ch={ch} size="kpi" />
      ))}
    </div>
  );
}

function TvLedBar({ count, busy }) {
  const filled = Math.min(10, count);
  return (
    <span className={`tv-led-bar ${busy ? 'is-busy' : ''}`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className={`tv-led-block ${i < filled ? 'is-filled' : ''}`} style={{ '--i': i }} />
      ))}
    </span>
  );
}

// Small inline checkmark for "Recently completed" rows — its colour is set
// via style (not a plain attribute) so it resolves the CSS custom property
// and still greys out correctly under Colour/Mono.
function CheckIcon() {
  return (
    <svg className="ldt-check-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3.5 9.5L7 13L14.5 5"
        style={{ stroke: 'var(--ldt-completed)' }}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// TV-board replacement for the Due dashboard's "Due soon" view. Read-only —
// no inline editing here, a row's Code just opens the same due detail page
// every other table uses. `refreshKey` bumping (a save made elsewhere while
// this screen is open) triggers a re-read, same convention as the old
// DueSoon view.
function LiveDueTracker({ refreshKey, onSelectDue, onBack, theme, onToggleTheme }) {
  const [today, setToday] = useState(null);
  const [todayDues, setTodayDues] = useState([]);
  const [upcomingDues, setUpcomingDues] = useState([]);
  const [overdueDues, setOverdueDues] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedDues, setCompletedDues] = useState([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  // One of CARD_TITLES's keys — also drives the active card, the table's
  // content/title colour and the auto-scroll restart point.
  const [selection, setSelection] = useState('today');
  const [now, setNow] = useState(new Date());
  const rootRef = useRef(null);
  const tableScrollRef = useRef(null);
  const [tvFit, setTvFit] = useState(null); // null until measured, else { height, fit: bool }
  const [isFullscreen, setIsFullscreen] = useState(false);
  // True while we're in full screen that opening "Due soon" started itself;
  // leaving it (Esc / Back) then also leaves the tracker.
  const autoFsRef = useRef(false);
  const autoFsTriedRef = useRef(false);
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });
  const [mono, setMono] = useState(false); // doesn't persist, per spec
  const [tvPage, setTvPage] = useState(0);
  const [scale, setScale] = useState(() => {
    try {
      const saved = parseFloat(localStorage.getItem(SCALE_KEY));
      return Number.isFinite(saved) ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, saved)) : 1;
    } catch {
      return 1;
    }
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Measures the actual gap above this screen (app header + page padding)
  // instead of hardcoding it, so it stays correct if that chrome's height
  // ever changes. Only clamps to the viewport (no page scroll) on a
  // TV/large-monitor-sized window (or always, once actually in full screen —
  // see toggleFullscreen below, which itself hides that chrome entirely, so
  // getBoundingClientRect().top naturally reads ~0 there); a shorter
  // (laptop) window scrolls normally.
  useLayoutEffect(() => {
    function recalc() {
      if (!rootRef.current) return;
      const vh = window.innerHeight;
      const fsNow = document.fullscreenElement === rootRef.current;
      if (!fsNow && vh < TV_FIT_MIN_HEIGHT) {
        setTvFit({ fit: false, height: null });
        return;
      }
      const rect = rootRef.current.getBoundingClientRect();
      const bottomGap = fsNow ? 0 : 24; // matches .app-main's own bottom padding
      const height = Math.max(480, vh - rect.top - bottomGap);
      // The board is designed for 1920x1080; on a smaller screen everything
      // shrinks in proportion so the table keeps the same layout.
      const k = Math.min(1.6, Math.max(0.55, Math.min(rect.width / 1920, height / 1080)));
      setTvFit({ fit: true, height, k });
    }
    recalc();
    window.addEventListener('resize', recalc);
    document.addEventListener('fullscreenchange', recalc);
    return () => {
      window.removeEventListener('resize', recalc);
      document.removeEventListener('fullscreenchange', recalc);
    };
    // hasLoadedOnce: the section (and rootRef) only exist in the DOM once
    // this flips true, so the initial recalc() above is a no-op until then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedOnce]);

  // Full screen: goes fullscreen on this screen's own root element only, not
  // the whole app — the browser then displays only that element and its
  // descendants, which hides the app's top nav and everything else for
  // free, no extra coordination needed. Esc is handled natively by the
  // browser and also fires 'fullscreenchange', so it's covered here too.
  useEffect(() => {
    function onFsChange() {
      const inFs = document.fullscreenElement === rootRef.current;
      setIsFullscreen(inFs);
      if (!inFs && autoFsRef.current) {
        autoFsRef.current = false;
        onBackRef.current();
      }
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const goBack = () => {
    autoFsRef.current = false;
    if (document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {});
    onBack();
  };

  // Opening "Due soon" goes straight to full screen. The click that opened
  // this screen is still a valid user gesture once the first load finishes;
  // if the browser refuses, the windowed tracker just stays as it is.
  useEffect(() => {
    if (!hasLoadedOnce || autoFsTriedRef.current || !rootRef.current) return;
    autoFsTriedRef.current = true;
    if (document.fullscreenElement || !rootRef.current.requestFullscreen) return;
    autoFsRef.current = true;
    rootRef.current.requestFullscreen().catch(() => {
      autoFsRef.current = false;
    });
  }, [hasLoadedOnce]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      rootRef.current?.requestFullscreen?.();
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(SCALE_KEY, String(scale));
    } catch {
      // Private browsing / storage disabled — the scale just won't persist.
    }
  }, [scale]);

  const decreaseScale = () => setScale((s) => Math.max(SCALE_MIN, +(s - SCALE_STEP).toFixed(2)));
  const increaseScale = () => setScale((s) => Math.min(SCALE_MAX, +(s + SCALE_STEP).toFixed(2)));

  // Auto-scrolls the currently-shown table only when it actually overflows
  // its box — slow, smooth, pauses at each end, then reverses. Only
  // restarts (scrollTop back to 0) when the *selection* changes, not on
  // every data refresh, so a 60s auto-refresh (or Refresh now) never
  // interrupts the scroll or jumps the view — the loop just keeps running
  // and re-measures scrollHeight live each frame, which also means it
  // naturally adapts if a refresh changes the row count.
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return undefined;

    el.scrollTop = 0;
    let cancelled = false;
    let dir = 1; // 1 = scrolling down, -1 = scrolling up
    let pauseUntil = 0;
    let lastTs = null;

    function step(ts) {
      if (cancelled) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 2) {
        // Nothing to scroll right now — keep checking (a refresh can add
        // enough rows to need it later) without moving anything.
        lastTs = ts;
        requestAnimationFrame(step);
        return;
      }
      if (ts < pauseUntil) {
        requestAnimationFrame(step);
        return;
      }
      if (lastTs == null) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      el.scrollTop += dir * AUTO_SCROLL_PX_PER_SEC * dt;

      if (dir === 1 && el.scrollTop >= maxScroll - 1) {
        el.scrollTop = maxScroll;
        dir = -1;
        pauseUntil = ts + AUTO_SCROLL_PAUSE_MS;
      } else if (dir === -1 && el.scrollTop <= 1) {
        el.scrollTop = 0;
        dir = 1;
        pauseUntil = ts + AUTO_SCROLL_PAUSE_MS;
      }
      requestAnimationFrame(step);
    }

    const raf = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [selection]);

  const loadAll = async () => {
    try {
      const nowDate = new Date();
      const month = nowDate.getMonth() + 1;
      const year = nowDate.getFullYear();
      const [dueSoonRes, overdueRes, monthRes] = await Promise.all([
        apiFetch(`${API_BASE}/api/due-soon`),
        apiFetch(`${API_BASE}/api/overdue`),
        apiFetch(`${API_BASE}/api/dues?month=${month}&year=${year}`),
      ]);
      if (!dueSoonRes.ok) throw new Error(await serverErrorMessage(dueSoonRes, 'Failed to fetch due soon'));
      if (!overdueRes.ok) throw new Error(await serverErrorMessage(overdueRes, 'Failed to fetch overdue'));
      if (!monthRes.ok) throw new Error(await serverErrorMessage(monthRes, 'Failed to fetch monthly dues'));

      const [dueSoon, overdue, monthData] = await Promise.all([
        dueSoonRes.json(), overdueRes.json(), monthRes.json(),
      ]);

      setToday(dueSoon.today);
      setTodayDues(dueSoon.dues.filter((d) => d.deadline === dueSoon.today));
      setUpcomingDues(dueSoon.dues.filter((d) => d.deadline !== dueSoon.today));
      setOverdueDues(overdue.dues);
      setCompletedCount(monthData.summary.completed);
      setCompletedDues(monthData.dues.filter((d) => d.status === 'completed'));
      setLastSyncAt(new Date());
      setError(null);
    } catch (err) {
      // Keep showing whatever was last loaded successfully — only surface
      // the failure, don't blank the screen.
      setError(isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message);
    } finally {
      setHasLoadedOnce(true);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    const id = setInterval(loadAll, REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Overdue card + its click-filter: this calendar month only, not all-time.
  const overdueThisMonth = useMemo(() => {
    if (!today) return [];
    const monthPrefix = today.slice(0, 7); // 'YYYY-MM'
    return overdueDues.filter((d) => d.deadline.startsWith(monthPrefix));
  }, [overdueDues, today]);
  // 'YYYY-MM-DD' -> its month abbreviation, e.g. 'Sep'. Falls back to the
  // client's own month before the first successful load.
  const overdueMonthLabel = MONTHS_SHORT[today ? parseInt(today.slice(5, 7), 10) - 1 : new Date().getMonth()];

  // Next 7 days panel: just those 7 days, grouped by date with a count —
  // not the full overdue history this used to include.
  const next7ByDay = useMemo(() => {
    const byDate = new Map();
    upcomingDues.forEach((d) => byDate.set(d.deadline, (byDate.get(d.deadline) || 0) + 1));
    return [...byDate.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [upcomingDues]);
  const maxNext7Count = Math.max(1, ...next7ByDay.map((d) => d.count));

  // Recently completed: this month's completions, most recent first —
  // independent of which card is selected, always visible.
  const recentlyCompleted = useMemo(
    () => [...completedDues].sort((a, b) => (b.completionDate || '').localeCompare(a.completionDate || '')),
    [completedDues]
  );

  // ---- TV board (departure board) derived data — same source data/counts
  // as above, just combined/ordered differently for the single rotating
  // table. No new fetching or calculation, per spec. ----
  const tomorrowIso = useMemo(() => (today ? addIsoDays(today, 1) : null), [today]);
  // The board shows one list at a time, chosen by the KPI cards (default: due today).
  const tvRows = useMemo(() => {
    switch (selection) {
      case 'next7': return [...upcomingDues].sort((a, b) => a.deadline.localeCompare(b.deadline));
      case 'overdue': return [...overdueThisMonth].sort((a, b) => a.deadline.localeCompare(b.deadline));
      case 'completed': return recentlyCompleted;
      default: return todayDues;
    }
  }, [selection, todayDues, upcomingDues, overdueThisMonth, recentlyCompleted]);
  const tvTotalPages = Math.max(1, Math.ceil(tvRows.length / TV_ROWS_PER_PAGE));
  const tvPageStart = tvPage * TV_ROWS_PER_PAGE;
  const tvPageRows = tvRows.slice(tvPageStart, tvPageStart + TV_ROWS_PER_PAGE);
  const tvFillerCount = Math.max(0, TV_ROWS_PER_PAGE - tvPageRows.length);

  // Only the Next 7 days list needs a tag; the other lists are one kind of row.
  function tvRowTag(d) {
    if (selection !== 'next7') return null;
    if (d.deadline === today) return 'TODAY';
    if (d.deadline === tomorrowIso) return 'TOMORROW';
    return null;
  }

  function selectTvCard(key) {
    setSelection(key);
    setTvPage(0);
  }

  // Keeps the current page in range when a refresh changes the row count
  // (e.g. an item gets completed and drops off the board).
  useEffect(() => {
    if (tvPage > tvTotalPages - 1) setTvPage(0);
  }, [tvTotalPages, tvPage]);

  // Page rotation: only while actually shown as a TV board, only while
  // there's more than one page ("If everything fits on 1 page, do not
  // rotate" — the effect itself just doesn't start a timer in that case).
  useEffect(() => {
    if (!tvFit?.fit || tvRows.length === 0 || tvTotalPages <= 1) return undefined;
    const id = setInterval(() => setTvPage((p) => (p + 1) % tvTotalPages), TV_PAGE_ROTATE_MS);
    return () => clearInterval(id);
  }, [tvFit?.fit, tvRows.length, tvTotalPages]);

  // Empty "Due today": show when the next due is, and move on to Next 7
  // days by itself after a few seconds so the board is never left blank.
  const tvNextDue = useMemo(() => {
    const later = upcomingDues.filter((d) => d.deadline > (today || ''));
    if (later.length === 0) return null;
    const first = later.reduce((m, d) => (d.deadline < m ? d.deadline : m), later[0].deadline);
    return { deadline: first, count: later.filter((d) => d.deadline === first).length };
  }, [upcomingDues, today]);
  const autoSwitchPending = selection === 'today' && tvRows.length === 0 && upcomingDues.length > 0;
  useEffect(() => {
    if (!tvFit?.fit || !autoSwitchPending) return undefined;
    const id = setTimeout(() => { setSelection('next7'); setTvPage(0); }, TV_EMPTY_AUTO_SWITCH_MS);
    return () => clearTimeout(id);
  }, [tvFit?.fit, autoSwitchPending]);

  const displayedDues = useMemo(() => {
    switch (selection) {
      case 'next7': return upcomingDues;
      case 'overdue': return overdueThisMonth;
      case 'completed': return completedDues;
      default: return todayDues;
    }
  }, [selection, todayDues, upcomingDues, overdueThisMonth, completedDues]);

  const secondsLeft = lastSyncAt
    ? Math.max(0, Math.ceil(REFRESH_MS / 1000 - (now - lastSyncAt) / 1000))
    : 0;

  if (!hasLoadedOnce) return <div className="state"><p>Loading Live Due Tracker…</p></div>;

  if (tvFit?.fit) {
    return (
      <section
        className={`live-due-tracker is-tv-fit ${mono ? 'is-mono' : ''}`}
        ref={rootRef}
        style={{ height: `${tvFit.height}px`, '--ldt-scale': scale * (tvFit.k || 1) }}
      >
        {error && <div className="tv-sync-error">Last sync failed — {error}</div>}

        <header className="tv-header">
          <div className="tv-header-left">
            <span className="tv-header-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 2h9l5 5v15H6V2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M15 2v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 12h6M9 15h6M9 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="tv-title-block">
              <h1 className="tv-title">Due Soon</h1>
              <div className="tv-subtitle">Patent Hub · Live Due Tracker</div>
            </div>
            <span className="tv-live-pill">
              <span className="tv-live-ring" aria-hidden="true" />
              Live · Auto-sync
            </span>
          </div>

          <div className="tv-header-right">
            <TvClock now={now} />
            <div className="tv-date-block">
              <div className="tv-date">{formatHeaderDate(now).toUpperCase()}</div>
              {lastSyncAt && <div className="tv-synced">Synced {formatSyncedTime(lastSyncAt)}</div>}
            </div>
          </div>
        </header>

        <div className="tv-body">
          <div className="tv-table-card">
            {tvRows.length === 0 ? (
              <div className={`tv-empty-state is-${selection}`}>
                <span className="tv-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" width="100%" height="100%">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M7.5 12.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="tv-empty-title">{(TV_EMPTY_COPY[selection] || TV_EMPTY_COPY.today).title}</div>
                <div className="tv-empty-sub">{(TV_EMPTY_COPY[selection] || TV_EMPTY_COPY.today).sub}</div>
                {selection === 'today' && (
                  tvNextDue ? (
                    <>
                      <div className="tv-empty-next">
                        Next due: <b>{formatDueSoonDate(tvNextDue.deadline, today)}</b> · {tvNextDue.count} {tvNextDue.count === 1 ? 'item' : 'items'}
                      </div>
                      <button type="button" className="tv-empty-btn" onClick={() => selectTvCard('next7')}>View next 7 days →</button>
                      <div className="tv-empty-countdown" aria-hidden="true"><span /></div>
                    </>
                  ) : (
                    <div className="tv-empty-next">Nothing due in the next 7 days either.</div>
                  )
                )}
              </div>
            ) : (
              <>
                <div className="tv-table-head">
                  <span>Due</span><span>Code</span><span>Type</span><span>Title</span><span>Inventor</span><span>Assigned</span><span>Status</span>
                </div>
                <div className="tv-table-body">
                  {tvPageRows.map((d, i) => {
                    const tag = tvRowTag(d);
                    const meta = TV_STATUS_META[d.status] || TV_STATUS_META.pending;
                    return (
                      <div
                        className={`tv-row ${tag === 'TOMORROW' ? 'is-tomorrow' : ''}`}
                        style={{ '--i': i }}
                        key={`${tvPage}|${d.code}|${d.dueType}|${d.deadline}`}
                      >
                        <span className="tv-cell-due">
                          {formatDueSoonDate(d.deadline, today)}
                          {tag && <span className={`tv-tag tv-tag-${tag.toLowerCase()}`}>{tag}</span>}
                        </span>
                        <span className="tv-cell-code">{d.code}</span>
                        <span className="tv-cell-type">{shortDueType(d.dueType) || '—'}</span>
                        <span className="tv-cell-title" title={d.title || ''}>{d.title || '—'}</span>
                        <span className="tv-cell-inventor" title={d.inventorName || ''}>{d.inventorName || '—'}</span>
                        <span className="tv-cell-assigned"><Assignee name={d.assignedTo} /></span>
                        <span className={`tv-cell-status tv-status-${meta.tone}`}>
                          <span className="tv-status-dot" aria-hidden="true" />
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                  {Array.from({ length: tvFillerCount }).map((_, i) => (
                    <div className="tv-row is-filler" key={`filler-${i}`} />
                  ))}
                </div>
                {tvTotalPages > 1 && (
                  <div className="tv-table-footer">
                    <div className="tv-progress-track">
                      <div className="tv-progress-fill" key={tvPage} />
                    </div>
                    <div className="tv-table-footer-row">
                      <span className="tv-showing">
                        SHOWING {tvPageStart + 1}–{Math.min(tvPageStart + TV_ROWS_PER_PAGE, tvRows.length)} OF {tvRows.length}
                      </span>
                      <div className="tv-page-info">
                        <span className="tv-page-label">PAGE {tvPage + 1} / {tvTotalPages}</span>
                        <span className="tv-page-dots">
                          {Array.from({ length: tvTotalPages }).map((_, i) => (
                            <span key={i} className={`tv-page-dot ${i === tvPage ? 'is-active' : ''}`} />
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="tv-side">
            <div className="tv-kpis">
              <button type="button" className={`tv-kpi-card ${selection === 'today' ? 'is-active' : ''}`} aria-pressed={selection === 'today'} onClick={() => selectTvCard('today')}>
                <span className="tv-kpi-label">Due today</span>
                <TvKpiNumber value={todayDues.length} tone="today" />
              </button>
              <button type="button" className={`tv-kpi-card ${selection === 'overdue' ? 'is-active' : ''}`} aria-pressed={selection === 'overdue'} onClick={() => selectTvCard('overdue')}>
                <span className="tv-kpi-label">Overdue ({overdueMonthLabel})</span>
                <TvKpiNumber value={overdueThisMonth.length} tone="overdue" />
              </button>
              <button type="button" className={`tv-kpi-card ${selection === 'next7' ? 'is-active' : ''}`} aria-pressed={selection === 'next7'} onClick={() => selectTvCard('next7')}>
                <span className="tv-kpi-label">Next 7 days</span>
                <TvKpiNumber value={upcomingDues.length} tone="next7" />
              </button>
              <button type="button" className={`tv-kpi-card ${selection === 'completed' ? 'is-active' : ''}`} aria-pressed={selection === 'completed'} onClick={() => selectTvCard('completed')}>
                <span className="tv-kpi-label">Filed this month</span>
                <TvKpiNumber value={completedCount} tone="filed" />
              </button>
            </div>

            <div className="tv-next7-card">
              <div className="tv-next7-head">
                <span>Next 7 days</span>
                <span className="tv-next7-sub">Items due</span>
              </div>
              <div className="tv-next7-rows">
                {next7ByDay.map((d) => (
                  <div className="tv-next7-row" key={d.date}>
                    <span className="tv-next7-label">{formatDayLabel(d.date).toUpperCase()}</span>
                    <TvLedBar count={d.count} busy={d.count >= TV_BUSY_DAY_THRESHOLD} />
                    <span className="tv-next7-count">{d.count}</span>
                  </div>
                ))}
                {next7ByDay.length === 0 && <p className="tv-empty-inline">Nothing in the next 7 days.</p>}
              </div>
            </div>

            <div className="tv-controls">
              <button className="tv-btn tv-btn-wide" onClick={goBack}>← Back to monthly dues</button>
              <button className="tv-btn tv-btn-half" onClick={loadAll}>Refresh now</button>
              <button className="tv-btn tv-btn-quarter" onClick={decreaseScale} disabled={scale <= SCALE_MIN} aria-label="Decrease text size">A−</button>
              <button className="tv-btn tv-btn-quarter" onClick={increaseScale} disabled={scale >= SCALE_MAX} aria-label="Increase text size">A+</button>
              <button className={`tv-btn ${isFullscreen ? 'tv-btn-half' : 'tv-btn-quarter'}`} onClick={onToggleTheme}>{theme === 'light' ? 'Dark' : 'Light'}</button>
              <button className={`tv-btn ${isFullscreen ? 'tv-btn-half' : 'tv-btn-quarter'}`} onClick={() => setMono((m) => !m)}>{mono ? 'Colour' : 'Mono'}</button>
              {!isFullscreen && (
                <button className="tv-btn tv-btn-half" onClick={toggleFullscreen}>Full screen</button>
              )}
            </div>
          </div>
        </div>

        <div className="tv-ticker">
          <div className="tv-ticker-label">Filed this month ▸</div>
          <div className="tv-ticker-viewport">
            {recentlyCompleted.length === 0 ? (
              <span className="tv-ticker-static">NO ITEMS FILED YET THIS MONTH</span>
            ) : (
              <div
                className="tv-ticker-track"
                style={{ animationDuration: `${Math.max(60, recentlyCompleted.length * TV_TICKER_SECONDS_PER_ITEM)}s` }}
              >
                {[...recentlyCompleted, ...recentlyCompleted].map((d, i) => (
                  <span className="tv-ticker-item" key={i}>
                    <strong>{d.code}</strong> {shortDueType(d.dueType)}
                    <span className="tv-ticker-sep" aria-hidden="true" />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

      </section>
    );
  }

  return (
    <section
      className={`live-due-tracker ${mono ? 'is-mono' : ''}`}
      ref={rootRef}
      style={{ '--ldt-scale': scale }}
    >
      <header className="ldt-header">
        <div className="ldt-header-left">
          <Brand />
          <span className="ldt-page-name">Live Due Tracker</span>
        </div>

        <div className="ldt-header-right">
          <div className="ldt-header-clock">
            <div className="ldt-clock">{formatClock(now)}</div>
            <div className="ldt-date">
              {formatHeaderDate(now)}
              {lastSyncAt && ` · Synced ${formatSyncedTime(lastSyncAt)}`}
            </div>
          </div>

          {!isFullscreen && (
            <button className="ldt-btn" onClick={onBack}>← Back to monthly dues</button>
          )}
          <button
            className="ldt-btn ldt-btn-lg"
            onClick={toggleFullscreen}
            disabled={!document.fullscreenEnabled}
            title={document.fullscreenEnabled ? undefined : 'Full screen isn’t available in this browser'}
          >
            {isFullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
        </div>
      </header>

      {error && <p className="ldt-sync-error">Last sync failed — {error}</p>}

      <div className="ldt-cards">
        {Object.keys(CARD_TITLES).map((key) => {
          const value = key === 'today' ? todayDues.length
            : key === 'next7' ? upcomingDues.length
            : key === 'overdue' ? overdueThisMonth.length
            : completedCount;
          const label = key === 'overdue' ? `Overdue (${overdueMonthLabel})` : CARD_TITLES[key];
          return (
            <button
              key={key}
              type="button"
              className={`ldt-card ldt-card-${key} ${selection === key ? 'is-active' : ''}`}
              onClick={() => setSelection(key)}
            >
              <span className="ldt-card-label">{label}</span>
              <strong className="ldt-card-value">{value}</strong>
            </button>
          );
        })}
      </div>

      <div className="ldt-body">
        <div className="ldt-table-panel">
          <div className="ldt-panel-head">
            <h3 style={{ color: `var(--ldt-${selection})` }}>{CARD_TITLES[selection]}</h3>
            <span className="ldt-count">{displayedDues.length} item{displayedDues.length === 1 ? '' : 's'}</span>
          </div>

          <div className="ldt-grid" ref={tableScrollRef}>
            <div className="ldt-grid-row is-header">
              <div>Code</div>
              <div>Title</div>
              <div>Inventor</div>
              <div>Status</div>
              <div>Type</div>
              <div>Assigned</div>
            </div>
            {displayedDues.map((d) => (
              <div className="ldt-grid-row is-data" key={`${d.code}|${d.dueType}|${d.deadline}`}>
                <div className="ldt-cell-code">
                  <button className="link-btn" onClick={() => onSelectDue(d)}>{d.code}</button>
                </div>
                <div className="ldt-cell-title"><span className="ldt-clamp2">{d.title || '—'}</span></div>
                <div className="ldt-cell-inventor"><span className="ldt-inventor-full">{d.inventorName || '—'}</span></div>
                <div className="ldt-cell-status">{d.manual?.status_notes || '—'}</div>
                <div className="ldt-cell-type">{shortDueType(d.dueType) || '—'}</div>
                <div className="ldt-cell-assigned"><Assignee name={d.assignedTo} /></div>
              </div>
            ))}
            {displayedDues.length === 0 && <p className="ldt-empty">Nothing here.</p>}
          </div>
        </div>

        <div className="ldt-right-col">
          <div className="ldt-next7-panel">
            <h3>Next 7 days</h3>
            <div className="ldt-next7-rows">
              {next7ByDay.map((d) => (
                <div className="ldt-next7-row" key={d.date}>
                  <span className="ldt-next7-label">{formatDayLabel(d.date)}</span>
                  <span className="ldt-bar-track">
                    <span className="ldt-bar-fill" style={{ width: `${(d.count / maxNext7Count) * 100}%` }} />
                  </span>
                  <span className="ldt-next7-count">{d.count}</span>
                </div>
              ))}
              {next7ByDay.length === 0 && <p className="ldt-empty">Nothing in the next 7 days.</p>}
            </div>
          </div>

          <div className="ldt-recent-panel">
            <h3>Recently completed <span className="ldt-recent-suffix">· this month</span></h3>
            <div className="ldt-recent-scroll">
              {recentlyCompleted.map((d) => (
                <div className="ldt-recent-row" key={`${d.code}|${d.dueType}|${d.deadline}`}>
                  <div className="ldt-recent-left">
                    <CheckIcon />
                    <span className="ldt-recent-code">{d.code}</span>
                    <span className="ldt-recent-type">{shortDueType(d.dueType)}</span>
                  </div>
                  <Assignee name={d.assignedTo} />
                </div>
              ))}
              {recentlyCompleted.length === 0 && <p className="ldt-empty">Nothing completed yet this month.</p>}
            </div>
          </div>
        </div>
      </div>

      <footer className="ldt-footer">
        <div className="ldt-footer-left">
          <span className="ldt-live-dot" aria-hidden="true" />
          Refreshes in {secondsLeft}s
        </div>
        <div className="ldt-footer-actions">
          <button className="ldt-btn" onClick={loadAll}>Refresh now</button>
          <button className="ldt-btn" onClick={decreaseScale} disabled={scale <= SCALE_MIN} aria-label="Decrease text size">A−</button>
          <button className="ldt-btn" onClick={increaseScale} disabled={scale >= SCALE_MAX} aria-label="Increase text size">A+</button>
          <button className="ldt-btn" onClick={onToggleTheme}>{theme === 'light' ? 'Dark' : 'Light'}</button>
          <button className="ldt-btn" onClick={() => setMono((m) => !m)}>{mono ? 'Colour' : 'Mono'}</button>
        </div>
      </footer>
    </section>
  );
}

export default LiveDueTracker;
