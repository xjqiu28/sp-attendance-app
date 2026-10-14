import WorkHoursCard from '../WorkHoursCard/WorkHoursCard.jsx';
import AddStaffForm from '../AddStaffForm/AddStaffForm.jsx';
import StatusMessage from '../StatusMessage/StatusMessage.jsx';
import '../../styles/CardGrid.scss';

// The director dashboard's Staff tab: an Add Staff form, then every
// person's editable Work Hours.
export default function WorkHoursView({ data, loading, error, onSaveWorkHours, onAddStaff, viewMode }) {
  return (
    <>
      <AddStaffForm onAdd={onAddStaff} />

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
