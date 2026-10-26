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
import { exportToExcel } from './utils/exportEngine';
import { supabase, patentDb } from './lib/supabase';
import initialMasterRecords from './data/master_records.json';
import {
  Shield, Tv, Moon, Sun, Database, RefreshCw, FileText, CheckCircle2,
  Sparkles, Layers, ListFilter, Users, Briefcase, Scale, Plus, Edit3,
  Clock, AlertCircle, Check, ChevronDown
} from 'lucide-react';

const ALL_DRAFTERS = [
  'Anusha', 'Ayush', 'Abhishek', 'Fiona',
  'Pramith', 'Pratham', 'Thanush', 'Thilak', 'Pranav Bhat'
];

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );
  const [records, setRecords] = useState(initialMasterRecords || []);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeKpiFilter, setActiveKpiFilter] = useState(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState('LOCAL_CACHE'); // LOCAL_CACHE, SUPABASE_SYNCED, SYNCING

  // 3-Way Role Access System: SUPER_ADMIN, PARALEGAL, DRAFTER
  const [userRole, setUserRole] = useState(
    () => localStorage.getItem('user_role') || 'SUPER_ADMIN'
  );
  const [selectedDrafter, setSelectedDrafter] = useState(
    () => localStorage.getItem('selected_drafter') || 'Anusha'
  );

  // New Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [timelineRecord, setTimelineRecord] = useState(null);
  const [toast, setToast] = useState(null);

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

  // Persist role selections
  useEffect(() => {
    localStorage.setItem('user_role', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('selected_drafter', selectedDrafter);
  }, [selectedDrafter]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sync / verify Supabase connection on startup
  useEffect(() => {
    async function checkSupabase() {
      try {
        setSyncStatus('SYNCING');
        const { data, error } = await patentDb
          .from('applications')
          .select('project_code')
          .limit(1);

        if (!error && data) {
          setSyncStatus('SUPABASE_SYNCED');
        } else {
          setSyncStatus('LOCAL_READY');
        }
      } catch (e) {
        setSyncStatus('LOCAL_READY');
      }
    }
    checkSupabase();
  }, []);

  // Filter records according to userRole
  const roleFilteredRecords = useMemo(() => {
    if (userRole === 'DRAFTER' && selectedDrafter) {
      return records.filter(
        (r) =>
          r.assigned_to &&
          r.assigned_to.trim().toLowerCase() === selectedDrafter.trim().toLowerCase()
      );
    }
    // Paralegal and Super Admin see all firm applications
    return records;
  }, [records, userRole, selectedDrafter]);

  // Existing project codes for auto-generation
  const existingCodes = useMemo(
    () => records.map((r) => r.project_code),
    [records]
  );

  // ==========================================
  // CRUD 1: CREATE NEW APPLICATION
  // ==========================================
  const handleCreateApplication = async (formData) => {
    // 1. Calculate statutory deadlines
    const psDate = formData.ps_filing_date ? new Date(formData.ps_filing_date) : null;
    let csDeadline = null;
    let f1Deadline = null;
    let f26Deadline = null;

    if (psDate) {
      // CS deadline: 12 months from PS
      const csD = new Date(psDate);
      csD.setMonth(csD.getMonth() + 12);
      csDeadline = csD.toISOString().split('T')[0];

      // Form 1 deadline: 6 months from PS
      const f1D = new Date(psDate);
      f1D.setMonth(f1D.getMonth() + 6);
      f1Deadline = f1D.toISOString().split('T')[0];

      // Form 26 deadline: 3 months from PS
      const f26D = new Date(psDate);
      f26D.setMonth(f26D.getMonth() + 3);
      f26Deadline = f26D.toISOString().split('T')[0];
    }

    const newRecord = {
      ...formData,
      cs_deadline: csDeadline,
      form_1_deadline: f1Deadline,
      form_26_deadline: f26Deadline,
      f1_status: formData.form_1_filing_date ? 'Within Deadline' : 'Pending',
      f26_status: formData.form_26_filing_date ? 'Within Deadline' : 'Pending',
      created_at: new Date().toISOString(),
    };

    // Update state immediately (zero delay)
    setRecords((prev) => [newRecord, ...prev]);

    // Save to Supabase
    try {
      // Insert application
      const { data: appData, error: appErr } = await patentDb
        .from('applications')
        .insert({
          project_code: formData.project_code,
          title: formData.title,
          application_number: formData.application_number || null,
          specification_type: formData.specification_type,
          record_category: formData.record_category,
          classification: formData.classification,
          applicant_name: formData.applicant_name,
          entity_category: formData.entity_category,
          is_mahe: formData.is_mahe,
          assigned_to: formData.assigned_to,
          current_status: formData.current_status,
          color_code_status: formData.color_code_status,
          workdrive_folder_url: formData.workdrive_folder_url || null,
          inventors_summary: formData.inventors_summary || null,
        })
        .select('id')
        .single();

      if (appData && !appErr) {
        // Insert prosecution dates
        await patentDb.from('prosecution_dates').insert({
          application_id: appData.id,
          ps_filing_date: formData.ps_filing_date || null,
          cs_filing_date: formData.cs_filing_date || null,
        });

        // Insert forms tracker
        await patentDb.from('forms_tracker').insert({
          application_id: appData.id,
          form_1_filing_date: formData.form_1_filing_date || null,
          form_1_deadline: f1Deadline,
          form_26_filing_date: formData.form_26_filing_date || null,
          form_26_deadline: f26Deadline,
        });
      }

      showToast(`Application ${formData.project_code} created and synced to Supabase!`);
    } catch (err) {
      console.warn('Supabase sync warning:', err);
      showToast(`Application ${formData.project_code} created locally (Supabase queued).`);
    }
  };

  // ==========================================
  // CRUD 2: UPDATE EXISTING APPLICATION
  // ==========================================
  const handleUpdateApplication = async (projectCode, updatedFields) => {
    // Update local state immediately
    setRecords((prev) =>
      prev.map((r) =>
        r.project_code === projectCode ? { ...r, ...updatedFields } : r
      )
    );

    if (selectedRecord && selectedRecord.project_code === projectCode) {
      setSelectedRecord((prev) => ({ ...prev, ...updatedFields }));
    }

    // Save to Supabase
    try {
      // 1. Update applications table
      await patentDb
        .from('applications')
        .update({
          title: updatedFields.title,
          application_number: updatedFields.application_number || null,
          patent_number: updatedFields.patent_number || null,
          specification_type: updatedFields.specification_type,
          classification: updatedFields.classification,
          assigned_to: updatedFields.assigned_to,
          current_status: updatedFields.current_status,
          color_code_status: updatedFields.color_code_status,
          application_filing_receipt_status: updatedFields.application_filing_receipt_status,
          communication_status: updatedFields.communication_status,
          workdrive_folder_url: updatedFields.workdrive_folder_url || null,
          inventors_summary: updatedFields.inventors_summary || null,
          updated_at: new Date().toISOString(),
        })
        .eq('project_code', projectCode);

      // 2. Update manual dues/notes
      if (updatedFields.status_notes || updatedFields.suggested_action || updatedFields.issue) {
        await patentDb.from('dues_manual').upsert({
          project_code: projectCode,
          status_notes: updatedFields.status_notes,
          suggested_action: updatedFields.suggested_action,
          issue: updatedFields.issue,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_code' });
      }

      showToast(`Application ${projectCode} updated successfully!`);
    } catch (err) {
      console.warn('Supabase update warning:', err);
      showToast(`Application ${projectCode} updated locally.`);
    }
  };

  // Handle Manual Notes Save from Drawer
  const handleSaveManualNotes = async (projectCode, notesData) => {
    handleUpdateApplication(projectCode, notesData);
  };

  // Handle Smart Import Success
  const handleImportSuccess = (newRecords) => {
    setRecords((prev) => [...newRecords, ...prev]);
    showToast(`Successfully staged ${newRecords.length} records into portfolio.`);
  };

  // Handle Excel Export
  const handleExport = (dataToExport, presetName) => {
    exportToExcel(dataToExport, `${userRole}_${presetName}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--page)',
        color: 'var(--ink)',
        fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Toast Notification Banner */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 2000,
            background: toast.type === 'error' ? '#EF4444' : '#10B981',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
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

      {/* Top Application Header */}
      <header
        style={{
          padding: '10px 24px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-card)',
          zIndex: 50,
        }}
      >
        {/* Brand & Ecosystem Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1B2A4A, #3A86FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(58, 134, 255, 0.35)',
            }}
          >
            <Shield size={20} color="#fff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  letterSpacing: '-0.3px',
                  color: 'var(--ink)',
                }}
              >
                LEXTRIA PATENT OPERATIONS
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  letterSpacing: '0.4px',
                }}
              >
                ENTERPRISE
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>
              Prosecution & Portfolio Docketing · 4,000+ Matters
            </div>
          </div>
        </div>

        {/* Center: 3-WAY ROLE ACCESS SWITCHER */}
        <div
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
          {/* Mode 1: Super Admin */}
          <button
            onClick={() => setUserRole('SUPER_ADMIN')}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              background: userRole === 'SUPER_ADMIN' ? 'var(--surface)' : 'transparent',
              color: userRole === 'SUPER_ADMIN' ? 'var(--ink)' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: userRole === 'SUPER_ADMIN' ? 800 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: userRole === 'SUPER_ADMIN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Super Admin: Full, unrestricted firm-wide control"
          >
            <Shield size={14} color={userRole === 'SUPER_ADMIN' ? '#3B82F6' : 'currentColor'} />
            Super Admin
          </button>

          {/* Mode 2: Paralegal Dashboard */}
          <button
            onClick={() => setUserRole('PARALEGAL')}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              background: userRole === 'PARALEGAL' ? 'var(--surface)' : 'transparent',
              color: userRole === 'PARALEGAL' ? 'var(--ink)' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: userRole === 'PARALEGAL' ? 800 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: userRole === 'PARALEGAL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Paralegal Dashboard: Firm-wide statutory docketing, receipts, and forms compliance"
          >
            <Scale size={14} color={userRole === 'PARALEGAL' ? '#10B981' : 'currentColor'} />
            Paralegal
          </button>

          {/* Mode 3: Drafter Dashboard */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setUserRole('DRAFTER')}
              style={{
                padding: '6px 12px',
                borderRadius: userRole === 'DRAFTER' ? '7px 0 0 7px' : '7px',
                border: 'none',
                background: userRole === 'DRAFTER' ? 'var(--surface)' : 'transparent',
                color: userRole === 'DRAFTER' ? 'var(--ink)' : 'var(--muted)',
                fontSize: '12px',
                fontWeight: userRole === 'DRAFTER' ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: userRole === 'DRAFTER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              title="Drafter Dashboard: Personalized docket for allocated drafting matters"
            >
              <Briefcase size={14} color={userRole === 'DRAFTER' ? '#8B5CF6' : 'currentColor'} />
              Drafter
            </button>

            {/* Drafter Selector Dropdown (When Drafter or Super Admin) */}
            {userRole === 'DRAFTER' && (
              <select
                value={selectedDrafter}
                onChange={(e) => setSelectedDrafter(e.target.value)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '0 7px 7px 0',
                  border: 'none',
                  background: 'var(--surface)',
                  color: '#8B5CF6',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  borderLeft: '1px solid var(--line)',
                  outline: 'none',
                }}
              >
                {ALL_DRAFTERS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* New Application Quick Action */}
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              padding: '7px 14px',
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

          {/* Supabase Connection Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '20px',
              background: 'var(--page)',
              border: '1px solid var(--line)',
              fontSize: '11px',
              fontWeight: 700,
            }}
            title="Shared Supabase instance: eafciegebhuhoneypsqy"
          >
            <Database size={13} color="var(--accent)" />
            <span>Supabase: {syncStatus === 'SUPABASE_SYNCED' ? 'Live' : 'Active'}</span>
          </div>

          {/* TV Screen Button */}
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

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
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
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Role Banner Notification */}
      {userRole === 'DRAFTER' && (
        <div
          style={{
            padding: '6px 24px',
            background: 'rgba(139, 92, 246, 0.1)',
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
              <strong>Drafter View:</strong> Showing allocated applications for <strong>{selectedDrafter}</strong> ({roleFilteredRecords.length} assigned matters).
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Switch to Super Admin in header to view firm-wide docket.
          </span>
        </div>
      )}

      {userRole === 'PARALEGAL' && (
        <div
          style={{
            padding: '6px 24px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#065F46',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={14} />
            <span>
              <strong>Paralegal Docketing View:</strong> Firm-wide portfolio active ({records.length} matters). Separate drafter triage view suppressed.
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Manage statutory Form 1, Form 26, IPO receipts, and Controller hearings.
          </span>
        </div>
      )}

      {/* Main Workspace */}
      <main
        style={{
          flex: 1,
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* KPI Alert Ribbon (Adaptive to Role Filtered Data) */}
        <KpiAlertRibbon
          records={roleFilteredRecords}
          activeFilter={activeKpiFilter}
          onSelectFilter={(filterId) => setActiveKpiFilter(filterId)}
        />

        {/* Master Virtualized Table Data Grid */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MasterDataGrid
            records={roleFilteredRecords}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            selectedCode={selectedRecord?.project_code}
            onOpenImport={() => setIsImporterOpen(true)}
            onExportExcel={handleExport}
            activeKpiFilter={activeKpiFilter}
            onClearKpiFilter={() => setActiveKpiFilter(null)}
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenEdit={(rec) => setEditingRecord(rec)}
            onOpenTimeline={(rec) => setTimelineRecord(rec)}
            userRole={userRole}
            selectedDrafter={selectedDrafter}
          />
        </div>
      </main>

      {/* Slide-Over Detail Drawer */}
      {selectedRecord && (
        <SlideOverDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSaveManualNotes={handleSaveManualNotes}
          onOpenEdit={(rec) => setEditingRecord(rec)}
          onOpenTimeline={(rec) => setTimelineRecord(rec)}
        />
      )}

      {/* Create New Application Modal */}
      <CreateApplicationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateApplication}
        existingCodes={existingCodes}
      />

      {/* Edit Application Modal */}
      <EditApplicationModal
        isOpen={!!editingRecord}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onUpdate={handleUpdateApplication}
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

      {/* Live Due Board TV Screen Mode */}
      {isTvMode && (
        <LiveDueBoard
          records={roleFilteredRecords}
          onBack={() => setIsTvMode(false)}
        />
      )}
    </div>
  );
}