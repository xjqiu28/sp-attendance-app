import WorkHoursCard from '../WorkHoursCard/WorkHoursCard.jsx';
import StatusMessage from '../StatusMessage/StatusMessage.jsx';
import '../../styles/CardGrid.scss';

export default function WorkHoursView({ data, loading, error, onSaveWorkHours, viewMode }) {
  return (
    <>
      {error && <StatusMessage text={error} type="error" />}

      {loading ? (
        <StatusMessage text="Loading..." type="" />
      ) : (
        data && (
          <div className={viewMode === 'list' ? 'entry-list' : 'card-grid'}>
            {data.entries.map((entry) => (
              <WorkHoursCard key={entry.name} entry={entry} onSave={onSaveWorkHours} viewMode={viewMode} />
            ))}
          </div>
        )
      )}
    </>
  );
}
