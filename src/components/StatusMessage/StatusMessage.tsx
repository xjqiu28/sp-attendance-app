import './StatusMessage.scss';

interface StatusMessageProps {
  text?: string | null;
  type?: string;
}

export default function StatusMessage({ text, type }: StatusMessageProps) {
  if (!text) {
    return <div className="status" />;
  }

  return <div className={`status ${type || ''}`.trim()}>{text}</div>;
}
