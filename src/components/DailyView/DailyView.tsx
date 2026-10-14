import DailySummary from '../DailySummary/DailySummary.tsx';
import AttendanceCard from '../AttendanceCard/AttendanceCard.tsx';
import type { DailyView as DailyViewData } from '@/api/attendanceApi.ts';
import type { ViewMode } from '@/hooks/useDirectorDashboard.ts';
import '@/styles/CardGrid.scss';

export default function DailyView({ data, viewMode }: { data: DailyViewData; viewMode: ViewMode }) {
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
