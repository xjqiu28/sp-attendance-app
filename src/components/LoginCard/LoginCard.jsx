import NameAndCodeFields from '../NameAndCodeFields/NameAndCodeFields.jsx';
import StatusMessage from '../StatusMessage/StatusMessage.jsx';
import './LoginCard.scss';

// Shared name + personal code login card, used by both the
// attendance form and the director dashboard's sign-in screen.
export default function LoginCard({
  title,
  subtitle,
  names,
  namesLoading,
  namesLoadFailed,
  selectedName,
  onNameChange,
  code,
  onCodeChange,
  onSubmit,
  submitting,
  submitLabel,
  submitButtons,
  status,
}) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p className="sub">{subtitle}</p>

      <form onSubmit={onSubmit}>
        <NameAndCodeFields
          names={names}
          namesLoading={namesLoading}
          namesLoadFailed={namesLoadFailed}
          selectedName={selectedName}
          onNameChange={onNameChange}
          code={code}
          onCodeChange={onCodeChange}
        />

        {submitButtons ? (
          // Several submit buttons side by side — the form's onSubmit
          // reads which one was pressed from event.nativeEvent.submitter.
          <div className="login-card-buttons">
            {submitButtons.map((button) => (
              <button key={button.value} type="submit" name="action" value={button.value} disabled={submitting}>
                {button.label}
              </button>
            ))}
          </div>
        ) : (
          <button type="submit" disabled={submitting}>
            {submitLabel}
          </button>
        )}
      </form>

      {namesLoadFailed && !status ? (
        <StatusMessage text="Couldn't load the name list — check the Web App URL." type="error" />
      ) : (
        <StatusMessage text={status?.text} type={status?.type} />
      )}
    </div>
  );
}
