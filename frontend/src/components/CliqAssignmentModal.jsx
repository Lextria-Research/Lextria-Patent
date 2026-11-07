// frontend/src/components/CliqAssignmentModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X, Zap, CheckCircle2, AlertTriangle, Copy, Check, MessageSquare,
  Sparkles, ExternalLink, Shield, Calendar, User, Building, FileText
} from 'lucide-react';
import { parseCliqAssignmentMessage } from '../utils/cliqAssignmentParser.js';

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

  // Automatically re-parse on input change
  useEffect(() => {
    if (messageText.trim()) {
      const res = parseCliqAssignmentMessage(messageText, records);
      setParseResult(res);
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

  const handleCreate = () => {
    if (!parseResult?.success || !parseResult.record) return;
    setIsCreating(true);
    try {
      onCreate(parseResult.record);
      if (showToast) {
        showToast(`✓ Patent Matter ${parseResult.record.project_code} successfully created and assigned to ${parseResult.record.assigned_to}!`);
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
      label: 'Natural Sentence',
      text: 'Assign AR45 to Anusha - Title: Smart Automated Crop Harvesting System - Client: MAHE',
    },
    {
      label: 'Structured Key-Value',
      text: `Code: AR48\nDrafter: Pramith\nTitle: AI Based Image Recognition for Medical Diagnostics\nClient: MAHE\nType: PS`,
    },
    {
      label: 'Slash Command',
      text: '/assign AR50 Fiona "Autonomous Underwater Vehicle Navigation" MAHE',
    },
  ];

  const rec = parseResult?.record;

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
          maxWidth: '720px',
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
                Zoho Cliq Patent Assignment Intake
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                Parse assignment messages posted in Zoho Cliq and instantly generate patent docket entries
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
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {/* Inbound Webhook URL Info Box */}
          <div
            style={{
              marginBottom: '20px',
              padding: '14px',
              borderRadius: '8px',
              background: 'var(--page)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color="#0284C7" />
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
                  padding: '4px 10px',
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
                {copiedWebhook ? <Check size={13} /> : <Copy size={13} />}
                {copiedWebhook ? 'Copied URL!' : 'Copy Webhook URL'}
              </button>
            </div>
            <code
              style={{
                display: 'block',
                padding: '8px 10px',
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
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '8px 0 0', lineHeight: 1.4 }}>
              Tip: Configure this URL in your Zoho Cliq channel bot/outgoing webhook so any message in <code>#patent-assignments</code> creates docket entries 100% automatically!
            </p>
          </div>

          {/* Quick Preset Selector */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--ink)' }}>
              Paste Assignment Message from Cliq:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {sampleMessages.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessageText(sample.text)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: messageText === sample.text ? '#E0F2FE' : 'var(--page)',
                    color: messageText === sample.text ? '#0369A1' : 'var(--muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Preset: {sample.label}
                </button>
              ))}
            </div>
            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="e.g. Assign AR45 to Anusha - Title: Smart Automated Crop Harvesting System - Client: MAHE"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: 'var(--page)',
                fontSize: '13px',
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
                marginTop: '16px',
                padding: '16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05), rgba(14, 165, 233, 0.02))',
                border: '1.5px solid #0284C7',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#0284C7" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0369A1' }}>
                    Live Assignment Parsed Successfully
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: '#8B5CF6',
                    color: '#fff',
                  }}
                >
                  Status: {rec.current_status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Matter Code</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>{rec.project_code}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Assigned Drafter</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#2563EB' }}>{rec.assigned_to}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Invention Title</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{rec.title}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Client / Applicant</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                      {rec.applicant_name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: rec.is_mahe ? '#DBEAFE' : '#E0E7FF',
                        color: rec.is_mahe ? '#1E40AF' : '#3730A3',
                      }}
                    >
                      {rec.is_mahe ? 'MAHE' : 'External'}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Specification Type</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    {rec.specification_type === 'PS' ? 'Provisional (PS)' : 'Complete (CS)'}
                  </span>
                </div>
              </div>

              {/* Pre-Filing Status & Client Delivery Info */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--muted)' }}>Docket Stage:</span>
                  <span style={{ fontWeight: 800, color: '#8B5CF6' }}>
                    Pre-Filing (Drafting / Awaiting Inventor Data)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--muted)' }}>Client Delivery Target:</span>
                  <strong style={{ color: rec.client_commitment_date ? '#059669' : 'var(--muted)' }}>
                    {rec.client_commitment_date ? rec.client_commitment_date : 'Pending Drafter Scheduling'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--line)', paddingTop: '6px', marginTop: '2px' }}>
                  <span style={{ color: 'var(--muted)' }}>Statutory Deadlines (CS / Form 1 / Form 26):</span>
                  <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                    Calculated automatically once filed at IPO (e.g. 12m for CS under Sec 9)
                  </span>
                </div>
              </div>
            </div>
          )}

          {parseResult && !parseResult.success && (
            <div
              style={{
                marginTop: '16px',
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
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Statutory deadlines (Sec 9 CS Due, Form 1, Form 26) will activate automatically upon filing at IPO.
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

