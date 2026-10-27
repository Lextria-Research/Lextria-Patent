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
  onOpenReassign = null,
  onNavigateToFormalities = null,
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
      
      // Calculate quality and performance metrics matching tracking guidelines
      const completed = metrics.totalGreen || 0;
      const active = Math.max(0, metrics.totalCases - completed);
      const staleCount = drafterCases.filter((r) => {
        if (!r.client_commitment_date) return false;
        const diff = Math.round((new Date(r.client_commitment_date) - now) / 86400000);
        return diff < -7 && !r.is_abandoned;
      }).length;
      
      const problemCases = drafterCases.filter((r) => {
        const rTags = Array.isArray(r.tags) ? r.tags : (r.classification ? r.classification.split(',').map((s) => s.trim()) : []);
        return rTags.some((t) => ['ticket raised', 'critical'].includes(t.toLowerCase())) || Boolean(r.issue && r.issue.trim());
      }).length;

      const rejections = problemCases;
      const rejRate = drafterCases.length > 0 ? Math.round((rejections / drafterCases.length) * 100) : 0;
      const score = Math.max(20, Math.min(100, Math.round(((completed * 2 + active * 0.8 - rejections * 1.5) / (drafterCases.length || 1)) * 30 + 55)));

      return {
        drafter,
        ...metrics,
        completed,
        active,
        staleCount,
        rejections,
        rejRate,
        score,
      };
    });
  }, [allRecords, records, userRole, now]);

  // =========================================================================
  // RENDER 1: DRAFTER COCKPIT (Matching Reference UI Design PDF)
  // =========================================================================
  if (userRole === 'DRAFTER') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
        {/* Drafter Cockpit Title Banner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0, color: 'var(--ink)', letterSpacing: '-0.3px' }}>
              Drafting cockpit
            </h1>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.12)',
                color: '#7C3AED',
              }}
            >
              Patent Associate view
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            Docket triage, client delivery commitments and roadblock diagnosis for your <strong>{m.totalCases}</strong> assigned matters. Total handling <strong>{m.totalCases} cases</strong>
          </p>
        </div>

        {/* STAGE PIPELINE & TRIAGE STRIP */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '10px',
            border: '1px solid var(--line)',
            padding: '12px 18px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Left: STAGE PIPELINE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              STAGE PIPELINE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {[
                { id: 'spec_ps', label: 'PS', count: m.psCount },
                { id: 'spec_cs', label: 'CS', count: m.csCount },
                { id: 'spec_ps_cs', label: 'PS-CS', count: m.psCsCount },
                { id: 'stage_fer', label: 'FER', count: m.ferCount },
                { id: 'stage_ws', label: 'WS', count: m.wsCount },
              ].map((st) => {
                const isAct = activeFilter === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => onSelectFilter(isAct ? null : st.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '6px 14px',
                      borderRadius: '7px',
                      border: `1.5px solid ${isAct ? '#2563EB' : 'var(--line)'}`,
                      background: isAct ? 'rgba(37, 99, 235, 0.08)' : 'var(--page)',
                      cursor: 'pointer',
                      minWidth: '56px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isAct ? '#2563EB' : 'var(--muted)' }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: isAct ? '#2563EB' : 'var(--ink)', lineHeight: 1.2 }}>
                      {st.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: TRIAGE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              TRIAGE
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: 'var(--page)',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
              }}
            >
              <div
                onClick={() => onSelectFilter(activeFilter === 'color_purple' ? null : 'color_purple')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                title="Drafting in progress (Purple)"
              >
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#8A4FFF' }} />
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Drafting</span>
                <strong style={{ fontSize: '13.5px', color: '#8A4FFF' }}>{m.totalPurple}</strong>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'var(--line)' }} />
              <div
                onClick={() => onSelectFilter(activeFilter === 'color_orange' ? null : 'color_orange')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                title="Sent to inventor / Awaiting sign-off (Orange)"
              >
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EA580C' }} />
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Sign-off</span>
                <strong style={{ fontSize: '13.5px', color: '#EA580C' }}>{m.totalOrange}</strong>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'var(--line)' }} />
              <div
                onClick={() => onSelectFilter(activeFilter === 'color_yellow' ? null : 'color_yellow')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                title="Inventor query / clarifications (Yellow)"
              >
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#D97706' }} />
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Query</span>
                <strong style={{ fontSize: '13.5px', color: '#D97706' }}>{m.totalYellow}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Large Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* Card 1: Near client commitments */}
          <div
            onClick={() => onSelectFilter(activeFilter === 'commitments_near' ? null : 'commitments_near')}
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              background: activeFilter === 'commitments_near' ? 'rgba(234, 88, 12, 0.12)' : 'var(--surface)',
              border: `1.5px solid ${activeFilter === 'commitments_near' ? '#EA580C' : 'var(--line)'}`,
              boxShadow: 'var(--shadow-card)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 700 }}>
              Near client commitments
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#EA580C', lineHeight: 1 }}>
                {m.nearCommitmentCount}
              </span>
              {m.overdueCommitmentCount > 0 ? (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FCA5A5',
                  }}
                >
                  {m.overdueCommitmentCount} overdue · SPOC alerted
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#ECFDF5',
                    color: '#059669',
                  }}
                >
                  On schedule
                </span>
              )}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
              Delivery due to client in ≤ 7 days
            </div>
          </div>

          {/* Card 2: Problems & client tickets */}
          <div
            onClick={() => onSelectFilter(activeFilter === 'problems' ? null : 'problems')}
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              background: activeFilter === 'problems' ? 'rgba(220, 38, 38, 0.12)' : 'var(--surface)',
              border: `1.5px solid ${activeFilter === 'problems' ? '#DC2626' : 'var(--line)'}`,
              boxShadow: 'var(--shadow-card)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 700 }}>
              Problems & client tickets
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: m.problemCount > 0 ? '#DC2626' : '#10B981', lineHeight: 1 }}>
                {m.problemCount}
              </span>
              {m.problemCount === 0 ? (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#ECFDF5',
                    color: '#059669',
                  }}
                >
                  All clear
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FCA5A5',
                  }}
                >
                  {m.problemCount} active blocker{m.problemCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
              Active support tickets or blocker issues
            </div>
          </div>

          {/* Card 3: Statutory critical · < 7 days */}
          <div
            onClick={() => onSelectFilter(activeFilter === 'critical' ? null : 'critical')}
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              background: activeFilter === 'critical' ? 'rgba(194, 59, 46, 0.12)' : 'var(--surface)',
              border: `1.5px solid ${activeFilter === 'critical' ? '#C23B2E' : 'var(--line)'}`,
              boxShadow: 'var(--shadow-card)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 700 }}>
              Statutory critical · &lt; 7 days
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: m.criticalCount > 0 ? '#C23B2E' : '#10B981', lineHeight: 1 }}>
                {m.criticalCount}
              </span>
              {m.criticalCount === 0 ? (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#ECFDF5',
                    color: '#059669',
                  }}
                >
                  All clear
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FCA5A5',
                  }}
                >
                  Urgent action required
                </span>
              )}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
              Section 9 / 21 statutory cut-off dates
            </div>
          </div>

          {/* Card 4: CS due · 60 days */}
          <div
            onClick={() => onSelectFilter(activeFilter === 'cs_due' ? null : 'cs_due')}
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              background: activeFilter === 'cs_due' ? 'rgba(201, 138, 44, 0.12)' : 'var(--surface)',
              border: `1.5px solid ${activeFilter === 'cs_due' ? '#C98A2C' : 'var(--line)'}`,
              boxShadow: 'var(--shadow-card)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 700 }}>
              CS due · 60 days
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: m.csDueCount > 0 ? '#C98A2C' : '#10B981', lineHeight: 1 }}>
                {m.csDueCount}
              </span>
              {m.csDueCount === 0 ? (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#ECFDF5',
                    color: '#059669',
                  }}
                >
                  All clear
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#FEF3C7',
                    color: '#D97706',
                  }}
                >
                  Filing due soon
                </span>
              )}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
              Section 9(1) 12-month clock
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
            padding: '12px 18px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12.5px',
            color: '#065F46',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
            <Shield size={18} color="#059669" />
            <span>
              <strong>Paralegal Docketing Authority:</strong> Full clearance to log IPO filings, enter official CBR & application numbers, audit Form 1/26 compliance, track RFE 31-month clocks, and resolve discrepancies.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onNavigateToFormalities && (
              <button
                onClick={onNavigateToFormalities}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#059669',
                  color: '#fff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                }}
              >
                Open Formalities Docket →
              </button>
            )}
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.18)', color: '#047857' }}>
              Full Docketing Authority
            </span>
          </div>
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
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>COMPLETED</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>REJ RATE</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>SCORE</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>STATUS / FLAGS</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {drafterMatrix.map((dm) => {
                  const isFiltered = selectedDrafterFilter && selectedDrafterFilter.toLowerCase() === dm.drafter.toLowerCase();
                  const hasWarning = dm.staleCount > 0 || dm.rejRate > 30;
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

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#10B981' }}>
                        {dm.completed}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '11px',
                            background: dm.rejRate > 30 ? '#FEE2E2' : '#F0FDF4',
                            color: dm.rejRate > 30 ? '#DC2626' : '#15803D',
                          }}
                        >
                          {dm.rejRate}%
                        </span>
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 800, color: '#1E3A8A' }}>
                        {dm.score}
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          {dm.staleCount > 0 && (
                            <span
                              style={{ padding: '2px 5px', borderRadius: '4px', background: '#FEE2E2', color: '#B91C1C', fontSize: '10px', fontWeight: 700 }}
                              title={`${dm.staleCount} matters with no movement for 7+ days`}
                            >
                              🔴 Stale ({dm.staleCount})
                            </span>
                          )}
                          {dm.rejRate > 30 && (
                            <span
                              style={{ padding: '2px 5px', borderRadius: '4px', background: '#FEF3C7', color: '#B45309', fontSize: '10px', fontWeight: 700 }}
                              title="Rejection rate above 30%"
                            >
                              ⚠️ High Rej
                            </span>
                          )}
                          {!hasWarning && (
                            <span style={{ color: '#059669', fontSize: '10.5px', fontWeight: 700 }}>
                              ✅ On Track
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => {
                              if (onSelectDrafter) {
                                onSelectDrafter(isFiltered ? null : dm.drafter);
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              border: `1px solid ${isFiltered ? '#2563EB' : 'var(--line)'}`,
                              background: isFiltered ? '#2563EB' : 'var(--page)',
                              color: isFiltered ? '#fff' : 'var(--ink)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Filter portfolio to this drafter"
                          >
                            {isFiltered ? 'Viewing ✓' : 'Inspect'}
                          </button>
                          {onOpenReassign && (
                            <button
                              onClick={() => onOpenReassign(dm.drafter)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                border: '1px solid var(--line)',
                                background: 'var(--surface)',
                                color: 'var(--accent)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Reassign matters from this drafter"
                            >
                              Reassign
                            </button>
                          )}
                        </div>
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
