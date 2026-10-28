import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, ExternalLink, Calendar, FileText, User, AlertCircle,
  Clock, Shield, Building, Mail, Phone, Bookmark, CheckCircle2, AlertTriangle, Edit3,
  Tag as TagIcon, Upload, Download, Trash2, Plus, Target, Paperclip, Send, AlertOctagon,
  FileCheck, HelpCircle, IndianRupee, Eye, HardDrive, Cloud, FolderArchive, Maximize2,
  Minimize2, Search, FileCode
} from 'lucide-react';
import { getStatusColor } from '../constants/patentStatuses';
import { getFormFee, formatINR } from '../utils/feeSchedule';
import { validateSection17PostDating, addDays, addMonths, getUpcomingInventorUpdateCycle, calculateForm27Deadlines } from '../utils/statutoryDeadlines';
import DEFAULT_CLIENTS from '../data/clients.json';
import MiscFormsManager from './MiscFormsManager';

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

  // Docs Vault (Zoho WorkDrive) uploaded files state
  const [documents, setDocuments] = useState(() => {
    try {
      const saved = localStorage.getItem(`patent_docs_vault_${record.project_code}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const legacy = localStorage.getItem(`patent_deliverables_${record.project_code}`);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) return parsedLegacy;
      }
    } catch {}
    return [
      {
        id: `doc_idf_${record.project_code}`,
        name: `IDF_${record.project_code}_Invention_Disclosure.pdf`,
        category: 'Invention Disclosure Form (IDF)',
        size: '284 KB',
        type: 'application/pdf',
        uploaded_by: record.assigned_to || 'Anusha',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        workdrive_sync: true,
        workdrive_url: record.workdrive_folder_url || 'https://workdrive.zoho.com',
      },
      {
        id: `doc_spec_${record.project_code}`,
        name: `${record.project_code}_Complete_Specification_Form_2.pdf`,
        category: 'Complete Specification (Form 2)',
        size: '1.2 MB',
        type: 'application/pdf',
        uploaded_by: record.assigned_to || 'Anusha',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        workdrive_sync: true,
        workdrive_url: record.workdrive_folder_url || 'https://workdrive.zoho.com',
      },
      {
        id: `doc_drawings_${record.project_code}`,
        name: `${record.project_code}_Formal_Drawings_Figures.pdf`,
        category: 'Patent Drawings & Figures',
        size: '760 KB',
        type: 'application/pdf',
        uploaded_by: record.assigned_to || 'Anusha',
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        workdrive_sync: true,
        workdrive_url: record.workdrive_folder_url || 'https://workdrive.zoho.com',
      },
      {
        id: `doc_cbr_${record.project_code}`,
        name: `IPO_Filing_Receipt_CBR_${record.project_code}.pdf`,
        category: 'Official IPO CBR Receipt',
        size: '145 KB',
        type: 'application/pdf',
        uploaded_by: 'Paralegal',
        created_at: new Date().toISOString(),
        workdrive_sync: true,
        workdrive_url: record.workdrive_folder_url || 'https://workdrive.zoho.com',
      }
    ];
  });
  const [uploadCategory, setUploadCategory] = useState('Complete Specification (Form 2)');
  const [workdriveLink, setWorkdriveLink] = useState(record.workdrive_folder_url || '');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('ALL');
  const [isDragOver, setIsDragOver] = useState(false);

  // Filtered documents for Docs Vault
  const filteredDocuments = React.useMemo(() => {
    let list = documents;
    if (docCategoryFilter && docCategoryFilter !== 'ALL') {
      list = list.filter((d) => d.category === docCategoryFilter);
    }
    if (docSearchQuery.trim()) {
      const q = docSearchQuery.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
    }
    return list;
  }, [documents, docCategoryFilter, docSearchQuery]);

  // Handle files upload to Docs Vault (Zoho WorkDrive)
  const handleFilesUpload = (files) => {
    if (!files || files.length === 0) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newDoc = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          category: uploadCategory,
          size: file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
          type: file.type || 'application/octet-stream',
          dataUrl: event.target.result,
          uploaded_by: record.assigned_to || 'Associate Drafter',
          created_at: new Date().toISOString(),
          workdrive_sync: true,
          workdrive_url: workdriveLink || `https://workdrive.zoho.com/workspace/patents/${record.project_code}`,
        };
        setDocuments((prev) => {
          const updated = [newDoc, ...prev];
          try {
            localStorage.setItem(`patent_docs_vault_${record.project_code}`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // Download document
  const handleDownloadDoc = (doc) => {
    if (doc.dataUrl) {
      const a = document.createElement('a');
      a.href = doc.dataUrl;
      a.download = doc.name;
      a.click();
    } else {
      const blob = new Blob([`Lextria Patent Docs Vault\nProject Code: ${record.project_code}\nDocument: ${doc.name}\nCategory: ${doc.category}\nUploaded By: ${doc.uploaded_by}\nCreated At: ${doc.created_at}\n\n[Specification / Document payload archived in Zoho WorkDrive Vault]`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Applicant state
  const [applicantName, setApplicantName] = useState(record.applicant_name || 'Manipal Academy of Higher Education');
  const [applicantAddress, setApplicantAddress] = useState(record.applicant_address || 'Madhav Nagar, Manipal, Karnataka - 576104');
  const [entityCategory, setEntityCategory] = useState(record.entity_category || 'EDUCATIONAL_INSTITUTION');
  const [isMahe, setIsMahe] = useState(Boolean(record.is_mahe));
  const [applicantEmail, setApplicantEmail] = useState(record.applicant_email || 'ipr.office@manipal.edu');
  const [applicantPhone, setApplicantPhone] = useState(record.applicant_phone || '+91 820 292 2400');

  // Inventors state with institution, gender, nationality, country of residence (Requirement 1)
  const [inventorsList, setInventorsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`patent_inventors_${record.project_code}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    if (record.inventors && Array.isArray(record.inventors) && record.inventors.length > 0) {
      return record.inventors;
    }
    if (record.inventors_summary) {
      return record.inventors_summary.split(/[,;\n]+/).filter(Boolean).map((inv, idx) => ({
        id: `inv_${idx + 1}`,
        name: inv.trim().replace(/^\d+[\.\)]\s*/, ''),
        institution: record.applicant_name || 'Manipal Academy of Higher Education (MAHE)',
        gender: 'Male',
        nationality: 'Indian',
        country_of_residence: 'India',
        department: 'Department of Research & Innovation',
        email: `${inv.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@manipal.edu`,
        phone: '+91 98450 XXXXX',
      }));
    }
    return [
      {
        id: 'inv_1',
        name: 'Dr. Principal Investigator',
        institution: record.applicant_name || 'Manipal Academy of Higher Education (MAHE)',
        gender: 'Male',
        nationality: 'Indian',
        country_of_residence: 'India',
        department: 'Biomedical & Engineering Sciences',
        email: 'pi.research@manipal.edu',
        phone: '+91 98450 12345',
      }
    ];
  });
  const [newInventor, setNewInventor] = useState({
    name: '',
    institution: record.applicant_name || 'Manipal Academy of Higher Education (MAHE)',
    gender: 'Male',
    nationality: 'Indian',
    country_of_residence: 'India',
    department: '',
    email: '',
    phone: '',
  });
  const [showAddInventor, setShowAddInventor] = useState(false);

  // Miscellaneous Statutory Forms (Form 13 & Form 30) state
  const [miscForms, setMiscForms] = useState(() => {
    try {
      const saved = localStorage.getItem(`patent_misc_forms_${record.project_code}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    if (record.misc_forms && Array.isArray(record.misc_forms)) {
      return record.misc_forms;
    }
    if (record.form_13_filing_date) {
      return [
        {
          id: `mf_init_${record.project_code}`,
          form_type: 'FORM_13',
          sub_type: 'FORM_13_CORRECTION',
          sub_type_label: 'Form 13: Correction of details',
          fee_mode: 'WITH_FEE',
          status: 'FILED',
          filing_date: record.form_13_filing_date,
          cbr_number: record.form_13_particulars || 'CBR Recorded',
          details_notes: record.form_13_particulars || 'Pre-grant amendment under Section 57',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
    }
    return [];
  });

  const handleUpdateMiscForms = (updatedList) => {
    setMiscForms(updatedList);
    try {
      localStorage.setItem(`patent_misc_forms_${record.project_code}`, JSON.stringify(updatedList));
    } catch {}
    if (onUpdate) {
      onUpdate(record.project_code, { misc_forms: updatedList });
    }
  };

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
    <div
      className="drawer-backdrop-animate"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="drawer-panel-animate"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '680px',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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

            {(() => {
              const statusCol = getStatusColor(record.current_status);
              return (
                <span style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  background: statusCol.bg,
                  color: statusCol.text,
                  border: `1px solid ${statusCol.border}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusCol.dot }} />
                  {record.current_status || 'Status Not Set'}
                </span>
              );
            })()}
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
          { id: 'work', label: 'Docs Vault' },
          { id: 'timeline', label: 'Prosecution Timeline' },
          { id: 'inventors', label: 'Applicants & Inventors' },
          { id: 'notes', label: 'Senior Notes & Action' },
          { id: 'audit', label: 'History & Audit' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="nav-tab-btn"
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
        <div key={activeTab} className="animate-tab-pane">
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



            {/* Post-Dating Section 17 Status (Requirement 2) */}
            {(() => {
              const leeway = record.ps_filing_date && record.post_dated_date
                ? validateSection17PostDating(record.ps_filing_date, record.post_dated_date)
                : null;
              return (
                <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Section 17 Post-Dating Leeway Status
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>
                        {record.post_dated_date ? `Post-Dated to: ${record.post_dated_date}` : 'Not yet Postdated'}
                      </span>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                        {leeway?.isValid
                          ? `⏳ Leeway remaining: ${leeway.remainingMonths} months, ${leeway.remainingDays} days for further post-dating (Max allowed: ${leeway.maxAllowedDate})`
                          : (leeway ? `⚠️ ${leeway.message}` : 'Can be post-dated up to 6 months from original PS filing')}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: leeway && !leeway.isValid ? 'rgba(239, 68, 68, 0.15)' : 'rgba(78, 158, 86, 0.15)',
                      color: leeway && !leeway.isValid ? '#DC2626' : '#4E9E56'
                    }}>
                      {leeway?.isValid
                        ? `${leeway.totalDaysRemaining} Days Available`
                        : (record.remaining_post_date_days || 181) + ' Days Limit'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* DOCS VAULT TAB (Zoho WorkDrive Storage & In-Dashboard Document Viewing) */}
        {activeTab === 'work' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>


            {/* 2. Specification Content (Abstract & Claims) */}
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} color="var(--accent)" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>Specification Content (Abstract & Claims)</span>
                </div>
                {onOpenEdit && (
                  <button
                    onClick={() => onOpenEdit(record)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={12} /> Edit Abstract & Claims
                  </button>
                )}
              </div>

              {/* Abstract display */}
              <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--ink)' }}>
                    Abstract (Max 150 words)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '8px',
                      background: (record.abstract || '').trim().split(/\s+/).filter(Boolean).length > 150 ? '#fee2e2' : '#f1f5f9',
                      color: (record.abstract || '').trim().split(/\s+/).filter(Boolean).length > 150 ? '#dc2626' : '#475569'
                    }}>
                      {(record.abstract || '').trim().split(/\s+/).filter(Boolean).length} / 150 words
                    </span>
                    {record.abstract && (
                      <button
                        onClick={() => copyToClipboard(record.abstract, 'abstract')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px' }}
                        title="Copy Abstract"
                      >
                        {copiedField === 'abstract' ? <Check size={13} color="var(--ok-fg)" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '12.5px', color: record.abstract ? 'var(--ink)' : 'var(--muted)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {record.abstract || 'No abstract entered yet. Click "Edit Abstract & Claims" to add technical summary.'}
                </div>
              </div>

              {/* Claims display */}
              <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--ink)' }}>
                    Claims
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '8px',
                      background: '#ecfdf5',
                      color: '#065f46'
                    }}>
                      {(record.claims || '').trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                    {record.claims && (
                      <button
                        onClick={() => copyToClipboard(record.claims, 'claims')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px' }}
                        title="Copy Claims"
                      >
                        {copiedField === 'claims' ? <Check size={13} color="var(--ok-fg)" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: record.claims ? 'var(--ink)' : 'var(--muted)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.45',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {record.claims || 'No claims entered yet. Click "Edit Abstract & Claims" to add patent claims.'}
                </div>
              </div>
            </div>

            {/* 3. Direct Document Upload Zone (To Zoho WorkDrive) */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const files = Array.from(e.dataTransfer.files);
                handleFilesUpload(files);
              }}
              style={{
                padding: '18px',
                borderRadius: '10px',
                border: `2px dashed ${isDragOver ? '#2563EB' : 'var(--line)'}`,
                background: isDragOver ? 'rgba(37, 99, 235, 0.05)' : 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={16} color="#2563EB" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                    Upload Documents Directly to Dashboard (Zoho WorkDrive Vault)
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                  ☁️ Stored on WorkDrive
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)' }}>
                Drag and drop or browse files (PDF, DOCX, Drawings, IDF, Search Reports, CBR receipts) to upload directly for viewing, review, and reference.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Document Category / Type *
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
                      fontWeight: 600,
                    }}
                  >
                    <option value="Complete Specification (Form 2)">Complete Specification (Form 2)</option>
                    <option value="Provisional Specification (Form 2)">Provisional Specification (Form 2)</option>
                    <option value="Patent Claims Draft">Patent Claims Draft (.docx)</option>
                    <option value="Patent Drawings & Figures">Patent Drawings & Figures (.pdf, .png)</option>
                    <option value="Invention Disclosure Form (IDF)">Invention Disclosure Form (IDF)</option>
                    <option value="Prior Art & Novelty Search Report">Prior Art & Novelty Search Report</option>
                    <option value="Form 1 (Application Proof of Right)">Form 1 (Application Proof of Right)</option>
                    <option value="Form 3 (Foreign Filing Statement)">Form 3 (Foreign Filing Statement)</option>
                    <option value="Form 5 (Declaration of Inventorship)">Form 5 (Declaration of Inventorship)</option>
                    <option value="Form 26 (Power of Attorney)">Form 26 (Power of Attorney)</option>
                    <option value="Form 9 (Early Publication Receipt)">Form 9 (Early Publication Receipt)</option>
                    <option value="Form 18 / 18A (RFE Examination)">Form 18 / 18A (RFE Examination)</option>
                    <option value="First Examination Report (FER)">First Examination Report (FER)</option>
                    <option value="FER Reply & Technical Submissions">FER Reply & Technical Submissions</option>
                    <option value="Hearing Notice & Form 30">Hearing Notice & Form 30</option>
                    <option value="Letters Patent / Grant Certificate">Letters Patent / Grant Certificate</option>
                    <option value="Official IPO CBR Receipt">Official IPO CBR Receipt</option>
                    <option value="Client Correspondence & Instructions">Client Correspondence & Instructions</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Select File(s) to Upload
                  </label>
                  <input
                    type="file"
                    multiple
                    id={`file_input_${record.project_code}`}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '11.5px',
                    }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      handleFilesUpload(files);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Uploaded Documents List & Viewer Interface */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                    Docs Vault ({filteredDocuments.length})
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    All files ready for direct in-dashboard viewing & reference
                  </span>
                </div>

                {/* Filter / Search input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Filter docs..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '11.5px',
                      width: '140px',
                    }}
                  />
                </div>
              </div>

              {filteredDocuments.length === 0 ? (
                <div style={{ padding: '28px', textAlign: 'center', background: 'var(--page)', borderRadius: '8px', color: 'var(--muted)', fontSize: '12px' }}>
                  No documents found in vault matching your search.
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'var(--page)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '6px',
                          background: doc.name.endsWith('.pdf') ? '#fee2e2' : '#eff6ff',
                          color: doc.name.endsWith('.pdf') ? '#dc2626' : '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                          {doc.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '11px', color: 'var(--muted)' }}>
                          <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>
                            {doc.category}
                          </span>
                          <span>•</span>
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>Uploaded {new Date(doc.created_at).toLocaleDateString()} by {doc.uploaded_by}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', fontWeight: 600 }}>
                            • ☁️ WorkDrive
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {/* Direct View / Preview Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#2563EB',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                        }}
                        title="View document directly in dashboard"
                      >
                        <Eye size={13} /> View
                      </button>

                      {/* Download Button */}
                      <button
                        type="button"
                        onClick={() => handleDownloadDoc(doc)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}
                        title="Download to local device"
                      >
                        <Download size={13} />
                      </button>

                      {/* Open in WorkDrive */}
                      <a
                        href={doc.workdrive_url || workdriveLink || 'https://workdrive.zoho.com'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: 'var(--muted)',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}
                        title="Open in Zoho WorkDrive cloud"
                      >
                        <ExternalLink size={13} />
                      </a>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = documents.filter((d) => d.id !== doc.id);
                          setDocuments(updated);
                          try {
                            localStorage.setItem(`patent_docs_vault_${record.project_code}`, JSON.stringify(updated));
                          } catch {}
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: '#DC2626',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Delete document from vault"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TIMELINE & STATUTORY FORMS TAB */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. Statutory Prosecution Stepper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>Statutory Prosecution Stepper</div>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Live Lifecycle Progression</span>
              </div>
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

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--line)' }} />

            {/* 2. Comprehensive Statutory Forms Matrix */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Comprehensive Statutory Forms Matrix</div>
            
            {/* Form 1 Card */}
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Form 1 — Proof of Right</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      Govt Fee: ₹1,600 / ₹8,000
                    </span>
                  </div>
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
                  <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Form 26 — Power of Authority (POA)</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                      Govt Fee: Free (₹0)
                    </span>
                  </div>
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

            {/* Dedicated Miscellaneous Forms (Form 13, 6, 16, 30) Section */}
            <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--line)', marginTop: '4px' }}>
              <MiscFormsManager
                record={record}
                miscForms={miscForms}
                onUpdateMiscForms={handleUpdateMiscForms}
              />
            </div>

            {/* Other Forms List */}
            {[
              { code: 'Form 2', name: 'Specification (Provisional / Complete)', fee: 'Free (up to 30p & 10c)', date: record.ps_filing_date || record.cs_filing_date },
              { code: 'Form 3', name: 'Section 8 Foreign Undertaking', fee: 'Free (₹0)', date: record.form_3_filing_date, dead: record.form_3_deadline },
              { code: 'Form 9', name: 'Early Publication Request', fee: '₹2,500 / ₹12,500', date: record.form_9_filing_date },
              { code: 'Form 18 / 18A', name: 'Request for Examination (RFE)', fee: '₹4,000 / ₹20,000 (F18) | ₹8,000 / ₹60,000 (F18A)', date: record.form_18_filing_date, dead: record.rfe_deadline },
              { code: 'Form 13', name: 'Amendments (Sec 57)', fee: '₹800 / ₹4,000 (Pre-grant)', date: record.form_13_filing_date, detail: record.form_13_particulars },
              { code: 'Form 4', name: 'Extension of Time (Rule 24B(6))', fee: '₹1,000/mo / ₹4,000/mo', date: record.form_4_fer_filing_date },
              { code: 'Form 30', name: 'Hearing Attendance (Rule 62(2))', fee: '₹1,500 / ₹7,500', date: record.hearing_date },
              { code: 'Form 27', name: 'Commercial Working Statement', fee: 'Free (₹0)', date: record.form_27_filing_date },
              { code: 'Sec 53 Renewals', name: 'Annuity Maintenance (Y3-Y20)', fee: 'Y3-Y6: ₹800/yr / ₹4,000/yr', date: record.grant_date },
            ].map((f, idx) => (
              <div key={idx} style={{ padding: '10px 14px', borderRadius: '6px', background: 'var(--page)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{f.code} — {f.name}</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--accent)', background: 'var(--surface)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                      Govt Fee: {f.fee}
                    </span>
                  </div>
                  {f.detail && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{f.detail}</div>}
                  {f.dead && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Deadline: {f.dead}</div>}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: f.date ? 'var(--ok-fg)' : 'var(--muted)' }}>
                  {f.date ? `Filed on ${f.date}` : 'Not Filed'}
                </span>
              </div>
            ))}
            </div>
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
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>
                    Add New Inventor (Institution, Gender, Nationality & Residence)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Rajesh Kumar"
                        value={newInventor.name}
                        onChange={(e) => setNewInventor({ ...newInventor, name: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Institution / University *</label>
                      <input
                        type="text"
                        placeholder="e.g. Manipal Institute of Technology (MIT)"
                        value={newInventor.institution}
                        onChange={(e) => setNewInventor({ ...newInventor, institution: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Gender</label>
                      <select
                        value={newInventor.gender}
                        onChange={(e) => setNewInventor({ ...newInventor, gender: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Nationality</label>
                      <input
                        type="text"
                        placeholder="e.g. Indian"
                        value={newInventor.nationality}
                        onChange={(e) => setNewInventor({ ...newInventor, nationality: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Country of Residence</label>
                      <input
                        type="text"
                        placeholder="e.g. India"
                        value={newInventor.country_of_residence}
                        onChange={(e) => setNewInventor({ ...newInventor, country_of_residence: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Department / School</label>
                      <input
                        type="text"
                        placeholder="e.g. Dept of Biotechnology"
                        value={newInventor.department}
                        onChange={(e) => setNewInventor({ ...newInventor, department: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. inventor@institution.edu"
                        value={newInventor.email}
                        onChange={(e) => setNewInventor({ ...newInventor, email: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Phone / Mobile</label>
                      <input
                        type="text"
                        placeholder="e.g. +91 98450 12345"
                        value={newInventor.phone}
                        onChange={(e) => setNewInventor({ ...newInventor, phone: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddInventor(false)}
                      style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}
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
                          onUpdate(record.project_code, { inventors: updated, inventors_summary: summary });
                        }
                        setNewInventor({
                          name: '',
                          institution: record.applicant_name || '',
                          gender: 'Male',
                          nationality: 'Indian',
                          country_of_residence: 'India',
                          department: '',
                          email: '',
                          phone: '',
                        });
                        setShowAddInventor(false);
                      }}
                      style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Save Inventor
                    </button>
                  </div>
                </div>
              )}

              {/* Inventors List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {inventorsList.map((inv, idx) => (
                  <div
                    key={inv.id || idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'var(--page)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
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
                          <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--ink)' }}>
                            {inv.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Building size={12} /> {inv.institution || record.applicant_name || 'Institution not specified'}
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
                            onUpdate(record.project_code, { inventors: updated, inventors_summary: summary });
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

                    {/* Metadata Badges: Gender, Nationality, Country of Residence */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', fontWeight: 600 }}>
                        Gender: <strong>{inv.gender || 'Not specified'}</strong>
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', fontWeight: 600 }}>
                        Nationality: <strong>{inv.nationality || 'Indian'}</strong>
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', fontWeight: 600 }}>
                        Residence: <strong>{inv.country_of_residence || 'India'}</strong>
                      </span>
                      {inv.department && (
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                          {inv.department}
                        </span>
                      )}
                      {inv.email && (
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                          {inv.email}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. Inventor Communication & Statutory Compliance Rules (Requirements 5, 6, 7) */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} color="var(--accent)" />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Inventor Communication & Tracking Schedule
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {/* 3-Day Filing Ack */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: (record.current_status || '').toLowerCase().includes('sent for filing') ? 'rgba(245, 158, 11, 0.1)' : 'var(--page)',
                      border: `1px solid ${(record.current_status || '').toLowerCase().includes('sent for filing') ? 'rgba(245, 158, 11, 0.3)' : 'var(--line)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                        3-Day Filing Acknowledgment to Inventor
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Triggered on 'Sent for filing' for PS, CS, PS-CS, FER reply, WS
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: (record.current_status || '').toLowerCase().includes('sent for filing') ? '#F59E0B' : 'var(--line)',
                        color: (record.current_status || '').toLowerCase().includes('sent for filing') ? '#fff' : 'var(--muted)',
                      }}
                    >
                      {(record.current_status || '').toLowerCase().includes('sent for filing') ? 'Action Due (3 Days)' : 'Inactive'}
                    </span>
                  </div>

                  {/* 6-Day FER Reply Draft Confirmation */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: (record.current_status || '').toLowerCase().includes('fer received') ? 'rgba(234, 88, 12, 0.1)' : 'var(--page)',
                      border: `1px solid ${(record.current_status || '').toLowerCase().includes('fer received') ? 'rgba(234, 88, 12, 0.3)' : 'var(--line)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                        6-Day FER Reply Draft Confirmation
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Triggered upon 'FER received' to send response draft to inventor
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: (record.current_status || '').toLowerCase().includes('fer received') ? '#EA580C' : 'var(--line)',
                        color: (record.current_status || '').toLowerCase().includes('fer received') ? '#fff' : 'var(--muted)',
                      }}
                    >
                      {(record.current_status || '').toLowerCase().includes('fer received') ? 'Action Due (6 Days)' : 'Inactive'}
                    </span>
                  </div>

                  {/* Bi-Monthly Updates */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: (record.ps_filing_date || record.cs_filing_date) ? 'rgba(99, 102, 241, 0.08)' : 'var(--page)',
                      border: `1px solid ${(record.ps_filing_date || record.cs_filing_date) ? 'rgba(99, 102, 241, 0.25)' : 'var(--line)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                        Bi-Monthly Post-Filing Updates (Every 2 Months)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Scheduled every 2 months after PS or CS filing (whichever is earlier)
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: (record.ps_filing_date || record.cs_filing_date) ? 'rgba(99, 102, 241, 0.15)' : 'var(--line)',
                        color: (record.ps_filing_date || record.cs_filing_date) ? '#6366F1' : 'var(--muted)',
                      }}
                    >
                      {(record.ps_filing_date || record.cs_filing_date) ? 'Active (Every 2 Mos)' : 'Pending Filing'}
                    </span>
                  </div>
                </div>
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

      {/* In-Dashboard Document Viewer Modal */}
      {previewDoc && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: 'var(--surface)',
              borderRadius: '12px',
              width: '92vw',
              maxWidth: '1000px',
              height: '86vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--line)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--page)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--ink)',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '500px',
                      }}
                      title={previewDoc.name}
                    >
                      {previewDoc.name}
                    </h3>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563EB',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {previewDoc.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                    {previewDoc.size} • Uploaded {new Date(previewDoc.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} • By {previewDoc.uploaded_by}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {previewDoc.workdrive_url && (
                  <a
                    href={previewDoc.workdrive_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(5, 150, 105, 0.1)',
                      color: '#059669',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      border: '1px solid rgba(5, 150, 105, 0.25)',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Open in Zoho WorkDrive</span>
                  </a>
                )}

                <button
                  onClick={() => handleDownloadDoc(previewDoc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#2563EB',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Close viewer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Viewer Content Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                background: 'var(--page)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
            >
              {previewDoc.dataUrl && (previewDoc.type?.includes('pdf') || previewDoc.name?.toLowerCase().endsWith('.pdf')) ? (
                <iframe
                  src={previewDoc.dataUrl}
                  title={previewDoc.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                  }}
                />
              ) : previewDoc.dataUrl && (previewDoc.type?.includes('image') || previewDoc.name?.match(/\.(png|jpe?g|svg|webp|gif)$/i)) ? (
                <div style={{ textAlign: 'center', maxHeight: '100%', overflow: 'auto' }}>
                  <img
                    src={previewDoc.dataUrl}
                    alt={previewDoc.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '75vh',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                </div>
              ) : (
                /* Rich Patent Document Preview Card for DOCX/Forms/Drawings/Receipts */
                <div
                  style={{
                    width: '100%',
                    maxWidth: '800px',
                    background: 'var(--surface)',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    padding: '36px 48px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    color: '#0f172a',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#64748b', fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>
                      GOVERNMENT OF INDIA PATENT OFFICE • THE PATENTS ACT, 1970
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '8px', color: '#0f172a' }}>
                      {formData.title || record.title || 'Patent Specification Document'}
                    </h2>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>
                      Docket Reference: <strong>{record.project_code}</strong> | Application No: <strong>{record.application_number || 'To be allocated by IPO'}</strong>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px', fontSize: '13.5px', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563EB', fontFamily: 'Inter, sans-serif', marginBottom: '6px' }}>
                      Applicant / Assignee:
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {record.applicant_name || 'Manipal Academy of Higher Education (MAHE)'}
                    </div>
                  </div>

                  {formData.abstract && (
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563EB', fontFamily: 'Inter, sans-serif', marginBottom: '6px' }}>
                        Abstract of Invention (Form 2):
                      </div>
                      <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--ink)', margin: 0, fontStyle: 'italic', background: 'var(--page)', padding: '14px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                        {formData.abstract}
                      </p>
                    </div>
                  )}

                  {formData.claims && (
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563EB', fontFamily: 'Inter, sans-serif', marginBottom: '6px' }}>
                        Claims:
                      </div>
                      <div style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--ink)', whiteSpace: 'pre-wrap', background: 'var(--page)', padding: '14px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                        {formData.claims}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: '28px',
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'rgba(37, 99, 235, 0.05)',
                      border: '1px dashed #2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                        Stored in Zoho WorkDrive Cloud Vault
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        Filename: {previewDoc.name} • {previewDoc.size}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleDownloadDoc(previewDoc)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: '#2563EB',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Download size={13} />
                        Download File
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
