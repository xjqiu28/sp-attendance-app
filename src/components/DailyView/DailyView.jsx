import DailySummary from '../DailySummary/DailySummary.jsx';
import AttendanceCard from '../AttendanceCard/AttendanceCard.jsx';
import '@/styles/CardGrid.scss';

export default function DailyView({ data, viewMode }) {
  return (
    <>
      <DailySummary
        totalRoster={data.totalRoster}
        totalSignedIn={data.totalSignedIn}
        absentNames={data.absentNames}
        signedInEntries={data.entries.filter((entry) => entry.signInTime)}
      />

      <div className={viewMode === 'list' ? 'entry-list' : 'card-grid'}>
        {data.entries.map((entry) => (
          <AttendanceCard key={entry.name} entry={entry} viewMode={viewMode} />
        ))}
      </div>
    </>
  );
}
