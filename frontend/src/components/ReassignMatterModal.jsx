// frontend/src/components/ReassignMatterModal.jsx
import React, { useState, useMemo } from 'react';
import {
  X, UserCheck, ArrowRight, Shield, AlertTriangle, CheckCircle2,
  Briefcase, Search, Filter
} from 'lucide-react';

const DRAFTERS = [
  'Anusha', 'Ayush', 'Abhishek', 'Fiona',
  'Pramith', 'Pratham', 'Thanush', 'Thilak', 'Pranav Bhat'
];

const REASSIGNMENT_REASONS = [
  'Workload Rebalancing & Capacity Optimization',
  'Urgent Client Delivery Escalation (SPOC Directive)',
  'Associate Leave / Medical Absence Coverage',
  'Technical Domain Expertise Alignment',
  'Senior Quality Review / Sign-off Reassignment',
  'Client-Requested Associate Change',
  'Administrative Reallocation'
];

export default function ReassignMatterModal({
  isOpen,
  onClose,
  initialDrafter = null,
  initialRecord = null,
  allRecords = [],
  onReassignBatch,
}) {
  const [sourceDrafter, setSourceDrafter] = useState(initialDrafter || '');
  const [targetDrafter, setTargetDrafter] = useState('');
  const [selectedCodes, setSelectedCodes] = useState(() => {
    return initialRecord?.project_code ? [initialRecord.project_code] : [];
  });
  const [reason, setReason] = useState(REASSIGNMENT_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Drafter workload stats (active cases count per drafter)
  const drafterLoads = useMemo(() => {
    const counts = {};
    DRAFTERS.forEach((d) => { counts[d] = 0; });
    allRecords.forEach((r) => {
      if (!r.is_abandoned && r.assigned_to) {
        const match = DRAFTERS.find((d) => d.toLowerCase() === r.assigned_to.trim().toLowerCase());
        if (match) {
          counts[match] = (counts[match] || 0) + 1;
        }
      }
    });
    return counts;
  }, [allRecords]);

  // Matters assigned to current source drafter
  const candidateMatters = useMemo(() => {
    if (!sourceDrafter) {
      if (initialRecord) return [initialRecord];
      return allRecords.filter((r) => !r.is_abandoned);
    }
    return allRecords.filter(
      (r) =>
        !r.is_abandoned &&
        r.assigned_to &&
        r.assigned_to.trim().toLowerCase() === sourceDrafter.trim().toLowerCase()
    );
  }, [sourceDrafter, allRecords, initialRecord]);

  // Filtered by search query
  const displayMatters = useMemo(() => {
    if (!searchFilter) return candidateMatters;
    const q = searchFilter.toLowerCase();
    return candidateMatters.filter(
      (r) =>
        (r.project_code || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.current_status || '').toLowerCase().includes(q)
    );
  }, [candidateMatters, searchFilter]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedCodes.length === displayMatters.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(displayMatters.map((r) => r.project_code));
    }
  };

  const handleToggleCode = (code) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetDrafter || selectedCodes.length === 0) return;

    if (onReassignBatch) {
      onReassignBatch(selectedCodes, targetDrafter, reason, notes);
    }
    onClose();
  };

  return (
    <div
      className="modal-backdrop-animate"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
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
        className="modal-dialog-animate"
        style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
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
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Reassign Patent Matters
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#2563EB',
                    color: '#fff',
                  }}
                >
                  Super Admin Authority
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Rebalance workload, reassign active files, and log audit trail with zero downtime.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Drafter Flow Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
            {/* Source Drafter */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                From Drafter (Source)
              </label>
              <select
                value={sourceDrafter}
                onChange={(e) => {
                  setSourceDrafter(e.target.value);
                  setSelectedCodes([]);
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                <option value="">-- All Active Matters --</option>
                {DRAFTERS.map((d) => (
                  <option key={d} value={d}>
                    {d} ({drafterLoads[d] || 0} active matters)
                  </option>
                ))}
              </select>
            </div>

            {/* Arrow icon */}
            <div style={{ marginTop: '22px', color: 'var(--muted)' }}>
              <ArrowRight size={20} />
            </div>

            {/* Target Drafter */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                To Drafter (Target) *
              </label>
              <select
                value={targetDrafter}
                onChange={(e) => setTargetDrafter(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #2563EB',
                  background: 'var(--page)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 800,
                }}
              >
                <option value="">-- Select Target Drafter --</option>
                {DRAFTERS.filter((d) => d !== sourceDrafter).map((d) => (
                  <option key={d} value={d}>
                    {d} (Current: {drafterLoads[d] || 0} active cases)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason & Handover Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                Reason for Reassignment
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  color: 'var(--ink)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                {REASSIGNMENT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                Handover Notes / Instructions (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Prior art search done; expedite complete specification draft."
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
          </div>

          {/* Matters Table with Select All */}
          <div style={{ border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--page)',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={displayMatters.length > 0 && selectedCodes.length === displayMatters.length}
                  onChange={handleToggleSelectAll}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ink)' }}>
                  Select Matters to Reassign ({selectedCodes.length} of {displayMatters.length} selected)
                </span>
              </div>

              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search matter code or title..."
                style={{
                  padding: '5px 10px',
                  borderRadius: '5px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: '12px',
                  width: '220px',
                }}
              />
            </div>

            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {displayMatters.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '12.5px' }}>
                  No active matters found for this selection.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <tbody>
                    {displayMatters.map((r) => {
                      const isSelected = selectedCodes.includes(r.project_code);
                      return (
                        <tr
                          key={r.project_code}
                          onClick={() => handleToggleCode(r.project_code)}
                          style={{
                            borderBottom: '1px solid var(--line)',
                            background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '8px 14px', width: '36px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row click
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '8px 8px', fontWeight: 800, color: '#2563EB', width: '100px' }}>
                            {r.project_code}
                          </td>
                          <td style={{ padding: '8px 8px', color: 'var(--ink)', fontWeight: 600 }}>
                            {r.title || 'Untitled patent application'}
                          </td>
                          <td style={{ padding: '8px 8px', width: '120px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: 'var(--page)',
                                border: '1px solid var(--line)',
                                color: 'var(--muted)',
                              }}
                            >
                              {r.assigned_to || 'Unassigned'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px', width: '140px', textAlign: 'right' }}>
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: '#7C3AED',
                              }}
                            >
                              {r.specification_type || 'PS'} · {r.color_code_status || 'PURPLE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {selectedCodes.length > 0 && targetDrafter ? (
                <span>
                  Ready to transfer <strong>{selectedCodes.length} matter(s)</strong> to <strong>{targetDrafter}</strong>
                </span>
              ) : (
                <span>Select at least 1 matter and a target drafter.</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                disabled={!targetDrafter || selectedCodes.length === 0}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: (!targetDrafter || selectedCodes.length === 0)
                    ? 'var(--muted)'
                    : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  color: '#fff',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: (!targetDrafter || selectedCodes.length === 0) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)',
                }}
              >
                <UserCheck size={14} /> Confirm Reassignment ({selectedCodes.length})
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

