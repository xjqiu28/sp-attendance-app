import WeekSelector from '../WeekSelector/WeekSelector.jsx';
import GenerateReportPanel from '../GenerateReportPanel/GenerateReportPanel.jsx';
import WeeklyTotalCard from '../WeeklyTotalCard/WeeklyTotalCard.jsx';
import '@/styles/CardGrid.scss';

export default function WeeklyView({ data, onWeekChange, viewMode, onApproveWeek, onUnapproveWeek, onGenerateReport }) {
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
