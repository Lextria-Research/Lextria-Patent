import MobileCard from './MobileCard';
import Assignee from './Assignee';
import { StatusBadge } from './DueTable';
import { formatDate, formatDueSoonDate, shortDueType, overdueLabel } from './dueConstants';
import { AppNoValue } from './CopyButton';

// Phone card for one due, shared by the monthly list and the Due soon view.
// Same data and colours as the desktop rows; view only (no edit control).
//
//   todayIso  passed by Due soon (the server's "today"): the deadline reads
//             "Today" / "Sun 20 Sep" like its table, today's cards get the
//             yellow tint, and there is no "overdue" text.
//             Omitted by the monthly list: dd/mm/yyyy, and an overdue due gets
//             the red tint and "N days overdue".
function DueMobileCard({ due, onOpen, todayIso }) {
  const isSoon = todayIso !== undefined;
  const overdue = isSoon ? '' : overdueLabel(due);
  const deadlineText = isSoon ? formatDueSoonDate(due.deadline, todayIso) : formatDate(due.deadline);

  let tone;
  if (isSoon) tone = due.deadline === todayIso ? 'warn' : undefined;
  else if (due.status === 'overdue') tone = 'bad';

  const postdate = String(due.postDateMonths ?? '').trim();

  return (
    <MobileCard
      code={due.code}
      onOpen={onOpen}
      tone={tone}
      codeSubBadge={due.isAbandoned && !isSoon ? <span className="status-pill is-abandoned">Abandoned</span> : null}
      badge={
        <span
          className="due-type-pill"
          title={due.dueType === 'WRITTEN SUBMISSION' ? due.dueType : undefined}
        >
          {shortDueType(due.dueType)}
        </span>
      }
      title={due.title}
      pills={[
        <StatusBadge key="status" status={due.status} />,
        <span key="deadline" className={`due-deadline ${overdue ? 'is-overdue' : ''}`}>
          {deadlineText}
          {overdue && ` · ${overdue}`}
        </span>,
      ]}
      note={postdate ? `Can be postdated: ${postdate}` : ''}
      footerLeft={<AppNoValue value={due.applicationNumber} />}
      footerRight={
        <>
          <span className="mobile-card-footer-label">Assigned to</span>
          <Assignee name={due.assignedTo} />
        </>
      }
    />
  );
}

export default DueMobileCard;
