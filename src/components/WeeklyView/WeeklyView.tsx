import WeekSelector from '../WeekSelector/WeekSelector.tsx';
import GenerateReportPanel from '../GenerateReportPanel/GenerateReportPanel.tsx';
import WeeklyTotalCard from '../WeeklyTotalCard/WeeklyTotalCard.tsx';
import type { Result, WeeklyView as WeeklyViewData } from '@/api/attendanceApi.ts';
import type { ViewMode } from '@/hooks/useDirectorDashboard.ts';
import type { ReportResult } from '../GenerateReportPanel/GenerateReportPanel.tsx';
import '@/styles/CardGrid.scss';

interface WeeklyViewProps {
  data: WeeklyViewData;
  onWeekChange: (weekNumber: number) => void;
  viewMode: ViewMode;
  onApproveWeek: (targetName: string, weekStart: string) => Promise<Result<object>>;
  onUnapproveWeek: (targetName: string, weekStart: string) => Promise<Result<object>>;
  onGenerateReport: (weekStart: string, email: string) => Promise<ReportResult>;
}

export default function WeeklyView({
  data,
  onWeekChange,
  viewMode,
  onApproveWeek,
  onUnapproveWeek,
  onGenerateReport,
}: WeeklyViewProps) {
  return (
    <>
      <WeekSelector
        availableWeeks={data.availableWeeks}
        currentWeekNumber={data.weekNumber}
        onSelect={onWeekChange}
      />

      <GenerateReportPanel key={data.weekStart} weekStart={data.weekStart} onGenerate={onGenerateReport} />

      <div className={viewMode === 'list' ? 'entry-list' : 'card-grid'}>
        {data.entries.map((entry) => (
          <WeeklyTotalCard
            key={entry.name}
            entry={entry}
            viewMode={viewMode}
            weekStart={data.weekStart}
            onApprove={onApproveWeek}
            onUnapprove={onUnapproveWeek}
          />
        ))}
      </div>
    </>
  );
}
