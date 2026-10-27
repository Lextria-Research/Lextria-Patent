import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, ExternalLink, Calendar, FileText, User, AlertCircle,
  Clock, Shield, Building, Mail, Phone, Bookmark, CheckCircle2, AlertTriangle, Edit3,
  Tag as TagIcon, Upload, Download, Trash2, Plus, Target, Paperclip, Send, AlertOctagon,
  FileCheck, HelpCircle
} from 'lucide-react';
import DEFAULT_CLIENTS from '../data/clients.json';

export default function SlideOverDrawer({
  record,
  onClose,
  onSaveManualNotes,
  onUpdate,
  tags = [],
  clients: clientsProp = [],
  allRecords = [],
  onOpenEdit,
  onOpenTimeline,
  auditLogs = []
}) {
  if (!record) return null;

  const clients = (Array.isArray(clientsProp) && clientsProp.length > 0) ? clientsProp : DEFAULT_CLIENTS;

  const [copiedField, setCopiedField] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, work, timeline, forms, inventors, notes, audit

  // Cross-reference client against core.clients
  const matchedClient = React.useMemo(() => {
    if (!clients || clients.length === 0) return null;
    return clients.find((c) => {
      if (record.applicant_name && c.client_name && (record.applicant_name.toLowerCase().includes(c.client_name.toLowerCase()) || c.client_name.toLowerCase().includes(record.applicant_name.toLowerCase()))) return true;
      if (record.project_code && c.client_code && record.project_code.toUpperCase().startsWith(c.client_code.toUpperCase())) return true;
      return false;
    }) || null;
  }, [record, clients]);

  // Count total matters in firm for this client
  const clientMattersCount = React.useMemo(() => {
    if (!matchedClient || !allRecords || allRecords.length === 0) return 0;
    const code = (matchedClient.client_code || '').toUpperCase();
    const name = (matchedClient.client_name || '').toLowerCase();
    return allRecords.filter((r) => {
      if (r.project_code && code && r.project_code.toUpperCase().startsWith(code)) return true;
      if (r.applicant_name && r.applicant_name.toLowerCase().includes(name)) return true;
      return false;
    }).length;
  }, [matchedClient, allRecords]);

  // Client Delivery Commitment state
  const [commitmentDate, setCommitmentDate] = useState(record.client_commitment_date || '');
  const [isUpdatingCommitment, setIsUpdatingCommitment] = useState(false);

  // Deliverables & work uploads state
  const [deliverables, setDeliverables] = useState(() => {
    try {
      const saved = localStorage.getItem(`patent_deliverables_${record.project_code}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: `del_init_1`,
        name: `${record.project_code}_Draft_Specification_v1.docx`,
        category: 'Draft Complete Specification',
        size: '142 KB',
        uploaded_by: record.assigned_to || 'Drafter',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      }
    ];
  });
  const [uploadCategory, setUploadCategory] = useState('Draft Complete Specification');
  const [workdriveLink, setWorkdriveLink] = useState(record.workdrive_folder_url || '');

  // Applicant state
  const [applicantName, setApplicantName] = useState(record.applicant_name || 'Manipal Academy of Higher Education');
  const [applicantAddress, setApplicantAddress] = useState(record.applicant_address || 'Madhav Nagar, Manipal, Karnataka - 576104');
  const [entityCategory, setEntityCategory] = useState(record.entity_category || 'EDUCATIONAL_INSTITUTION');
  const [isMahe, setIsMahe] = useState(Boolean(record.is_mahe));
  const [applicantEmail, setApplicantEmail] = useState(record.applicant_email || 'ipr.office@manipal.edu');
  const [applicantPhone, setApplicantPhone] = useState(record.applicant_phone || '+91 820 292 2400');

  // Inventors state
  const [inventorsList, setInventorsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`patent_inventors_${record.project_code}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    if (record.inventors_summary) {
      return record.inventors_summary.split(',').map((inv, idx) => ({
        id: `inv_${idx + 1}`,
        name: inv.trim(),
        department: 'Department of Research & Innovation',
        email: `${inv.trim().toLowerCase().replace(/\s+/g, '.')}@manipal.edu`,
        phone: '+91 98450 XXXXX',
        nationality: 'Indian',
      }));
    }
    return [
      {
        id: 'inv_1',
        name: 'Dr. Principal Investigator',
        department: 'Biomedical & Engineering Sciences',
        email: 'pi.research@manipal.edu',
        phone: '+91 98450 12345',
        nationality: 'Indian',
      }
    ];
  });
  const [newInventor, setNewInventor] = useState({ name: '', department: '', email: '', phone: '', nationality: 'Indian' });
  const [showAddInventor, setShowAddInventor] = useState(false);

  // Editable manual fields state
  const [statusNotes, setStatusNotes] = useState(record.status_notes || '');
  const [suggestedAction, setSuggestedAction] = useState(record.suggested_action || '');
  const [issue, setIssue] = useState(record.issue || '');
  const [checklistDate, setChecklistDate] = useState(record.checklist_sent_date || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when selected record changes
  useEffect(() => {
    setCommitmentDate(record.client_commitment_date || '');
    setWorkdriveLink(record.workdrive_folder_url || '');
    setApplicantName(record.applicant_name || 'Manipal Academy of Higher Education');
    setApplicantAddress(record.applicant_address || 'Madhav Nagar, Manipal, Karnataka - 576104');
    setEntityCategory(record.entity_category || 'EDUCATIONAL_INSTITUTION');
    setIsMahe(Boolean(record.is_mahe));
    setStatusNotes(record.status_notes || '');
    setSuggestedAction(record.suggested_action || '');
    setIssue(record.issue || '');
    setChecklistDate(record.checklist_sent_date || '');
  }, [record.project_code]);

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
          { id: 'work', label: 'Work & Deliverables' },
          { id: 'timeline', label: 'Prosecution Timeline' },
          { id: 'forms', label: 'Statutory Forms' },
          { id: 'inventors', label: 'Applicants & Inventors' },
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
            {/* Interconnected Client Dossier from core.clients */}
            <div
              style={{
                borderRadius: '8px',
                border: '1.5px solid #2563EB',
                background: 'rgba(37, 99, 235, 0.04)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'rgba(37, 99, 235, 0.15)',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                      Interconnected Client Dossier
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Cross-referenced with Lextria Core Suite (<code>core.clients</code>)
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '10px',
                    background: matchedClient ? '#2563EB' : 'var(--line)',
                    color: matchedClient ? '#fff' : 'var(--muted)',
                  }}
                >
                  {matchedClient ? 'Connected ✓' : 'Unmatched'}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Legal Client Name</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ink)', marginTop: '2px' }}>
                    {matchedClient?.client_name || record.applicant_name || 'Manipal Academy of Higher Education'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Client Code (Prefix)</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                    {matchedClient?.client_code || record.project_code?.replace(/[0-9]/g, '') || 'MAHE'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Entity Classification</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                    {matchedClient?.entity_type || (record.is_mahe ? 'University / Educational' : 'Corporate')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Firm Portfolio Volume</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                    {clientMattersCount > 0 ? `${clientMattersCount} matters in firm` : 'Active Client'}
                  </div>
                </div>
              </div>
            </div>

            {/* 1. Client Delivery Commitment Tracking Panel */}
            <div
              style={{
                borderRadius: '8px',
                border: '1.5px solid #EA580C',
                background: 'rgba(234, 88, 12, 0.04)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'rgba(234, 88, 12, 0.15)',
                      color: '#EA580C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Target size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                      Client Delivery Commitment Date
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Drafters or Patent Admin can set client delivery date. Any changes or misses trigger automated alerts to Organisation & Team SPOC.
                    </div>
                  </div>
                </div>

                {/* Overdue / Near Badge */}
                {commitmentDate && (() => {
                  const now = new Date();
                  const diff = Math.round((new Date(commitmentDate) - now) / 86400000);
                  if (diff < 0) {
                    return (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: '1px solid #FCA5A5',
                        }}
                      >
                        🚨 Commitment Missed ({Math.abs(diff)}d Overdue) - SPOC Alerted
                      </span>
                    );
                  }
                  if (diff <= 7) {
                    return (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: '#FFEDD5',
                          color: '#EA580C',
                          border: '1px solid #FDBA74',
                        }}
                      >
                        ⚡ Near Commitment: {diff} days remaining
                      </span>
                    );
                  }
                  return (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      ✓ On Schedule ({diff} days left)
                    </span>
                  );
                })()}
              </div>

              {/* Date Input and Preset Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={commitmentDate}
                  onChange={(e) => setCommitmentDate(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />

                <div style={{ display: 'flex', gap: '4px' }}>
                  {[
                    { label: '+3 Days', days: 3 },
                    { label: '+7 Days', days: 7 },
                    { label: '+14 Days', days: 14 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + p.days);
                        setCommitmentDate(d.toISOString().split('T')[0]);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '5px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                  {commitmentDate && (
                    <button
                      type="button"
                      onClick={() => setCommitmentDate('')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '5px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        color: 'var(--muted)',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isUpdatingCommitment}
                  onClick={async () => {
                    setIsUpdatingCommitment(true);
                    try {
                      if (onUpdate) {
                        await onUpdate(record.project_code, {
                          client_commitment_date: commitmentDate || null,
                        });
                      }
                    } finally {
                      setIsUpdatingCommitment(false);
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#EA580C',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(234, 88, 12, 0.3)',
                    marginLeft: 'auto',
                  }}
                >
                  {isUpdatingCommitment ? 'Saving & Alerting...' : 'Save Commitment & Alert SPOC'}
                </button>
              </div>
            </div>

            {/* 2. Matter Roadblock & Problem Status Card */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                background: (record.issue || (Array.isArray(record.tags) && record.tags.includes('Ticket Raised')))
                  ? 'rgba(239, 68, 68, 0.06)'
                  : 'var(--page)',
                border: `1px solid ${(record.issue || (Array.isArray(record.tags) && record.tags.includes('Ticket Raised'))) ? '#EF4444' : 'var(--line)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertOctagon size={18} color={(record.issue || (Array.isArray(record.tags) && record.tags.includes('Ticket Raised'))) ? '#DC2626' : 'var(--muted)'} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    Matter Roadblock & Problem Radar
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {record.issue ? `Active Roadblock: "${record.issue}"` : 'No active blockers reported on this matter.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const currentTags = Array.isArray(record.tags) ? record.tags : (record.classification ? record.classification.split(',').map(s => s.trim()) : []);
                  const hasTicket = currentTags.includes('Ticket Raised');
                  const newTags = hasTicket ? currentTags.filter(t => t !== 'Ticket Raised') : [...currentTags, 'Ticket Raised'];
                  if (onUpdate) {
                    onUpdate(record.project_code, { tags: newTags });
                  }
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '5px',
                  border: '1px solid var(--line)',
                  background: (Array.isArray(record.tags) && record.tags.includes('Ticket Raised')) ? '#DC2626' : 'var(--surface)',
                  color: (Array.isArray(record.tags) && record.tags.includes('Ticket Raised')) ? '#fff' : 'var(--ink)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {(Array.isArray(record.tags) && record.tags.includes('Ticket Raised')) ? '✓ Ticket Raised (Resolve)' : '+ Raise Problem Ticket'}
              </button>
            </div>

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

        {/* WORK & DELIVERABLES TAB */}
        {activeTab === 'work' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Header & Cloud WorkDrive Sync */}
            <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} color="var(--accent)" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>Zoho WorkDrive & Cloud Repository</span>
                </div>
                {workdriveLink && (
                  <a
                    href={workdriveLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    Open Folder <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="url"
                  placeholder="Paste Zoho WorkDrive or Google Drive folder URL..."
                  value={workdriveLink}
                  onChange={(e) => setWorkdriveLink(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '12.5px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdate) {
                      onUpdate(record.project_code, { workdrive_folder_url: workdriveLink });
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Link
                </button>
              </div>
            </div>

            {/* Upload New Deliverable Form */}
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1.5px dashed var(--line)',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={16} color="var(--accent)" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>Upload Work & Drafting Deliverables</span>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)' }}>
                Upload provisional specifications, complete claims, technical drawings, or IDF for client sign-off.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Deliverable Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="Draft Complete Specification">Draft Complete Specification (.docx, .pdf)</option>
                    <option value="Provisional Specification">Provisional Specification (.docx, .pdf)</option>
                    <option value="Patent Claims Draft">Patent Claims Draft (.docx)</option>
                    <option value="Formal Drawings & Figures">Formal Drawings & Figures (.pdf, .png)</option>
                    <option value="Invention Disclosure Form (IDF)">Invention Disclosure Form (IDF)</option>
                    <option value="Prior Art & Novelty Search">Prior Art & Novelty Search Report</option>
                    <option value="Client Feedback & Queries">Client Feedback / Queries</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Select File from Device
                  </label>
                  <input
                    type="file"
                    id={`file_input_${record.project_code}`}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '11px',
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const newDel = {
                        id: `del_${Date.now()}`,
                        name: file.name,
                        category: uploadCategory,
                        size: `${Math.round(file.size / 1024)} KB`,
                        uploaded_by: record.assigned_to || 'Drafter',
                        created_at: new Date().toISOString(),
                      };
                      const updated = [newDel, ...deliverables];
                      setDeliverables(updated);
                      try {
                        localStorage.setItem(`patent_deliverables_${record.project_code}`, JSON.stringify(updated));
                      } catch {}
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* List of Deliverables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                  Active Deliverables ({deliverables.length})
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  All versions tracked for client presentation
                </span>
              </div>

              {deliverables.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--page)', borderRadius: '8px', color: 'var(--muted)', fontSize: '12px' }}>
                  No files uploaded yet for this application.
                </div>
              ) : (
                deliverables.map((del) => (
                  <div
                    key={del.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'var(--page)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <Paperclip size={16} color="var(--accent)" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                          {del.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: 'var(--muted)' }}>
                          <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>
                            {del.category}
                          </span>
                          <span>•</span>
                          <span>{del.size}</span>
                          <span>•</span>
                          <span>Uploaded by {del.uploaded_by} on {new Date(del.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([`Deliverable: ${del.name}\nProject: ${record.project_code}\nTitle: ${record.title}\nCategory: ${del.category}`], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = del.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <Download size={12} /> Download
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = deliverables.filter((d) => d.id !== del.id);
                          setDeliverables(updated);
                          try {
                            localStorage.setItem(`patent_deliverables_${record.project_code}`, JSON.stringify(updated));
                          } catch {}
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: '#DC2626',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Remove deliverable"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
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

        {/* APPLICANTS & INVENTORS TAB */}
        {activeTab === 'inventors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Applicant Profile Section */}
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building size={16} color="var(--accent)" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>Applicant Organization Details</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdate) {
                      onUpdate(record.project_code, {
                        applicant_name: applicantName,
                        applicant_address: applicantAddress,
                        entity_category: entityCategory,
                        is_mahe: isMahe,
                        applicant_email: applicantEmail,
                        applicant_phone: applicantPhone,
                      });
                    }
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '5px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Applicant Details
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Applicant Full Name
                  </label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Entity Classification
                  </label>
                  <select
                    value={entityCategory}
                    onChange={(e) => setEntityCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="EDUCATIONAL_INSTITUTION">Educational Institution (80% IPO fee concession)</option>
                    <option value="STARTUP">Recognized Startup</option>
                    <option value="SMALL_ENTITY">Small Entity (Form 28)</option>
                    <option value="NATURAL_PERSON">Natural Person</option>
                    <option value="LARGE_ENTITY">Large Entity / Others</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Registered Address for Service
                  </label>
                  <input
                    type="text"
                    value={applicantAddress}
                    onChange={(e) => setApplicantAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Normalized Inventors Roster */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} color="var(--accent)" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                    Inventors Roster ({inventorsList.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddInventor(!showAddInventor)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '5px',
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
                >
                  <Plus size={12} /> Add Inventor
                </button>
              </div>

              {/* Add Inventor Subform */}
              {showAddInventor && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    border: '1px solid var(--accent)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    Add New Inventor to Patent Application
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Full Name (e.g. Dr. Rajesh Kumar)"
                      value={newInventor.name}
                      onChange={(e) => setNewInventor({ ...newInventor, name: e.target.value })}
                      style={{ padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', fontSize: '12px' }}
                    />
                    <input
                      type="text"
                      placeholder="Department / Affiliation"
                      value={newInventor.department}
                      onChange={(e) => setNewInventor({ ...newInventor, department: e.target.value })}
                      style={{ padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', fontSize: '12px' }}
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newInventor.email}
                      onChange={(e) => setNewInventor({ ...newInventor, email: e.target.value })}
                      style={{ padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', fontSize: '12px' }}
                    />
                    <input
                      type="text"
                      placeholder="Phone / Mobile"
                      value={newInventor.phone}
                      onChange={(e) => setNewInventor({ ...newInventor, phone: e.target.value })}
                      style={{ padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', fontSize: '12px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddInventor(false)}
                      style={{ padding: '5px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'transparent', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newInventor.name.trim()) return;
                        const updated = [
                          ...inventorsList,
                          {
                            id: `inv_${Date.now()}`,
                            ...newInventor,
                          }
                        ];
                        setInventorsList(updated);
                        const summary = updated.map(i => i.name).join(', ');
                        try {
                          localStorage.setItem(`patent_inventors_${record.project_code}`, JSON.stringify(updated));
                        } catch {}
                        if (onUpdate) {
                          onUpdate(record.project_code, { inventors_summary: summary });
                        }
                        setNewInventor({ name: '', department: '', email: '', phone: '', nationality: 'Indian' });
                        setShowAddInventor(false);
                      }}
                      style={{ padding: '5px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Save Inventor
                    </button>
                  </div>
                </div>
              )}

              {/* Inventors List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {inventorsList.map((inv, idx) => (
                  <div
                    key={inv.id || idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'var(--page)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(37, 99, 235, 0.12)',
                          color: '#2563EB',
                          fontWeight: 800,
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                          {inv.name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                          {inv.department} • {inv.email} • {inv.phone}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = inventorsList.filter((_, i) => i !== idx);
                        setInventorsList(updated);
                        const summary = updated.map(i => i.name).join(', ');
                        try {
                          localStorage.setItem(`patent_inventors_${record.project_code}`, JSON.stringify(updated));
                        } catch {}
                        if (onUpdate) {
                          onUpdate(record.project_code, { inventors_summary: summary });
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                        background: 'transparent',
                        color: '#DC2626',
                        cursor: 'pointer',
                      }}
                      title="Remove inventor"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
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
