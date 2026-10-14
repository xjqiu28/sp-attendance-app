import EditEntryCard, { type SaveEntry } from '../EditEntryCard/EditEntryCard.tsx';
import type { EditDayView as EditDayViewData } from '@/api/attendanceApi.ts';
import type { ViewMode } from '@/hooks/useDirectorDashboard.ts';
import StatusMessage from '../StatusMessage/StatusMessage.tsx';
import '../LoginCard/LoginCard.scss'; // label/input base styles for the date field
import '../../styles/CardGrid.scss';
import './EditDayView.scss';

interface EditDayViewProps {
  date: string; // <input type="date"> value
  onDateChange: (date: string) => void;
  data: EditDayViewData | null;
  loading: boolean;
  error: string | null;
  onSaveEntry: SaveEntry;
  viewMode: ViewMode;
}

export default function EditDayView({ date, onDateChange, data, loading, error, onSaveEntry, viewMode }: EditDayViewProps) {
  return (
    <div className="edit-day">
      <div className="edit-day-date-field">
        <label htmlFor="edit-day-date">Date</label>
        <input
          type="date"
          id="edit-day-date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </div>

      {error && <StatusMessage text={error} type="error" />}

      {loading ? (
        <StatusMessage text="Loading..." type="" />
      ) : (
        data && (
          <div className={viewMode === 'list' ? 'entry-list' : 'card-grid'}>
            {data.entries.map((entry) => (
              <EditEntryCard key={entry.name} entry={entry} onSave={onSaveEntry} viewMode={viewMode} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
