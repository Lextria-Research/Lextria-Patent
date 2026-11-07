// frontend/src/components/CliqAssignmentModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Zap, CheckCircle2, AlertTriangle, Copy, Check, MessageSquare,
  Sparkles, ExternalLink, Shield, Calendar, User, Building, FileText,
  Clock, ArrowRight, CheckSquare, Layers
} from 'lucide-react';
import { parseCliqAssignmentMessage, REGISTERED_DRAFTERS } from '../utils/cliqAssignmentParser.js';
import {
  STATUTORY_STATUSES,
  PROSECUTION_PHASES,
  STATUS_COLORS,
  getStatusColor
} from '../constants/patentStatuses.js';
import { addMonths, toIsoDate, calculateAllStatutoryDeadlines } from '../utils/statutoryDeadlines.js';

export default function CliqAssignmentModal({
  isOpen,
  onClose,
  onCreate,
  records = [],
  showToast
}) {
  if (!isOpen) return null;

  const [messageText, setMessageText] = useState(
    'Assign AR45 to Anusha - Title: Smart Automated Crop Harvesting System - Client: MAHE'
  );
  const [parseResult, setParseResult] = useState(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Editable overrides for detected fields
  const [selectedStatus, setSelectedStatus] = useState('Idf sent, awaiting data');
  const [isTransferred, setIsTransferred] = useState(false);
  const [transferDate, setTransferDate] = useState(toIsoDate(new Date()));
  const [appNumber, setAppNumber] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [assignedDrafter, setAssignedDrafter] = useState('Anusha');
  const [commitmentDate, setCommitmentDate] = useState('');

  // Automatically re-parse on input change
  useEffect(() => {
    if (messageText.trim()) {
      const res = parseCliqAssignmentMessage(messageText, records);
      setParseResult(res);
      if (res.success && res.record) {
        setSelectedStatus(res.record.current_status || 'Idf sent, awaiting data');
        setIsTransferred(Boolean(res.record.is_transferred_case));
        setTransferDate(res.record.transfer_date || toIsoDate(new Date()));
        setAppNumber(res.record.application_number || '');
        setFilingDate(res.record.ps_filing_date || '');
        setAssignedDrafter(res.record.assigned_to || 'Anusha');
        setCommitmentDate(res.record.client_commitment_date || '');
      }
    } else {
      setParseResult(null);
    }
  }, [messageText, records]);

  const webhookEndpoint = `${window.location.origin}/api/webhooks/cliq-assignment`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Grouped statutory statuses for the selector dropdown
  const groupedStatuses = useMemo(() => {
    const map = {};
    PROSECUTION_PHASES.forEach((phase) => {
      map[phase.id] = {
        phase,
        statuses: STATUTORY_STATUSES.filter((s) => s.phase === phase.id)
      };
    });
    // Add Phase 8 for IP Shift if not already mapped
    const ipShiftStatuses = STATUTORY_STATUSES.filter((s) => s.phase === 'PHASE_8_IP_SHIFT');
    if (ipShiftStatuses.length > 0) {
      map['PHASE_8_IP_SHIFT'] = {
        phase: { id: 'PHASE_8_IP_SHIFT', label: '8. IP Shift & Abandoned' },
        statuses: ipShiftStatuses
      };
    }
    return map;
  }, []);

  const handleStatusChange = (newStatusName) => {
    setSelectedStatus(newStatusName);
    const statusObj = STATUTORY_STATUSES.find((s) => s.name === newStatusName);
    // If user selects a post-filing status, auto-enable transfer if not already
    const isPostFiling = statusObj && ![
      'PHASE_1_PS', 'PHASE_2_CS'
    ].includes(statusObj.phase) || (statusObj && ['STATUS_6', 'STATUS_7', 'STATUS_11D'].includes(statusObj.id));

    if (isPostFiling && !isTransferred) {
      setIsTransferred(true);
      if (!transferDate) setTransferDate(toIsoDate(new Date()));
    }
  };

  const handleCreate = () => {
    if (!parseResult?.success || !parseResult.record) return;
    setIsCreating(true);
    try {
      const baseRec = parseResult.record;
      const effectiveTransferDate = isTransferred ? (transferDate || toIsoDate(new Date())) : '';
      const f26Deadline = isTransferred ? addMonths(effectiveTransferDate, 3) : (filingDate ? addMonths(filingDate, 3) : '');
      const f13Deadline = isTransferred ? addMonths(effectiveTransferDate, 3) : '';

      const transferDisplayDate = effectiveTransferDate 
        ? new Date(effectiveTransferDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Immediate';
      const f26DisplayDate = f26Deadline 
        ? new Date(f26Deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Within 3 Months';

      let statusNotes = '';
      const selectedTags = ['Cliq Assigned', baseRec.is_mahe ? 'MAHE' : 'External Client'];

      if (isTransferred) {
        selectedTags.push('Former Attorney Transfer');
        selectedTags.push('Form 13 Req');
        statusNotes = `⚡ FORMER ATTORNEY TRANSFER (TAKEOVER CASE):
• Transferred to Lextria Research on ${transferDisplayDate}.
• MANDATORY STATUTORY ACTIONS:
  1. Form-26 (Fresh Power of Attorney): File within 3 months of transfer (Due: ${f26DisplayDate}) per Rule 135.
  2. Form-13 (Change in Address for Service): File under Section 57 / Rule 81 to update IPO registry to Lextria Research.
• Current Prosecution Status: ${selectedStatus}.
• Assigned to ${assignedDrafter} via Zoho Cliq.`;
      } else {
        statusNotes = `Pre-filing matter assigned via Zoho Cliq to ${assignedDrafter} on ${new Date().toLocaleDateString('en-IN')}.
Status: ${selectedStatus}. Form-13 is NOT required (Lextria will file directly at IPO). Statutory deadlines activate upon filing.`;
      }

      const finalizedRecord = {
        ...baseRec,
        assigned_to: assignedDrafter,
        application_number: appNumber || '',
        current_status: selectedStatus,
        color_code_status: getStatusColor(selectedStatus).key,
        is_transferred_case: isTransferred,
        former_attorney_transfer: isTransferred,
        transfer_date: effectiveTransferDate,
        form_13_required: isTransferred,
        form_13_status: isTransferred ? 'Pending' : 'Not Applicable',
        form_13_deadline: f13Deadline,
        form_26_deadline: f26Deadline,
        ps_filing_date: filingDate || '',
        cs_filing_date: (baseRec.specification_type === 'CS' && filingDate) ? filingDate : '',
        client_commitment_date: commitmentDate || '',
        f1_status: isTransferred ? 'Check Former Attorney' : (filingDate ? 'Pending' : 'Pending Filing at IPO'),
        f26_status: isTransferred ? 'Pending Transfer POA' : (filingDate ? 'Pending' : 'Pending Filing at IPO'),
        status_notes: statusNotes,
        selectedTags: Array.from(new Set(selectedTags)),
      };

      onCreate(finalizedRecord);
      if (showToast) {
        showToast(`✓ Patent Matter ${finalizedRecord.project_code} successfully created and assigned to ${finalizedRecord.assigned_to}!`);
      }
      onClose();
    } catch (e) {
      console.error('Error creating patent from Cliq message:', e);
    } finally {
      setIsCreating(false);
    }
  };

  const sampleMessages = [
    {
      label: 'Pre-Filing (IDF/Drafting)',
      text: 'Assign AR45 to Anusha - Title: Smart Automated Crop Harvesting System - Client: MAHE',
    },
    {
      label: 'Transfer: FER Stage',
      text: 'Assign AR46 to Fiona - Transfer from former attorney, patent already filed (App No: 202341054321), FER Received on 15/09/2026. File Form 13 & Form 26.',
    },
    {
      label: 'Transfer: Hearing Stage',
      text: 'Assign AR47 to Thanush - Takeover case from previous counsel for MAHE. Hearing notice received for 10 Dec 2026. File Form 13 address change & Form 26.',
    },
    {
      label: 'Transfer: Published',
      text: 'Assign AR48 to Pramith - Patent Published (App: 202241088776). Client transferred matter to Lextria. Complete CS drafting.',
    },
    {
      label: 'Structured Key-Value',
      text: `Code: AR49\nDrafter: Abhishek\nTitle: AI Based Image Recognition for Medical Diagnostics\nClient: MAHE\nType: PS\nStatus: PS Underdrafting`,
    },
  ];

  const rec = parseResult?.record;
  const statusColorObj = getStatusColor(selectedStatus);
  const calculatedF26Deadline = isTransferred && transferDate ? addMonths(transferDate, 3) : '';
  const calculatedF13Deadline = isTransferred && transferDate ? addMonths(transferDate, 3) : '';

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
          maxWidth: '760px',
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
                background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                Zoho Cliq Patent Assignment & Transfer Intake
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                Parse messages at any prosecution stage; auto-detects former attorney transfers, Form 26, and Form 13 requirements
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

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Inbound Webhook URL Info Box */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--page)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={15} color="#0284C7" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>
                  Automated Cliq Inbound Webhook Endpoint
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyWebhook}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: copiedWebhook ? '#10B981' : 'var(--surface)',
                  color: copiedWebhook ? '#fff' : 'var(--ink)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {copiedWebhook ? <Check size={12} /> : <Copy size={12} />}
                {copiedWebhook ? 'Copied URL!' : 'Copy Webhook URL'}
              </button>
            </div>
            <code
              style={{
                display: 'block',
                padding: '6px 8px',
                borderRadius: '6px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                fontSize: '11px',
                color: 'var(--ink)',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
              }}
            >
              {webhookEndpoint}
            </code>
          </div>

          {/* Preset Buttons */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--ink)' }}>
              Select Scenario Preset or Paste Custom Message:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {sampleMessages.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessageText(sample.text)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: messageText === sample.text ? '#E0F2FE' : 'var(--page)',
                    color: messageText === sample.text ? '#0369A1' : 'var(--muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="e.g. Assign AR46 to Fiona - Transfer from former attorney, patent already filed (App No: 202341054321), FER Received on 15/09/2026."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: 'var(--page)',
                fontSize: '12.5px',
                fontFamily: 'monospace',
                color: 'var(--ink)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Live Extracted Preview Card */}
          {parseResult?.success && rec && (
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: isTransferred 
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(217, 119, 6, 0.02))'
                  : 'linear-gradient(135deg, rgba(2, 132, 199, 0.05), rgba(14, 165, 233, 0.02))',
                border: isTransferred ? '1.5px solid #F59E0B' : '1.5px solid #0284C7',
              }}
            >
              {/* Top Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color={isTransferred ? '#D97706' : '#0284C7'} />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: isTransferred ? '#B45309' : '#0369A1' }}>
                    {isTransferred ? '⚡ Former Attorney Transfer Detected' : 'Live Assignment Parsed Successfully'}
                  </span>
                </div>
                
                {/* Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Active Stage:</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: statusColorObj.bg,
                      color: statusColorObj.text,
                      border: `1px solid ${statusColorObj.border}`
                    }}
                  >
                    {selectedStatus}
                  </span>
                </div>
              </div>

              {/* Core Attributes Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Matter Code</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>{rec.project_code}</span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Assigned Drafter</span>
                  <select
                    value={assignedDrafter}
                    onChange={(e) => setAssignedDrafter(e.target.value)}
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#2563EB',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)'
                    }}
                  >
                    {REGISTERED_DRAFTERS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Client / Applicant</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>{rec.applicant_name}</span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Specification</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    {rec.specification_type === 'PS' ? 'Provisional (PS)' : 'Complete (CS)'}
                  </span>
                </div>
              </div>

              {/* Invention Title */}
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Invention Title</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{rec.title}</span>
              </div>

              {/* STAGE & STATUS SELECTOR DROPDOWN */}
              <div style={{
                marginBottom: '14px',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--line)'
              }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>
                  Prosecution Stage / Status (Detected from Message text):
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--ink)'
                  }}
                >
                  {Object.values(groupedStatuses).map(({ phase, statuses }) => (
                    <optgroup key={phase.id} label={phase.label}>
                      {statuses.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.colorName.toUpperCase()})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                  Tip: Change this dropdown if you want to assign this patent to a different statutory phase.
                </div>
              </div>

              {/* FORMER ATTORNEY TRANSFER TOGGLE & ALERT BOX */}
              <div style={{
                marginBottom: '14px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: isTransferred ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                border: isTransferred ? '1.5px solid #F59E0B' : '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isTransferred}
                      onChange={(e) => setIsTransferred(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#D97706', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: isTransferred ? '#92400E' : 'var(--ink)' }}>
                      Transferred from Former Attorney (Already Filed at IPO)
                    </span>
                  </label>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isTransferred ? '#FEF3C7' : '#D1FAE5',
                    color: isTransferred ? '#B45309' : '#065F46'
                  }}>
                    {isTransferred ? 'TAKEOVER CASE' : 'NEW PRE-FILING'}
                  </span>
                </div>

                {isTransferred ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#78350F', lineHeight: 1.45 }}>
                      ⚡ <strong>Former Attorney Transfer Rule:</strong> Because this patent was already filed by another attorney/agent, two mandatory statutory filings must be initiated:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      {/* Form 26 Box */}
                      <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Shield size={13} /> 1. Form-26 (Power of Attorney)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          Rule 135: Mandatory fresh POA executed to Lextria within 3 months of transfer.
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#4F46E5', marginTop: '4px' }}>
                          Due Date: {calculatedF26Deadline ? new Date(calculatedF26Deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Within 3 Months'}
                        </div>
                      </div>

                      {/* Form 13 Box */}
                      <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building size={13} /> 2. Form-13 (Address for Service)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          Sec 57 & Rule 81: Mandatory change of Address for Service to Lextria Research on IPO register.
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>
                          Status: Pending Filing (Section 57)
                        </div>
                      </div>
                    </div>

                    {/* Transfer Details Form Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginTop: '4px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '3px' }}>
                          Transfer / Takeover Date:
                        </label>
                        <input
                          type="date"
                          value={transferDate}
                          onChange={(e) => setTransferDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--line)',
                            background: 'var(--surface)',
                            fontSize: '12px',
                            color: 'var(--ink)'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '3px' }}>
                          IPO Application Number:
                        </label>
                        <input
                          type="text"
                          value={appNumber}
                          onChange={(e) => setAppNumber(e.target.value)}
                          placeholder="e.g. 202341054321"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--line)',
                            background: 'var(--surface)',
                            fontSize: '12px',
                            color: 'var(--ink)'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '3px' }}>
                          Original Filing Date (IPO):
                        </label>
                        <input
                          type="date"
                          value={filingDate}
                          onChange={(e) => setFilingDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--line)',
                            background: 'var(--surface)',
                            fontSize: '12px',
                            color: 'var(--ink)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '11.5px', color: '#065F46', lineHeight: 1.4 }}>
                    ✓ <strong>Pre-Filing Matter:</strong> Form-13 is <strong>NOT required</strong> because Lextria Research will file the initial Form 1 at the Patent Office directly, recording Lextria as the address for service from day 1. Statutory deadlines will activate upon filing.
                  </div>
                )}
              </div>

              {/* Client Commitment Date Input */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>Client Delivery Target Date:</span>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Drafter deadline committed to client</div>
                </div>
                <input
                  type="date"
                  value={commitmentDate}
                  onChange={(e) => setCommitmentDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '12px',
                    color: 'var(--ink)'
                  }}
                />
              </div>

            </div>
          )}

          {parseResult && !parseResult.success && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{parseResult.error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--line)',
            background: 'var(--page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
            {isTransferred 
              ? '⚡ Form-13 (Address for Service) and Form-26 will be tracked automatically in the docket.'
              : 'Statutory deadlines (Sec 9 CS Due, Form 1, Form 26) will activate upon filing at IPO.'}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!parseResult?.success || isCreating}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: parseResult?.success ? 'linear-gradient(135deg, #0284C7, #0369A1)' : 'var(--line)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 800,
                cursor: parseResult?.success ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: parseResult?.success ? '0 2px 4px rgba(2, 132, 199, 0.3)' : 'none',
              }}
            >
              <Sparkles size={15} />
              {isCreating ? 'Creating Matter...' : 'Create Patent Entry in Dashboard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
