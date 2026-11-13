// frontend/src/components/ProgressiveUndoButton.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Undo2,
  ChevronDown,
  Clock,
  Trash2,
  FileEdit,
  PlusCircle,
  Users,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

function formatTimeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffSec = Math.max(0, Math.floor((now - d) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
}

function getActionIcon(type) {
  switch (type) {
    case 'CREATE':
      return <PlusCircle size={14} color="#10B981" />;
    case 'REASSIGN':
      return <Users size={14} color="#8B5CF6" />;
    case 'SAVE_NOTES':
      return <FileText size={14} color="#F59E0B" />;
    case 'IMPORT':
      return <UploadCloud size={14} color="#0284C7" />;
    case 'UPDATE':
    default:
      return <FileEdit size={14} color="#2563EB" />;
  }
}

export default function ProgressiveUndoButton({
  undoStack = [],
  onUndo,
  onClearHistory,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const containerRef = useRef(null);

  const count = undoStack.length;
  const canUndo = count > 0;
  const latestStep = canUndo ? undoStack[0] : null;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleInstantUndo = (e) => {
    e.stopPropagation();
    if (!canUndo) return;
    onUndo(0);
  };

  const handleUndoToStep = (index, e) => {
    e.stopPropagation();
    onUndo(index);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {/* 5-Step Progressive Split Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: '6px',
          border: canUndo ? '1px solid #3B82F6' : '1px solid var(--line)',
          background: canUndo
            ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(59, 130, 246, 0.03))'
            : 'var(--surface)',
          opacity: canUndo ? 1 : 0.6,
          boxShadow: canUndo ? '0 1px 4px rgba(37, 99, 235, 0.15)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Main Action: Undo Latest Step */}
        <button
          onClick={handleInstantUndo}
          disabled={!canUndo}
          style={{
            padding: '6px 9px',
            border: 'none',
            background: 'transparent',
            color: canUndo ? 'var(--ink)' : 'var(--muted)',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            borderTopLeftRadius: '5px',
            borderBottomLeftRadius: '5px',
          }}
          className={canUndo ? 'action-btn-interactive' : ''}
          title={
            canUndo
              ? `Undo latest change: ${latestStep?.actionLabel || ''} (Ctrl+Z)`
              : 'Progressive Undo: No actions to undo (0/5 steps in buffer)'
          }
        >
          <Undo2
            size={14}
            color={canUndo ? '#2563EB' : 'var(--muted)'}
            style={{
              transition: 'transform 0.2s ease',
              transform: canUndo ? 'scale(1.05)' : 'scale(1)',
            }}
          />
          <span style={{ fontWeight: 800 }}>Undo</span>

          {/* 5-Step Progressive Pips / Dots Meter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              marginLeft: '2px',
              background: 'var(--surface-subtle, rgba(0,0,0,0.04))',
              padding: '2px 5px',
              borderRadius: '10px',
              border: '1px solid var(--line)',
            }}
            title={`${count} of 5 progressive undo steps available`}
          >
            {[0, 1, 2, 3, 4].map((idx) => {
              const isFilled = idx < count;
              return (
                <span
                  key={idx}
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: isFilled ? '#2563EB' : 'var(--line-strong, #ccc)',
                    boxShadow: isFilled ? '0 0 3px rgba(37, 99, 235, 0.7)' : 'none',
                    display: 'inline-block',
                    transition: 'all 0.2s ease',
                  }}
                />
              );
            })}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: canUndo ? '#2563EB' : 'var(--muted)',
                marginLeft: '2px',
                letterSpacing: '-0.3px',
              }}
            >
              {count}/5
            </span>
          </div>
        </button>

        {/* Dropdown Chevron for 5-Step Progressive History Inspector */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          style={{
            padding: '6px 6px',
            border: 'none',
            borderLeft: '1px solid var(--line)',
            background: 'transparent',
            color: canUndo ? '#2563EB' : 'var(--muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTopRightRadius: '5px',
            borderBottomRightRadius: '5px',
          }}
          className="action-btn-interactive"
          title="View 5-Step Progressive Undo History Buffer"
        >
          <ChevronDown
            size={12}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>
      </div>

      {/* Progressive Undo Popover / History Buffer Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '340px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
            zIndex: 10000,
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Popover Header */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--page)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Undo2 size={15} color="#2563EB" />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>
                  5-Step Progressive Undo
                </span>
                <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>
                  {count > 0 ? `${count} of 5 actions stored in buffer` : 'History buffer is empty'}
                </div>
              </div>
            </div>

            {count > 0 && onClearHistory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearHistory();
                  setIsOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: '4px',
                }}
                className="action-btn-interactive"
                title="Clear undo history buffer"
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          {/* Popover Step List */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {count === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: '12px',
                }}
              >
                <Layers size={28} color="var(--line-strong, #ccc)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--ink)' }}>
                  No actions recorded yet
                </p>
                <p style={{ margin: 0, fontSize: '11px' }}>
                  Edits, reassignments, creates, and status updates will be tracked here up to 5 progressive steps.
                </p>
              </div>
            ) : (
              <div style={{ padding: '6px 0' }}>
                {undoStack.map((step, idx) => {
                  const isLatest = idx === 0;
                  const isHovered = hoveredIndex === idx;

                  return (
                    <div
                      key={step.id || idx}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{
                        padding: '8px 12px',
                        borderBottom: idx < count - 1 ? '1px solid var(--line)' : 'none',
                        background: isHovered
                          ? 'rgba(37, 99, 235, 0.05)'
                          : isLatest
                          ? 'rgba(37, 99, 235, 0.02)'
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Step Indicator Dot & Number */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          marginTop: '2px',
                        }}
                      >
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: isLatest ? '#2563EB' : 'var(--surface-subtle, #eee)',
                            color: isLatest ? '#fff' : 'var(--ink)',
                            fontSize: '10px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isLatest ? 'none' : '1px solid var(--line)',
                          }}
                        >
                          {idx + 1}
                        </span>
                      </div>

                      {/* Step Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                            {getActionIcon(step.type)}
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: 'var(--ink)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={step.actionLabel}
                            >
                              {step.actionLabel}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--muted)',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <Clock size={10} />
                            {formatTimeAgo(step.timestamp)}
                          </span>
                        </div>

                        {step.detail && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--muted)',
                              marginTop: '2px',
                              lineHeight: '1.3',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={step.detail}
                          >
                            {step.detail}
                          </div>
                        )}

                        {/* Interactive Undo Button for this step */}
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={(e) => handleUndoToStep(idx, e)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: isLatest ? '1px solid #3B82F6' : '1px solid var(--line)',
                              background: isLatest ? '#2563EB' : 'var(--surface)',
                              color: isLatest ? '#ffffff' : 'var(--ink)',
                              fontSize: '10px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              boxShadow: isLatest ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'none',
                            }}
                            className="action-btn-interactive"
                          >
                            <Undo2 size={10} />
                            {isLatest ? 'Undo this change' : `Undo back to step ${idx + 1}`}
                          </button>

                          {isLatest && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#2563EB',
                                background: 'rgba(37, 99, 235, 0.08)',
                                padding: '1px 5px',
                                borderRadius: '3px',
                              }}
                            >
                              Latest
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Popover Footer with Shortcut hint */}
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid var(--line)',
              background: 'var(--page)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: 'var(--muted)',
            }}
          >
            <span>
              Shortcut: <kbd style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>Ctrl+Z</kbd> or <kbd style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>⌘Z</kbd>
            </span>
            <span style={{ fontWeight: 600 }}>Max 5 steps preserved</span>
          </div>
        </div>
      )}
    </div>
  );
}

