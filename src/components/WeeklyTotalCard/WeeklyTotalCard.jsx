import { useState } from 'react';
import StatusMessage from '../StatusMessage/StatusMessage.jsx';
import WorkHoursNotes from '../WorkHoursNotes/WorkHoursNotes.jsx';
import { formatTimeOnly } from '../../utils/dateTimeFormat.js';
import '@/components/AttendanceCard/AttendanceCard.scss';
import './WeeklyTotalCard.scss';

export default function WeeklyTotalCard({ entry, viewMode, weekStart, onApprove, onUnapprove }) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveStatus, setApproveStatus] = useState(null); // { text, type }

  // Approving/unapproving live inside the same clickable card that
  // toggles the day breakdown open/closed — stopPropagation keeps a
  // click on either button from also expanding/collapsing it.
  async function handleApprove(event) {
    event.stopPropagation();
    await runApprovalAction(() => onApprove(entry.name, weekStart));
  }

  async function handleUnapprove(event) {
    event.stopPropagation();
    await runApprovalAction(() => onUnapprove(entry.name, weekStart));
  }

  async function runApprovalAction(action) {
    setApproving(true);
    setApproveStatus(null);

    const result = await action();

    // On success, the badge/detail itself (entry.approval, updated by
    // the parent) already reflects the new state — no separate status
    // line needed. Only show one for a failure.
    setApproveStatus(result.success ? null : { text: result.error, type: 'error' });
    setApproving(false);
  }

  return (
    <div
      className={`${viewMode === 'list' ? 'attendance-row' : 'attendance-card'} weekly-card`}
      onClick={() => setExpanded((previous) => !previous)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          setExpanded((previous) => !previous);
        }
      }}
    >
      <div className="attendance-card-header">
        <span className="attendance-card-name">{entry.name}</span>
        <div className="attendance-card-badges">
          {entry.overCap &&
            (entry.approval ? (
              <span className="badge status-approved">Approved</span>
            ) : (
              <span className="badge status-needs-approval">Needs Approval</span>
            ))}
          <span className="expand-indicator">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <div className="attendance-card-fields">
        {entry.workHours && (
          <div className="attendance-card-row">
            <span className="attendance-card-label">Work Hours</span>
            <span>{entry.workHours}</span>
          </div>
        )}

        <div className="attendance-card-row">
          <span className="attendance-card-label">Total Hours</span>
          <span className="attendance-card-total">{entry.weekTotalFormatted}</span>
        </div>
      </div>

      {entry.overCap && (
        <div className="weekly-approval">
          <span className="weekly-approval-cap">Cap: {entry.maxWeeklyHours} hrs/week</span>

          {entry.approval ? (
            <>
              <span className="weekly-approval-detail">
                Approved by {entry.approval.approvedBy} on {entry.approval.approvedAt}
              </span>
              <button type="button" className="weekly-approval-undo" onClick={handleUnapprove} disabled={approving}>
                {approving ? 'Undoing...' : 'Unapprove'}
              </button>
            </>
          ) : (
            <button type="button" onClick={handleApprove} disabled={approving}>
              {approving ? 'Approving...' : 'Approve'}
            </button>
          )}

          <StatusMessage text={approveStatus?.text} type={approveStatus?.type} />
        </div>
      )}

      {expanded && (
        <div className="weekly-breakdown">
          {entry.days.map((day) => (
            <div key={day.date} className="weekly-breakdown-row">
              <div className="weekly-breakdown-top">
                <span className="weekly-breakdown-day">{day.label}</span>
                <span>
                  {day.signInTime
                    ? `${formatTimeOnly(day.signInTime)} - ${
                        day.signOutTime ? formatTimeOnly(day.signOutTime) : '—'
                      }`
                    : 'Not signed in'}
                </span>
              </div>

              {day.hoursFormatted && <div className="weekly-breakdown-hours">{day.hoursFormatted}</div>}
              <WorkHoursNotes notes={day.workHoursNotes} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
