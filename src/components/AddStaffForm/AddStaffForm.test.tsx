import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddStaffForm from './AddStaffForm.tsx';

async function openForm(onAdd = vi.fn()) {
  render(<AddStaffForm onAdd={onAdd} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Add Staff' }));
  return onAdd;
}

describe('AddStaffForm', () => {
  it('starts collapsed to a single button', () => {
    render(<AddStaffForm onAdd={vi.fn()} />);

    expect(screen.getByRole('button', { name: '+ Add Staff' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Name *')).not.toBeInTheDocument();
  });

  it('opens the form, and Close collapses it again', async () => {
    await openForm();

    expect(screen.getByRole('heading', { name: 'Add Staff' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByLabelText('Name *')).not.toBeInTheDocument();
  });

  it('requires a name', async () => {
    const onAdd = await openForm();

    await userEvent.click(screen.getByRole('button', { name: 'Add Staff' }));

    expect(screen.getByText('A name is required.')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('requires a personal code or a birthday', async () => {
    const onAdd = await openForm();

    await userEvent.type(screen.getByLabelText('Name *'), 'Jane Doe');
    await userEvent.click(screen.getByRole('button', { name: 'Add Staff' }));

    expect(screen.getByText('Enter a personal code or a birthday to generate one from.')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('sends every field, then resets the form and shows the result', async () => {
    const onAdd = await openForm(vi.fn().mockResolvedValue({ success: true, message: 'Added Jane Doe. Their personal code is 01022003.' }));

    await userEvent.type(screen.getByLabelText('Name *'), 'Jane Doe');
    fireEvent.change(screen.getByLabelText('Birthday'), { target: { value: '2003-01-02' } });
    await userEvent.type(screen.getByLabelText('Work Hours Start'), '09:00');
    await userEvent.type(screen.getByLabelText('Work Hours End'), '15:00');
    await userEvent.type(screen.getByLabelText('Max Weekly Hours'), '20');
    await userEvent.click(screen.getByLabelText('Admin (director access)'));
    await userEvent.click(screen.getByRole('button', { name: 'Add Staff' }));

    expect(onAdd).toHaveBeenCalledWith({
      name: 'Jane Doe',
      birthday: '2003-01-02',
      personalCode: '',
      startTime: '09:00',
      endTime: '15:00',
      maxWeeklyHours: '20',
      isAdmin: true,
    });
    expect(await screen.findByText('Added Jane Doe. Their personal code is 01022003.')).toHaveClass('success');
    expect(screen.getByLabelText('Name *')).toHaveValue('');
    expect(screen.getByLabelText('Admin (director access)')).not.toBeChecked();
  });

  it('accepts a personal code without a birthday', async () => {
    const onAdd = await openForm(vi.fn().mockResolvedValue({ success: true, message: 'Added.' }));

    await userEvent.type(screen.getByLabelText('Name *'), 'John Smith');
    await userEvent.type(screen.getByLabelText('Personal Code'), 'A1');
    await userEvent.click(screen.getByRole('button', { name: 'Add Staff' }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'John Smith', personalCode: 'A1', birthday: '' }));
  });

  it('keeps what was typed and shows the error when adding fails', async () => {
    await openForm(vi.fn().mockResolvedValue({ success: false, error: 'John Smith is already on the roster.' }));

    await userEvent.type(screen.getByLabelText('Name *'), 'John Smith');
    await userEvent.type(screen.getByLabelText('Personal Code'), 'A1');
    await userEvent.click(screen.getByRole('button', { name: 'Add Staff' }));

    expect(await screen.findByText('John Smith is already on the roster.')).toHaveClass('error');
    expect(screen.getByLabelText('Name *')).toHaveValue('John Smith');
  });
});
