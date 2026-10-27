import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, Clock, Calendar, Scale, FileWarning, RefreshCw,
  Target, AlertCircle, User, CheckCircle2, ChevronDown, ChevronUp,
  Sparkles, Layers, Shield, Flag, Filter, ArrowRight
} from 'lucide-react';

const DRAFTERS_LIST = [
  'Anusha', 'Ayush', 'Abhishek', 'Fiona',
  'Pramith', 'Pratham', 'Thanush', 'Thilak', 'Pranav Bhat'
];

export default function KpiAlertRibbon({
  records = [],
  activeFilter,
  onSelectFilter,
  userRole = 'SUPER_ADMIN',
  currentDrafterName = null,
  allRecords = [],
  onSelectDrafter,
  selectedDrafterFilter = null,
}) {
  const [showMatrix, setShowMatrix] = useState(true);
  const now = new Date();

  // Helper for computing statutory & commitment metrics for a list of records
  const calculateMetrics = (dataset) => {
    let criticalCount = 0;
    let csDueCount = 0;
    let ferRepliesCount = 0;
    let hearingsWsCount = 0;
    let formDelayCount = 0;
    let renewalsCount = 0;
    let nearCommitmentCount = 0;
    let overdueCommitmentCount = 0;
    let problemCount = 0;
    let psCount = 0;
    let csCount = 0;
    let psCsCount = 0;
    let ferCount = 0;
    let wsCount = 0;
    let totalPurple = 0;
    let totalOrange = 0;
    let totalYellow = 0;
    let totalGreen = 0;

    dataset.forEach((r) => {
      if (r.is_abandoned) return;

      // 1. Critical < 7 days / overdue
      const csDead = r.cs_deadline;
      const ferDead = r.fer_reply_deadline;
      const wsDead = r.ws_deadline;
      const isCritical = [csDead, ferDead, wsDead].some((d) => {
        if (!d) return false;
        const diffDays = Math.round((new Date(d) - now) / 86400000);
        return diffDays <= 7;
      });
      if (isCritical) criticalCount++;

      // 2. Client Delivery Commitment Date (< 7 days or overdue)
      if (r.client_commitment_date) {
        const diffDays = Math.round((new Date(r.client_commitment_date) - now) / 86400000);
        if (diffDays < 0) {
          overdueCommitmentCount++;
          nearCommitmentCount++;
        } else if (diffDays <= 7) {
          nearCommitmentCount++;
        }
      }

      // 3. CS Due within 60 days
      if (r.cs_deadline && !r.cs_filing_date) {
        const diff = Math.round((new Date(r.cs_deadline) - now) / 86400000);
        if (diff >= -30 && diff <= 60) csDueCount++;
      }

      // 4. FER Replies Due
      if (r.fer_reply_deadline && !r.fer_reply_filing_date) {
        ferRepliesCount++;
      }

      // 5. Hearing & WS Due
      if ((r.hearing_date || r.ws_deadline) && !r.ws_filing_date) {
        hearingsWsCount++;
      }

      // 6. Form 1 / 26 Delayed / Pending (Petition 137 Trigger)
      if (r.f1_status === 'Delayed' || r.f26_status === 'Delayed' || r.f1_status === 'Pending' || r.f26_status === 'Pending') {
        formDelayCount++;
      }

      // 7. Renewals
      if (r.next_renewal_date || r.last_renewal_date) {
        renewalsCount++;
      }

      // 8. Problems & Tickets
      const rTags = Array.isArray(r.tags) ? r.tags : (r.classification ? r.classification.split(',').map((s) => s.trim()) : []);
      const hasTicket = rTags.some((t) => ['ticket raised', 'critical'].includes(t.toLowerCase()));
      const hasIssue = Boolean(r.issue && r.issue.trim());
      if (hasTicket || hasIssue) {
        problemCount++;
      }

      // 9. Stages & Specifications
      const spec = (r.specification_type || '').toUpperCase();
      if (spec === 'PS') psCount++;
      else if (spec === 'CS') csCount++;
      else if (spec.includes('PS') && spec.includes('CS')) psCsCount++;

      if (r.fer_notice_date || r.fer_reply_deadline) ferCount++;
      if (r.hearing_date || r.ws_deadline) wsCount++;

      // 10. Triage Colors
      const color = (r.color_code_status || '').toUpperCase();
      if (color === 'PURPLE') totalPurple++;
      else if (color === 'ORANGE') totalOrange++;
      else if (color === 'YELLOW') totalYellow++;
      else if (color === 'GREEN') totalGreen++;
    });

    return {
      criticalCount,
      csDueCount,
      ferRepliesCount,
      hearingsWsCount,
      formDelayCount,
      renewalsCount,
      nearCommitmentCount,
      overdueCommitmentCount,
      problemCount,
      psCount,
      csCount,
      psCsCount,
      ferCount,
      wsCount,
      totalPurple,
      totalOrange,
      totalYellow,
      totalGreen,
      totalCases: dataset.length,
    };
  };

  // Metrics for active view dataset
  const m = useMemo(() => calculateMetrics(records), [records]);

  // Macro metrics across all drafters for Super Admin
  const drafterMatrix = useMemo(() => {
    if (userRole !== 'SUPER_ADMIN') return [];
    const sourceRecords = allRecords.length > 0 ? allRecords : records;

    return DRAFTERS_LIST.map((drafter) => {
      const drafterCases = sourceRecords.filter(
        (r) => r.assigned_to && r.assigned_to.trim().toLowerCase() === drafter.toLowerCase()
      );
      const metrics = calculateMetrics(drafterCases);
      return {
        drafter,
        ...metrics,
      };
    });
  }, [allRecords, records, userRole]);

  // =========================================================================
  // RENDER 1: DRAFTER COCKPIT (Requirement 1 & 2 for Drafter)
  // =========================================================================
  if (userRole === 'DRAFTER') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {/* Top Drafter Command Strip */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '10px',
            border: '1px solid var(--line)',
            padding: '14px 18px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.35)',
                }}
              >
                {currentDrafterName ? currentDrafterName.slice(0, 2).toUpperCase() : 'DR'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>
                    {currentDrafterName ? `${currentDrafterName}'s Drafting Cockpit` : 'Drafter Command Dashboard'}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(139, 92, 246, 0.12)',
                      color: '#7C3AED',
                    }}
                  >
                    Patent Associate View
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  Active docket triage, client delivery commitments, and matter roadblock diagnosis
                </p>
              </div>
            </div>

            {/* Total Cases Handling Badge */}
            <div
              onClick={() => onSelectFilter(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: !activeFilter ? 'rgba(37, 99, 235, 0.12)' : 'var(--page)',
                border: `1.5px solid ${!activeFilter ? '#2563EB' : 'var(--line)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Click to view all your assigned cases"
            >
              <Layers size={16} color="#2563EB" />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Handling
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>
                  {m.totalCases} Cases
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Stage & Specification Filters (PS, CS, PS-CS, FER, WS) & Triage Colors */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '10px',
              borderTop: '1px solid var(--line)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Specification breakdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginRight: '4px' }}>
                Stages:
              </span>
              {[
                { id: 'spec_ps', label: 'PS', count: m.psCount, color: '#3A86FF', bg: 'rgba(58, 134, 255, 0.1)' },
                { id: 'spec_cs', label: 'CS', count: m.csCount, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
                { id: 'spec_ps_cs', label: 'PS-CS', count: m.psCsCount, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
                { id: 'stage_fer', label: 'FER', count: m.ferCount, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)' },
                { id: 'stage_ws', label: 'WS', count: m.wsCount, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
              ].map((st) => {
                const isAct = activeFilter === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => onSelectFilter(isAct ? null : st.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: `1.5px solid ${isAct ? st.color : 'var(--line)'}`,
                      background: isAct ? st.bg : 'var(--page)',
                      color: isAct ? st.color : 'var(--ink)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{st.label}</span>
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: '10px',
                        background: st.color,
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 800,
                      }}
                    >
                      {st.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Triage color breakdown (Purple, Orange, Yellow) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginRight: '4px' }}>
                Triage Colors:
              </span>
              {[
                { id: 'color_purple', label: 'Purple (Drafting)', count: m.totalPurple, color: '#8A4FFF', bg: 'rgba(138, 79, 255, 0.15)', dot: '#8A4FFF' },
                { id: 'color_orange', label: 'Orange (Signoff)', count: m.totalOrange, color: '#EA580C', bg: 'rgba(234, 88, 12, 0.15)', dot: '#EA580C' },
                { id: 'color_yellow', label: 'Yellow (Query)', count: m.totalYellow, color: '#D97706', bg: 'rgba(217, 119, 6, 0.15)', dot: '#D97706' },
              ].map((c) => {
                const isAct = activeFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectFilter(isAct ? null : c.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: `1.5px solid ${isAct ? c.color : 'var(--line)'}`,
                      background: isAct ? c.bg : 'var(--page)',
                      color: isAct ? c.color : 'var(--ink)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.dot }} />
                    <span>{c.label}:</span>
                    <strong>{c.count}</strong>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actionable KPI Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          {/* 1. Near Commitment Days (Client Delivery Due) */}
          <div
            onClick={() => onSelectFilter(activeFilter === 'commitments_near' ? null : 'commitments_near')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: activeFilter === 'commitments_near' ? 'rgba(234, 88, 12, 0.15)' : 'var(--surface)',
              border: `1.5px solid ${activeFilter === 'commitments_near' ? '#EA580C' : 'var(--line)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: activeFilter === 'commitments_near' ? '0 0 12px rgba(234, 88, 12, 0.25)' : 'var(--shadow-card)',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Near Client Commitments
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '3px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#EA580C', lineHeight: 1 }}>
                  {m.nearCommitmentCount}
                </span>
                {m.overdueCommitmentCount > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '8px',
                      background: '#FEE2E2',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                    }}
                  >
                    🚨 {m.overdueCommitmentCount} Overdue (SPOC Alerted)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '4px' }}>
                Delivery due to client in ≤ 7 days
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(234, 88, 12, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EA580C',
              }}
            >
              <Target size={20} />
            </div>
          </div>

          {/* 2. My Problem Radar (Tickets & Roadblocks) */}
          <div
            onClick={() => onSelectFilter(activeFilter === 'problems' ? null : 'problems')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: activeFilter === 'problems' ? 'rgba(220, 38, 38, 0.15)' : 'var(--surface)',
              border: `1.5px solid ${activeFilter === 'problems' ? '#DC2626' : 'var(--line)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: activeFilter === 'problems' ? '0 0 12px rgba(220, 38, 38, 0.25)' : 'var(--shadow-card)',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Problems & Client Tickets
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '3px', lineHeight: 1 }}>
                {m.problemCount}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '4px' }}>
                Active support tickets or blocker issues
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(220, 38, 38, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
              }}
            >
              <AlertCircle size={20} />
            </div>
          </div>

          {/* 3. Statutory Critical (< 7 Days) */}
          <div
            onClick={() => onSelectFilter(activeFilter === 'critical' ? null : 'critical')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: activeFilter === 'critical' ? 'rgba(194, 59, 46, 0.15)' : 'var(--surface)',
              border: `1.5px solid ${activeFilter === 'critical' ? '#C23B2E' : 'var(--line)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: activeFilter === 'critical' ? '0 0 12px rgba(194, 59, 46, 0.25)' : 'var(--shadow-card)',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Statutory Critical (&lt; 7 Days)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#C23B2E', marginTop: '3px', lineHeight: 1 }}>
                {m.criticalCount}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '4px' }}>
                Section 9 / 21 statutory cutoff dates
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(194, 59, 46, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C23B2E',
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>

          {/* 4. Complete Specification Due (60 Days) */}
          <div
            onClick={() => onSelectFilter(activeFilter === 'cs_due' ? null : 'cs_due')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: activeFilter === 'cs_due' ? 'rgba(201, 138, 44, 0.15)' : 'var(--surface)',
              border: `1.5px solid ${activeFilter === 'cs_due' ? '#C98A2C' : 'var(--line)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: activeFilter === 'cs_due' ? '0 0 12px rgba(201, 138, 44, 0.25)' : 'var(--shadow-card)',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                CS Due (60 Days)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#C98A2C', marginTop: '3px', lineHeight: 1 }}>
                {m.csDueCount}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '4px' }}>
                Section 9(1) 12-month clock
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(201, 138, 44, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C98A2C',
              }}
            >
              <Clock size={20} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: PARALEGAL DOCKETING COMMAND CENTER
  // =========================================================================
  if (userRole === 'PARALEGAL') {
    const paralegalCards = [
      { id: 'form_petition', label: 'Pending F1/F26 (Pet. 137)', count: m.formDelayCount, icon: FileWarning, color: '#E05638', bg: 'rgba(224, 86, 56, 0.1)' },
      { id: 'critical', label: 'Critical Statutory (< 7d)', count: m.criticalCount, icon: AlertTriangle, color: '#C23B2E', bg: 'rgba(194, 59, 46, 0.1)' },
      { id: 'cs_due', label: 'CS Due (60 Days)', count: m.csDueCount, icon: Clock, color: '#C98A2C', bg: 'rgba(201, 138, 44, 0.1)' },
      { id: 'fer_due', label: 'FER Replies Due', count: m.ferRepliesCount, icon: Calendar, color: '#8A4FFF', bg: 'rgba(138, 79, 255, 0.1)' },
      { id: 'hearing_ws', label: 'Hearings & WS Due', count: m.hearingsWsCount, icon: Scale, color: '#3A86FF', bg: 'rgba(58, 134, 255, 0.1)' },
      { id: 'renewals', label: 'Upcoming Renewals', count: m.renewalsCount, icon: RefreshCw, color: '#4E9E56', bg: 'rgba(78, 158, 86, 0.1)' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {/* Paralegal Full Edit Notice Banner */}
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12.5px',
            color: '#065F46',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <Shield size={16} color="#059669" />
            <span>
              <strong>Paralegal Docketing Authority:</strong> All paralegal associates have full access to edit statutory dates, upload IPO filing receipts (CBR), update application numbers, and mark checklist actions complete.
            </span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#059669', color: '#fff' }}>
            Full Portfolio Edit Mode
          </span>
        </div>

        {/* Paralegal Formalities Ribbon */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {paralegalCards.map((c) => {
            const Icon = c.icon;
            const isAct = activeFilter === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSelectFilter(isAct ? null : c.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: isAct ? c.bg : 'var(--surface)',
                  border: `1.5px solid ${isAct ? c.color : 'var(--line)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: isAct ? `0 0 12px ${c.color}40` : 'var(--shadow-card)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: c.color, marginTop: '2px' }}>
                    {c.count}
                  </div>
                </div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: c.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: c.color,
                  }}
                >
                  <Icon size={18} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 3: PATENT ADMIN (SUPER ADMIN) - THE BIGGER PICTURE
  // =========================================================================
  const standardCards = [
    {
      id: 'critical',
      label: 'Critical (< 7 Days)',
      count: m.criticalCount,
      icon: AlertTriangle,
      color: '#C23B2E',
      bg: 'rgba(194, 59, 46, 0.1)',
    },
    {
      id: 'commitments_near',
      label: 'Near Commitments',
      count: m.nearCommitmentCount,
      sublabel: m.overdueCommitmentCount > 0 ? `${m.overdueCommitmentCount} Overdue (SPOC Alerted)` : 'Due in ≤ 7 days',
      icon: Target,
      color: '#EA580C',
      bg: 'rgba(234, 88, 12, 0.1)',
    },
    {
      id: 'cs_due',
      label: 'CS Due (60 Days)',
      count: m.csDueCount,
      icon: Clock,
      color: '#C98A2C',
      bg: 'rgba(201, 138, 44, 0.1)',
    },
    {
      id: 'fer_due',
      label: 'FER Replies Due',
      count: m.ferRepliesCount,
      icon: Calendar,
      color: '#8A4FFF',
      bg: 'rgba(138, 79, 255, 0.1)',
    },
    {
      id: 'hearing_ws',
      label: 'Hearings & WS Due',
      count: m.hearingsWsCount,
      icon: Scale,
      color: '#3A86FF',
      bg: 'rgba(58, 134, 255, 0.1)',
    },
    {
      id: 'form_petition',
      label: 'Pending F1/F26',
      count: m.formDelayCount,
      icon: FileWarning,
      color: '#E05638',
      bg: 'rgba(224, 86, 56, 0.1)',
    },
    {
      id: 'renewals',
      label: 'Upcoming Renewals',
      count: m.renewalsCount,
      icon: RefreshCw,
      color: '#4E9E56',
      bg: 'rgba(78, 158, 86, 0.1)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
      {/* Top Firm-wide KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        {standardCards.map((c) => {
          const Icon = c.icon;
          const isAct = activeFilter === c.id;
          return (
            <div
              key={c.id}
              onClick={() => onSelectFilter(isAct ? null : c.id)}
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: isAct ? c.bg : 'var(--surface)',
                border: `1.5px solid ${isAct ? c.color : 'var(--line)'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isAct ? `0 0 12px ${c.color}40` : 'var(--shadow-card)',
                transition: 'all 0.2s ease',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: c.color, marginTop: '2px' }}>
                  {c.count}
                </div>
                {c.sublabel && (
                  <div style={{ fontSize: '9.5px', color: m.overdueCommitmentCount > 0 ? '#DC2626' : 'var(--muted)', fontWeight: 700 }}>
                    {c.sublabel}
                  </div>
                )}
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: c.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: c.color,
                }}
              >
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Patent Admin: All Drafters Workload & Commitment Matrix (Bigger Picture) */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '10px',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        {/* Matrix Header Toggle */}
        <div
          onClick={() => setShowMatrix(!showMatrix)}
          style={{
            padding: '12px 18px',
            background: 'var(--page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            borderBottom: showMatrix ? '1px solid var(--line)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink)' }}>
                Drafter Capacity, Client Commitments & Problem Triage Matrix (All Drafters)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Executive macro view across all 9 associates: live docket loads, PS/CS/FER/WS breakdown, commitments & triage colors
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedDrafterFilter && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectDrafter) onSelectDrafter(null);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: '#EF4444',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Clear Drafter Filter ({selectedDrafterFilter})
              </button>
            )}
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
              {showMatrix ? 'Collapse Matrix' : 'Expand Matrix'}
            </span>
            {showMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {/* Matrix Content */}
        {showMatrix && (
          <div style={{ padding: '14px 18px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--line)', color: 'var(--muted)', fontWeight: 700 }}>
                  <th style={{ padding: '8px 10px' }}>DRAFTER</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>TOTAL CASES</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>PS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>CS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>PS-CS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>FER</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>WS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>NEAR COMMITMENT</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>🟣 PURPLE</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>🟠 ORANGE</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>🟡 YELLOW</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>PROBLEMS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {drafterMatrix.map((dm) => {
                  const isFiltered = selectedDrafterFilter && selectedDrafterFilter.toLowerCase() === dm.drafter.toLowerCase();
                  return (
                    <tr
                      key={dm.drafter}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: isFiltered ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '10px 10px', fontWeight: 800, color: 'var(--ink)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: isFiltered ? '#2563EB' : 'rgba(37, 99, 235, 0.15)',
                              color: isFiltered ? '#fff' : '#2563EB',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {dm.drafter.slice(0, 2).toUpperCase()}
                          </span>
                          <span>{dm.drafter}</span>
                        </div>
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 800, color: '#2563EB', fontSize: '13px' }}>
                        {dm.totalCases}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                        {dm.psCount}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                        {dm.csCount}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                        {dm.psCsCount}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600, color: dm.ferCount > 0 ? '#EC4899' : 'var(--muted)' }}>
                        {dm.ferCount}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600, color: dm.wsCount > 0 ? '#F59E0B' : 'var(--muted)' }}>
                        {dm.wsCount}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '11px',
                            background: dm.overdueCommitmentCount > 0 ? '#FEE2E2' : (dm.nearCommitmentCount > 0 ? 'rgba(234, 88, 12, 0.15)' : 'var(--page)'),
                            color: dm.overdueCommitmentCount > 0 ? '#DC2626' : (dm.nearCommitmentCount > 0 ? '#EA580C' : 'var(--muted)'),
                          }}
                        >
                          {dm.nearCommitmentCount} Due {dm.overdueCommitmentCount > 0 && `(${dm.overdueCommitmentCount} Overdue)`}
                        </span>
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#8A4FFF' }}>
                        {dm.totalPurple}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#EA580C' }}>
                        {dm.totalOrange}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#D97706' }}>
                        {dm.totalYellow}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        {dm.problemCount > 0 ? (
                          <span style={{ padding: '2px 6px', borderRadius: '8px', background: '#FEF2F2', color: '#DC2626', fontWeight: 800, fontSize: '11px', border: '1px solid #FCA5A5' }}>
                            {dm.problemCount} Alert
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>0</span>
                        )}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            if (onSelectDrafter) {
                              onSelectDrafter(isFiltered ? null : dm.drafter);
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${isFiltered ? '#2563EB' : 'var(--line)'}`,
                            background: isFiltered ? '#2563EB' : 'var(--page)',
                            color: isFiltered ? '#fff' : 'var(--ink)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isFiltered ? 'Viewing Cases ✓' : 'Inspect Cases →'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
