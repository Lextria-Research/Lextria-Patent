// frontend/src/components/QuickDocketModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, CheckSquare, Save, Shield, Clock, AlertTriangle, FileText,
  Calendar, CheckCircle2, Hash, RefreshCw, Scale, Search, ArrowRight
} from 'lucide-react';
import { calculateAllStatutoryDeadlines, validateSection17PostDating } from '../utils/statutoryDeadlines';
import DEFAULT_CLIENTS from '../data/clients.json';

const DRAFTERS = [
  'Anusha', 'Ayush', 'Abhishek', 'Fiona',
  'Pramith', 'Pratham', 'Thanush', 'Thilak', 'Pranav Bhat'
];

const STATUS_OPTIONS = [
  'PS Not Yet Filed',
  'PS Filed',
  'PS Filed / Form 1 & 26 Pending',
  'CS Drafting in Progress',
  'CS Ready for Sign-off',
  'CS Filed',
  'Form 9 & 18 Filed',
  'Awaiting First Examination Report (FER)',
  'FER Issued - Awaiting Reply',
  'FER Reply Filed',
  'Hearing Notice Issued',
  'Hearing Held - WS Pending',
  'Written Submissions Filed',
  'Patent Granted',
  'Abandoned / Lapsed'
];

export default function QuickDocketModal({
  isOpen,
  onClose,
  record = null,
  allRecords = [],
  clients: clientsProp = [],
  onUpdate,
}) {
  const clients = (Array.isArray(clientsProp) && clientsProp.length > 0) ? clientsProp : DEFAULT_CLIENTS;
  const [selectedProjectCode, setSelectedProjectCode] = useState(record?.project_code || '');
  const [activeTab, setActiveTab] = useState('cbr'); // cbr, forms, prosecution, grant
  const [searchQuery, setSearchQuery] = useState('');

  // Find the active target record
  const currentRecord = useMemo(() => {
    if (!selectedProjectCode) return record;
    return allRecords.find((r) => r.project_code === selectedProjectCode) || record;
  }, [selectedProjectCode, allRecords, record]);

  // Interconnected client from core.clients
  const matchedClient = useMemo(() => {
    if (!currentRecord || !clients || clients.length === 0) return null;
    return clients.find((c) => {
      if (currentRecord.applicant_name && c.client_name && (currentRecord.applicant_name.toLowerCase().includes(c.client_name.toLowerCase()) || c.client_name.toLowerCase().includes(currentRecord.applicant_name.toLowerCase()))) return true;
      if (currentRecord.project_code && c.client_code && currentRecord.project_code.toUpperCase().startsWith(c.client_code.toUpperCase())) return true;
      return false;
    }) || null;
  }, [currentRecord, clients]);

  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (record?.project_code) {
      setSelectedProjectCode(record.project_code);
    }
  }, [record]);

  useEffect(() => {
    if (currentRecord) {
      setFormData({
        application_number: currentRecord.application_number || '',
        cbr_number: currentRecord.cbr_number || '',
        cbr_date: currentRecord.cbr_date || '',
        specification_type: currentRecord.specification_type || 'PS',
        ps_filing_date: currentRecord.ps_filing_date || '',
        post_dated_date: currentRecord.post_dated_date || '',
        cs_filing_date: currentRecord.cs_filing_date || '',
        publication_date: currentRecord.publication_date || '',
        form_1_filing_date: currentRecord.form_1_filing_date || '',
        f1_status: currentRecord.f1_status || (currentRecord.form_1_filing_date ? 'Within Deadline' : 'Pending'),
        form_26_filing_date: currentRecord.form_26_filing_date || '',
        f26_status: currentRecord.f26_status || (currentRecord.form_26_filing_date ? 'Within Deadline' : 'Pending'),
        form_3_filing_date: currentRecord.form_3_filing_date || '',
        form_5_filing_date: currentRecord.form_5_filing_date || '',
        form_9_filing_date: currentRecord.form_9_filing_date || '',
        form_18_filing_date: currentRecord.form_18_filing_date || '',
        rfe_number: currentRecord.rfe_number || '',
        fer_notice_date: currentRecord.fer_notice_date || '',
        fer_reply_filing_date: currentRecord.fer_reply_filing_date || '',
        hearing_date: currentRecord.hearing_date || '',
        ws_filing_date: currentRecord.ws_filing_date || '',
        patent_number: currentRecord.patent_number || '',
        grant_date: currentRecord.grant_date || '',
        next_renewal_date: currentRecord.next_renewal_date || '',
        last_renewal_date: currentRecord.last_renewal_date || '',
        current_status: currentRecord.current_status || 'PS Not Yet Filed',
        color_code_status: currentRecord.color_code_status || 'PURPLE',
        assigned_to: currentRecord.assigned_to || '',
        client_commitment_date: currentRecord.client_commitment_date || '',
        docketing_notes: '',
      });
    }
  }, [currentRecord]);

  if (!isOpen) return null;

  // Filtered matters list for matter switch dropdown
  const filteredRecords = allRecords.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.project_code || '').toLowerCase().includes(q) ||
      (r.title || '').toLowerCase().includes(q) ||
      (r.application_number || '').toLowerCase().includes(q)
    );
  }).slice(0, 15);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Real-time recalculation of statutory deadlines
  const previewDeadlines = calculateAllStatutoryDeadlines({
    ...currentRecord,
    ...formData,
  });

  const postDatingCheck = validateSection17PostDating(
    formData.ps_filing_date,
    formData.post_dated_date
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentRecord?.project_code) return;

    onUpdate(currentRecord.project_code, {
      ...formData,
      cs_deadline: previewDeadlines.cs_deadline,
      form_1_deadline: previewDeadlines.form_1_deadline,
      form_26_deadline: previewDeadlines.form_26_deadline,
      rfe_deadline: previewDeadlines.rfe_deadline,
      fer_reply_deadline: previewDeadlines.fer_reply_deadline,
      ws_deadline: previewDeadlines.ws_deadline,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease',
        }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(5, 150, 105, 0.12)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckSquare size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Quick Docketing Desk
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#059669',
                    color: '#fff',
                  }}
                >
                  IPO Formalities Authority
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Record filing receipts (CBR), update official application numbers, Form 1/26 dates, and statutory prosecution.
              </p>
            </div>
          </div>
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
            <X size={18} />
          </button>
        </div>

        {/* Matter Selector Bar */}
        <div
          style={{
            padding: '12px 24px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>Matter:</span>
            {allRecords.length > 0 ? (
              <select
                value={selectedProjectCode}
                onChange={(e) => setSelectedProjectCode(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  color: 'var(--ink)',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  flex: 1,
                  maxWidth: '450px',
                }}
              >
                {allRecords.map((r) => (
                  <option key={r.project_code} value={r.project_code}>
                    {r.project_code} — {r.title?.slice(0, 45) || 'Untitled'} ({r.assigned_to || 'Unassigned'})
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                {currentRecord?.project_code}
              </span>
            )}
          </div>

          {currentRecord && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  color: '#1D4ED8',
                  fontWeight: 700,
                }}
                title={matchedClient?.client_name || currentRecord.applicant_name}
              >
                Client: {matchedClient?.client_code ? `[${matchedClient.client_code}] ` : ''}
                {(matchedClient?.client_name || currentRecord.applicant_name || 'Manipal Academy of Higher Education').slice(0, 24)}...
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'var(--page)',
                  border: '1px solid var(--line)',
                  color: 'var(--muted)',
                  fontWeight: 600,
                }}
              >
                Drafter: <strong>{currentRecord.assigned_to || 'None'}</strong>
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563EB',
                  fontWeight: 700,
                }}
              >
                {currentRecord.specification_type || 'PS'}
              </span>
            </div>
          )}
        </div>

        {/* Section Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 24px',
            background: 'var(--page)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {[
            { id: 'cbr', label: '1. Filing Receipt & CBR', icon: FileText },
            { id: 'forms', label: '2. Form 1 & Form 26', icon: Shield },
            { id: 'prosecution', label: '3. Examination & FER', icon: Clock },
            { id: 'grant', label: '4. Grant & Renewal (Sec 53)', icon: RefreshCw },
          ].map((t) => {
            const Icon = t.icon;
            const isAct = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isAct ? 'var(--surface)' : 'transparent',
                  color: isAct ? 'var(--ink)' : 'var(--muted)',
                  fontWeight: isAct ? 800 : 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isAct ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Icon size={13} color={isAct ? '#059669' : 'currentColor'} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* TAB 1: FILING RECEIPT & CBR */}
          {activeTab === 'cbr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(5, 150, 105, 0.08)', border: '1px solid rgba(5, 150, 105, 0.2)', fontSize: '12px', color: '#047857' }}>
                💡 <strong>Cash Book Receipt (CBR) Docketing:</strong> Once the patent application is e-filed on ipindiaservices.gov.in, record the 12-digit Application Number, official CBR number, and payment date here.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    IPO Application Number *
                  </label>
                  <input
                    type="text"
                    name="application_number"
                    value={formData.application_number}
                    onChange={handleChange}
                    placeholder="e.g. 202441012345"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Official 12-digit Indian Patent Office filing number
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    CBR Number (Cash Book Receipt)
                  </label>
                  <input
                    type="text"
                    name="cbr_number"
                    value={formData.cbr_number}
                    onChange={handleChange}
                    placeholder="e.g. CBR-49201"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Receipt number on IPO payment acknowledgement
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Provisional (PS) Filing Date
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Complete Specification (CS) Filing Date
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Section 17 Post-dated Date (Optional)
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
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                  {formData.post_dated_date && (
                    <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 700, color: postDatingCheck.isValid ? '#059669' : '#DC2626' }}>
                      {postDatingCheck.reason} ({postDatingCheck.daysOffset} days shift)
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Calculated CS Statutory Deadline
                  </label>
                  <div
                    style={{
                      padding: '9px 12px',
                      borderRadius: '6px',
                      background: 'var(--page)',
                      border: '1px solid var(--line)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: previewDeadlines.cs_deadline ? '#2563EB' : 'var(--muted)',
                    }}
                  >
                    {previewDeadlines.cs_deadline || 'Requires PS Filing Date (12 months)'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORM 1 & FORM 26 */}
          {activeTab === 'forms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(234, 88, 12, 0.08)', border: '1px solid rgba(234, 88, 12, 0.2)', fontSize: '12px', color: '#C2410C' }}>
                ⚖️ <strong>Rule 135 / Rule 137 Petition Protocol:</strong> Form 1 (Proof of Right) must be filed within 6 months of filing. Form 26 (Power of Attorney) must be filed within 3 months. If delayed, record petition filing dates and fees below.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--page)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} color="#2563EB" /> Form 1 (Proof of Right / Assignment)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--muted)' }}>
                        Form 1 Filing Date
                      </label>
                      <input
                        type="date"
                        name="form_1_filing_date"
                        value={formData.form_1_filing_date}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          fontSize: '12.5px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--muted)' }}>
                        Form 1 Status
                      </label>
                      <select
                        name="f1_status"
                        value={formData.f1_status}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          fontSize: '12.5px',
                          fontWeight: 700,
                        }}
                      >
                        <option value="Pending">Pending (Not yet submitted)</option>
                        <option value="Within Deadline">Within Deadline (Filed)</option>
                        <option value="Delayed">Delayed (Filed under Rule 137 petition)</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </select>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                      Statutory 6M Deadline: <strong>{previewDeadlines.form_1_deadline || 'Pending filing date'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--page)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} color="#EA580C" /> Form 26 (Power of Attorney / Authorization)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--muted)' }}>
                        Form 26 Filing Date
                      </label>
                      <input
                        type="date"
                        name="form_26_filing_date"
                        value={formData.form_26_filing_date}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          fontSize: '12.5px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--muted)' }}>
                        Form 26 Status
                      </label>
                      <select
                        name="f26_status"
                        value={formData.f26_status}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          fontSize: '12.5px',
                          fontWeight: 700,
                        }}
                      >
                        <option value="Pending">Pending (Not yet submitted)</option>
                        <option value="Within Deadline">Within Deadline (Filed)</option>
                        <option value="Delayed">Delayed (Filed under Rule 137 petition)</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </select>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                      Statutory 3M Deadline: <strong>{previewDeadlines.form_26_deadline || 'Pending filing date'}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Form 3 (Foreign Applications Statement - Sec 8)
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Updated statement under Section 8(1)
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Form 5 (Declaration of Inventorship)
                  </label>
                  <input
                    type="date"
                    name="form_5_filing_date"
                    value={formData.form_5_filing_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Mandatory when filing Complete Specification
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXAMINATION & FER */}
          {activeTab === 'prosecution' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(138, 79, 255, 0.08)', border: '1px solid rgba(138, 79, 255, 0.2)', fontSize: '12px', color: '#7C3AED' }}>
                📋 <strong>Section 11B & Section 21 Examination Tracker:</strong> RFE (Form 18) must be filed within 31 months of priority. Once FER is issued, response must be submitted within 6 months (Rule 24B).
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Form 9 (Early Publication) Filing Date
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Official IPO Publication Date (Journal)
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Statutory 31M Deadline: <strong>{previewDeadlines.rfe_deadline || 'N/A'}</strong>
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    RFE Receipt / Token Number
                  </label>
                  <input
                    type="text"
                    name="rfe_number"
                    value={formData.rfe_number}
                    onChange={handleChange}
                    placeholder="e.g. RFE/2024/49120"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    First Examination Report (FER) Notice Date
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                    FER Reply Deadline: {previewDeadlines.fer_reply_deadline || 'Pending Notice Date (6 months)'}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Hearing Date (Section 14 / 15)
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                    Written Submission Deadline: {previewDeadlines.ws_deadline || 'Pending Hearing (15 days)'}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Written Submissions (WS) Filing Date
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GRANT & RENEWAL (SEC 53) */}
          {activeTab === 'grant' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '12px', color: '#047857' }}>
                🏅 <strong>Letters Patent & Section 53 Renewal Maintenance:</strong> Record granted patent numbers, official grant certificates, and maintain annual annuity renewal tracking.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Letters Patent / Grant Number
                  </label>
                  <input
                    type="text"
                    name="patent_number"
                    value={formData.patent_number}
                    onChange={handleChange}
                    placeholder="e.g. IN 519283"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Date of Grant
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
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Next Annuity Renewal Due Date (Section 53)
                  </label>
                  <input
                    type="date"
                    name="next_renewal_date"
                    value={formData.next_renewal_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Last Renewal Paid Date
                  </label>
                  <input
                    type="date"
                    name="last_renewal_date"
                    value={formData.last_renewal_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Current Docket Status
                  </label>
                  <select
                    name="current_status"
                    value={formData.current_status}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                    Assigned Drafter Associate
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
                      color: 'var(--ink)',
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
              </div>
            </div>
          )}

          {/* Docketing Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
              Docketing Audit Remarks / Receipt Reference
            </label>
            <input
              type="text"
              name="docketing_notes"
              value={formData.docketing_notes}
              onChange={handleChange}
              placeholder="e.g. CBR receipt verified on IPO portal, Form 1 fee Rs. 1600 paid."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--page)',
                color: 'var(--ink)',
                fontSize: '12.5px',
              }}
            />
          </div>

          {/* Footer Actions */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#fff',
                fontSize: '12.5px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.35)',
              }}
            >
              <Save size={14} /> Save & Update Docket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

