import WorkHoursNotes from '../WorkHoursNotes/WorkHoursNotes.jsx';
import './AttendanceCard.scss';

const STATUS_CLASS = {
  Complete: 'status-complete',
  'Signed In': 'status-signed-in',
  'Not Signed In': 'status-not-signed-in',
};

export default function AttendanceCard({ entry, viewMode }) {
  return (
    <div className={viewMode === 'list' ? 'attendance-row' : 'attendance-card'}>
      <div className="attendance-card-header">
        <span className="attendance-card-name">{entry.name}</span>
        <div className="attendance-card-badges">
          {entry.isLate && <span className="badge status-late">Late</span>}
          <span className={`badge ${STATUS_CLASS[entry.status] || ''}`}>{entry.status}</span>
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
          <span className="attendance-card-label">Sign In</span>
          <span>{entry.signInTime || '—'}</span>
        </div>

        <div className="attendance-card-row">
          <span className="attendance-card-label">Sign Out</span>
          <span>{entry.signOutTime || '—'}</span>
        </div>

        <div className="attendance-card-row">
          <span className="attendance-card-label">Total Hours</span>
          <span>{entry.totalHoursFormatted || '—'}</span>
        </div>
      </div>

      <WorkHoursNotes notes={entry.workHoursNotes} />
    </div>
  );
}
