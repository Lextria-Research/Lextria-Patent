import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { X, Upload, AlertTriangle, CheckCircle, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { calculateAllStatutoryDeadlines } from '../utils/statutoryDeadlines';

export default function SmartImporterModal({ isOpen, onClose, onImportSuccess }) {
  if (!isOpen) return null;

  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [importSummary, setImportSummary] = useState(null);

  // Generates and downloads the official patent bulk upload format template (.xlsx)
  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Lextria Patent Operations';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('MIT-31102026');

      // Exact 8 columns as requested in patent bulk upload format.xlsx
      worksheet.columns = [
        { header: 'SL NO.', key: 'sl_no', width: 10 },
        { header: 'CODE', key: 'code', width: 16 },
        { header: 'TITLE OF THE INVENTIONS', key: 'title', width: 45 },
        { header: 'INVENTOR NAME', key: 'inventor_name', width: 32 },
        { header: 'Affiliation', key: 'affiliation', width: 35 },
        { header: ' CONTACT NUMBER', key: 'contact_number', width: 22 },
        { header: 'Email ID', key: 'email_id', width: 28 },
        { header: 'Assigned to (Drafter)', key: 'drafter', width: 24 },
      ];

      // Add realistic sample rows
      worksheet.addRow({
        sl_no: 1,
        code: 'MAHE_2026_01',
        title: 'Smart Non-Invasive Glucose Sensor Using Near-Infrared Spectroscopy',
        inventor_name: 'Dr. Rajesh Sharma, Priya Nair',
        affiliation: 'Manipal Institute of Technology (MIT)',
        contact_number: '+91 98765 43210',
        email_id: 'rajesh.sharma@manipal.edu',
        drafter: 'Abhishek',
      });
      worksheet.addRow({
        sl_no: 2,
        code: 'MAHE_2026_02',
        title: 'Automated Multi-Axis Robotic Arm for Orthopedic Surgeries',
        inventor_name: 'Dr. Ananya Rao',
        affiliation: 'Kasturba Medical College (KMC)',
        contact_number: '+91 98765 43211',
        email_id: 'ananya.rao@manipal.edu',
        drafter: 'Amith',
      });
      worksheet.addRow({
        sl_no: 3,
        code: 'MAHE_2026_03',
        title: 'Biocompatible Polymer Composite for High-Load Dental Implants',
        inventor_name: 'Dr. Vikram Patel',
        affiliation: 'Manipal College of Dental Sciences (MCODS)',
        contact_number: '+91 98765 43212',
        email_id: 'vikram.patel@manipal.edu',
        drafter: 'Ayush',
      });

      // Style Header Row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'patent_bulk_upload_format.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template export error:', err);
      alert('Failed to generate template: ' + err.message);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setAnomalies([]);
    setParsedRows([]);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        rows.push(row.values);
      });

      if (rows.length < 2) {
        throw new Error('Spreadsheet appears to be empty or has no header.');
      }

      // Map headers (Normalize strings, trim leading/trailing whitespace, and lower-case)
      const headers = rows[0].map((h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' '));
      const dataRows = rows.slice(1);

      const parsed = [];
      const foundAnomalies = [];
      const seenCodes = new Set();

      dataRows.forEach((r, idx) => {
        const rowObj = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = r[colIdx];
        });

        // Resolve fields mapping against 'patent bulk upload format.xlsx' and aliases
        const code = String(
          rowObj['code'] ||
          rowObj['project code'] ||
          rowObj['ar code'] ||
          rowObj['matter code'] ||
          ''
        ).trim();

        const title = String(
          rowObj['title of the inventions'] ||
          rowObj['title of the invention'] ||
          rowObj['title of invention'] ||
          rowObj['title'] ||
          rowObj['invention title'] ||
          ''
        ).trim();

        const inventor = String(
          rowObj['inventor name'] ||
          rowObj['inventor'] ||
          rowObj['inventors'] ||
          rowObj['inventor(s)'] ||
          ''
        ).trim();

        const affiliation = String(
          rowObj['affiliation'] ||
          rowObj['applicant name'] ||
          rowObj['applicant'] ||
          rowObj['institution'] ||
          'Manipal Academy of Higher Education'
        ).trim();

        const contact = String(
          rowObj['contact number'] ||
          rowObj['contact no'] ||
          rowObj['contact no.'] ||
          rowObj['phone'] ||
          rowObj['mobile'] ||
          ''
        ).trim();

        const email = String(
          rowObj['email id'] ||
          rowObj['email'] ||
          rowObj['e-mail'] ||
          ''
        ).trim();

        const drafter = String(
          rowObj['assigned to (drafter)'] ||
          rowObj['assigned to'] ||
          rowObj['drafter'] ||
          rowObj['assigned drafter'] ||
          'Unassigned'
        ).trim();

        const appNo = String(
          rowObj['application number'] ||
          rowObj['patent application no.'] ||
          rowObj['app no'] ||
          ''
        ).trim();

        // Skip completely empty filler rows
        if (!code && !title && !inventor && !appNo) return;

        // Anomaly 1: Duplicate Code
        if (code && seenCodes.has(code.toUpperCase())) {
          foundAnomalies.push({
            rowNumber: idx + 2,
            code,
            issue: 'Duplicate Project Code in import file',
            severity: 'HIGH'
          });
        }
        if (code) seenCodes.add(code.toUpperCase());

        // Anomaly 2: Missing Title
        if (!title) {
          foundAnomalies.push({
            rowNumber: idx + 2,
            code: code || 'N/A',
            issue: 'Missing invention title',
            severity: 'HIGH'
          });
        }

        // Anomaly 3: Missing Drafter assignment
        if (!drafter || drafter.toLowerCase() === 'unassigned') {
          foundAnomalies.push({
            rowNumber: idx + 2,
            code: code || 'N/A',
            issue: 'Unassigned Drafter (Will default to unallocated queue)',
            severity: 'LOW'
          });
        }

        // Calculate statutory deadlines if dates exist or default
        const stat = calculateAllStatutoryDeadlines({
          specification_type: 'PS',
        });

        parsed.push({
          id: `imp_${Date.now()}_${idx}`,
          project_code: code || `IMP_${String(idx + 1).padStart(4, '0')}`,
          application_number: appNo || null,
          title: title || 'Imported Patent Record',
          applicant_name: affiliation,
          affiliation: affiliation,
          inventors_summary: inventor || '—',
          inventor_name: inventor || '—',
          contact_number: contact || null,
          email_id: email || null,
          assigned_to: drafter,
          specification_type: 'PS',
          current_status: 'Idf sent, awaiting data',
          color_code_status: 'BLUE',
          is_mahe: true,
          record_category: 'INTERNAL_FILING',
          created_at: new Date().toISOString(),
          cs_deadline: stat.cs_deadline,
          form_1_deadline: stat.form_1_deadline,
          form_26_deadline: stat.form_26_deadline,
          rfe_deadline: stat.rfe_deadline,
          f1_status: 'Pending',
          f26_status: 'Pending',
        });
      });

      setParsedRows(parsed);
      setAnomalies(foundAnomalies);
      setImportSummary({
        totalRead: dataRows.length,
        validRecords: parsed.length,
        anomaliesCount: foundAnomalies.length
      });
    } catch (err) {
      console.error('Parsing error:', err);
      alert(`Failed to parse file: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommit = () => {
    if (onImportSuccess && parsedRows.length > 0) {
      onImportSuccess(parsedRows.length, parsedRows);
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop-animate"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog-animate"
        style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '88vh',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--line)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--page)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
              Bulk Patent Importer (Excel & CSV)
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Upload bulk patent matters matching the official standardized Excel format.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {/* Format Specification & Template Download Banner */}
          <div style={{
            marginBottom: '18px',
            padding: '14px 16px',
            borderRadius: '8px',
            background: 'rgba(58, 134, 255, 0.08)',
            border: '1px solid rgba(58, 134, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileSpreadsheet size={16} /> Standardized Patent Bulk Upload Format
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>
                Columns: <strong>SL NO.</strong> · <strong>CODE</strong> · <strong>TITLE OF THE INVENTIONS</strong> · <strong>INVENTOR NAME</strong> · <strong>Affiliation</strong> · <strong>CONTACT NUMBER</strong> · <strong>Email ID</strong> · <strong>Assigned to (Drafter)</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: '1px solid #3A86FF',
                background: 'var(--surface)',
                color: '#3A86FF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              <Download size={14} /> Download Sample Template (.xlsx)
            </button>
          </div>

          {/* File Upload Zone */}
          <div style={{
            border: '2px dashed var(--line)',
            borderRadius: '8px',
            padding: '28px',
            textAlign: 'center',
            background: 'var(--page)',
            cursor: 'pointer'
          }}>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="excel-file-upload"
            />
            <label htmlFor="excel-file-upload" style={{ cursor: 'pointer' }}>
              <Upload size={36} color="var(--accent)" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                {file ? file.name : 'Click to select patent bulk upload file (.xlsx, .csv)'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                Compatible with patent bulk upload format.xlsx, MIT trackers, and LR Master Sheets
              </div>
            </label>
          </div>

          {isParsing && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <Loader2 size={18} className="spin" color="var(--accent)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Analyzing columns, checking drafters & detecting anomalies...</span>
            </div>
          )}

          {/* Staging & Anomaly Summary */}
          {importSummary && (
            <div style={{ marginTop: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--page)', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>ROWS SCANNED</div>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{importSummary.totalRead}</div>
                </div>

                <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(78, 158, 86, 0.1)', border: '1px solid rgba(78, 158, 86, 0.25)' }}>
                  <div style={{ fontSize: '11px', color: '#4E9E56', fontWeight: 600 }}>VALID APPLICATIONS</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#4E9E56' }}>{importSummary.validRecords}</div>
                </div>

                <div style={{ padding: '12px', borderRadius: '6px', background: importSummary.anomaliesCount > 0 ? 'rgba(194, 59, 46, 0.1)' : 'var(--page)', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: importSummary.anomaliesCount > 0 ? '#C23B2E' : 'var(--muted)', fontWeight: 600 }}>ANOMALIES FLAGGED</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: importSummary.anomaliesCount > 0 ? '#C23B2E' : 'inherit' }}>
                    {importSummary.anomaliesCount}
                  </div>
                </div>
              </div>

              {/* Anomalies List */}
              {anomalies.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#C23B2E', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> Review Staging Anomalies
                  </div>
                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid var(--line)',
                    borderRadius: '6px'
                  }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead style={{ background: 'var(--page)', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Row</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Code</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Issue Description</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalies.map((an, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td style={{ padding: '6px 10px' }}>{an.rowNumber}</td>
                            <td style={{ padding: '6px 10px', fontWeight: 700 }}>{an.code}</td>
                            <td style={{ padding: '6px 10px' }}>{an.issue}</td>
                            <td style={{ padding: '6px 10px', fontWeight: 700, color: an.severity === 'HIGH' ? '#C23B2E' : '#C98A2C' }}>
                              {an.severity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          background: 'var(--page)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={parsedRows.length === 0}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
              cursor: parsedRows.length === 0 ? 'not-allowed' : 'pointer',
              opacity: parsedRows.length === 0 ? 0.6 : 1
            }}
          >
            Commit {parsedRows.length} Records to Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
