// frontend/src/components/EditApplicationModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Save, Edit3, Calendar, User, Tag as TagIcon,
  ExternalLink, CheckCircle2, AlertTriangle, Layers, Clock, Building, Plus, Trash2
} from 'lucide-react';
import { calculateAllStatutoryDeadlines, validateSection17PostDating } from '../utils/statutoryDeadlines';
import { getFormFee, isReducedFeeEntity, formatINR } from '../utils/feeSchedule';
import { getStatusColor } from '../constants/patentStatuses';
import PhasedStatusSelector from './PhasedStatusSelector';
import AddClientModal from './AddClientModal';
import DEFAULT_CLIENTS from '../data/clients.json';
import MiscFormsManager from './MiscFormsManager';

const DRAFTERS = [
  'Anusha', 'Ayush', 'Abhishek', 'Fiona',
  'Pramith', 'Pratham', 'Thanush', 'Thilak', 'Pranav Bhat'
];

const SPEC_TYPES = [
  { value: 'PS', label: 'Provisional Specification (PS)' },
  { value: 'CS', label: 'Complete Specification (CS)' },
  { value: 'PS_TO_CS', label: 'Provisional Followed by Complete (PS to CS)' },
  { value: 'DIVISIONAL', label: 'Divisional Application' },
  { value: 'PATENT_OF_ADDITION', label: 'Patent of Addition' },
];

const COLOR_CODES = [
  { value: 'PURPLE', label: 'Purple (Internal Drafting / Triage)' },
  { value: 'YELLOW', label: 'Yellow (Pending Inventor / External Query)' },
  { value: 'ORANGE', label: 'Orange (Draft Ready, Pending Final Signoff)' },
  { value: 'GREEN', label: 'Green (Approved / Filed at IPO)' },
  { value: 'RED', label: 'Red (Critical Due Soon / Overdue)' },
  { value: 'BLUE', label: 'Blue (Standard In-Progress)' },
  { value: 'GREY', label: 'Grey (Abandoned / Closed)' },
];

export default function EditApplicationModal({
  isOpen,
  onClose,
  record,
  onUpdate,
  clients: clientsProp = [],
  tags = [],
  onClientCreated
}) {
  if (!isOpen || !record) return null;

  // Local clients list so newly added clients reflect immediately
  const [internalClients, setInternalClients] = useState(() => {
    return (Array.isArray(clientsProp) && clientsProp.length > 0) ? clientsProp : DEFAULT_CLIENTS;
  });

  // Sync when clientsProp updates or loads asynchronously
  useEffect(() => {
    if (Array.isArray(clientsProp) && clientsProp.length > 0) {
      setInternalClients(clientsProp);
    }
  }, [clientsProp]);

  // Guaranteed non-empty client list fallback to DEFAULT_CLIENTS (211 clients)
  const effectiveClients = useMemo(() => {
    return (internalClients && internalClients.length > 0) ? internalClients : DEFAULT_CLIENTS;
  }, [internalClients]);

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    application_number: '',
    patent_number: '',
    specification_type: 'PS',
    classification: '',
    applicant_name: '',
    assigned_to: '',
    current_status: '',
    color_code_status: 'PURPLE',
    application_filing_receipt_status: 'PENDING',
    communication_status: 'OPEN',
    workdrive_folder_url: '',
    inventors_summary: '',
    abstract: '',
    claims: '',
    ps_filing_date: '',
    post_dated_date: '',
    cs_filing_date: '',
    publication_date: '',
    fer_notice_date: '',
    fer_reply_filing_date: '',
    hearing_date: '',
    ws_filing_date: '',
    grant_date: '',
    form_1_filing_date: '',
    form_26_filing_date: '',
    form_3_filing_date: '',
    form_9_filing_date: '',
    form_18_filing_date: '',
    client_commitment_date: '',
    status_notes: '',
    suggested_action: '',
    issue: '',
    selectedTags: [],
  });

  const [activeTab, setActiveTab] = useState('BASIC'); // BASIC, DATES, FORMS, NOTES
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
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
      }));
    }
    return [];
  });
  const [newInventor, setNewInventor] = useState({
    name: '',
    institution: record.applicant_name || '',
    gender: 'Male',
    nationality: 'Indian',
    country_of_residence: 'India',
  });
  const [showAddInventor, setShowAddInventor] = useState(false);
  const [miscForms, setMiscForms] = useState(() => {
    try {
      const saved = localStorage.getItem(`patent_misc_forms_${record.project_code}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    if (record.misc_forms && Array.isArray(record.misc_forms)) {
      return record.misc_forms;
    }
    return [];
  });

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return effectiveClients;
    const q = clientSearchQuery.toLowerCase();
    return effectiveClients.filter(
      (c) =>
        (c.client_code || '').toLowerCase().includes(q) ||
        (c.client_name || '').toLowerCase().includes(q)
    );
  }, [effectiveClients, clientSearchQuery]);

  const selectedClient = useMemo(() => {
    return effectiveClients.find((c) => c.id === selectedClientId) || null;
  }, [effectiveClients, selectedClientId]);

  // Section 17 Post-Dating leeway calculations
  const postDateValidation = useMemo(() => {
    return validateSection17PostDating(formData.ps_filing_date, formData.post_dated_date);
  }, [formData.ps_filing_date, formData.post_dated_date]);

  // Abstract & Claims word counters
  const abstractWords = useMemo(() => {
    return (formData.abstract || '').trim().split(/\s+/).filter(Boolean).length;
  }, [formData.abstract]);

  const claimsWords = useMemo(() => {
    return (formData.claims || '').trim().split(/\s+/).filter(Boolean).length;
  }, [formData.claims]);

  const claimsCount = useMemo(() => {
    if (!formData.claims || !formData.claims.trim()) return 0;
    const matches = formData.claims.match(/(?:^|\n)\s*(?:(?:\d+[\.\)])|Claim\s+\d+)/gi);
    return matches ? matches.length : (formData.claims.split('\n\n').filter((p) => p.trim()).length || 1);
  }, [formData.claims]);

  useEffect(() => {
    if (record) {
      const rTags = Array.isArray(record.tags) ? record.tags : (record.classification ? [record.classification] : []);
      // Interconnected client matching from core.clients
      const matched = effectiveClients.find((c) => {
        if (record.applicant_name && c.client_name && (record.applicant_name.toLowerCase().includes(c.client_name.toLowerCase()) || c.client_name.toLowerCase().includes(record.applicant_name.toLowerCase()))) return true;
        if (record.project_code && c.client_code && record.project_code.toUpperCase().startsWith(c.client_code.toUpperCase())) return true;
        return false;
      });
      setSelectedClientId(matched ? matched.id : '');

      setFormData({
        title: record.title || '',
        application_number: record.application_number || '',
        patent_number: record.patent_number || '',
        specification_type: record.specification_type || 'PS',
        classification: record.classification || '',
        applicant_name: record.applicant_name || 'Manipal Academy of Higher Education',
        assigned_to: record.assigned_to || '',
        current_status: record.current_status || '',
        color_code_status: record.color_code_status || 'PURPLE',
        application_filing_receipt_status: record.application_filing_receipt_status || 'PENDING',
        communication_status: record.communication_status || 'OPEN',
        workdrive_folder_url: record.workdrive_folder_url || '',
        inventors_summary: record.inventors_summary || '',
        abstract: record.abstract || '',
        claims: record.claims || '',
        client_commitment_date: record.client_commitment_date ? record.client_commitment_date.slice(0, 10) : '',
        ps_filing_date: record.ps_filing_date ? record.ps_filing_date.slice(0, 10) : '',
        post_dated_date: record.post_dated_date ? record.post_dated_date.slice(0, 10) : '',
        cs_filing_date: record.cs_filing_date ? record.cs_filing_date.slice(0, 10) : '',
        publication_date: record.publication_date ? record.publication_date.slice(0, 10) : '',
        fer_notice_date: record.fer_notice_date ? record.fer_notice_date.slice(0, 10) : '',
        fer_reply_filing_date: record.fer_reply_filing_date ? record.fer_reply_filing_date.slice(0, 10) : '',
        hearing_date: record.hearing_date ? record.hearing_date.slice(0, 10) : '',
        ws_filing_date: record.ws_filing_date ? record.ws_filing_date.slice(0, 10) : '',
        grant_date: record.grant_date ? record.grant_date.slice(0, 10) : '',
        form_1_filing_date: record.form_1_filing_date ? record.form_1_filing_date.slice(0, 10) : '',
        form_26_filing_date: record.form_26_filing_date ? record.form_26_filing_date.slice(0, 10) : '',
        form_3_filing_date: record.form_3_filing_date ? record.form_3_filing_date.slice(0, 10) : '',
        form_9_filing_date: record.form_9_filing_date ? record.form_9_filing_date.slice(0, 10) : '',
        form_18_filing_date: record.form_18_filing_date ? record.form_18_filing_date.slice(0, 10) : '',
        status_notes: record.status_notes || '',
        suggested_action: record.suggested_action || '',
        issue: record.issue || '',
        selectedTags: rTags,
      });
    }
  }, [record, effectiveClients]);

  // Live Statutory Deadline Calculations (Requirements 4, 5, 6)
  const statutoryCalculations = useMemo(() => {
    return calculateAllStatutoryDeadlines(formData);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleStatusChange = (newStatus) => {
    const col = getStatusColor(newStatus);
    setFormData((prev) => ({
      ...prev,
      current_status: newStatus,
      color_code_status: col.colorKey || 'PURPLE'
    }));
  };

  const handleNewClientCreated = (newClient) => {
    if (!newClient) return;
    setInternalClients((prev) => [newClient, ...prev]);
    setSelectedClientId(newClient.id);
    setFormData((prev) => ({
      ...prev,
      applicant_name: newClient.client_name,
    }));
    if (onClientCreated) {
      onClientCreated(newClient);
    }
  };

  const toggleTag = (tagName) => {
    setFormData((prev) => {
      const exists = prev.selectedTags.includes(tagName);
      const updated = exists
        ? prev.selectedTags.filter((t) => t !== tagName)
        : [...prev.selectedTags, tagName];
      return { ...prev, selectedTags: updated };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title cannot be empty.');
      return;
    }

    // Validate Section 17 Post-Dating limitation
    if (formData.post_dated_date && formData.ps_filing_date) {
      const validation = validateSection17PostDating(formData.ps_filing_date, formData.post_dated_date);
      if (!validation.isValid) {
        setError(validation.message);
        return;
      }
    }

    const summary = inventorsList.map((i) => i.name).join(', ');
    const payload = {
      ...formData,
      inventors: inventorsList,
      inventors_summary: summary || formData.inventors_summary,
      misc_forms: miscForms,
      tags: formData.selectedTags,
    };
    try {
      localStorage.setItem(`patent_misc_forms_${record.project_code}`, JSON.stringify(miscForms));
    } catch {}
    try {
      localStorage.setItem(`patent_inventors_${record.project_code}`, JSON.stringify(inventorsList));
    } catch {}

    // Close modal immediately (0ms instant closure)
    onClose();

    // Dispatch update optimistically
    if (onUpdate) {
      onUpdate(record.project_code, payload);
    }
  };

  return (
    <div
      className="modal-backdrop-animate"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog-animate"
        style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--page)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Edit3 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Edit Application: {record.project_code}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#2563EB',
                  }}
                >
                  {record.specification_type || 'PS'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                App No: {record.application_number || 'Not yet assigned'} · Assigned to: {formData.assigned_to || 'Unassigned'}
              </p>
            </div>
          </div>
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

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--line)',
            background: 'var(--surface)',
            padding: '0 24px',
            gap: '16px',
          }}
        >
          {[
            { id: 'BASIC', label: '1. Basic Info & Triage' },
            { id: 'DATES', label: '2. Prosecution Dates & Post-Date' },
            { id: 'FORMS', label: '3. Statutory Forms (1, 26, 3, 18)' },
            { id: 'NOTES', label: '4. Internal Notes & Actions' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '12px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === t.id ? 'var(--accent)' : 'var(--muted)',
                fontWeight: activeTab === t.id ? 800 : 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: BASIC INFO & TRIAGE */}
          {activeTab === 'BASIC' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Invention Title *
                </label>
                <textarea
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Application Number (IPO)
                  </label>
                  <input
                    type="text"
                    name="application_number"
                    value={formData.application_number}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Patent Number (If Granted)
                  </label>
                  <input
                    type="text"
                    name="patent_number"
                    value={formData.patent_number}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Specification Type
                  </label>
                  <select
                    name="specification_type"
                    value={formData.specification_type}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  >
                    {SPEC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client & Tags Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>
                      Interconnected Client (core.clients)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddClientOpen(true)}
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '5px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={12} /> Add New Client
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Search 200+ clients..."
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--page)',
                        color: 'var(--ink)',
                        fontSize: '12px',
                      }}
                    />
                    {clientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setClientSearchQuery('')}
                        style={{
                          padding: '4px 8px',
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
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      setSelectedClientId(cId);
                      const found = effectiveClients.find((c) => c.id === cId);
                      if (found) {
                        setFormData((prev) => ({
                          ...prev,
                          applicant_name: found.client_name,
                        }));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #2563EB',
                      background: 'var(--page)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <option value="">-- Choose Interconnected Client ({filteredClients.length} of {effectiveClients.length} Available) --</option>
                    {filteredClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.client_code ? `[${c.client_code}] ` : ''}{c.client_name}
                      </option>
                    ))}
                  </select>

                  {selectedClient && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(37, 99, 235, 0.08)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        fontSize: '11.5px',
                        color: '#1D4ED8',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800 }}>
                          {selectedClient.client_code && `[${selectedClient.client_code}] `}{selectedClient.client_name}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#2563EB', color: '#fff' }}>
                          Interconnected ✓
                        </span>
                      </div>
                      {selectedClient.entity_type && (
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          Entity: <strong>{selectedClient.entity_type}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  <input
                    type="text"
                    name="applicant_name"
                    value={formData.applicant_name}
                    onChange={handleChange}
                    placeholder="Applicant Name..."
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Assigned Tags (Requirement 10)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['Priority', 'Ticket Raised', 'Critical', 'Political', ...tags.filter(t => !['priority','ticket raised','critical','political'].includes(t.name.toLowerCase())).map(t => t.name)].map((tg) => {
                      const isSelected = formData.selectedTags.includes(tg);
                      return (
                        <button
                          key={tg}
                          type="button"
                          onClick={() => toggleTag(tg)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: `1px solid ${isSelected ? '#2563EB' : 'var(--line)'}`,
                            background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'var(--page)',
                            color: isSelected ? '#1D4ED8' : 'var(--muted)',
                            fontSize: '11px',
                            fontWeight: isSelected ? 800 : 600,
                            cursor: 'pointer',
                          }}
                        >
                          {tg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Inventors Details & Roster (Requirement 1) */}
              <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="var(--accent)" />
                    <h3 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                      Inventors Details ({inventorsList.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewInventor((prev) => ({
                        ...prev,
                        institution: prev.institution || formData.applicant_name || ''
                      }));
                      setShowAddInventor(!showAddInventor);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: '1px solid var(--accent)',
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
                      padding: '12px',
                      borderRadius: '6px',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      marginBottom: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink)' }}>
                      New Inventor Info (Institution, Gender, Nationality, Residence)
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Full Name (e.g. Dr. Rajesh Kumar) *"
                        value={newInventor.name}
                        onChange={(e) => setNewInventor({ ...newInventor, name: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px' }}
                      />
                      <input
                        type="text"
                        placeholder="Institution / University (e.g. MIT Manipal) *"
                        value={newInventor.institution}
                        onChange={(e) => setNewInventor({ ...newInventor, institution: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px' }}
                      />
                      <select
                        value={newInventor.gender}
                        onChange={(e) => setNewInventor({ ...newInventor, gender: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px' }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Nationality (e.g. Indian)"
                        value={newInventor.nationality}
                        onChange={(e) => setNewInventor({ ...newInventor, nationality: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px' }}
                      />
                      <input
                        type="text"
                        placeholder="Country of Residence (e.g. India)"
                        value={newInventor.country_of_residence}
                        onChange={(e) => setNewInventor({ ...newInventor, country_of_residence: e.target.value })}
                        style={{ gridColumn: 'span 2', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddInventor(false)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'transparent', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newInventor.name.trim()) return;
                          setInventorsList((prev) => [...prev, { id: 'inv_' + Date.now(), ...newInventor }]);
                          setNewInventor({
                            name: '',
                            institution: formData.applicant_name || '',
                            gender: 'Male',
                            nationality: 'Indian',
                            country_of_residence: 'India',
                          });
                          setShowAddInventor(false);
                        }}
                        style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Save Inventor
                      </button>
                    </div>
                  </div>
                )}

                {/* List */}
                {inventorsList.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', padding: '4px 0' }}>
                    No inventors added yet. Click "+ Add Inventor" to enter institution, gender, nationality and residence.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {inventorsList.map((inv, idx) => (
                      <div
                        key={inv.id || idx}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: 'var(--surface)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 800, color: 'var(--ink)', marginRight: '6px' }}>
                            {idx + 1}. {inv.name}
                          </span>
                          <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: '6px' }}>
                            • {inv.institution || 'No institution'}
                          </span>
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                            ({inv.gender} • {inv.nationality} • {inv.country_of_residence})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInventorsList((prev) => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned Drafter (Placed on clean standalone row above status selection) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--ink)', marginBottom: '6px' }}>
                  Assigned Drafter
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <select
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleChange}
                    style={{
                      maxWidth: '360px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #2563EB',
                      background: 'var(--page)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--ink)',
                    }}
                  >
                    {DRAFTERS.map((d) => (
                      <option key={d} value={d}>
                        👤 {d}
                      </option>
                    ))}
                  </select>

                </div>
              </div>

              {/* Prosecution Status (Full Width 7 Statutory Phases) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--ink)', marginBottom: '6px' }}>
                  Prosecution Status (7 Statutory Phases)
                </label>
                <PhasedStatusSelector
                  value={formData.current_status}
                  onChange={handleStatusChange}
                  applicationType={formData.specification_type}
                />
              </div>

              {/* Abstract & Claims (Requirement 4) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '6px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>
                      Abstract
                    </label>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: abstractWords > 150 ? '#fee2e2' : '#f1f5f9',
                      color: abstractWords > 150 ? '#dc2626' : '#475569',
                      border: `1px solid ${abstractWords > 150 ? '#fca5a5' : '#cbd5e1'}`
                    }}>
                      {abstractWords} / 150 words
                    </span>
                  </div>
                  <textarea
                    name="abstract"
                    value={formData.abstract}
                    onChange={handleChange}
                    placeholder="Enter abstract..."
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${abstractWords > 150 ? '#ef4444' : 'var(--line)'}`,
                      background: 'var(--page)',
                      fontSize: '12.5px',
                      lineHeight: '1.45',
                      resize: 'vertical',
                    }}
                  />
                  {abstractWords > 150 && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={13} />
                      <span>Abstract exceeds 150 words limit.</span>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>
                      Claims
                    </label>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0'
                    }}>
                      {claimsWords} words • {claimsCount} claim(s)
                    </span>
                  </div>
                  <textarea
                    name="claims"
                    value={formData.claims}
                    onChange={handleChange}
                    placeholder="Enter patent claims..."
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '12.5px',
                      lineHeight: '1.45',
                      fontFamily: 'monospace',
                      resize: 'vertical',
                    }}
                  />

                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROSECUTION DATES & POST-DATING */}
          {activeTab === 'DATES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Client Delivery Commitment Section */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(234, 88, 12, 0.06)',
                  border: '1.5px solid #EA580C',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#C2410C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🎯 Client Delivery Commitment
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="date"
                    name="client_commitment_date"
                    value={formData.client_commitment_date}
                    onChange={handleChange}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[3, 7, 14].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const dt = new Date();
                          dt.setDate(dt.getDate() + d);
                          setFormData((prev) => ({
                            ...prev,
                            client_commitment_date: dt.toISOString().split('T')[0],
                          }));
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        +{d}d
                      </button>
                    ))}
                    {formData.client_commitment_date && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, client_commitment_date: '' }))}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          fontSize: '11px',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    PS Filing Date
                  </label>
                  <input
                    type="date"
                    name="ps_filing_date"
                    value={formData.ps_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#7C3AED' }}>
                    Sec 17 Post-Date (Max 6m)
                  </label>
                  <input
                    type="date"
                    name="post_dated_date"
                    value={formData.post_dated_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #C4B5FD',
                      background: 'rgba(139, 92, 246, 0.05)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    CS Filing Date
                  </label>
                  <input
                    type="date"
                    name="cs_filing_date"
                    value={formData.cs_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Section 17 Post-Dating Leeway Indicator (Requirement 2) */}
              {formData.post_dated_date && formData.ps_filing_date && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: postDateValidation.isValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1.5px solid ${postDateValidation.isValid ? '#10B981' : '#EF4444'}`,
                    color: postDateValidation.isValid ? '#065F46' : '#991B1B',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Clock size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Section 17 Post-Dating Leeway Status:</strong>{' '}
                    {postDateValidation.isValid ? (
                      <span>
                        {postDateValidation.detailedMessage} (<strong>{postDateValidation.remainingMonths} months, {postDateValidation.remainingDays} days</strong> remaining).
                      </span>
                    ) : (
                      <span>{postDateValidation.message}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Live Statutory Deadlines Preview Card */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '8px',
                  background: 'rgba(37, 99, 235, 0.06)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#1D4ED8', marginBottom: '8px' }}>
                  <Clock size={14} /> Statutory Deadlines
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>CS Deadline:</span>
                    <strong style={{ color: statutoryCalculations.cs_deadline ? '#DC2626' : 'var(--muted)' }}>
                      {statutoryCalculations.cs_deadline || '—'}
                    </strong>

                  </div>

                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>Form 1 (POR):</span>
                    <strong style={{ color: '#059669' }}>
                      {statutoryCalculations.form_1_deadline || '—'}
                    </strong>

                  </div>

                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>Form 26 (POA):</span>
                    <strong style={{ color: '#059669' }}>
                      {statutoryCalculations.form_26_deadline || '—'}
                    </strong>

                  </div>

                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>FER Reply Deadline:</span>
                    <strong style={{ color: statutoryCalculations.fer_reply_deadline ? '#DC2626' : 'var(--muted)' }}>
                      {statutoryCalculations.fer_reply_deadline || '—'}
                    </strong>

                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    FER Notice Date
                  </label>
                  <input
                    type="date"
                    name="fer_notice_date"
                    value={formData.fer_notice_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    FER Reply Filing Date
                  </label>
                  <input
                    type="date"
                    name="fer_reply_filing_date"
                    value={formData.fer_reply_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Publication Date
                  </label>
                  <input
                    type="date"
                    name="publication_date"
                    value={formData.publication_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Hearing Date
                  </label>
                  <input
                    type="date"
                    name="hearing_date"
                    value={formData.hearing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Written Submissions Filing Date
                  </label>
                  <input
                    type="date"
                    name="ws_filing_date"
                    value={formData.ws_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Grant Date
                  </label>
                  <input
                    type="date"
                    name="grant_date"
                    value={formData.grant_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Form-27 Triennial Working Statement Live Calculator */}
              {Boolean(formData.grant_date) && (() => {
                const f27 = calculateForm27Deadlines(formData.grant_date);
                if (!f27) return null;
                return (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                        Form-27 Working of Patent Compliance (Rule 131 - 2024 Amendments)
                      </span>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: f27.isWindowOpen ? '#10B981' : 'rgba(5, 150, 105, 0.15)',
                        color: f27.isWindowOpen ? '#fff' : '#059669',
                      }}>
                        {f27.isWindowOpen ? 'Filing Window Open (1 Apr - 30 Sep)' : 'Filing Window: 1 Apr - 30 Sep'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink)' }}>
                      Current 3-Year Block: <strong>{f27.currentBlock}</strong> • Statutory Due Date: <strong style={{ color: '#DC2626' }}>{f27.statutoryDueDate}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Grant FY: {f27.grantFyLabel} • Extension Leeway: Rule 131(2) (+3M) to {f27.extRule131} | Rule 138 (+6M) to {f27.extRule138}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: STATUTORY FORMS */}
          {activeTab === 'FORMS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>
                      Form 1 (Proof of Right)
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#2563EB', fontWeight: 700 }}>
                      Fee: ₹1,600 / ₹8,000
                    </span>
                  </div>
                  <input
                    type="date"
                    name="form_1_filing_date"
                    value={formData.form_1_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>
                      Form 26 (Power of Attorney)
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700 }}>
                      Fee: Free (₹0)
                    </span>
                  </div>
                  <input
                    type="date"
                    name="form_26_filing_date"
                    value={formData.form_26_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>
                      Form 3 (Foreign Filings)
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700 }}>
                      Fee: Free (₹0)
                    </span>
                  </div>
                  <input
                    type="date"
                    name="form_3_filing_date"
                    value={formData.form_3_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>
                      Form 9 (Early Publication)
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#2563EB', fontWeight: 700 }}>
                      Fee: ₹2,500 / ₹12,500
                    </span>
                  </div>
                  <input
                    type="date"
                    name="form_9_filing_date"
                    value={formData.form_9_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>
                      Form 18 / 18A (RFE Filing Date)
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#2563EB', fontWeight: 700 }}>
                      Fee: ₹4,000 / ₹20,000
                    </span>
                  </div>
                  <input
                    type="date"
                    name="form_18_filing_date"
                    value={formData.form_18_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Dedicated Miscellaneous Forms (Form 13 & Form 30) Section */}
              <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <MiscFormsManager
                  record={record}
                  miscForms={miscForms}
                  onUpdateMiscForms={(updated) => setMiscForms(updated)}
                />
              </div>

              {/* Statutory Government Fee Reference Schedule */}
              <div style={{
                marginTop: '8px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'var(--page)',
                border: '1px solid var(--line)',
                fontSize: '11.5px'
              }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '11px' }}>
                  Statutory Government Fee Schedule (First Schedule of Indian Patents Rules)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
                  <div style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: '5px', border: '1px solid var(--line)' }}>
                    <strong>Form 1 (Application):</strong> ₹1,600 (Reduced) / ₹8,000 (Others)
                  </div>
                  <div style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: '5px', border: '1px solid var(--line)' }}>
                    <strong>Form 2 (Spec):</strong> Free up to 30 sheets & 10 claims
                  </div>
                  <div style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: '5px', border: '1px solid var(--line)' }}>
                    <strong>Form 3 & Form 5:</strong> Free of statutory fee (₹0)
                  </div>
                  <div style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: '5px', border: '1px solid var(--line)' }}>
                    <strong>Form 4 (FER Ext R.24B):</strong> ₹1,000/mo / ₹4,000/mo
                  </div>
                  <div style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: '5px', border: '1px solid var(--line)' }}>
                    <strong>Form 9 (Early Pub):</strong> ₹2,500 / ₹12,500
                  </div>
                  <div style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: '5px', border: '1px solid var(--line)' }}>
                    <strong>Form 18 (RFE):</strong> ₹4,000 / ₹20,000
                  </div>
                  <div style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: '5px', border: '1px solid var(--line)' }}>
                    <strong>Form 30 (Hearing):</strong> ₹1,500 / ₹7,500
                  </div>
                  <div style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: '5px', border: '1px solid var(--line)' }}>
                    <strong>Sec 17 (Postdating):</strong> ₹800 / ₹4,000
                  </div>
                  <div style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: '5px', border: '1px solid var(--line)' }}>
                    <strong>Sec 53 Renewals:</strong> Y3-Y6: ₹800/yr / ₹4,000/yr
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INTERNAL NOTES & ACTIONS */}
          {activeTab === 'NOTES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Status Notes / Senior Remarks
                </label>
                <textarea
                  name="status_notes"
                  value={formData.status_notes}
                  onChange={handleChange}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Suggested Action
                </label>
                <input
                  type="text"
                  name="suggested_action"
                  value={formData.suggested_action}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Issue / Blocker
                </label>
                <input
                  type="text"
                  name="issue"
                  value={formData.issue}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div
            style={{
              paddingTop: '20px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 24px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Save size={15} />
              {isSubmitting ? 'Saving Changes...' : 'Save & Recalculate Deadlines'}
            </button>
          </div>
        </form>
      </div>

      {/* Interconnected Add Client Modal (Requirement 3) */}
      <AddClientModal
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onClientCreated={handleNewClientCreated}
      />
    </div>
  );
}
