import { useState } from 'react';
import OverdueDashboard from './OverdueDashboard';
import F1F26Delayed from './F1F26Delayed';
import F9F18Check from './F9F18Check';
import F9F18DataIssues from './F9F18DataIssues';
import { useIsPhone } from './useIsPhone';

const SECTIONS = [
  { id: 'overdue', label: 'Overdue', phoneLabel: 'Overdue' },
  { id: 'f1f26', label: 'F1/F26 delayed or pending', phoneLabel: 'F1/F26' },
  { id: 'f9f18', label: 'F9/F18 pending', phoneLabel: 'F9/F18' },
  { id: 'dataIssues', label: 'Data issues', phoneLabel: 'Data issues' },
];

// One main tab holding the "things that need action" pages that used to
// be tabs of their own. Each section is the original component, unchanged.
// Like the main tabs, a section mounts the first time it's opened and is then
// only hidden, so its filters survive switching between sections. `section`
// lives in App so the choice also survives opening a detail page (which
// unmounts everything) and switching main tabs.
function ActionList({ section, onSectionChange, onSelectDue, onSelectPatent }) {
  const isPhone = useIsPhone();
  const [visited, setVisited] = useState([section]);

  const select = (id) => {
    setVisited((prev) => (prev.includes(id) ? prev : [...prev, id]));
    onSectionChange(id);
  };

  const isMounted = (id) => id === section || visited.includes(id);

  return (
    <div>
      <div className="action-sections" role="group" aria-label="Action list sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`action-section-btn ${section === s.id ? 'is-active' : ''}`}
            aria-pressed={section === s.id}
            onClick={() => select(s.id)}
          >
            {isPhone ? s.phoneLabel : s.label}
          </button>
        ))}
      </div>

      {isMounted('overdue') && (
        <div style={{ display: section === 'overdue' ? 'block' : 'none' }}>
          <OverdueDashboard onSelectDue={onSelectDue} />
        </div>
      )}
      {isMounted('f1f26') && (
        <div style={{ display: section === 'f1f26' ? 'block' : 'none' }}>
          <F1F26Delayed onSelectPatent={(title, rows, p) => onSelectPatent(title, rows, p && { tab: 'f1f26', patent: p })} />
        </div>
      )}
      {isMounted('f9f18') && (
        <div style={{ display: section === 'f9f18' ? 'block' : 'none' }}>
          <F9F18Check onSelectPatent={(title, rows, p) => onSelectPatent(title, rows, p && { tab: 'f9f18', patent: p })} />
        </div>
      )}
      {isMounted('dataIssues') && (
        <div style={{ display: section === 'dataIssues' ? 'block' : 'none' }}>
          <F9F18DataIssues />
        </div>
      )}
    </div>
  );
}

export default ActionList;
