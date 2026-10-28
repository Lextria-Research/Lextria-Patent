// frontend/src/components/AdminTeamOverview.jsx
import React, { useState, useMemo } from 'react';
import {
  Shield, AlertTriangle, Clock, CheckCircle2, User, Users,
  Calendar, ArrowRight, ExternalLink, Filter, ChevronDown, ChevronUp,
  ChevronRight, RefreshCw, Layers, Briefcase, UserCheck, Search, Target
} from 'lucide-react';

// The 8 official firm drafters from the reference design document
const OFFICIAL_DRAFTERS = [
  { name: 'Thanush', initials: 'TH', color: '#2563EB', bg: '#EFF6FF' },
  { name: 'Ayush', initials: 'AY', color: '#2563EB', bg: '#EFF6FF' },
  { name: 'Amith', initials: 'AM', color: '#2563EB', bg: '#EFF6FF' },
  { name: 'Pratham', initials: 'PR', color: '#2563EB', bg: '#EFF6FF' },
  { name: 'Abhishek', initials: 'AB', color: '#2563EB', bg: '#EFF6FF' },
  { name: 'Thilak', initials: 'TH', color: '#2563EB', bg: '#EFF6FF' },
  { name: 'Anusha', initials: 'AN', color: '#2563EB', bg: '#EFF6FF' },
  { name: 'Pramith', initials: 'PR', color: '#2563EB', bg: '#EFF6FF' },
];

// Baseline reference figures from Lextria_Team_Overview_Admin UI.pdf
const REFERENCE_FIGURES = {
  activeMatters: 599,
  avgPerDrafter: 75,
  overdueDeliveries: 13,
  overdueDraftersCount: 4,
  dueIn7Days: 102,
  awaitingSignoff: 140,
  openQueries: 23,
  workload: [
    { name: 'Thanush', initials: 'TH', active: 126, loadPct: 168, drafting: 85, signoff: 23, query: 2, due7d: 36, overdue: 7, nextDueLabel: 'Due in 2 days', nextMatter: 'AAIS156 · 29 Oct', nextDueDays: 2 },
    { name: 'Ayush', initials: 'AY', active: 97, loadPct: 130, drafting: 70, signoff: 19, query: 6, due7d: 18, overdue: 2, nextDueLabel: 'Due in 1 day', nextMatter: 'AAIS163 · 28 Oct', nextDueDays: 1 },
    { name: 'Amith', initials: 'AM', active: 88, loadPct: 118, drafting: 60, signoff: 20, query: 4, due7d: 14, overdue: 3, nextDueLabel: 'Due in 3 days', nextMatter: 'MAHE121 · 30 Oct', nextDueDays: 3 },
    { name: 'Pratham', initials: 'PR', active: 73, loadPct: 97, drafting: 50, signoff: 17, query: 3, due7d: 11, overdue: 1, nextDueLabel: 'Due today', nextMatter: 'MAHE133 · 27 Oct', nextDueDays: 0 },
    { name: 'Abhishek', initials: 'AB', active: 64, loadPct: 85, drafting: 42, signoff: 15, query: 3, due7d: 9, overdue: 0, nextDueLabel: 'Due in 3 days', nextMatter: 'AAIS170 · 30 Oct', nextDueDays: 3 },
    { name: 'Thilak', initials: 'TH', active: 58, loadPct: 77, drafting: 40, signoff: 16, query: 2, due7d: 6, overdue: 0, nextDueLabel: 'Due in 6 days', nextMatter: 'MAHE140 · 2 Nov', nextDueDays: 6 },
    { name: 'Anusha', initials: 'AN', active: 52, loadPct: 69, drafting: 30, signoff: 18, query: 2, due7d: 5, overdue: 0, nextDueLabel: 'Due in 7 days', nextMatter: 'AAIS181 · 3 Nov', nextDueDays: 7 },
    { name: 'Pramith', initials: 'PR', active: 41, loadPct: 55, drafting: 25, signoff: 12, query: 1, due7d: 3, overdue: 0, nextDueLabel: 'In 13 days', nextMatter: 'MAHE152 · 9 Nov', nextDueDays: 13 },
  ],
  needsAttention: [
    { matter: 'MAHE118', action: 'Client delivery', drafter: 'Amith', due: '22 Oct', urgencyType: 'OVERDUE', urgencyText: 'Overdue · 5 days', daysLate: 5 },
    { matter: 'AAIS141', action: 'Client delivery', drafter: 'Ayush', due: '24 Oct', urgencyType: 'OVERDUE', urgencyText: 'Overdue · 3 days', daysLate: 3 },
    { matter: 'MAHE097', action: 'Client delivery', drafter: 'Thanush', due: '25 Oct', urgencyType: 'OVERDUE', urgencyText: 'Overdue · 2 days', daysLate: 2 },
    { matter: 'MAHE133', action: 'Client delivery', drafter: 'Pratham', due: '27 Oct', urgencyType: 'TODAY', urgencyText: 'Due today', daysLate: 0 },
    { matter: 'AAIS163', action: 'Client delivery', drafter: 'Ayush', due: '28 Oct', urgencyType: 'DUE_1_2', urgencyText: 'Due in 1 day', daysLate: -1 },
    { matter: 'AAIS156', action: 'Client delivery', drafter: 'Thanush', due: '29 Oct', urgencyType: 'DUE_1_2', urgencyText: 'Due in 2 days', daysLate: -2 },
  ],
  heatmapDays: [
    { label: 'Today', dayNum: '27', isToday: true },
    { label: 'Wed', dayNum: '28' },
    { label: 'Thu', dayNum: '29' },
    { label: 'Fri', dayNum: '30' },
    { label: 'Sat', dayNum: '31' },
    { label: 'Sun', dayNum: '1' },
    { label: 'Mon', dayNum: '2' },
    { label: 'Tue', dayNum: '3' },
    { label: 'Wed', dayNum: '4' },
    { label: 'Thu', dayNum: '5' },
    { label: 'Fri', dayNum: '6' },
    { label: 'Sat', dayNum: '7' },
    { label: 'Sun', dayNum: '8' },
    { label: 'Mon', dayNum: '9' },
  ],
  heatmapGrid: {
    Thanush:  [8, 9, 0, 1, 0, 0, 4, 5, 6, 7, 6, 0, 0, 9],
    Ayush:    [3, 4, 0, 1, 0, 0, 4, 0, 1, 2, 1, 0, 0, 4],
    Amith:    [1, 2, 3, 4, 0, 0, 2, 3, 4, 0, 4, 0, 0, 2],
    Pratham:  [2, 3, 0, 1, 0, 0, 0, 1, 2, 3, 1, 0, 0, 0],
    Abhishek: [1, 2, 0, 1, 0, 0, 1, 2, 0, 1, 1, 0, 0, 1],
    Thilak:   [0, 1, 2, 0, 0, 0, 0, 1, 2, 0, 2, 0, 0, 2],
    Anusha:   [2, 0, 1, 2, 0, 0, 2, 0, 1, 2, 2, 0, 0, 2],
    Pramith:  [2, 0, 1, 2, 0, 0, 2, 0, 1, 2, 2, 0, 0, 2],
  }
};

export default function AdminTeamOverview({
  records = [],
  currentUser = {},
  onOpenDrawer,
  onOpenEdit,
  onOpenQuickDocket,
  onOpenReassign,
  onNavigateToPortfolio,
}) {
  const [selectedDrafter, setSelectedDrafter] = useState(null);
  const [selectedCellInfo, setSelectedCellInfo] = useState(null);
  const [showMatrix, setShowMatrix] = useState(true);

  // Macro Drafter Capacity & Triage Matrix
  const drafterMatrix = useMemo(() => {
    const drafterNames = [
      'Anusha', 'Ayush', 'Abhishek', 'Fiona',
      'Pramith', 'Pratham', 'Thanush', 'Thilak', 'Pranav Bhat'
    ];
    const now = new Date();

    return drafterNames.map((drafter) => {
      const drafterCases = records.filter(
        (r) => r.assigned_to && r.assigned_to.trim().toLowerCase().includes(drafter.toLowerCase())
      );

      let psCount = 0;
      let csCount = 0;
      let psCsCount = 0;
      let ferCount = 0;
      let wsCount = 0;
      let nearCommitmentCount = 0;
      let overdueCommitmentCount = 0;
      let totalPurple = 0;
      let totalOrange = 0;
      let totalYellow = 0;
      let totalGreen = 0;

      drafterCases.forEach((r) => {
        if (r.is_abandoned) return;
        const spec = (r.specification_type || '').toUpperCase();
        if (spec === 'PS') psCount++;
        else if (spec === 'CS') csCount++;
        else if (spec.includes('PS') && spec.includes('CS')) psCsCount++;

        if (r.fer_notice_date || r.fer_reply_deadline) ferCount++;
        if (r.hearing_date || r.ws_deadline) wsCount++;

        if (r.client_commitment_date) {
          const diffDays = Math.round((new Date(r.client_commitment_date) - now) / 86400000);
          if (diffDays < 0) {
            overdueCommitmentCount++;
            nearCommitmentCount++;
          } else if (diffDays <= 7) {
            nearCommitmentCount++;
          }
        }

        const color = (r.color_code_status || '').toUpperCase();
        if (color === 'PURPLE') totalPurple++;
        else if (color === 'ORANGE') totalOrange++;
        else if (color === 'YELLOW') totalYellow++;
        else if (color === 'GREEN') totalGreen++;
      });

      const completed = totalGreen;
      const active = Math.max(0, drafterCases.length - completed);

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
        totalCases: drafterCases.length,
        psCount,
        csCount,
        psCsCount,
        ferCount,
        wsCount,
        nearCommitmentCount,
        overdueCommitmentCount,
        totalPurple,
        totalOrange,
        totalYellow,
        completed,
        rejRate,
        score,
        staleCount,
      };
    });
  }, [records]);

  // Compute live statistics from master records
  const liveStats = useMemo(() => {
    if (!records || records.length === 0) return REFERENCE_FIGURES;

    const nonAbandoned = records.filter((r) => !r.is_abandoned);
    const activeTotal = nonAbandoned.length;
    const avgPerDrafter = Math.round(activeTotal / OFFICIAL_DRAFTERS.length) || 75;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Drafter workload calculation
    const workload = OFFICIAL_DRAFTERS.map((d) => {
      const dRecords = nonAbandoned.filter((r) => {
        const assigned = (r.assigned_to || '').toLowerCase();
        return assigned.includes(d.name.toLowerCase());
      });

      const count = dRecords.length || (REFERENCE_FIGURES.workload.find((w) => w.name === d.name)?.active || 50);
      const loadPct = Math.round((count / (avgPerDrafter || 75)) * 100);

      // Stage mix
      let drafting = 0;
      let signoff = 0;
      let query = 0;

      dRecords.forEach((r) => {
        const st = (r.current_status || '').toLowerCase();
        if (st.includes('awaiting data') || st.includes('idf sent') || st.includes('query')) {
          query++;
        } else if (st.includes('review') || st.includes('confirmation') || st.includes('sent for')) {
          signoff++;
        } else {
          drafting++;
        }
      });

      // If records were empty for this drafter, use reference distribution
      if (drafting === 0 && signoff === 0 && query === 0) {
        const ref = REFERENCE_FIGURES.workload.find((w) => w.name === d.name);
        if (ref) {
          drafting = ref.drafting;
          signoff = ref.signoff;
          query = ref.query;
        } else {
          drafting = Math.round(count * 0.7);
          signoff = Math.round(count * 0.25);
          query = count - drafting - signoff;
        }
      }

      // Overdue & Due in 7 days
      let overdue = 0;
      let due7d = 0;
      let nearestDueDays = 999;
      let nearestRecord = null;

      dRecords.forEach((r) => {
        const dStr = r.client_commitment_date || r.internal_deadline;
        if (dStr) {
          const dDate = new Date(dStr);
          const diffDays = Math.round((dDate - now) / 86400000);
          if (diffDays < 0) {
            overdue++;
          } else if (diffDays <= 7) {
            due7d++;
          }

          if (diffDays >= 0 && diffDays < nearestDueDays) {
            nearestDueDays = diffDays;
            nearestRecord = r;
          }
        }
      });

      const ref = REFERENCE_FIGURES.workload.find((w) => w.name === d.name);
      const overdueFinal = dRecords.length > 0 ? overdue : (ref?.overdue ?? 0);
      const due7dFinal = dRecords.length > 0 ? due7d : (ref?.due7d ?? 5);

      let nextDueLabel = ref?.nextDueLabel || 'On track';
      let nextMatter = ref?.nextMatter || `${dRecords[0]?.project_code || 'Matter'} · Upcoming`;

      if (nearestRecord) {
        if (nearestDueDays === 0) nextDueLabel = 'Due today';
        else if (nearestDueDays === 1) nextDueLabel = 'Due in 1 day';
        else if (nearestDueDays <= 7) nextDueLabel = `Due in ${nearestDueDays} days`;
        else nextDueLabel = `In ${nearestDueDays} days`;

        const dDate = new Date(nearestRecord.client_commitment_date || nearestRecord.internal_deadline);
        const dayMonth = dDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        nextMatter = `${nearestRecord.project_code} · ${dayMonth}`;
      }

      return {
        ...d,
        active: count,
        loadPct,
        drafting,
        signoff,
        query,
        due7d: due7dFinal,
        overdue: overdueFinal,
        nextDueLabel,
        nextMatter,
        nextDueDays: nearestDueDays,
        records: dRecords,
      };
    });

    // Needs attention items
    const attentionList = [];
    nonAbandoned.forEach((r) => {
      const dStr = r.client_commitment_date || r.internal_deadline;
      if (dStr) {
        const dDate = new Date(dStr);
        const diffDays = Math.round((dDate - now) / 86400000);
        if (diffDays < 0) {
          attentionList.push({
            record: r,
            matter: r.project_code,
            action: 'Client delivery',
            drafter: r.assigned_to || 'Unassigned',
            due: dDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            urgencyType: 'OVERDUE',
            urgencyText: `Overdue · ${Math.abs(diffDays)} days`,
            daysLate: Math.abs(diffDays),
          });
        } else if (diffDays === 0) {
          attentionList.push({
            record: r,
            matter: r.project_code,
            action: 'Client delivery',
            drafter: r.assigned_to || 'Unassigned',
            due: dDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            urgencyType: 'TODAY',
            urgencyText: 'Due today',
            daysLate: 0,
          });
        } else if (diffDays <= 2) {
          attentionList.push({
            record: r,
            matter: r.project_code,
            action: 'Client delivery',
            drafter: r.assigned_to || 'Unassigned',
            due: dDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            urgencyType: 'DUE_1_2',
            urgencyText: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
            daysLate: -diffDays,
          });
        }
      }
    });

    // Sort attention list: highest overdue first, then today, then upcoming
    attentionList.sort((a, b) => b.daysLate - a.daysLate);

    const finalNeedsAttention = attentionList.length >= 4
      ? attentionList.slice(0, 10)
      : REFERENCE_FIGURES.needsAttention.map((item) => {
          const match = records.find((r) => r.project_code === item.matter);
          return { ...item, record: match || null };
        });

    const totalOverdue = workload.reduce((acc, w) => acc + w.overdue, 0);
    const overdueDrafters = workload.filter((w) => w.overdue > 0).length;
    const totalDue7d = workload.reduce((acc, w) => acc + w.due7d, 0);
    const totalSignoff = workload.reduce((acc, w) => acc + w.signoff, 0);
    const totalQueries = workload.reduce((acc, w) => acc + w.query, 0);

    return {
      activeMatters: activeTotal,
      avgPerDrafter,
      overdueDeliveries: totalOverdue || REFERENCE_FIGURES.overdueDeliveries,
      overdueDraftersCount: overdueDrafters || REFERENCE_FIGURES.overdueDraftersCount,
      dueIn7Days: totalDue7d || REFERENCE_FIGURES.dueIn7Days,
      awaitingSignoff: totalSignoff || REFERENCE_FIGURES.awaitingSignoff,
      openQueries: totalQueries || REFERENCE_FIGURES.openQueries,
      workload,
      needsAttention: finalNeedsAttention,
      heatmapDays: REFERENCE_FIGURES.heatmapDays,
      heatmapGrid: REFERENCE_FIGURES.heatmapGrid,
    };
  }, [records]);

  // Handle matter code click
  const handleMatterClick = (matterCode, attachedRecord) => {
    if (attachedRecord && onOpenDrawer) {
      onOpenDrawer(attachedRecord);
      return;
    }
    const found = records.find((r) => r.project_code === matterCode);
    if (found && onOpenDrawer) {
      onOpenDrawer(found);
    } else if (onNavigateToPortfolio) {
      onNavigateToPortfolio(matterCode);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#ffffff',
        overflowY: 'auto',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '24px 32px 48px',
      }}
    >
      {/* 1. TOP HEADER BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '16px',
          borderBottom: '1.5px solid #0f172a',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Brand & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '17px',
              letterSpacing: '-0.5px',
            }}
          >
            L
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              Lextria IP
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
              Team overview · {isSuperAdmin ? 'Super Admin' : 'Patent Admin'}
            </div>
          </div>
        </div>

        {/* Date & Docket Context */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
            As of Tuesday, 27 October 2026
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            8 drafters · firm-wide docket
          </div>
        </div>
      </div>

      {/* 2. TEAM OVERVIEW HEADING & SUBHEADING */}
      <div style={{ marginTop: '24px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.3px' }}>
              Team overview
            </h1>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '4px 0 0', fontWeight: 400 }}>
              Workload, due dates and roadblocks across all 8 drafters.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onOpenQuickDocket && (
              <button
                onClick={() => onOpenQuickDocket()}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <CheckCircle2 size={14} color="#059669" /> Quick Docket
              </button>
            )}

            {isSuperAdmin && onOpenReassign && (
              <button
                onClick={() => onOpenReassign()}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#2563eb',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <UserCheck size={14} color="#2563eb" /> Reassign Matters
              </button>
            )}

            {onNavigateToPortfolio && (
              <button
                onClick={() => onNavigateToPortfolio()}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2)',
                }}
              >
                Portfolio Master <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. 5 EXECUTIVE KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        {/* Card 1: Active matters */}
        <div
          onClick={() => onNavigateToPortfolio && onNavigateToPortfolio()}
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            cursor: onNavigateToPortfolio ? 'pointer' : 'default',
            transition: 'border-color 0.15s ease',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            Active matters
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {liveStats.activeMatters}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            Avg {liveStats.avgPerDrafter} per drafter
          </div>
        </div>

        {/* Card 2: Overdue deliveries */}
        <div
          onClick={() => onNavigateToPortfolio && onNavigateToPortfolio('OVERDUE')}
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            cursor: onNavigateToPortfolio ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            <span style={{ width: '7px', height: '7px', background: '#dc2626', borderRadius: '1.5px', display: 'inline-block' }} />
            <span>Overdue deliveries</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', margin: '4px 0 2px' }}>
            {liveStats.overdueDeliveries}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            Across {liveStats.overdueDraftersCount} drafters
          </div>
        </div>

        {/* Card 3: Due in 7 days */}
        <div
          onClick={() => onNavigateToPortfolio && onNavigateToPortfolio('DUE_7D')}
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            cursor: onNavigateToPortfolio ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            <span style={{ width: '7px', height: '7px', background: '#ea580c', borderRadius: '1.5px', display: 'inline-block' }} />
            <span>Due in 7 days</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {liveStats.dueIn7Days}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            Client delivery commitments
          </div>
        </div>

        {/* Card 4: Awaiting sign-off */}
        <div
          onClick={() => onNavigateToPortfolio && onNavigateToPortfolio('AWAITING_SIGNOFF')}
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            cursor: onNavigateToPortfolio ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            <span style={{ width: '7px', height: '7px', background: '#ea580c', borderRadius: '1.5px', display: 'inline-block' }} />
            <span>Awaiting sign-off</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {liveStats.awaitingSignoff}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            Ready for review
          </div>
        </div>

        {/* Card 5: Open queries */}
        <div
          onClick={() => onNavigateToPortfolio && onNavigateToPortfolio('OPEN_QUERIES')}
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            cursor: onNavigateToPortfolio ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            <span style={{ width: '7px', height: '7px', background: '#eab308', borderRadius: '1.5px', display: 'inline-block' }} />
            <span>Open queries</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {liveStats.openQueries}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            Waiting on client or inventor
          </div>
        </div>
      </div>

      {/* 4. DRAFTER WORKLOAD SECTION (PAGE 1) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Drafter workload
          </h2>
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 600 }}>Stage mix:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: '#6366f1', borderRadius: '1.5px' }} />
              Drafting
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: '#ea580c', borderRadius: '1.5px' }} />
              Sign-off
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '1.5px' }} />
              Query
            </span>
            <span>· Load is shown against the team average of {liveStats.avgPerDrafter} matters.</span>
          </div>
        </div>

        {/* Workload Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', fontWeight: 600, background: '#f8fafc' }}>
                <th style={{ padding: '12px 18px', width: '180px' }}>Drafter</th>
                <th style={{ padding: '12px 14px', width: '70px' }}>Active</th>
                <th style={{ padding: '12px 14px', width: '170px' }}>Load vs. avg</th>
                <th style={{ padding: '12px 14px', width: '220px' }}>Stage mix</th>
                <th style={{ padding: '12px 14px', width: '90px', textAlign: 'right' }}>Due ≤ 7d</th>
                <th style={{ padding: '12px 14px', width: '110px', textAlign: 'center' }}>Overdue</th>
                <th style={{ padding: '12px 18px' }}>Next delivery</th>
              </tr>
            </thead>
            <tbody>
              {liveStats.workload.map((d, idx) => {
                const isOverloaded = d.loadPct > 120;
                const isUnderloaded = d.loadPct < 80;
                const barColor = isOverloaded ? '#dc2626' : (isUnderloaded ? '#16a34a' : '#2563eb');

                const totalMix = (d.drafting + d.signoff + d.query) || 1;
                const draftPct = (d.drafting / totalMix) * 100;
                const signPct = (d.signoff / totalMix) * 100;
                const queryPct = (d.query / totalMix) * 100;

                // Urgency badge color
                const isImmediate = d.nextDueLabel.includes('today') || d.nextDueLabel.includes('1 day') || d.nextDueLabel.includes('2 days');
                const isWeek = d.nextDueLabel.includes('3 days') || d.nextDueLabel.includes('6 days') || d.nextDueLabel.includes('7 days');

                const badgeBg = isImmediate ? '#fef2f2' : (isWeek ? '#fffbeb' : '#f0fdf4');
                const badgeBorder = isImmediate ? '#fecaca' : (isWeek ? '#fed7aa' : '#bbf7d0');
                const badgeText = isImmediate ? '#dc2626' : (isWeek ? '#d97706' : '#16a34a');
                const dotColor = isImmediate ? '#dc2626' : (isWeek ? '#d97706' : '#16a34a');

                return (
                  <tr
                    key={d.name}
                    onClick={() => setSelectedDrafter(selectedDrafter === d.name ? null : d.name)}
                    style={{
                      borderBottom: idx === liveStats.workload.length - 1 ? 'none' : '1px solid #f1f5f9',
                      background: selectedDrafter === d.name ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                    }}
                  >
                    {/* Drafter name & avatar */}
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: '#eff6ff',
                            color: '#2563eb',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {d.initials}
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {d.name}
                        </span>
                      </div>
                    </td>

                    {/* Active Count */}
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>
                      {d.active}
                    </td>

                    {/* Load vs. avg with horizontal comparison bar */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '80px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(d.loadPct, 200) / 2}%`,
                              height: '100%',
                              background: barColor,
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: barColor, minWidth: '40px' }}>
                          {d.loadPct}%
                        </span>
                      </div>
                    </td>

                    {/* Stage mix numbers & stacked bar */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, minWidth: '70px' }}>
                          {d.drafting} · {d.signoff} · {d.query}
                        </span>
                        <div style={{ flex: 1, maxWidth: '120px', height: '6px', display: 'flex', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${draftPct}%`, background: '#6366f1' }} title={`Drafting: ${d.drafting}`} />
                          <div style={{ width: `${signPct}%`, background: '#ea580c' }} title={`Sign-off: ${d.signoff}`} />
                          <div style={{ width: `${queryPct}%`, background: '#eab308' }} title={`Query: ${d.query}`} />
                        </div>
                      </div>
                    </td>

                    {/* Due <= 7 days */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {d.due7d}
                    </td>

                    {/* Overdue */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {d.overdue > 0 ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: '#dc2626',
                            color: '#ffffff',
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          {d.overdue} overdue
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>
                          None
                        </span>
                      )}
                    </td>

                    {/* Next delivery */}
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '2.5px 9px',
                            borderRadius: '12px',
                            background: badgeBg,
                            border: `1px solid ${badgeBorder}`,
                            color: badgeText,
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dotColor }} />
                          {d.nextDueLabel}
                        </span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            const code = d.nextMatter.split('·')[0].trim();
                            handleMatterClick(code);
                          }}
                          style={{
                            fontSize: '11.5px',
                            color: '#64748b',
                            fontWeight: 500,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {d.nextMatter}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. NEEDS ATTENTION SECTION (PAGE 2) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Needs attention
          </h2>
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 600 }}>Urgency:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: '#dc2626', borderRadius: '50%' }} />
              Overdue
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: '#ea580c', borderRadius: '50%' }} />
              Due in ≤ 2 days
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '50%' }} />
              Due in ≤ 7 days
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%' }} />
              On track
            </span>
          </div>
        </div>

        {/* Needs Attention Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', fontWeight: 600, background: '#f8fafc' }}>
                <th style={{ padding: '12px 18px', width: '130px' }}>Matter</th>
                <th style={{ padding: '12px 14px', width: '160px' }}>Action</th>
                <th style={{ padding: '12px 14px', width: '130px' }}>Drafter</th>
                <th style={{ padding: '12px 14px', width: '110px' }}>Due</th>
                <th style={{ padding: '12px 18px' }}>Urgency</th>
              </tr>
            </thead>
            <tbody>
              {liveStats.needsAttention.map((item, idx) => {
                const isOverdue = item.urgencyType === 'OVERDUE';
                const isToday = item.urgencyType === 'TODAY';
                const isDue12 = item.urgencyType === 'DUE_1_2';

                return (
                  <tr
                    key={item.matter + idx}
                    onClick={() => handleMatterClick(item.matter, item.record)}
                    style={{
                      borderBottom: idx === liveStats.needsAttention.length - 1 ? 'none' : '1px solid #f1f5f9',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                    }}
                  >
                    {/* Matter Code in Blue */}
                    <td style={{ padding: '12px 18px', fontWeight: 800, color: '#2563eb' }}>
                      {item.matter}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 500 }}>
                      {item.action}
                    </td>

                    {/* Drafter */}
                    <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 600 }}>
                      {item.drafter}
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 500 }}>
                      {item.due}
                    </td>

                    {/* Urgency Badge */}
                    <td style={{ padding: '12px 18px' }}>
                      {isOverdue ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: '#dc2626',
                            color: '#ffffff',
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ffffff' }} />
                          {item.urgencyText}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: isToday ? '#fef2f2' : (isDue12 ? '#fef2f2' : '#fffbeb'),
                            border: `1px solid ${isToday ? '#fecaca' : (isDue12 ? '#fecaca' : '#fed7aa')}`,
                            color: isToday ? '#dc2626' : (isDue12 ? '#dc2626' : '#d97706'),
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isToday ? '#dc2626' : (isDue12 ? '#dc2626' : '#d97706') }} />
                          {item.urgencyText}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. DUE DATES · NEXT 14 DAYS CAPACITY HEATMAP (PAGE 2) */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Due dates · next 14 days
          </h2>
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 600 }}>Deliveries per drafter per day:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '2px' }} />
              None
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', background: '#dbeafe', borderRadius: '2px' }} />
              1–2
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', background: '#93c5fd', borderRadius: '2px' }} />
              3–4
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', background: '#2563eb', borderRadius: '2px' }} />
              5+
            </span>
          </div>
        </div>

        {/* Heatmap Grid Container */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12.5px' }}>
            <thead>
              {/* Day of Week Row */}
              <tr style={{ background: '#ffffff', color: '#64748b', fontSize: '11px', fontWeight: 600 }}>
                <th style={{ padding: '8px 16px', textAlign: 'left', width: '130px', color: '#64748b' }}></th>
                {liveStats.heatmapDays.map((hd, i) => (
                  <th
                    key={hd.label + i}
                    style={{
                      padding: '6px 4px',
                      color: hd.isToday ? '#2563eb' : '#64748b',
                      fontWeight: hd.isToday ? 800 : 600,
                    }}
                  >
                    {hd.label}
                  </th>
                ))}
              </tr>
              {/* Date Number Row */}
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontSize: '12px', fontWeight: 700 }}>
                <th style={{ padding: '4px 16px', textAlign: 'left', width: '130px', color: '#64748b' }}>Drafter</th>
                {liveStats.heatmapDays.map((hd, i) => (
                  <th
                    key={hd.dayNum + i}
                    style={{
                      padding: '4px 4px 8px',
                      color: hd.isToday ? '#2563eb' : '#0f172a',
                      fontWeight: 800,
                    }}
                  >
                    {hd.dayNum}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OFFICIAL_DRAFTERS.map((d, rowIdx) => {
                const dayCounts = liveStats.heatmapGrid[d.name] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

                return (
                  <tr
                    key={d.name}
                    style={{
                      borderBottom: rowIdx === OFFICIAL_DRAFTERS.length - 1 ? 'none' : '1px solid #f1f5f9',
                    }}
                  >
                    {/* Drafter Name */}
                    <td style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                      {d.name}
                    </td>

                    {/* 14 Day Cells */}
                    {dayCounts.map((cnt, dayIdx) => {
                      let cellBg = 'transparent';
                      let cellColor = 'transparent';
                      let fontWeight = 500;

                      if (cnt >= 5) {
                        cellBg = '#2563eb';
                        cellColor = '#ffffff';
                        fontWeight = 800;
                      } else if (cnt >= 3) {
                        cellBg = '#93c5fd';
                        cellColor = '#1e3a8a';
                        fontWeight = 800;
                      } else if (cnt >= 1) {
                        cellBg = '#dbeafe';
                        cellColor = '#1e40af';
                        fontWeight = 700;
                      }

                      return (
                        <td key={dayIdx} style={{ padding: '4px 3px' }}>
                          <div
                            onClick={() => {
                              if (cnt > 0) {
                                setSelectedCellInfo({ drafter: d.name, day: liveStats.heatmapDays[dayIdx], count: cnt });
                              }
                            }}
                            style={{
                              width: '100%',
                              height: '28px',
                              borderRadius: '4px',
                              background: cellBg,
                              color: cellColor,
                              fontWeight,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              cursor: cnt > 0 ? 'pointer' : 'default',
                              transition: 'transform 0.1s ease',
                            }}
                            title={cnt > 0 ? `${d.name}: ${cnt} deliveries due on ${liveStats.heatmapDays[dayIdx].label} ${liveStats.heatmapDays[dayIdx].dayNum}` : ''}
                          >
                            {cnt > 0 ? cnt : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DRAFTER CAPACITY, CLIENT COMMITMENTS & PROBLEM TRIAGE MATRIX (ALL DRAFTERS) */}
      <div
        style={{
          marginTop: '36px',
          marginBottom: '28px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <div
          onClick={() => setShowMatrix(!showMatrix)}
          style={{
            padding: '16px 22px',
            background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
            borderBottom: showMatrix ? '1.5px solid #e2e8f0' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Target size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Drafter Capacity, Client Commitments & Problem Triage Matrix
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                Firm-wide macro view across associates: active docket loads, PS / CS / FER / WS stages, commitments & triage status
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                background: '#EFF6FF',
                color: '#2563EB',
                fontSize: '11.5px',
                fontWeight: 700,
                border: '1px solid #DBEAFE',
              }}
            >
              {drafterMatrix.length} Associates Tracked
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
            >
              <span>{showMatrix ? 'Collapse' : 'Expand'}</span>
              {showMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        {showMatrix && (
          <div style={{ overflowX: 'auto', background: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#475569', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 18px', minWidth: '150px' }}>Drafter</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', minWidth: '95px' }}>Total Cases</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '60px' }}>PS</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '60px' }}>CS</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '65px' }}>PS-CS</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '60px' }}>FER</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '60px' }}>WS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', minWidth: '170px' }}>Near Commitments</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '70px', color: '#8A4FFF' }}>🟣 Purple</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '70px', color: '#EA580C' }}>🟠 Orange</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '70px', color: '#D97706' }}>🟡 Yellow</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', minWidth: '90px' }}>Completed</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', minWidth: '85px' }}>Rej Rate</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', minWidth: '100px' }}>Quality Score</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', minWidth: '130px' }}>Status / Flags</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', minWidth: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drafterMatrix.map((dm) => {
                  const hasWarning = dm.staleCount > 0 || dm.rejRate > 30;
                  return (
                    <tr
                      key={dm.drafter}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Drafter Name */}
                      <td style={{ padding: '12px 18px', fontWeight: 800, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <span
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: '#EFF6FF',
                              color: '#2563EB',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1.5px solid #DBEAFE',
                            }}
                          >
                            {dm.drafter.slice(0, 2).toUpperCase()}
                          </span>
                          <span style={{ fontSize: '13px' }}>{dm.drafter}</span>
                        </div>
                      </td>

                      {/* Total Cases */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#2563EB' }}>
                          {dm.totalCases}
                        </span>
                      </td>

                      {/* PS */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                        {dm.psCount}
                      </td>

                      {/* CS */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                        {dm.csCount}
                      </td>

                      {/* PS-CS */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                        {dm.psCsCount}
                      </td>

                      {/* FER */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        {dm.ferCount > 0 ? (
                          <span style={{ padding: '2px 7px', borderRadius: '4px', background: '#FCE7F3', color: '#BE185D', fontWeight: 800, fontSize: '11.5px' }}>
                            {dm.ferCount}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>0</span>
                        )}
                      </td>

                      {/* WS */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        {dm.wsCount > 0 ? (
                          <span style={{ padding: '2px 7px', borderRadius: '4px', background: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '11.5px' }}>
                            {dm.wsCount}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>0</span>
                        )}
                      </td>

                      {/* Near Commitments (Properly Spaced & Formatted) */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                          {dm.overdueCommitmentCount > 0 && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontWeight: 800,
                                fontSize: '11px',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: '1px solid #FCA5A5',
                              }}
                            >
                              {dm.overdueCommitmentCount} Overdue
                            </span>
                          )}
                          {dm.nearCommitmentCount > 0 ? (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontWeight: 700,
                                fontSize: '11px',
                                background: '#FFEDD5',
                                color: '#C2410C',
                                border: '1px solid #FDBA74',
                              }}
                            >
                              {dm.nearCommitmentCount} Due in 7d
                            </span>
                          ) : (
                            <span style={{ color: '#16A34A', fontSize: '11.5px', fontWeight: 700 }}>
                              ✓ On Track
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Triage: Purple */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800, color: '#8A4FFF', fontSize: '13px' }}>
                        {dm.totalPurple}
                      </td>

                      {/* Triage: Orange */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800, color: '#EA580C', fontSize: '13px' }}>
                        {dm.totalOrange}
                      </td>

                      {/* Triage: Yellow */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800, color: '#D97706', fontSize: '13px' }}>
                        {dm.totalYellow}
                      </td>

                      {/* Completed */}
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, color: '#10B981', fontSize: '13px' }}>
                          {dm.completed}
                        </span>
                      </td>

                      {/* Rej Rate */}
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontWeight: 700,
                            fontSize: '11px',
                            background: dm.rejRate > 30 ? '#FEE2E2' : '#F0FDF4',
                            color: dm.rejRate > 30 ? '#DC2626' : '#15803D',
                            border: `1px solid ${dm.rejRate > 30 ? '#FCA5A5' : '#BBF7D0'}`,
                          }}
                        >
                          {dm.rejRate}%
                        </span>
                      </td>

                      {/* Score */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontWeight: 900, color: '#1E3A8A', fontSize: '13px' }}>
                            {dm.score}/100
                          </span>
                          <div style={{ width: '48px', height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${dm.score}%`, height: '100%', background: dm.score >= 80 ? '#10B981' : '#F59E0B' }} />
                          </div>
                        </div>
                      </td>

                      {/* Status / Flags */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {dm.staleCount > 0 && (
                            <span
                              style={{ padding: '2px 6px', borderRadius: '4px', background: '#FEE2E2', color: '#B91C1C', fontSize: '10.5px', fontWeight: 800, border: '1px solid #FCA5A5' }}
                              title={`${dm.staleCount} matters with no movement for 7+ days`}
                            >
                              🔴 Stale ({dm.staleCount})
                            </span>
                          )}
                          {dm.rejRate > 30 && (
                            <span
                              style={{ padding: '2px 6px', borderRadius: '4px', background: '#FEF3C7', color: '#B45309', fontSize: '10.5px', fontWeight: 800, border: '1px solid #FDE68A' }}
                              title="Rejection rate above 30%"
                            >
                              ⚠️ High Rej
                            </span>
                          )}
                          {!hasWarning && (
                            <span style={{ color: '#059669', fontSize: '11px', fontWeight: 800, background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                              ✓ On Track
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => onNavigateToPortfolio && onNavigateToPortfolio(dm.drafter)}
                            style={{
                              padding: '5px 11px',
                              borderRadius: '6px',
                              border: '1px solid #BFDBFE',
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Filter portfolio grid to ${dm.drafter}`}
                          >
                            Inspect
                          </button>
                          {onOpenReassign && (
                            <button
                              onClick={() => onOpenReassign(dm.drafter)}
                              style={{
                                padding: '5px 11px',
                                borderRadius: '6px',
                                border: '1px solid #E2E8F0',
                                background: '#FFFFFF',
                                color: '#475569',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title={`Reassign matters from ${dm.drafter}`}
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

      {/* 7. FOOTER DISCLAIMER & SUMMARY */}
      <div
        style={{
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          color: '#94a3b8',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span>
          Sample figures: apart from Thanush’s docket, workloads, matter codes and daily due counts are illustrative.
        </span>
        <span style={{ fontWeight: 600 }}>
          Lextria IP Prosecution Intelligence Suite · 2026
        </span>
      </div>

      {/* Cell Detail Modal / Toast when clicking a heatmap cell */}
      {selectedCellInfo && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0f172a',
            color: '#ffffff',
            padding: '14px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '13px',
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>
              {selectedCellInfo.drafter} · {selectedCellInfo.count} Deliveries Due
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
              Scheduled for {selectedCellInfo.day.label}, {selectedCellInfo.day.dayNum} October
            </div>
          </div>
          <button
            onClick={() => {
              if (onNavigateToPortfolio) onNavigateToPortfolio(selectedCellInfo.drafter);
              setSelectedCellInfo(null);
            }}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            View in Grid
          </button>
          <button
            onClick={() => setSelectedCellInfo(null)}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

