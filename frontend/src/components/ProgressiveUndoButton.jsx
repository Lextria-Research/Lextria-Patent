import React, { useState, useEffect, useRef } from 'react';
import {
  Undo2,
  Redo2,
  ChevronDown,
  Clock,
  FileEdit,
  PlusCircle,
  Users,
  FileText,
  UploadCloud
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
      return <PlusCircle size={13} color="#10B981" />;
    case 'REASSIGN':
      return <Users size={13} color="#8B5CF6" />;
    case 'SAVE_NOTES':
      return <FileText size={13} color="#F59E0B" />;
    case 'IMPORT':
      return <UploadCloud size={13} color="#0284C7" />;
    case 'UPDATE':
    default:
      return <FileEdit size={13} color="#2563EB" />;
  }
}

export default function ProgressiveUndoButton({
  undoStack = [],
  redoStack = [],
  onUndo,
  onRedo,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const containerRef = useRef(null);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const latestUndo = canUndo ? undoStack[0] : null;
  const latestRedo = canRedo ? redoStack[0] : null;

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

  const handleInstantRedo = (e) => {
    e.stopPropagation();
    if (!canRedo) return;
    onRedo();
  };

  const handleUndoUpTo = (index, e) => {
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
        gap: '4px',
        flexShrink: 0,
      }}
    >
      {/* MS Word Compact Split Undo Button [ â†¶ | âŒ„ ] */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: '32px',
          borderRadius: '6px',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {/* Undo Primary Action Icon */}
        <button
          onClick={handleInstantUndo}
          disabled={!canUndo}
          style={{
            width: '28px',
            height: '30px',
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canUndo ? 'pointer' : 'default',
            color: canUndo ? '#2563EB' : 'var(--muted)',
            opacity: canUndo ? 1 : 0.35,
            borderTopLeftRadius: '5px',
            borderBottomLeftRadius: '5px',
            padding: 0,
            transition: 'background 0.15s ease, opacity 0.15s ease',
          }}
          className={canUndo ? 'action-btn-interactive' : ''}
          title={
            canUndo
              ? `Undo: ${latestUndo?.actionLabel || ''} (Ctrl+Z)`
              : "Can't Undo (Ctrl+Z)"
          }
        >
          <Undo2 size={15} />
        </button>

        {/* Chevron Dropdown Trigger */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canUndo) {
              setHoveredIndex(0);
              setIsOpen((prev) => !prev);
            }
          }}
          disabled={!canUndo}
          style={{
            width: '18px',
            height: '30px',
            border: 'none',
            borderLeft: '1px solid var(--line)',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canUndo ? 'pointer' : 'default',
            color: canUndo ? '#2563EB' : 'var(--muted)',
            opacity: canUndo ? 1 : 0.35,
            borderTopRightRadius: '5px',
            borderBottomRightRadius: '5px',
            padding: 0,
            transition: 'background 0.15s ease, opacity 0.15s ease',
          }}
          className={canUndo ? 'action-btn-interactive' : ''}
          title={canUndo ? 'Undo actions history (up to 5 steps)' : ''}
        >
          <ChevronDown
            size={11}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>
      </div>

      {/* MS Word Redo Button [ â†· ] */}
      <button
        onClick={handleInstantRedo}
        disabled={!canRedo}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: canRedo ? 'pointer' : 'default',
          color: canRedo ? '#2563EB' : 'var(--muted)',
          opacity: canRedo ? 1 : 0.35,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          padding: 0,
          transition: 'background 0.15s ease, opacity 0.15s ease',
        }}
        className={canRedo ? 'action-btn-interactive' : ''}
        title={
          canRedo
            ? `Redo: ${latestRedo?.actionLabel || ''} (Ctrl+Y)`
            : "Can't Redo (Ctrl+Y)"
        }
      >
        <Redo2 size={15} />
      </button>

      {/* MS Word Style Progressive Undo Dropdown Menu */}
      {isOpen && canUndo && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            width: '280px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 10000,
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
            animation: 'fadeIn 0.12s ease',
          }}
        >
          {/* Action List (Highlights from 0 down to hoveredIndex like MS Word) */}
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {undoStack.slice(0, 5).map((step, idx) => {
              const isSelectedGroup = idx <= hoveredIndex;

              return (
                <div
                  key={step.id || idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onClick={(e) => handleUndoUpTo(idx, e)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: isSelectedGroup
                      ? 'rgba(37, 99, 235, 0.1)'
                      : 'transparent',
                    borderLeft: isSelectedGroup
                      ? '3px solid #2563EB'
                      : '3px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {getActionIcon(step.type)}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--ink)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {step.actionLabel}
                      </div>
                      {step.detail && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {step.detail}
                        </div>
                      )}
                    </div>
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
              );
            })}
          </div>

          {/* MS Word Dynamic Footer: "Undo N Action(s)" */}
          <div
            onClick={(e) => handleUndoUpTo(hoveredIndex, e)}
            style={{
              padding: '7px 12px',
              borderTop: '1px solid var(--line)',
              background: 'var(--page)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              color: '#2563EB',
            }}
          >
            <span>
              Undo {hoveredIndex + 1} {hoveredIndex === 0 ? 'Action' : 'Actions'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 500 }}>
              Ctrl+Z
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
