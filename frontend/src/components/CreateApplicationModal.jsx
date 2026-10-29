// frontend/src/components/CreateApplicationModal.jsx
import { getActiveDrafters } from '../lib/authStore';
import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Plus, Trash2, FileText, Calendar, User, Building, Tag as TagIcon,
  ExternalLink, CheckCircle2, Shield, AlertTriangle, Clock, IndianRupee,
  Layers, AlertCircle
} from 'lucide-react';
import { calculateAllStatutoryDeadlines, validateSection17PostDating } from '../utils/statutoryDeadlines';
import { getFormFee, isReducedFeeEntity, formatINR } from '../utils/feeSchedule';
import { getStatusColor } from '../constants/patentStatuses';
import PhasedStatusSelector from './PhasedStatusSelector';
import AddClientModal from './AddClientModal';
import DEFAULT_CLIENTS from '../data/clients.json';

const DRAFTERS = getActiveDrafters();

const SPEC_TYPES = [
  { value: 'PS', label: 'Provisional Specification (PS)' },
  { value: 'CS', label: 'Complete Specification (CS)' },
  { value: 'PS_TO_CS', label: 'Provisional Followed by Complete (PS to CS)' },
  { value: 'DIVISIONAL', label: 'Divisional Application' },
  { value: 'PATENT_OF_ADDITION', label: 'Patent of Addition' },
];

const ENTITY_CATEGORIES = [
  { value: 'EDUCATIONAL_INSTITUTION', label: 'Educational Institution (MAHE)' },
  { value: 'STARTUP_DPIIT', label: 'Startup (DPIIT Recognized)' },
  { value: 'SMALL_ENTITY_UDYAM', label: 'Small Entity (MSME/Udyam)' },
  { value: 'INDIVIDUAL', label: 'Individual Inventor' },
  { value: 'LARGE_ENTITY', label: 'Large Entity / Corporate' },
];

const COLOR_CODES = [
  { value: 'PURPLE', label: 'Purple (Internal Drafting / Triage)', bg: '#8B5CF6' },
  { value: 'YELLOW', label: 'Yellow (Pending Inventor / External Query)', bg: '#EAB308' },
  { value: 'ORANGE', label: 'Orange (Draft Ready, Pending Final Signoff)', bg: '#F97316' },
  { value: 'GREEN', label: 'Green (Approved / Filed at IPO)', bg: '#10B981' },
  { value: 'RED', label: 'Red (Critical Due Soon / Overdue)', bg: '#EF4444' },
  { value: 'BLUE', label: 'Blue (Standard In-Progress)', bg: '#3B82F6' },
];

export default function CreateApplicationModal({
  isOpen,
  onClose,
  onCreate,
  existingCodes = [],
  clients: clientsProp = [],
  tags = [],
  onClientCreated
}) {
  if (!isOpen) return null;

  // Local client list state so newly created clients are instantly selectable
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

  // Auto-generate next candidate project code e.g. AR432
  const defaultCode = () => {
    let nextNum = 1;
    for (const code of existingCodes) {
      const match = String(code).match(/^AR(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    }
    return `AR${String(nextNum).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    project_code: defaultCode(),
    title: '',
    application_number: '',
    specification_type: 'PS',
    record_category: 'INTERNAL_FILING',
    classification: 'AR',
    applicant_name: 'Manipal Academy of Higher Education (MAHE)',
    entity_category: 'EDUCATIONAL_INSTITUTION',
    is_mahe: true,
    assigned_to: 'Anusha',
    current_status: 'Idf sent, awaiting data',
    color_code_status: 'PURPLE',
    ps_filing_date: new Date().toISOString().split('T')[0],
    post_dated_date: '',
    cs_filing_date: '',
    client_commitment_date: '',
    form_1_filing_date: '',
    form_26_filing_date: '',
    workdrive_folder_url: '',
    inventors_summary: '',
    abstract: '',
    claims: '',
    status_notes: '',
    selectedTags: ['Priority'],
  });

  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventorsList, setInventorsList] = useState([]);
  const [newInventor, setNewInventor] = useState({
    name: '',
    institution: '',
    gender: 'Male',
    nationality: 'Indian',
    country_of_residence: 'India',
  });
  const [showAddInventor, setShowAddInventor] = useState(false);
  const [error, setError] = useState(null);

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

  // Live Statutory Deadline Calculations
  const statutoryCalculations = useMemo(() => {
    return calculateAllStatutoryDeadlines(formData);
  }, [formData]);

  // Government Statutory Fees for Current Applicant Entity Category
  const statutoryFees = useMemo(() => {
    const cat = formData.entity_category || 'OTHER';
    return {
      f1: getFormFee('F1', cat),
      f2: getFormFee('F2', cat),
      f3: getFormFee('F3', cat),
      f9: getFormFee('F9', cat),
      f18: getFormFee('F18', cat),
      f30: getFormFee('F30', cat),
      sec17: getFormFee('SEC17', cat)
    };
  }, [formData.entity_category]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle client selection from core.clients (Requirement 12)
  const handleClientSelect = (e) => {
    const cId = e.target.value;
    setSelectedClientId(cId);
    if (!cId) return;

    const found = effectiveClients.find((c) => c.id === cId);
    if (found) {
      const isMahe =
        (found.client_code || '').toUpperCase() === 'MAHE' ||
        found.client_name.toLowerCase().includes('manipal') ||
        found.client_name.toLowerCase().includes('mahe');

      let suggestedEntity = 'OTHER';
      if (isMahe) suggestedEntity = 'EDUCATIONAL_INSTITUTION';
      else if (found.entity_type === 'STARTUP') suggestedEntity = 'STARTUP_DPIIT';
      else if (found.entity_type === 'SMALL_ENTITY') suggestedEntity = 'SMALL_ENTITY_UDYAM';
      else if (found.entity_type === 'NATURAL_PERSON') suggestedEntity = 'INDIVIDUAL';
      else if (found.entity_type === 'EDUCATIONAL') suggestedEntity = 'EDUCATIONAL_INSTITUTION';
      else if (found.entity_type === 'LARGE') suggestedEntity = 'LARGE_ENTITY';

      setFormData((prev) => {
        let newProjectCode = prev.project_code;
        if ((!newProjectCode || newProjectCode === 'AR' || newProjectCode.startsWith('PAT-')) && found.client_code) {
          newProjectCode = `${found.client_code}-01`;
        }
        return {
          ...prev,
          applicant_name: found.client_name,
          is_mahe: isMahe,
          entity_category: suggestedEntity,
          project_code: newProjectCode,
        };
      });
    }
  };

  const handleNewClientCreated = (newClient) => {
    if (!newClient) return;
    setInternalClients((prev) => [newClient, ...prev]);
    setSelectedClientId(newClient.id);
    
    let suggestedEntity = 'OTHER';
    if (newClient.entity_type === 'STARTUP') suggestedEntity = 'STARTUP_DPIIT';
    else if (newClient.entity_type === 'SMALL_ENTITY') suggestedEntity = 'SMALL_ENTITY_UDYAM';
    else if (newClient.entity_type === 'NATURAL_PERSON') suggestedEntity = 'INDIVIDUAL';
    else if (newClient.entity_type === 'EDUCATIONAL') suggestedEntity = 'EDUCATIONAL_INSTITUTION';

    setFormData((prev) => ({
      ...prev,
      applicant_name: newClient.client_name,
      entity_category: suggestedEntity,
      project_code: newClient.client_code ? `${newClient.client_code}-01` : prev.project_code,
    }));

    if (onClientCreated) {
      onClientCreated(newClient);
    }
  };

  const handleStatusChange = (newStatus) => {
    const col = getStatusColor(newStatus);
    setFormData((prev) => ({
      ...prev,
      current_status: newStatus,
      color_code_status: col.colorKey || 'PURPLE'
    }));
  };

  // Toggle tag selection (Requirement 10)
  const toggleTag = (tagName) => {
    setFormData((prev) => {
      const exists = prev.selectedTags.includes(tagName);
      const updated = exists
        ? prev.selectedTags.filter((t) => t !== tagName)
        : [...prev.selectedTags, tagName];
      return { ...prev, selectedTags: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_code.trim()) {
      setError('Project Code is mandatory (e.g. AR432).');
      return;
    }
    if (!formData.title.trim()) {
      setError('Application Title is mandatory.');
      return;
    }

    // Validate Section 17 Post-Dating limitation (Requirement 6)
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
      tags: formData.selectedTags,
    };

    // Close modal immediately (0ms instant closure)
    onClose();

    // Dispatch create optimistically
    if (onCreate) {
      onCreate(payload);
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
          maxWidth: '780px',
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
                background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Plus size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                New Patent Application
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                Enter new docket record with automatic statutory deadline scheduling
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

          {/* Section 1: Core Identifiers */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              1. Identifiers & Specification Type
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Project Code *
                </label>
                <input
                  type="text"
                  name="project_code"
                  value={formData.project_code}
                  onChange={handleChange}
                  placeholder="e.g. AR432"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Application Number (IPO)
                </label>
                <input
                  type="text"
                  name="application_number"
                  value={formData.application_number}
                  onChange={handleChange}
                  placeholder="e.g. 202641012345"
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
                  Specification Type *
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

            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Invention Title *
              </label>
              <textarea
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter complete title of invention..."
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
          </div>

          {/* Section 2: Interconnected Client & Tags (Requirements 10 & 12) */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              2. Client Selection & Firm Tags
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Client Selection (core.clients) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Select Client (Interconnected from core.clients)
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
                    placeholder="Search 200+ clients by name or code..."
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
                  onChange={handleClientSelect}
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
                  <option value="">-- Choose Existing Client ({filteredClients.length} of {effectiveClients.length} Available) --</option>
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
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: '#2563EB',
                          color: '#fff',
                        }}
                      >
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
                  placeholder="Or enter custom applicant name..."
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

              {/* Tag System (Requirement 10) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Assign Tags (Priority, Ticket Raised, Critical, Political...)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <TagIcon size={11} /> {tg}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2B: Inventors Details & Roster (Requirement 1) */}
          <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '8px', background: 'var(--page)', border: '1px solid var(--line)' }}>
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
                      padding: '14px',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>
                        New Inventor Details
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
                        All fields will be docketed on Form 1 & Form 2
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      {/* 1. Full Name */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ink)', marginBottom: '5px' }}>
                          Inventor Full Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Dr. Rajesh Kumar"
                          value={newInventor.name}
                          onChange={(e) => setNewInventor({ ...newInventor, name: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* 2. Institution / University */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ink)', marginBottom: '5px' }}>
                          Institution / Organization / Affiliation *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. MIT Manipal or Applicant Entity"
                          value={newInventor.institution}
                          onChange={(e) => setNewInventor({ ...newInventor, institution: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* 3. Gender */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ink)', marginBottom: '5px' }}>
                          Gender
                        </label>
                        <select
                          value={newInventor.gender}
                          onChange={(e) => setNewInventor({ ...newInventor, gender: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box', cursor: 'pointer' }}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>

                      {/* 4. Nationality */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ink)', marginBottom: '5px' }}>
                          Nationality
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Indian"
                          value={newInventor.nationality}
                          onChange={(e) => setNewInventor({ ...newInventor, nationality: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* 5. Country of Residence */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ink)', marginBottom: '5px' }}>
                          Country of Residence
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. India"
                          value={newInventor.country_of_residence}
                          onChange={(e) => setNewInventor({ ...newInventor, country_of_residence: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', color: 'var(--ink)', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddInventor(false)}
                        style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--line)', background: 'transparent', fontSize: '11.5px', cursor: 'pointer', color: 'var(--muted)' }}
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
                    Add Inventor
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

          {/* Section 3: Drafter Assignment & Phased Statutory Statuses */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              3. Drafter Assignment & Prosecution Phase Status
            </h3>
            {/* Assigned Drafter */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--ink)', marginBottom: '6px' }}>
                Assigned Drafter *
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
                  {getActiveDrafters().map((d) => (
                    <option key={d} value={d}>
                      👤 {d}
                    </option>
                  ))}
                </select>

              </div>
            </div>

            {/* Prosecution Status (Full Width) */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--ink)', marginBottom: '6px' }}>
                Prosecution Status (7 Statutory Phases)
              </label>
              <PhasedStatusSelector
                value={formData.current_status}
                onChange={handleStatusChange}
                applicationType={formData.specification_type}
              />
            </div>
          </div>

          {/* Section 4: Filing Dates & Section 17 Post-Dating (Requirements 2, 4, 5, 6) */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              4. Client Delivery Commitment & Filing Dates
            </h3>

            {/* Client Delivery Commitment Banner */}
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(234, 88, 12, 0.06)',
                border: '1.5px solid #EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#C2410C', display: 'block' }}>
                  🎯 Client Delivery Commitment Date (Under-Drafting Near Commitment)
                </label>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Set delivery target for client. Automatic notification sent to Organisation & Team SPOC.
                </span>
              </div>
              <input
                type="date"
                name="client_commitment_date"
                value={formData.client_commitment_date}
                onChange={handleChange}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
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

              {/* Section 17 Post-Dating (Requirement 2 & 6) */}
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
                  title="Section 17 allows post-dating application by up to 6 months from original filing"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  CS Filing Date (If filed)
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Form 1 (POR Filing Date)
                </label>
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
            </div>

            {/* Section 17 Post-Dating Leeway Indicator (Requirement 2) */}
            {formData.post_dated_date && formData.ps_filing_date && (
              <div
                style={{
                  marginTop: '12px',
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
                marginTop: '16px',
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
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>
                    Complete Spec (CS) Deadline:
                  </span>
                  <strong style={{ color: statutoryCalculations.cs_deadline ? '#DC2626' : 'var(--muted)' }}>
                    {statutoryCalculations.cs_deadline || '—'}
                  </strong>

                </div>

                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>
                    Form 1 (Proof of Right):
                  </span>
                  <strong style={{ color: '#059669' }}>
                    {statutoryCalculations.form_1_deadline || '—'}
                  </strong>

                </div>

                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>
                    Form 26 (Power of Attorney):
                  </span>
                  <strong style={{ color: '#059669' }}>
                    {statutoryCalculations.form_26_deadline || '—'}
                  </strong>

                </div>

                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>
                    Form 18 (RFE Deadline):
                  </span>
                  <strong style={{ color: '#2563EB' }}>
                    {statutoryCalculations.rfe_deadline || '—'}
                  </strong>

                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Specification Content - Abstract & Claims (Requirement 4) */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              5. Specification Content (Abstract & Claims)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Abstract Field with strict 150-word statutory monitor */}
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
                  rows={6}
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

              {/* Claims Field (Unrestricted word count) */}
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
                  placeholder="Enter claims..."
                  rows={6}
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
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                  No word limit for claims. First 10 claims included in basic fee; subsequent claims incur ₹320 (Reduced) / ₹1,600 (Others) each.
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Official IPO Statutory Government Fee Schedule (Requirement 1) */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', margin: 0 }}>
                6. Government Fee Schedule (First Schedule of Indian Patents Rules)
              </h3>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: isReducedFeeEntity(formData.entity_category) ? '#dbeafe' : '#f1f5f9',
                color: isReducedFeeEntity(formData.entity_category) ? '#1e40af' : '#475569'
              }}>
                Current Applicant Rate: {isReducedFeeEntity(formData.entity_category) ? '80% Reduced (Natural / Startup / Small / Edu)' : 'Standard (Others / Large Entity)'}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '8px',
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--page)',
              border: '1px solid var(--line)'
            }}>
              <div style={{ padding: '6px 8px', borderRadius: '5px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>Form 1 (Application)</span>
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{statutoryFees.f1.label}</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--muted)', display: 'block' }}>Basic fee up to 30p, 10c</span>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '5px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>Form 2 (Specification)</span>
                <strong style={{ fontSize: '13px', color: '#059669' }}>Free (₹0)</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--muted)', display: 'block' }}>Up to 30p & 10 claims</span>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '5px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>Form 3 (Sec 8 Statement)</span>
                <strong style={{ fontSize: '13px', color: '#059669' }}>Free (₹0)</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--muted)', display: 'block' }}>Foreign applications</span>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '5px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>Form 9 (Early Pub)</span>
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{statutoryFees.f9.label}</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--muted)', display: 'block' }}>Section 11A(2)</span>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '5px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>Form 18 (RFE Exam)</span>
                <strong style={{ fontSize: '13px', color: '#2563eb' }}>{statutoryFees.f18.label}</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--muted)', display: 'block' }}>Section 11B</span>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '5px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>Sec 17 (Postdating)</span>
                <strong style={{ fontSize: '13px', color: '#7c3aed' }}>{statutoryFees.sec17.label}</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--muted)', display: 'block' }}>Max 6 months leeway</span>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '5px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>Form 30 (Hearing Attendance)</span>
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{statutoryFees.f30.label}</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--muted)', display: 'block' }}>Rule 62(2) notice</span>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '5px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>Sec 53 Renewals (Y3-Y6)</span>
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{isReducedFeeEntity(formData.entity_category) ? '₹800/yr' : '₹4,000/yr'}</strong>
                <span style={{ fontSize: '9.5px', color: 'var(--muted)', display: 'block' }}>10% discount for 4+ yr e-filing</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
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
                padding: '9px 22px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
              }}
            >
              {isSubmitting ? 'Creating Docket...' : 'Create Patent Application'}
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
