import React, { useState } from 'react';
import {
  X, Copy, Check, ExternalLink, Calendar, FileText, User, AlertCircle,
  Clock, Shield, Building, Mail, Phone, Bookmark, CheckCircle2, AlertTriangle, Edit3,
  Tag as TagIcon
} from 'lucide-react';

export default function SlideOverDrawer({
  record,
  onClose,
  onSaveManualNotes,
  onUpdate,
  tags = [],
  onOpenEdit,
  onOpenTimeline,
  auditLogs = []
}) {
  if (!record) return null;

  const [copiedField, setCopiedField] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, timeline, forms, inventors, queries

  // Editable manual fields state
  const [statusNotes, setStatusNotes] = useState(record.status_notes || '');
  const [suggestedAction, setSuggestedAction] = useState(record.suggested_action || '');
  const [issue, setIssue] = useState(record.issue || '');
  const [checklistDate, setChecklistDate] = useState(record.checklist_sent_date || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSaveManualNotes) {
        await onSaveManualNotes(record.project_code, {
          status_notes: statusNotes,
          suggested_action: suggestedAction,
          issue: issue,
          checklist_sent_date: checklistDate,
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save manual notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Lifecycle steps calculation
  const steps = [
    { label: 'IDF / Intake', done: true, current: !record.ps_filing_date && !record.cs_filing_date },
    { label: 'PS Filed', done: Boolean(record.ps_filing_date), date: record.ps_filing_date },
    { label: 'CS Filed', done: Boolean(record.cs_filing_date), date: record.cs_filing_date },
    { label: 'Published', done: Boolean(record.publication_date), date: record.publication_date },
    { label: 'FER Notice', done: Boolean(record.fer_notice_date), date: record.fer_notice_date },
    { label: 'Hearing', done: Boolean(record.hearing_date), date: record.hearing_date },
    { label: 'Granted', done: Boolean(record.grant_date), date: record.grant_date },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '680px',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--line)',
      boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.25)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '-0.2px',
              color: 'var(--ink)'
            }}>
              {record.project_code}
            </span>
            <button
              onClick={() => copyToClipboard(record.project_code, 'code')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Copy Project Code"
            >
              {copiedField === 'code' ? <Check size={14} color="var(--ok-fg)" /> : <Copy size={14} />}
            </button>

            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 700,
              background: record.is_mahe ? 'rgba(58, 134, 255, 0.15)' : 'rgba(201, 138, 44, 0.15)',
              color: record.is_mahe ? '#3A86FF' : '#C98A2C'
            }}>
              {record.is_mahe ? 'MAHE' : 'Non-MAHE'}
            </span>

            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 700,
              background: record.color_code_status === 'PURPLE' ? 'rgba(138, 79, 255, 0.15)' :
                          record.color_code_status === 'GREEN' ? 'rgba(78, 158, 86, 0.15)' :
                          record.color_code_status === 'RED' ? 'rgba(194, 59, 46, 0.15)' :
                          record.color_code_status === 'YELLOW' ? 'rgba(201, 138, 44, 0.15)' : 'rgba(58, 134, 255, 0.15)',
              color: record.color_code_status === 'PURPLE' ? '#8A4FFF' :
                     record.color_code_status === 'GREEN' ? '#4E9E56' :
                     record.color_code_status === 'RED' ? '#C23B2E' :
                     record.color_code_status === 'YELLOW' ? '#C98A2C' : '#3A86FF'
            }}>
              {record.current_status || record.color_code_status}
            </span>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>App No: <strong>{record.application_number || 'Not Yet Assigned'}</strong></span>
            {record.application_number && (
              <button
                onClick={() => copyToClipboard(record.application_number, 'app')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
              >
                {copiedField === 'app' ? <Check size={12} color="var(--ok-fg)" /> : <Copy size={12} />}
              </button>
            )}
          </div>

          {/* Quick Interactive Tags Strip */}
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TagIcon size={12} /> Tags:
            </span>
            {['Priority', 'Ticket Raised', 'Critical', 'Political', ...tags.filter(t => !['priority','ticket raised','critical','political'].includes(t.name.toLowerCase())).map(t => t.name)].map((tg) => {
              const currentTags = Array.isArray(record.tags) ? record.tags : (record.classification ? record.classification.split(',').map(s => s.trim()) : []);
              const isApplied = currentTags.includes(tg);
              return (
                <button
                  key={tg}
                  type="button"
                  onClick={() => {
                    const newTags = isApplied ? currentTags.filter(t => t !== tg) : [...currentTags, tg];
                    if (onUpdate) {
                      onUpdate(record.project_code, { tags: newTags });
                    }
                  }}
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: `1px solid ${isApplied ? '#2563EB' : 'var(--line)'}`,
                    background: isApplied ? 'rgba(37, 99, 235, 0.15)' : 'var(--page)',
                    color: isApplied ? '#1D4ED8' : 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title={isApplied ? `Remove tag "${tg}"` : `Add tag "${tg}"`}
                >
                  {isApplied ? '✓ ' : '+ '}
                  {tg}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenTimeline && (
            <button
              onClick={() => onOpenTimeline(record)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--accent)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="View Complete Statutory Prosecution Timeline"
            >
              <Clock size={14} /> Timeline
            </button>
          )}

          {onOpenEdit && (
            <button
              onClick={() => onOpenEdit(record)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
              }}
              title="Edit Application Details"
            >
              <Edit3 size={14} /> Edit
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--line)',
        padding: '0 24px',
        background: 'var(--surface)',
        gap: '20px'
      }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'timeline', label: 'Prosecution Timeline' },
          { id: 'forms', label: 'Statutory Forms' },
          { id: 'inventors', label: 'Inventors' },
          { id: 'notes', label: 'Senior Notes & Action' },
          { id: 'audit', label: 'History & Audit' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--muted)',
              fontWeight: activeTab === t.id ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Drawer Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Invention Title</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px', lineHeight: 1.4 }}>
                {record.title}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>APPLICANT</div>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{record.applicant_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{record.applicant_address || 'Address on file'}</div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>DRAFTER & FILING AGENT</div>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>Assigned: {record.assigned_to || 'Unassigned'}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Agent: {record.filed_by || 'Lextria IP Operations'}</div>
              </div>
            </div>

            {/* Ecosystem Cross-Links Banner */}
            <div style={{
              padding: '14px 16px',
              borderRadius: '8px',
              background: 'rgba(58, 134, 255, 0.08)',
              border: '1px solid rgba(58, 134, 255, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#3A86FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} /> UNIFIED LEXTRIA ECOSYSTEM BRIDGES
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  href={`https://ip-ledger.lextriaresearch.com/matters/${record.project_code}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '12px',
                    color: '#3A86FF',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--surface)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(58, 134, 255, 0.3)'
                  }}
                >
                  Sync Fee Milestones in IP Ledger <ExternalLink size={12} />
                </a>

                <a
                  href={`https://litigator.lextriaresearch.com/cases?search=${record.project_code}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '12px',
                    color: '#8A4FFF',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--surface)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(138, 79, 255, 0.3)'
                  }}
                >
                  Link Oppositions in Litigator <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Post-Dating Section 17 Status */}
            <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Section 17 Post-Dating Window
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>
                    {record.post_dated_date ? `Post-Dated to: ${record.post_dated_date}` : 'Not yet Postdated'}
                  </span>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Can be post-dated up to 6 months from PS filing
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: 'rgba(78, 158, 86, 0.15)',
                  color: '#4E9E56'
                }}>
                  {record.remaining_post_date_days || 181} Days Available
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Statutory Prosecution Stepper</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '24px' }}>
              <div style={{
                position: 'absolute',
                left: '7px',
                top: '10px',
                bottom: '10px',
                width: '2px',
                background: 'var(--line)'
              }} />

              {steps.map((st, idx) => (
                <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    position: 'absolute',
                    left: '-24px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: st.done ? 'var(--ok-fg)' : (st.current ? 'var(--warn-fg)' : 'var(--line)'),
                    border: '3px solid var(--surface)'
                  }} />
                  <div style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: st.done ? 'var(--ink)' : 'var(--muted)' }}>{st.label}</span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{st.date || (st.done ? 'Completed' : 'Pending')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FORMS TAB */}
        {activeTab === 'forms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Comprehensive Statutory Forms Matrix</div>
            
            {/* Form 1 Card */}
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Form 1 — Proof of Right</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Statutory deadline: 6 months from filing</div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: record.f1_status === 'Within Deadline' ? 'rgba(78, 158, 86, 0.15)' : 'rgba(194, 59, 46, 0.15)',
                  color: record.f1_status === 'Within Deadline' ? '#4E9E56' : '#C23B2E'
                }}>
                  {record.f1_delayed_by || record.f1_status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Form 26 Card */}
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Form 26 — Power of Authority (POA)</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Statutory deadline: 3 months from filing</div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: record.f26_status === 'Within Deadline' ? 'rgba(78, 158, 86, 0.15)' : 'rgba(194, 59, 46, 0.15)',
                  color: record.f26_status === 'Within Deadline' ? '#4E9E56' : '#C23B2E'
                }}>
                  {record.f26_delayed_by || record.f26_status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Other Forms List */}
            {[
              { code: 'Form 3', name: 'Section 8 Foreign Undertaking', date: record.form_3_filing_date, dead: record.form_3_deadline },
              { code: 'Form 9', name: 'Early Publication Request', date: record.form_9_filing_date },
              { code: 'Form 18 / 18A', name: 'Request for Examination (RFE)', date: record.form_18_filing_date, dead: record.rfe_deadline },
              { code: 'Form 13', name: 'Amendments', date: record.form_13_filing_date, detail: record.form_13_particulars },
              { code: 'Form 4', name: 'Extension of Time (FER / WS / F3)', date: record.form_4_fer_filing_date },
              { code: 'Form 27', name: 'Commercial Working Statement', date: record.form_27_filing_date },
            ].map((f, idx) => (
              <div key={idx} style={{ padding: '10px 14px', borderRadius: '6px', background: 'var(--page)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{f.code} — {f.name}</div>
                  {f.detail && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{f.detail}</div>}
                  {f.dead && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Deadline: {f.dead}</div>}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: f.date ? 'var(--ok-fg)' : 'var(--muted)' }}>
                  {f.date ? `Filed on ${f.date}` : 'Not Filed'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* INVENTORS TAB */}
        {activeTab === 'inventors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Normalized Inventors Roster</div>
            <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>INVENTORS SUMMARY</div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '4px' }}>
                {record.inventors_summary || 'No inventor recorded'}
              </div>
            </div>
          </div>
        )}

        {/* NOTES & ACTIONS TAB */}
        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Status Notes</label>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add internal prosecution notes..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Suggested Action</label>
              <input
                type="text"
                value={suggestedAction}
                onChange={(e) => setSuggestedAction(e.target.value)}
                placeholder="e.g. Call inventor for signature..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Issue / Blocker</label>
              <input
                type="text"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="e.g. Discrepancy in proof of right..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Checklist Sent Date</label>
              <input
                type="date"
                value={checklistDate}
                onChange={(e) => setChecklistDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: isSaving ? 'wait' : 'pointer'
                }}
              >
                {isSaving ? 'Saving...' : 'Save Notes & Actions'}
              </button>
              {saveSuccess && (
                <span style={{ color: 'var(--ok-fg)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={16} /> Saved to Database!
                </span>
              )}
            </div>
          </div>
        )}
        {/* AUDIT & HISTORY TAB (Requirement 7) */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--line)' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>Audit History for {record.project_code}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>Chronological record of who modified what and when</p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                {auditLogs.length} events
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)', background: 'var(--page)', borderRadius: '8px' }}>
                <Clock size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
                <div style={{ fontWeight: 600, fontSize: '13px' }}>No direct audit entries recorded yet for this matter.</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Edits, deadline ticks, and status changes will appear here automatically.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'var(--page)',
                      border: '1px solid var(--line)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent)' }}>
                        {log.action}
                      </span>
                      <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div style={{ color: 'var(--ink)', fontWeight: 600 }}>
                      {log.details}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={11} />
                      <span>Changed by: <strong>{log.changed_by}</strong> ({log.user_role})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
