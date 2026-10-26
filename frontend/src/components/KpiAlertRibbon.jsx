import React from 'react';
import { AlertTriangle, Clock, Calendar, Scale, FileWarning, RefreshCw } from 'lucide-react';

export default function KpiAlertRibbon({ records = [], activeFilter, onSelectFilter }) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Calculate metrics
  let criticalCount = 0;
  let csDueCount = 0;
  let ferRepliesCount = 0;
  let hearingsWsCount = 0;
  let formDelayCount = 0;
  let renewalsCount = 0;

  records.forEach((r) => {
    // 1. Critical < 7 days / overdue
    const csDead = r.cs_deadline;
    const ferDead = r.fer_reply_deadline;
    const wsDead = r.ws_deadline;
    
    const isCritical = [csDead, ferDead, wsDead].some((d) => {
      if (!d) return false;
      const diffDays = Math.round((new Date(d) - now) / 86400000);
      return diffDays <= 7 && !r.is_abandoned;
    });
    if (isCritical) criticalCount++;

    // 2. CS Due within 60 days
    if (r.cs_deadline && !r.cs_filing_date) {
      const diff = Math.round((new Date(r.cs_deadline) - now) / 86400000);
      if (diff >= -30 && diff <= 60 && !r.is_abandoned) csDueCount++;
    }

    // 3. FER Replies Due
    if (r.fer_reply_deadline && !r.fer_reply_filing_date && !r.is_abandoned) {
      ferRepliesCount++;
    }

    // 4. Hearing & WS Due
    if ((r.hearing_date || r.ws_deadline) && !r.ws_filing_date && !r.is_abandoned) {
      hearingsWsCount++;
    }

    // 5. Form 1 / 26 Delayed / Pending (Petition 137 Trigger)
    if ((r.f1_status === 'Delayed' || r.f26_status === 'Delayed' || r.f1_status === 'Pending' || r.f26_status === 'Pending') && !r.is_abandoned) {
      formDelayCount++;
    }

    // 6. Renewals
    if (r.next_renewal_date || r.last_renewal_date) {
      renewalsCount++;
    }
  });

  const cards = [
    {
      id: 'critical',
      label: 'Critical (< 7 Days)',
      count: criticalCount,
      icon: AlertTriangle,
      color: '#C23B2E',
      bg: 'rgba(194, 59, 46, 0.1)',
      border: 'rgba(194, 59, 46, 0.3)',
    },
    {
      id: 'cs_due',
      label: 'CS Due (60 Days)',
      count: csDueCount,
      icon: Clock,
      color: '#C98A2C',
      bg: 'rgba(201, 138, 44, 0.1)',
      border: 'rgba(201, 138, 44, 0.3)',
    },
    {
      id: 'fer_due',
      label: 'FER Replies Due',
      count: ferRepliesCount,
      icon: Calendar,
      color: '#8A4FFF',
      bg: 'rgba(138, 79, 255, 0.1)',
      border: 'rgba(138, 79, 255, 0.3)',
    },
    {
      id: 'hearing_ws',
      label: 'Hearings & WS Due',
      count: hearingsWsCount,
      icon: Scale,
      color: '#3A86FF',
      bg: 'rgba(58, 134, 255, 0.1)',
      border: 'rgba(58, 134, 255, 0.3)',
    },
    {
      id: 'form_petition',
      label: 'Pending F1/F26 (Pet. 137)',
      count: formDelayCount,
      icon: FileWarning,
      color: '#E05638',
      bg: 'rgba(224, 86, 56, 0.1)',
      border: 'rgba(224, 86, 56, 0.3)',
    },
    {
      id: 'renewals',
      label: 'Upcoming Renewals',
      count: renewalsCount,
      icon: RefreshCw,
      color: '#4E9E56',
      bg: 'rgba(78, 158, 86, 0.1)',
      border: 'rgba(78, 158, 86, 0.3)',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
      marginBottom: '16px'
    }}>
      {cards.map((c) => {
        const Icon = c.icon;
        const isActive = activeFilter === c.id;
        return (
          <div
            key={c.id}
            onClick={() => onSelectFilter(isActive ? null : c.id)}
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: isActive ? c.bg : 'var(--surface)',
              border: `1.5px solid ${isActive ? c.color : 'var(--line)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: isActive ? `0 0 12px ${c.border}` : 'var(--shadow-card)',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {c.label}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: c.color, marginTop: '2px' }}>
                {c.count}
              </div>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: c.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: c.color
            }}>
              <Icon size={18} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
