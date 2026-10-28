// frontend/src/components/ExportReportModal.jsx
import React, { useState } from 'react';
import {
  X, Download, FileSpreadsheet, CheckSquare, Square,
  Filter, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';
import ExcelJS from 'exceljs';

const AVAILABLE_COLUMNS = [
  { id: 'project_code', label: 'Project Code', category: 'Identifiers', defaultChecked: true },
  { id: 'application_number', label: 'Application Number', category: 'Identifiers', defaultChecked: true },
  { id: 'patent_number', label: 'Patent Number', category: 'Identifiers', defaultChecked: true },
  { id: 'title', label: 'Invention Title', category: 'Identifiers', defaultChecked: true },
  { id: 'specification_type', label: 'Specification Type (CS/PS)', category: 'Identifiers', defaultChecked: true },
  { id: 'record_category', label: 'Record Category', category: 'Identifiers', defaultChecked: false },
  
  { id: 'current_status', label: 'Current Status', category: 'Triage', defaultChecked: true },
  { id: 'color_code_status', label: 'Color Code Status', category: 'Triage', defaultChecked: false },
  { id: 'assigned_to', label: 'Assigned Drafter', category: 'Triage', defaultChecked: true },
  { id: 'applicant_name', label: 'Applicant Name', category: 'Triage', defaultChecked: true },
  { id: 'classification', label: 'Classification / Tag', category: 'Triage', defaultChecked: true },
  
  { id: 'ps_filing_date', label: 'PS Filing Date', category: 'Dates', defaultChecked: true },
  { id: 'cs_filing_date', label: 'CS Filing Date', category: 'Dates', defaultChecked: true },
  { id: 'cs_deadline', label: 'Complete Spec (CS) Deadline', category: 'Dates', defaultChecked: true },
  { id: 'publication_date', label: 'Publication Date', category: 'Dates', defaultChecked: false },
  { id: 'fer_notice_date', label: 'FER Notice Date', category: 'Dates', defaultChecked: false },
  { id: 'fer_reply_deadline', label: 'FER Reply Deadline', category: 'Dates', defaultChecked: true },
  { id: 'hearing_date', label: 'Hearing Date', category: 'Dates', defaultChecked: false },
  { id: 'ws_deadline', label: 'Hearing WS Deadline', category: 'Dates', defaultChecked: true },
  { id: 'grant_date', label: 'Grant Date', category: 'Dates', defaultChecked: true },
  
  { id: 'f1_status', label: 'Form 1 Status', category: 'Forms', defaultChecked: true },
  { id: 'form_1_filing_date', label: 'Form 1 Filing Date', category: 'Forms', defaultChecked: false },
  { id: 'f26_status', label: 'Form 26 Status', category: 'Forms', defaultChecked: true },
  { id: 'form_26_filing_date', label: 'Form 26 Filing Date', category: 'Forms', defaultChecked: false },
  { id: 'form_3_filing_date', label: 'Form 3 Date', category: 'Forms', defaultChecked: false },
  { id: 'form_18_filing_date', label: 'Form 18 (RFE) Date', category: 'Forms', defaultChecked: false },

  { id: 'inventors_summary', label: 'Inventors', category: 'Details', defaultChecked: false },
  { id: 'inventor_institution', label: 'Inventor Institution', category: 'Details', defaultChecked: false },
  { id: 'inventor_gender', label: 'Inventor Gender', category: 'Details', defaultChecked: false },
  { id: 'inventor_nationality', label: 'Inventor Nationality', category: 'Details', defaultChecked: false },
  { id: 'inventor_country', label: 'Inventor Country of Residence', category: 'Details', defaultChecked: false },
  { id: 'workdrive_folder_url', label: 'WorkDrive Folder URL', category: 'Details', defaultChecked: false },
  { id: 'status_notes', label: 'Internal Status Notes', category: 'Details', defaultChecked: false },
  { id: 'suggested_action', label: 'Suggested Action', category: 'Details', defaultChecked: false },
];

export default function ExportReportModal({
  isOpen,
  onClose,
  records = [],
  selectedRecords = [],
}) {
  if (!isOpen) return null;

  const [selectedCols, setSelectedCols] = useState(() => {
    const s = new Set();
    AVAILABLE_COLUMNS.forEach((c) => {
      if (c.defaultChecked) s.add(c.id);
    });
    return s;
  });

  const [exportScope, setExportScope] = useState(
    selectedRecords.length > 0 ? 'SELECTED' : 'ALL'
  );
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [reportTitle, setReportTitle] = useState('Lextria_Patent_Prosecution_Report');

  const clientOptions = useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      const c = (r.applicant_name || r.client_name || '').trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return Object.keys(counts).sort().map((name) => ({ name, count: counts[name] }));
  }, [records]);
  const [format, setFormat] = useState('XLSX'); // XLSX or CSV
  const [isExporting, setIsExporting] = useState(false);

  const toggleCol = (id) => {
    const next = new Set(selectedCols);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCols(next);
  };

  const selectAll = () => {
    setSelectedCols(new Set(AVAILABLE_COLUMNS.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedCols(new Set());
  };

  const handleExecuteExport = async () => {
    if (selectedCols.size === 0) {
      alert('Please select at least one column to export.');
      return;
    }

    setIsExporting(true);
    let dataToExport = exportScope === 'SELECTED' && selectedRecords.length > 0
      ? selectedRecords
      : records;

    if (selectedClient !== 'ALL') {
      dataToExport = dataToExport.filter((r) => {
        const c = (r.applicant_name || r.client_name || '').trim();
        return c.toLowerCase() === selectedClient.toLowerCase();
      });
    }

    const resolveCellValue = (colId, row) => {
      if (colId === 'inventor_institution') {
        if (row.inventors && row.inventors[0]?.institution) {
          return row.inventors.map((i) => i.institution).filter(Boolean).join(', ');
        }
        return row.applicant_name || '';
      }
      if (colId === 'inventor_gender') {
        if (row.inventors && row.inventors[0]?.gender) {
          return row.inventors.map((i) => `${i.name}: ${i.gender}`).join(', ');
        }
        return '';
      }
      if (colId === 'inventor_nationality') {
        if (row.inventors && row.inventors[0]?.nationality) {
          return row.inventors.map((i) => i.nationality).filter(Boolean).join(', ');
        }
        return 'Indian';
      }
      if (colId === 'inventor_country') {
        if (row.inventors && row.inventors[0]?.country_of_residence) {
          return row.inventors.map((i) => i.country_of_residence).filter(Boolean).join(', ');
        }
        return 'India';
      }
      return row[colId] ?? '';
    };

    const chosenColumns = AVAILABLE_COLUMNS.filter((c) => selectedCols.has(c.id));

    if (format === 'CSV') {
      // Export as CSV
      const headerRow = chosenColumns.map((c) => `"${c.label}"`).join(',');
      const dataRows = dataToExport.map((row) =>
        chosenColumns
          .map((c) => {
            const val = resolveCellValue(c.id, row);
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      );
      const csvStr = [headerRow, ...dataRows].join('\r\n');
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsExporting(false);
      onClose();
      return;
    }

    // Export as Styled Excel via ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lextria Research';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Patent Portfolio');

    // Title Header Block
    worksheet.mergeCells('A1', `${String.fromCharCode(64 + Math.min(chosenColumns.length, 26))}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `LEXTRIA RESEARCH · PATENT PROSECUTION & DOCKETING REPORT`;
    titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B2A4A' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Subtitle
    worksheet.mergeCells('A2', `${String.fromCharCode(64 + Math.min(chosenColumns.length, 26))}2`);
    const subCell = worksheet.getCell('A2');
    subCell.value = `Generated: ${new Date().toLocaleString()} · Total Applications: ${dataToExport.length}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Table Column Headers
    const headerRow = worksheet.getRow(4);
    headerRow.height = 24;

    chosenColumns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.label;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getColumn(idx + 1).width = Math.max(col.label.length + 4, 15);
    });

    // Data rows
    dataToExport.forEach((rec, rIdx) => {
      const row = worksheet.getRow(5 + rIdx);
      row.height = 20;
      chosenColumns.forEach((col, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.value = rec[col.id] ?? '';
        cell.font = { name: 'Arial', size: 9 };
        cell.alignment = { vertical: 'middle' };
        if (rIdx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setIsExporting(false);
    onClose();
  };

  // Group columns by category
  const categories = Array.from(new Set(AVAILABLE_COLUMNS.map((c) => c.category)));

  return (
    <div
      className="modal-backdrop-animate"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog-animate"
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
                Customizable Report & Bulk Export
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Select exact columns, report scope, and file format to generate executive spreadsheets
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Options: Scope and Format */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              padding: '14px',
              borderRadius: '10px',
              background: 'var(--page)',
              border: '1px solid var(--line)',
              marginBottom: '20px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                Export Scope
              </label>
              <select
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <option value="ALL">All Filtered Records ({records.length})</option>
                {selectedRecords.length > 0 && (
                  <option value="SELECTED">Selected Rows Only ({selectedRecords.length})</option>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                Client Selection
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <option value="ALL">All Clients ({records.length})</option>
                {clientOptions.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                File Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <option value="XLSX">Excel Spreadsheet (.xlsx)</option>
                <option value="CSV">Comma Separated Values (.csv)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                Report Filename
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>

          {/* Column Selection Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800 }}>
              Select Columns ({selectedCols.size} of {AVAILABLE_COLUMNS.length} selected)
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={selectAll}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: 'var(--page)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Categorized Column Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categories.map((cat) => {
              const catCols = AVAILABLE_COLUMNS.filter((c) => c.category === cat);
              return (
                <div
                  key={cat}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'var(--page)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: '8px' }}>
                    {cat}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {catCols.map((c) => {
                      const isChecked = selectedCols.has(c.id);
                      return (
                        <label
                          key={c.id}
                          onClick={() => toggleCol(c.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            fontWeight: isChecked ? 700 : 500,
                            color: isChecked ? 'var(--ink)' : 'var(--muted)',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare size={16} color="var(--accent)" />
                          ) : (
                            <Square size={16} color="var(--muted)" />
                          )}
                          <span>{c.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--line)',
            background: 'var(--page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            disabled={isExporting}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteExport}
            disabled={isExporting || selectedCols.size === 0}
            style={{
              padding: '8px 24px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
            }}
          >
            <Download size={14} />
            {isExporting ? 'Generating Report...' : `Export ${exportScope === 'SELECTED' ? selectedRecords.length : records.length} Applications`}
          </button>
        </div>
      </div>
    </div>
  );
}
