import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Copy, Check, ExternalLink, Calendar, FileText, User, AlertCircle,
  Clock, Shield, Building, Mail, Phone, Bookmark, CheckCircle2, AlertTriangle, Edit3,
  Tag as TagIcon, Upload, Download, Trash2, Plus, Target, Paperclip, Send, AlertOctagon,
  FileCheck, HelpCircle, IndianRupee, Eye, HardDrive, Cloud, FolderArchive, Maximize2,
  Minimize2, Search, FileCode, CheckCircle, ChevronRight
} from 'lucide-react';
import { getStatusColor, STATUTORY_STATUSES } from '../constants/patentStatuses';
import { getFormFee, formatINR } from '../utils/feeSchedule';
import { validateSection17PostDating, addDays, addMonths, calculateForm27Deadlines } from '../utils/statutoryDeadlines';
import { getMiscFormStatusInfo, getMainFormTypeInfo } from '../constants/miscFormsConstants';
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
  auditLogs = [],
  initialTab = 'overview'
}) {
  if (!record) return null;

  const clients = (Array.isArray(clientsProp) && clientsProp.length > 0) ? clientsProp : DEFAULT_CLIENTS;

  const [copiedField, setCopiedField] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, record?.project_code]);

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
  const filteredDocuments = useMemo(() => {
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

  // Handle files upload to Docs Vault
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

  const handleDeleteDoc = (docId) => {
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== docId);
      try {
        localStorage.setItem(`patent_docs_vault_${record.project_code}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (previewDoc && previewDoc.id === docId) {
      setPreviewDoc(null);
    }
  };

  const handleDownloadDoc = (doc) => {
    if (doc.dataUrl) {
      const a = document.createElement('a');
      a.href = doc.dataUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(doc.workdrive_url || 'https://workdrive.zoho.com', '_blank');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  };

  // Applicant Profile state
  const [applicantName, setApplicantName] = useState(record.applicant_name || '');
  const [applicantAddress, setApplicantAddress] = useState(record.applicant_address || '');
  const [entityCategory, setEntityCategory] = useState(record.entity_category || 'EDUCATIONAL_INSTITUTION');
  const [applicantEmail, setApplicantEmail] = useState(record.applicant_email || '');
  const [applicantPhone, setApplicantPhone] = useState(record.applicant_phone || '');

  // Normalized Inventors Roster state (read-only in overview, editable via Edit modal)
  const inventorsList = useMemo(() => {
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
        institution: record.applicant_name || 'Organization on file',
        gender: 'Male',
        nationality: 'Indian',
        country_of_residence: 'India',
        department: 'Research & Innovation',
        email: `${inv.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@client.org`,
        phone: '+91 98450 XXXXX',
      }));
    }
    return [
      {
        id: 'inv_1',
        name: 'Principal Investigator',
        institution: record.applicant_name || 'Organization on file',
        gender: 'Male',
        nationality: 'Indian',
        country_of_residence: 'India',
        department: 'R&D Department',
        email: 'pi.research@client.org',
        phone: '+91 98450 12345',
      }
    ];
  }, [record.project_code, record.inventors, record.inventors_summary, record.applicant_name]);

  // Miscellaneous Statutory Forms list (Form 1, 26, 13, 6, 16, 27, 4, 30)
  const miscForms = useMemo(() => {
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
  }, [record.project_code, record.misc_forms, record.form_13_filing_date, record.form_13_particulars]);

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
    setApplicantName(record.applicant_name || '');
    setApplicantAddress(record.applicant_address || '');
    setEntityCategory(record.entity_category || 'EDUCATIONAL_INSTITUTION');
    setStatusNotes(record.status_notes || '');
    setSuggestedAction(record.suggested_action || '');
    setIssue(record.issue || '');
    setChecklistDate(record.checklist_sent_date || '');
  }, [record.project_code]);

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAllDetails = () => {
    const inventorsText = inventorsList && inventorsList.length > 0
      ? inventorsList.map((inv, idx) => 
          `  ${idx + 1}. ${inv.name}\n` +
          `     Institution: ${inv.institution || applicantName || record.applicant_name || 'N/A'}\n` +
          `     Gender: ${inv.gender || 'N/A'} | Nationality: ${inv.nationality || 'N/A'} | Country of Residence: ${inv.country_of_residence || 'N/A'}\n` +
          `     Email: ${inv.email || 'N/A'} | Phone: ${inv.phone || 'N/A'}`
        ).join('\n\n')
      : '  No inventors registered.';

    const dossierText = [
      `=================================================================`,
      `PATENT APPLICATION DOSSIER: ${record.project_code || 'N/A'}`,
      `=================================================================`,
      `Docket Reference: ${record.project_code || 'N/A'}`,
      `Application Number: ${record.application_number || 'Pending Assignment'}`,
      `Patent Number: ${record.patent_number || 'Not Yet Granted'}`,
      `Application Type: ${record.specification_type || record.application_type || record.type || (record.cs_filing_date && record.ps_filing_date ? 'PS-CS' : (record.cs_filing_date ? 'CS' : 'PS'))}`,
      `Current Status: ${record.current_status || 'Pending'}`,
      `Jurisdiction: India (Indian Patent Office - IPO)`,
      ``,
      `--- TITLE OF INVENTION ---`,
      `${record.title || 'Untitled Invention'}`,
      ``,
      `--- APPLICANT / ASSIGNEE ---`,
      `Applicant Name: ${applicantName || record.applicant_name || 'N/A'}`,
      `Entity Classification: ${entityCategory || record.entity_category || 'N/A'}`,
      `Registered Address: ${applicantAddress || record.applicant_address || 'Address on file'}`,
      `Contact Email: ${applicantEmail || record.applicant_email || 'N/A'}`,
      `Contact Phone: ${applicantPhone || record.applicant_phone || 'N/A'}`,
      ``,
      `--- INVENTORS ROSTER (${inventorsList.length}) ---`,
      inventorsText,
      ``,
      `--- ABSTRACT OF INVENTION ---`,
      `${record.abstract || 'No abstract entered.'}`,
      ``,
      `--- PATENT CLAIMS ---`,
      `${record.claims || 'No claims entered.'}`,
      ``,
      `--- KEY STATUTORY & PROSECUTION DATES ---`,
      `- IDF Receipt Date: ${record.idf_date || 'N/A'}`,
      `- Provisional Specification (PS) Filing Date: ${record.ps_filing_date || 'N/A'}`,
      `- Complete Specification (CS) Filing Date: ${record.cs_filing_date || 'N/A'}`,
      `- Section 11A Publication Date: ${record.publication_date || 'N/A'}`,
      `- Request for Examination (Form 18/18A) Filing Date: ${record.form_18_filing_date || record.rfe_date || 'N/A'}`,
      `- First Examination Report (FER) Issue Date: ${record.fer_notice_date || 'N/A'}`,
      `- FER Response Deadline: ${record.fer_deadline || 'N/A'}`,
      `- Hearing Date: ${record.hearing_date || 'N/A'}`,
      `- Patent Grant Date: ${record.grant_date || 'N/A'}`,
      `=================================================================`
    ].join('\n');

    copyToClipboard(dossierText, 'all_details');
  };

  const handleCopyApplicantDetails = () => {
    const text = [
      `APPLICANT DETAILS:`,
      `Name: ${applicantName || record.applicant_name || 'N/A'}`,
      `Entity Classification: ${entityCategory || record.entity_category || 'N/A'}`,
      `Address: ${applicantAddress || record.applicant_address || 'Address on file'}`,
      `Email: ${applicantEmail || record.applicant_email || 'N/A'}`,
      `Phone: ${applicantPhone || record.applicant_phone || 'N/A'}`
    ].join('\n');
    copyToClipboard(text, 'applicant');
  };

  const handleCopyAllInventors = () => {
    if (!inventorsList || inventorsList.length === 0) {
      copyToClipboard('No inventors listed.', 'inventors_all');
      return;
    }
    const text = [
      `INVENTORS ROSTER (${inventorsList.length}):`,
      ...inventorsList.map((inv, idx) => 
        `${idx + 1}. ${inv.name}\n` +
        `   Institution: ${inv.institution || applicantName || record.applicant_name || 'N/A'}\n` +
        `   Gender: ${inv.gender || 'N/A'} | Nationality: ${inv.nationality || 'N/A'} | Country of Residence: ${inv.country_of_residence || 'N/A'}\n` +
        `   Email: ${inv.email || 'N/A'} | Phone: ${inv.phone || 'N/A'}`
      )
    ].join('\n\n');
    copyToClipboard(text, 'inventors_all');
  };

  const handleCopySingleInventor = (inv, idx) => {
    const text = [
      `Inventor ${idx + 1}: ${inv.name}`,
      `Institution: ${inv.institution || applicantName || record.applicant_name || 'N/A'}`,
      `Gender: ${inv.gender || 'N/A'}`,
      `Nationality: ${inv.nationality || 'N/A'}`,
      `Country of Residence: ${inv.country_of_residence || 'N/A'}`,
      `Email: ${inv.email || 'N/A'}`,
      `Phone: ${inv.phone || 'N/A'}`
    ].join('\n');
    copyToClipboard(text, `inv_${inv.id || idx}`);
  };

  const handleSaveNotes = async () => {
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

  const currentStatusCol = getStatusColor(record.current_status);

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
        {/* Drawer Header - Clean, balanced, status directly editable */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Main Top Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            {/* Left Cluster: Project Code + Copy Button + Interactive Status Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '-0.3px',
                color: 'var(--ink)'
              }}>
                {record.project_code}
              </span>

              <button
                type="button"
                onClick={() => copyToClipboard(record.project_code, 'code')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Copy Project Code"
              >
                {copiedField === 'code' ? <Check size={15} color="var(--ok-fg)" /> : <Copy size={15} />}
              </button>

              {/* Direct Status Selector Dropdown */}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <select
                  value={record.current_status || ''}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    if (onUpdate) {
                      onUpdate(record.project_code, { current_status: newStatus });
                    }
                  }}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '5px 28px 5px 12px',
                    borderRadius: '14px',
                    border: `1.5px solid ${currentStatusCol.border}`,
                    background: currentStatusCol.bg,
                    color: currentStatusCol.text,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  title="Directly update matter prosecution status"
                >
                  {STATUTORY_STATUSES.map((st) => (
                    <option
                      key={st.name}
                      value={st.name}
                      style={{
                        background: 'var(--surface, #1e293b)',
                        color: 'var(--ink, #f8fafc)',
                        fontWeight: 600
                      }}
                    >
                      {st.name}
                    </option>
                  ))}
                </select>
                <span style={{
                  position: 'absolute',
                  right: '9px',
                  pointerEvents: 'none',
                  fontSize: '9px',
                  color: currentStatusCol.text,
                  fontWeight: 900
                }}>
                  ▼
                </span>
              </div>
            </div>

            {/* Right Cluster: Copy All Details + Edit Button + Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCopyAllDetails}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: copiedField === 'all_details' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                  color: copiedField === 'all_details' ? '#059669' : 'var(--ink)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                title="Copy Complete Structured Patent Dossier"
              >
                {copiedField === 'all_details' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                {copiedField === 'all_details' ? 'Dossier Copied!' : 'Copy All Details'}
              </button>

              {onOpenEdit && (
                <button
                  type="button"
                  onClick={() => onOpenEdit(record)}
                  style={{
                    padding: '6px 14px',
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
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Close Drawer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tags Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                >
                  {isApplied ? '✓ ' : '+ '}
                  {tg}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5 Clean Tabs: Overview, Master Timeline, Internal team notes, Docs Vault, History & Audit */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--line)',
          padding: '0 24px',
          background: 'var(--surface)',
          gap: '20px'
        }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'timeline', label: 'Master Timeline' },
            { id: 'notes', label: 'Internal team notes' },
            { id: 'work', label: 'Docs Vault' },
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
                fontWeight: activeTab === t.id ? 800 : 600,
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

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. Patent Key Identifiers Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'var(--page)',
                  border: '1px solid var(--line)'
                }}>
                  {/* Application Number */}
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Application Number
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink)' }}>
                        {record.application_number || 'Not Yet Assigned'}
                      </span>
                      {record.application_number && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(record.application_number, 'app_no')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px' }}
                          title="Copy Application Number"
                        >
                          {copiedField === 'app_no' ? <Check size={12} color="var(--ok-fg)" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Patent Number */}
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Patent Number
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: record.patent_number ? '#059669' : 'var(--muted)' }}>
                        {record.patent_number || 'Not Yet Granted'}
                      </span>
                      {record.patent_number && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(record.patent_number, 'pat_no')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px' }}
                          title="Copy Patent Number"
                        >
                          {copiedField === 'pat_no' ? <Check size={12} color="var(--ok-fg)" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Specification Type */}
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Specification Type
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>
                      {record.specification_type || record.application_type || record.type || (record.cs_filing_date && record.ps_filing_date ? 'PS to CS' : (record.cs_filing_date ? 'Complete (CS)' : 'Provisional (PS)'))}
                    </div>
                  </div>

                  {/* Docket Reference */}
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Docket Reference
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)' }}>
                        {record.project_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(record.project_code, 'docket')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px' }}
                        title="Copy Docket Reference"
                      >
                        {copiedField === 'docket' ? <Check size={12} color="var(--ok-fg)" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Invention Title */}
                <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Invention Title
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(record.title || '', 'title')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                        background: copiedField === 'title' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                        color: copiedField === 'title' ? '#059669' : 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Copy Title"
                    >
                      {copiedField === 'title' ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                      {copiedField === 'title' ? 'Copied Title' : 'Copy Title'}
                    </button>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.45 }}>
                    {record.title || 'Untitled Invention'}
                  </div>
                </div>

                {/* 3. Applicant Details */}
                <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={14} color="var(--accent)" /> Applicant Details
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyApplicantDetails}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                        background: copiedField === 'applicant' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                        color: copiedField === 'applicant' ? '#059669' : 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Copy Applicant Information"
                    >
                      {copiedField === 'applicant' ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                      {copiedField === 'applicant' ? 'Copied' : 'Copy Applicant'}
                    </button>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>
                    {applicantName || record.applicant_name || 'N/A'}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                    <span>Classification: <strong>{entityCategory || record.entity_category || 'General Entity'}</strong></span>
                    <span>•</span>
                    <span>Address: {applicantAddress || record.applicant_address || 'Address on file'}</span>
                  </div>

                  {(applicantEmail || record.applicant_email || applicantPhone || record.applicant_phone) && (
                    <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '11.5px', color: 'var(--muted)' }}>
                      {(applicantEmail || record.applicant_email) && (
                        <span>Email: <strong>{applicantEmail || record.applicant_email}</strong></span>
                      )}
                      {(applicantPhone || record.applicant_phone) && (
                        <span>Phone: <strong>{applicantPhone || record.applicant_phone}</strong></span>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Inventors Details Roster (Read-only, additions/edits inside Edit modal) */}
                <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="var(--accent)" /> Inventors Details ({inventorsList.length})
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAllInventors}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                        background: copiedField === 'inventors_all' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                        color: copiedField === 'inventors_all' ? '#059669' : 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Copy All Inventors"
                    >
                      {copiedField === 'inventors_all' ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                      {copiedField === 'inventors_all' ? 'Copied All' : 'Copy All Inventors'}
                    </button>
                  </div>

                  {inventorsList.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', padding: '8px' }}>
                      No inventors registered. Use the Edit button to add inventors.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {inventorsList.map((inv, idx) => (
                        <div
                          key={inv.id || idx}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            background: 'var(--surface)',
                            border: '1px solid var(--line)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'rgba(37, 99, 235, 0.12)',
                                color: '#2563EB',
                                fontSize: '11px',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {idx + 1}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                                {inv.name}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopySingleInventor(inv, idx)}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--line)',
                                background: copiedField === `inv_${inv.id || idx}` ? 'rgba(16, 185, 129, 0.15)' : 'var(--page)',
                                color: copiedField === `inv_${inv.id || idx}` ? '#059669' : 'var(--muted)',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Copy inventor details"
                            >
                              {copiedField === `inv_${inv.id || idx}` ? <Check size={10} color="#059669" /> : <Copy size={10} />}
                              {copiedField === `inv_${inv.id || idx}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>

                          <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600 }}>
                            {inv.institution || record.applicant_name || 'Institution on record'}
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                            <span>Gender: <strong>{inv.gender || 'N/A'}</strong></span>
                            <span>•</span>
                            <span>Nationality: <strong>{inv.nationality || 'Indian'}</strong></span>
                            <span>•</span>
                            <span>Residence: <strong>{inv.country_of_residence || 'India'}</strong></span>
                            {inv.department && (
                              <>
                                <span>•</span>
                                <span>{inv.department}</span>
                              </>
                            )}
                            {inv.email && (
                              <>
                                <span>•</span>
                                <span>{inv.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Drafter & Filing Agent Assigned */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'var(--page)',
                  border: '1px solid var(--line)'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Assigned Drafter
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink)', marginTop: '4px' }}>
                      {record.assigned_to || 'Unassigned'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Filing Agent / Operations
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink)', marginTop: '4px' }}>
                      {record.filed_by || 'Lextria IP Operations'}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: MASTER TIMELINE */}
            {activeTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* 1. Section 17 Post-Dating Leeway Status Card (Moved from Overview) */}
                {(() => {
                  const leeway = record.ps_filing_date && record.post_dated_date
                    ? validateSection17PostDating(record.ps_filing_date, record.post_dated_date)
                    : null;
                  return (
                    <div style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      background: 'var(--page)',
                      border: '1.5px solid var(--line)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Section 17 Post-Dating Leeway Status
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>
                            {record.post_dated_date ? `Post-Dated to: ${record.post_dated_date}` : 'Not yet Postdated'}
                          </span>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                            {leeway?.isValid
                              ? `⏳ Leeway remaining: ${leeway.remainingMonths} months, ${leeway.remainingDays} days for further post-dating (Max allowed: ${leeway.maxAllowedDate})`
                              : (leeway ? `⚠️ ${leeway.message}` : 'Can be post-dated by up to 6 months (181 days) from original PS filing')}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          background: leeway && !leeway.isValid ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: leeway && !leeway.isValid ? '#DC2626' : '#059669',
                          border: `1px solid ${leeway && !leeway.isValid ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                          {leeway?.isValid
                            ? `${leeway.totalDaysRemaining} Days Available`
                            : `${record.remaining_post_date_days || 181} Days Limit`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Client Delivery Commitment Tracking Panel (Moved from Overview) */}
                <div style={{
                  borderRadius: '8px',
                  border: '1.5px solid #EA580C',
                  background: 'rgba(234, 88, 12, 0.04)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: 'rgba(234, 88, 12, 0.15)',
                        color: '#EA580C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Target size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                          Client Delivery Commitment Date
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Drafters & Patent Admin commit to deliver deliverables by this deadline. Misses trigger automated SPOC alerts.
                        </div>
                      </div>
                    </div>

                    {commitmentDate && (() => {
                      const now = new Date();
                      const diff = Math.round((new Date(commitmentDate) - now) / 86400000);
                      if (diff < 0) {
                        return (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '8px',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FCA5A5',
                          }}>
                            🚨 Commitment Missed ({Math.abs(diff)}d Overdue) - SPOC Alerted
                          </span>
                        );
                      }
                      if (diff <= 7) {
                        return (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '8px',
                            background: '#FFEDD5',
                            color: '#EA580C',
                            border: '1px solid #FDBA74',
                          }}>
                            ⚡ Near Commitment: {diff} days remaining
                          </span>
                        );
                      }
                      return (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#059669',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}>
                          ✓ On Schedule ({diff} days left)
                        </span>
                      );
                    })()}
                  </div>

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

                {/* 3. Master Statutory Prosecution Timeline & Interleaved Miscellaneous Forms Stream */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="var(--accent)" />
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>
                        Statutory Timeline & Filed Miscellaneous Forms
                      </span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                      Progression aligned with official lifecycle & Form tracker
                    </span>
                  </div>

                  {/* Interleaved Timeline Items */}
                  {(() => {
                    // Generate full unified chronological milestones array
                    const timelineItems = [
                      {
                        key: 'intake',
                        type: 'MILESTONE',
                        label: 'Intake / IDF Received',
                        rule: 'Matter Inception & Triage',
                        date: record.idf_date || 'Intake Complete',
                        isCompleted: true,
                        badgeColor: '#2563EB',
                      },
                      {
                        key: 'ps_filing',
                        type: 'MILESTONE',
                        label: 'Provisional Specification (PS) Filing',
                        rule: 'Section 9(1) - The Patents Act',
                        date: record.ps_filing_date,
                        isCompleted: Boolean(record.ps_filing_date),
                        isCurrent: (record.current_status || '').toLowerCase().includes('ps'),
                        badgeColor: '#10B981',
                      },
                      {
                        key: 'f1_por',
                        type: 'FORM_STATUTORY',
                        label: 'Form 1 — Proof of Right (POR)',
                        rule: 'Section 7(2) & Rule 10 (Within 6 Months of Filing)',
                        date: record.form_1_filing_date || (record.ps_filing_date ? addMonths(record.ps_filing_date, 6) : null),
                        isCompleted: record.f1_status === 'Within Deadline' || Boolean(record.form_1_filing_date),
                        statusTag: record.f1_status || (record.form_1_filing_date ? 'Filed' : 'Pending'),
                        badgeColor: '#0284C7',
                      },
                      {
                        key: 'f26_poa',
                        type: 'FORM_STATUTORY',
                        label: 'Form 26 — Power of Authority (POA)',
                        rule: 'Section 127, 132 & Rule 135 (Within 3 Months of Filing)',
                        date: record.form_26_filing_date || (record.ps_filing_date ? addMonths(record.ps_filing_date, 3) : null),
                        isCompleted: record.f26_status === 'Within Deadline' || Boolean(record.form_26_filing_date),
                        statusTag: record.f26_status || (record.form_26_filing_date ? 'Filed' : 'Pending'),
                        badgeColor: '#4F46E5',
                      },
                      {
                        key: 'cs_filing',
                        type: 'MILESTONE',
                        label: 'Complete Specification (CS) Filing',
                        rule: 'Section 9(1) (Strict 12 Months Deadline from PS)',
                        date: record.cs_filing_date || record.cs_deadline,
                        isCompleted: Boolean(record.cs_filing_date),
                        isCurrent: (record.current_status || '').toLowerCase().includes('cs'),
                        badgeColor: '#10B981',
                      },
                      {
                        key: 'f9_pub',
                        type: 'MILESTONE',
                        label: 'Section 11A Publication / Form 9 Early Pub',
                        rule: 'Section 11A & Rule 24 (18 Months or Form 9)',
                        date: record.publication_date || record.form_9_filing_date,
                        isCompleted: Boolean(record.publication_date),
                        badgeColor: '#8B5CF6',
                      },
                      {
                        key: 'f18_rfe',
                        type: 'MILESTONE',
                        label: 'Request for Examination (Form 18 / 18A)',
                        rule: 'Section 11B & Rule 24B (31 Months Deadline)',
                        date: record.form_18_filing_date || record.rfe_deadline,
                        isCompleted: Boolean(record.form_18_filing_date),
                        badgeColor: '#D97706',
                      },
                      {
                        key: 'fer_action',
                        type: 'MILESTONE',
                        label: 'First Examination Report (FER) Notice & Reply',
                        rule: 'Rule 24B(5) / Form 4 Extension under Rule 24B(6)',
                        date: record.fer_reply_filing_date || record.fer_notice_date,
                        isCompleted: Boolean(record.fer_reply_filing_date),
                        isCurrent: (record.current_status || '').toLowerCase().includes('fer'),
                        badgeColor: '#EF4444',
                      },
                      {
                        key: 'hearing_ws',
                        type: 'MILESTONE',
                        label: 'Controller Hearing & Written Submissions (WS)',
                        rule: 'Section 14 & Rule 62 (Form 30 Hearing Attendance)',
                        date: record.ws_filing_date || record.hearing_date,
                        isCompleted: Boolean(record.ws_filing_date),
                        isCurrent: (record.current_status || '').toLowerCase().includes('hearing'),
                        badgeColor: '#F59E0B',
                      },
                      {
                        key: 'grant_working',
                        type: 'MILESTONE',
                        label: 'Patent Grant & Triennial Form 27 Working',
                        rule: 'Section 43 (Grant) & Section 146(2) / Rule 131',
                        date: record.grant_date,
                        isCompleted: Boolean(record.grant_date),
                        badgeColor: '#059669',
                      }
                    ];

                    return (
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '28px', marginTop: '6px' }}>
                        {/* Connecting Vertical Track */}
                        <div style={{
                          position: 'absolute',
                          left: '10px',
                          top: '12px',
                          bottom: '12px',
                          width: '2px',
                          background: 'var(--line)',
                        }} />

                        {timelineItems.map((item, idx) => (
                          <div key={item.key || idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {/* Circle Dot */}
                            <div style={{
                              position: 'absolute',
                              left: '-28px',
                              top: '10px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: item.isCompleted ? '#10B981' : (item.isCurrent ? '#F59E0B' : 'var(--line)'),
                              border: '3px solid var(--surface)',
                              boxShadow: item.isCompleted ? '0 0 0 2px rgba(16, 185, 129, 0.25)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {item.isCompleted && <Check size={10} color="#fff" strokeWidth={3} />}
                            </div>

                            <div style={{
                              padding: '12px 14px',
                              borderRadius: '8px',
                              background: item.isCurrent ? 'rgba(245, 158, 11, 0.06)' : 'var(--page)',
                              border: `1px solid ${item.isCurrent ? '#F59E0B' : 'var(--line)'}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                                  {item.label}
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: item.isCompleted ? 'rgba(16, 185, 129, 0.12)' : (item.isCurrent ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface)'),
                                  color: item.isCompleted ? '#059669' : (item.isCurrent ? '#D97706' : 'var(--muted)'),
                                  border: '1px solid var(--line)',
                                }}>
                                  {item.statusTag || (item.date ? item.date : (item.isCompleted ? 'Completed' : 'Pending'))}
                                </span>
                              </div>

                              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                {item.rule}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Interleaved Logged Miscellaneous Forms Section */}
                        {miscForms.length > 0 && (
                          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '6px' }}>
                              Logged Miscellaneous Filings on Record ({miscForms.length})
                            </div>
                            {miscForms.map((mf, mIdx) => {
                              const sInfo = getMiscFormStatusInfo(mf.status);
                              const tInfo = getMainFormTypeInfo(mf.form_type);
                              return (
                                <div
                                  key={mf.id || mIdx}
                                  style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'var(--surface)',
                                    border: `1px solid ${sInfo.border || 'var(--line)'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{
                                        fontSize: '10.5px',
                                        fontWeight: 800,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: tInfo.badgeBg || 'rgba(37, 99, 235, 0.12)',
                                        color: tInfo.badgeFg || '#2563EB',
                                        border: `1px solid ${tInfo.badgeBorder || 'rgba(37, 99, 235, 0.3)'}`
                                      }}>
                                        {tInfo.shortTitle || mf.form_type}
                                      </span>
                                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ink)' }}>
                                        {mf.sub_type_label || mf.sub_type}
                                      </span>
                                    </div>

                                    <span style={{
                                      fontSize: '10.5px',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      background: sInfo.bg,
                                      color: sInfo.color,
                                      border: `1px solid ${sInfo.border}`,
                                    }}>
                                      ● {sInfo.shortLabel}
                                    </span>
                                  </div>

                                  {mf.details_notes && (
                                    <div style={{ fontSize: '11.5px', color: 'var(--ink)' }}>
                                      {mf.details_notes}
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--muted)' }}>
                                    {mf.cbr_number && <span>CBR: <strong>{mf.cbr_number}</strong></span>}
                                    {mf.filing_date && <span>Filing Date: <strong>{mf.filing_date}</strong></span>}
                                    {mf.target_number && <span>Ref No: <strong>{mf.target_number}</strong></span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB 3: INTERNAL TEAM NOTES (Renamed from Senior notes & action) */}
            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Status Notes / Internal Prosecution Comments
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Add internal team prosecution notes..."
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
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Suggested Action
                  </label>
                  <input
                    type="text"
                    value={suggestedAction}
                    onChange={(e) => setSuggestedAction(e.target.value)}
                    placeholder="e.g. Call client for signature deed..."
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
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Active Issue / Roadblock
                  </label>
                  <input
                    type="text"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="e.g. Missing signature on Form 1..."
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
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Checklist Sent Date
                  </label>
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
                    type="button"
                    onClick={handleSaveNotes}
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

            {/* TAB 4: DOCS VAULT (Positioned before History & Audit) */}
            {activeTab === 'work' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* 1. Specification Content (Abstract & Claims) */}
                <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--accent)" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>Specification Content (Abstract & Claims)</span>
                    </div>
                    {onOpenEdit && (
                      <button
                        type="button"
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
                            type="button"
                            onClick={() => copyToClipboard(record.abstract, 'abstract')}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '5px',
                              border: '1px solid var(--line)',
                              background: copiedField === 'abstract' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                              color: copiedField === 'abstract' ? '#059669' : 'var(--accent)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Copy Abstract"
                          >
                            {copiedField === 'abstract' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                            {copiedField === 'abstract' ? 'Copied!' : 'Copy Abstract'}
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
                            type="button"
                            onClick={() => copyToClipboard(record.claims, 'claims')}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '5px',
                              border: '1px solid var(--line)',
                              background: copiedField === 'claims' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                              color: copiedField === 'claims' ? '#059669' : 'var(--accent)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Copy Claims"
                          >
                            {copiedField === 'claims' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                            {copiedField === 'claims' ? 'Copied!' : 'Copy Claims'}
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

                {/* Documents List & Viewer Interface */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                        Application Documents ({filteredDocuments.length})
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Available for viewing and download
                      </span>
                    </div>

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
                          fontSize: '11px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Documents table / list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '6px',
                          background: 'var(--page)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <FileText size={18} color="var(--accent)" />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {doc.category} • {doc.size} • {new Date(doc.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--line)',
                              background: 'var(--surface)',
                              color: 'var(--accent)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(doc)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--line)',
                              background: 'var(--surface)',
                              color: 'var(--ink)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: HISTORY & AUDIT */}
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
                      <span>Open in WorkDrive</span>
                    </a>
                  )}

                  <button
                    type="button"
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
                    type="button"
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
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    <FileText size={48} style={{ opacity: 0.4, marginBottom: '12px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>{previewDoc.name}</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>{previewDoc.category} • {previewDoc.size}</div>
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
