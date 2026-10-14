import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import StatusMessage from './StatusMessage.jsx';

describe('StatusMessage', () => {
  it('renders an empty status box when there is no text', () => {
    const { container } = render(<StatusMessage text={null} type="error" />);
    const box = container.querySelector('.status');

    expect(box).toBeInTheDocument();
    expect(box).toBeEmptyDOMElement();
    expect(box).toHaveClass('status', { exact: true });
  });

  it('renders the text with its type as a class', () => {
    const { container } = render(<StatusMessage text="Saved." type="success" />);
    const box = container.querySelector('.status');

    expect(box).toHaveTextContent('Saved.');
    expect(box).toHaveClass('status', 'success', { exact: true });
  });

  it('renders the text with no extra class when no type is given', () => {
    const { container } = render(<StatusMessage text="Checking..." />);

    expect(container.querySelector('.status')).toHaveClass('status', { exact: true });
  });
});
