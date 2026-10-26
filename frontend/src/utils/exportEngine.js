import ExcelJS from 'exceljs';

export async function exportToExcel(records, viewName = 'Patent Portfolio') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lextria Patent Operations';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(viewName.slice(0, 31));

  // Columns definition based on view
  const columns = [
    { header: 'Project Code', key: 'project_code', width: 14 },
    { header: 'Application No.', key: 'application_number', width: 20 },
    { header: 'Invention Title', key: 'title', width: 40 },
    { header: 'Status', key: 'current_status', width: 22 },
    { header: 'Applicant', key: 'applicant_name', width: 32 },
    { header: 'MAHE / Non-MAHE', key: 'mahe_tag', width: 16 },
    { header: 'Inventors', key: 'inventors_summary', width: 35 },
    { header: 'D.O.F (PS)', key: 'ps_filing_date', width: 14 },
    { header: 'D.O.F (CS)', key: 'cs_filing_date', width: 14 },
    { header: 'CS Deadline', key: 'cs_deadline', width: 14 },
    { header: 'Form 1 Status', key: 'f1_status', width: 18 },
    { header: 'Form 26 Status', key: 'f26_status', width: 18 },
    { header: 'Publication Date', key: 'publication_date', width: 16 },
    { header: 'FER Notice Date', key: 'fer_notice_date', width: 16 },
    { header: 'FER Reply Deadline', key: 'fer_reply_deadline', width: 18 },
    { header: 'Hearing Date', key: 'hearing_date', width: 14 },
    { header: 'WS Deadline', key: 'ws_deadline', width: 14 },
    { header: 'Date of Grant', key: 'grant_date', width: 14 },
    { header: 'Assigned To', key: 'assigned_to', width: 20 },
  ];

  worksheet.columns = columns;

  // Add Rows
  records.forEach((r) => {
    worksheet.addRow({
      project_code: r.project_code,
      application_number: r.application_number || '—',
      title: r.title,
      current_status: r.current_status,
      applicant_name: r.applicant_name,
      mahe_tag: r.is_mahe ? 'MAHE' : 'Non-MAHE',
      inventors_summary: r.inventors_summary || '—',
      ps_filing_date: r.ps_filing_date || '—',
      cs_filing_date: r.cs_filing_date || '—',
      cs_deadline: r.cs_deadline || '—',
      f1_status: r.f1_status || 'Pending',
      f26_status: r.f26_status || 'Pending',
      publication_date: r.publication_date || '—',
      fer_notice_date: r.fer_notice_date || '—',
      fer_reply_deadline: r.fer_reply_deadline || '—',
      hearing_date: r.hearing_date || '—',
      ws_deadline: r.ws_deadline || '—',
      grant_date: r.grant_date || '—',
      assigned_to: r.assigned_to || 'Unassigned',
    });
  });

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B2A4A' },
    };
    cell.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF3A86FF' } },
    };
  });

  // Format zebra rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 20;
      row.alignment = { vertical: 'middle' };
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFC' },
          };
        });
      }
    }
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Lextria_Patent_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
