import WorkHoursCard, { type SaveWorkHours } from '../WorkHoursCard/WorkHoursCard.tsx';
import AddStaffForm, { type AddStaff } from '../AddStaffForm/AddStaffForm.tsx';
import type { WorkHoursView as WorkHoursViewData } from '@/api/attendanceApi.ts';
import type { ViewMode } from '@/hooks/useDirectorDashboard.ts';
import StatusMessage from '../StatusMessage/StatusMessage.tsx';
import '../../styles/CardGrid.scss';

// The director dashboard's Staff tab: an Add Staff form, then every
// person's editable Work Hours.
interface WorkHoursViewProps {
  data: WorkHoursViewData | null;
  loading: boolean;
  error: string | null;
  onSaveWorkHours: SaveWorkHours;
  onAddStaff: AddStaff;
  viewMode: ViewMode;
}

export default function WorkHoursView({ data, loading, error, onSaveWorkHours, onAddStaff, viewMode }: WorkHoursViewProps) {
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
