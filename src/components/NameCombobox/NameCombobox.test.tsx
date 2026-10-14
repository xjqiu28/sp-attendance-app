import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NameCombobox from './NameCombobox.tsx';

const NAMES = ['John Smith', 'Jane Doe', 'Alex Kim'];

// Holds selectedName like a real parent does, and reports every change.
function Harness({ onNameChange = () => {}, initial = '' }: { onNameChange?: (name: string) => void; initial?: string }) {
  const [selectedName, setSelectedName] = useState(initial);
  return (
    <>
      <NameCombobox
        id="name"
        names={NAMES}
        placeholder="Type or select your name"
        selectedName={selectedName}
        onNameChange={(name) => {
          setSelectedName(name);
          onNameChange(name);
        }}
      />
      <output data-testid="selected">{selectedName}</output>
    </>
  );
}

function optionNames() {
  return screen.queryAllByRole('option').map((option) => option.textContent);
}

describe('NameCombobox', () => {
  it('opens the full list when focused', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
    expect(optionNames()).toEqual(NAMES);
  });

  it('narrows the list as you type, tolerating a typo', async () => {
    render(<Harness />);

    await userEvent.type(screen.getByRole('combobox'), 'smiht');

    expect(optionNames()).toEqual(['John Smith']);
  });

  it('says when nothing matches', async () => {
    render(<Harness />);

    await userEvent.type(screen.getByRole('combobox'), 'zzz');

    expect(optionNames()).toEqual([]);
    expect(screen.getByText('No names match "zzz"')).toBeInTheDocument();
  });

  it('selects a name when its option is clicked', async () => {
    const onNameChange = vi.fn();
    render(<Harness onNameChange={onNameChange} />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'Jane Doe' }));

    expect(onNameChange).toHaveBeenLastCalledWith('Jane Doe');
    expect(screen.getByRole('combobox')).toHaveValue('Jane Doe');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects the highlighted name with the arrow keys and Enter', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(screen.getByTestId('selected')).toHaveTextContent('Jane Doe');
  });

  it('picks the top match with Enter after typing', async () => {
    render(<Harness />);

    await userEvent.type(screen.getByRole('combobox'), 'jnae{Enter}');

    expect(screen.getByTestId('selected')).toHaveTextContent('Jane Doe');
  });

  it('only counts an exact name as a selection', async () => {
    const onNameChange = vi.fn();
    render(<Harness onNameChange={onNameChange} />);

    await userEvent.type(screen.getByRole('combobox'), 'John Smit');
    expect(onNameChange).toHaveBeenLastCalledWith('');

    await userEvent.type(screen.getByRole('combobox'), 'h');
    expect(onNameChange).toHaveBeenLastCalledWith('John Smith');
  });

  it('keeps the typed text when editing a selected name', async () => {
    render(<Harness initial="Alex Kim" />);

    await userEvent.type(screen.getByRole('combobox'), '{Backspace}');

    expect(screen.getByRole('combobox')).toHaveValue('Alex Ki');
    expect(screen.getByTestId('selected')).toBeEmptyDOMElement();
  });

  it('shows everyone again when reopened on a selected name', async () => {
    render(<Harness initial="Alex Kim" />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(optionNames()).toEqual(NAMES);
  });

  it('closes on Escape', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('follows a selection changed by the parent', () => {
    const { rerender } = render(<NameCombobox id="name" names={NAMES} selectedName="" onNameChange={() => {}} />);

    rerender(<NameCombobox id="name" names={NAMES} selectedName="John Smith" onNameChange={() => {}} />);

    expect(screen.getByRole('combobox')).toHaveValue('John Smith');
  });

  it('does not open while disabled', async () => {
    render(<NameCombobox id="name" names={NAMES} disabled selectedName="" onNameChange={() => {}} />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
