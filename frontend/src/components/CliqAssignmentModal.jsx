// frontend/src/components/CliqAssignmentModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Zap, CheckCircle2, AlertTriangle, Copy, Check, MessageSquare,
  Sparkles, ExternalLink, Shield, Calendar, User, Building, FileText,
  Clock, ArrowRight, CheckSquare, Layers, Trash2, Plus, Inbox, Settings,
  RotateCcw
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
  showToast,
  cliqQueue = [],
  onUpdateQueue,
  onOpenSettings,
}) {
  if (!isOpen) return null;

  // Tabs: 'QUEUE' (Review items in queue) or 'MANUAL_ADD' (Paste new message)
  const [activeTab, setActiveTab] = useState('QUEUE');
  const [selectedItemId, setSelectedItemId] = useState(null);

  // Manual paste state
  const [pasteText, setPasteText] = useState(
    'Assign AR47 to Thanush - Takeover case from previous counsel for MAHE. Hearing notice received for 10 Dec 2026. File Form 13 address change & Form 26.'
  );
  const [parseResult, setParseResult] = useState(null);

  // Current item being reviewed
  const pendingQueue = useMemo(() => {
    return cliqQueue.filter((item) => item.status === 'PENDING_REVIEW');
  }, [cliqQueue]);

  const resolvedQueue = useMemo(() => {
    return cliqQueue.filter((item) => item.status === 'RESOLVED');
  }, [cliqQueue]);

  // Default selection to first pending item
  useEffect(() => {
    if (pendingQueue.length > 0) {
      if (!selectedItemId || !pendingQueue.some((i) => i.id === selectedItemId)) {
        setSelectedItemId(pendingQueue[0].id);
      }
    } else if (resolvedQueue.length > 0 && !selectedItemId) {
      setSelectedItemId(resolvedQueue[0].id);
    }
  }, [pendingQueue, resolvedQueue, selectedItemId]);

  const selectedItem = useMemo(() => {
    return cliqQueue.find((i) => i.id === selectedItemId) || pendingQueue[0] || null;
  }, [cliqQueue, selectedItemId, pendingQueue]);

  // Form edit state for the selected item
  const [editStatus, setEditStatus] = useState('Idf sent, awaiting data');
  const [editDrafter, setEditDrafter] = useState('Anusha');
  const [editIsTransferred, setEditIsTransferred] = useState(false);
  const [editTransferDate, setEditTransferDate] = useState(toIsoDate(new Date()));
  const [editAppNumber, setEditAppNumber] = useState('');
  const [editFilingDate, setEditFilingDate] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCommitmentDate, setEditCommitmentDate] = useState('');

  // Sync edit state whenever the selected queue item changes
  useEffect(() => {
    if (selectedItem?.record) {
      const r = selectedItem.record;
      setEditStatus(r.current_status || 'Idf sent, awaiting data');
      setEditDrafter(r.assigned_to || 'Anusha');
      setEditIsTransferred(Boolean(r.is_transferred_case));
      setEditTransferDate(r.transfer_date || toIsoDate(new Date()));
      setEditAppNumber(r.application_number || '');
      setEditFilingDate(r.ps_filing_date || '');
      setEditTitle(r.title || '');
      setEditCommitmentDate(r.client_commitment_date || '');
    }
  }, [selectedItem]);

  // Re-parse when typing in manual paste tab
  useEffect(() => {
    if (pasteText.trim()) {
      const res = parseCliqAssignmentMessage(pasteText, records);
      setParseResult(res);
    } else {
      setParseResult(null);
    }
  }, [pasteText, records]);

  // Grouped statuses for dropdown
  const groupedStatuses = useMemo(() => {
    const map = {};
    PROSECUTION_PHASES.forEach((phase) => {
      map[phase.id] = {
        phase,
        statuses: STATUTORY_STATUSES.filter((s) => s.phase === phase.id),
      };
    });
    const ipShiftStatuses = STATUTORY_STATUSES.filter((s) => s.phase === 'PHASE_8_IP_SHIFT');
    if (ipShiftStatuses.length > 0) {
      map['PHASE_8_IP_SHIFT'] = {
        phase: { id: 'PHASE_8_IP_SHIFT', label: '8. IP Shift & Abandoned' },
        statuses: ipShiftStatuses,
      };
    }
    return map;
  }, []);

  const handleStatusChange = (newStatusName) => {
    setEditStatus(newStatusName);
    const statusObj = STATUTORY_STATUSES.find((s) => s.name === newStatusName);
    const isPostFiling = statusObj && ![
      'PHASE_1_PS', 'PHASE_2_CS'
    ].includes(statusObj.phase) || (statusObj && ['STATUS_6', 'STATUS_7', 'STATUS_11D'].includes(statusObj.id));

    if (isPostFiling && !editIsTransferred) {
      setEditIsTransferred(true);
      if (!editTransferDate) setEditTransferDate(toIsoDate(new Date()));
    }
  };

  // 1. CREATE PATENT FROM SELECTED QUEUED ITEM
  const handleCreateSelected = () => {
    if (!selectedItem?.record) return;
    const baseRec = selectedItem.record;
    const effectiveTransferDate = editIsTransferred ? (editTransferDate || toIsoDate(new Date())) : '';
    const f26Deadline = editIsTransferred
      ? addMonths(effectiveTransferDate, 3)
      : (editFilingDate ? addMonths(editFilingDate, 3) : '');
    const f13Deadline = editIsTransferred ? addMonths(effectiveTransferDate, 3) : '';

    const transferDisplayDate = effectiveTransferDate
      ? new Date(effectiveTransferDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Immediate';
    const f26DisplayDate = f26Deadline
      ? new Date(f26Deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Within 3 Months';

    let statusNotes = '';
    const selectedTags = ['Cliq Assigned', baseRec.is_mahe ? 'MAHE' : 'External Client'];

    if (editIsTransferred) {
      selectedTags.push('Former Attorney Transfer');
      selectedTags.push('Form 13 Req');
      statusNotes = `⚡ FORMER ATTORNEY TRANSFER (TAKEOVER CASE):
• Transferred to Lextria Research on ${transferDisplayDate}.
• MANDATORY STATUTORY ACTIONS:
  1. Form-26 (Fresh Power of Attorney): File within 3 months of transfer (Due: ${f26DisplayDate}) per Rule 135.
  2. Form-13 (Change in Address for Service): File under Section 57 / Rule 81 to update IPO registry to Lextria Research.
• Current Prosecution Status: ${editStatus}.
• Assigned to ${editDrafter} via Zoho Cliq.`;
    } else {
      statusNotes = `Pre-filing matter assigned via Zoho Cliq to ${editDrafter} on ${new Date().toLocaleDateString('en-IN')}.
Status: ${editStatus}. Form-13 is NOT required (Lextria will file directly at IPO). Statutory deadlines activate upon filing.`;
    }

    const finalizedRecord = {
      ...baseRec,
      title: editTitle || baseRec.title,
      assigned_to: editDrafter,
      application_number: editAppNumber || '',
      current_status: editStatus,
      color_code_status: getStatusColor(editStatus).key,
      is_transferred_case: editIsTransferred,
      former_attorney_transfer: editIsTransferred,
      transfer_date: effectiveTransferDate,
      form_13_required: editIsTransferred,
      form_13_status: editIsTransferred ? 'Pending' : 'Not Applicable',
      form_13_deadline: f13Deadline,
      form_26_deadline: f26Deadline,
      ps_filing_date: editFilingDate || '',
      cs_filing_date: (baseRec.specification_type === 'CS' && editFilingDate) ? editFilingDate : '',
      client_commitment_date: editCommitmentDate || '',
      f1_status: editIsTransferred ? 'Check Former Attorney' : (editFilingDate ? 'Pending' : 'Pending Filing at IPO'),
      f26_status: editIsTransferred ? 'Pending Transfer POA' : (editFilingDate ? 'Pending' : 'Pending Filing at IPO'),
      status_notes: statusNotes,
      selectedTags: Array.from(new Set(selectedTags)),
    };

    // Add to dashboard master records
    onCreate(finalizedRecord);

    // Mark item RESOLVED in the queue
    const updated = cliqQueue.map((item) =>
      item.id === selectedItem.id
        ? { ...item, status: 'RESOLVED', resolved_at: new Date().toISOString() }
        : item
    );
    if (onUpdateQueue) onUpdateQueue(updated);

    // Call backend API if running
    fetch(`/api/cliq-queue/${selectedItem.id}/resolve`, { method: 'POST' }).catch(() => {});

    const remaining = updated.filter((i) => i.status === 'PENDING_REVIEW');
    if (showToast) {
      showToast(
        `✓ Created ${finalizedRecord.project_code} assigned to ${finalizedRecord.assigned_to}! (${remaining.length} remaining in queue)`
      );
    }

    // Auto-select next pending item
    if (remaining.length > 0) {
      setSelectedItemId(remaining[0].id);
    }
  };

  // 2. DISMISS / DELETE ITEM FROM QUEUE
  const handleDismissSelected = () => {
    if (!selectedItem) return;
    const updated = cliqQueue.filter((item) => item.id !== selectedItem.id);
    if (onUpdateQueue) onUpdateQueue(updated);

    fetch(`/api/cliq-queue/${selectedItem.id}`, { method: 'DELETE' }).catch(() => {});

    if (showToast) {
      showToast(`Dismissed ${selectedItem.record?.project_code || 'assignment'} from queue.`);
    }

    const remaining = updated.filter((i) => i.status === 'PENDING_REVIEW');
    if (remaining.length > 0) {
      setSelectedItemId(remaining[0].id);
    } else {
      setSelectedItemId(null);
    }
  };

  // 3. ADD NEW MANUAL MESSAGE TO QUEUE
  const handleAddManualToQueue = () => {
    if (!parseResult?.success || !parseResult.record) return;
    const newItem = {
      id: `cliq_manual_${Date.now()}`,
      raw_message: pasteText,
      created_at: new Date().toISOString(),
      status: 'PENDING_REVIEW',
      record: parseResult.record,
    };

    const updated = [newItem, ...cliqQueue];
    if (onUpdateQueue) onUpdateQueue(updated);

    fetch('/api/cliq-queue/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: newItem }),
    }).catch(() => {});

    if (showToast) {
      showToast(`✓ Added ${newItem.record.project_code} to assignment queue!`);
    }

    setSelectedItemId(newItem.id);
    setActiveTab('QUEUE');
  };

  const samplePresets = [
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
      text: 'Code: AR49\nDrafter: Abhishek\nTitle: Autonomous Drone Nav\nClient: MAHE\nStatus: PS Underdrafting',
    },
  ];

  const statusColorObj = getStatusColor(editStatus);
  const calculatedF26Deadline = editIsTransferred && editTransferDate ? addMonths(editTransferDate, 3) : '';

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
          maxWidth: '860px',
          height: '88vh',
          maxHeight: '740px',
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
            padding: '14px 20px',
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
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Zap size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Zoho Cliq Assignment Queue
                </h2>
                {pendingQueue.length > 0 && (
                  <span
                    style={{
                      background: '#EF4444',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      boxShadow: '0 1px 3px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    {pendingQueue.length} Pending Review
                  </span>
                )}
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--muted)', margin: 0 }}>
                Review incoming Cliq channel assignments and create docket applications one by one
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="View & configure Inbound Webhook URL in Settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  color: 'var(--muted)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Settings size={13} /> Webhook Settings
              </button>
            )}
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
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('QUEUE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: activeTab === 'QUEUE' ? '1.5px solid #0284C7' : '1px solid var(--line)',
                background: activeTab === 'QUEUE' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                color: activeTab === 'QUEUE' ? '#0284C7' : 'var(--muted)',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <Inbox size={14} /> Review Queue ({pendingQueue.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MANUAL_ADD')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: activeTab === 'MANUAL_ADD' ? '1.5px solid #0284C7' : '1px solid var(--line)',
                background: activeTab === 'MANUAL_ADD' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                color: activeTab === 'MANUAL_ADD' ? '#0284C7' : 'var(--muted)',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Paste Message / Test
            </button>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Patent Admin Verification Step Before Master Docketing
          </span>
        </div>

        {/* Modal Body: Split Pane */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeTab === 'QUEUE' ? (
            <>
              {/* Left Column: Queue List (260px) */}
              <div
                style={{
                  width: '280px',
                  borderRight: '1px solid var(--line)',
                  background: 'var(--page)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                }}
              >
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Pending Assignments ({pendingQueue.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('MANUAL_ADD')}
                    title="Add new message"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#0284C7',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  {pendingQueue.length === 0 ? (
                    <div style={{ padding: '30px 14px', textAlign: 'center', color: 'var(--muted)' }}>
                      <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>Queue is Clear!</div>
                      <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.4 }}>
                        All incoming Cliq assignments have been reviewed & docketed.
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('MANUAL_ADD')}
                        style={{
                          marginTop: '14px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--surface)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: '#0284C7',
                        }}
                      >
                        + Paste New Message
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {pendingQueue.map((item) => {
                        const isSelected = item.id === selectedItem?.id;
                        const r = item.record || {};
                        const stColor = getStatusColor(r.current_status);
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: isSelected ? 'var(--surface)' : 'transparent',
                              border: isSelected ? '1.5px solid #0284C7' : '1px solid transparent',
                              boxShadow: isSelected ? '0 2px 4px rgba(2, 132, 199, 0.15)' : 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                                {r.project_code || 'Matter'}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: '#EFF6FF',
                                  color: '#2563EB',
                                }}
                              >
                                {r.assigned_to || 'Unassigned'}
                              </span>
                            </div>

                            <div
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: 'var(--ink)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.title || 'Untitled Application'}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: stColor.bg,
                                  color: stColor.text,
                                  maxWidth: '150px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {r.current_status || 'Assigned'}
                              </span>

                              {r.is_transferred_case && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    background: '#FEF3C7',
                                    color: '#B45309',
                                  }}
                                >
                                  ⚡ Transfer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Queue Summary Footer */}
                <div style={{ padding: '8px 12px', borderTop: '1px solid var(--line)', background: 'var(--surface)', fontSize: '10.5px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Reviewed: {resolvedQueue.length}</span>
                  <span>Pending: {pendingQueue.length}</span>
                </div>
              </div>

              {/* Right Column: Review & Docketing Panel */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--surface)' }}>
                {selectedItem ? (
                  <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Item Review Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--ink)' }}>
                            {selectedItem.record?.project_code}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: statusColorObj.bg,
                              color: statusColorObj.text,
                              border: `1px solid ${statusColorObj.border}`,
                            }}
                          >
                            {editStatus}
                          </span>
                          {editIsTransferred && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: '#FEF3C7',
                                color: '#92400E',
                              }}
                            >
                              ⚡ Former Attorney Transfer
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                          Client: <strong>{selectedItem.record?.applicant_name}</strong> · Received: {new Date(selectedItem.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleDismissSelected}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--page)',
                          color: '#DC2626',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={12} /> Dismiss
                      </button>
                    </div>

                    {/* Raw Cliq Message Display Bubble */}
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: 'var(--page)',
                        border: '1px dashed var(--line)',
                        fontSize: '12px',
                        color: 'var(--ink)',
                        fontFamily: 'monospace',
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', marginBottom: '2px' }}>
                        💬 Incoming Cliq Channel Message:
                      </div>
                      {selectedItem.raw_message}
                    </div>

                    {/* Form Controls: Title, Drafter, Status */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                          Invention Title:
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--line)',
                            background: 'var(--page)',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--ink)',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                          Assigned Drafter:
                        </label>
                        <select
                          value={editDrafter}
                          onChange={(e) => setEditDrafter(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--line)',
                            background: 'var(--page)',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: '#2563EB',
                          }}
                        >
                          {REGISTERED_DRAFTERS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                          Prosecution Stage / Status:
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--line)',
                            background: 'var(--page)',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: 'var(--ink)',
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
                      </div>
                    </div>

                    {/* Former Attorney Transfer Checkbox & Alert */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: editIsTransferred ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                        border: editIsTransferred ? '1.5px solid #F59E0B' : '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editIsTransferred}
                            onChange={(e) => setEditIsTransferred(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: '#D97706', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12.5px', fontWeight: 800, color: editIsTransferred ? '#92400E' : 'var(--ink)' }}>
                            Transferred from Former Attorney (Already Filed at IPO)
                          </span>
                        </label>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: editIsTransferred ? '#FEF3C7' : '#D1FAE5',
                            color: editIsTransferred ? '#B45309' : '#065F46',
                          }}
                        >
                          {editIsTransferred ? 'TAKEOVER CASE' : 'NEW PRE-FILING'}
                        </span>
                      </div>

                      {editIsTransferred ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '11.5px', color: '#78350F', lineHeight: 1.4 }}>
                            ⚡ <strong>Former Attorney Transfer Rule:</strong> Because this patent was already filed by another attorney, two statutory filings are required:
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#4F46E5' }}>1. Form 26 (Power of Attorney)</div>
                              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Rule 135: Due within 3m of transfer</div>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#4F46E5', marginTop: '2px' }}>
                                Due: {calculatedF26Deadline || 'Within 3m'}
                              </div>
                            </div>

                            <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#D97706' }}>2. Form 13 (Address for Service)</div>
                              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Sec 57 & Rule 81: Amend to Lextria Research</div>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#D97706', marginTop: '2px' }}>
                                Status: Pending Filing
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '2px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--muted)', marginBottom: '2px' }}>
                                Transfer Date:
                              </label>
                              <input
                                type="date"
                                value={editTransferDate}
                                onChange={(e) => setEditTransferDate(e.target.value)}
                                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '11.5px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--muted)', marginBottom: '2px' }}>
                                Application No.:
                              </label>
                              <input
                                type="text"
                                value={editAppNumber}
                                onChange={(e) => setEditAppNumber(e.target.value)}
                                placeholder="e.g. 202341054321"
                                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '11.5px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--muted)', marginBottom: '2px' }}>
                                Filing Date:
                              </label>
                              <input
                                type="date"
                                value={editFilingDate}
                                onChange={(e) => setEditFilingDate(e.target.value)}
                                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '11.5px' }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#065F46', lineHeight: 1.4 }}>
                          ✓ <strong>Pre-Filing Matter:</strong> Form-13 is not needed because Lextria will file the initial application at IPO directly. Statutory deadlines will activate upon filing.
                        </div>
                      )}
                    </div>

                    {/* Delivery Target */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '6px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                      <div>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink)' }}>Client Delivery Target Date:</span>
                        <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Committed deliverable date to client</div>
                      </div>
                      <input
                        type="date"
                        value={editCommitmentDate}
                        onChange={(e) => setEditCommitmentDate(e.target.value)}
                        style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '11.5px' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                    <Inbox size={40} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>No Queue Item Selected</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Select an assignment from the left list to review and docket.</div>
                  </div>
                )}

                {/* Footer Action Bar */}
                {selectedItem && (
                  <div
                    style={{
                      padding: '12px 20px',
                      borderTop: '1px solid var(--line)',
                      background: 'var(--page)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Item {pendingQueue.findIndex((i) => i.id === selectedItem.id) + 1} of {pendingQueue.length} pending review
                    </span>

                    <button
                      type="button"
                      onClick={handleCreateSelected}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                        color: '#fff',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)',
                      }}
                    >
                      <Sparkles size={14} /> Create Application ({selectedItem.record?.project_code})
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* MANUAL ADD / PASTE TAB */
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 4px', color: 'var(--ink)' }}>
                  Paste Assignment Message from Zoho Cliq:
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 10px' }}>
                  Paste messages from any Cliq channel or choose a preset below to queue it for docketing.
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {samplePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPasteText(preset.text)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                        background: pasteText === preset.text ? '#E0F2FE' : 'var(--page)',
                        color: pasteText === preset.text ? '#0369A1' : 'var(--muted)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="e.g. Assign AR45 to Anusha - Title: Smart Automated Crop Harvesting System - Client: MAHE"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    color: 'var(--ink)',
                  }}
                />
              </div>

              {parseResult?.success && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(2, 132, 199, 0.05)',
                    border: '1.5px solid #0284C7',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0369A1' }}>
                      Parsed Preview: {parseResult.record.project_code} → {parseResult.record.assigned_to}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: getStatusColor(parseResult.record.current_status).bg,
                        color: getStatusColor(parseResult.record.current_status).text,
                      }}
                    >
                      {parseResult.record.current_status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink)' }}>
                    Title: <strong>{parseResult.record.title}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                    Client: {parseResult.record.applicant_name} · Type: {parseResult.record.specification_type} · Takeover: {parseResult.record.is_transferred_case ? 'YES (Form 13 & 26 flagged)' : 'NO'}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('QUEUE')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Back to Queue
                </button>
                <button
                  type="button"
                  onClick={handleAddManualToQueue}
                  disabled={!parseResult?.success}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: parseResult?.success ? 'linear-gradient(135deg, #0284C7, #0369A1)' : 'var(--line)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: parseResult?.success ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={14} /> Add to Queue for Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
