import '../AttendanceCard/AttendanceCard.scss'; // .badge / .status-late, same Late badge as the cards below
import './DailySummary.scss';

function SummaryNameList({ title, items, emptyText, renderItem }) {
  return (
    <div className="summary-list">
      <h2 className="summary-list-title">
        {title} ({items.length})
      </h2>

      {items.length === 0 ? (
        <p className="summary-list-empty">{emptyText}</p>
      ) : (
        <ul className="summary-list-items">
          {items.map((item) => {
            const name = typeof item === 'string' ? item : item.name;
            return <li key={name}>{renderItem ? renderItem(item) : name}</li>;
          })}
        </ul>
      )}
    </div>
  );
}

// signedInEntries: today's entries that have a sign-in (whether or not
// they've signed out since), each with isLate/lateBy.
export default function DailySummary({ totalRoster, totalSignedIn, absentNames, signedInEntries }) {
  return (
    <div className="daily-summary">
      <div className="summary-stat">
        <span className="summary-stat-value">
          {totalSignedIn} / {totalRoster}
        </span>
        <span className="summary-stat-label">Signed In</span>
      </div>

      <SummaryNameList
        title="Signed In"
        items={signedInEntries}
        emptyText="Nobody has signed in yet."
        renderItem={(entry) => (
          <>
            {entry.name}
            {entry.isLate && (
              <>
                {' '}
                <span className="badge status-late">Late</span>
                {entry.lateBy && <span className="summary-list-detail"> {entry.lateBy.formatted}</span>}
              </>
            )}
          </>
        )}
      />
      <SummaryNameList title="Absent" items={absentNames} emptyText="Everyone has signed in." />
    </div>
  );
}
