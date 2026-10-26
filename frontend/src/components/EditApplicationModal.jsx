// frontend/src/components/EditApplicationModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Save, Edit3, Calendar, User, Tag as TagIcon,
  ExternalLink, CheckCircle2, AlertTriangle, Layers, Clock, Building
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
  clients = [],
  tags = []
}) {
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
    status_notes: '',
    suggested_action: '',
    issue: '',
    selectedTags: [],
  });

  const [activeTab, setActiveTab] = useState('BASIC'); // BASIC, DATES, FORMS, NOTES
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (record) {
      const rTags = Array.isArray(record.tags) ? record.tags : (record.classification ? [record.classification] : []);
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
  }, [record]);

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

    try {
      setIsSubmitting(true);
      setError(null);
      await onUpdate(record.project_code, {
        ...formData,
        tags: formData.selectedTags,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update patent application.');
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Applicant Name (Interconnected Client)
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

              {/* Drafter & Triage Status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
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
            </div>
          )}

          {/* TAB 2: PROSECUTION DATES & POST-DATING */}
          {activeTab === 'DATES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  <Clock size={14} /> LIVE STATUTORY DEADLINES (INDIAN PATENTS ACT)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>CS Deadline:</span>
                    <strong style={{ color: statutoryCalculations.cs_deadline ? '#DC2626' : 'var(--muted)' }}>
                      {statutoryCalculations.cs_deadline || '—'}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>
                      {formData.post_dated_date ? '12m from post-date' : '12m from PS (Sec 9(1))'}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>Form 1 (POR):</span>
                    <strong style={{ color: '#059669' }}>
                      {statutoryCalculations.form_1_deadline || '—'}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>
                      6m from filing (Rule 10)
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>Form 26 (POA):</span>
                    <strong style={{ color: '#059669' }}>
                      {statutoryCalculations.form_26_deadline || '—'}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>
                      3m from filing (Rule 135)
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '10.5px' }}>FER Reply Deadline:</span>
                    <strong style={{ color: statutoryCalculations.fer_reply_deadline ? '#DC2626' : 'var(--muted)' }}>
                      {statutoryCalculations.fer_reply_deadline || '—'}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>
                      6m from FER (Sec 21)
                    </span>
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
            </div>
          )}

          {/* TAB 3: STATUTORY FORMS */}
          {activeTab === 'FORMS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Form 1 (Proof of Right Filing Date)
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
                    Form 26 (Power of Attorney Filing Date)
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
                    Form 3 (Foreign Filings Date)
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
                    Form 9 (Early Publication Filing Date)
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
                    Form 18 / 18A (RFE Filing Date)
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
    </div>
  );
}
