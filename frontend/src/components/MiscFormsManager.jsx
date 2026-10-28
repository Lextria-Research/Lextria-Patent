// frontend/src/components/MiscFormsManager.jsx
import React, { useState } from 'react';
import {
  FileText, Plus, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Trash2, Shield, Calendar, Check, ExternalLink, ChevronRight, FileCheck
} from 'lucide-react';
import {
  MISC_FORM_STATUSES,
  FORM_13_SUBTYPES,
  FORM_30_ENTRIES,
  getMiscFormStatusInfo
} from '../constants/miscFormsConstants';

export default function MiscFormsManager({
  record,
  miscForms = [],
  onUpdateMiscForms,
  readOnly = false
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMainType, setSelectedMainType] = useState('FORM_13'); // FORM_13 or FORM_30
  const [selectedSubtype, setSelectedSubtype] = useState('FORM_13_ADD_INVENTOR');
  const [feeMode, setFeeMode] = useState('WITH_FEE'); // WITH_FEE or WITHOUT_FEE
  const [targetNumber, setTargetNumber] = useState(record.application_number || '');
  const [detailsNotes, setDetailsNotes] = useState('');
  const [initialStatus, setInitialStatus] = useState('NEED_CONFIRMATION');
  const [cbrNumber, setCbrNumber] = useState('');
  const [filingDate, setFilingDate] = useState(new Date().toISOString().split('T')[0]);

  // Editing CBR / Filing date modal state
  const [editingFormItem, setEditingFormItem] = useState(null);
  const [editCbr, setEditCbr] = useState('');
  const [editFilingDate, setEditFilingDate] = useState('');

  // Handle adding new miscellaneous form
  const handleCreate = (e) => {
    e.preventDefault();

    let subTypeObj = null;
    let subTypeLabel = '';

    if (selectedMainType === 'FORM_13') {
      subTypeObj = FORM_13_SUBTYPES.find((s) => s.id === selectedSubtype) || FORM_13_SUBTYPES[0];
      subTypeLabel = subTypeObj.label;
    } else {
      subTypeObj = FORM_30_ENTRIES.find((s) => s.id === selectedSubtype) || FORM_30_ENTRIES[0];
      subTypeLabel = subTypeObj.shortLabel;
    }

    const newItem = {
      id: `mf_${Date.now()}`,
      form_type: selectedMainType,
      sub_type: selectedSubtype,
      sub_type_label: subTypeLabel,
      ipo_entry_code: subTypeObj.code || '',
      fee_mode: feeMode,
      target_number: targetNumber || record.application_number || record.patent_number || '',
      details_notes: detailsNotes,
      status: initialStatus,
      cbr_number: initialStatus === 'FILED' || initialStatus === 'UPDATED_BY_IPO' ? cbrNumber : '',
      filing_date: initialStatus === 'FILED' || initialStatus === 'UPDATED_BY_IPO' ? filingDate : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [newItem, ...miscForms];
    onUpdateMiscForms(updated);

    // Reset form
    setDetailsNotes('');
    setCbrNumber('');
    setShowAddModal(false);
  };

  // Quick Advance Status helper
  const handleAdvanceStatus = (item, nextStatusId) => {
    const updated = miscForms.map((f) => {
      if (f.id === item.id) {
        const isNowFiled = nextStatusId === 'FILED' || nextStatusId === 'UPDATED_BY_IPO';
        return {
          ...f,
          status: nextStatusId,
          filing_date: isNowFiled && !f.filing_date ? new Date().toISOString().split('T')[0] : f.filing_date,
          updated_at: new Date().toISOString(),
        };
      }
      return f;
    });
    onUpdateMiscForms(updated);
  };

  // Remove form item
  const handleDeleteItem = (id) => {
    const updated = miscForms.filter((f) => f.id !== id);
    onUpdateMiscForms(updated);
  };

  // Save CBR edit
  const handleSaveCbr = () => {
    if (!editingFormItem) return;
    const updated = miscForms.map((f) => {
      if (f.id === editingFormItem.id) {
        return {
          ...f,
          cbr_number: editCbr,
          filing_date: editFilingDate || f.filing_date,
          status: 'FILED',
          updated_at: new Date().toISOString(),
        };
      }
      return f;
    });
    onUpdateMiscForms(updated);
    setEditingFormItem(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} color="var(--accent)" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
              Miscellaneous Forms Tracker (Form 13 & Form 30)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Dedicated lifecycle: Need Confirmation ➔ Sent for Filing (3-Day Ack) ➔ Filed ➔ Updated by Patent Office
            </div>
          </div>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setSelectedMainType('FORM_13');
              setSelectedSubtype('FORM_13_ADD_INVENTOR');
              setTargetNumber(record.application_number || '');
              setShowAddModal(true);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Plus size={13} /> Log Misc Form
          </button>
        )}
      </div>

      {/* List of Misc Forms */}
      {miscForms.length === 0 ? (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            borderRadius: '8px',
            background: 'var(--page)',
            border: '1px dashed var(--line)',
            color: 'var(--muted)',
            fontSize: '12px',
          }}
        >
          No Form 13 or Form 30 filings logged yet for this patent.
          <br />
          Click <strong>"+ Log Misc Form"</strong> to initiate an inventor addition/deletion, detail correction, or Form-30 petition.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {miscForms.map((item) => {
            const statusInfo = getMiscFormStatusInfo(item.status);
            const isNeedConf = item.status === 'NEED_CONFIRMATION';
            const isSentForFiling = item.status === 'SENT_FOR_FILING';
            const isFiled = item.status === 'FILED';
            const isUpdated = item.status === 'UPDATED_BY_IPO';

            return (
              <div
                key={item.id}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'var(--page)',
                  border: `1px solid ${statusInfo.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Title & Badge Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: item.form_type === 'FORM_13' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                        color: item.form_type === 'FORM_13' ? '#2563EB' : '#7C3AED',
                        border: `1px solid ${item.form_type === 'FORM_13' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                      }}
                    >
                      {item.form_type === 'FORM_13' ? 'Form 13' : 'Form 30'}
                    </span>

                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                      {item.sub_type_label}
                    </span>

                    {item.form_type === 'FORM_30' && (
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: item.fee_mode === 'WITH_FEE' ? '#FEF3C7' : '#E0E7FF',
                          color: item.fee_mode === 'WITH_FEE' ? '#92400E' : '#3730A3',
                        }}
                      >
                        {item.fee_mode === 'WITH_FEE' ? 'With Fee' : 'Without Fee'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: statusInfo.bg,
                        color: statusInfo.color,
                        border: `1px solid ${statusInfo.border}`,
                      }}
                    >
                      ● {statusInfo.shortLabel}
                    </span>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#DC2626',
                          cursor: 'pointer',
                          padding: '3px',
                        }}
                        title="Delete Misc Form"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* IPO Schedule 1 description if Form 30 */}
                {item.ipo_entry_code && (
                  <div style={{ fontSize: '11.5px', color: '#2563EB', fontWeight: 600 }}>
                    {item.ipo_entry_code}
                  </div>
                )}

                {/* Notes / Particulars */}
                {item.details_notes && (
                  <div style={{ fontSize: '12px', color: 'var(--ink)', background: 'var(--surface)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                    {item.details_notes}
                  </div>
                )}

                {/* 4-Step Interactive Visual Flow */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '4px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {MISC_FORM_STATUSES.map((st, sIdx) => {
                    const isCurrent = item.status === st.id;
                    const isPassed = statusInfo.step > st.step;
                    return (
                      <div
                        key={st.id}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          textAlign: 'center',
                          fontSize: '10.5px',
                          fontWeight: isCurrent ? 800 : 600,
                          background: isCurrent ? st.bg : isPassed ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                          color: isCurrent ? st.color : isPassed ? '#10B981' : 'var(--muted)',
                          border: isCurrent ? `1px solid ${st.border}` : '1px solid transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <span style={{ fontSize: '9px', opacity: 0.8 }}>Step {sIdx + 1}</span>
                        <span>{st.shortLabel}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Metadata & Quick Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)' }}>
                    {item.cbr_number && (
                      <span>
                        CBR: <strong>{item.cbr_number}</strong>
                      </span>
                    )}
                    {item.filing_date && (
                      <span>
                        Filing Date: <strong>{item.filing_date}</strong>
                      </span>
                    )}
                    {item.target_number && (
                      <span>
                        Ref No: <strong>{item.target_number}</strong>
                      </span>
                    )}
                  </div>

                  {!readOnly && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isNeedConf && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(item, 'SENT_FOR_FILING')}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #D97706',
                            background: '#FEF3C7',
                            color: '#92400E',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Mark Sent for Filing (3-Day Ack) ➔
                        </button>
                      )}

                      {isSentForFiling && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFormItem(item);
                            setEditCbr(item.cbr_number || '');
                            setEditFilingDate(item.filing_date || new Date().toISOString().split('T')[0]);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #059669',
                            background: '#D1FAE5',
                            color: '#065F46',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Log CBR & Mark Filed ➔
                        </button>
                      )}

                      {isFiled && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(item, 'UPDATED_BY_IPO')}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #2563EB',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Mark Updated by Patent Office ✓
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Miscellaneous Form Modal */}
      {showAddModal && (
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
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: 'var(--surface)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--line)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="var(--accent)" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Log Miscellaneous Statutory Form
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Form Category Selector: Form 13 vs Form 30 */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
                  Select Statutory Form Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMainType('FORM_13');
                      setSelectedSubtype('FORM_13_ADD_INVENTOR');
                      setTargetNumber(record.application_number || '');
                    }}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: selectedMainType === 'FORM_13' ? '2px solid var(--accent)' : '1px solid var(--line)',
                      background: selectedMainType === 'FORM_13' ? 'rgba(37, 99, 235, 0.1)' : 'var(--page)',
                      color: selectedMainType === 'FORM_13' ? 'var(--accent)' : 'var(--ink)',
                      fontWeight: selectedMainType === 'FORM_13' ? 800 : 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Form 13 (Amendments)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMainType('FORM_30');
                      setSelectedSubtype('ENTRY_52_ADJOURNMENT');
                      setTargetNumber(record.application_number || '');
                    }}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: selectedMainType === 'FORM_30' ? '2px solid var(--accent)' : '1px solid var(--line)',
                      background: selectedMainType === 'FORM_30' ? 'rgba(37, 99, 235, 0.1)' : 'var(--page)',
                      color: selectedMainType === 'FORM_30' ? 'var(--accent)' : 'var(--ink)',
                      fontWeight: selectedMainType === 'FORM_30' ? 800 : 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Form 30 (Omnibus Petitions)
                  </button>
                </div>
              </div>

              {/* Form 30 Specific: Radio buttons With Fee vs Without Fee (From Reference Screenshots) */}
              {selectedMainType === 'FORM_30' && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="fee_mode"
                        checked={feeMode === 'WITH_FEE'}
                        onChange={() => setFeeMode('WITH_FEE')}
                      />
                      With Fee
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="fee_mode"
                        checked={feeMode === 'WITHOUT_FEE'}
                        onChange={() => setFeeMode('WITHOUT_FEE')}
                      />
                      Without Fee
                    </label>
                  </div>
                </div>
              )}

              {/* Specific Subtype Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
                  {selectedMainType === 'FORM_13' ? 'Select Form 13 Action Flow *' : 'Select Form 30 First Schedule Entry *'}
                </label>
                <select
                  value={selectedSubtype}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSubtype(val);
                    if (val === 'ENTRY_19_23_RESTORATION') {
                      setTargetNumber(record.patent_number || '');
                    } else {
                      setTargetNumber(record.application_number || '');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {selectedMainType === 'FORM_13' ? (
                    FORM_13_SUBTYPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.rule})
                      </option>
                    ))
                  ) : (
                    FORM_30_ENTRIES.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.code}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Target Application or Patent Number */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                  {selectedSubtype === 'ENTRY_19_23_RESTORATION' ? 'Patent Number *' : 'Application Number *'}
                </label>
                <input
                  type="text"
                  value={targetNumber}
                  onChange={(e) => setTargetNumber(e.target.value)}
                  placeholder="e.g. 202441019532"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Details & Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                  Particulars / Reason / Client Instructions
                </label>
                <textarea
                  rows={2}
                  value={detailsNotes}
                  onChange={(e) => setDetailsNotes(e.target.value)}
                  placeholder="e.g. Addition of Dr. Ramesh Sharma per client letter; or adjournment requested due to attorney schedule..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Initial Status */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                  Current Flow Status
                </label>
                <select
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {MISC_FORM_STATUSES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.step}. {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* If initial status is Filed or Updated */}
              {(initialStatus === 'FILED' || initialStatus === 'UPDATED_BY_IPO') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>CBR Number</label>
                    <input
                      type="text"
                      placeholder="e.g. CBR-8492"
                      value={cbrNumber}
                      onChange={(e) => setCbrNumber(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--page)', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Filing Date</label>
                    <input
                      type="date"
                      value={filingDate}
                      onChange={(e) => setFilingDate(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--page)', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'transparent',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Save Miscellaneous Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit CBR Modal */}
      {editingFormItem && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 2250,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setEditingFormItem(null)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: 'var(--surface)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '420px',
              padding: '20px',
              border: '1px solid var(--line)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px', color: 'var(--ink)' }}>
              Log IPO CBR & Mark Filed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Official CBR Number *</label>
                <input
                  type="text"
                  placeholder="e.g. CBR-98214"
                  value={editCbr}
                  onChange={(e) => setEditCbr(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', fontSize: '12px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Filing Date *</label>
                <input
                  type="date"
                  value={editFilingDate}
                  onChange={(e) => setEditFilingDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--line)', background: 'var(--page)', fontSize: '12px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingFormItem(null)}
                  style={{ padding: '5px 12px', borderRadius: '5px', border: '1px solid var(--line)', background: 'transparent', fontSize: '11px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCbr}
                  style={{ padding: '5px 14px', borderRadius: '5px', border: 'none', background: '#059669', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save & Confirm Filing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
