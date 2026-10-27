// frontend/src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import MasterDataGrid from './components/MasterDataGrid';
import KpiAlertRibbon from './components/KpiAlertRibbon';
import SlideOverDrawer from './components/SlideOverDrawer';
import SmartImporterModal from './components/SmartImporterModal';
import LiveDueBoard from './components/LiveDueBoard';
import CreateApplicationModal from './components/CreateApplicationModal';
import EditApplicationModal from './components/EditApplicationModal';
import MasterTimelineModal from './components/MasterTimelineModal';
import AuthModal, { USER_ACCOUNTS } from './components/AuthModal';
import DeadlinesTab from './components/DeadlinesTab';
import CalendarView from './components/CalendarView';
import SettingsModal from './components/SettingsModal';
import ExportReportModal from './components/ExportReportModal';
import { exportToExcel } from './utils/exportEngine';
import { calculateAllStatutoryDeadlines } from './utils/statutoryDeadlines';
import { supabase, patentDb, coreDb } from './lib/supabase';
import {
  FolderKanban, CheckSquare, Calendar, Tv, Moon, Sun, Settings,
  Plus, Download, UserCheck, Shield, Briefcase, Scale,
  Sparkles, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';

const DEFAULT_TAGS = [
  { id: 'tag_1', name: 'Priority', color: '#EF4444', description: 'High priority application requiring expedited drafting or filing' },
  { id: 'tag_2', name: 'Ticket Raised', color: '#F59E0B', description: 'Active support ticket or query raised by client/inventor' },
  { id: 'tag_3', name: 'Critical', color: '#DC2626', description: 'Approaching statutory abandonment deadline under Section 9 or 21' },
  { id: 'tag_4', name: 'Political', color: '#8B5CF6', description: 'Institutionally sensitive matter (VIP inventor or strategic IP)' },
];

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeKpiFilter, setActiveKpiFilter] = useState(null);
  const [activeNavTab, setActiveNavTab] = useState('PORTFOLIO'); // PORTFOLIO, DEADLINES, CALENDAR
  
  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportRecordsSelection, setExportRecordsSelection] = useState(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [timelineRecord, setTimelineRecord] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedDrafterFilter, setSelectedDrafterFilter] = useState(null);

  // Authenticated User Account State (Requirement 1 & 3)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('patent_current_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return USER_ACCOUNTS[0]; // Default: Pranav Bhat (Super Admin)
  });

  // Interconnected Clients State from core.clients (Requirement 12)
  const [clients, setClients] = useState([]);

  // Tags State (Requirement 10)
  const [tags, setTags] = useState(() => {
    try {
      const saved = localStorage.getItem('patent_custom_tags');
      return saved ? JSON.parse(saved) : DEFAULT_TAGS;
    } catch {
      return DEFAULT_TAGS;
    }
  });

  // Audit Logs State (Requirement 7)
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('patent_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Firm Settings & Zoho Integrations (Requirement 14 & 15)
  const [firmSettings, setFirmSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('patent_firm_settings');
      return saved ? JSON.parse(saved) : {
        cliqWebhookUrl: 'https://cliq.zoho.com/api/v2/channelsbyname/patent-alerts/incoming',
        cliqChannel: 'patent-deadlines',
        firmCalendarUrl: 'https://calendar.zoho.com/eventreq/lextria-patents',
        reminderDays: [30, 15, 7, 1],
        drafterCalendarMap: {
          Anusha: 'https://calendar.zoho.com/eventreq/anusha-patents',
          Ayush: 'https://calendar.zoho.com/eventreq/ayush-patents',
          Abhishek: 'https://calendar.zoho.com/eventreq/abhishek-patents',
          Fiona: 'https://calendar.zoho.com/eventreq/fiona-patents',
        }
      };
    } catch {
      return {};
    }
  });

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Theme management
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Persist current user
  useEffect(() => {
    try {
      localStorage.setItem('patent_current_user', JSON.stringify(currentUser));
    } catch {}
  }, [currentUser]);

  // Persist tags
  useEffect(() => {
    try {
      localStorage.setItem('patent_custom_tags', JSON.stringify(tags));
    } catch {}
  }, [tags]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem('patent_firm_settings', JSON.stringify(firmSettings));
    } catch {}
  }, [firmSettings]);

  // Record Audit Log Entry (Requirement 7)
  const recordAuditLog = (action, project_code, details, field_name = null, old_val = null, new_val = null) => {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      project_code,
      action,
      changed_by: currentUser.name,
      user_role: currentUser.role,
      field_name,
      old_value: old_val,
      new_value: new_val,
      details,
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => {
      const updated = [entry, ...prev].slice(0, 500);
      try {
        localStorage.setItem('patent_audit_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Fetch interconnected clients from core.clients on startup (Requirement 12)
  useEffect(() => {
    async function fetchClients() {
      try {
        const { data, error } = await coreDb
          .from('clients')
          .select('id, client_code, client_name')
          .order('client_name');
        if (!error && data && data.length > 0) {
          setClients(data);
        }
      } catch (e) {
        console.warn('Could not load core.clients directly:', e);
      }
    }
    fetchClients();
  }, []);

  // Helper to seed realistic initial client commitment dates for under-drafting matters
  const seedCommitmentDates = (dataList) => {
    const today = new Date();
    return dataList.map((rec, idx) => {
      if (rec.client_commitment_date) return rec;
      const statusColor = (rec.color_code_status || '').toUpperCase();
      const isUnderDrafting =
        ['PURPLE', 'ORANGE', 'YELLOW'].includes(statusColor) ||
        (rec.current_status || '').toLowerCase().includes('draft') ||
        (rec.current_status || '').toLowerCase().includes('signoff');
      if (!isUnderDrafting || rec.is_abandoned) return rec;

      if (idx % 3 === 0 || idx % 5 === 0) {
        const offsetChoices = [2, 3, 4, 5, 7, 9, 12, 14, -2, -4];
        const offset = offsetChoices[idx % offsetChoices.length];
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + offset);
        return {
          ...rec,
          client_commitment_date: targetDate.toISOString().split('T')[0],
        };
      }
      return rec;
    });
  };

  // Fetch initial master records from public asset or Supabase
  useEffect(() => {
    async function loadPortfolioRecords() {
      try {
        const resp = await fetch('/master_records.json');
        if (resp.ok) {
          const rawData = await resp.json();
          const data = seedCommitmentDates(rawData);
          try {
            const rawOverrides = localStorage.getItem('patent_local_overrides');
            if (rawOverrides) {
              const overrides = JSON.parse(rawOverrides);
              const merged = data.map((rec) => {
                const ov = overrides[rec.project_code];
                return ov ? { ...rec, ...ov } : rec;
              });
              const existingCodes = new Set(data.map((r) => r.project_code));
              const extraCreated = Object.values(overrides).filter(
                (r) => r && r.project_code && !existingCodes.has(r.project_code)
              );
              setRecords([...extraCreated, ...merged]);
              return;
            }
          } catch (e) {
            console.warn('Error reading patent_local_overrides:', e);
          }
          setRecords(data);
        }
      } catch (err) {
        console.warn('Failed to load local master_records.json:', err);
      }
    }
    loadPortfolioRecords();
  }, []);

  // Filter records strictly by authenticated drafter (Requirement 3 & Super Admin Drafter Matrix)
  const roleFilteredRecords = useMemo(() => {
    if (currentUser.role === 'DRAFTER' && currentUser.drafterName) {
      return records.filter(
        (r) =>
          r.assigned_to &&
          r.assigned_to.trim().toLowerCase() === currentUser.drafterName.trim().toLowerCase()
      );
    }
    if (currentUser.role === 'SUPER_ADMIN' && selectedDrafterFilter) {
      return records.filter(
        (r) =>
          r.assigned_to &&
          r.assigned_to.trim().toLowerCase() === selectedDrafterFilter.trim().toLowerCase()
      );
    }
    // Super Admin and Paralegal Staff see all firm matters
    return records;
  }, [records, currentUser, selectedDrafterFilter]);

  // Existing project codes for auto-generation
  const existingCodes = useMemo(
    () => records.map((r) => r.project_code),
    [records]
  );

  // ==========================================
  // CRUD 1: CREATE NEW APPLICATION (0ms Optimistic UI)
  // ==========================================
  const handleCreateApplication = (formData) => {
    // Calculate all statutory deadlines automatically
    const statutory = calculateAllStatutoryDeadlines(formData);

    const newRecord = {
      ...formData,
      cs_deadline: statutory.cs_deadline,
      form_1_deadline: statutory.form_1_deadline,
      form_26_deadline: statutory.form_26_deadline,
      rfe_deadline: statutory.rfe_deadline,
      f1_status: formData.form_1_filing_date ? 'Within Deadline' : 'Pending',
      f26_status: formData.form_26_filing_date ? 'Within Deadline' : 'Pending',
      created_at: new Date().toISOString(),
    };

    // 1. Update state immediately (0ms instant UI update)
    setRecords((prev) => [newRecord, ...prev]);

    // 2. Persist to local overrides immediately
    try {
      const overrides = JSON.parse(localStorage.getItem('patent_local_overrides') || '{}');
      overrides[newRecord.project_code] = newRecord;
      localStorage.setItem('patent_local_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.warn('Failed to save to localStorage overrides:', e);
    }

    // 3. Record audit log (Requirement 7)
    recordAuditLog(
      'CREATE_APPLICATION',
      newRecord.project_code,
      `Created patent application: ${newRecord.title} (Assigned to: ${newRecord.assigned_to})`
    );

    showToast(`Application ${newRecord.project_code} created successfully!`);

    // 4. Background non-blocking sync with Supabase (with 3-second timeout protection)
    (async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Sync timeout')), 3000)
        );

        const syncTask = async () => {
          await patentDb.from('applications').insert({
            project_code: newRecord.project_code,
            title: newRecord.title,
            application_number: newRecord.application_number || null,
            specification_type: newRecord.specification_type || 'PS',
            record_category: newRecord.record_category || 'INTERNAL_FILING',
            classification: Array.isArray(newRecord.tags) ? newRecord.tags.join(', ') : (newRecord.classification || null),
            applicant_name: newRecord.applicant_name || null,
            entity_category: newRecord.entity_category || null,
            is_mahe: Boolean(newRecord.is_mahe),
            assigned_to: newRecord.assigned_to || null,
            current_status: newRecord.current_status || 'PS Not Yet Filed',
            color_code_status: newRecord.color_code_status || 'PURPLE',
            workdrive_folder_url: newRecord.workdrive_folder_url || null,
            inventors_summary: newRecord.inventors_summary || null,
          });

          await patentDb.from('prosecution_dates').insert({
            project_code: newRecord.project_code,
            ps_filing_date: newRecord.ps_filing_date || null,
            post_dated_date: newRecord.post_dated_date || null,
            cs_deadline: newRecord.cs_deadline || null,
          });

          await patentDb.from('forms_tracker').insert({
            project_code: newRecord.project_code,
            form_1_deadline: newRecord.form_1_deadline || null,
            form_26_deadline: newRecord.form_26_deadline || null,
            f1_status: newRecord.f1_status,
            f26_status: newRecord.f26_status,
          });
        };

        await Promise.race([syncTask(), timeoutPromise]);
      } catch (err) {
        console.warn('Background Supabase creation sync notice:', err?.message || err);
      }
    })();
  };

  // ==========================================
  // CRUD 2: UPDATE APPLICATION (0ms Optimistic UI)
  // ==========================================
  const handleUpdateApplication = (projectCode, updatedFields) => {
    // Recalculate all statutory deadlines
    const existing = records.find((r) => r.project_code === projectCode) || {};
    const merged = { ...existing, ...updatedFields };
    const statutory = calculateAllStatutoryDeadlines(merged);

    const finalizedRecord = {
      ...merged,
      cs_deadline: statutory.cs_deadline,
      form_1_deadline: statutory.form_1_deadline,
      form_26_deadline: statutory.form_26_deadline,
      rfe_deadline: statutory.rfe_deadline,
      fer_reply_deadline: statutory.fer_reply_deadline,
      ws_deadline: statutory.ws_deadline,
      f1_status: updatedFields.form_1_filing_date ? 'Within Deadline' : (merged.f1_status || 'Pending'),
      f26_status: updatedFields.form_26_filing_date ? 'Within Deadline' : (merged.f26_status || 'Pending'),
      updated_at: new Date().toISOString(),
    };

    // 1. Update state immediately (0ms instant UI update)
    setRecords((prev) =>
      prev.map((r) => (r.project_code === projectCode ? finalizedRecord : r))
    );

    if (selectedRecord && selectedRecord.project_code === projectCode) {
      setSelectedRecord(finalizedRecord);
    }

    // 2. Persist to local storage overrides immediately
    try {
      const overrides = JSON.parse(localStorage.getItem('patent_local_overrides') || '{}');
      overrides[projectCode] = finalizedRecord;
      localStorage.setItem('patent_local_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.warn('Failed to save to localStorage overrides:', e);
    }

    // 3. Record audit log & detect client delivery commitment updates
    const tagSummary = Array.isArray(finalizedRecord.tags) && finalizedRecord.tags.length > 0
      ? ` Tags: [${finalizedRecord.tags.join(', ')}]`
      : '';

    const commitmentChanged =
      updatedFields.client_commitment_date !== undefined &&
      updatedFields.client_commitment_date !== existing.client_commitment_date;

    if (commitmentChanged) {
      recordAuditLog(
        'COMMITMENT_DATE_CHANGED',
        projectCode,
        `Client delivery commitment set to ${updatedFields.client_commitment_date || 'Cleared'} (Organisation & Team SPOC notified).`,
        'client_commitment_date',
        existing.client_commitment_date,
        updatedFields.client_commitment_date
      );
      showToast(
        `Client delivery commitment updated for ${projectCode}. Organisation & Team SPOC notified.`,
        'warning'
      );

      // Dispatch automated notification to Zoho Cliq webhook if configured
      if (firmSettings && firmSettings.cliqWebhookUrl) {
        try {
          fetch(firmSettings.cliqWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 **Client Commitment Alert**: Matter **${projectCode}** (${finalizedRecord.title?.slice(0, 50) || 'Patent Draft'}) delivery date set to **${updatedFields.client_commitment_date || 'Cleared'}** by ${currentUser.name} (${currentUser.role}). Organisation & Team SPOC alerted.`
            })
          }).catch((err) => console.warn('Webhook notification notice:', err));
        } catch {}
      }
    } else {
      recordAuditLog(
        'UPDATE_APPLICATION',
        projectCode,
        `Updated matter details: Status -> ${finalizedRecord.current_status}, Drafter -> ${finalizedRecord.assigned_to}.${tagSummary}`
      );
      showToast(`Application ${projectCode} updated successfully!`);
    }

    // 4. Background non-blocking sync with Supabase (with 3-second timeout protection)
    (async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Sync timeout')), 3000)
        );

        const syncTask = async () => {
          // 1. Applications table
          await patentDb
            .from('applications')
            .update({
              title: finalizedRecord.title,
              application_number: finalizedRecord.application_number || null,
              patent_number: finalizedRecord.patent_number || null,
              specification_type: finalizedRecord.specification_type || 'PS',
              classification: Array.isArray(finalizedRecord.tags)
                ? finalizedRecord.tags.join(', ')
                : (finalizedRecord.classification || null),
              applicant_name: finalizedRecord.applicant_name || null,
              assigned_to: finalizedRecord.assigned_to || null,
              current_status: finalizedRecord.current_status,
              color_code_status: finalizedRecord.color_code_status,
              workdrive_folder_url: finalizedRecord.workdrive_folder_url || null,
              inventors_summary: finalizedRecord.inventors_summary || null,
            })
            .eq('project_code', projectCode);

          // 2. Prosecution dates
          await patentDb
            .from('prosecution_dates')
            .upsert({
              project_code: projectCode,
              ps_filing_date: finalizedRecord.ps_filing_date || null,
              post_dated_date: finalizedRecord.post_dated_date || null,
              cs_filing_date: finalizedRecord.cs_filing_date || null,
              cs_deadline: finalizedRecord.cs_deadline || null,
              publication_date: finalizedRecord.publication_date || null,
              fer_notice_date: finalizedRecord.fer_notice_date || null,
              fer_reply_filing_date: finalizedRecord.fer_reply_filing_date || null,
              fer_reply_deadline: finalizedRecord.fer_reply_deadline || null,
              hearing_date: finalizedRecord.hearing_date || null,
              ws_filing_date: finalizedRecord.ws_filing_date || null,
              ws_deadline: finalizedRecord.ws_deadline || null,
              grant_date: finalizedRecord.grant_date || null,
            });

          // 3. Forms tracker
          await patentDb
            .from('forms_tracker')
            .upsert({
              project_code: projectCode,
              form_1_filing_date: finalizedRecord.form_1_filing_date || null,
              form_1_deadline: finalizedRecord.form_1_deadline || null,
              f1_status: finalizedRecord.f1_status || 'Pending',
              form_26_filing_date: finalizedRecord.form_26_filing_date || null,
              form_26_deadline: finalizedRecord.form_26_deadline || null,
              f26_status: finalizedRecord.f26_status || 'Pending',
              form_3_filing_date: finalizedRecord.form_3_filing_date || null,
              form_18_filing_date: finalizedRecord.form_18_filing_date || null,
              rfe_deadline: finalizedRecord.rfe_deadline || null,
            });
        };

        await Promise.race([syncTask(), timeoutPromise]);
      } catch (err) {
        console.warn('Background Supabase update notice:', err?.message || err);
      }
    })();
  };

  // ==========================================
  // CRUD 3: SAVE MANUAL SENIOR NOTES (0ms Optimistic UI)
  // ==========================================
  const handleSaveManualNotes = (projectCode, notesData) => {
    let updatedRecord = null;
    setRecords((prev) =>
      prev.map((r) => {
        if (r.project_code === projectCode) {
          updatedRecord = { ...r, ...notesData, updated_at: new Date().toISOString() };
          return updatedRecord;
        }
        return r;
      })
    );

    if (selectedRecord && selectedRecord.project_code === projectCode) {
      setSelectedRecord((prev) => ({ ...prev, ...notesData }));
    }

    try {
      const overrides = JSON.parse(localStorage.getItem('patent_local_overrides') || '{}');
      if (updatedRecord) {
        overrides[projectCode] = updatedRecord;
        localStorage.setItem('patent_local_overrides', JSON.stringify(overrides));
      }
    } catch (e) {
      console.warn('Failed to save notes override:', e);
    }

    recordAuditLog(
      'SAVE_NOTES',
      projectCode,
      `Updated senior notes and actions for ${projectCode}`
    );

    showToast(`Internal notes for ${projectCode} saved.`);
  };

  // Handle deadline completion in Deadlines Checklist (Requirement 8)
  const handleDeadlineActionComplete = (itemId, isDone, item) => {
    recordAuditLog(
      isDone ? 'DEADLINE_TICK' : 'DEADLINE_UNTICK',
      item.project_code,
      `${isDone ? 'Marked complete' : 'Reopened'} statutory deadline: ${item.typeLabel} (${item.statutoryRef})`,
      'deadline_status',
      isDone ? 'PENDING' : 'COMPLETED',
      isDone ? 'COMPLETED' : 'PENDING'
    );
    showToast(`${item.project_code}: ${item.typeLabel} marked as ${isDone ? 'Completed' : 'Pending'}`);
  };

  // Handle smart importer success
  const handleImportSuccess = (importedCount, stagedRecords) => {
    setRecords((prev) => [...stagedRecords, ...prev]);
    recordAuditLog(
      'BULK_IMPORT',
      'PORTFOLIO',
      `Imported ${importedCount} records via Smart Importer`
    );
    showToast(`Successfully imported ${importedCount} applications into firm portfolio!`);
  };

  // Handle standard quick export
  const handleQuickExport = (dataToExport, presetName) => {
    exportToExcel(dataToExport, presetName);
    showToast(`Exported ${dataToExport.length} matters to Excel.`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--page)',
        color: 'var(--ink)',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            padding: '12px 20px',
            borderRadius: '8px',
            background: toast.type === 'error' ? '#EF4444' : '#10B981',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main App Navigation Header */}
      <header
        style={{
          height: '60px',
          padding: '0 24px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Left: Firm Brand & Product */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '16px',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.35)',
              }}
            >
              L
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.2px', color: 'var(--ink)' }}>
                LEXTRIA IP
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '-2px', fontWeight: 600 }}>
                Patent Prosecution & Docketing Dashboard
              </div>
            </div>
          </div>
        </div>

        {/* Center: Functional Navigation Tabs (Requirement 1 - NOT role tabs) */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--page)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--line)',
          }}
        >
          {/* Tab 1: Portfolio Master */}
          <button
            onClick={() => setActiveNavTab('PORTFOLIO')}
            style={{
              padding: '7px 16px',
              borderRadius: '7px',
              border: 'none',
              background: activeNavTab === 'PORTFOLIO' ? 'var(--surface)' : 'transparent',
              color: activeNavTab === 'PORTFOLIO' ? 'var(--ink)' : 'var(--muted)',
              fontSize: '12.5px',
              fontWeight: activeNavTab === 'PORTFOLIO' ? 800 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeNavTab === 'PORTFOLIO' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <FolderKanban size={15} color={activeNavTab === 'PORTFOLIO' ? 'var(--accent)' : 'currentColor'} />
            Portfolio Master
          </button>

          {/* Tab 2: Deadlines Checklist (Requirement 8) */}
          <button
            onClick={() => setActiveNavTab('DEADLINES')}
            style={{
              padding: '7px 16px',
              borderRadius: '7px',
              border: 'none',
              background: activeNavTab === 'DEADLINES' ? 'var(--surface)' : 'transparent',
              color: activeNavTab === 'DEADLINES' ? 'var(--ink)' : 'var(--muted)',
              fontSize: '12.5px',
              fontWeight: activeNavTab === 'DEADLINES' ? 800 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeNavTab === 'DEADLINES' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Action-based statutory checklist where you tick completed filings"
          >
            <CheckSquare size={15} color={activeNavTab === 'DEADLINES' ? '#10B981' : 'currentColor'} />
            Deadlines Checklist
          </button>

          {/* Tab 3: Calendar View (Requirement 14) */}
          <button
            onClick={() => setActiveNavTab('CALENDAR')}
            style={{
              padding: '7px 16px',
              borderRadius: '7px',
              border: 'none',
              background: activeNavTab === 'CALENDAR' ? 'var(--surface)' : 'transparent',
              color: activeNavTab === 'CALENDAR' ? 'var(--ink)' : 'var(--muted)',
              fontSize: '12.5px',
              fontWeight: activeNavTab === 'CALENDAR' ? 800 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeNavTab === 'CALENDAR' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Monthly statutory deadline calendar with Zoho Calendar sync"
          >
            <Calendar size={15} color={activeNavTab === 'CALENDAR' ? '#8B5CF6' : 'currentColor'} />
            Calendar View
          </button>
        </nav>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* New Application Button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              padding: '7px 13px',
              borderRadius: '7px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Plus size={14} /> New Application
          </button>

          {/* Export Report Modal Button (Requirement 9) */}
          <button
            onClick={() => {
              setExportRecordsSelection(roleFilteredRecords);
              setIsExportOpen(true);
            }}
            style={{
              padding: '7px 12px',
              borderRadius: '7px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Generate custom report with selected columns"
          >
            <Download size={14} /> Export
          </button>

          {/* TV Screen Departure Board Button (Requirement 16) */}
          <button
            onClick={() => setIsTvMode(true)}
            style={{
              padding: '7px 12px',
              borderRadius: '7px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Launch Fullscreen Operations TV Board"
          >
            <Tv size={14} color="#C98A2C" /> TV Board
          </button>

          {/* Firm Settings Button (Requirement 10, 14, 15) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '7px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Settings (Custom Tags, Zoho Cliq, Zoho Calendar, Audit History)"
          >
            <Settings size={15} />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '7px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Toggle Light / Dark Mode"
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* User Account / Profile Switcher Pill (Requirement 1 & 3) */}
          <button
            onClick={() => setIsAuthOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px 4px 5px',
              borderRadius: '20px',
              background: 'var(--page)',
              border: '1px solid var(--line)',
              cursor: 'pointer',
              color: 'var(--ink)',
              transition: 'all 0.15s ease',
            }}
            title="Click to switch authenticated user account"
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: currentUser.color || '#3B82F6',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {currentUser.initials}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, lineHeight: 1.1 }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--muted)', fontWeight: 600 }}>
                {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : (currentUser.role === 'PARALEGAL' ? 'Paralegal' : 'Drafter')}
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Drafter Filter Context Banner (Only when logged in as a Drafter) */}
      {currentUser.role === 'DRAFTER' && (
        <div
          style={{
            padding: '6px 24px',
            background: 'rgba(139, 92, 246, 0.08)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#7C3AED',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={14} />
            <span>
              <strong>Drafter Workspace:</strong> Logged in as <strong>{currentUser.name}</strong> ({roleFilteredRecords.length} assigned patent matters).
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Switch account via profile pill to access firm-wide docket.
          </span>
        </div>
      )}

      {/* Main Workspace Body */}
      <main
        style={{
          flex: 1,
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* VIEW 1: PORTFOLIO MASTER */}
        {activeNavTab === 'PORTFOLIO' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* KPI Alert Ribbon */}
            <KpiAlertRibbon
              records={roleFilteredRecords}
              activeFilter={activeKpiFilter}
              onSelectFilter={(filterId) => setActiveKpiFilter(filterId)}
              userRole={currentUser.role}
              currentDrafterName={currentUser.drafterName || currentUser.name}
              allRecords={records}
              selectedDrafterFilter={selectedDrafterFilter}
              onSelectDrafter={(drafter) => setSelectedDrafterFilter(drafter)}
            />

            {/* Super Admin Drafter Filter Context Banner */}
            {currentUser.role === 'SUPER_ADMIN' && selectedDrafterFilter && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  marginTop: '10px',
                  fontSize: '12px',
                  color: '#1D4ED8',
                  fontWeight: 700,
                }}
              >
                <span>
                  Filtering firm portfolio for Drafter: <strong>{selectedDrafterFilter}</strong> ({roleFilteredRecords.length} assigned matters)
                </span>
                <button
                  onClick={() => setSelectedDrafterFilter(null)}
                  style={{
                    background: '#2563EB',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Clear Filter (Show All Firm Cases)
                </button>
              </div>
            )}

            {/* Streamlined Virtualized Table Data Grid (Requirement 11) */}
            <div style={{ flex: 1, overflow: 'hidden', marginTop: '12px' }}>
              <MasterDataGrid
                records={roleFilteredRecords}
                onSelectRecord={(rec) => setSelectedRecord(rec)}
                selectedCode={selectedRecord?.project_code}
                onOpenImport={() => setIsImporterOpen(true)}
                onExportExcel={handleQuickExport}
                onOpenExportReport={(subset) => {
                  setExportRecordsSelection(subset);
                  setIsExportOpen(true);
                }}
                activeKpiFilter={activeKpiFilter}
                onClearKpiFilter={() => setActiveKpiFilter(null)}
                onOpenCreate={() => setIsCreateOpen(true)}
                onOpenEdit={(rec) => setEditingRecord(rec)}
                onOpenTimeline={(rec) => setTimelineRecord(rec)}
                userRole={currentUser.role}
                selectedDrafter={currentUser.drafterName}
                clients={clients}
                tags={tags}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: DEADLINES CHECKLIST (Requirement 8) */}
        {activeNavTab === 'DEADLINES' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DeadlinesTab
              records={roleFilteredRecords}
              currentUser={currentUser}
              onOpenDrawer={(rec) => setSelectedRecord(rec)}
              onOpenTimeline={(rec) => setTimelineRecord(rec)}
              onActionComplete={handleDeadlineActionComplete}
            />
          </div>
        )}

        {/* VIEW 3: CALENDAR VIEW (Requirement 14) */}
        {activeNavTab === 'CALENDAR' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CalendarView
              records={roleFilteredRecords}
              currentUser={currentUser}
              onOpenDrawer={(rec) => setSelectedRecord(rec)}
              onOpenTimeline={(rec) => setTimelineRecord(rec)}
            />
          </div>
        )}
      </main>

      {/* Slide-Over Detail Drawer */}
      {selectedRecord && (
        <SlideOverDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSaveManualNotes={handleSaveManualNotes}
          onUpdate={handleUpdateApplication}
          tags={tags}
          onOpenEdit={(rec) => setEditingRecord(rec)}
          onOpenTimeline={(rec) => setTimelineRecord(rec)}
          auditLogs={auditLogs.filter((l) => l.project_code === selectedRecord.project_code)}
        />
      )}

      {/* User Accounts Switcher Modal (Requirement 1 & 3) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onSelectUser={(user) => {
          setCurrentUser(user);
          showToast(`Logged in as ${user.name} (${user.roleLabel})`);
        }}
      />

      {/* Settings Modal (Requirement 10, 14, 15) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tags={tags}
        onSaveTags={(updatedTags) => {
          setTags(updatedTags);
          showToast('Custom tags updated successfully!');
        }}
        auditLogs={auditLogs}
        settings={firmSettings}
        onSaveSettings={(updatedSettings) => {
          setFirmSettings(updatedSettings);
          showToast('Firm settings and Zoho integrations saved!');
        }}
      />

      {/* Export Report Modal (Requirement 9) */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => {
          setIsExportOpen(false);
          setExportRecordsSelection(null);
        }}
        records={records}
        selectedRecords={exportRecordsSelection || []}
      />

      {/* Create New Application Modal */}
      <CreateApplicationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateApplication}
        existingCodes={existingCodes}
        clients={clients}
        tags={tags}
      />

      {/* Edit Application Modal */}
      <EditApplicationModal
        isOpen={!!editingRecord}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onUpdate={handleUpdateApplication}
        clients={clients}
        tags={tags}
      />

      {/* Master Statutory Prosecution Timeline Modal */}
      <MasterTimelineModal
        isOpen={!!timelineRecord}
        record={timelineRecord}
        onClose={() => setTimelineRecord(null)}
      />

      {/* Smart Excel & CSV Staging Importer Modal */}
      <SmartImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Enhanced Live Due Board TV Mode (Requirement 16) */}
      {isTvMode && (
        <LiveDueBoard
          records={roleFilteredRecords}
          onBack={() => setIsTvMode(false)}
          onSelectRecord={(rec) => {
            setIsTvMode(false);
            setSelectedRecord(rec);
          }}
        />
      )}
    </div>
  );
}