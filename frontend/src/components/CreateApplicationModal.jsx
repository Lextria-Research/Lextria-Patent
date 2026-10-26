// frontend/src/components/CreateApplicationModal.jsx
import React, { useState, useMemo } from 'react';
import {
  X, Plus, FileText, Calendar, User, Building, Tag as TagIcon,
  ExternalLink, CheckCircle2, Shield, AlertTriangle, Clock
} from 'lucide-react';
import { calculateAllStatutoryDeadlines, validateSection17PostDating } from '../utils/statutoryDeadlines';

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
  clients = [],
  tags = []
}) {
  if (!isOpen) return null;

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
    current_status: 'PS Not Yet Filed',
    color_code_status: 'PURPLE',
    ps_filing_date: new Date().toISOString().split('T')[0],
    post_dated_date: '',
    cs_filing_date: '',
    form_1_filing_date: '',
    form_26_filing_date: '',
    workdrive_folder_url: '',
    inventors_summary: '',
    status_notes: '',
    selectedTags: ['Priority'],
  });

  const [selectedClientId, setSelectedClientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Live Statutory Deadline Calculations (Requirements 4, 5, 6)
  const statutoryCalculations = useMemo(() => {
    return calculateAllStatutoryDeadlines(formData);
  }, [formData]);

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

    const found = clients.find((c) => c.id === cId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        applicant_name: found.client_name,
        is_mahe: found.client_name.toLowerCase().includes('manipal') || found.client_name.toLowerCase().includes('mahe'),
      }));
    }
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

    const payload = {
      ...formData,
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Select Client (Interconnected from core.clients)
                </label>
                <select
                  value={selectedClientId}
                  onChange={handleClientSelect}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">-- Choose Existing Client ({clients.length}) --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.client_name}</option>
                  ))}
                </select>
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

          {/* Section 3: Drafter Assignment & Operational Triage */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              3. Drafter Assignment & Operational Triage
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Assigned Drafter *
                </label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  {DRAFTERS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Visual Triage Status
                </label>
                <select
                  name="color_code_status"
                  value={formData.color_code_status}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  {COLOR_CODES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Current Status
                </label>
                <input
                  type="text"
                  name="current_status"
                  value={formData.current_status}
                  onChange={handleChange}
                  placeholder="e.g. PS Filed, Under Drafting"
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
          </div>

          {/* Section 4: Filing Dates & Section 17 Post-Dating (Requirements 4, 5, 6) */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              4. Filing Dates & Section 17 Post-Dating Calculation
            </h3>
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

              {/* Section 17 Post-Dating (Requirement 6) */}
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

            {/* Live Statutory Deadlines Preview Card (Requirement 4 & 5) */}
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
                <Clock size={14} /> AUTOMATICALLY CALCULATED STATUTORY DEADLINES (INDIAN PATENTS ACT)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>
                    Complete Spec (CS) Deadline:
                  </span>
                  <strong style={{ color: statutoryCalculations.cs_deadline ? '#DC2626' : 'var(--muted)' }}>
                    {statutoryCalculations.cs_deadline || '—'}
                  </strong>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>
                    {formData.post_dated_date ? '12m from post-date' : '12m from PS (Sec 9(1))'}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>
                    Form 1 (Proof of Right):
                  </span>
                  <strong style={{ color: '#059669' }}>
                    {statutoryCalculations.form_1_deadline || '—'}
                  </strong>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>
                    6m from filing (Rule 10)
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>
                    Form 26 (Power of Attorney):
                  </span>
                  <strong style={{ color: '#059669' }}>
                    {statutoryCalculations.form_26_deadline || '—'}
                  </strong>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>
                    3m from filing (Rule 135)
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>
                    Form 18 (RFE Deadline):
                  </span>
                  <strong style={{ color: '#2563EB' }}>
                    {statutoryCalculations.rfe_deadline || '—'}
                  </strong>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>
                    31m / 48m (Rule 24B)
                  </span>
                </div>
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
    </div>
  );
}
