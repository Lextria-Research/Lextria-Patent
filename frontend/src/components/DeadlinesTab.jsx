// frontend/src/components/DeadlinesTab.jsx
import React, { useState, useMemo } from 'react';
import {
  CheckSquare, Square, Clock, AlertTriangle, AlertCircle,
  Calendar, CheckCircle2, Search, Filter, User, ExternalLink,
  ChevronRight, RefreshCw, Shield, FileText, Check
} from 'lucide-react';

export default function DeadlinesTab({
  records = [],
  currentUser,
  onOpenDrawer,
  onOpenTimeline,
  onActionComplete,
  onNavigateToCalendar,
  onNavigateToPortfolio,
  onOpenAuditTrail,
}) {
  const [filterCategory, setFilterCategory] = useState('ALL'); // ALL, CS, FER, WS, FORMS, RENEWALS
  const [filterUrgency, setFilterUrgency] = useState('PENDING'); // ALL, PENDING, OVERDUE, NEXT_7, NEXT_30, COMPLETED
  const [searchQuery, setSearchQuery] = useState('');
  const [completedMap, setCompletedMap] = useState(() => {
    try {
      const saved = localStorage.getItem('patent_completed_deadlines');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const now = new Date();

  // Extract all action items across the applications
  const allActionItems = useMemo(() => {
    const items = [];

    records.forEach((r) => {
      // 1. Complete Specification (CS) Deadline
      if (r.cs_deadline && !r.is_abandoned) {
        const isDone = !!r.cs_filing_date || !!completedMap[`${r.project_code}_CS`];
        const dueDt = new Date(r.cs_deadline);
        const diffDays = Math.ceil((dueDt - now) / 86400000);

        items.push({
          id: `${r.project_code}_CS`,
          project_code: r.project_code,
          application_number: r.application_number,
          title: r.title,
          assigned_to: r.assigned_to,
          type: 'CS',
          typeLabel: 'Complete Specification (CS)',
          actionText: `File Complete Specification for ${r.project_code} before 12-month statutory bar`,
          statutoryRef: 'Section 9(1), Patents Act 1970',
          dueDate: r.cs_deadline,
          diffDays,
          isCompleted: isDone,
          completedAt: completedMap[`${r.project_code}_CS`]?.completedAt,
          completedBy: completedMap[`${r.project_code}_CS`]?.completedBy,
          record: r,
        });
      }

      // 2. FER Reply Deadline
      if (r.fer_reply_deadline && !r.is_abandoned) {
        const isDone = !!r.fer_reply_filing_date || !!completedMap[`${r.project_code}_FER`];
        const dueDt = new Date(r.fer_reply_deadline);
        const diffDays = Math.ceil((dueDt - now) / 86400000);

        items.push({
          id: `${r.project_code}_FER`,
          project_code: r.project_code,
          application_number: r.application_number,
          title: r.title,
          assigned_to: r.assigned_to,
          type: 'FER',
          typeLabel: 'FER Response',
          actionText: `Submit FER Reply addressing examiner objections for ${r.project_code}`,
          statutoryRef: 'Section 21(1) & Rule 24B(5)',
          dueDate: r.fer_reply_deadline,
          diffDays,
          isCompleted: isDone,
          completedAt: completedMap[`${r.project_code}_FER`]?.completedAt,
          completedBy: completedMap[`${r.project_code}_FER`]?.completedBy,
          record: r,
        });
      }

      // 3. Controller Hearing Written Submissions (WS)
      if (r.ws_deadline && !r.is_abandoned) {
        const isDone = !!r.ws_filing_date || !!completedMap[`${r.project_code}_WS`];
        const dueDt = new Date(r.ws_deadline);
        const diffDays = Math.ceil((dueDt - now) / 86400000);

        items.push({
          id: `${r.project_code}_WS`,
          project_code: r.project_code,
          application_number: r.application_number,
          title: r.title,
          assigned_to: r.assigned_to,
          type: 'WS',
          typeLabel: 'Hearing Written Submission',
          actionText: `File Written Submissions post-hearing for ${r.project_code} within 15 days`,
          statutoryRef: 'Rule 28(7), Patent Rules 2003',
          dueDate: r.ws_deadline,
          diffDays,
          isCompleted: isDone,
          completedAt: completedMap[`${r.project_code}_WS`]?.completedAt,
          completedBy: completedMap[`${r.project_code}_WS`]?.completedBy,
          record: r,
        });
      }

      // 4. Form 1 Proof of Right
      if (r.form_1_deadline && !r.is_abandoned) {
        const isDone = r.f1_status === 'Within Deadline' || !!r.form_1_filing_date || !!completedMap[`${r.project_code}_F1`];
        const dueDt = new Date(r.form_1_deadline);
        const diffDays = Math.ceil((dueDt - now) / 86400000);

        items.push({
          id: `${r.project_code}_F1`,
          project_code: r.project_code,
          application_number: r.application_number,
          title: r.title,
          assigned_to: r.assigned_to,
          type: 'FORMS',
          typeLabel: 'Form 1 (Proof of Right)',
          actionText: `Submit Form 1 & Assignment Deed for ${r.project_code}`,
          statutoryRef: 'Rule 10, Patent Rules 2003 (6 Months)',
          dueDate: r.form_1_deadline,
          diffDays,
          isCompleted: isDone,
          completedAt: completedMap[`${r.project_code}_F1`]?.completedAt,
          completedBy: completedMap[`${r.project_code}_F1`]?.completedBy,
          record: r,
        });
      }

      // 5. Form 26 Power of Attorney
      if (r.form_26_deadline && !r.is_abandoned) {
        const isDone = r.f26_status === 'Within Deadline' || !!r.form_26_filing_date || !!completedMap[`${r.project_code}_F26`];
        const dueDt = new Date(r.form_26_deadline);
        const diffDays = Math.ceil((dueDt - now) / 86400000);

        items.push({
          id: `${r.project_code}_F26`,
          project_code: r.project_code,
          application_number: r.application_number,
          title: r.title,
          assigned_to: r.assigned_to,
          type: 'FORMS',
          typeLabel: 'Form 26 (Power of Attorney)',
          actionText: `File Executed Form 26 POA by Client for ${r.project_code}`,
          statutoryRef: 'Rule 135, Patent Rules 2003 (3 Months)',
          dueDate: r.form_26_deadline,
          diffDays,
          isCompleted: isDone,
          completedAt: completedMap[`${r.project_code}_F26`]?.completedAt,
          completedBy: completedMap[`${r.project_code}_F26`]?.completedBy,
          record: r,
        });
      }

      // 6. Renewal Annuities
      if (r.next_renewal_date && !r.is_abandoned) {
        const isDone = !!completedMap[`${r.project_code}_ANNUITY`];
        const dueDt = new Date(r.next_renewal_date);
        const diffDays = Math.ceil((dueDt - now) / 86400000);

        items.push({
          id: `${r.project_code}_ANNUITY`,
          project_code: r.project_code,
          application_number: r.application_number,
          title: r.title,
          assigned_to: r.assigned_to,
          type: 'RENEWALS',
          typeLabel: 'Annuity Renewal',
          actionText: `Pay Annual Renewal Fee for Patent IN ${r.patent_number || r.project_code}`,
          statutoryRef: 'Section 142, Patents Act 1970',
          dueDate: r.next_renewal_date,
          diffDays,
          isCompleted: isDone,
          completedAt: completedMap[`${r.project_code}_ANNUITY`]?.completedAt,
          completedBy: completedMap[`${r.project_code}_ANNUITY`]?.completedBy,
          record: r,
        });
      }
    });

    // Sort by due date ascending (most urgent first)
    return items.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [records, completedMap]);

  // Toggle Action Completion
  const handleToggle = (item) => {
    const newCompleted = !item.isCompleted;
    const updated = { ...completedMap };

    if (newCompleted) {
      updated[item.id] = {
        completedAt: new Date().toISOString(),
        completedBy: currentUser?.name || 'Authorized Staff',
      };
    } else {
      delete updated[item.id];
    }

    setCompletedMap(updated);
    localStorage.setItem('patent_completed_deadlines', JSON.stringify(updated));

    if (onActionComplete) {
      onActionComplete(item, newCompleted);
    }
  };

  // Filtered action items
  const filteredItems = useMemo(() => {
    return allActionItems.filter((item) => {
      // Category filter
      if (filterCategory !== 'ALL' && item.type !== filterCategory) return false;

      // Urgency filter
      if (filterUrgency === 'PENDING' && item.isCompleted) return false;
      if (filterUrgency === 'COMPLETED' && !item.isCompleted) return false;
      if (filterUrgency === 'OVERDUE' && (item.isCompleted || item.diffDays >= 0)) return false;
      if (filterUrgency === 'NEXT_7' && (item.isCompleted || item.diffDays < 0 || item.diffDays > 7)) return false;
      if (filterUrgency === 'NEXT_30' && (item.isCompleted || item.diffDays < 0 || item.diffDays > 30)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.project_code.toLowerCase().includes(q) ||
          (item.application_number && item.application_number.toLowerCase().includes(q)) ||
          item.actionText.toLowerCase().includes(q) ||
          (item.assigned_to && item.assigned_to.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allActionItems, filterCategory, filterUrgency, searchQuery]);

  // Summary counts
  const pendingCount = allActionItems.filter((i) => !i.isCompleted).length;
  const overdueCount = allActionItems.filter((i) => !i.isCompleted && i.diffDays < 0).length;
  const next7Count = allActionItems.filter((i) => !i.isCompleted && i.diffDays >= 0 && i.diffDays <= 7).length;
  const completedCount = allActionItems.filter((i) => i.isCompleted).length;

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
      {/* Top Banner / Metrics */}
      {/* Top Header Section Matching Reference UI Design Page 2 */}
      <div
        style={{
          padding: '16px 22px 14px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: 'var(--ink)', letterSpacing: '-0.3px' }}>
            Statutory deadlines
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '3px 0 0' }}>
            Tick each action once it’s filed at the IPO. Every tick is recorded in the firm-wide compliance audit trail.{' '}
            <span
              onClick={onOpenAuditTrail}
              style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              View audit trail
            </span>
          </p>
        </div>

        {/* 4 Summary Cards Across Top */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {/* 1. Overdue */}
          <div
            onClick={() => setFilterUrgency(filterUrgency === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: filterUrgency === 'OVERDUE' ? '1.5px solid #DC2626' : '1px solid var(--line)',
              background: filterUrgency === 'OVERDUE' ? 'rgba(220, 38, 38, 0.08)' : 'var(--page)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
              Overdue
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: overdueCount > 0 ? '#DC2626' : 'var(--ink)', lineHeight: 1.1 }}>
              {overdueCount}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
              Past the statutory date
            </div>
          </div>

          {/* 2. Due in 7 days */}
          <div
            onClick={() => setFilterUrgency(filterUrgency === 'NEXT_7' ? 'ALL' : 'NEXT_7')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: filterUrgency === 'NEXT_7' ? '1.5px solid #EA580C' : '1px solid var(--line)',
              background: filterUrgency === 'NEXT_7' ? 'rgba(234, 88, 12, 0.08)' : 'var(--page)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
              Due in 7 days
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: next7Count > 0 ? '#EA580C' : 'var(--ink)', lineHeight: 1.1 }}>
              {next7Count}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
              File this week
            </div>
          </div>

          {/* 3. Pending */}
          <div
            onClick={() => setFilterUrgency(filterUrgency === 'PENDING' ? 'ALL' : 'PENDING')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: filterUrgency === 'PENDING' ? '1.5px solid #2563EB' : '1px solid var(--line)',
              background: filterUrgency === 'PENDING' ? 'rgba(37, 99, 235, 0.08)' : 'var(--page)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
              Pending
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563EB', lineHeight: 1.1 }}>
              {pendingCount}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
              All open actions
            </div>
          </div>

          {/* 4. Completed */}
          <div
            onClick={() => setFilterUrgency(filterUrgency === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: filterUrgency === 'COMPLETED' ? '1.5px solid #059669' : '1px solid var(--line)',
              background: filterUrgency === 'COMPLETED' ? 'rgba(5, 150, 105, 0.08)' : 'var(--page)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
              Completed
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>
              {completedCount}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
              Filed and ticked off
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          padding: '12px 22px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search deadlines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--page)',
              color: 'var(--ink)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>

        {/* Category Filter Pills Matching Reference UI Design Page 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All types' },
            { id: 'CS', label: 'Complete spec (CS)' },
            { id: 'FER', label: 'FER objections' },
            { id: 'WS', label: 'Hearing WS' },
            { id: 'FORMS', label: 'Forms 1 & 26' },
            { id: 'RENEWALS', label: 'Annuity renewals' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: filterCategory === cat.id ? 'var(--accent)' : 'var(--page)',
                color: filterCategory === cat.id ? '#fff' : 'var(--muted)',
                fontSize: '11.5px',
                fontWeight: filterCategory === cat.id ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Checklist Items List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '440px', margin: '0 auto' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>
              You’re all caught up
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              No pending statutory actions match any statutory type. New deadlines appear here automatically as matters progress.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {onNavigateToCalendar && (
                <button
                  onClick={onNavigateToCalendar}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '7px',
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  View calendar
                </button>
              )}
              {onNavigateToPortfolio && (
                <button
                  onClick={onNavigateToPortfolio}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '7px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Back to portfolio
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredItems.map((item) => {
              const isOverdue = !item.isCompleted && item.diffDays < 0;
              const isDueSoon = !item.isCompleted && item.diffDays >= 0 && item.diffDays <= 7;

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: item.isCompleted
                      ? '1px solid var(--line)'
                      : isOverdue
                      ? '1px solid rgba(239, 68, 68, 0.35)'
                      : isDueSoon
                      ? '1px solid rgba(245, 158, 11, 0.35)'
                      : '1px solid var(--line)',
                    background: item.isCompleted
                      ? 'var(--page)'
                      : isOverdue
                      ? 'rgba(239, 68, 68, 0.08)'
                      : isDueSoon
                      ? 'rgba(245, 158, 11, 0.08)'
                      : 'var(--surface)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Left: Tick Box + Action Details */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                    <button
                      onClick={() => handleToggle(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: item.isCompleted ? '#10B981' : 'var(--muted)',
                        padding: '2px',
                        marginTop: '2px',
                      }}
                      title={item.isCompleted ? 'Mark as Pending' : 'Mark as Filed / Done'}
                    >
                      {item.isCompleted ? (
                        <CheckSquare size={20} color="#10B981" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 900,
                            color: 'var(--accent)',
                            letterSpacing: '-0.2px',
                          }}
                        >
                          {item.project_code}
                        </span>

                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--page)',
                            border: '1px solid var(--line)',
                            color: 'var(--muted)',
                          }}
                        >
                          {item.typeLabel}
                        </span>

                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                          {item.statutoryRef}
                        </span>

                        {item.assigned_to && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(139, 92, 246, 0.15)',
                              color: '#A78BFA',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                            }}
                          >
                            Drafter: {item.assigned_to}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: item.isCompleted ? 'var(--muted)' : 'var(--ink)',
                          textDecoration: item.isCompleted ? 'line-through' : 'none',
                          marginTop: '4px',
                        }}
                      >
                        {item.actionText}
                      </div>

                      {item.isCompleted && item.completedBy && (
                        <div style={{ fontSize: '11px', color: '#059669', marginTop: '3px', fontWeight: 600 }}>
                          ✓ Marked filed by {item.completedBy} on {new Date(item.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Deadline Date & Quick Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: item.isCompleted
                            ? 'var(--muted)'
                            : isOverdue
                            ? '#DC2626'
                            : isDueSoon
                            ? '#D97706'
                            : 'var(--ink)',
                        }}
                      >
                        {item.dueDate}
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: item.isCompleted
                            ? '#059669'
                            : isOverdue
                            ? '#DC2626'
                            : isDueSoon
                            ? '#D97706'
                            : 'var(--muted)',
                        }}
                      >
                        {item.isCompleted
                          ? 'FILED'
                          : isOverdue
                          ? `${Math.abs(item.diffDays)} days OVERDUE`
                          : item.diffDays === 0
                          ? 'DUE TODAY'
                          : `${item.diffDays} days left`}
                      </div>
                    </div>

                    {/* Timeline button */}
                    <button
                      onClick={() => onOpenTimeline && onOpenTimeline(item.record)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Open Prosecution Timeline"
                    >
                      <Clock size={12} /> Timeline
                    </button>

                    {/* View Details */}
                    <button
                      onClick={() => onOpenDrawer && onOpenDrawer(item.record)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      View <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
