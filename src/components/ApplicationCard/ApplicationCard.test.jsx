import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplicationCard from './ApplicationCard.jsx';

const ENTRY = {
  firstName: 'Jane',
  lastName: 'Doe',
  title: 'Counselor',
  dateInformation: '7/6 - 8/14',
  time: '8:30am - 3:30pm',
  rate: 18.5,
  email: 'jane.doe@example.com',
  sent: 'sent',
  paidHours: '',
  volunteerHours: '',
  missingDocuments: 'ID',
  acceptDecline: 'Accept',
  ss: '',
  w4Forms: '',
};

describe('ApplicationCard', () => {
  it('shows the summary fields, with the rate as dollars per hour', () => {
    render(<ApplicationCard entry={ENTRY} onSave={vi.fn()} viewMode="card" />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Counselor')).toBeInTheDocument();
    expect(screen.getByText('7/6 - 8/14')).toBeInTheDocument();
    expect(screen.getByText('8:30am - 3:30pm')).toBeInTheDocument();
    expect(screen.getByText('$18.50/hr')).toBeInTheDocument();
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
  });

  it('shows a dash for an empty field and a missing rate', () => {
    render(<ApplicationCard entry={{ ...ENTRY, rate: null }} onSave={vi.fn()} viewMode="card" />);

    expect(screen.getByText('Rate').nextElementSibling).toHaveTextContent('—');
    expect(screen.getByText('Paid Hours').nextElementSibling).toHaveTextContent('—');
  });

  it('shows Sent and Accept/Decline badges', () => {
    const { rerender } = render(<ApplicationCard entry={ENTRY} onSave={vi.fn()} viewMode="card" />);
    expect(screen.getByText('Sent')).toHaveClass('badge');
    expect(screen.getByText('Accept')).toHaveClass('badge', 'status-complete');

    rerender(<ApplicationCard entry={{ ...ENTRY, sent: '', acceptDecline: 'Decline' }} onSave={vi.fn()} viewMode="card" />);
    expect(screen.queryByText('Sent')).not.toBeInTheDocument();
    expect(screen.getByText('Decline')).toHaveClass('badge', 'status-late');
  });

  it('hides the editable fields until the header is clicked', async () => {
    render(<ApplicationCard entry={ENTRY} onSave={vi.fn()} viewMode="card" />);
    const header = screen.getByRole('button', { name: /Jane Doe/ });

    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Missing Documents')).not.toBeInTheDocument();

    await userEvent.click(header);

    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Missing Documents')).toHaveValue('ID');
    expect(screen.getByLabelText('Accept/Decline')).toHaveValue('Accept');
  });

  it('opens with the keyboard', async () => {
    render(<ApplicationCard entry={ENTRY} onSave={vi.fn()} viewMode="card" />);

    screen.getByRole('button', { name: /Jane Doe/ }).focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByLabelText('Missing Documents')).toBeInTheDocument();
  });

  it('saves the edited tracking fields by email', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    render(<ApplicationCard entry={ENTRY} onSave={onSave} viewMode="card" />);

    await userEvent.click(screen.getByRole('button', { name: /Jane Doe/ }));
    await userEvent.clear(screen.getByLabelText('Missing Documents'));
    await userEvent.selectOptions(screen.getByLabelText('Accept/Decline'), 'Decline');
    await userEvent.type(screen.getByLabelText('SS'), 'Received');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('jane.doe@example.com', {
      missingDocuments: '',
      acceptDecline: 'Decline',
      ss: 'Received',
      w4Forms: '',
    });
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('shows the error when saving fails', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: false, error: 'Applicant not found.' });
    render(<ApplicationCard entry={ENTRY} onSave={onSave} viewMode="card" />);

    await userEvent.click(screen.getByRole('button', { name: /Jane Doe/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Applicant not found.')).toHaveClass('error');
  });
});
