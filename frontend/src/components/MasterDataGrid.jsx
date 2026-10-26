import React, { useState, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Search, Filter, Download, Upload, Eye, ArrowUpDown, Clock, AlertTriangle, CheckCircle,
  FileText, ExternalLink, RefreshCw, Plus, Edit3
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
  activeKpiFilter,
  onClearKpiFilter,
  onOpenCreate,
  onOpenEdit,
  onOpenTimeline,
  userRole = 'SUPER_ADMIN',
  selectedDrafter = null,
}) {
  const [currentPreset, setCurrentPreset] = useState(VIEW_PRESETS.ALL_MASTER);
  const [globalFilter, setGlobalFilter] = useState('');
  const [maheFilter, setMaheFilter] = useState('ALL'); // ALL, MAHE, NON_MAHE
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sorting, setSorting] = useState([{ id: 'project_code', desc: false }]);

  // Filter records based on active KPI card filter
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
      data = data.filter((r) => r.record_category === 'EXTERNAL_TAKEOVER' || r.project_code.startsWith('EX-') || r.project_code.startsWith('GR'));
    } else if (currentPreset === VIEW_PRESETS.WORKSHOP_TRIAGE) {
      data = data.filter((r) => r.record_category === 'WORKSHOP_IDF' || ['DA', 'KM', 'MB', 'MS', 'MI'].some((p) => r.project_code.startsWith(p)));
    } else if (currentPreset === VIEW_PRESETS.DEADLINES_BOTTLENECK) {
      data = data.filter((r) => r.cs_deadline || r.fer_reply_deadline || r.ws_deadline || r.f1_status === 'Delayed' || r.f26_status === 'Delayed');
    }

    // MAHE dropdown filter
    if (maheFilter === 'MAHE') data = data.filter((r) => r.is_mahe);
    if (maheFilter === 'NON_MAHE') data = data.filter((r) => !r.is_mahe);

    // Status dropdown filter
    if (statusFilter !== 'ALL') data = data.filter((r) => r.current_status === statusFilter);

    // Global Search filter
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase();
      data = data.filter((r) =>
        (r.project_code && r.project_code.toLowerCase().includes(q)) ||
        (r.application_number && r.application_number.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.inventors_summary && r.inventors_summary.toLowerCase().includes(q)) ||
        (r.applicant_name && r.applicant_name.toLowerCase().includes(q))
      );
    }

    // Role-based drafter filtering
    if (userRole === 'DRAFTER' && selectedDrafter) {
      data = data.filter((r) => r.assigned_to && r.assigned_to.trim().toLowerCase() === selectedDrafter.trim().toLowerCase());
    }

    return data;
  }, [records, activeKpiFilter, currentPreset, maheFilter, statusFilter, globalFilter, userRole, selectedDrafter]);

  // Unique statuses for filter dropdown
  const statusOptions = useMemo(() => {
    const s = new Set(records.map((r) => r.current_status).filter(Boolean));
    return Array.from(s).sort();
  }, [records]);

  // Columns definition
  const columns = useMemo(() => {
    return [
      // Pinned Left 1: Project Code
      {
        accessorKey: 'project_code',
        header: 'Code',
        size: 110,
        cell: ({ row }) => (
          <span style={{ fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.2px' }}>
            {row.original.project_code}
          </span>
        ),
      },
      // Pinned Left 2: Application Number
      {
        accessorKey: 'application_number',
        header: 'Application No.',
        size: 150,
        cell: ({ row }) => (
          <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>
            {row.original.application_number || '—'}
          </span>
        ),
      },
      // Pinned Left 3: Title
      {
        accessorKey: 'title',
        header: 'Title of Invention',
        size: 280,
        cell: ({ row }) => (
          <div
            title={row.original.title}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500
            }}
          >
            {row.original.title}
          </div>
        ),
      },
      // Status Pill
      {
        accessorKey: 'current_status',
        header: 'Status',
        size: 160,
        cell: ({ row }) => {
          const color = row.original.color_code_status;
          let bg = 'rgba(78, 158, 86, 0.12)';
          let fg = '#4E9E56';
          if (color === 'PURPLE') { bg = 'rgba(138, 79, 255, 0.12)'; fg = '#8A4FFF'; }
          else if (color === 'RED') { bg = 'rgba(194, 59, 46, 0.12)'; fg = '#C23B2E'; }
          else if (color === 'YELLOW') { bg = 'rgba(201, 138, 44, 0.12)'; fg = '#C98A2C'; }
          else if (color === 'BLUE') { bg = 'rgba(58, 134, 255, 0.12)'; fg = '#3A86FF'; }

          return (
            <span style={{
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
            }}>
              {row.original.current_status}
            </span>
          );
        },
      },
      // Inventors
      {
        accessorKey: 'inventors_summary',
        header: 'Inventors',
        size: 200,
        cell: ({ row }) => (
          <div
            title={row.original.inventors_summary}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--muted)' }}
          >
            {row.original.inventors_summary || '—'}
          </div>
        ),
      },
      // PS Filing Date
      {
        accessorKey: 'ps_filing_date',
        header: 'PS Date',
        size: 110,
        cell: ({ row }) => <span>{row.original.ps_filing_date || '—'}</span>,
      },
      // CS Filing Date
      {
        accessorKey: 'cs_filing_date',
        header: 'CS Date',
        size: 110,
        cell: ({ row }) => <span>{row.original.cs_filing_date || '—'}</span>,
      },
      // CS Deadline
      {
        accessorKey: 'cs_deadline',
        header: 'CS Deadline',
        size: 120,
        cell: ({ row }) => {
          const deadline = row.original.cs_deadline;
          if (!deadline) return <span>—</span>;
          const isOverdue = new Date(deadline) < new Date() && !row.original.cs_filing_date;
          return (
            <span style={{ color: isOverdue ? 'var(--bad-fg)' : 'inherit', fontWeight: isOverdue ? 700 : 500 }}>
              {deadline}
            </span>
          );
        },
      },
      // Form 1 Status
      {
        accessorKey: 'f1_status',
        header: 'Form 1 (POR)',
        size: 120,
        cell: ({ row }) => {
          const st = row.original.f1_status;
          const isDelayed = st === 'Delayed';
          return (
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: isDelayed ? '#C23B2E' : (st === 'Within Deadline' ? '#4E9E56' : 'var(--muted)')
            }}>
              {st || 'Pending'}
            </span>
          );
        },
      },
      // Form 26 Status
      {
        accessorKey: 'f26_status',
        header: 'Form 26 (POA)',
        size: 120,
        cell: ({ row }) => {
          const st = row.original.f26_status;
          const isDelayed = st === 'Delayed';
          return (
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: isDelayed ? '#C23B2E' : (st === 'Within Deadline' ? '#4E9E56' : 'var(--muted)')
            }}>
              {st || 'Pending'}
            </span>
          );
        },
      },
      // FER Notice Date
      {
        accessorKey: 'fer_notice_date',
        header: 'FER Date',
        size: 110,
        cell: ({ row }) => <span>{row.original.fer_notice_date || '—'}</span>,
      },
      // FER Reply Deadline
      {
        accessorKey: 'fer_reply_deadline',
        header: 'FER Reply Deadline',
        size: 130,
        cell: ({ row }) => {
          const deadline = row.original.fer_reply_deadline;
          if (!deadline) return <span>—</span>;
          const isOverdue = new Date(deadline) < new Date() && !row.original.fer_reply_filing_date;
          return (
            <span style={{ color: isOverdue ? 'var(--bad-fg)' : 'inherit', fontWeight: isOverdue ? 700 : 500 }}>
              {deadline}
            </span>
          );
        },
      },
      // Assigned To
      {
        accessorKey: 'assigned_to',
        header: 'Assigned To',
        size: 130,
        cell: ({ row }) => (
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            {row.original.assigned_to || 'Unassigned'}
          </span>
        ),
      },
      // Row Actions
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
              title="View Details"
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
  }, [onSelectRecord, onOpenTimeline, onOpenEdit]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef(null);
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 15,
  });

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
      {/* View Presets Bar */}
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

        {/* Action Buttons: Create, Import, Export */}
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

          <button
            onClick={() => onExportExcel(filteredData, currentPreset)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Export Excel
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
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search code, app no, inventor, title..."
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

        {/* Dropdowns & Active KPI notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

          <select
            value={maheFilter}
            onChange={(e) => setMaheFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--page)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <option value="ALL">All Applicants</option>
            <option value="MAHE">MAHE Only</option>
            <option value="NON_MAHE">Non-MAHE Only</option>
          </select>

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
              maxWidth: '180px'
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
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => {
                  const isPinned = idx < 3;
                  return (
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
                        cursor: 'pointer',
                        width: `${header.getSize()}px`,
                        position: isPinned ? 'sticky' : 'static',
                        left: isPinned ? (idx === 0 ? 0 : idx === 1 ? 110 : 260) : undefined,
                        background: isPinned ? 'var(--page)' : undefined,
                        zIndex: isPinned ? 20 : 10,
                        boxShadow: idx === 2 ? 'var(--freeze-shadow)' : undefined
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown size={12} color="var(--muted)" />
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Virtualized Rows */}
          <tbody>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isSelected = selectedCode === row.original.project_code;

              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectRecord(row.original)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
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
                  {row.getVisibleCells().map((cell, idx) => {
                    const isPinned = idx < 3;
                    return (
                      <td
                        key={cell.id}
                        style={{
                          padding: '8px 14px',
                          width: `${cell.column.getSize()}px`,
                          display: 'flex',
                          alignItems: 'center',
                          borderRight: '1px solid var(--line)',
                          position: isPinned ? 'sticky' : 'static',
                          left: isPinned ? (idx === 0 ? 0 : idx === 1 ? 110 : 260) : undefined,
                          background: isPinned ? (isSelected ? 'var(--accent-soft)' : (virtualRow.index % 2 === 0 ? 'var(--surface)' : 'var(--page)')) : undefined,
                          zIndex: isPinned ? 5 : 1,
                          boxShadow: idx === 2 ? 'var(--freeze-shadow)' : undefined,
                          overflow: 'hidden'
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
