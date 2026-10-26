import React, { useState, useEffect } from 'react';
import { Clock, ArrowLeft, Maximize2, Minimize2, AlertCircle, CheckCircle, Calendar, RefreshCw } from 'lucide-react';

export default function LiveDueBoard({ records = [], onBack }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('next7'); // today, overdue, next7, completed
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const todayStr = currentTime.toISOString().split('T')[0];

  // Bucket dues
  const todayDues = [];
  const overdueDues = [];
  const next7Dues = [];
  const completedDues = [];

  records.forEach((r) => {
    const deadlines = [
      { type: 'CS', date: r.cs_deadline, filed: r.cs_filing_date },
      { type: 'FER', date: r.fer_reply_deadline, filed: r.fer_reply_filing_date },
      { type: 'Hearing / WS', date: r.ws_deadline, filed: r.ws_filing_date },
      { type: 'Form 1', date: r.form_1_deadline, filed: r.form_1_filing_date },
      { type: 'Form 26', date: r.form_26_deadline, filed: r.form_26_filing_date },
    ];

    deadlines.forEach((dl) => {
      if (!dl.date) return;
      const item = {
        code: r.project_code,
        appNo: r.application_number,
        title: r.title,
        applicant: r.applicant_name,
        dueType: dl.type,
        deadline: dl.date,
        drafter: r.assigned_to,
        status: dl.filed ? 'completed' : (dl.date < todayStr ? 'overdue' : (dl.date === todayStr ? 'today' : 'upcoming'))
      };

      if (dl.filed) {
        completedDues.push(item);
      } else if (dl.date === todayStr) {
        todayDues.push(item);
      } else if (dl.date < todayStr && !r.is_abandoned) {
        overdueDues.push(item);
      } else {
        const diffDays = Math.round((new Date(dl.date) - currentTime) / 86400000);
        if (diffDays > 0 && diffDays <= 7 && !r.is_abandoned) {
          next7Dues.push(item);
        }
      }
    });
  });

  const getActiveList = () => {
    if (activeTab === 'today') return todayDues;
    if (activeTab === 'overdue') return overdueDues;
    if (activeTab === 'next7') return next7Dues;
    return completedDues;
  };

  const activeItems = getActiveList();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#0D1117',
      color: '#F0F6FC',
      zIndex: 3000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Manrope, system-ui, sans-serif'
    }}>
      {/* TV Screen Header */}
      <div style={{
        padding: '16px 32px',
        background: '#161B22',
        borderBottom: '1px solid #30363D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            style={{
              background: '#21262D',
              border: '1px solid #30363D',
              color: '#C9D1D9',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <ArrowLeft size={16} /> Exit TV Mode
          </button>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#58A6FF' }}>
              PATENT OPERATIONS LIVE DUE BOARD
            </span>
            <span style={{ fontSize: '12px', color: '#8B949E', marginLeft: '12px' }}>
              Real-time Statutory Deadlines
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Ticking Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#58A6FF' }}>
            <Clock size={20} />
            <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'monospace' }}>
              {currentTime.toLocaleTimeString()}
            </span>
            <span style={{ fontSize: '13px', color: '#8B949E' }}>
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            style={{
              background: '#21262D',
              border: '1px solid #30363D',
              color: '#C9D1D9',
              padding: '8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', padding: '24px 32px', gap: '24px', overflow: 'hidden' }}>
        {/* Big Table View */}
        <div style={{
          flex: 1,
          background: '#161B22',
          borderRadius: '12px',
          border: '1px solid #30363D',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #30363D',
            fontSize: '15px',
            fontWeight: 700,
            color: '#C9D1D9',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>
              {activeTab === 'today' && '🎯 Falling Due Today'}
              {activeTab === 'overdue' && '⚠️ Overdue Deadlines Across Portfolio'}
              {activeTab === 'next7' && '📅 Coming in the Next 7 Days'}
              {activeTab === 'completed' && '✅ Completed Deadlines'}
            </span>
            <span style={{ color: '#8B949E' }}>{activeItems.length} items</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead style={{ background: '#21262D', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: '#8B949E', fontWeight: 600 }}>Code</th>
                  <th style={{ padding: '12px 16px', color: '#8B949E', fontWeight: 600 }}>App No</th>
                  <th style={{ padding: '12px 16px', color: '#8B949E', fontWeight: 600 }}>Due Type</th>
                  <th style={{ padding: '12px 16px', color: '#8B949E', fontWeight: 600 }}>Deadline</th>
                  <th style={{ padding: '12px 16px', color: '#8B949E', fontWeight: 600 }}>Title of Invention</th>
                  <th style={{ padding: '12px 16px', color: '#8B949E', fontWeight: 600 }}>Drafter</th>
                </tr>
              </thead>
              <tbody>
                {activeItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #21262D' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#58A6FF' }}>{item.code}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{item.appNo || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#30363D',
                        color: '#F0F6FC'
                      }}>
                        {item.dueType}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: item.status === 'overdue' ? '#F85149' : (item.status === 'today' ? '#D29922' : '#58A6FF')
                    }}>
                      {item.deadline}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8B949E' }}>{item.drafter || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Metric Cards */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { id: 'today', label: 'Due Today', count: todayDues.length, color: '#D29922', bg: 'rgba(210, 153, 34, 0.15)', desc: 'Immediate statutory action' },
            { id: 'overdue', label: 'Overdue Total', count: overdueDues.length, color: '#F85149', bg: 'rgba(248, 81, 73, 0.15)', desc: 'Action required' },
            { id: 'next7', label: 'Next 7 Days', count: next7Dues.length, color: '#58A6FF', bg: 'rgba(88, 166, 255, 0.15)', desc: 'Upcoming deadlines' },
            { id: 'completed', label: 'Completed', count: completedDues.length, color: '#3FB950', bg: 'rgba(63, 185, 80, 0.15)', desc: 'Filed & verified' },
          ].map((c) => {
            const isSelected = activeTab === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: isSelected ? c.bg : '#161B22',
                  border: `2px solid ${isSelected ? c.color : '#30363D'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '13px', color: '#8B949E', fontWeight: 600, textTransform: 'uppercase' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: c.color, margin: '4px 0' }}>
                  {c.count}
                </div>
                <div style={{ fontSize: '12px', color: '#8B949E' }}>
                  {c.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
