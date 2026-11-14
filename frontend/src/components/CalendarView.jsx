// frontend/src/components/CalendarView.jsx
import React, { useState, useMemo } from 'react';
import { addDays, addMonths, getUpcomingInventorUpdateCycle } from '../utils/statutoryDeadlines';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download,
  Share2, Clock, Filter, AlertTriangle, CheckCircle2, Shield,
  ExternalLink, User
} from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarView({
  records = [],
  allRecords = [],
  currentUser,
  onOpenDrawer,
  onOpenTimeline,
  onNavigateToDeadlines,
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [urgencyFilter, setUrgencyFilter] = useState('ALL'); // ALL, OVERDUE, DUE_2, DUE_7, ON_TRACK
  const [selectedDayDeadlines, setSelectedDayDeadlines] = useState(null);
  const [selectedDrafter, setSelectedDrafter] = useState('ALL');

  const isDrafterUser = ['PATENT_DRAFTER', 'DRAFTER'].includes(currentUser?.role);
  const isDrafterAdminUser = ['PATENT_DRAFTER_ADMIN', 'DRAFTER_ADMIN'].includes(currentUser?.role);

  const availableDrafters = useMemo(() => {
    const src = allRecords && allRecords.length > 0 ? allRecords : records;
    const set = new Set();
    src.forEach((r) => {
      if (r?.assigned_to && !['not assigned', 'unassigned', 'none', '-'].includes(r.assigned_to.toLowerCase())) {
        set.add(r.assigned_to.trim());
      }
    });
    return Array.from(set).sort();
  }, [allRecords, records]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Prev / Next month navigators
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const calendarRecords = useMemo(() => {
    if ((isDrafterAdminUser || currentUser?.role === 'SUPER_ADMIN') && selectedDrafter !== 'ALL') {
      return records.filter(
        (r) => r.assigned_to && r.assigned_to.trim().toLowerCase() === selectedDrafter.toLowerCase()
      );
    }
    return records;
  }, [records, isDrafterAdminUser, currentUser, selectedDrafter]);

  // Aggregate all events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = {};

    calendarRecords.forEach((r) => {
      const addEvent = (dateStr, type, typeLabel, color) => {
        if (!dateStr) return;
        const key = dateStr.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push({
          project_code: r.project_code,
          application_number: r.application_number,
          title: r.title,
          assigned_to: r.assigned_to,
          type,
          typeLabel,
          color,
          record: r,
        });
      };

      // IPO Statutory Deadline (CS Due)
      if (r.cs_deadline && !r.cs_filing_date) {
        addEvent(r.cs_deadline, 'CS', 'CS Due', '#EF4444');
      }
      // IPO Statutory Deadline (PS Due)
      if (r.ps_deadline && !r.ps_filing_date) {
        addEvent(r.ps_deadline, 'PS', 'PS Due', '#3B82F6');
      }
      // Client Delivery Date (Equal Visual Prominence)
      if ((r.client_commitment_date || r.client_delivery_date) && !r.is_abandoned) {
        addEvent(r.client_commitment_date || r.client_delivery_date, 'COMMITMENT', 'Client Delivery', '#EA580C');
      }
      // Client Meeting (Equal Visual Prominence)
      if (r.client_meeting_date && !r.is_abandoned) {
        addEvent(r.client_meeting_date, 'MEETING', 'Client Meeting', '#059669');
      }
      // Internal Deadline (Equal Visual Prominence)
      if (r.internal_deadline && !r.is_abandoned) {
        addEvent(r.internal_deadline, 'INTERNAL', 'Internal Deadline', '#8B5CF6');
      }
      // External Deadline (Equal Visual Prominence)
      if (r.external_deadline && !r.is_abandoned) {
        addEvent(r.external_deadline, 'EXTERNAL', 'External Deadline', '#D97706');
      }
      // FER Reply Deadline
      if (r.fer_reply_deadline && !r.fer_reply_filing_date) {
        addEvent(r.fer_reply_deadline, 'FER', 'FER Reply Due', '#F59E0B');
      }
      // Hearing Written Submissions
      if (r.ws_deadline && !r.ws_filing_date) {
        addEvent(r.ws_deadline, 'WS', 'Hearing WS Due', '#6366F1');
      }
      // Form-30 Hearing Interest
      if (r.form_30_deadline && r.form_30_status !== 'Filed') {
        addEvent(r.form_30_deadline, 'F30', 'Form-30 Due', '#DC2626');
      }
      // Form 1
      if (r.form_1_deadline && r.f1_status !== 'Within Deadline') {
        addEvent(r.form_1_deadline, 'F1', 'Form 1 Due', '#2563EB');
      }
      // Form 26
      if (r.form_26_deadline && r.f26_status !== 'Within Deadline') {
        addEvent(r.form_26_deadline, 'F26', 'Form 26 Due', '#06B6D4');
      }
      // Renewal Annuity
      if (r.next_renewal_date) {
        addEvent(r.next_renewal_date, 'ANNUITY', 'Annuity Due', '#10B981');
      }

      // 3-Day Filing Acknowledgment to Inventor
      const statusLower = (r.current_status || '').toLowerCase();
      if (statusLower.includes('sent for filing') && !r.is_abandoned && !r.ack_sent_to_inventor_date) {
        const ackDate = r.filing_ack_deadline || (r.sent_for_filing_date ? addDays(r.sent_for_filing_date, 3) : addDays(r.status_updated_at || r.updated_at || new Date(), 3));
        addEvent(ackDate, 'INVENTOR_ACK', '3-Day Filing Ack Due', '#D97706');
      }

      // 6-Day FER Reply Draft Confirmation to Inventor
      if ((statusLower.includes('fer received') || (r.fer_notice_date && !statusLower.includes('reply filed') && !statusLower.includes('hearing'))) && !r.is_abandoned && !r.fer_draft_sent_date) {
        const ferRefDate = r.fer_notice_date || r.status_updated_at || r.updated_at || new Date();
        const confirmDate = r.fer_draft_confirmation_deadline || addDays(ferRefDate, 6);
        addEvent(confirmDate, 'FER_CONFIRM', '6-Day FER Draft Due', '#EA580C');
      }
    });

    return map;
  }, [calendarRecords]);

  // Upcoming events within the next 30 days for sidebar (with equal prominence)
  const upcomingEvents = useMemo(() => {
    const list = [];
    const now = new Date();
    const future30 = new Date(now.getTime() + 30 * 86400000);

    calendarRecords.forEach((r) => {
      if (r.is_abandoned) return;
      const checkAndAdd = (dateStr, type, typeLabel, color) => {
        if (!dateStr) return;
        const d = new Date(dateStr);
        if (d >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5) && d <= future30) {
          const diffDays = Math.round((d - now) / 86400000);
          list.push({
            project_code: r.project_code,
            title: r.title,
            type,
            typeLabel,
            color,
            dateStr,
            dateObj: d,
            diffDays,
            record: r,
          });
        }
      };

      if (r.client_commitment_date || r.client_delivery_date) {
        checkAndAdd(r.client_commitment_date || r.client_delivery_date, 'COMMITMENT', 'Client Delivery', '#EA580C');
      }
      if (r.cs_deadline && !r.cs_filing_date) {
        checkAndAdd(r.cs_deadline, 'CS', 'CS Due', '#EF4444');
      }
      if (r.ps_deadline && !r.ps_filing_date) {
        checkAndAdd(r.ps_deadline, 'PS', 'PS Due', '#3B82F6');
      }
      if (r.client_meeting_date) {
        checkAndAdd(r.client_meeting_date, 'MEETING', 'Client Meeting', '#059669');
      }
      if (r.internal_deadline) {
        checkAndAdd(r.internal_deadline, 'INTERNAL', 'Internal Deadline', '#8B5CF6');
      }
      if (r.external_deadline) {
        checkAndAdd(r.external_deadline, 'EXTERNAL', 'External Deadline', '#D97706');
      }
      if (r.fer_reply_deadline && !r.fer_reply_filing_date) {
        checkAndAdd(r.fer_reply_deadline, 'FER', 'FER Reply Due', '#F59E0B');
      }
      if (r.ws_deadline && !r.ws_filing_date) {
        checkAndAdd(r.ws_deadline, 'WS', 'Hearing WS Due', '#6366F1');
      }
      if (r.form_30_deadline && r.form_30_status !== 'Filed') {
        checkAndAdd(r.form_30_deadline, 'F30', 'Form-30 Due', '#DC2626');
      }
    });

    list.sort((a, b) => a.dateObj - b.dateObj);
    return list;
  }, [calendarRecords]);

  // Calendar grid computation
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Export iCal (.ics) for Zoho Calendar subscription
  const handleExportIcs = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Lextria Research//Patent Prosecution Dashboard//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Lextria Patent Statutory Deadlines',
    ];

    Object.entries(eventsByDate).forEach(([dateStr, items]) => {
      items.forEach((item, idx) => {
        const uid = `${item.project_code}-${item.type}-${dateStr}-${idx}@lextria.in`;
        const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const dateClean = dateStr.replace(/-/g, '');

        icsContent.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtStamp}`,
          `DTSTART;VALUE=DATE:${dateClean}`,
          `SUMMARY:[${item.project_code}] ${item.typeLabel} - ${item.title.slice(0, 50)}`,
          `DESCRIPTION:Statutory Patent Deadline for ${item.project_code}. Drafter: ${item.assigned_to || 'Unassigned'}. App #: ${item.application_number || 'Pending'}`,
          `STATUS:CONFIRMED`,
          'BEGIN:VALARM',
          'TRIGGER:-P3D',
          'ACTION:DISPLAY',
          `DESCRIPTION:Reminder: 3 days until ${item.typeLabel} for ${item.project_code}`,
          'END:VALARM',
          'END:VEVENT'
        );
      });
    });

    icsContent.push('END:VCALENDAR');
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lextria_Patent_Deadlines_${year}_${month + 1}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--line)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Calendar Header with Urgency Chips & Export (Matching Reference UI Design Page 3) */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={18} color="var(--accent)" />
            <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--ink)' }}>
              {MONTH_NAMES[month]} {year}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={prevMonth}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={goToday}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Filter Pills Matching Reference UI Design Page 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'OVERDUE', label: 'Overdue' },
              { id: 'DUE_2', label: '≤ 2 days' },
              { id: 'DUE_7', label: '≤ 7 days' },
              { id: 'ON_TRACK', label: 'On track' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setUrgencyFilter(chip.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '14px',
                  border: urgencyFilter === chip.id ? '1.5px solid #2563EB' : '1px solid var(--line)',
                  background: urgencyFilter === chip.id ? 'rgba(37, 99, 235, 0.1)' : 'var(--page)',
                  color: urgencyFilter === chip.id ? '#2563EB' : 'var(--muted)',
                  fontSize: '11px',
                  fontWeight: urgencyFilter === chip.id ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Drafter Filter / Group Selector (Drafter Admin & Super Admin) */}
          {(isDrafterAdminUser || currentUser?.role === 'SUPER_ADMIN') && (
            <select
              value={selectedDrafter}
              onChange={(e) => setSelectedDrafter(e.target.value)}
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                border: selectedDrafter !== 'ALL' ? '1.5px solid #7C3AED' : '1px solid var(--line)',
                background: selectedDrafter !== 'ALL' ? 'rgba(124, 58, 237, 0.1)' : 'var(--page)',
                color: selectedDrafter !== 'ALL' ? '#7C3AED' : 'var(--ink)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
              title="Filter / Group by Drafter"
            >
              <option value="ALL">All Drafters (Grouped)</option>
              {availableDrafters.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Zoho Calendar Integration Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExportIcs}
            style={{
              padding: '7px 14px',
              borderRadius: '7px',
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
            }}
            title="Download .ics subscription file to sync with Zoho Calendar, Outlook or Google Calendar"
          >
            <Download size={14} /> Export to Zoho Calendar (.ics)
          </button>
        </div>
      </div>

      {/* Main Calendar Body: Left Grid + Right Sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Column: Calendar Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--line)' }}>
          {/* Weekday Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid var(--line)',
              background: 'var(--page)',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '11px',
              color: 'var(--muted)',
              padding: '8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          {/* Calendar Month Grid */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridAutoRows: '1fr',
              overflowY: 'auto',
              background: 'var(--surface)',
            }}
          >
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                style={{
                  borderRight: '1px solid var(--line)',
                  borderBottom: '1px solid var(--line)',
                  background: 'rgba(0,0,0,0.02)',
                }}
              />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday =
                new Date().toDateString() === new Date(year, month, dayNum).toDateString();
              const dayEvents = eventsByDate[dateStr] || [];

              return (
                <div
                  key={dateStr}
                  onClick={() => dayEvents.length > 0 && setSelectedDayDeadlines({ dateStr, events: dayEvents })}
                  style={{
                    borderRight: '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)',
                    padding: '8px',
                    minHeight: '90px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: isToday ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {/* Day Number */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isToday ? 900 : 700,
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isToday ? 'var(--accent)' : 'transparent',
                        color: isToday ? '#fff' : 'var(--ink)',
                      }}
                    >
                      {dayNum}
                    </span>

                    {dayEvents.length > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '10px',
                          background: dayEvents.some((e) => e.type === 'CS' || e.type === 'FER')
                            ? '#FEE2E2'
                            : (dayEvents.some((e) => e.type === 'COMMITMENT') ? '#FFEDD5' : '#EFF6FF'),
                          color: dayEvents.some((e) => e.type === 'CS' || e.type === 'FER')
                            ? '#DC2626'
                            : (dayEvents.some((e) => e.type === 'COMMITMENT') ? '#EA580C' : '#2563EB'),
                        }}
                      >
                        {dayEvents.length} due
                      </span>
                    )}
                  </div>

                  {/* Event Chips (Drafter Admin groups by Drafter Name with due counts; Drafter shows all events with equal visual prominence) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                    {isDrafterAdminUser || currentUser?.role === 'SUPER_ADMIN' ? (
                      (() => {
                        const drafterGroups = {};
                        dayEvents.forEach((ev) => {
                          const dName = ev.assigned_to || 'Unassigned';
                          if (!drafterGroups[dName]) drafterGroups[dName] = [];
                          drafterGroups[dName].push(ev);
                        });
                        const groupEntries = Object.entries(drafterGroups);
                        return (
                          <>
                            {groupEntries.slice(0, 3).map(([dName, dEvs]) => (
                              <button
                                key={dName}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDayDeadlines({ dateStr, drafterName: dName, events: dEvs });
                                }}
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  background: 'rgba(124, 58, 237, 0.12)',
                                  color: '#7C3AED',
                                  border: '1px solid rgba(124, 58, 237, 0.3)',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '4px',
                                  textAlign: 'left',
                                }}
                                title={`Click to view ${dEvs.length} dues for ${dName}`}
                              >
                                <span>{dName}</span>
                                <span style={{ fontWeight: 800, fontSize: '9px', background: '#7C3AED', color: '#fff', borderRadius: '8px', padding: '0 4px' }}>
                                  {dEvs.length} {dEvs.length === 1 ? 'due' : 'dues'}
                                </span>
                              </button>
                            ))}
                            {groupEntries.length > 3 && (
                              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textAlign: 'right' }}>
                                +{groupEntries.length - 3} more...
                              </div>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <>
                        {dayEvents.slice(0, 3).map((ev, eIdx) => (
                          <div
                            key={eIdx}
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              background: `${ev.color}15`,
                              color: ev.color,
                              borderLeft: `3px solid ${ev.color}`,
                              borderTop: `1px solid ${ev.color}30`,
                              borderRight: `1px solid ${ev.color}30`,
                              borderBottom: `1px solid ${ev.color}30`,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={`[${ev.project_code}] ${ev.typeLabel}: ${ev.title}`}
                          >
                            <span style={{ fontWeight: 800 }}>{ev.typeLabel}:</span>
                            <span>{ev.project_code}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textAlign: 'right' }}>
                            +{dayEvents.length - 3} more...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Upcoming Next 30 Days Sidebar Matching Reference UI Design Page 3 */}
        <div
          style={{
            width: '280px',
            background: 'var(--page)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface)',
            }}
          >
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink)' }}>
                Upcoming
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Next 30 days
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563EB',
              }}
            >
              {upcomingEvents.length} matters
            </span>
          </div>

          {/* List of upcoming matters */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                No events in the next 30 days.
              </div>
            ) : (
              upcomingEvents.slice(0, 18).map((item, idx) => {
                const d = item.dateObj;
                const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const day = d.getDate();
                const isOverdue = item.diffDays < 0;
                const isSoon = item.diffDays <= 2;

                return (
                  <div
                    key={idx}
                    onClick={() => onOpenDrawer && onOpenDrawer(item.record)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Date Block */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        background: 'rgba(37, 99, 235, 0.08)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#2563EB' }}>{mon}</span>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--ink)', lineHeight: 1 }}>{day}</span>
                    </div>

                    {/* Matter details */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ink)' }}>
                        {item.project_code}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.typeLabel} · {item.title ? item.title.slice(0, 28) : 'Matter'}
                      </div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: isOverdue ? '#DC2626' : (isSoon ? '#EA580C' : '#059669'),
                          marginTop: '2px',
                        }}
                      >
                        {isOverdue
                          ? `Overdue ${Math.abs(item.diffDays)}d`
                          : (isSoon
                            ? `Due in ${item.diffDays === 0 ? 'today' : `${item.diffDays} days`}`
                            : `In ${item.diffDays} days`)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer link to deadlines checklist */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
            <button
              onClick={onNavigateToDeadlines}
              style={{
                width: '100%',
                padding: '8px',
                border: 'none',
                background: 'transparent',
                color: 'var(--accent)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <span>Open deadlines checklist</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Day Deadlines Drawer / Modal */}
      {selectedDayDeadlines && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedDayDeadlines(null)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: 'var(--surface)',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--line)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--page)',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                  {selectedDayDeadlines.drafterName ? `${selectedDayDeadlines.drafterName} — ` : 'Deadlines for '}
                  {selectedDayDeadlines.dateStr}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                  {selectedDayDeadlines.events.length} {selectedDayDeadlines.drafterName ? `dues assigned to ${selectedDayDeadlines.drafterName}` : 'statutory milestones due on this date'}
                </p>
              </div>

              <button
                onClick={() => setSelectedDayDeadlines(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDayDeadlines.events.map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent)' }}>
                        {ev.project_code}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: `${ev.color}20`,
                          color: ev.color,
                        }}
                      >
                        {ev.typeLabel}
                      </span>
                      {ev.assigned_to && (
                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                          Drafter: {ev.assigned_to}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '3px' }}>
                      {ev.title}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setSelectedDayDeadlines(null);
                        onOpenTimeline(ev.record);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Timeline
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDayDeadlines(null);
                        onOpenDrawer(ev.record);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
