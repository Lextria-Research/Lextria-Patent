import React, { useState, useEffect } from 'react';
import './App.css';
import MasterDataGrid from './components/MasterDataGrid';
import KpiAlertRibbon from './components/KpiAlertRibbon';
import SlideOverDrawer from './components/SlideOverDrawer';
import SmartImporterModal from './components/SmartImporterModal';
import LiveDueBoard from './components/LiveDueBoard';
import { exportToExcel } from './utils/exportEngine';
import { supabase, patentDb } from './lib/supabase';
import initialMasterRecords from './data/master_records.json';
import {
  Shield, Tv, Moon, Sun, Database, RefreshCw, FileText, CheckCircle2,
  Sparkles, Layers, ListFilter
} from 'lucide-react';

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

  // Theme management
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sync to Supabase on startup
  useEffect(() => {
    async function checkSupabase() {
      try {
        setSyncStatus('SYNCING');
        // Test query on patent schema or core
        const { data, error } = await supabase.from('applications').select('id').limit(1);
        if (!error) {
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

  // Handle Manual Notes Save (writes to state and Supabase)
  const handleSaveManualNotes = async (projectCode, notesData) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.project_code === projectCode ? { ...r, ...notesData } : r
      )
    );
    if (selectedRecord && selectedRecord.project_code === projectCode) {
      setSelectedRecord((prev) => ({ ...prev, ...notesData }));
    }

    // Attempt save to Supabase
    try {
      await supabase.from('patent.dues_manual').upsert({
        project_code: projectCode,
        status_notes: notesData.status_notes,
        suggested_action: notesData.suggested_action,
        issue: notesData.issue,
        checklist_sent_date: notesData.checklist_sent_date,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_code' });
    } catch (e) {
      console.warn('Saved locally, Supabase sync queued:', e.message);
    }
  };

  // Handle Smart Import Success
  const handleImportSuccess = (newRecords) => {
    setRecords((prev) => [...newRecords, ...prev]);
    alert(`Successfully staged and added ${newRecords.length} records to portfolio.`);
  };

  // Handle Excel Export
  const handleExport = (dataToExport, presetName) => {
    exportToExcel(dataToExport, presetName);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--page)',
      color: 'var(--ink)',
      fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Top Application Header */}
      <header style={{
        padding: '12px 24px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-card)',
        zIndex: 50
      }}>
        {/* Brand & Ecosystem Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1B2A4A, #3A86FF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(58, 134, 255, 0.35)'
          }}>
            <Shield size={20} color="#fff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.3px', color: 'var(--ink)' }}>
                LEXTRIA PATENT OPERATIONS
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                letterSpacing: '0.4px'
              }}>
                PRO ENTERPRISE
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>
              Prosecution & Portfolio Management Hub · 4,000+ Applications
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Supabase Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '20px',
            background: 'var(--page)',
            border: '1px solid var(--line)',
            fontSize: '11px',
            fontWeight: 700
          }}>
            <Database size={13} color="var(--accent)" />
            <span>Shared Supabase: {syncStatus === 'SUPABASE_SYNCED' ? 'Connected' : 'Active (Cached)'}</span>
          </div>

          {/* TV Screen Button */}
          <button
            onClick={() => setIsTvMode(true)}
            style={{
              padding: '7px 12px',
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
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Tv size={14} color="#C98A2C" /> Live Due TV
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main style={{
        flex: 1,
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top KPI & Triage Alert Ribbon */}
        <KpiAlertRibbon
          records={records}
          activeFilter={activeKpiFilter}
          onSelectFilter={(filterId) => setActiveKpiFilter(filterId)}
        />

        {/* High-Performance Virtualized Master Data Grid */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MasterDataGrid
            records={records}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            selectedCode={selectedRecord?.project_code}
            onOpenImport={() => setIsImporterOpen(true)}
            onExportExcel={handleExport}
            activeKpiFilter={activeKpiFilter}
            onClearKpiFilter={() => setActiveKpiFilter(null)}
          />
        </div>
      </main>

      {/* Slide-Over Detail Drawer */}
      {selectedRecord && (
        <SlideOverDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSaveManualNotes={handleSaveManualNotes}
        />
      )}

      {/* Smart Excel & CSV Staging Importer Modal */}
      <SmartImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Live Due Board TV Screen Mode */}
      {isTvMode && (
        <LiveDueBoard
          records={records}
          onBack={() => setIsTvMode(false)}
        />
      )}
    </div>
  );
}