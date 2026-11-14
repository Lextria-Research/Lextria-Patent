import React, { useState, useMemo } from 'react';
import {
  Bell, X, Check, Trash2, Zap, Sparkles, Calendar, User, Shield,
  AlertTriangle, CheckCircle2, Clock, Inbox, Send, RefreshCw, FileText
} from 'lucide-react';
import { filterNotificationsForUser, parseIncomingCliqWorkflow } from '../utils/cliqAssignmentParser.js';
import { getRoleLabel } from '../lib/authStore.js';

export default function NotificationPanel({
  isOpen,
  onClose,
  currentUser,
  notifications = [],
  onAcceptNotification,
  onDismissNotification,
  onIngestMessage,
  records = [],
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'ALL' | 'SIMULATOR'
  const [simulatorText, setSimulatorText] = useState(
    'Assign AR55 to Thanush - Novel IoT Smart Metering Device for MAHE. Client delivery target: 2026-12-05.'
  );
  const [simulationResult, setSimulationResult] = useState(null);

  // Filter notifications by logged-in user role & name
  const userNotifications = useMemo(() => {
    return filterNotificationsForUser(notifications, currentUser);
  }, [notifications, currentUser]);

  const pendingList = useMemo(() => {
    return userNotifications.filter((n) => n.status === 'PENDING_ACCEPTANCE');
  }, [userNotifications]);

  const displayedList = activeTab === 'PENDING' ? pendingList : userNotifications;

  const handleSimulate = () => {
    if (!simulatorText.trim()) return;
    const res = parseIncomingCliqWorkflow(simulatorText, records);
    setSimulationResult(res);
    if (res.success && res.notifications && res.notifications.length > 0) {
      if (onIngestMessage) {
        onIngestMessage(res.notifications, res.summary);
      }
    }
  };

  const getWorkflowBadge = (type) => {
    switch (type) {
      case 'NEW_ASSIGNMENT':
        return { label: 'New Assignment', bg: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED', border: 'rgba(124, 58, 237, 0.3)' };
      case 'PROSECUTION_TASK':
        return { label: 'IPO Office Action', bg: 'rgba(217, 119, 6, 0.12)', color: '#D97706', border: 'rgba(217, 119, 6, 0.3)' };
      case 'HEARING_FORM30':
        return { label: 'Hearing Form-30 (Paralegal)', bg: 'rgba(220, 38, 38, 0.12)', color: '#DC2626', border: 'rgba(220, 38, 38, 0.3)' };
      case 'HEARING_WS':
        return { label: 'Hearing WS (Drafter)', bg: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', border: 'rgba(99, 102, 241, 0.3)' };
      case 'CONFIRMATION':
        return { label: 'Confirmation', bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
      default:
        return { label: 'Notification', bg: 'var(--page)', color: 'var(--muted)', border: 'var(--line)' };
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
        zIndex: 2200,
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
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(124, 58, 237, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7C3AED',
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                Cliq & IPO Notification Hub
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                User: <strong style={{ color: 'var(--ink)' }}>{currentUser?.name || 'User'}</strong> • Role: <span style={{ color: '#7C3AED', fontWeight: 700 }}>{getRoleLabel(currentUser?.role)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 20px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <button
            onClick={() => setActiveTab('PENDING')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: activeTab === 'PENDING' ? '1.5px solid #7C3AED' : '1px solid var(--line)',
              background: activeTab === 'PENDING' ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
              color: activeTab === 'PENDING' ? '#7C3AED' : 'var(--ink)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Pending Actions</span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
                background: pendingList.length > 0 ? '#EF4444' : 'var(--line)',
                color: pendingList.length > 0 ? '#ffffff' : 'var(--muted)',
                fontWeight: 800,
              }}
            >
              {pendingList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: activeTab === 'ALL' ? '1.5px solid #7C3AED' : '1px solid var(--line)',
              background: activeTab === 'ALL' ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
              color: activeTab === 'ALL' ? '#7C3AED' : 'var(--ink)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            All Activity ({userNotifications.length})
          </button>

          <button
            onClick={() => setActiveTab('SIMULATOR')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: activeTab === 'SIMULATOR' ? '1.5px solid #0284C7' : '1px solid var(--line)',
              background: activeTab === 'SIMULATOR' ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
              color: activeTab === 'SIMULATOR' ? '#0284C7' : 'var(--ink)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
            }}
          >
            <Zap size={13} color="#0284C7" />
            <span>Cliq / IPO Simulator</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'SIMULATOR' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'rgba(2, 132, 199, 0.06)',
                  border: '1px solid rgba(2, 132, 199, 0.2)',
                  fontSize: '12px',
                  color: 'var(--ink)',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 800, color: '#0284C7', marginBottom: '4px' }}>
                  ⚡ Zoho Cliq / IPO Email Ingestion Simulator
                </div>
                Paste an incoming Zoho Cliq mention, or copied Indian Patent Office (IPO) notification email. The parser will detect Workflows A, B, or C and route pending actions to the appropriate role.
              </div>

              {/* Preset Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  onClick={() =>
                    setSimulatorText(
                      'Assign AR55 to Thanush - Novel IoT Smart Metering Device for MAHE. Client delivery target: 2026-12-05.'
                    )
                  }
                  style={{
                    padding: '4px 9px',
                    borderRadius: '4px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--ink)',
                  }}
                >
                  Preset: Workflow A (New Assignment → Thanush)
                </button>
                <button
                  onClick={() =>
                    setSimulatorText(
                      'First Examination Report (FER) issued for Application No. 202341012345 (LEX-SEED-001). Notice received on 14 Nov 2026.'
                    )
                  }
                  style={{
                    padding: '4px 9px',
                    borderRadius: '4px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--ink)',
                  }}
                >
                  Preset: Workflow B (IPO FER → Assigned Drafter)
                </button>
                <button
                  onClick={() =>
                    setSimulatorText(
                      'Notice of Hearing issued under Section 14/15 for Patent Application No. 202341012345 (LEX-SEED-001). Hearing Date: 2026-12-20 at 11:30 AM via VC.'
                    )
                  }
                  style={{
                    padding: '4px 9px',
                    borderRadius: '4px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--ink)',
                  }}
                >
                  Preset: Workflow C (Hearing Dual-Trigger: Form-30 & WS)
                </button>
                <button
                  onClick={() =>
                    setSimulatorText(
                      'Pre-Grant Opposition notice filed under Section 25(1) for Application No. 202341012345 (LEX-SEED-001).'
                    )
                  }
                  style={{
                    padding: '4px 9px',
                    borderRadius: '4px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--ink)',
                  }}
                >
                  Preset: Workflow B (Pre-Grant Opposition)
                </button>
              </div>

              {/* Textarea */}
              <textarea
                rows={5}
                value={simulatorText}
                onChange={(e) => setSimulatorText(e.target.value)}
                placeholder="Paste Cliq message or IPO email notification..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  color: 'var(--ink)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  lineHeight: 1.4,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />

              <button
                onClick={handleSimulate}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} />
                <span>Process Message & Dispatch Notifications</span>
              </button>

              {simulationResult && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: simulationResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${simulationResult.success ? '#10B981' : '#EF4444'}`,
                    fontSize: '12px',
                  }}
                >
                  {simulationResult.success ? (
                    <div>
                      <div style={{ fontWeight: 800, color: '#10B981', marginBottom: '4px' }}>
                        ✓ {simulationResult.summary}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Created {simulationResult.notifications?.length} notification(s). Switch to "Pending Actions" to view and accept.
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#EF4444', fontWeight: 600 }}>
                      ⚠️ {simulationResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : displayedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                {activeTab === 'PENDING' ? 'All Clear — No Pending Tasks' : 'No Notifications'}
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {activeTab === 'PENDING'
                  ? `There are currently no action items awaiting approval for ${currentUser?.name || 'your account'}.`
                  : 'No notification records exist for this role yet.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayedList.map((notif) => {
                const badge = getWorkflowBadge(notif.type);
                const isPending = notif.status === 'PENDING_ACCEPTANCE';

                return (
                  <div
                    key={notif.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'var(--page)',
                      border: isPending ? `1.5px solid ${badge.color}` : '1px solid var(--line)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>

                        {notif.payload?.projectCode && (
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '11px',
                              color: '#2563EB',
                            }}
                          >
                            {notif.payload.projectCode}
                          </span>
                        )}

                        {notif.targetDrafterName && (
                          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                            Assigned to: <strong style={{ color: 'var(--ink)' }}>{notif.targetDrafterName}</strong>
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '10.5px', color: 'var(--muted)', flexShrink: 0 }}>
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                      {notif.title}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--ink)', lineHeight: 1.45, opacity: 0.9 }}>
                      {notif.message}
                    </div>

                    {/* Metadata tags */}
                    {(notif.payload?.deadline || notif.payload?.hearingDate || notif.payload?.applicationNumber) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {notif.payload.applicationNumber && (
                          <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                            App No: <strong>{notif.payload.applicationNumber}</strong>
                          </span>
                        )}
                        {notif.payload.hearingDate && (
                          <span style={{ fontSize: '11px', color: '#6366F1', background: 'rgba(99, 102, 241, 0.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            Hearing Date: <strong>{notif.payload.hearingDate}</strong>
                          </span>
                        )}
                        {notif.payload.deadline && (
                          <span style={{ fontSize: '11px', color: '#DC2626', background: 'rgba(220, 38, 38, 0.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(220, 38, 38, 0.2)', fontWeight: 700 }}>
                            Statutory Deadline: {notif.payload.deadline}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                      {isPending ? (
                        <>
                          <button
                            onClick={() => onDismissNotification && onDismissNotification(notif.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--line)',
                              background: 'transparent',
                              color: 'var(--muted)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => onAcceptNotification && onAcceptNotification(notif)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#10B981',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            <Check size={13} />
                            <span>Accept</span>
                          </button>
                        </>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: notif.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface)',
                            color: notif.status === 'ACCEPTED' ? '#10B981' : 'var(--muted)',
                            border: `1px solid ${notif.status === 'ACCEPTED' ? '#10B981' : 'var(--line)'}`,
                          }}
                        >
                          {notif.status === 'ACCEPTED' ? '✓ Accepted & Logged' : notif.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
