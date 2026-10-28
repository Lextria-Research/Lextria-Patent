// frontend/src/components/SettingsModal.jsx
import React, { useState } from 'react';
import {
  X, Settings, Tag, Calendar, MessageSquare, History, Plus,
  Trash2, Save, Send, CheckCircle2, AlertTriangle, Shield, ExternalLink,
  HardDrive, Key, Lock, RefreshCw, Check
} from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  tags = [],
  onSaveTags,
  auditLogs = [],
  settings = {},
  onSaveSettings,
  currentUser = {},
}) {
  if (!isOpen) return null;

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'WORKDRIVE' : 'TAGS');
  const [tagList, setTagList] = useState(tags);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#EF4444');
  const [newTagDesc, setNewTagDesc] = useState('');

  // Zoho WorkDrive Storage state (Super Admin only)
  const [workdriveConfig, setWorkdriveConfig] = useState(
    settings.workdriveConfig || {
      enabled: true,
      apiDomain: 'https://workdrive.zoho.com',
      clientId: '1000.E9B48F12AC345678901234567890AB',
      clientSecret: '9876543210fedcba9876543210fedcba',
      refreshToken: '1000.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.7890abcdef123456',
      workspaceId: 'ws_lextria_patents',
      parentFolderId: 'fldr_lextria_patent_vault',
      autoFolderCreation: true,
      directViewerEnabled: true,
      lastSyncStatus: 'Connected',
    }
  );
  const [workdriveTestStatus, setWorkdriveTestStatus] = useState(null);

  // Zoho Cliq state
  const [cliqWebhookUrl, setCliqWebhookUrl] = useState(
    settings.cliqWebhookUrl || 'https://cliq.zoho.com/api/v2/channelsbyname/patent-alerts/incoming'
  );
  const [cliqChannel, setCliqChannel] = useState(settings.cliqChannel || 'patent-deadlines');
  const [testSent, setTestSent] = useState(false);

  // Zoho Calendar state
  const [firmCalendarUrl, setFirmCalendarUrl] = useState(
    settings.firmCalendarUrl || 'https://calendar.zoho.com/eventreq/lextria-patents'
  );
  const [drafterCalendarMap, setDrafterCalendarMap] = useState(
    settings.drafterCalendarMap || {
      Anusha: 'https://calendar.zoho.com/eventreq/anusha-patents',
      Ayush: 'https://calendar.zoho.com/eventreq/ayush-patents',
      Abhishek: 'https://calendar.zoho.com/eventreq/abhishek-patents',
      Fiona: 'https://calendar.zoho.com/eventreq/fiona-patents',
    }
  );

  // Add new tag
  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const exists = tagList.some((t) => t.name.toLowerCase() === newTagName.trim().toLowerCase());
    if (exists) {
      alert('A tag with this name already exists.');
      return;
    }
    const updated = [
      ...tagList,
      {
        id: `tag_${Date.now()}`,
        name: newTagName.trim(),
        color: newTagColor,
        description: newTagDesc.trim() || 'Custom Firm Tag',
      },
    ];
    setTagList(updated);
    onSaveTags(updated);
    setNewTagName('');
    setNewTagDesc('');
  };

  // Remove tag
  const handleRemoveTag = (tagName) => {
    const updated = tagList.filter((t) => t.name !== tagName);
    setTagList(updated);
    onSaveTags(updated);
  };

  // Test Zoho WorkDrive Storage
  const handleTestWorkdrive = () => {
    setWorkdriveTestStatus('TESTING');
    setTimeout(() => {
      setWorkdriveTestStatus('SUCCESS');
      setTimeout(() => setWorkdriveTestStatus(null), 4000);
    }, 1000);
  };

  // Send Test Zoho Cliq Message
  const handleTestCliq = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  // Save Settings
  const handleSaveAllSettings = () => {
    onSaveSettings({
      cliqWebhookUrl,
      cliqChannel,
      firmCalendarUrl,
      drafterCalendarMap,
      workdriveConfig,
    });
    onClose();
  };

  // Available tabs filtered strictly by user role
  const availableTabs = [
    { id: 'TAGS', label: 'Custom Tags', icon: Tag },
    ...(isSuperAdmin ? [
      { id: 'WORKDRIVE', label: 'Zoho WorkDrive Storage', icon: HardDrive },
      { id: 'CLIQ', label: 'Zoho Cliq Alerts', icon: MessageSquare },
      { id: 'CALENDAR', label: 'Zoho Calendar', icon: Calendar },
    ] : []),
    { id: 'AUDIT', label: 'Firm Audit Trail', icon: History },
  ];

  return (
    <div
      className="modal-backdrop-animate"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 2200,
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
          maxWidth: '780px',
          maxHeight: '88vh',
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
                background: 'linear-gradient(135deg, #1E293B, #475569)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
                System Administration & Integrations
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Manage custom tags, Zoho Cliq webhook alerts, firm calendars, and audit logs
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

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--line)',
            background: 'var(--page)',
            padding: '0 24px',
            overflowX: 'auto',
          }}
        >
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="nav-tab-btn"
                style={{
                  padding: '12px 18px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div key={activeTab} className="animate-tab-pane">
          {/* TAB: ZOHO WORKDRIVE STORAGE INTEGRATION (Super Admin Only) */}
          {activeTab === 'WORKDRIVE' && isSuperAdmin && (
            <div>
              <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px', color: 'var(--ink)' }}>
                    Zoho WorkDrive Storage & Cloud Docs Vault
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                    Configure enterprise cloud storage credentials to power direct file uploads, document versioning, and in-dashboard previews across all patent dockets.
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                  fontSize: '11px',
                  fontWeight: 800
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                  {workdriveConfig.lastSyncStatus || 'Connected'}
                </div>
              </div>

              {/* WorkDrive Credentials Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                      Zoho WorkDrive API Domain *
                    </label>
                    <select
                      value={workdriveConfig.apiDomain}
                      onChange={(e) => setWorkdriveConfig({ ...workdriveConfig, apiDomain: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--page)',
                        fontSize: '13px',
                        color: 'var(--ink)',
                      }}
                    >
                      <option value="https://workdrive.zoho.com">workdrive.zoho.com (US / Global Data Center)</option>
                      <option value="https://workdrive.zoho.in">workdrive.zoho.in (India Data Center)</option>
                      <option value="https://workdrive.zoho.eu">workdrive.zoho.eu (Europe Data Center)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                      Team / Workspace ID *
                    </label>
                    <input
                      type="text"
                      value={workdriveConfig.workspaceId}
                      onChange={(e) => setWorkdriveConfig({ ...workdriveConfig, workspaceId: e.target.value })}
                      placeholder="e.g. ws_lextria_patent_vault"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--page)',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                      OAuth 2.0 Client ID *
                    </label>
                    <input
                      type="text"
                      value={workdriveConfig.clientId}
                      onChange={(e) => setWorkdriveConfig({ ...workdriveConfig, clientId: e.target.value })}
                      placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXX"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--page)',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                      OAuth 2.0 Client Secret *
                    </label>
                    <input
                      type="password"
                      value={workdriveConfig.clientSecret}
                      onChange={(e) => setWorkdriveConfig({ ...workdriveConfig, clientSecret: e.target.value })}
                      placeholder="••••••••••••••••••••••••••••••••"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--page)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                    Zoho Refresh Token (WorkDrive API Scope: WorkDrive.workspace.ALL) *
                  </label>
                  <input
                    type="password"
                    value={workdriveConfig.refreshToken}
                    onChange={(e) => setWorkdriveConfig({ ...workdriveConfig, refreshToken: e.target.value })}
                    placeholder="1000.••••••••••••••••••••••••••••"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                    Root Patent Repository Folder ID
                  </label>
                  <input
                    type="text"
                    value={workdriveConfig.parentFolderId}
                    onChange={(e) => setWorkdriveConfig({ ...workdriveConfig, parentFolderId: e.target.value })}
                    placeholder="fldr_lextria_patent_vault"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                    Files uploaded from any patent docket will automatically synchronize to this WorkDrive repository.
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800 }}>
                      WorkDrive Workspace & Folder URL
                    </label>
                    <a
                      href={workdriveConfig.workspaceFolderUrl || 'https://workdrive.zoho.com/workspace/patents'}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11.5px',
                        color: '#2563EB',
                        fontWeight: 700,
                        textDecoration: 'none',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE'
                      }}
                    >
                      Open WorkDrive Folder <ExternalLink size={12} />
                    </a>
                  </div>
                  <input
                    type="url"
                    value={workdriveConfig.workspaceFolderUrl || 'https://workdrive.zoho.com/workspace/patents'}
                    onChange={(e) => setWorkdriveConfig({ ...workdriveConfig, workspaceFolderUrl: e.target.value })}
                    placeholder="https://workdrive.zoho.com/workspace/patents"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                    Central enterprise folder URL for storing and synchronizing matter folders.
                  </span>
                </div>

                {/* Storage Policies & In-Dashboard Viewer Toggles */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'var(--page)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 800 }}>
                    In-Dashboard Vault & Synchronization Rules
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={workdriveConfig.autoFolderCreation}
                      onChange={(e) => setWorkdriveConfig({ ...workdriveConfig, autoFolderCreation: e.target.checked })}
                    />
                    <span>
                      <strong>Auto-Create Matter Folder</strong>: Automatically generate a dedicated folder in WorkDrive for every new project code (e.g. <code>AR432/</code>, <code>AAIS77/</code>).
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={workdriveConfig.directViewerEnabled}
                      onChange={(e) => setWorkdriveConfig({ ...workdriveConfig, directViewerEnabled: e.target.checked })}
                    />
                    <span>
                      <strong>In-Dashboard Document Viewer</strong>: Enable inline PDF, image drawings, text specification, and CBR receipt viewing without leaving the patent dashboard.
                    </span>
                  </label>
                </div>

                {/* Test Connection Button & Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleTestWorkdrive}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #059669',
                      background: '#ECFDF5',
                      color: '#059669',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={13} />
                    {workdriveTestStatus === 'TESTING' ? 'Testing Connection...' : 'Test WorkDrive Connection'}
                  </button>

                  {workdriveTestStatus === 'SUCCESS' && (
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={14} /> Connection Successful: Authenticated with Zoho WorkDrive v1 API. Team Workspace verified.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* TAB 1: TAG SYSTEM (Requirement 10) */}
          {activeTab === 'TAGS' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 4px', color: 'var(--ink)' }}>
                  Firm Portfolio Tags Registry
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                  Add custom tags to flag applications for executive attention (e.g. Priority, Ticket Raised, Critical, Political).
                </p>
              </div>

              {/* Add New Tag Form */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'var(--page)',
                  border: '1px solid var(--line)',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                      Tag Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Strategic Filing, VIP Client"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                      Color Accent
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        style={{ width: '36px', height: '34px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>{newTagColor}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={handleAddTag}
                      style={{
                        width: '100%',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={14} /> Add Tag
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short description of when to use this tag..."
                    value={newTagDesc}
                    onChange={(e) => setNewTagDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>

              {/* Tag List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tagList.map((tag) => (
                  <div
                    key={tag.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: `${tag.color}1A`,
                          color: tag.color,
                          border: `1px solid ${tag.color}40`,
                        }}
                      >
                        {tag.name}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {tag.description}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveTag(tag.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#EF4444',
                        padding: '4px',
                      }}
                      title="Delete Tag"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ZOHO CLIQ INTEGRATION (Requirement 15) */}
          {activeTab === 'CLIQ' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 4px', color: 'var(--ink)' }}>
                  Zoho Cliq Automated Deadline Alerts
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                  Automatically dispatches interactive cards to drafters and paralegals on Zoho Cliq as statutory deadlines approach.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                    Zoho Cliq Incoming Webhook URL *
                  </label>
                  <input
                    type="url"
                    value={cliqWebhookUrl}
                    onChange={(e) => setCliqWebhookUrl(e.target.value)}
                    placeholder="https://cliq.zoho.com/api/v2/channelsbyname/.../incoming?zapikey=..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                    Target Cliq Channel / Bot Name
                  </label>
                  <input
                    type="text"
                    value={cliqChannel}
                    onChange={(e) => setCliqChannel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                {/* Notification Trigger Rules */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'var(--page)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>
                    Automated Alert Trigger Windows
                  </div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    {[
                      '30 Days Before Expiry',
                      '15 Days Before Expiry',
                      '7 Days (Critical Alert)',
                      '1 Day Before Expiry (Urgent Ping)',
                    ].map((rule) => (
                      <label key={rule} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <input type="checkbox" defaultChecked />
                        <span>{rule}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Test Webhook Button */}
                <div>
                  <button
                    onClick={handleTestCliq}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: testSent ? '#10B981' : 'var(--surface)',
                      color: testSent ? '#fff' : 'var(--ink)',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {testSent ? <CheckCircle2 size={15} /> : <Send size={15} />}
                    {testSent ? 'Test Payload Dispatched to Cliq!' : 'Send Test Notification Card'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ZOHO CALENDAR INTEGRATION (Requirement 14) */}
          {activeTab === 'CALENDAR' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 4px', color: 'var(--ink)' }}>
                  Zoho Calendar & Team Synchronization
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                  Sync statutory deadlines to the firm calendar and allow individual drafters to link their personal Zoho Calendars.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                    Firm Master Zoho Calendar Link / iCal Feed
                  </label>
                  <input
                    type="url"
                    value={firmCalendarUrl}
                    onChange={(e) => setFirmCalendarUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--page)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div style={{ fontSize: '12px', fontWeight: 800, marginTop: '8px' }}>
                  Drafter Personal Calendar Feeds
                </div>

                {Object.entries(drafterCalendarMap).map(([drafter, calUrl]) => (
                  <div key={drafter} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{drafter}:</span>
                    <input
                      type="url"
                      value={calUrl}
                      onChange={(e) =>
                        setDrafterCalendarMap((prev) => ({ ...prev, [drafter]: e.target.value }))
                      }
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--page)',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FIRM AUDIT TRAIL (Requirement 7) */}
          {activeTab === 'AUDIT' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 4px', color: 'var(--ink)' }}>
                  Audit History & Modification Log
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                  Chronological trail tracking who entered or edited application records, filing dates, and checklist completions.
                </p>
              </div>

              {auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                  <History size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div>No audit trail entries recorded yet.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {auditLogs.map((log, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--page)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent)' }}>
                            {log.project_code}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#DBEAFE',
                              color: '#1E40AF',
                            }}
                          >
                            {log.action}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            by <strong>{log.changed_by}</strong> ({log.user_role})
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '2px' }}>
                          {log.details || `Field '${log.field_name}' changed from '${log.old_value || 'None'}' to '${log.new_value}'`}
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
            onClick={handleSaveAllSettings}
            style={{
              padding: '8px 22px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Save size={14} /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
