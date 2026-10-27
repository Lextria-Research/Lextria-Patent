// frontend/src/components/FormalitiesDocket.jsx
import React, { useState, useMemo } from 'react';
import {
  FileWarning, Clock, AlertTriangle, CheckCircle2, Shield,
  Search, Filter, ExternalLink, Calendar, RefreshCw, AlertCircle,
  FileText, Download, CheckSquare, Edit3, ArrowRight
} from 'lucide-react';

export default function FormalitiesDocket({
  records = [],
  currentUser,
  onOpenDrawer,
  onOpenEdit,
  onOpenQuickDocket,
  onOpenTimeline,
}) {
  const [activeSection, setActiveSection] = useState('f1f26'); // f1f26, f9f18, discrepancies, renewals
  const [searchQuery, setSearchQuery] = useState('');
  const [f1f26VerdictFilter, setF1f26VerdictFilter] = useState('ALL'); // ALL, CAN_FIX, CANNOT, OK
  const [f9f18GroupFilter, setF9f18GroupFilter] = useState('ALL'); // ALL, BOTH_PENDING, F9_PENDING, F18_PENDING

  const now = new Date();

  // =========================================================================
  // SECTION 1: F1 / F26 DELAYED & PENDING CALCULATIONS (Rule 135 & 137)
  // =========================================================================
  const f1f26Data = useMemo(() => {
    return records.filter((r) => !r.is_abandoned).map((r) => {
      const psDate = r.ps_filing_date ? new Date(r.ps_filing_date) : null;
      const csDate = r.cs_filing_date ? new Date(r.cs_filing_date) : null;
      const filingDate = psDate || csDate;

      // F1 deadline: 6 months from filing date
      let f1Deadline = r.form_1_deadline ? new Date(r.form_1_deadline) : null;
      if (!f1Deadline && filingDate) {
        f1Deadline = new Date(filingDate);
        f1Deadline.setMonth(f1Deadline.getMonth() + 6);
      }

      // F26 deadline: 3 months from filing date
      let f26Deadline = r.form_26_deadline ? new Date(r.form_26_deadline) : null;
      if (!f26Deadline && filingDate) {
        f26Deadline = new Date(filingDate);
        f26Deadline.setMonth(f26Deadline.getMonth() + 3);
      }

      const f1Filed = !!r.form_1_filing_date;
      const f26Filed = !!r.form_26_filing_date;

      let f1DaysLate = 0;
      let f1Status = 'Not Applicable';
      if (f1Deadline) {
        if (f1Filed) {
          const filedD = new Date(r.form_1_filing_date);
          const diff = Math.round((filedD - f1Deadline) / 86400000);
          if (diff > 0) {
            f1DaysLate = diff;
            f1Status = `Delayed ${diff}d`;
          } else {
            f1Status = 'Filed within deadline';
          }
        } else {
          const diff = Math.round((now - f1Deadline) / 86400000);
          if (diff > 0) {
            f1DaysLate = diff;
            f1Status = `Pending ${diff}d`;
          } else {
            f1Status = `Due in ${Math.abs(diff)}d`;
          }
        }
      }

      let f26DaysLate = 0;
      let f26Status = 'Not Applicable';
      if (f26Deadline) {
        if (f26Filed) {
          const filedD = new Date(r.form_26_filing_date);
          const diff = Math.round((filedD - f26Deadline) / 86400000);
          if (diff > 0) {
            f26DaysLate = diff;
            f26Status = `Delayed ${diff}d`;
          } else {
            f26Status = 'Filed within deadline';
          }
        } else {
          const diff = Math.round((now - f26Deadline) / 86400000);
          if (diff > 0) {
            f26DaysLate = diff;
            f26Status = `Pending ${diff}d`;
          } else {
            f26Status = `Due in ${Math.abs(diff)}d`;
          }
        }
      }

      const daysNeeded = Math.max(f1DaysLate, f26DaysLate);
      // Section 17 Postdating leeway is up to 6 months (approx 181 days)
      const daysAvailable = 181;
      let verdict = 'Within Deadline';
      if (daysNeeded > 0) {
        verdict = daysNeeded <= daysAvailable ? 'Can be fixed' : 'Cannot be fixed';
      }

      return {
        ...r,
        f1Deadline: f1Deadline ? f1Deadline.toISOString().split('T')[0] : null,
        f26Deadline: f26Deadline ? f26Deadline.toISOString().split('T')[0] : null,
        f1Status,
        f26Status,
        f1DaysLate,
        f26DaysLate,
        daysNeeded,
        daysAvailable,
        verdict,
        hasIssue: daysNeeded > 0,
      };
    });
  }, [records, now]);

  const f1f26Filtered = useMemo(() => {
    let list = f1f26Data;
    if (f1f26VerdictFilter === 'CAN_FIX') {
      list = list.filter((r) => r.verdict === 'Can be fixed');
    } else if (f1f26VerdictFilter === 'CANNOT') {
      list = list.filter((r) => r.verdict === 'Cannot be fixed');
    } else if (f1f26VerdictFilter === 'ISSUES_ONLY') {
      list = list.filter((r) => r.hasIssue);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        (r.project_code && r.project_code.toLowerCase().includes(q)) ||
        (r.application_number && r.application_number.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.assigned_to && r.assigned_to.toLowerCase().includes(q))
      );
    }
    return list;
  }, [f1f26Data, f1f26VerdictFilter, searchQuery]);

  // =========================================================================
  // SECTION 2: F9 / F18 (RFE) PENDING TRACKER (31-Month Statutory Clock)
  // =========================================================================
  const f9f18Data = useMemo(() => {
    return records
      .filter((r) => !r.is_abandoned && (r.cs_filing_date || r.specification_type === 'CS'))
      .map((r) => {
        const csDate = r.cs_filing_date ? new Date(r.cs_filing_date) : null;
        const psDate = r.ps_filing_date ? new Date(r.ps_filing_date) : null;
        const priorityDate = psDate || csDate;

        // Form 18 RFE deadline: 31 months from priority date for filings on/after 15 Mar 2024, or 48m earlier
        let rfeDeadline = r.rfe_deadline ? new Date(r.rfe_deadline) : null;
        if (!rfeDeadline && priorityDate) {
          rfeDeadline = new Date(priorityDate);
          const isPost2024 = priorityDate >= new Date('2024-03-15');
          rfeDeadline.setMonth(rfeDeadline.getMonth() + (isPost2024 ? 31 : 48));
        }

        const f9Filed = !!r.form_9_filing_date;
        const f18Filed = !!r.form_18_filing_date;
        const isPublished = !!r.publication_date;

        let rfeDiffDays = null;
        if (rfeDeadline) {
          rfeDiffDays = Math.round((rfeDeadline - now) / 86400000);
        }

        let pendingCategory = 'NONE';
        if (!f9Filed && !f18Filed && !isPublished) pendingCategory = 'BOTH';
        else if (!f9Filed && !isPublished) pendingCategory = 'F9_ONLY';
        else if (!f18Filed) pendingCategory = 'F18_ONLY';

        return {
          ...r,
          csDateStr: r.cs_filing_date,
          rfeDeadlineStr: rfeDeadline ? rfeDeadline.toISOString().split('T')[0] : 'Unknown',
          rfeDiffDays,
          f9Filed,
          f18Filed,
          isPublished,
          pendingCategory,
        };
      });
  }, [records, now]);

  const f9f18Filtered = useMemo(() => {
    let list = f9f18Data;
    if (f9f18GroupFilter === 'BOTH') {
      list = list.filter((r) => r.pendingCategory === 'BOTH');
    } else if (f9f18GroupFilter === 'F9_ONLY') {
      list = list.filter((r) => r.pendingCategory === 'F9_ONLY');
    } else if (f9f18GroupFilter === 'F18_ONLY') {
      list = list.filter((r) => r.pendingCategory === 'F18_ONLY');
    } else if (f9f18GroupFilter === 'ANY_PENDING') {
      list = list.filter((r) => r.pendingCategory !== 'NONE');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        (r.project_code && r.project_code.toLowerCase().includes(q)) ||
        (r.application_number && r.application_number.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.assigned_to && r.assigned_to.toLowerCase().includes(q))
      );
    }
    return list;
  }, [f9f18Data, f9f18GroupFilter, searchQuery]);

  // =========================================================================
  // SECTION 3: IPO DISCREPANCIES & DATA AUDIT
  // =========================================================================
  const discrepancyData = useMemo(() => {
    const list = [];
    const appNumMap = {};

    // 1. Detect Duplicate Application Numbers
    records.forEach((r) => {
      if (r.application_number && r.application_number !== '—' && r.application_number.length > 5) {
        if (!appNumMap[r.application_number]) appNumMap[r.application_number] = [];
        appNumMap[r.application_number].push(r.project_code);
      }
    });

    Object.entries(appNumMap).forEach(([appNum, codes]) => {
      if (codes.length > 1) {
        codes.forEach((c) => {
          const rec = records.find((r) => r.project_code === c);
          if (rec) {
            list.push({
              id: `dup_${c}`,
              project_code: c,
              type: 'DUPLICATE_APP_NO',
              severity: 'CRITICAL',
              description: `Duplicate IPO application number "${appNum}" shared with ${codes.filter((x) => x !== c).join(', ')}`,
              record: rec,
            });
          }
        });
      }
    });

    // 2. Status Contradictions
    records.forEach((r) => {
      const st = (r.current_status || '').toLowerCase();
      if (st.includes('ps filed') && !r.ps_filing_date) {
        list.push({
          id: `contra_ps_${r.project_code}`,
          project_code: r.project_code,
          type: 'STATUS_CONTRADICTION',
          severity: 'HIGH',
          description: `Status states "PS Filed" but PS filing date is blank in docket`,
          record: r,
        });
      }
      if (st.includes('cs filed') && !r.cs_filing_date) {
        list.push({
          id: `contra_cs_${r.project_code}`,
          project_code: r.project_code,
          type: 'STATUS_CONTRADICTION',
          severity: 'HIGH',
          description: `Status states "CS Filed" but CS filing date is blank in docket`,
          record: r,
        });
      }
      if (!r.assigned_to || r.assigned_to.toLowerCase() === 'not assigned') {
        list.push({
          id: `unassigned_${r.project_code}`,
          project_code: r.project_code,
          type: 'UNASSIGNED_DRAFTER',
          severity: 'MEDIUM',
          description: `Matter has no patent associate or drafter assigned`,
          record: r,
        });
      }
    });

    return list;
  }, [records]);

  // =========================================================================
  // SECTION 4: GRANTED PATENTS & ANNUITY RENEWALS (Section 53)
  // =========================================================================
  const renewalsData = useMemo(() => {
    return records
      .filter((r) => r.patent_number || r.grant_date || (r.current_status || '').toLowerCase().includes('grant'))
      .map((r) => {
        let isOverdue = false;
        let daysUntil = null;
        if (r.next_renewal_date) {
          const renDt = new Date(r.next_renewal_date);
          daysUntil = Math.round((renDt - now) / 86400000);
          isOverdue = daysUntil < 0;
        }

        return {
          ...r,
          isOverdue,
          daysUntil,
        };
      });
  }, [records, now]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface)',
        borderRadius: '10px',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      {/* Formalities Authority Top Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--line)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
                Formalities & Docketing Command Center
              </h2>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                Paralegal / IPO Docketing View
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
              Official IPO compliance: Rule 135/137 petitions, Form 1 & 26 tracking, 31-month RFE clocks, and data verification
            </p>
          </div>
        </div>

        {/* Quick Docket Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onOpenQuickDocket && onOpenQuickDocket()}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
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
          >
            <Edit3 size={14} /> Quick Docket Matter
          </button>
        </div>
      </div>

      {/* Formalities Section Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--page)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'f1f26', label: '1. F1/F26 Delayed & Pending', count: f1f26Data.filter((r) => r.hasIssue).length, badgeColor: '#EA580C' },
            { id: 'f9f18', label: '2. F9/F18 RFE Tracker', count: f9f18Data.filter((r) => r.pendingCategory !== 'NONE').length, badgeColor: '#2563EB' },
            { id: 'discrepancies', label: '3. Data Issues & Discrepancies', count: discrepancyData.length, badgeColor: '#DC2626' },
            { id: 'renewals', label: '4. Granted & Renewals (Sec 53)', count: renewalsData.length, badgeColor: '#059669' },
          ].map((sec) => {
            const isAct = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: isAct ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                  background: isAct ? 'var(--surface)' : 'transparent',
                  color: isAct ? 'var(--ink)' : 'var(--muted)',
                  fontSize: '12px',
                  fontWeight: isAct ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: isAct ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{sec.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isAct ? sec.badgeColor : 'rgba(0,0,0,0.08)',
                    color: isAct ? '#fff' : 'var(--muted)',
                  }}
                >
                  {sec.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Filter docket matters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontSize: '11.5px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* SECTION CONTENT 1: F1 / F26 */}
      {activeSection === 'f1f26' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Sub-bar */}
          <div
            style={{
              padding: '8px 20px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: 'var(--muted)' }}>Filter by verdict:</span>
              {[
                { id: 'ALL', label: 'All Matters' },
                { id: 'ISSUES_ONLY', label: 'Action Required (Issues)' },
                { id: 'CAN_FIX', label: 'Can be fixed (Postdating ≤ 181d)' },
                { id: 'CANNOT', label: 'Cannot be fixed (> 181d)' },
              ].map((flt) => (
                <button
                  key={flt.id}
                  onClick={() => setF1f26VerdictFilter(flt.id)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: f1f26VerdictFilter === flt.id ? '1px solid var(--accent)' : '1px solid var(--line)',
                    background: f1f26VerdictFilter === flt.id ? 'var(--accent-soft)' : 'transparent',
                    color: f1f26VerdictFilter === flt.id ? 'var(--accent)' : 'var(--muted)',
                    fontWeight: f1f26VerdictFilter === flt.id ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  {flt.label}
                </button>
              ))}
            </div>

            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
              Showing {f1f26Filtered.length} matters
            </span>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--page)', borderBottom: '1px solid var(--line)', zIndex: 10 }}>
                <tr style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '11px' }}>
                  <th style={{ padding: '10px 14px' }}>CODE</th>
                  <th style={{ padding: '10px 14px' }}>APPLICATION NO.</th>
                  <th style={{ padding: '10px 14px' }}>TITLE OF INVENTION</th>
                  <th style={{ padding: '10px 14px' }}>DRAFTER</th>
                  <th style={{ padding: '10px 14px' }}>FORM 1 (POR - 6M)</th>
                  <th style={{ padding: '10px 14px' }}>FORM 26 (POA - 3M)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>DAYS NEEDED</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>DAYS AVAIL</th>
                  <th style={{ padding: '10px 14px' }}>VERDICT</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {f1f26Filtered.map((r) => {
                  const isFixable = r.verdict === 'Can be fixed';
                  const isFatal = r.verdict === 'Cannot be fixed';

                  return (
                    <tr
                      key={r.project_code}
                      onClick={() => onOpenDrawer && onOpenDrawer(r)}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: isFatal ? '#FEF2F2' : (isFixable ? '#FFFBEB' : 'transparent'),
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--accent)' }}>
                        {r.project_code}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {r.application_number || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>
                        {r.assigned_to || 'Unassigned'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '11px',
                            background: r.f1DaysLate > 0 ? '#FEE2E2' : '#ECFDF5',
                            color: r.f1DaysLate > 0 ? '#DC2626' : '#059669',
                          }}
                        >
                          {r.f1Status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '11px',
                            background: r.f26DaysLate > 0 ? '#FEE2E2' : '#ECFDF5',
                            color: r.f26DaysLate > 0 ? '#DC2626' : '#059669',
                          }}
                        >
                          {r.f26Status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: r.daysNeeded > 0 ? '#DC2626' : 'var(--muted)' }}>
                        {r.daysNeeded > 0 ? `${r.daysNeeded}d` : '0d'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--muted)' }}>
                        {r.daysAvailable}d
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '10.5px',
                            background: isFatal ? '#FEE2E2' : (isFixable ? '#FEF3C7' : '#DCFCE7'),
                            color: isFatal ? '#DC2626' : (isFixable ? '#D97706' : '#15803D'),
                          }}
                        >
                          {r.verdict}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenQuickDocket) onOpenQuickDocket(r);
                          }}
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
                        >
                          Docket Filing
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION CONTENT 2: F9 / F18 */}
      {activeSection === 'f9f18' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '8px 20px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: 'var(--muted)' }}>Groups:</span>
              {[
                { id: 'ALL', label: 'All CS Filed' },
                { id: 'ANY_PENDING', label: 'Any F9/F18 Pending' },
                { id: 'BOTH', label: 'Both F9 & F18 Pending' },
                { id: 'F9_ONLY', label: 'F9 Pending Only' },
                { id: 'F18_ONLY', label: 'F18 (RFE) Pending Only' },
              ].map((grp) => (
                <button
                  key={grp.id}
                  onClick={() => setF9f18GroupFilter(grp.id)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: f9f18GroupFilter === grp.id ? '1px solid var(--accent)' : '1px solid var(--line)',
                    background: f9f18GroupFilter === grp.id ? 'var(--accent-soft)' : 'transparent',
                    color: f9f18GroupFilter === grp.id ? 'var(--accent)' : 'var(--muted)',
                    fontWeight: f9f18GroupFilter === grp.id ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  {grp.label}
                </button>
              ))}
            </div>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
              {f9f18Filtered.length} applications
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--page)', borderBottom: '1px solid var(--line)', zIndex: 10 }}>
                <tr style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '11px' }}>
                  <th style={{ padding: '10px 14px' }}>CODE</th>
                  <th style={{ padding: '10px 14px' }}>APPLICATION NO.</th>
                  <th style={{ padding: '10px 14px' }}>TITLE OF INVENTION</th>
                  <th style={{ padding: '10px 14px' }}>CS FILING DATE</th>
                  <th style={{ padding: '10px 14px' }}>FORM 9 STATUS</th>
                  <th style={{ padding: '10px 14px' }}>FORM 18 STATUS</th>
                  <th style={{ padding: '10px 14px' }}>RFE STATUTORY DEADLINE (31M)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {f9f18Filtered.map((r) => {
                  const isRfeCritical = r.rfeDiffDays !== null && r.rfeDiffDays <= 30 && !r.f18Filed;
                  return (
                    <tr
                      key={r.project_code}
                      onClick={() => onOpenDrawer && onOpenDrawer(r)}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: isRfeCritical ? '#FEF2F2' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--accent)' }}>
                        {r.project_code}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {r.application_number || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>
                        {r.csDateStr || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '11px',
                            background: r.f9Filed ? '#ECFDF5' : (r.isPublished ? '#F3F4F6' : '#FEF3C7'),
                            color: r.f9Filed ? '#059669' : (r.isPublished ? 'var(--muted)' : '#D97706'),
                          }}
                        >
                          {r.f9Filed ? 'Filed' : (r.isPublished ? 'Published (N/A)' : 'Pending')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '11px',
                            background: r.f18Filed ? '#ECFDF5' : '#FEE2E2',
                            color: r.f18Filed ? '#059669' : '#DC2626',
                          }}
                        >
                          {r.f18Filed ? 'Filed' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: isRfeCritical ? '#DC2626' : 'var(--ink)' }}>
                            {r.rfeDeadlineStr}
                          </span>
                          {r.rfeDiffDays !== null && !r.f18Filed && (
                            <span style={{ fontSize: '10.5px', color: r.rfeDiffDays < 0 ? '#DC2626' : 'var(--muted)' }}>
                              {r.rfeDiffDays < 0 ? `Overdue ${Math.abs(r.rfeDiffDays)}d` : `In ${r.rfeDiffDays}d`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenQuickDocket) onOpenQuickDocket(r);
                          }}
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
                        >
                          Log F18 RFE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION CONTENT 3: DATA ISSUES & DISCREPANCIES */}
      {activeSection === 'discrepancies' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '16px 20px' }}>
          {discrepancyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>
                Clean Portfolio Docket!
              </div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                Zero duplicate application numbers, status contradictions, or unassigned drafters detected.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                Found {discrepancyData.length} docket discrepancies requiring paralegal remediation:
              </div>

              {discrepancyData.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1.5px solid ${d.severity === 'CRITICAL' ? '#FCA5A5' : '#FDE68A'}`,
                    background: d.severity === 'CRITICAL' ? '#FEF2F2' : '#FFFBEB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertTriangle size={20} color={d.severity === 'CRITICAL' ? '#DC2626' : '#D97706'} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '13px' }}>
                          {d.project_code}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: d.severity === 'CRITICAL' ? '#FEE2E2' : '#FEF3C7',
                            color: d.severity === 'CRITICAL' ? '#DC2626' : '#B45309',
                          }}
                        >
                          {d.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink)', marginTop: '2px' }}>
                        {d.description}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenEdit && onOpenEdit(d.record)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#2563EB',
                      color: '#fff',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Resolve / Fix
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION CONTENT 4: GRANTED & RENEWALS */}
      {activeSection === 'renewals' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--page)', borderBottom: '1px solid var(--line)', zIndex: 10 }}>
              <tr style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '11px' }}>
                <th style={{ padding: '10px 14px' }}>CODE</th>
                <th style={{ padding: '10px 14px' }}>LETTERS PATENT NO.</th>
                <th style={{ padding: '10px 14px' }}>APPLICATION NO.</th>
                <th style={{ padding: '10px 14px' }}>TITLE OF INVENTION</th>
                <th style={{ padding: '10px 14px' }}>GRANT DATE</th>
                <th style={{ padding: '10px 14px' }}>NEXT RENEWAL DATE</th>
                <th style={{ padding: '10px 14px' }}>RENEWAL STATUS</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {renewalsData.map((r) => (
                <tr
                  key={r.project_code}
                  onClick={() => onOpenDrawer && onOpenDrawer(r)}
                  style={{
                    borderBottom: '1px solid var(--line)',
                    background: r.isOverdue ? '#FEF2F2' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--accent)' }}>
                    {r.project_code}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                    {r.patent_number || 'Pending Certificate'}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>
                    {r.application_number || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>
                    {r.grant_date || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                    {r.next_renewal_date || '3 months from grant'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '11px',
                        background: r.isOverdue ? '#FEE2E2' : '#DCFCE7',
                        color: r.isOverdue ? '#DC2626' : '#15803D',
                      }}
                    >
                      {r.isOverdue ? `Overdue (${Math.abs(r.daysUntil)}d)` : 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenQuickDocket) onOpenQuickDocket(r);
                      }}
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
                    >
                      Log Renewal
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

