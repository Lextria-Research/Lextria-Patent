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
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--page)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
            Statutory Deadlines & Action Checklist
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
            Tick actions when filed at IPO to maintain firm-wide compliance audit trail
          </p>
        </div>

        {/* Metric Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            onClick={() => setFilterUrgency('OVERDUE')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#FEE2E2',
              color: '#DC2626',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              border: filterUrgency === 'OVERDUE' ? '2px solid #DC2626' : '1px solid transparent',
            }}
          >
            {overdueCount} Overdue
          </div>

          <div
            onClick={() => setFilterUrgency('NEXT_7')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#FEF3C7',
              color: '#D97706',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              border: filterUrgency === 'NEXT_7' ? '2px solid #D97706' : '1px solid transparent',
            }}
          >
            {next7Count} Due in 7 Days
          </div>

          <div
            onClick={() => setFilterUrgency('PENDING')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#EFF6FF',
              color: '#2563EB',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              border: filterUrgency === 'PENDING' ? '2px solid #2563EB' : '1px solid transparent',
            }}
          >
            {pendingCount} Pending Total
          </div>

          <div
            onClick={() => setFilterUrgency('COMPLETED')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#ECFDF5',
              color: '#059669',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              border: filterUrgency === 'COMPLETED' ? '2px solid #059669' : '1px solid transparent',
            }}
          >
            {completedCount} Completed
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          padding: '12px 20px',
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
            placeholder="Search code, action, drafter..."
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

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'ALL', label: 'All Statutory Types' },
            { id: 'CS', label: 'Complete Spec (CS)' },
            { id: 'FER', label: 'FER Objections' },
            { id: 'WS', label: 'Hearing WS' },
            { id: 'FORMS', label: 'Forms 1 & 26' },
            { id: 'RENEWALS', label: 'Annuity Renewals' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                background: filterCategory === cat.id ? 'var(--accent)' : 'var(--page)',
                color: filterCategory === cat.id ? '#fff' : 'var(--muted)',
                fontSize: '11px',
                fontWeight: filterCategory === cat.id ? 800 : 600,
                cursor: 'pointer',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Checklist Items List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
              All Caught Up!
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              No pending statutory deadline actions matching the active filters.
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
                      ? '1px solid #FCA5A5'
                      : isDueSoon
                      ? '1px solid #FDE68A'
                      : '1px solid var(--line)',
                    background: item.isCompleted
                      ? 'var(--page)'
                      : isOverdue
                      ? '#FEF2F2'
                      : isDueSoon
                      ? '#FFFBEB'
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
                              background: '#EDE9FE',
                              color: '#7C3AED',
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
