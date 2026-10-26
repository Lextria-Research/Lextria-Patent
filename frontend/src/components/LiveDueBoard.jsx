// frontend/src/components/LiveDueBoard.jsx
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Clock, ArrowLeft, Maximize2, Minimize2, AlertCircle, CheckCircle,
  Calendar, RefreshCw, Volume2, VolumeX, Eye, User
} from 'lucide-react';

const TV_ROWS_PER_PAGE = 7;
const TV_PAGE_ROTATE_MS = 12000;
const TV_COUNT_UP_MS = 900;
const TV_BUSY_DAY_THRESHOLD = 6;

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad2 = (n) => String(n).padStart(2, '0');

function formatClock(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatHeaderDate(d) {
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// Split-flap tile
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

// Split-flap digital clock
function TvClock({ now }) {
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());

  return (
    <div className="tv-clock" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      <TvFlapDigit ch={hh[0]} size="clock" />
      <TvFlapDigit ch={hh[1]} size="clock" />
      <span className="tv-clock-colon" style={{ fontSize: '28px', color: 'var(--tv-flap-digit)', margin: '0 2px' }}>:</span>
      <TvFlapDigit ch={mm[0]} size="clock" />
      <TvFlapDigit ch={mm[1]} size="clock" />
      <span className="tv-clock-colon" style={{ fontSize: '28px', color: 'var(--tv-flap-digit)', margin: '0 2px' }}>:</span>
      <TvFlapDigit ch={ss[0]} size="clock" />
      <TvFlapDigit ch={ss[1]} size="clock" />
    </div>
  );
}

// Split-flap animated KPI counter
function TvKpiNumber({ value, tone }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (value <= 0) {
      setShown(0);
      return undefined;
    }
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
    <div className={`tv-kpi-number is-${tone}`} style={{ display: 'inline-flex', gap: '3px' }}>
      {str.split('').map((ch, i) => (
        <TvFlapDigit key={i} ch={ch} size="kpi" />
      ))}
    </div>
  );
}

export default function LiveDueBoard({ records = [], onBack, onSelectRecord }) {
  const [now, setNow] = useState(new Date());
  const [selection, setSelection] = useState('next7'); // today, next7, overdue, completed
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tvPage, setTvPage] = useState(0);
  const [mono, setMono] = useState(false);
  const [scale, setScale] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const rootRef = useRef(null);

  // Clock interval
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Parse all statutory deadlines across records
  const { todayDues, next7Dues, overdueDues, completedDues, next7DaysMap } = useMemo(() => {
    const todayStr = now.toISOString().split('T')[0];
    const tDues = [];
    const n7Dues = [];
    const oDues = [];
    const cDues = [];

    // Next 7 days map initialization
    const dayMap = {};
    for (let i = 0; i < 7; i++) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() + i);
      const iso = dt.toISOString().split('T')[0];
      dayMap[iso] = [];
    }

    records.forEach((r) => {
      const milestones = [
        { type: 'CS', label: 'Complete Specification', date: r.cs_deadline, filed: r.cs_filing_date, ref: 'Sec 9(1)' },
        { type: 'FER Reply', label: 'FER Response', date: r.fer_reply_deadline, filed: r.fer_reply_filing_date, ref: 'Sec 21(1)' },
        { type: 'Hearing WS', label: 'Hearing Submissions', date: r.ws_deadline, filed: r.ws_filing_date, ref: 'Rule 28(7)' },
        { type: 'Form 1', label: 'Proof of Right (POR)', date: r.form_1_deadline, filed: r.form_1_filing_date, ref: 'Rule 10' },
        { type: 'Form 26', label: 'Power of Attorney (POA)', date: r.form_26_deadline, filed: r.form_26_filing_date, ref: 'Rule 135' },
        { type: 'Annuity', label: 'Patent Renewal', date: r.next_renewal_date, filed: null, ref: 'Sec 142' },
      ];

      milestones.forEach((m) => {
        if (!m.date) return;
        const item = {
          code: r.project_code,
          appNo: r.application_number || '—',
          title: r.title || 'Untitled Matter',
          applicant: r.applicant_name || 'MANIPAL ACADEMY OF HIGHER EDUCATION',
          drafter: r.assigned_to || 'Unassigned',
          dueType: m.type,
          dueLabel: m.label,
          statutoryRef: m.ref,
          deadline: m.date,
          status: m.filed ? 'completed' : (m.date < todayStr ? 'overdue' : (m.date === todayStr ? 'today' : 'upcoming')),
          record: r,
        };

        if (m.filed) {
          cDues.push(item);
        } else if (m.date === todayStr) {
          tDues.push(item);
        } else if (m.date < todayStr && !r.is_abandoned) {
          oDues.push(item);
        } else {
          const diffDays = Math.round((new Date(m.date) - now) / 86400000);
          if (diffDays > 0 && diffDays <= 7 && !r.is_abandoned) {
            n7Dues.push(item);
            if (dayMap[m.date]) {
              dayMap[m.date].push(item);
            }
          }
        }
      });
    });

    // Sort by deadline ascending
    tDues.sort((a, b) => a.code.localeCompare(b.code));
    n7Dues.sort((a, b) => a.deadline.localeCompare(b.deadline));
    oDues.sort((a, b) => a.deadline.localeCompare(b.deadline));
    cDues.sort((a, b) => (b.deadline || '').localeCompare(a.deadline || ''));

    return {
      todayDues: tDues,
      next7Dues: n7Dues,
      overdueDues: oDues,
      completedDues: cDues,
      next7DaysMap: dayMap,
    };
  }, [records, now]);

  // Current active list
  const activeItems = useMemo(() => {
    if (selection === 'today') return todayDues;
    if (selection === 'overdue') return overdueDues;
    if (selection === 'next7') return next7Dues;
    return completedDues;
  }, [selection, todayDues, overdueDues, next7Dues, completedDues]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(activeItems.length / TV_ROWS_PER_PAGE));
  const currentPageItems = useMemo(() => {
    const start = tvPage * TV_ROWS_PER_PAGE;
    return activeItems.slice(start, start + TV_ROWS_PER_PAGE);
  }, [activeItems, tvPage]);

  // 12-second page auto-rotation
  useEffect(() => {
    if (totalPages <= 1) {
      setTvPage(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setTvPage((prev) => (prev + 1) % totalPages);
    }, TV_PAGE_ROTATE_MS);
    return () => clearInterval(timer);
  }, [totalPages]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (rootRef.current && rootRef.current.requestFullscreen) {
        rootRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`live-due-board ${mono ? 'is-mono' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0E0D0C',
        color: '#F6F1EA',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, sans-serif",
        overflow: 'hidden',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
      }}
    >
      {/* Top Header Flight/Departure Board Banner */}
      <header
        style={{
          padding: '14px 28px',
          background: 'linear-gradient(180deg, #1A1816 0%, #131210 100%)',
          borderBottom: '1px solid #2B2724',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        {/* Left: Back button & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: '#262320',
                border: '1px solid #3D3833',
                color: '#F6F1EA',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <ArrowLeft size={14} /> Exit TV Mode
            </button>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  background: '#C98A2C',
                  color: '#000',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 900,
                  fontSize: '11px',
                  letterSpacing: '1px',
                }}
              >
                IPO DOCKETING RADAR
              </span>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: '#F6F1EA' }}>
                LEXTRIA IP · OPERATIONS TV DEPARTURE BOARD
              </h1>
            </div>
            <div style={{ fontSize: '11px', color: '#9E948A', marginTop: '2px', fontWeight: 600 }}>
              {formatHeaderDate(now)} · {records.length} Total Patent Matters Tracked · Section 9, 21 & Rules 10, 24B, 135
            </div>
          </div>
        </div>

        {/* Center: Split-flap digital clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TvClock now={now} />
        </div>

        {/* Right Controls: Fullscreen, Mono toggle, Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMono(!mono)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #3D3833',
              background: mono ? '#C98A2C' : '#262320',
              color: mono ? '#000' : '#F6F1EA',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {mono ? 'Mono' : 'Colour'}
          </button>

          <button
            onClick={() => setScale((s) => (s >= 1.2 ? 0.9 : s + 0.1))}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #3D3833',
              background: '#262320',
              color: '#F6F1EA',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Adjust display scaling"
          >
            Scale: {Math.round(scale * 100)}%
          </button>

          <button
            onClick={toggleFullscreen}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #3D3833',
              background: '#262320',
              color: '#F6F1EA',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {isFullscreen ? 'Windowed' : 'Fullscreen'}
          </button>
        </div>
      </header>

      {/* KPI Tiles Ribbon (Airport Departure Style) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          padding: '16px 28px',
          background: '#131210',
          borderBottom: '1px solid #2B2724',
          flexShrink: 0,
        }}
      >
        {/* Card 1: Due Today */}
        <div
          onClick={() => { setSelection('today'); setTvPage(0); }}
          style={{
            background: selection === 'today' ? '#211E1A' : '#171614',
            border: `2px solid ${selection === 'today' ? '#C98A2C' : '#2B2724'}`,
            borderRadius: '8px',
            padding: '14px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#9E948A' }}>
              Due Today
            </div>
            <div style={{ fontSize: '12px', color: '#6E665E', marginTop: '2px' }}>
              Immediate Filing Required
            </div>
          </div>
          <TvKpiNumber value={todayDues.length} tone="today" />
        </div>

        {/* Card 2: Next 7 Days */}
        <div
          onClick={() => { setSelection('next7'); setTvPage(0); }}
          style={{
            background: selection === 'next7' ? '#211E1A' : '#171614',
            border: `2px solid ${selection === 'next7' ? '#3B82F6' : '#2B2724'}`,
            borderRadius: '8px',
            padding: '14px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#9E948A' }}>
              Next 7 Days
            </div>
            <div style={{ fontSize: '12px', color: '#6E665E', marginTop: '2px' }}>
              Critical Radar Window
            </div>
          </div>
          <TvKpiNumber value={next7Dues.length} tone="next7" />
        </div>

        {/* Card 3: Overdue */}
        <div
          onClick={() => { setSelection('overdue'); setTvPage(0); }}
          style={{
            background: selection === 'overdue' ? '#211E1A' : '#171614',
            border: `2px solid ${selection === 'overdue' ? '#DC2626' : '#2B2724'}`,
            borderRadius: '8px',
            padding: '14px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#EF4444' }}>
              Overdue / Bottleneck
            </div>
            <div style={{ fontSize: '12px', color: '#991B1B', marginTop: '2px' }}>
              Urgent Section 9/21 Action
            </div>
          </div>
          <TvKpiNumber value={overdueDues.length} tone="overdue" />
        </div>

        {/* Card 4: Completed This Month */}
        <div
          onClick={() => { setSelection('completed'); setTvPage(0); }}
          style={{
            background: selection === 'completed' ? '#211E1A' : '#171614',
            border: `2px solid ${selection === 'completed' ? '#10B981' : '#2B2724'}`,
            borderRadius: '8px',
            padding: '14px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#10B981' }}>
              Completed / Filed
            </div>
            <div style={{ fontSize: '12px', color: '#065F46', marginTop: '2px' }}>
              Statutory Compliance Met
            </div>
          </div>
          <TvKpiNumber value={completedDues.length} tone="filed" />
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Side: Departure Table with Auto-Paging */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #2B2724',
            background: '#0E0D0C',
            overflow: 'hidden',
          }}
        >
          {/* Category Bar & Page Indicator */}
          <div
            style={{
              padding: '10px 24px',
              background: '#161513',
              borderBottom: '1px solid #2B2724',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: selection === 'overdue' ? '#DC2626' : (selection === 'today' ? '#C98A2C' : '#3B82F6'),
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {selection === 'today' && 'Matters Due Today'}
                {selection === 'next7' && 'Matters Due in Next 7 Days'}
                {selection === 'overdue' && 'Overdue Statutory Milestones'}
                {selection === 'completed' && 'Recently Filed / Completed Matters'}
              </span>
              <span style={{ fontSize: '12px', color: '#9E948A', fontWeight: 600 }}>
                ({activeItems.length} total)
              </span>
            </div>

            {/* Paging status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9E948A' }}>
              <span>Page {tvPage + 1} of {totalPages}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setTvPage(idx)}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: tvPage === idx ? '#C98A2C' : '#3D3833',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 140px 1fr 140px 130px 140px 70px',
              padding: '10px 24px',
              background: '#12110F',
              borderBottom: '1px solid #2B2724',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: '#8A8279',
            }}
          >
            <div>Project Code</div>
            <div>Application No.</div>
            <div>Invention Title</div>
            <div>Milestone Type</div>
            <div>Statutory Ref</div>
            <div>Due Date</div>
            <div>Action</div>
          </div>

          {/* Table Body (Split-flap departure style rows) */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {currentPageItems.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8A8279' }}>
                <CheckCircle size={42} color="#10B981" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#F6F1EA' }}>All Clear for This Category</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>No active patent deadlines found in this bucket.</div>
              </div>
            ) : (
              currentPageItems.map((item, idx) => {
                const isOverdue = item.status === 'overdue';
                const isToday = item.status === 'today';

                return (
                  <div
                    key={`${item.code}_${item.dueType}_${idx}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 140px 1fr 140px 130px 140px 70px',
                      padding: '12px 24px',
                      alignItems: 'center',
                      borderBottom: '1px solid #201D1A',
                      background: idx % 2 === 0 ? '#11100E' : '#141311',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Code */}
                    <div style={{ fontWeight: 900, color: '#C98A2C', letterSpacing: '-0.2px', fontSize: '13px' }}>
                      {item.code}
                    </div>

                    {/* App No */}
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#C4BCB3' }}>
                      {item.appNo}
                    </div>

                    {/* Title & Drafter */}
                    <div style={{ overflow: 'hidden', paddingRight: '12px' }}>
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: '#F6F1EA',
                        }}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8A8279', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <User size={11} /> {item.drafter}
                      </div>
                    </div>

                    {/* Milestone Type */}
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: item.dueType === 'CS' ? 'rgba(239, 68, 68, 0.15)' : (item.dueType === 'FER Reply' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                          color: item.dueType === 'CS' ? '#EF4444' : (item.dueType === 'FER Reply' ? '#F59E0B' : '#3B82F6'),
                        }}
                      >
                        {item.dueType}
                      </span>
                    </div>

                    {/* Statutory Ref */}
                    <div style={{ fontSize: '11px', color: '#9E948A', fontWeight: 600 }}>
                      {item.statutoryRef}
                    </div>

                    {/* Deadline */}
                    <div style={{ fontWeight: 800, fontSize: '12px', color: isOverdue ? '#EF4444' : (isToday ? '#C98A2C' : '#F6F1EA') }}>
                      {item.deadline}
                      {isOverdue && (
                        <span style={{ fontSize: '10px', color: '#EF4444', display: 'block', fontWeight: 700 }}>
                          OVERDUE
                        </span>
                      )}
                      {isToday && (
                        <span style={{ fontSize: '10px', color: '#C98A2C', display: 'block', fontWeight: 700 }}>
                          TODAY
                        </span>
                      )}
                    </div>

                    {/* View Button */}
                    <div>
                      <button
                        onClick={() => onSelectRecord && onSelectRecord(item.record)}
                        style={{
                          background: '#262320',
                          border: '1px solid #3D3833',
                          color: '#F6F1EA',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="View Application Details"
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Next 7 Days Breakdown & Statutory Rules Reference */}
        <div
          style={{
            width: '380px',
            background: '#12110F',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid #2B2724',
              background: '#181614',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Calendar size={15} color="#C98A2C" />
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Next 7 Days Breakdown
            </span>
          </div>

          {/* 7-Day Day-by-Day List */}
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.keys(next7DaysMap).map((dateKey) => {
              const duesOnDate = next7DaysMap[dateKey] || [];
              const dt = new Date(dateKey);
              const dayName = WEEKDAYS_SHORT[dt.getDay()];
              const dayNum = dt.getDate();
              const isToday = dateKey === now.toISOString().split('T')[0];
              const isBusy = duesOnDate.length >= TV_BUSY_DAY_THRESHOLD;

              return (
                <div
                  key={dateKey}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: isToday ? 'rgba(201, 138, 44, 0.15)' : '#1A1816',
                    border: `1px solid ${isToday ? '#C98A2C' : '#2B2724'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: isToday ? '#C98A2C' : '#8A8279',
                      }}
                    >
                      {dayName} {dayNum}
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#F6F1EA' }}>
                        {dateKey}
                      </span>
                      {isToday && (
                        <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 800, color: '#C98A2C' }}>
                          TODAY
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: duesOnDate.length > 0 ? (isBusy ? '#EF4444' : '#2563EB') : '#262320',
                        color: duesOnDate.length > 0 ? '#fff' : '#8A8279',
                      }}
                    >
                      {duesOnDate.length} dues
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Statutory Rule Legend & Guidelines */}
          <div style={{ padding: '16px 18px', borderTop: '1px solid #2B2724', marginTop: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#8A8279', marginBottom: '8px' }}>
              Statutory Benchmark Limits
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#9E948A' }}>
              <div>• <strong>Complete Spec (CS)</strong>: 12 months from PS (Sec 9(1))</div>
              <div>• <strong>Sec 17 Post-Dating</strong>: Max 6 months (180 days)</div>
              <div>• <strong>Form 1 (POR)</strong>: 6 months from filing (Rule 10)</div>
              <div>• <strong>Form 26 (POA)</strong>: 3 months from filing (Rule 135)</div>
              <div>• <strong>FER Response</strong>: 6 months from notice (Sec 21(1))</div>
              <div>• <strong>Hearing WS</strong>: 15 days from hearing (Rule 28(7))</div>
              <div>• <strong>RFE (Form 18)</strong>: 31m (post 2024-03-15) / 48m</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
