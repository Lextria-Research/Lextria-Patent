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
import LoginPage from './components/LoginPage';
import {
  getCurrentUser,
  setCurrentUser as setStoredUser,
  logout,
  isSuperAdmin,
  isParalegal,
  isDrafter,
  getRoleLabel
} from './lib/authStore';
import DeadlinesTab from './components/DeadlinesTab';
import CalendarView from './components/CalendarView';
import FormalitiesDocket from './components/FormalitiesDocket';
import AdminTeamOverview from './components/AdminTeamOverview';
import ReassignMatterModal from './components/ReassignMatterModal';
import SettingsModal from './components/SettingsModal';
import ExportReportModal from './components/ExportReportModal';
import CliqAssignmentModal from './components/CliqAssignmentModal';
import { exportToExcel } from './utils/exportEngine';
import { calculateAllStatutoryDeadlines } from './utils/statutoryDeadlines';
import { normalizeStatus } from './constants/patentStatuses';
import { supabase, patentDb, coreDb } from './lib/supabase';
import {
  ensurePatentProjectCode,
  publishPatentMatterEvent,
  recordOfficialGovtFee,
  resolveClientId
} from './lib/ecosystemSync';
import DEFAULT_CLIENTS from './data/clients.json';
import {
  FolderKanban, CheckSquare, Calendar, Tv, Moon, Sun, Settings, LogOut,
  Plus, Download, UserCheck, Shield, Briefcase, Scale,
  Sparkles, CheckCircle2, AlertTriangle, Layers, Users, Zap
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
  const [drawerInitialTab, setDrawerInitialTab] = useState('overview');

  const handleOpenTimeline = (rec) => {
    setSelectedRecord(rec);
    setDrawerInitialTab('timeline');
  };

  const handleSelectRecord = (rec) => {
    setSelectedRecord(rec);
    setDrawerInitialTab('overview');
  };
  const [activeKpiFilter, setActiveKpiFilter] = useState(null);
  const [activeNavTab, setActiveNavTab] = useState(() => {
    try {
      const savedUser = getCurrentUser();
      if (savedUser && isDrafter(savedUser)) return 'PORTFOLIO';
    } catch {}
    return 'TEAM_OVERVIEW'; // Default for Super Admin & Paralegal
  });
  
  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportRecordsSelection, setExportRecordsSelection] = useState(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCliqModalOpen, setIsCliqModalOpen] = useState(false);

  // Zoho Cliq Assignment Queue with Notification Badge
  const [cliqQueue, setCliqQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('lextria_cliq_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse lextria_cliq_queue', e);
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const d3mStr = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    return [
      {
        id: 'cliq_pending_1',
        raw_message: 'Assign AR45 to Anusha - Title: Smart Automated Crop Harvesting System - Client: MAHE',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        status: 'PENDING_REVIEW',
        record: {
          project_code: 'AR45',
          title: 'Smart Automated Crop Harvesting System',
          assigned_to: 'Anusha',
          applicant_name: 'Manipal Academy of Higher Education (MAHE)',
          is_mahe: true,
          specification_type: 'PS',
          current_status: 'Idf sent, awaiting data',
          color_code_status: 'PURPLE',
          is_transferred_case: false,
          former_attorney_transfer: false,
          transfer_date: '',
          form_13_required: false,
          form_13_status: 'Not Applicable',
          form_13_deadline: '',
          form_26_deadline: '',
          ps_filing_date: '',
          cs_filing_date: '',
          client_commitment_date: '',
          status_notes: 'Pre-filing matter assigned via Zoho Cliq to Anusha. Form-13 is not required.',
          selectedTags: ['Cliq Assigned', 'MAHE']
        }
      },
      {
        id: 'cliq_pending_2',
        raw_message: 'Assign AR46 to Fiona - Transfer from former attorney, patent already filed (App No: 202341054321), FER Received on 15/09/2026. File Form 13 & Form 26.',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        status: 'PENDING_REVIEW',
        record: {
          project_code: 'AR46',
          title: 'High-Efficiency Multi-Band Antenna for Satellite Communication',
          application_number: '202341054321',
          assigned_to: 'Fiona',
          applicant_name: 'Manipal Academy of Higher Education (MAHE)',
          is_mahe: true,
          specification_type: 'PS',
          current_status: 'FER Received',
          color_code_status: 'BLUE',
          is_transferred_case: true,
          former_attorney_transfer: true,
          transfer_date: todayStr,
          form_13_required: true,
          form_13_status: 'Pending',
          form_13_deadline: d3mStr,
          form_26_deadline: d3mStr,
          ps_filing_date: '2023-09-15',
          cs_filing_date: '',
          client_commitment_date: '',
          status_notes: '⚡ FORMER ATTORNEY TRANSFER (TAKEOVER CASE): Form-13 (Address for Service) and Form-26 transfer POA required within 3 months.',
          selectedTags: ['Cliq Assigned', 'MAHE', 'Former Attorney Transfer', 'Form 13 Req']
        }
      }
    ];
  });

  const pendingCliqCount = useMemo(() => {
    return cliqQueue.filter(q => q.status === 'PENDING_REVIEW').length;
  }, [cliqQueue]);

  const handleUpdateCliqQueue = (updatedQueue) => {
    setCliqQueue(updatedQueue);
    try {
      localStorage.setItem('lextria_cliq_queue', JSON.stringify(updatedQueue));
    } catch (e) {
      console.error('Error saving cliq queue to localStorage', e);
    }
  };

  // Poll / sync Cliq queue from backend
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await fetch('/api/cliq-queue');
        if (res.ok) {
          const data = await res.json();
          if (data.queue && Array.isArray(data.queue)) {
            setCliqQueue(data.queue);
            localStorage.setItem('lextria_cliq_queue', JSON.stringify(data.queue));
          }
        }
      } catch (err) {
        // Fallback to localStorage
      }
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);
  const [editingRecord, setEditingRecord] = useState(null);
  // timelineRecord replaced by SlideOverDrawer Master Timeline tab
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignSourceDrafter, setReassignSourceDrafter] = useState(null);
  const [reassignRecord, setReassignRecord] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedDrafterFilter, setSelectedDrafterFilter] = useState(null);

  // Authenticated User Account State (Requirement 1 & 3)
  // Authenticated User Account State (Strictly ephemeral: refresh & links always open at Login)
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  // Interconnected Clients State from core.clients (Requirement 12)
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem('patent_cached_clients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CLIENTS;
  });

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



  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setSelectedRecord(null);
    showToast('You have been securely signed out.');
  };

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
          .select('id, client_code, client_name, entity_type, email, phone, gstin, pan, billing_address, state_code, workdrive_folder_id')
          .order('client_name');
        if (!error && Array.isArray(data) && data.length > 0) {
          setClients(data);
          try {
            localStorage.setItem('patent_cached_clients', JSON.stringify(data));
          } catch {}
          return;
        }
      } catch (e) {
        console.warn('Could not load core.clients directly from Supabase:', e);
      }

      // Fallback to static asset if network was delayed
      try {
        const resp = await fetch('/clients.json');
        if (resp.ok) {
          const staticClients = await resp.json();
          if (Array.isArray(staticClients) && staticClients.length > 0) {
            setClients(staticClients);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not load static clients.json:', e);
      }

      // Ultimate fallback: DEFAULT_CLIENTS (211 interconnected firm clients)
      setClients((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : DEFAULT_CLIENTS));
    }
    fetchClients();
  }, []);

  // Fetch active firm staff members from core.profiles for drafter resolution & team assignment
  useEffect(() => {
    async function fetchStaffMembers() {
      try {
        const { data, error } = await coreDb
          .from('profiles')
          .select('id, display_name, email, role, department')
          .eq('active', true)
          .order('display_name');

        if (!error && Array.isArray(data) && data.length > 0) {
          const staffMembers = data.filter((p) => {
            const email = (p.email || '').toLowerCase();
            const role = (p.role || '').toUpperCase();
            return role !== 'CLIENT' && !email.includes('@client.');
          });
          localStorage.setItem('patent_cached_team_members', JSON.stringify(staffMembers));
        }
      } catch (e) {
        console.warn('Could not sync staff profiles in Patent Dashboard:', e);
      }
    }
    fetchStaffMembers();
  }, []);

  // Synchronize newly created client across local state & cache (Requirement 3)
  const handleClientCreated = (newClient) => {
    if (!newClient) return;
    setClients((prev) => {
      const exists = prev.some((c) => c.id === newClient.id || (c.client_code && c.client_code === newClient.client_code));
      const updated = exists ? prev.map((c) => (c.id === newClient.id ? newClient : c)) : [newClient, ...prev];
      try {
        localStorage.setItem('patent_cached_clients', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

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
          const data = seedCommitmentDates(rawData).map((r) => {
            const pd = r.prosecution_dates || {};
            const ft = r.forms_tracker || {};
            return {
              ...pd,
              ...ft,
              ...r,
              id: r.id,
              current_status: normalizeStatus(r.current_status, r.specification_type)
            };
          });
          try {
            const rawOverrides = localStorage.getItem('patent_local_overrides');
            if (rawOverrides) {
              const overrides = JSON.parse(rawOverrides);
              let overridesChanged = false;
              // Clean up stale or erroneous ps_filing_date on Direct CS matters (e.g. RT01)
              Object.keys(overrides).forEach((code) => {
                const ov = overrides[code];
                if (ov && (ov.specification_type || '').toUpperCase() === 'CS' && ov.ps_filing_date) {
                  ov.ps_filing_date = null;
                  overridesChanged = true;
                }
              });
              if (overridesChanged) {
                try {
                  localStorage.setItem('patent_local_overrides', JSON.stringify(overrides));
                } catch {}
              }

              const merged = data.map((rec) => {
                const ov = overrides[rec.project_code];
                if (ov) {
                  const updated = { ...rec, ...ov };
                  if ((updated.specification_type || '').toUpperCase() === 'CS') {
                    updated.ps_filing_date = null;
                  }
                  updated.current_status = normalizeStatus(updated.current_status, updated.specification_type);
                  return updated;
                }
                return rec;
              });
              const existingCodes = new Set(data.map((r) => r.project_code));
              const extraCreated = Object.values(overrides).filter(
                (r) => r && r.project_code && !existingCodes.has(r.project_code)
              ).map((r) => ({
                ...r,
                current_status: normalizeStatus(r.current_status, r.specification_type)
              }));
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
    if (!currentUser) return records;
    if (isDrafter(currentUser)) {
      const drafterKey = (currentUser.drafterName || currentUser.name || '').trim().toLowerCase();
      return records.filter(
        (r) =>
          r.assigned_to &&
          r.assigned_to.trim().toLowerCase() === drafterKey
      );
    }
    if (isSuperAdmin(currentUser) && selectedDrafterFilter) {
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
          const resolvedClientId = newRecord.client_id || (await resolveClientIdAsync(newRecord.applicant_name, newRecord.is_mahe, newRecord.project_code, clients));
          const isMahe = Boolean(resolvedClientId === MAHE_CLIENT_ID || (newRecord.applicant_name && /manipal|mahe/i.test(newRecord.applicant_name)));
          const validEntityCategory = normalizeEntityCategory(newRecord.entity_category, isMahe);
          const pcId = await ensurePatentProjectCode({
            ...newRecord,
            client_id: resolvedClientId,
            is_mahe: isMahe,
            entity_category: validEntityCategory,
          }, clients);

          await patentDb.from('applications').insert({
            project_code: newRecord.project_code,
            project_code_id: pcId,
            client_id: resolvedClientId,
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

          // Ecosystem Interlinking: Publish filing matter event ONLY IF actually filed at Patent Office
          const statusLower = (newRecord.current_status || '').toLowerCase().trim();
          const isFiled = ['patent filed', 'ps filed', 'cs filed', 'published', 'fer', 'examination', 'hearing', 'granted'].some(s => statusLower.includes(s)) || Boolean(newRecord.application_number && !newRecord.application_number.toLowerCase().includes('not filed'));

          if (isFiled) {
            const isCS = (newRecord.specification_type || '').toUpperCase() === 'CS';
            await publishPatentMatterEvent({
              projectCode: newRecord.project_code,
              projectCodeId: pcId,
              eventCode: isCS ? 'CS_FILED' : 'PS_FILED',
              title: isCS ? `Complete Patent Application Lodged: ${newRecord.title || newRecord.project_code}` : `Provisional Patent Application Lodged: ${newRecord.title || newRecord.project_code}`,
              detail: `Filed with Indian Patent Office. Applicant: ${newRecord.applicant_name || 'Client'}`,
              occurredAt: (isCS ? newRecord.cs_filing_date : newRecord.ps_filing_date) || new Date().toISOString(),
              clientVisible: true,
              clientLabel: isCS ? 'Complete specification filed' : 'Provisional application filed',
            });
          }
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

    const newCode = (updatedFields.project_code && updatedFields.project_code.trim()) || projectCode;

    const isShiftOrAbandon = (updatedFields.current_status || '').toLowerCase().includes('ip shift') ||
      (updatedFields.current_status || '').toLowerCase().includes('abandon') ||
      (updatedFields.color_code_status || '').toUpperCase() === 'RED';

    const finalizedRecord = {
      ...merged,
      project_code: newCode,
      ...(isShiftOrAbandon ? { is_abandoned: true, color_code_status: 'RED' } : {}),
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

    // 2. Persist to local storage overrides immediately and migrate if code changed
    try {
      const overrides = JSON.parse(localStorage.getItem('patent_local_overrides') || '{}');
      if (newCode !== projectCode) {
        delete overrides[projectCode];
        try {
          const invOld = localStorage.getItem(`patent_inventors_${projectCode}`);
          if (invOld) {
            localStorage.setItem(`patent_inventors_${newCode}`, invOld);
            localStorage.removeItem(`patent_inventors_${projectCode}`);
          }
          const miscOld = localStorage.getItem(`patent_misc_forms_${projectCode}`);
          if (miscOld) {
            localStorage.setItem(`patent_misc_forms_${newCode}`, miscOld);
            localStorage.removeItem(`patent_misc_forms_${projectCode}`);
          }
        } catch {}
      }
      overrides[newCode] = finalizedRecord;
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
          const resolvedClientId = finalizedRecord.client_id || (await resolveClientIdAsync(finalizedRecord.applicant_name, finalizedRecord.is_mahe, finalizedRecord.project_code, clients));
          const isMahe = Boolean(resolvedClientId === MAHE_CLIENT_ID || (finalizedRecord.applicant_name && /manipal|mahe/i.test(finalizedRecord.applicant_name)));
          const validEntityCategory = normalizeEntityCategory(finalizedRecord.entity_category, isMahe);
          const pcId = await ensurePatentProjectCode({
            ...finalizedRecord,
            client_id: resolvedClientId,
            is_mahe: isMahe,
            entity_category: validEntityCategory,
          }, clients);

          // 1. Applications table
          await patentDb
            .from('applications')
            .update({
              project_code_id: pcId,
              client_id: resolvedClientId,
              title: finalizedRecord.title,
              application_number: finalizedRecord.application_number || null,
              patent_number: finalizedRecord.patent_number || null,
              specification_type: finalizedRecord.specification_type || 'PS',
              classification: Array.isArray(finalizedRecord.tags)
                ? finalizedRecord.tags.join(', ')
                : (finalizedRecord.classification || null),
              applicant_name: finalizedRecord.applicant_name || null,
              is_mahe: isMahe,
              entity_category: validEntityCategory,
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

          // 4. Milestone Event Detection & Emission into core.matter_events
          if (finalizedRecord.cs_filing_date && finalizedRecord.cs_filing_date !== existing.cs_filing_date) {
            await publishPatentMatterEvent({
              projectCode,
              projectCodeId: pcId,
              eventCode: 'CS_FILED',
              title: `Complete Specification Filed: ${finalizedRecord.title || projectCode}`,
              detail: `Complete specification successfully lodged on ${finalizedRecord.cs_filing_date}`,
              occurredAt: finalizedRecord.cs_filing_date,
              clientVisible: true,
              clientLabel: 'Complete specification filed',
            });
          }

          if (finalizedRecord.form_18_filing_date && finalizedRecord.form_18_filing_date !== existing.form_18_filing_date) {
            await publishPatentMatterEvent({
              projectCode,
              projectCodeId: pcId,
              eventCode: 'RFE_FILED',
              title: `Request for Examination (Form 18) Filed: ${finalizedRecord.title || projectCode}`,
              detail: `Examination requested before the Indian Patent Office on ${finalizedRecord.form_18_filing_date}`,
              occurredAt: finalizedRecord.form_18_filing_date,
              clientVisible: true,
              clientLabel: 'Examination requested',
            });
          }

          if (finalizedRecord.fer_notice_date && finalizedRecord.fer_notice_date !== existing.fer_notice_date) {
            await publishPatentMatterEvent({
              projectCode,
              projectCodeId: pcId,
              eventCode: 'FER_ISSUED',
              title: `First Examination Report (FER) Issued: ${finalizedRecord.title || projectCode}`,
              detail: `Examination report issued by Patent Office on ${finalizedRecord.fer_notice_date}. Reply deadline: ${finalizedRecord.fer_reply_deadline || '6 months'}`,
              occurredAt: finalizedRecord.fer_notice_date,
              clientVisible: true,
              clientLabel: 'First examination report received',
            });
          }

          if (finalizedRecord.fer_reply_filing_date && finalizedRecord.fer_reply_filing_date !== existing.fer_reply_filing_date) {
            await publishPatentMatterEvent({
              projectCode,
              projectCodeId: pcId,
              eventCode: 'FER_REPLY_FILED',
              title: `FER Response Lodged: ${finalizedRecord.title || projectCode}`,
              detail: `Formal response and amended claims submitted to Patent Office on ${finalizedRecord.fer_reply_filing_date}`,
              occurredAt: finalizedRecord.fer_reply_filing_date,
              clientVisible: true,
              clientLabel: 'Response to examination report filed',
            });
          }

          if (finalizedRecord.hearing_date && finalizedRecord.hearing_date !== existing.hearing_date) {
            await publishPatentMatterEvent({
              projectCode,
              projectCodeId: pcId,
              eventCode: 'PATENT_HEARING_ATTENDED',
              title: `Patent Hearing Attended: ${finalizedRecord.title || projectCode}`,
              detail: `Hearing conducted before the Controller of Patents on ${finalizedRecord.hearing_date}`,
              occurredAt: finalizedRecord.hearing_date,
              clientVisible: true,
              clientLabel: 'Hearing held at the Patent Office',
            });
          }

          if (finalizedRecord.ws_filing_date && finalizedRecord.ws_filing_date !== existing.ws_filing_date) {
            await publishPatentMatterEvent({
              projectCode,
              projectCodeId: pcId,
              eventCode: 'PATENT_WS_FILED',
              title: `Post-Hearing Written Submissions Filed: ${finalizedRecord.title || projectCode}`,
              detail: `Rule 28(7) written submission and arguments submitted on ${finalizedRecord.ws_filing_date}`,
              occurredAt: finalizedRecord.ws_filing_date,
              clientVisible: true,
              clientLabel: 'Written submission filed',
            });
          }

          if (finalizedRecord.publication_date && finalizedRecord.publication_date !== existing.publication_date) {
            await publishPatentMatterEvent({
              projectCode,
              projectCodeId: pcId,
              eventCode: 'PATENT_PUBLISHED',
              title: `Patent Published: ${finalizedRecord.title || projectCode}`,
              detail: `Published in the official Patent Office Journal on ${finalizedRecord.publication_date}`,
              occurredAt: finalizedRecord.publication_date,
              clientVisible: true,
              clientLabel: 'Patent published',
            });
          }

          if (finalizedRecord.grant_date && finalizedRecord.grant_date !== existing.grant_date) {
            await publishPatentMatterEvent({
              projectCode,
              projectCodeId: pcId,
              eventCode: 'PATENT_GRANTED',
              title: `Patent Granted: ${finalizedRecord.title || projectCode}`,
              detail: `Patent granted by Indian Patent Office on ${finalizedRecord.grant_date}${finalizedRecord.patent_number ? ' (Patent No: ' + finalizedRecord.patent_number + ')' : ''}`,
              occurredAt: finalizedRecord.grant_date,
              clientVisible: true,
              clientLabel: 'Patent granted',
            });
          }
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

  // Handle smart importer success (Supports bulk import with persistence)
  const handleImportSuccess = (arg1, arg2) => {
    const stagedRecords = Array.isArray(arg1) ? arg1 : (Array.isArray(arg2) ? arg2 : []);
    const importedCount = typeof arg1 === 'number' ? arg1 : stagedRecords.length;
    if (stagedRecords.length === 0) return;

    setRecords((prev) => [...stagedRecords, ...prev]);

    // Persist imported records into local storage overrides so they survive reload
    try {
      const overrides = JSON.parse(localStorage.getItem('patent_local_overrides') || '{}');
      stagedRecords.forEach((rec) => {
        if (rec.project_code) {
          overrides[rec.project_code] = rec;
        }
      });
      localStorage.setItem('patent_local_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.warn('Failed to save imported records to overrides:', e);
    }

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

  // ==========================================
  // SUPER ADMIN: REASSIGNMENT
  // ==========================================
  const handleOpenReassign = (param = null) => {
    if (typeof param === 'string') {
      setReassignSourceDrafter(param);
      setReassignRecord(null);
    } else if (Array.isArray(param)) {
      if (param.length === 1) {
        setReassignRecord(param[0]);
        setReassignSourceDrafter(param[0].assigned_to || null);
      } else {
        setReassignRecord(null);
        setReassignSourceDrafter(param[0]?.assigned_to || null);
      }
    } else if (param && typeof param === 'object') {
      setReassignRecord(param);
      setReassignSourceDrafter(param.assigned_to || null);
    } else {
      setReassignRecord(null);
      setReassignSourceDrafter(null);
    }
    setIsReassignOpen(true);
  };

  const handleReassignBatch = (projectCodes, targetDrafter, reason, notes) => {
    const updatedTimestamp = new Date().toISOString();

    // 1. Immediate optimistic UI state update
    setRecords((prev) =>
      prev.map((r) => {
        if (projectCodes.includes(r.project_code)) {
          return {
            ...r,
            assigned_to: targetDrafter,
            reassignment_reason: reason,
            reassignment_notes: notes || null,
            updated_at: updatedTimestamp,
          };
        }
        return r;
      })
    );

    // 2. Persist in local storage overrides immediately
    try {
      const overrides = JSON.parse(localStorage.getItem('patent_local_overrides') || '{}');
      projectCodes.forEach((code) => {
        const existing = records.find((r) => r.project_code === code) || {};
        overrides[code] = {
          ...existing,
          assigned_to: targetDrafter,
          reassignment_reason: reason,
          reassignment_notes: notes || null,
          updated_at: updatedTimestamp,
        };
        recordAuditLog(
          'REASSIGN_MATTER',
          code,
          `Reassigned from ${existing.assigned_to || 'Unassigned'} to ${targetDrafter}. Reason: ${reason}.${notes ? ` Notes: ${notes}` : ''}`,
          'assigned_to',
          existing.assigned_to,
          targetDrafter
        );
      });
      localStorage.setItem('patent_local_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.warn('Failed to update local overrides for reassignment:', e);
    }

    showToast(
      `Successfully transferred ${projectCodes.length} matter(s) to ${targetDrafter}.`,
      'success'
    );

    // 3. Background non-blocking sync with Supabase
    (async () => {
      try {
        await patentDb
          .from('applications')
          .update({ assigned_to: targetDrafter })
          .in('project_code', projectCodes);
      } catch (err) {
        console.warn('Background Supabase reassignment sync notice:', err);
      }
    })();
  };

  if (!currentUser) {
    return (
      <LoginPage
        onLogin={(user) => {
          setCurrentUser(user);
          if (isSuperAdmin(user) || isParalegal(user)) {
            setActiveNavTab('TEAM_OVERVIEW');
          } else {
            setActiveNavTab('PORTFOLIO');
          }
        }}
      />
    );
  }

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

      {/* Main App Navigation Header: Clean 2-Tier Architecture */}
      <header
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Tier 1: Brand & Global Actions Bar */}
        <div
          style={{
            height: '52px',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {/* Left: Firm Brand & Product */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
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
                flexShrink: 0,
              }}
            >
              L
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.2px', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                LEXTRIA IP
              </span>
              <span style={{ color: 'var(--line)', fontSize: '13px' }}>|</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Patent Prosecution & Docketing Dashboard
              </span>
            </div>
          </div>

          {/* Right: Global Utility Actions & User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

            {/* Reassign Button (Super Admin) */}
            {isSuperAdmin(currentUser) && (
              <button
                onClick={() => handleOpenReassign()}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
                className="action-btn-interactive"
                title="Rebalance workload across associate drafters"
              >
                <UserCheck size={14} /> Reassign
              </button>
            )}

            {/* Quick Zoho Cliq Assignment Intake Button with Red Badge Notification */}
            <button
              onClick={() => setIsCliqModalOpen(true)}
              className="action-btn-interactive"
              style={{
                position: 'relative',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #0284C7',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.1), rgba(14, 165, 233, 0.05))',
                color: '#0284C7',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              title="Review pending assignments from Zoho Cliq channel"
            >
              <Zap size={14} color="#0284C7" /> Cliq Assignment
              {pendingCliqCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#EF4444',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '1px 5px',
                    fontSize: '10px',
                    fontWeight: 900,
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.45)',
                    border: '1.5px solid var(--surface, #fff)',
                    minWidth: '18px',
                    textAlign: 'center',
                    lineHeight: '13px',
                  }}
                >
                  {pendingCliqCount}
                </span>
              )}
            </button>

            {/* New Application Button */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="action-btn-interactive"
              style={{
                padding: '6px 13px',
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

            {/* Export Report Modal Button */}
            <button
              onClick={() => {
                setExportRecordsSelection(roleFilteredRecords);
                setIsExportOpen(true);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
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
              className="action-btn-interactive"
                title="Generate custom report with selected columns"
            >
              <Download size={14} /> Export
            </button>

            {/* TV Screen Departure Board Button */}
            <button
              onClick={() => setIsTvMode(true)}
              style={{
                padding: '6px 11px',
                borderRadius: '6px',
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
              className="action-btn-interactive"
                title="Launch Fullscreen Operations TV Board"
            >
              <Tv size={14} color="#C98A2C" /> TV Board
            </button>

            {/* Firm Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              className="action-btn-interactive"
              title="Settings (Custom Tags, Zoho Integrations, Audit History)"
            >
              <Settings size={15} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              className="action-btn-interactive"
              title="Toggle Light / Dark Mode"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* User Account Profile Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '3px 10px 3px 4px',
                borderRadius: '20px',
                background: 'var(--page)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
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
                  {getRoleLabel(currentUser.role)}
                </div>
              </div>
            </div>

            {/* Logout Action Button */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 11px',
                borderRadius: '7px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.22)',
                color: '#EF4444',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
              title="Sign out of patent dashboard"
              className="action-btn-interactive"
            >
              <LogOut size={13} />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Dedicated Navigation Tabs Bar */}
        <div
          style={{
            height: '42px',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
          }}
        >
          {/* Functional Navigation Tabs */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {/* Tab 0: Team Overview (Patent Admin & Super Admin) */}
            {(isParalegal(currentUser) || isSuperAdmin(currentUser)) && (
              <button
                onClick={() => setActiveNavTab('TEAM_OVERVIEW')}
                className="nav-tab-btn"
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeNavTab === 'TEAM_OVERVIEW' ? 'var(--page)' : 'transparent',
                  color: activeNavTab === 'TEAM_OVERVIEW' ? 'var(--ink)' : 'var(--muted)',
                  fontSize: '12px',
                  fontWeight: activeNavTab === 'TEAM_OVERVIEW' ? 800 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  borderBottom: activeNavTab === 'TEAM_OVERVIEW' ? '2.5px solid #2563EB' : '2.5px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                title="Executive team workload, 14-day capacity heatmap & urgent deliveries across all 8 drafters"
              >
                <Users size={14} color={activeNavTab === 'TEAM_OVERVIEW' ? '#2563EB' : 'currentColor'} />
                Team Overview
              </button>
            )}

            {/* Tab 1: Portfolio Master / Drafting Cockpit */}
            <button
              onClick={() => setActiveNavTab('PORTFOLIO')}
              className="nav-tab-btn"
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeNavTab === 'PORTFOLIO' ? 'var(--page)' : 'transparent',
                color: activeNavTab === 'PORTFOLIO' ? 'var(--ink)' : 'var(--muted)',
                fontSize: '12px',
                fontWeight: activeNavTab === 'PORTFOLIO' ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                borderBottom: activeNavTab === 'PORTFOLIO' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <FolderKanban size={14} color={activeNavTab === 'PORTFOLIO' ? 'var(--accent)' : 'currentColor'} />
              {isDrafter(currentUser) ? 'Drafting Cockpit' : 'Portfolio Master'}
            </button>



            {/* Tab 2: Deadlines Checklist */}
            <button
              onClick={() => setActiveNavTab('DEADLINES')}
              className="nav-tab-btn"
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeNavTab === 'DEADLINES' ? 'var(--page)' : 'transparent',
                color: activeNavTab === 'DEADLINES' ? 'var(--ink)' : 'var(--muted)',
                fontSize: '12px',
                fontWeight: activeNavTab === 'DEADLINES' ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                borderBottom: activeNavTab === 'DEADLINES' ? '2.5px solid #10B981' : '2.5px solid transparent',
                transition: 'all 0.15s ease',
              }}
              title="Action-based statutory checklist where you tick completed filings"
            >
              <CheckSquare size={14} color={activeNavTab === 'DEADLINES' ? '#10B981' : 'currentColor'} />
              Statutory Deadlines
            </button>

            {/* Tab 3: Calendar View */}
            <button
              onClick={() => setActiveNavTab('CALENDAR')}
              className="nav-tab-btn"
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeNavTab === 'CALENDAR' ? 'var(--page)' : 'transparent',
                color: activeNavTab === 'CALENDAR' ? 'var(--ink)' : 'var(--muted)',
                fontSize: '12px',
                fontWeight: activeNavTab === 'CALENDAR' ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                borderBottom: activeNavTab === 'CALENDAR' ? '2.5px solid #8B5CF6' : '2.5px solid transparent',
                transition: 'all 0.15s ease',
              }}
              title="Monthly statutory deadline calendar with Zoho Calendar sync"
            >
              <Calendar size={14} color={activeNavTab === 'CALENDAR' ? '#8B5CF6' : 'currentColor'} />
              Calendar View
            </button>
          </nav>

          {/* Right: Real-time Docket Stats Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
              {isDrafter(currentUser) 
                ? `${roleFilteredRecords.length} Assigned Patent Matters`
                : `${records.length || 878} Active Matters • 8 Drafters`}
            </span>
          </div>
        </div>
      </header>

      {/* Drafter Filter Context Banner (Only when logged in as a Drafter) */}
      {isDrafter(currentUser) && (
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
        {/* VIEW 0: TEAM OVERVIEW (Paralegal / Patent Admin & Super Admin) */}
        {activeNavTab === 'TEAM_OVERVIEW' && (
          <div key="TEAM_OVERVIEW" className="animate-tab-view" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <AdminTeamOverview
              records={records}
              currentUser={currentUser}
              onOpenDrawer={(rec) => handleSelectRecord(rec)}
              onOpenEdit={(rec) => setEditingRecord(rec)}
              onOpenReassign={(drafter) => handleOpenReassign(drafter)}
              onNavigateToPortfolio={(filterOrMatter) => {
                if (filterOrMatter) {
                  if (filterOrMatter === 'OVERDUE') setActiveKpiFilter('OVERDUE_CLIENT_DATE');
                  else if (filterOrMatter === 'DUE_7D') setActiveKpiFilter('DUE_NEXT_7_DAYS');
                  else if (filterOrMatter === 'AWAITING_SIGNOFF') setActiveKpiFilter('READY_FOR_REVIEW');
                  else if (filterOrMatter === 'OPEN_QUERIES') setActiveKpiFilter('WAITING_CLIENT_DATA');
                  else {
                    setSelectedDrafterFilter(filterOrMatter);
                  }
                }
                setActiveNavTab('PORTFOLIO');
              }}
            />
          </div>
        )}

        {/* VIEW 1: PORTFOLIO MASTER */}
        {activeNavTab === 'PORTFOLIO' && (
          <div key="PORTFOLIO" className="animate-tab-view" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
              onOpenReassign={(drafter) => handleOpenReassign(drafter)}
              onNavigateToFormalities={null}
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
                onSelectRecord={(rec) => handleSelectRecord(rec)}
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
                onOpenTimeline={(rec) => handleOpenTimeline(rec)}
                onOpenReassign={(item) => handleOpenReassign(item)}
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
          <div key="DEADLINES" className="animate-tab-view" style={{ flex: 1, overflow: 'hidden' }}>
            <DeadlinesTab
              records={roleFilteredRecords}
              currentUser={currentUser}
              onOpenDrawer={(rec) => handleSelectRecord(rec)}
              onOpenTimeline={(rec) => handleOpenTimeline(rec)}
              onActionComplete={handleDeadlineActionComplete}
              onNavigateToCalendar={() => setActiveNavTab('CALENDAR')}
              onNavigateToPortfolio={() => setActiveNavTab('PORTFOLIO')}
            />
          </div>
        )}

        {/* VIEW 3: CALENDAR VIEW (Requirement 14) */}
        {activeNavTab === 'CALENDAR' && (
          <div key="CALENDAR" className="animate-tab-view" style={{ flex: 1, overflow: 'hidden' }}>
            <CalendarView
              records={roleFilteredRecords}
              currentUser={currentUser}
              onOpenDrawer={(rec) => handleSelectRecord(rec)}
              onOpenTimeline={(rec) => handleOpenTimeline(rec)}
              onNavigateToDeadlines={() => setActiveNavTab('DEADLINES')}
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
          clients={clients}
          allRecords={records}
          onOpenEdit={(rec) => setEditingRecord(rec)}
          auditLogs={auditLogs.filter((l) => l.project_code === selectedRecord.project_code)}
          initialTab={drawerInitialTab}
        />
      )}



      {/* Settings Modal (Requirement 10, 14, 15) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
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
        onCliqAssignmentCreate={handleCreateApplication}
        records={records}
      />

      {/* Zoho Cliq Assignment Quick Intake & Queue Review Modal */}
      <CliqAssignmentModal
        isOpen={isCliqModalOpen}
        onClose={() => setIsCliqModalOpen(false)}
        onCreate={handleCreateApplication}
        records={records}
        showToast={showToast}
        cliqQueue={cliqQueue}
        onUpdateQueue={handleUpdateCliqQueue}
        onOpenSettings={() => {
          setIsCliqModalOpen(false);
          setIsSettingsOpen(true);
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
        records={records}
        onClientCreated={handleClientCreated}
      />

      {/* Edit Application Modal */}
      <EditApplicationModal
        isOpen={!!editingRecord}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onUpdate={handleUpdateApplication}
        clients={clients}
        tags={tags}
        records={records}
        onClientCreated={handleClientCreated}
      />

      {/* Master Statutory Prosecution Timeline now integrated directly into SlideOverDrawer */} 

      {/* Smart Excel & CSV Staging Importer Modal */}
      <SmartImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={handleImportSuccess}
      />


      {/* Reassign Matter Modal (Super Admin) */}
      <ReassignMatterModal
        isOpen={isReassignOpen}
        onClose={() => {
          setIsReassignOpen(false);
          setReassignRecord(null);
          setReassignSourceDrafter(null);
        }}
        initialDrafter={reassignSourceDrafter}
        initialRecord={reassignRecord}
        allRecords={records}
        onReassignBatch={handleReassignBatch}
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