import { cloneElement } from 'react';

const ICON_PROPS = {
  className: 'phone-btn-icon',
  viewBox: '0 0 16 16',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

const CalendarIcon = () => (
  <svg
    className="field-icon"
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="2" y="3" width="12" height="11" rx="1.5" />
    <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
  </svg>
);
const RefreshIcon = () => (
  <svg {...ICON_PROPS}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" /></svg>
);
const ExportIcon = () => (
  <svg {...ICON_PROPS}><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" /></svg>
);

// Phone layout of a tab's controls, top to bottom: search, every filter of the
// tab (always visible, two per row), then a Refresh / Export row. Each tab
// passes its own pieces; nothing tab-specific lives here.
//
//   search   { input, placeholder, value, onClear }
//              input:       the tab's own <input> (its desktop placeholder is
//                           replaced by the shorter `placeholder` here)
//              omit for a tab with no search
//   filters  [{ id, label, control, wide, hint, empty }]  same order as desktop
//              control: the tab's own <select>/<input> (its id = `id`)
//              wide:    always take a full row (the last filter of an odd
//                       count does this automatically, in CSS)
//              hint:    for a date field: placeholder text (e.g. "dd-mm-yyyy")
//                       shown while `empty` is true, plus a calendar icon
//            omit or pass [] for a tab with no filters
//   actions  { onRefresh, refreshing, onExport, exportDisabled }
//              onExport is optional; LR records has no export, so no button
function PhoneToolbar({ search, filters = [], actions }) {
  return (
    <div className="phone-toolbar">
      {search && (
        <div className="phone-search search-wrap">
          {cloneElement(search.input, { placeholder: search.placeholder })}
          {search.value && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={search.onClear}
            >
              ×
            </button>
          )}
        </div>
      )}

      {filters.length > 0 && (
        <div className="phone-filters">
          {filters.map((f) => (
            <div key={f.id} className={`field ${f.wide ? 'is-wide' : ''}`}>
              <label className="field-label" htmlFor={f.id}>{f.label}</label>
              {f.hint ? (
                <div className="field-control">
                  {f.control}
                  {f.empty && <span className="field-hint" aria-hidden="true">{f.hint}</span>}
                  <CalendarIcon />
                </div>
              ) : f.control}
            </div>
          ))}
        </div>
      )}

      <div className="phone-actions" style={{ '--phone-actions-cols': actions.onExport ? 2 : 1 }}>
        <button
          type="button"
          className="btn phone-btn"
          onClick={actions.onRefresh}
          disabled={actions.refreshing}
        >
          <RefreshIcon />
          {actions.refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        {actions.onExport && (
          <button
            type="button"
            className="btn phone-btn"
            onClick={actions.onExport}
            disabled={actions.exportDisabled}
          >
            <ExportIcon />
            Export
          </button>
        )}
      </div>
    </div>
  );
}

export default PhoneToolbar;
