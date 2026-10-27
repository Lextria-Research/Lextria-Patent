// frontend/src/components/PhasedStatusSelector.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  PROSECUTION_PHASES, 
  STATUTORY_STATUSES, 
  getStatusColor, 
  getStatusPhase 
} from '../constants/patentStatuses';
import { Check, Search, Calendar, ChevronRight } from 'lucide-react';

export default function PhasedStatusSelector({
  value,
  onChange,
  applicationType = 'PROVISIONAL' // 'PROVISIONAL' | 'COMPLETE'
}) {
  // Determine which phase the current value belongs to
  const initialPhase = useMemo(() => {
    return getStatusPhase(value);
  }, [value]);

  const [activePhase, setActivePhase] = useState(initialPhase);
  const [searchQuery, setSearchQuery] = useState('');
  const [customRenewalYear, setCustomRenewalYear] = useState(3);

  // Sync activePhase when value changes externally
  useEffect(() => {
    if (value) {
      const p = getStatusPhase(value);
      if (p) setActivePhase(p);
    }
  }, [value]);

  // Extract renewal year if value is a renewal status
  useEffect(() => {
    if (value && value.includes('Renewed for')) {
      const match = value.match(/Renewed for (\d+) years/i);
      if (match && match[1]) {
        setCustomRenewalYear(parseInt(match[1], 10));
      }
    }
  }, [value]);

  // Filter statuses for the active phase or search
  const visibleStatuses = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return STATUTORY_STATUSES.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.tip && s.tip.toLowerCase().includes(q))
      );
    }
    return STATUTORY_STATUSES.filter((s) => s.phase === activePhase);
  }, [activePhase, searchQuery]);

  // Current selected color styling
  const currentColor = getStatusColor(value);

  const handleSelect = (statusName) => {
    onChange(statusName);
  };

  const handleRenewalYearChange = (year) => {
    setCustomRenewalYear(year);
    onChange(`Patent Renewed for ${year} years`);
  };

  return (
    <div style={{
      border: '1px solid var(--line, #e2e8f0)',
      borderRadius: '8px',
      background: 'var(--surface, #ffffff)',
      overflow: 'hidden'
    }}>
      {/* Current Active Status Indicator */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--line, #e2e8f0)',
        background: 'var(--surface-muted, #f8fafc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
            Current Status:
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            background: currentColor.bg,
            color: currentColor.text,
            border: `1px solid ${currentColor.border}`
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: currentColor.dot
            }} />
            {value || 'Not Set'}
          </span>
        </div>

        {/* Search input for instant jumping */}
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '7px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Quick search status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 8px 4px 28px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid var(--line, #cbd5e1)',
              background: 'var(--surface, #ffffff)',
              color: 'var(--text, #0f172a)'
            }}
          />
        </div>
      </div>

      {/* Phase Navigation Tabs */}
      {!searchQuery && (
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: '1px solid var(--line, #e2e8f0)',
          background: 'var(--surface-subtle, #f1f5f9)',
          padding: '4px 6px',
          gap: '4px',
          scrollbarWidth: 'thin'
        }}>
          {PROSECUTION_PHASES.map((p) => {
            const isActive = activePhase === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePhase(p.id)}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  borderRadius: '5px',
                  border: isActive ? '1px solid #3b82f6' : '1px solid transparent',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#1d4ed8' : 'var(--text-muted, #64748b)',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.shortLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* Statuses List in Selected Phase */}
      <div style={{
        maxHeight: '260px',
        overflowY: 'auto',
        padding: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '6px',
        background: 'var(--surface, #ffffff)'
      }}>
        {visibleStatuses.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', gridColumn: '1 / -1' }}>
            No status found matching "{searchQuery}".
          </div>
        ) : (
          visibleStatuses.map((st) => {
            const isSelected = value === st.name;
            const col = getStatusColor(st.name);

            return (
              <div
                key={st.id}
                onClick={() => handleSelect(st.name)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: isSelected ? `2px solid ${col.border}` : '1px solid var(--line, #e2e8f0)',
                  background: isSelected ? col.bg : 'var(--surface, #ffffff)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.1s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: col.dot,
                      flexShrink: 0
                    }} />
                    <span style={{
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 600,
                      color: isSelected ? col.text : 'var(--text, #1e293b)'
                    }}>
                      {st.name}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={{
                      background: col.border,
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </div>

                {st.tip && (
                  <span style={{
                    fontSize: '10.5px',
                    color: isSelected ? col.text : 'var(--text-muted, #64748b)',
                    lineHeight: '1.3',
                    opacity: 0.9
                  }}>
                    {st.tip}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Special Quick Picker for Renewals (Phase 6) */}
      {(activePhase === 'PHASE_6_GRANT_RENEWAL' || (value && value.includes('Renewed'))) && (
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--line, #e2e8f0)',
          background: 'var(--surface-muted, #f8fafc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text, #334155)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} style={{ color: '#10b981' }} />
            <span style={{ fontWeight: 600 }}>Quick Renewal Year (Sec 53):</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={customRenewalYear}
              onChange={(e) => handleRenewalYearChange(parseInt(e.target.value, 10))}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid #10b981',
                background: '#ffffff',
                fontWeight: 600,
                color: '#065f46'
              }}
            >
              {Array.from({ length: 18 }, (_, i) => i + 3).map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr} ({yr <= 6 ? '₹800/₹4,000' : yr <= 10 ? '₹2,400/₹12,000' : yr <= 15 ? '₹4,800/₹24,000' : '₹8,000/₹40,000'})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleRenewalYearChange(customRenewalYear)}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Set Year {customRenewalYear}
            </button>
          </div>
        </div>
      )}

      {/* Semantic Legend Footer */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid var(--line, #e2e8f0)',
        background: 'var(--surface-subtle, #f1f5f9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px',
        fontSize: '10px',
        color: 'var(--text-muted, #64748b)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} /> Green: Filed
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EAB308' }} /> Yellow: Under drafting
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6B7280' }} /> Grey: Under review
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F97316' }} /> Orange: Waiting confirmation
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8B5CF6' }} /> Purple: Waiting information
          </span>
        </div>
      </div>
    </div>
  );
}
