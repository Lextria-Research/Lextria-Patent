// frontend/src/components/MasterTimelineModal.jsx
import React, { useState } from 'react';
import {
  X, Calendar, Clock, CheckCircle2, AlertCircle, AlertTriangle,
  ExternalLink, Printer, Shield, ChevronRight, Calculator,
  FileText, Award, Layers, Sparkles
} from 'lucide-react';

export default function MasterTimelineModal({ isOpen, onClose, record }) {
  if (!isOpen || !record) return null;

  // Post-dating simulation state (Section 17)
  const [simulatedDays, setSimulatedDays] = useState(0);

  // Helper date parsing
  const parseDate = (dStr) => {
    if (!dStr) return null;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (dStr) => {
    if (!dStr) return 'Not Scheduled';
    const d = parseDate(dStr);
    if (!d) return 'Not Scheduled';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysDiff = (targetDateStr) => {
    if (!targetDateStr) return null;
    const target = parseDate(targetDateStr);
    if (!target) return null;
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // Base dates
  const psDate = parseDate(record.ps_filing_date);
  const csDate = parseDate(record.cs_filing_date);
  const csDeadline = parseDate(record.cs_deadline);

  // Simulated CS deadline if post-dating is adjusted
  const simulatedCsDeadline = psDate
    ? new Date(psDate.getTime() + (365 + simulatedDays) * 24 * 60 * 60 * 1000)
    : null;

  const daysToCs = getDaysDiff(record.cs_deadline);
  const daysToFer = getDaysDiff(record.fer_reply_deadline);
  const daysToWs = getDaysDiff(record.ws_deadline);

  // Determine stage progress
  const stages = [
    {
      id: 1,
      title: 'Provisional Specification (PS) Filed',
      statutoryRef: 'Section 9(1), The Patents Act, 1970',
      date: record.ps_filing_date,
      isCompleted: !!record.ps_filing_date,
      isActive: !!record.ps_filing_date && !record.cs_filing_date,
      description: record.ps_filing_date
        ? `Filing established priority on ${formatDate(record.ps_filing_date)}. Strict 12-month clock commenced.`
        : 'Provisional specification not yet filed at the Indian Patent Office.',
      details: [
        { label: 'Application Number', value: record.application_number || 'Pending Generation' },
        { label: 'Receipt Status', value: record.application_filing_receipt_status || 'PENDING' },
        { label: 'Applicant', value: record.applicant_name },
      ]
    },
    {
      id: 2,
      title: 'Section 17 Post-Dating Window',
      statutoryRef: 'Section 17, The Patents Act, 1970',
      date: record.post_dated_date,
      isCompleted: !!record.post_date_allowed,
      isActive: !!record.ps_filing_date && !record.cs_filing_date && !record.post_date_allowed,
      description: 'Section 17 permits post-dating the application by up to 6 months (181 days) from priority date to gain drafting time for Complete Specification.',
      details: [
        { label: 'Post-Date Feasible', value: record.ps_filing_date ? 'Yes (Within 6 Months of PS)' : 'N/A' },
        { label: 'Remaining Post-Date Days', value: `${record.remaining_post_date_days ?? 181} days remaining` },
        { label: 'Section 17 Form', value: 'Form 4 + Official Fee' }
      ]
    },
    {
      id: 3,
      title: 'Complete Specification (CS) Filing Deadline',
      statutoryRef: 'Section 9(1) (Strict 12 Months Deadline)',
      date: record.cs_filing_date || record.cs_deadline,
      isCompleted: !!record.cs_filing_date,
      isActive: !record.cs_filing_date && !!record.ps_filing_date,
      isOverdue: !record.cs_filing_date && daysToCs !== null && daysToCs < 0,
      description: record.cs_filing_date
        ? `Complete Specification filed on ${formatDate(record.cs_filing_date)}.`
        : `Complete Specification MUST be filed on or before ${formatDate(record.cs_deadline)}. Non-extendable statutory bar.`,
      details: [
        { label: 'CS Statutory Deadline', value: formatDate(record.cs_deadline) },
        { label: 'Countdown', value: record.cs_filing_date ? 'COMPLETED' : daysToCs !== null ? (daysToCs < 0 ? `${Math.abs(daysToCs)} days OVERDUE` : `${daysToCs} days remaining`) : 'Not Scheduled' },
        { label: 'Risk Severity', value: !record.cs_filing_date && daysToCs !== null && daysToCs < 30 ? 'CRITICAL (Abandonment Risk under Sec 9(1))' : 'Normal' }
      ]
    },
    {
      id: 4,
      title: 'Statutory Formalities & Forms Compliance',
      statutoryRef: 'Rules 10, 135 & Section 8 Compliance',
      date: record.form_1_filing_date || record.form_26_filing_date,
      isCompleted: record.f1_status === 'Within Deadline' && record.f26_status === 'Within Deadline',
      isActive: record.f1_status === 'Pending' || record.f26_status === 'Pending',
      description: 'Mandatory proof of right (Form 1 - 6 months) and Power of Attorney (Form 26 - 3 months).',
      details: [
        { label: 'Form 1 (Proof of Right)', value: `${formatDate(record.form_1_filing_date)} (${record.f1_status || 'Pending'})` },
        { label: 'Form 26 (Power of Attorney)', value: `${formatDate(record.form_26_filing_date)} (${record.f26_status || 'Pending'})` },
        { label: 'Form 3 (Section 8 Foreign Filings)', value: formatDate(record.form_3_filing_date) }
      ]
    },
    {
      id: 5,
      title: 'Publication under Section 11A',
      statutoryRef: 'Section 11A & Rule 24 (18 Months Publication)',
      date: record.publication_date,
      isCompleted: !!record.publication_date,
      isActive: !!record.cs_filing_date && !record.publication_date,
      description: record.publication_date
        ? `Published in Patent Office Gazette on ${formatDate(record.publication_date)}.`
        : 'Automatic statutory publication after 18 months from priority, or expedited via Form 9 early publication.',
      details: [
        { label: 'Publication Date', value: formatDate(record.publication_date) },
        { label: 'Publication Number', value: record.publication_number || 'Pending Gazette Notice' },
        { label: 'Early Publication (Form 9)', value: record.form_9_filing_date ? `Filed on ${formatDate(record.form_9_filing_date)}` : 'Not Requested' }
      ]
    },
    {
      id: 6,
      title: 'Request for Examination (RFE / Form 18)',
      statutoryRef: 'Section 11B & Rule 24B',
      date: record.form_18_filing_date || record.rfe_filing_date,
      isCompleted: !!record.form_18_filing_date || !!record.rfe_filing_date,
      isActive: !!record.publication_date && !record.form_18_filing_date,
      description: 'Request for Examination triggers official scrutiny by Patent Examiner. 31 months deadline (post 15-Mar-2024 rules) or 48 months.',
      details: [
        { label: 'RFE Status', value: record.form_18_filing_date || record.rfe_filing_date ? 'Filed & Acknowledged' : 'Pending Filing' },
        { label: 'RFE Deadline', value: formatDate(record.rfe_deadline) },
        { label: 'Expedited (Form 18A)', value: record.entity_category === 'STARTUP_DPIIT' || record.entity_category === 'EDUCATIONAL_INSTITUTION' ? 'Eligible for Form 18A Fast-Track' : 'Standard Queue' }
      ]
    },
    {
      id: 7,
      title: 'First Examination Report (FER) & Response',
      statutoryRef: 'Section 12, 13 & 21 (6 Months Reply Limit)',
      date: record.fer_reply_filing_date || record.fer_notice_date,
      isCompleted: !!record.fer_reply_filing_date,
      isActive: !!record.fer_notice_date && !record.fer_reply_filing_date,
      isOverdue: !record.fer_reply_filing_date && daysToFer !== null && daysToFer < 0,
      description: record.fer_notice_date
        ? `FER issued on ${formatDate(record.fer_notice_date)}. Statutory reply due on or before ${formatDate(record.fer_reply_deadline)}.`
        : 'First Examination Report not yet issued by IPO Controller.',
      details: [
        { label: 'FER Notice Date', value: formatDate(record.fer_notice_date) },
        { label: 'FER Reply Deadline', value: formatDate(record.fer_reply_deadline) },
        { label: 'Days Remaining', value: record.fer_reply_filing_date ? 'REPLY FILED' : daysToFer !== null ? `${daysToFer} days` : 'N/A' },
        { label: 'Form 4 Extension', value: 'Up to 3 months allowable on payment of official fee' }
      ]
    },
    {
      id: 8,
      title: 'Controller Hearing & Written Submissions',
      statutoryRef: 'Section 14, 15 & Rule 28(7)',
      date: record.hearing_date || record.ws_filing_date,
      isCompleted: !!record.ws_filing_date,
      isActive: !!record.hearing_date && !record.ws_filing_date,
      isOverdue: !record.ws_filing_date && daysToWs !== null && daysToWs < 0,
      description: record.hearing_date
        ? `Controller hearing held on ${formatDate(record.hearing_date)}. Written Submissions MUST be filed within 15 days.`
        : 'Hearing not scheduled.',
      details: [
        { label: 'Hearing Date', value: formatDate(record.hearing_date) },
        { label: 'WS Statutory Deadline', value: formatDate(record.ws_deadline) },
        { label: 'Rule 28(7) Limit', value: 'Strict 15 days post-hearing date' }
      ]
    },
    {
      id: 9,
      title: 'Letters Patent Grant & Sealing',
      statutoryRef: 'Section 43 (Grant of Patent)',
      date: record.grant_date,
      isCompleted: !!record.grant_date,
      isActive: false,
      description: record.grant_date
        ? `Patent officially GRANTED on ${formatDate(record.grant_date)} with Patent Number IN ${record.patent_number || 'Assigned'}.`
        : 'Patent under active prosecution.',
      details: [
        { label: 'Patent Number', value: record.patent_number || 'Awaiting Grant' },
        { label: 'Grant Date', value: formatDate(record.grant_date) },
        { label: 'Term of Patent', value: '20 Years from Priority / PS Filing Date' }
      ]
    },
    {
      id: 10,
      title: 'Post-Grant Maintenance & Form 27 Annuities',
      statutoryRef: 'Section 142 & Form 27 Commercial Working',
      date: record.next_renewal_date,
      isCompleted: false,
      isActive: !!record.grant_date,
      description: 'Maintain patent validity through payment of annual renewal fees from year 3 onwards and annual Form 27 statements.',
      details: [
        { label: 'Current Annuity Year', value: record.current_annuity_year ? `Year ${record.current_annuity_year}` : 'Pre-Grant' },
        { label: 'Next Renewal Due', value: formatDate(record.next_renewal_date) },
        { label: 'Form 27 Working', value: 'Every 3 financial years (Post-2024 Amendment)' }
      ]
    }
  ];

  return (
    <div
      className="modal-backdrop-animate"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog-animate"
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dossier Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--page)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4F46E5, #3B82F6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
              }}
            >
              <Clock size={22} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--ink)' }}>
                  Master Prosecution Timeline
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                  }}
                >
                  {record.project_code}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: record.grant_date ? '#D1FAE5' : '#FEF3C7',
                    color: record.grant_date ? '#065F46' : '#92400E',
                  }}
                >
                  {record.grant_date ? 'PATENT GRANTED' : record.current_status || 'Under Prosecution'}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '3px 0 0', fontWeight: 600 }}>
                {record.title}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Printer size={14} /> Print Dossier
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Section 17 Post-Dating Simulator Banner */}
        {psDate && !csDate && (
          <div
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} color="var(--accent)" />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>
                  Section 17 Post-Dating Calculator:
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '6px' }}>
                  Simulate extending the Complete Specification deadline by up to 180 days:
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                min="0"
                max="180"
                step="15"
                value={simulatedDays}
                onChange={(e) => setSimulatedDays(parseInt(e.target.value, 10))}
                style={{ width: '130px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', minWidth: '60px' }}>
                +{simulatedDays} Days
              </span>

              {simulatedDays > 0 && simulatedCsDeadline && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: '#EDE9FE',
                    color: '#6D28D9',
                  }}
                >
                  New CS Deadline: {simulatedCsDeadline.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Timeline Body */}
        <div style={{ overflowY: 'auto', padding: '28px', flex: 1 }}>
          <div style={{ position: 'relative', paddingLeft: '32px' }}>
            {/* Vertical timeline spine */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                bottom: '12px',
                left: '11px',
                width: '2px',
                backgroundColor: 'var(--line)',
              }}
            />

            {stages.map((stage) => {
              const badgeBg = stage.isCompleted
                ? '#10B981'
                : stage.isOverdue
                ? '#EF4444'
                : stage.isActive
                ? '#3B82F6'
                : 'var(--line)';

              return (
                <div
                  key={stage.id}
                  style={{
                    position: 'relative',
                    marginBottom: '28px',
                  }}
                >
                  {/* Timeline bullet icon */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-32px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: badgeBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: stage.isActive ? '0 0 0 4px rgba(59, 130, 246, 0.25)' : 'none',
                      zIndex: 2,
                    }}
                  >
                    {stage.isCompleted ? (
                      <CheckCircle2 size={14} />
                    ) : stage.isOverdue ? (
                      <AlertTriangle size={14} />
                    ) : stage.isActive ? (
                      <Clock size={14} />
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 800 }}>{stage.id}</span>
                    )}
                  </div>

                  {/* Stage Card */}
                  <div
                    style={{
                      background: stage.isActive ? 'rgba(59, 130, 246, 0.04)' : 'var(--page)',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      border: stage.isActive
                        ? '1px solid rgba(59, 130, 246, 0.3)'
                        : stage.isOverdue
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid var(--line)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                          {stage.title}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--surface)',
                            border: '1px solid var(--line)',
                            color: 'var(--muted)',
                          }}
                        >
                          {stage.statutoryRef}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {stage.isCompleted && (
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: '#D1FAE5', padding: '2px 8px', borderRadius: '4px' }}>
                            COMPLETED
                          </span>
                        )}
                        {stage.isOverdue && (
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: '4px' }}>
                            OVERDUE
                          </span>
                        )}
                        {stage.isActive && !stage.isOverdue && (
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', background: '#DBEAFE', padding: '2px 8px', borderRadius: '4px' }}>
                            ACTIVE STAGE
                          </span>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                      {stage.description}
                    </p>

                    {/* Metadata Chips */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '10px',
                        background: 'var(--surface)',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                      }}
                    >
                      {stage.details.map((dt, idx) => (
                        <div key={idx}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            {dt.label}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', marginTop: '2px' }}>
                            {dt.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dossier Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--line)',
            background: 'var(--page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)' }}>
            <Shield size={16} color="var(--accent)" />
            <span>Statutory calculations governed by Indian Patents Act 1970 & Patent Rules 2003 (as amended 2024).</span>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--ink)',
              color: 'var(--surface)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
