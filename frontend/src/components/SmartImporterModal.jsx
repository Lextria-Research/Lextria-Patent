import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { X, Upload, AlertTriangle, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';

export default function SmartImporterModal({ isOpen, onClose, onImportSuccess }) {
  if (!isOpen) return null;

  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [importSummary, setImportSummary] = useState(null);

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

      // Map headers
      const headers = rows[0].map((h) => String(h || '').trim().toLowerCase());
      const dataRows = rows.slice(1);

      const parsed = [];
      const foundAnomalies = [];
      const seenCodes = new Set();

      dataRows.forEach((r, idx) => {
        const rowObj = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = r[colIdx];
        });

        // Resolve code
        const code = String(rowObj['code'] || rowObj['ar code'] || rowObj['project code'] || '').trim();
        const appNo = String(rowObj['application number'] || rowObj['patent application no.'] || rowObj['app no'] || '').trim();
        const title = String(rowObj['title'] || rowObj['title of invention'] || '').trim();

        if (!code && !appNo) return; // skip empty filler rows

        // Check Anomaly 1: Duplicate Code
        if (code && seenCodes.has(code.toUpperCase())) {
          foundAnomalies.push({
            rowNumber: idx + 2,
            code,
            issue: 'Duplicate Project Code in import file',
            severity: 'HIGH'
          });
        }
        if (code) seenCodes.add(code.toUpperCase());

        // Check Anomaly 2: Invalid Indian Patent Application Number format (Expected 12 digits, e.g. 202541073225)
        if (appNo && appNo.length > 0) {
          const cleanNo = appNo.replace(/\D/g, '');
          if (cleanNo.length !== 12 && cleanNo.length !== 10) {
            foundAnomalies.push({
              rowNumber: idx + 2,
              code: code || 'N/A',
              issue: `Non-standard IPO application number length (${appNo})`,
              severity: 'MEDIUM'
            });
          }
        }

        // Check Anomaly 3: Missing Title
        if (!title) {
          foundAnomalies.push({
            rowNumber: idx + 2,
            code: code || 'N/A',
            issue: 'Missing invention title',
            severity: 'LOW'
          });
        }

        parsed.push({
          project_code: code || `IMP_${String(idx + 1).padStart(4, '0')}`,
          application_number: appNo || null,
          title: title || 'Imported Patent Record',
          applicant_name: String(rowObj['applicant name'] || rowObj['applicant'] || 'Manipal Academy of Higher Education').trim(),
          assigned_to: String(rowObj['assigned to'] || rowObj['drafter'] || 'Unassigned').trim(),
          current_status: String(rowObj['status'] || 'Imported').trim(),
          color_code_status: 'BLUE',
          is_mahe: true,
          record_category: 'INTERNAL_FILING'
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
      onImportSuccess(parsedRows);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '85vh',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--line)'
      }}>
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
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              Smart Excel & CSV Staging Importer
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Automatically detects dates, normalizes inventors, and flags anomalies before committing.
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
              <FileSpreadsheet size={36} color="var(--accent)" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                {file ? file.name : 'Click to select Excel tracker (.xlsx) or CSV file'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                Supports LR Master Sheets, External Takeover trackers, and Workshop intake sheets
              </div>
            </label>
          </div>

          {isParsing && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <Loader2 size={18} className="spin" color="var(--accent)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Analyzing statutory columns & detecting anomalies...</span>
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
