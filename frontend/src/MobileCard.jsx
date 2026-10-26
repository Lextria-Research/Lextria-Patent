import { Fragment } from 'react';

// Reusable phone card for a tab's rows. LR records uses it so far; tasks 4-11
// adopt it one tab at a time.
//
// A tab switches between its table (desktop/tablet) and these cards (phone)
// with useIsPhone(), so only one of them is ever in the DOM:
//
//   const isPhone = useIsPhone();
//   ...
//   isPhone ? (
//     <MobileCardList>
//       {rows.map((r) => (
//         <MobileCard
//           key={r.key}
//           code={r.code}
//           onOpen={() => onSelectDue(r)}        // same handler the table's code link uses
//           badge={<StatusBadge status={r.status} />}
//           tone={r.status === 'overdue' ? 'bad' : undefined}
//           fields={[
//             { label: 'Deadline', value: r.deadline },
//             { label: 'Due type', value: r.dueType },
//             { label: 'Assignee', value: r.assignedTo },
//           ]}
//         />
//       ))}
//     </MobileCardList>
//   ) : (
//     <div className="table-wrap">…existing table…</div>
//   )
//
// A row with a title/institution/status-pill shape (LR records) uses `pills`
// and `footerLeft`/`footerRight` instead of `fields`:
//
//   <MobileCard
//     code={r.code}
//     onOpen={() => onSelectCode(r.code)}
//     title={r.title}
//     subtitle={r.institution}
//     pills={[maheBadge, statusPill]}                        // falsy entries skipped
//     footerLeft={r.applicationNumber}
//     footerRight={r.assignedTo && (
//       <>
//         <span className="mobile-card-footer-label">Assigned to</span>
//         <Assignee name={r.assignedTo} />
//       </>
//     )}
//   />
//
// Props (all but `code` and `onOpen` are optional; empty ones render nothing,
// and never leave a gap behind — each row's own top margin is what makes the
// space, so a missing row just isn't there)
//   code        text shown top-left in the accent colour
//   onOpen      called when the card is tapped (the whole card is one button)
//   badge       node shown top-right, before the chevron (e.g. a status badge)
//   title       text under the code, clamped to 2 lines
//   subtitle    text under the title, 1 line, small and muted (e.g. institution)
//   fields      [{ label, value }] — one line each; empty values show "—".
//               `value` may be any React node.
//   boxes       [{ label, value, tone }] — a 2-column grid of small boxes, each a
//               small muted label above its value (e.g. F1/F26's "Form 1");
//               tone 'warn' colours the value amber. Empty values show "—".
//   pills       array of nodes (falsy entries are skipped) shown as a
//               wrapping row of small pills, e.g. a MAHE badge + status pill
//   footerLeft  node for the bottom-left of a divided footer row (e.g. an
//               application number)
//   footerRight node for the bottom-right of that row (e.g. "Assigned to" +
//               a name pill) — stays right-aligned even when footerLeft is
//               empty
//   text        a full-width line of normal-coloured text right under the
//               title / subtitle, before the pills, wrapping over as many
//               lines as it needs and never cut (e.g. Abandoned patents'
//               STATUS); nothing when empty
//   note        muted line under the pills, wraps onto as many lines as it
//               needs (e.g. "Can be postdated: ..."); nothing when empty
//   tone        'bad' | 'warn' | 'ok' background tint / left edge
//   codeSubBadge  optional node shown on its own line directly under the
//               code (e.g. the Due dashboard/Overdue "Abandoned" pill).
//               Only used where a caller passes it — every other card keeps
//               its original single-line code, unchanged.
function MobileCard({
  code, onOpen, fields = [], boxes = [], pills, badge, tone, title, subtitle, text, note, footerLeft, footerRight,
  codeSubBadge,
}) {
  const pillList = (pills || []).filter(Boolean);
  return (
    <button
      type="button"
      className={`mobile-card ${tone ? `tone-${tone}` : ''}`}
      onClick={onOpen}
    >
      <span className="mobile-card-top">
        {codeSubBadge ? (
          <span className="mobile-card-code-stack">
            <span className="mobile-card-code">{code}</span>
            {codeSubBadge}
          </span>
        ) : (
          <span className="mobile-card-code">{code}</span>
        )}
        {badge && <span className="mobile-card-badge">{badge}</span>}
        <svg
          className="mobile-card-chevron"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 3l5 5-5 5" />
        </svg>
      </span>
      {title && <span className="mobile-card-title">{title}</span>}
      {subtitle && <span className="mobile-card-subtitle">{subtitle}</span>}
      {text && <span className="mobile-card-text">{text}</span>}
      {boxes.length > 0 && (
        <span className="mobile-card-boxes">
          {boxes.map((b) => (
            <span key={b.label} className="mobile-card-box">
              <span className="mobile-card-box-label">{b.label}</span>
              <span className={`mobile-card-box-value ${b.tone ? `is-${b.tone}` : ''}`}>
                {b.value === undefined || b.value === null || b.value === '' ? '—' : b.value}
              </span>
            </span>
          ))}
        </span>
      )}
      {fields.length > 0 && (
        <span className="mobile-card-fields">
          {fields.map((f) => (
            <span key={f.label} className="mobile-card-field">
              <span className="mobile-card-label">{f.label}</span>
              <span className="mobile-card-value">
                {f.value === undefined || f.value === null || f.value === '' ? '—' : f.value}
              </span>
            </span>
          ))}
        </span>
      )}
      {pillList.length > 0 && (
        <span className="mobile-card-pills">
          {pillList.map((p, i) => <Fragment key={i}>{p}</Fragment>)}
        </span>
      )}
      {note && <span className="mobile-card-note">{note}</span>}
      {(footerLeft || footerRight) && (
        <span className="mobile-card-footer">
          {footerLeft && <span className="mobile-card-footer-left">{footerLeft}</span>}
          {footerRight && <span className="mobile-card-footer-right">{footerRight}</span>}
        </span>
      )}
    </button>
  );
}

export function MobileCardList({ children }) {
  return <div className="mobile-card-list">{children}</div>;
}

export default MobileCard;
