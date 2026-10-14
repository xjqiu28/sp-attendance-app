import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkHoursNotes from './WorkHoursNotes.jsx';

describe('WorkHoursNotes', () => {
  it('renders nothing without notes', () => {
    expect(render(<WorkHoursNotes notes={null} />).container).toBeEmptyDOMElement();
    expect(render(<WorkHoursNotes notes={[]} />).container).toBeEmptyDOMElement();
  });

  it('renders each note with a class for its type', () => {
    render(
      <WorkHoursNotes
        notes={[
          { type: 'arrived-late', text: 'Arrived 15 minutes late' },
          { type: 'left-early', text: 'Left 5 minutes early' },
        ]}
      />
    );

    expect(screen.getByText('Arrived 15 minutes late')).toHaveClass('work-hours-note', 'work-hours-note-arrived-late');
    expect(screen.getByText('Left 5 minutes early')).toHaveClass('work-hours-note', 'work-hours-note-left-early');
  });
});
