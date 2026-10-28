import React, { useState, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Search, Filter, Download, Upload, Eye, ArrowUpDown, Clock,
  FileText, ExternalLink, Plus, Edit3, Tag as TagIcon,
  CheckSquare, Square, User, Building, X, UserCheck
} from 'lucide-react';
import { getStatusColor, PROSECUTION_PHASES, STATUTORY_STATUSES, getStatusPhase } from '../constants/patentStatuses';
import DEFAULT_CLIENTS from '../data/clients.json';

export default function MasterDataGrid({
  records = [],
  onSelectRecord,
  selectedCode,
  onOpenImport,
  onExportExcel,
  onOpenExportReport,
  activeKpiFilter,
  onClearKpiFilter,
  onOpenCreate,
  onOpenEdit,
  onOpenTimeline,
  onOpenQuickDocket,
  onOpenReassign,
  userRole = 'SUPER_ADMIN',
  selectedDrafter = null,
  clients: clientsProp = [],
  tags = [],
}) {
  const clients = (Array.isArray(clientsProp) && clientsProp.length > 0) ? clientsProp : DEFAULT_CLIENTS;
  const [globalFilter, setGlobalFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [patentTypeFilter, setPatentTypeFilter] = useState('ALL');
  const [deliveryUrgencyFilter, setDeliveryUrgencyFilter] = useState('ALL'); // ALL, OVERDUE, DUE_2, DUE_7, ON_TRACK, NO_DATE
  const [sorting, setSorting] = useState([{ id: 'project_code', desc: false }]);
  const [rowSelection, setRowSelection] = useState({});

  // Delivery urgency counts for filter row (Matching Reference UI Design)
  const deliveryUrgencyCounts = useMemo(() => {
    let overdue = 0;
    let due2 = 0;
    let due7 = 0;
    let onTrack = 0;
    let noDate = 0;
    const now = new Date();

    records.forEach((r) => {
      if (r.is_abandoned) return;
      if (!r.client_commitment_date) {
        noDate++;
        return;
      }
      const diff = Math.round((new Date(r.client_commitment_date) - now) / 86400000);
      if (diff < 0) overdue++;
      else if (diff <= 2) due2++;
      else if (diff <= 7) due7++;
      else onTrack++;
    });

    return { overdue, due2, due7, onTrack, noDate };
  }, [records]);

  // Filter records based on role, KPI filter, preset, dropdowns, delivery urgency, and search
  const filteredData = useMemo(() => {
    let data = records;

    // Apply KPI Ribbon filter if active
    if (activeKpiFilter) {
      const now = new Date();
      if (activeKpiFilter === 'critical') {
        data = data.filter((r) => {
          return [r.cs_deadline, r.fer_reply_deadline, r.ws_deadline].some((d) => {
            if (!d) return false;
            const diff = Math.round((new Date(d) - now) / 86400000);
            return diff <= 7 && !r.is_abandoned;
          });
        });
      } else if (activeKpiFilter === 'commitments_near') {
        data = data.filter((r) => {
          if (!r.client_commitment_date || r.is_abandoned) return false;
          const diff = Math.round((new Date(r.client_commitment_date) - now) / 86400000);
          return diff <= 7;
        });
      } else if (activeKpiFilter === 'commitments_overdue') {
        data = data.filter((r) => {
          if (!r.client_commitment_date || r.is_abandoned) return false;
          const diff = Math.round((new Date(r.client_commitment_date) - now) / 86400000);
          return diff < 0;
        });
      } else if (activeKpiFilter === 'problems') {
        data = data.filter((r) => {
          const rTags = Array.isArray(r.tags) ? r.tags : (r.classification ? r.classification.split(',').map((s) => s.trim()) : []);
          const hasTicket = rTags.some((t) => ['ticket raised', 'critical'].includes(t.toLowerCase()));
          const hasIssue = Boolean(r.issue && r.issue.trim());
          return hasTicket || hasIssue;
        });
      } else if (activeKpiFilter === 'spec_ps') {
        data = data.filter((r) => (r.specification_type || '').toUpperCase() === 'PS');
      } else if (activeKpiFilter === 'spec_cs') {
        data = data.filter((r) => (r.specification_type || '').toUpperCase() === 'CS');
      } else if (activeKpiFilter === 'spec_ps_cs') {
        data = data.filter((r) => {
          const spec = (r.specification_type || '').toUpperCase();
          return spec.includes('PS') && spec.includes('CS');
        });
      } else if (activeKpiFilter === 'stage_fer') {
        data = data.filter((r) => Boolean(r.fer_notice_date || r.fer_reply_deadline));
      } else if (activeKpiFilter === 'stage_ws') {
        data = data.filter((r) => Boolean(r.hearing_date || r.ws_deadline));
      } else if (activeKpiFilter === 'color_purple') {
        data = data.filter((r) => (r.color_code_status || '').toUpperCase() === 'PURPLE');
      } else if (activeKpiFilter === 'color_orange') {
        data = data.filter((r) => (r.color_code_status || '').toUpperCase() === 'ORANGE');
      } else if (activeKpiFilter === 'color_yellow') {
        data = data.filter((r) => (r.color_code_status || '').toUpperCase() === 'YELLOW');
      } else if (activeKpiFilter === 'cs_due') {
        data = data.filter((r) => {
          if (!r.cs_deadline || r.cs_filing_date || r.is_abandoned) return false;
          const diff = Math.round((new Date(r.cs_deadline) - now) / 86400000);
          return diff >= -30 && diff <= 60;
        });
      } else if (activeKpiFilter === 'fer_due') {
        data = data.filter((r) => r.fer_reply_deadline && !r.fer_reply_filing_date && !r.is_abandoned);
      } else if (activeKpiFilter === 'hearing_ws') {
        data = data.filter((r) => (r.hearing_date || r.ws_deadline) && !r.ws_filing_date && !r.is_abandoned);
      } else if (activeKpiFilter === 'form_petition') {
        data = data.filter((r) => (r.f1_status === 'Delayed' || r.f26_status === 'Delayed' || r.f1_status === 'Pending' || r.f26_status === 'Pending') && !r.is_abandoned);
      } else if (activeKpiFilter === 'renewals') {
        data = data.filter((r) => r.next_renewal_date || r.last_renewal_date);
      }
    }

    // Client dropdown filter (Interconnected with core.clients / applicant_name)
    if (clientFilter !== 'ALL') {
      data = data.filter((r) => {
        const clientVal = (r.applicant_name || r.client_name || '').toLowerCase();
        return clientVal.includes(clientFilter.toLowerCase());
      });
    }

    // Patent Type filter (Requirement 2: PS, PS-CS, CS)
    if (patentTypeFilter !== 'ALL') {
      data = data.filter((r) => {
        const spec = formatSpecType(r.specification_type, r.ps_filing_date, r.cs_filing_date).label;
        if (patentTypeFilter === 'PS-CS') {
          return spec === 'PS-CS' || spec === 'CS-PS' || (r.specification_type || '').toUpperCase() === 'PS_TO_CS';
        }
        return spec === patentTypeFilter;
      });
    }

    // Tag dropdown filter (Requirement 10 & Misc Forms)
    if (tagFilter !== 'ALL') {
      if (tagFilter === 'MISC_FORMS') {
        data = data.filter((r) => {
          if (Array.isArray(r.misc_forms) && r.misc_forms.length > 0) return true;
          try {
            return Boolean(localStorage.getItem(`patent_misc_forms_${r.project_code}`));
          } catch {
            return false;
          }
        });
      } else {
        data = data.filter((r) => {
          const rTags = Array.isArray(r.tags) ? r.tags : (r.classification ? [r.classification] : []);
          return rTags.some((t) => String(t).toLowerCase() === tagFilter.toLowerCase());
        });
      }
    }

    // Status dropdown filter (supports individual statutory status or whole phase)
    if (statusFilter !== 'ALL') {
      if (statusFilter.startsWith('PHASE:')) {
        const targetPhase = statusFilter.replace('PHASE:', '');
        data = data.filter((r) => getStatusPhase(r.current_status) === targetPhase);
      } else {
        data = data.filter((r) => (r.current_status || '').toLowerCase() === statusFilter.toLowerCase());
      }
    }

    // Delivery Urgency filter (Matching Reference UI Design)
    if (deliveryUrgencyFilter !== 'ALL') {
      const now = new Date();
      data = data.filter((r) => {
        if (!r.client_commitment_date) {
          return deliveryUrgencyFilter === 'NO_DATE';
        }
        const diff = Math.round((new Date(r.client_commitment_date) - now) / 86400000);
        if (deliveryUrgencyFilter === 'OVERDUE') return diff < 0;
        if (deliveryUrgencyFilter === 'DUE_2') return diff >= 0 && diff <= 2;
        if (deliveryUrgencyFilter === 'DUE_7') return diff > 2 && diff <= 7;
        if (deliveryUrgencyFilter === 'ON_TRACK') return diff > 7;
        return true;
      });
    }

    // Role-based drafter filtering (Requirement 3)
    if (userRole === 'DRAFTER' && selectedDrafter) {
      data = data.filter((r) => r.assigned_to && r.assigned_to.trim().toLowerCase() === selectedDrafter.trim().toLowerCase());
    }

    // Global Search filter
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase();
      data = data.filter((r) =>
        (r.project_code && r.project_code.toLowerCase().includes(q)) ||
        (r.application_number && r.application_number.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.inventors_summary && r.inventors_summary.toLowerCase().includes(q)) ||
        (r.applicant_name && r.applicant_name.toLowerCase().includes(q)) ||
        (r.assigned_to && r.assigned_to.toLowerCase().includes(q))
      );
    }

    return data;
  }, [records, activeKpiFilter, clientFilter, tagFilter, statusFilter, patentTypeFilter, deliveryUrgencyFilter, globalFilter, userRole, selectedDrafter]);

  // Grouped statutory statuses for filter dropdown with counts
  const { phaseGroupedStatuses } = useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      const st = r.current_status || 'Idf sent, awaiting data';
      counts[st] = (counts[st] || 0) + 1;
    });

    const groups = PROSECUTION_PHASES.map((phase) => {
      const statuses = STATUTORY_STATUSES.filter((s) => s.phase === phase.id);
      return {
        phaseId: phase.id,
        phaseLabel: phase.label,
        shortLabel: phase.shortLabel,
        statuses,
      };
    });

    return { phaseGroupedStatuses: groups, statusCounts: counts };
  }, [records]);

  // Status counts map for quick lookup
  const statusCountsMap = useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      const st = r.current_status || 'Idf sent, awaiting data';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [records]);

  // Unique clients for dropdown (combine core.clients + existing applicant names)
  const clientOptions = useMemo(() => {
    const set = new Set();
    clients.forEach((c) => {
      if (c.client_name) set.add(c.client_name);
    });
    records.forEach((r) => {
      if (r.applicant_name) set.add(r.applicant_name);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [clients, records]);

  // Helper to resolve tag color
  const getTagColor = (tagName) => {
    const lower = String(tagName).toLowerCase();
    if (lower === 'priority') return { bg: 'rgba(239, 68, 68, 0.12)', fg: '#DC2626', border: 'rgba(239, 68, 68, 0.3)' };
    if (lower === 'critical') return { bg: 'rgba(220, 38, 38, 0.15)', fg: '#991B1B', border: 'rgba(220, 38, 38, 0.4)' };
    if (lower === 'ticket raised') return { bg: 'rgba(245, 158, 11, 0.12)', fg: '#D97706', border: 'rgba(245, 158, 11, 0.3)' };
    if (lower === 'political') return { bg: 'rgba(139, 92, 246, 0.12)', fg: '#7C3AED', border: 'rgba(139, 92, 246, 0.3)' };
    
    // Check in tags prop
    const found = tags.find((t) => t.name.toLowerCase() === lower);
    if (found) {
      return { bg: `${found.color}1A`, fg: found.color, border: `${found.color}4D` };
    }
    return { bg: 'rgba(59, 130, 246, 0.1)', fg: '#2563EB', border: 'rgba(59, 130, 246, 0.25)' };
  };

  // Helper to format specification type (CS / PS / CS-PS)
  const formatSpecType = (type, hasPs, hasCs) => {
    const val = String(type || '').toUpperCase();
    if (val === 'PS_TO_CS' || (hasPs && hasCs) || val.includes('CS-PS') || val.includes('PS TO CS')) {
      return { label: 'PS-CS', bg: 'rgba(139, 92, 246, 0.12)', fg: '#7C3AED' };
    }
    if (val === 'CS' || val.includes('COMPLETE')) {
      return { label: 'CS', bg: 'rgba(16, 185, 129, 0.12)', fg: '#059669' };
    }
    if (val === 'PS' || val.includes('PROVISIONAL')) {
      return { label: 'PS', bg: 'rgba(59, 130, 246, 0.12)', fg: '#2563EB' };
    }
    if (val === 'DIVISIONAL') {
      return { label: 'Divisional', bg: 'rgba(245, 158, 11, 0.12)', fg: '#D97706' };
    }
    return { label: val || 'PS', bg: 'rgba(107, 114, 128, 0.12)', fg: '#4B5563' };
  };

  // =========================================================================
  // Requirement 11: Reduce columns strictly to:
  // "Codes, Application Number, title of invention, CS/PS/CS-PS, Current Status, Drafter Assigned"
  // Plus selection checkbox and actions buttons.
  // =========================================================================
  const columns = useMemo(() => {
    return [
      // 0. Row Selection Checkbox
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
            title="Select all matters"
          />
        ),
        size: 40,
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
          />
        ),
      },

      // 1. Codes (project_code + Client Prefix Badge)
      {
        accessorKey: 'project_code',
        header: 'Code',
        size: 130,
        cell: ({ row }) => {
          const code = row.original.project_code || '';
          const prefix = code.replace(/[0-9]/g, '') || (row.original.is_mahe ? 'MAHE' : 'AAIS');
          const hasMisc = Array.isArray(row.original.misc_forms) && row.original.misc_forms.length > 0;
          const activeMisc = hasMisc ? row.original.misc_forms.find((m) => m.status !== 'UPDATED_BY_IPO') : null;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '13px' }}>
                  {code}
                </span>
                {activeMisc && (
                  <span
                    title={`${activeMisc.sub_type_label} (${activeMisc.status})`}
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      background: activeMisc.form_type === 'FORM_13' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(124, 58, 237, 0.15)',
                      color: activeMisc.form_type === 'FORM_13' ? '#2563EB' : '#7C3AED',
                      border: `1px solid ${activeMisc.form_type === 'FORM_13' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(124, 58, 237, 0.3)'}`,
                    }}
                  >
                    {activeMisc.form_type === 'FORM_13' ? 'F13' : 'F30'}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#2563EB',
                  width: 'fit-content',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                {prefix}
              </span>
            </div>
          );
        },
      },

      // 2. Application Number (or "Not filed")
      {
        accessorKey: 'application_number',
        header: 'Application no.',
        size: 150,
        cell: ({ row }) => (
          row.original.application_number ? (
            <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
              {row.original.application_number}
            </span>
          ) : (
            <span style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
              Not filed
            </span>
          )
        ),
      },

      // 3. Title of Invention
      {
        accessorKey: 'title',
        header: 'Title of invention',
        size: 320,
        cell: ({ row }) => (
          <div
            title={row.original.title}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 600,
              fontSize: '12.5px',
              color: 'var(--ink)'
            }}
          >
            {row.original.title || 'Untitled Invention'}
          </div>
        ),
      },

      // 4. Client Delivery (Dedicated Prominent Column matching Reference UI Design)
      {
        accessorKey: 'client_commitment_date',
        header: 'Client delivery',
        size: 160,
        cell: ({ row }) => {
          const cd = row.original.client_commitment_date;
          if (!cd) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}>No date set</span>
                <span style={{ color: 'var(--muted)', fontSize: '10.5px' }}>Delivery not scheduled</span>
              </div>
            );
          }
          const now = new Date();
          const diff = Math.round((new Date(cd) - now) / 86400000);
          const d = new Date(cd);
          const formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

          if (diff < 0) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#DC2626', fontWeight: 800, fontSize: '12px' }}>
                  Overdue {Math.abs(diff)} days
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '10.5px' }}>
                  Due {formattedDate}
                </span>
              </div>
            );
          }
          if (diff <= 2) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#EA580C', fontWeight: 800, fontSize: '12px' }}>
                  Due in {diff === 0 ? 'today' : `${diff} days`}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '10.5px' }}>
                  Due {formattedDate}
                </span>
              </div>
            );
          }
          if (diff <= 7) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#D97706', fontWeight: 800, fontSize: '12px' }}>
                  In {diff} days
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '10.5px' }}>
                  Due {formattedDate}
                </span>
              </div>
            );
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#059669', fontWeight: 700, fontSize: '12px' }}>
                In {diff} days
              </span>
              <span style={{ color: 'var(--muted)', fontSize: '10.5px' }}>
                Due {formattedDate}
              </span>
            </div>
          );
        },
      },

      // 5. Specification Type (Type)
      {
        accessorKey: 'specification_type',
        header: 'Type',
        size: 90,
        cell: ({ row }) => {
          const spec = formatSpecType(
            row.original.specification_type,
            row.original.ps_filing_date,
            row.original.cs_filing_date
          );

          return (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                background: spec.bg,
                color: spec.fg,
                letterSpacing: '0.2px'
              }}
            >
              {spec.label}
            </span>
          );
        },
      },

      // 6. Status (Strict 5-Color Semantics: Green, Yellow, Grey, Orange, Purple)
      {
        accessorKey: 'current_status',
        header: 'Status',
        size: 160,
        cell: ({ row }) => {
          const st = row.original.current_status || 'Idf sent, awaiting data';
          const col = getStatusColor(st);

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: col.bg,
                  color: col.text,
                  border: `1px solid ${col.border}`,
                  maxWidth: '145px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={st}
              >
                {st}
              </span>
            </div>
          );
        },
      },

      // 7. Drafter Assigned
      {
        accessorKey: 'assigned_to',
        header: 'Drafter',
        size: 140,
        cell: ({ row }) => {
          const drafter = row.original.assigned_to;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {drafter ? drafter.slice(0, 2).toUpperCase() : '—'}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                {drafter || 'Unassigned'}
              </span>
            </div>
          );
        },
      },
    ];
  }, [onSelectRecord, onOpenTimeline, onOpenEdit, onOpenQuickDocket, userRole, tags]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef(null);
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  const selectedRowsList = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => rows[k]?.original)
      .filter(Boolean);
  }, [rowSelection, rows]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--surface)',
      borderRadius: '10px',
      border: '1px solid var(--line)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden'
    }}>
      {/* Top Search, Filters & Action Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface)',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Left Side: Global Search + Filter Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
          {/* Global Search */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Search code, app no, drafter, title..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 34px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--page)',
                color: 'var(--ink)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {activeKpiFilter && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(194, 59, 46, 0.1)',
              color: '#C23B2E',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              <span>Filtered by: {activeKpiFilter}</span>
              <button
                onClick={onClearKpiFilter}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C23B2E', fontWeight: 800, padding: 0 }}
              >
                ×
              </button>
            </div>
          )}

          {/* Client Filter Dropdown (Requirement 12) */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--page)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 600,
              maxWidth: '170px'
            }}
            title="Filter by interconnected client (core.clients)"
          >
            <option value="ALL">All Clients ({clientOptions.length})</option>
            {clientOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Tag Filter Dropdown (Requirement 10) */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--page)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 600,
              maxWidth: '150px'
            }}
            title="Filter by Tag (Priority, Ticket Raised, Critical, Political...)"
          >
            <option value="ALL">All Tags</option>
            <option value="MISC_FORMS">Misc Forms (F13 / F30)</option>
            <option value="Priority">Priority</option>
            <option value="Ticket Raised">Ticket Raised</option>
            <option value="Critical">Critical</option>
            <option value="Political">Political</option>
            {tags.filter((t) => !['priority', 'ticket raised', 'critical', 'political'].includes(t.name.toLowerCase())).map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>

          {/* Patent Type Filter Dropdown (PS, PS-CS, CS) */}
          <select
            value={patentTypeFilter}
            onChange={(e) => setPatentTypeFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--page)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 600,
              maxWidth: '140px'
            }}
            title="Filter by Patent Specification Type (PS, PS-CS, CS)"
          >
            <option value="ALL">All Types</option>
            <option value="PS">PS (Provisional)</option>
            <option value="PS-CS">PS-CS (Prov to Complete)</option>
            <option value="CS">CS (Direct Complete)</option>
          </select>

          {/* Status Dropdown Filter (Phase Grouped & Statutory) */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--page)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 600,
              minWidth: '180px',
              maxWidth: '240px',
              outline: 'none'
            }}
            title="Filter by Statutory Prosecution Status or Phase"
          >
            <option value="ALL">All Statuses ({records.length})</option>
            {phaseGroupedStatuses.map((group) => {
              const groupTotal = group.statuses.reduce(
                (sum, s) => sum + (statusCountsMap[s.name] || 0),
                0
              );
              return (
                <optgroup key={group.phaseId} label={`${group.phaseLabel} (${groupTotal})`}>
                  <option value={`PHASE:${group.phaseId}`}>
                    ▸ All {group.shortLabel} ({groupTotal})
                  </option>
                  {group.statuses.map((st) => {
                    const cnt = statusCountsMap[st.name] || 0;
                    return (
                      <option key={st.id || st.name} value={st.name}>
                        {st.name} {cnt > 0 ? `(${cnt})` : ''}
                      </option>
                    );
                  })}
                </optgroup>
              );
            })}
          </select>

          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {filteredData.length} records
          </span>
        </div>

        {/* Right Side: Action Buttons: Create, Import, Export Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {onOpenCreate && (
            <button
              onClick={onOpenCreate}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
              }}
            >
              <Plus size={14} /> New Application
            </button>
          )}

          <button
            onClick={onOpenImport}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Upload size={14} /> Smart Import
          </button>

          {/* Export Report (Opens ExportReportModal for customizable export) */}
          <button
            onClick={() => onOpenExportReport && onOpenExportReport(selectedRowsList.length > 0 ? selectedRowsList : filteredData)}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
            }}
            title="Customizable Columns Export & Bulk Report"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* DELIVERY URGENCY Filter Row (Matching Reference UI Design Page 1) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 18px',
          background: 'var(--page)',
          borderBottom: '1px solid var(--line)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 800,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
          }}
        >
          DELIVERY URGENCY
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All', count: records.length, color: 'var(--muted)', bg: 'transparent' },
            { id: 'OVERDUE', label: 'Overdue', count: deliveryUrgencyCounts.overdue, color: '#DC2626', bg: '#FEE2E2', dot: '#DC2626' },
            { id: 'DUE_2', label: 'Due in ≤ 2 days', count: deliveryUrgencyCounts.due2, color: '#EA580C', bg: '#FFEDD5', dot: '#EA580C' },
            { id: 'DUE_7', label: 'Due in ≤ 7 days', count: deliveryUrgencyCounts.due7, color: '#D97706', bg: '#FEF3C7', dot: '#D97706' },
            { id: 'ON_TRACK', label: 'On track', count: deliveryUrgencyCounts.onTrack, color: '#16A34A', bg: '#DCFCE7', dot: '#16A34A' },
            { id: 'NO_DATE', label: 'No date set', count: deliveryUrgencyCounts.noDate, color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
          ].map((chip) => {
            const isAct = deliveryUrgencyFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setDeliveryUrgencyFilter(isAct && chip.id !== 'ALL' ? 'ALL' : chip.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: isAct ? `1.5px solid ${chip.color}` : '1px solid var(--line)',
                  background: isAct ? (chip.id === 'ALL' ? 'var(--surface)' : chip.bg) : 'var(--surface)',
                  color: isAct ? chip.color : 'var(--ink)',
                  fontSize: '11px',
                  fontWeight: isAct ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {chip.dot && (
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: chip.dot }} />
                )}
                <span>{chip.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '8px',
                    background: isAct ? 'rgba(0,0,0,0.08)' : 'var(--page)',
                    color: isAct ? chip.color : 'var(--muted)',
                  }}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active KPI Filter Notification Bar */}
      {activeKpiFilter && (
        <div
          style={{
            padding: '7px 18px',
            background: 'rgba(234, 88, 12, 0.08)',
            borderBottom: '1px solid rgba(234, 88, 12, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: 700,
            color: '#C2410C',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EA580C' }} />
            <span>
              Active Filter: <strong>{String(activeKpiFilter).replace(/_/g, ' ').toUpperCase()}</strong> ({filteredData.length} matching matters)
            </span>
          </div>
          <button
            onClick={onClearKpiFilter}
            style={{
              padding: '3px 10px',
              borderRadius: '4px',
              border: '1px solid #EA580C',
              background: '#EA580C',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Clear Filter (Show All)
          </button>
        </div>
      )}

      {/* Bulk Selection Notification Bar */}
      {selectedRowsList.length > 0 && (
        <div
          style={{
            padding: '8px 18px',
            background: 'rgba(37, 99, 235, 0.08)',
            borderBottom: '1px solid rgba(37, 99, 235, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: 700,
            color: '#1D4ED8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={15} />
            <span>{selectedRowsList.length} applications selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenReassign && userRole === 'SUPER_ADMIN' && (
              <button
                onClick={() => onOpenReassign(selectedRowsList)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '5px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
                }}
              >
                <UserCheck size={12} />
                Reassign Selected ({selectedRowsList.length})
              </button>
            )}
            <button
              onClick={() => onOpenExportReport && onOpenExportReport(selectedRowsList)}
              style={{
                padding: '4px 10px',
                borderRadius: '5px',
                border: 'none',
                background: '#2563EB',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Export Selected ({selectedRowsList.length})
            </button>
            <button
              onClick={() => setRowSelection({})}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--muted)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
          textAlign: 'left'
        }}>
          {/* Sticky Table Header */}
          <thead style={{
            position: 'sticky',
            top: 0,
            background: 'var(--page)',
            zIndex: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} style={{ display: 'flex', width: '100%' }}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--line)',
                      borderRight: '1px solid var(--line)',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      whiteSpace: 'nowrap',
                      cursor: header.id === 'select' || header.id === 'actions' ? 'default' : 'pointer',
                      width: `${header.getSize()}px`,
                      flexShrink: header.id === 'title' ? 1 : 0,
                      flexGrow: header.id === 'title' ? 1 : 0,
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.id !== 'select' && header.id !== 'actions' && (
                        <ArrowUpDown size={12} color="var(--muted)" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Virtualized Rows in Normal Flow with Dynamic Spacers */}
          <tbody>
            {paddingTop > 0 && (
              <tr style={{ height: `${paddingTop}px`, display: 'flex', width: '100%' }}>
                <td style={{ height: `${paddingTop}px`, padding: 0, border: 'none', width: '100%' }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              const isSelected = selectedCode === row.original.project_code || row.getIsSelected();

              return (
                <tr
                  key={row.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  onClick={() => onSelectRecord(row.original)}
                  style={{
                    display: 'flex',
                    width: '100%',
                    minHeight: `${virtualRow.size}px`,
                    background: isSelected ? 'var(--accent-soft)' : (virtualRow.index % 2 === 0 ? 'var(--surface)' : 'var(--page)'),
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    borderBottom: '1px solid var(--line)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(58, 134, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = virtualRow.index % 2 === 0 ? 'var(--surface)' : 'var(--page)';
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        padding: '8px 14px',
                        width: `${cell.column.getSize()}px`,
                        flexShrink: cell.column.id === 'title' ? 1 : 0,
                        flexGrow: cell.column.id === 'title' ? 1 : 0,
                        display: 'flex',
                        alignItems: 'center',
                        borderRight: '1px solid var(--line)',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr style={{ height: `${paddingBottom}px`, display: 'flex', width: '100%' }}>
                <td style={{ height: `${paddingBottom}px`, padding: 0, border: 'none', width: '100%' }} />
              </tr>
            )}
            {rows.length === 0 && (
              <tr style={{ display: 'flex', width: '100%' }}>
                <td
                  style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: 'var(--muted)',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    border: 'none',
                  }}
                >
                  <FileText size={36} style={{ opacity: 0.35, marginBottom: '4px' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>No patent applications found</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Try adjusting your search query, status filter, or tag selection.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar Matching Reference UI Design */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderTop: '1px solid var(--line)',
          background: 'var(--surface)',
          fontSize: '12px',
          color: 'var(--muted)',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        <div>
          Showing 1–{Math.min(rows.length, 25)} of {rows.length} records
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            disabled
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--page)',
              color: 'var(--muted)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            Previous
          </button>
          <button
            disabled={rows.length <= 25}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: rows.length > 25 ? 'var(--surface)' : 'var(--page)',
              color: rows.length > 25 ? 'var(--ink)' : 'var(--muted)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: rows.length > 25 ? 'pointer' : 'not-allowed',
              opacity: rows.length > 25 ? 1 : 0.6,
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
