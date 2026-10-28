// frontend/src/components/MiscFormsManager.jsx
import React, { useState, useMemo } from 'react';
import { calculateForm27Deadlines } from '../utils/statutoryDeadlines';

import {
  FileText, Plus, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Trash2, Shield, Calendar, Check, ExternalLink, ChevronRight, FileCheck
} from 'lucide-react';
import {
  MISC_FORM_STATUSES,
  MISC_FORM_MAIN_TYPES,
  FORM_13_SUBTYPES,
  FORM_6_SUBTYPES,
  FORM_16_SUBTYPES,
  FORM_27_SUBTYPES,
  FORM_30_ENTRIES,
  getMiscFormStatusInfo,
  getMainFormTypeInfo
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

  // Available Form 30 entries filtered by selected fee mode
  const availableForm30Entries = useMemo(() => {
    return FORM_30_ENTRIES.filter((e) => {
      if (e.feeCategory === 'BOTH') return true;
      return e.feeCategory === feeMode;
    });
  }, [feeMode]);

  // Form-27 Triennial Working Compliance Calculator (runs parallel with Section 53 renewals)
  const form27Compliance = useMemo(() => {
    const gDate = record?.grant_date || record?.patent_grant_date;
    if (!gDate) return null;
    return calculateForm27Deadlines(gDate);
  }, [record?.grant_date, record?.patent_grant_date]);

  const currentSubtypeObj = useMemo(() => {
    if (selectedMainType === 'FORM_13') {
      return FORM_13_SUBTYPES.find((s) => s.id === selectedSubtype) || FORM_13_SUBTYPES[0];
    }
    if (selectedMainType === 'FORM_6') {
      return FORM_6_SUBTYPES.find((s) => s.id === selectedSubtype) || FORM_6_SUBTYPES[0];
    }
    if (selectedMainType === 'FORM_16') {
      return FORM_16_SUBTYPES.find((s) => s.id === selectedSubtype) || FORM_16_SUBTYPES[0];
    }
    if (selectedMainType === 'FORM_27') {
      return FORM_27_SUBTYPES.find((s) => s.id === selectedSubtype) || FORM_27_SUBTYPES[0];
    }
    return FORM_30_ENTRIES.find((s) => s.id === selectedSubtype) || availableForm30Entries[0] || FORM_30_ENTRIES[0];
  }, [selectedMainType, selectedSubtype, availableForm30Entries]);

  // Handle adding new miscellaneous form
  const handleCreate = (e) => {
    e.preventDefault();

    const subTypeObj = currentSubtypeObj;
    const subTypeLabel = subTypeObj.shortLabel || subTypeObj.label;

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
              Miscellaneous Forms Tracker (Form 13, 6, 16, 30 & Form 27)
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

      {/* Form-27 Working of Patent Statement Compliance & Calculator (Parallel with Renewals) */}
      {form27Compliance && (
        <div style={{
          padding: '14px',
          borderRadius: '8px',
          background: 'var(--surface)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 800,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#059669',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                Form 27 (Rule 131)
              </span>
              <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                Commercial Working Statement (Parallel with Annual Renewals)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 800,
                background: form27Compliance.isWindowOpen ? '#10B981' : form27Compliance.isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                color: form27Compliance.isWindowOpen ? '#fff' : form27Compliance.isOverdue ? '#DC2626' : '#059669',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                ● {form27Compliance.isWindowOpen ? 'Filing Window Open (1 Apr - 30 Sep)' : form27Compliance.isOverdue ? 'Overdue' : 'Upcoming Triennial Filing'}
              </span>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMainType('FORM_27');
                    setSelectedSubtype('FORM_27_TRIENNIAL');
                    setTargetNumber(record.patent_number || record.application_number || '');
                    setDetailsNotes(`Form-27 commercial working statement for 3-year financial block ${form27Compliance.currentBlock} (Due: ${form27Compliance.statutoryDueDate})`);
                    setFeeMode('WITHOUT_FEE');
                    setShowAddModal(true);
                  }}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '5px',
                    border: '1px solid #059669',
                    background: '#D1FAE5',
                    color: '#065F46',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={12} /> Log Form 27
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
            <div style={{ background: 'var(--page)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>3-Year Financial Block</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>{form27Compliance.currentBlock}</div>
            </div>

            <div style={{ background: 'var(--page)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Statutory Filing Window</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>1 April to 30 September</div>
            </div>

            <div style={{ background: 'var(--page)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Statutory Due Date</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#DC2626' }}>{form27Compliance.statutoryDueDate}</div>
            </div>

            <div style={{ background: 'var(--page)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Extension Leeway (Form 4)</div>
              <div style={{ fontSize: '11px', color: 'var(--ink)' }}>Rule 131(2): <strong>{form27Compliance.extRule131}</strong> (+3M)</div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Rule 131(2) & 2024 Amendment: Triennial filing once every 3 FYs, starting from the FY commencing immediately after grant FY ({form27Compliance.grantFyLabel}). Monitored parallel with Section 53 maintenance renewals.
          </div>
        </div>
      )}

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
          No miscellaneous forms (Form 13, 6, 16, 30 or 27) logged yet for this patent.
          <br />
          Click <strong>"+ Log Misc Form"</strong> to initiate an inventor change, title transfer, Form-30 petition, or Form-27 working statement.
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
                    {(() => {
                      const typeInfo = getMainFormTypeInfo(item.form_type);
                      return (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: typeInfo.badgeBg,
                            color: typeInfo.badgeFg,
                            border: `1px solid ${typeInfo.badgeBorder}`,
                          }}
                        >
                          {typeInfo.shortTitle}
                        </span>
                      );
                    })()}

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
              {/* Form Category Selector: Form 13, Form 6, Form 16, Form 30 */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
                  Select Statutory Form Category *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '8px' }}>
                  {MISC_FORM_MAIN_TYPES.map((mainType) => {
                    const isSelected = selectedMainType === mainType.id;
                    return (
                      <button
                        key={mainType.id}
                        type="button"
                        onClick={() => {
                          setSelectedMainType(mainType.id);
                          if (mainType.id === 'FORM_13') {
                            setSelectedSubtype('FORM_13_ADD_INVENTOR');
                            setTargetNumber(record.application_number || '');
                            setFeeMode('WITH_FEE');
                          } else if (mainType.id === 'FORM_6') {
                            setSelectedSubtype('FORM_6_TRANSFER');
                            setTargetNumber(record.application_number || '');
                            setFeeMode('WITH_FEE');
                          } else if (mainType.id === 'FORM_16') {
                            setSelectedSubtype('FORM_16_TRANSFER');
                            setTargetNumber(record.patent_number || record.application_number || '');
                            setFeeMode('WITH_FEE');
                          } else if (mainType.id === 'FORM_27') {
                            setSelectedSubtype('FORM_27_TRIENNIAL');
                            setTargetNumber(record.patent_number || record.application_number || '');
                            setFeeMode('WITHOUT_FEE');
                          } else {
                            setSelectedSubtype('ENTRY_S142_3_RESPONSE');
                            setTargetNumber(record.application_number || '');
                            setFeeMode('WITH_FEE');
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: isSelected ? `2px solid ${mainType.badgeFg}` : '1px solid var(--line)',
                          background: isSelected ? mainType.badgeBg : 'var(--page)',
                          color: isSelected ? mainType.badgeFg : 'var(--ink)',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          textAlign: 'center'
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>{mainType.shortTitle}</span>
                        <span style={{ fontSize: '9.5px', opacity: 0.85 }}>{mainType.timing}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informational context banners for Form 6 and Form 16 */}
              {selectedMainType === 'FORM_6' && (
                <div style={{ fontSize: '11px', color: '#059669', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <strong>Form 6 (Pre-Grant):</strong> Request for transfer, assignment or addition of patent applicant under Section 20 & Rule 34 prior to grant.
                </div>
              )}
              {selectedMainType === 'FORM_16' && (
                <div style={{ fontSize: '11px', color: '#D97706', background: 'rgba(217, 119, 6, 0.08)', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                  <strong>Form 16 (Post-Grant):</strong> Application for registration of title, assignment, transmission or addition of patentee post-grant under Section 68, 69 & Rule 90.
                </div>
              )}
              {selectedMainType === 'FORM_27' && (
                <div style={{ fontSize: '11px', color: '#059669', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <strong>Form 27 (Statement of Working):</strong> Triennial compliance under amended Rule 131(2) & Section 146(2). Runs parallel with Section 53 renewals. Statutory fee: Free (₹0).
                </div>
              )}

              {/* Form 30 Specific: Radio buttons With Fee vs Without Fee (From Reference Screenshots) */}
              {selectedMainType === 'FORM_30' && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--ink)' }}>
                      <input
                        type="radio"
                        name="fee_mode"
                        checked={feeMode === 'WITH_FEE'}
                        onChange={() => {
                          setFeeMode('WITH_FEE');
                          const hasWith = FORM_30_ENTRIES.some((e) => e.id === selectedSubtype && (e.feeCategory === 'WITH_FEE' || e.feeCategory === 'BOTH'));
                          if (!hasWith) {
                            setSelectedSubtype('ENTRY_S142_3_RESPONSE');
                            setTargetNumber(record.application_number || '');
                          }
                        }}
                      />
                      With Fee
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--ink)' }}>
                      <input
                        type="radio"
                        name="fee_mode"
                        checked={feeMode === 'WITHOUT_FEE'}
                        onChange={() => {
                          setFeeMode('WITHOUT_FEE');
                          const hasWithout = FORM_30_ENTRIES.some((e) => e.id === selectedSubtype && (e.feeCategory === 'WITHOUT_FEE' || e.feeCategory === 'BOTH'));
                          if (!hasWithout) {
                            setSelectedSubtype('ENTRY_49A_WIPO_DAS');
                            setTargetNumber(record.application_number || '');
                          }
                        }}
                      />
                      Without Fee
                    </label>
                  </div>
                </div>
              )}

              {/* Specific Subtype Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
                  {selectedMainType === 'FORM_13' ? 'Select Form 13 Action Flow *' : 'Select Form *'}
                </label>
                <select
                  value={selectedSubtype}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSubtype(val);
                    let found = null;
                    if (selectedMainType === 'FORM_13') found = FORM_13_SUBTYPES.find((s) => s.id === val);
                    else if (selectedMainType === 'FORM_6') found = FORM_6_SUBTYPES.find((s) => s.id === val);
                    else if (selectedMainType === 'FORM_16') found = FORM_16_SUBTYPES.find((s) => s.id === val);
                    else if (selectedMainType === 'FORM_27') found = FORM_27_SUBTYPES.find((s) => s.id === val);
                    else found = FORM_30_ENTRIES.find((s) => s.id === val);

                    if (found && found.numberField === 'patent_number') {
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
                  {selectedMainType === 'FORM_13' && (
                    FORM_13_SUBTYPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.rule})
                      </option>
                    ))
                  )}
                  {selectedMainType === 'FORM_6' && (
                    FORM_6_SUBTYPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.rule})
                      </option>
                    ))
                  )}
                  {selectedMainType === 'FORM_16' && (
                    FORM_16_SUBTYPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.rule})
                      </option>
                    ))
                  )}
                  {selectedMainType === 'FORM_27' && (
                    FORM_27_SUBTYPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.rule})
                      </option>
                    ))
                  )}
                  {selectedMainType === 'FORM_30' && (
                    availableForm30Entries.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.code}
                      </option>
                    ))
                  )}
                </select>

                {/* Blue confirmation text matching IPO portal screenshots */}
                {currentSubtypeObj && (
                  <div style={{
                    color: '#0284c7',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: 'rgba(2, 132, 199, 0.08)',
                    borderRadius: '5px',
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                    wordBreak: 'break-word',
                    lineHeight: '1.45'
                  }}>
                    {currentSubtypeObj.description || currentSubtypeObj.code}
                  </div>
                )}
              </div>

              {/* Target Application or Patent Number */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                  {currentSubtypeObj?.numberFieldLabel || (selectedSubtype === 'ENTRY_19_23_RESTORATION' ? 'Patent Number *' : 'Application Number *')}
                </label>
                <input
                  type="text"
                  value={targetNumber}
                  onChange={(e) => setTargetNumber(e.target.value)}
                  placeholder={currentSubtypeObj?.numberField === 'patent_number' ? 'e.g. 543210' : 'e.g. 202441019532'}
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

