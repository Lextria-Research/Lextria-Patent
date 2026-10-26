// frontend/src/components/EditApplicationModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X, Save, Edit3, Calendar, User, Tag,
  ExternalLink, CheckCircle2, AlertTriangle, Layers
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

const COLOR_CODES = [
  { value: 'PURPLE', label: 'Purple (Internal Drafting / Triage)' },
  { value: 'YELLOW', label: 'Yellow (Pending Inventor / External Query)' },
  { value: 'ORANGE', label: 'Orange (Draft Ready, Pending Final Signoff)' },
  { value: 'GREEN', label: 'Green (Approved / Filed at IPO)' },
  { value: 'RED', label: 'Red (Critical Due Soon / Overdue)' },
  { value: 'BLUE', label: 'Blue (Standard In-Progress)' },
  { value: 'GREY', label: 'Grey (Abandoned / Closed)' },
];

export default function EditApplicationModal({ isOpen, onClose, record, onUpdate }) {
  if (!isOpen || !record) return null;

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
    ps_filing_date: '',
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
    status_notes: '',
    suggested_action: '',
    issue: '',
  });

  const [activeTab, setActiveTab] = useState('BASIC'); // BASIC, DATES, FORMS, NOTES
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (record) {
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
        ps_filing_date: record.ps_filing_date ? record.ps_filing_date.slice(0, 10) : '',
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
      });
    }
  }, [record]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onUpdate(record.project_code, formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update application.');
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
          maxWidth: '800px',
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
                  Edit Application
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                  }}
                >
                  {record.project_code}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                {record.application_number || 'Application number unassigned'} · {record.applicant_name}
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
            background: 'var(--page)',
            padding: '0 24px',
          }}
        >
          {[
            { id: 'BASIC', label: 'General & Triage' },
            { id: 'DATES', label: 'Prosecution Dates' },
            { id: 'FORMS', label: 'Statutory Forms' },
            { id: 'NOTES', label: 'Notes & Vault' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
                fontWeight: activeTab === tab.id ? 800 : 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
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

          {/* TAB 1: General & Triage */}
          {activeTab === 'BASIC' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
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
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Application Number
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
                    placeholder="e.g. 542190"
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Assigned Drafter
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
                    <option value="">-- Unassigned --</option>
                    {DRAFTERS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Visual Triage Color
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Filing Receipt Status
                  </label>
                  <select
                    name="application_filing_receipt_status"
                    value={formData.application_filing_receipt_status}
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
                    <option value="RECEIVED">RECEIVED (Receipt on file)</option>
                    <option value="PENDING">PENDING (Awaiting Receipt)</option>
                    <option value="NOT_RECEIVED">NOT RECEIVED (Overdue Alert)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Classification / Department
                  </label>
                  <input
                    type="text"
                    name="classification"
                    value={formData.classification}
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Inventors (Comma-separated)
                </label>
                <input
                  type="text"
                  name="inventors_summary"
                  value={formData.inventors_summary}
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

          {/* TAB 2: Prosecution Dates */}
          {activeTab === 'DATES' && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
                Changing filing and notice dates automatically re-calculates 12-month CS, 6-month FER, and 15-day Written Submission statutory deadlines.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    FER Notice Issued Date
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
                    FER Reply Filed Date
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Controller Hearing Date
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
                    Written Submission (WS) Filed
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
                    Patent Grant Date
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
            </div>
          )}

          {/* TAB 3: Statutory Forms */}
          {activeTab === 'FORMS' && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
                Track Form 1 Proof of Right (6 months), Form 26 POA (3 months), Form 3 Foreign Filings, and Form 18 RFE.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Form 1 (Proof of Right) Date
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
                    Form 26 (Power of Attorney) Date
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

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Form 3 (Section 8) Date
                  </label>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Form 9 (Early Publication) Date
                  </label>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Form 18 (RFE Request) Date
                  </label>
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
            </div>
          )}

          {/* TAB 4: Notes & Vault */}
          {activeTab === 'NOTES' && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Zoho WorkDrive Cloud Folder URL
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Status Notes / Internal Remarks
                </label>
                <textarea
                  name="status_notes"
                  value={formData.status_notes}
                  onChange={handleChange}
                  rows={2}
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Suggested Action
                </label>
                <textarea
                  name="suggested_action"
                  value={formData.suggested_action}
                  onChange={handleChange}
                  rows={2}
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
                  Operational Issue / Blocker
                </label>
                <textarea
                  name="issue"
                  value={formData.issue}
                  onChange={handleChange}
                  rows={2}
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
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              {isSubmitting ? (
                <>Saving Changes...</>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
