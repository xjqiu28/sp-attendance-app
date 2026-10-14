import type { WeekOption } from '@/api/attendanceApi.ts';
import './WeekSelector.scss';

interface WeekSelectorProps {
  availableWeeks: Pick<WeekOption, 'weekNumber' | 'label'>[] | undefined;
  currentWeekNumber?: number;
  onSelect: (weekNumber: number) => void;
}

export default function WeekSelector({ availableWeeks, currentWeekNumber, onSelect }: WeekSelectorProps) {
  if (!availableWeeks || availableWeeks.length === 0) {
    return null;
  }

  return (
    <div className="week-selector">
      {availableWeeks.map((week) => (
        <button
          key={week.weekNumber}
          type="button"
          className={week.weekNumber === currentWeekNumber ? 'week-button active' : 'week-button'}
          onClick={() => onSelect(week.weekNumber)}
        >
          {week.label}
        </button>
      ))}
    </div>
  );
}
