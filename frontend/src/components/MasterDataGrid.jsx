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
  CheckSquare, Square, User, Building, X
} from 'lucide-react';

export const VIEW_PRESETS = {
  ALL_MASTER: 'All Master View',
  MAHE_TTO: 'MAHE / TTO Reporting',
  EXTERNAL_PORTFOLIO: 'External Portfolio',
  WORKSHOP_TRIAGE: 'Workshop / IDF Triage',
  DEADLINES_BOTTLENECK: 'Deadlines & Bottlenecks',
};

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
  userRole = 'SUPER_ADMIN',
  selectedDrafter = null,
  clients = [],
  tags = [],
}) {
  const [currentPreset, setCurrentPreset] = useState(VIEW_PRESETS.ALL_MASTER);
  const [globalFilter, setGlobalFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sorting, setSorting] = useState([{ id: 'project_code', desc: false }]);
  const [rowSelection, setRowSelection] = useState({});

  // Filter records based on role, KPI filter, preset, dropdowns, and search
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

    // Apply Preset Filter
    if (currentPreset === VIEW_PRESETS.MAHE_TTO) {
      data = data.filter((r) => r.is_mahe);
    } else if (currentPreset === VIEW_PRESETS.EXTERNAL_PORTFOLIO) {
      data = data.filter((r) => r.record_category === 'EXTERNAL_TAKEOVER' || (r.project_code && (r.project_code.startsWith('EX-') || r.project_code.startsWith('GR'))));
    } else if (currentPreset === VIEW_PRESETS.WORKSHOP_TRIAGE) {
      data = data.filter((r) => r.record_category === 'WORKSHOP_IDF' || (r.project_code && ['DA', 'KM', 'MB', 'MS', 'MI'].some((p) => r.project_code.startsWith(p))));
    } else if (currentPreset === VIEW_PRESETS.DEADLINES_BOTTLENECK) {
      data = data.filter((r) => r.cs_deadline || r.fer_reply_deadline || r.ws_deadline || r.f1_status === 'Delayed' || r.f26_status === 'Delayed');
    }

    // Client dropdown filter (Interconnected with core.clients / applicant_name)
    if (clientFilter !== 'ALL') {
      data = data.filter((r) => {
        const clientVal = (r.applicant_name || r.client_name || '').toLowerCase();
        return clientVal.includes(clientFilter.toLowerCase());
      });
    }

    // Tag dropdown filter (Requirement 10)
    if (tagFilter !== 'ALL') {
      data = data.filter((r) => {
        const rTags = Array.isArray(r.tags) ? r.tags : (r.classification ? [r.classification] : []);
        return rTags.some((t) => String(t).toLowerCase() === tagFilter.toLowerCase());
      });
    }

    // Status dropdown filter
    if (statusFilter !== 'ALL') {
      data = data.filter((r) => r.current_status === statusFilter);
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
  }, [records, activeKpiFilter, currentPreset, clientFilter, tagFilter, statusFilter, globalFilter, userRole, selectedDrafter]);

  // Unique statuses for filter dropdown
  const statusOptions = useMemo(() => {
    const s = new Set(records.map((r) => r.current_status).filter(Boolean));
    return Array.from(s).sort();
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
      return { label: 'CS-PS', bg: 'rgba(139, 92, 246, 0.12)', fg: '#7C3AED' };
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

      // 1. Codes (project_code + Tag Badges)
      {
        accessorKey: 'project_code',
        header: 'Codes',
        size: 140,
        cell: ({ row }) => {
          const code = row.original.project_code;
          const rTags = Array.isArray(row.original.tags) ? row.original.tags : (row.original.classification ? [row.original.classification] : []);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
              <span style={{ fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.2px', fontSize: '13px' }}>
                {code}
              </span>
              {rTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {rTags.slice(0, 2).map((tg, idx) => {
                    const c = getTagColor(tg);
                    return (
                      <span
                        key={idx}
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: c.bg,
                          color: c.fg,
                          border: `1px solid ${c.border}`,
                          lineHeight: '1.2',
                        }}
                      >
                        {tg}
                      </span>
                    );
                  })}
                  {rTags.length > 2 && (
                    <span style={{ fontSize: '9px', color: 'var(--muted)', fontWeight: 700 }}>
                      +{rTags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        },
      },

      // 2. Application Number
      {
        accessorKey: 'application_number',
        header: 'Application Number',
        size: 160,
        cell: ({ row }) => (
          <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
            {row.original.application_number || '—'}
          </span>
        ),
      },

      // 3. Title of Invention
      {
        accessorKey: 'title',
        header: 'Title of Invention',
        size: 340,
        cell: ({ row }) => (
          <div
            title={row.original.title}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500,
              fontSize: '12.5px',
              color: 'var(--ink)'
            }}
          >
            {row.original.title || 'Untitled Invention'}
          </div>
        ),
      },

      // 4. CS / PS / CS-PS
      {
        accessorKey: 'specification_type',
        header: 'CS / PS / CS-PS',
        size: 120,
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

      // 5. Current Status
      {
        accessorKey: 'current_status',
        header: 'Current Status',
        size: 170,
        cell: ({ row }) => {
          const color = row.original.color_code_status;
          let bg = 'rgba(16, 185, 129, 0.12)';
          let fg = '#059669';
          let dot = '#10B981';

          if (color === 'PURPLE') { bg = 'rgba(139, 92, 246, 0.12)'; fg = '#7C3AED'; dot = '#8B5CF6'; }
          else if (color === 'RED') { bg = 'rgba(239, 68, 68, 0.12)'; fg = '#DC2626'; dot = '#EF4444'; }
          else if (color === 'YELLOW' || color === 'ORANGE') { bg = 'rgba(245, 158, 11, 0.12)'; fg = '#D97706'; dot = '#F59E0B'; }
          else if (color === 'BLUE') { bg = 'rgba(59, 130, 246, 0.12)'; fg = '#2563EB'; dot = '#3B82F6'; }

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: bg,
                  color: fg,
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={row.original.current_status}
              >
                {row.original.current_status || 'Under Drafting'}
              </span>
            </div>
          );
        },
      },

      // 6. Drafter Assigned
      {
        accessorKey: 'assigned_to',
        header: 'Drafter Assigned',
        size: 150,
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

      // Actions Column (View, Master Timeline, Edit)
      {
        id: 'actions',
        header: 'Actions',
        size: 110,
        cell: ({ row }) => (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onSelectRecord(row.original)}
              style={{
                padding: '4px 6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="View Application Details"
            >
              <Eye size={13} />
            </button>

            <button
              onClick={() => onOpenTimeline && onOpenTimeline(row.original)}
              style={{
                padding: '4px 6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--accent)',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Master Prosecution Timeline"
            >
              <Clock size={13} />
            </button>

            <button
              onClick={() => onOpenEdit && onOpenEdit(row.original)}
              style={{
                padding: '4px 6px',
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 1px 2px rgba(16, 185, 129, 0.25)',
              }}
              title="Edit Application"
            >
              <Edit3 size={13} />
            </button>
          </div>
        ),
      },
    ];
  }, [onSelectRecord, onOpenTimeline, onOpenEdit, tags]);

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
      {/* Top Presets & Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(8px)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Preset Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--page)', padding: '3px', borderRadius: '8px' }}>
          {Object.values(VIEW_PRESETS).map((preset) => (
            <button
              key={preset}
              onClick={() => setCurrentPreset(preset)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: currentPreset === preset ? 'var(--surface)' : 'transparent',
                color: currentPreset === preset ? 'var(--ink)' : 'var(--muted)',
                fontWeight: currentPreset === preset ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: currentPreset === preset ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Action Buttons: Create, Import, Export Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenCreate && (
            <button
              onClick={onOpenCreate}
              style={{
                padding: '6px 14px',
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
              padding: '6px 12px',
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
              padding: '6px 14px',
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

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface)',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
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

        {/* Dropdown Filters: Client, Tag, Status, and KPI notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
            <option value="Priority">Priority</option>
            <option value="Ticket Raised">Ticket Raised</option>
            <option value="Critical">Critical</option>
            <option value="Political">Political</option>
            {tags.filter((t) => !['priority', 'ticket raised', 'critical', 'political'].includes(t.name.toLowerCase())).map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>

          {/* Status Dropdown Filter */}
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
              maxWidth: '160px'
            }}
          >
            <option value="ALL">All Statuses</option>
            {statusOptions.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
            {filteredData.length} records
          </span>
        </div>
      </div>

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
    </div>
  );
}
