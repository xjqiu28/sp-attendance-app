import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import DailySummary from './DailySummary.jsx';

function listCard(title) {
  return screen.getByRole('heading', { name: new RegExp(`^${title} \\(`) }).closest('.summary-list');
}

describe('DailySummary', () => {
  it('shows how many of the roster have signed in', () => {
    render(<DailySummary totalRoster={6} totalSignedIn={2} absentNames={[]} signedInEntries={[]} />);

    expect(screen.getByText('2 / 6')).toBeInTheDocument();
  });

  it('lists who signed in, with a Late badge and how late beside late names', () => {
    render(
      <DailySummary
        totalRoster={3}
        totalSignedIn={2}
        absentNames={['John Smith']}
        signedInEntries={[
          { name: 'Jane Doe', isLate: false, lateBy: null },
          { name: 'Alex Kim', isLate: true, lateBy: { formatted: '15 minutes' } },
        ]}
      />
    );

    const signedIn = listCard('Signed In');
    expect(within(signedIn).getByRole('heading')).toHaveTextContent('Signed In (2)');

    const [jade, wendy] = within(signedIn).getAllByRole('listitem');
    expect(jade).toHaveTextContent('Jane Doe');
    expect(within(jade).queryByText('Late')).not.toBeInTheDocument();
    expect(within(wendy).getByText('Late')).toHaveClass('badge', 'status-late');
    expect(wendy).toHaveTextContent('15 minutes');
  });

  it('lists who is absent', () => {
    render(<DailySummary totalRoster={2} totalSignedIn={0} absentNames={['John Smith', 'Jane Doe']} signedInEntries={[]} />);

    const absent = listCard('Absent');
    expect(within(absent).getByRole('heading')).toHaveTextContent('Absent (2)');
    expect(within(absent).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['John Smith', 'Jane Doe']);
  });

  it('shows empty messages when nobody has signed in or nobody is absent', () => {
    const { rerender } = render(<DailySummary totalRoster={1} totalSignedIn={0} absentNames={['John Smith']} signedInEntries={[]} />);
    expect(screen.getByText('Nobody has signed in yet.')).toBeInTheDocument();

    rerender(
      <DailySummary
        totalRoster={1}
        totalSignedIn={1}
        absentNames={[]}
        signedInEntries={[{ name: 'John Smith', isLate: false, lateBy: null }]}
      />
    );
    expect(screen.getByText('Everyone has signed in.')).toBeInTheDocument();
  });
});
