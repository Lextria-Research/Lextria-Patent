// frontend/src/components/CreateApplicationModal.jsx
import React, { useState } from 'react';
import {
  X, Plus, FileText, Calendar, User, Building, Tag,
  ExternalLink, CheckCircle2, Shield, AlertTriangle
} from 'lucide-react';

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

export default function CreateApplicationModal({ isOpen, onClose, onCreate, existingCodes = [] }) {
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
    cs_filing_date: '',
    form_1_filing_date: '',
    form_26_filing_date: '',
    workdrive_folder_url: '',
    inventors_summary: '',
    status_notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreate(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create patent application.');
    } finally {
      setIsSubmitting(false);
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
          maxWidth: '750px',
          maxHeight: '90vh',
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
              1. Identifiers & Portfolio Classification
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

          {/* Section 2: Drafter Allocation & Visual Triage */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              2. Drafter Assignment & Operational Triage
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

          {/* Section 3: Applicant & Classification */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              3. Applicant & Technical Domain
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Applicant Name
                </label>
                <input
                  type="text"
                  name="applicant_name"
                  value={formData.applicant_name}
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
                  Entity Category
                </label>
                <select
                  name="entity_category"
                  value={formData.entity_category}
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
                  {ENTITY_CATEGORIES.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Classification / Tag
                </label>
                <input
                  type="text"
                  name="classification"
                  value={formData.classification}
                  onChange={handleChange}
                  placeholder="e.g. AR, KM, MIT, Biotech"
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

            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Inventors (Names separated by comma)
              </label>
              <input
                type="text"
                name="inventors_summary"
                value={formData.inventors_summary}
                onChange={handleChange}
                placeholder="e.g. Dr. Ramesh Kumar, Priya Sharma"
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

          {/* Section 4: Key Statutory Filing Dates */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              4. Key Statutory Filing Dates
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Form 1 (Proof of Right)
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Form 26 (POA Date)
                </label>
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
            </div>
          </div>

          {/* Section 5: Document Vault & Notes */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '12px' }}>
              5. Cloud Dossier & Status Notes
            </h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Zoho WorkDrive Dossier URL
              </label>
              <input
                type="url"
                name="workdrive_folder_url"
                value={formData.workdrive_folder_url}
                onChange={handleChange}
                placeholder="https://workdrive.zohoexternal.com/folder/..."
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
                Operational Remarks / Status Notes
              </label>
              <textarea
                name="status_notes"
                value={formData.status_notes}
                onChange={handleChange}
                placeholder="Add drafting status notes, suggestions or queries..."
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
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--page)',
                color: 'var(--ink)',
                fontSize: '13px',
                fontWeight: 700,
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
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              {isSubmitting ? (
                <>Creating Record...</>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Save Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
