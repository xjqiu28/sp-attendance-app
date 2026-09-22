import './WorkHoursNotes.scss';

// Arrived early/late, left early/stayed late compared to someone's
// "Work Hours" roster column — see getWorkHoursNotes (gas/Utils.gs).
// Renders nothing when there are no notes.
export default function WorkHoursNotes({ notes }) {
  if (!notes || notes.length === 0) {
    return null;
  }

  return (
    <div className="work-hours-notes">
      {notes.map((note) => (
        <span key={note.type} className={`work-hours-note work-hours-note-${note.type}`}>
          {note.text}
        </span>
      ))}
    </div>
  );
}
