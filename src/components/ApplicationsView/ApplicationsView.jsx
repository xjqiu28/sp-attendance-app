import ApplicationCard from '../ApplicationCard/ApplicationCard.jsx';
import StatusMessage from '../StatusMessage/StatusMessage.jsx';
import '@/App.scss'; // .tab, reused here for the sync button's base look
import '@/styles/CardGrid.scss';
import './ApplicationsView.scss';

// Unlike Daily/Weekly/Edit Day, Applications always renders as a card
// grid — its field set is much larger than an attendance entry, so the
// dense .entry-list row layout those views offer doesn't fit here.
export default function ApplicationsView({
  data,
  loading,
  error,
  syncState,
  onSync,
  onUpdateApplication,
  offerLettersState,
  onSendOfferLetters,
  offerRepliesState,
  onCheckOfferReplies,
}) {
  return (
    <div className="applications-view">
      <div className="applications-view-toolbar">
        <button type="button" className="tab" onClick={onSync} disabled={syncState.loading}>
          {syncState.loading ? 'Syncing...' : 'Sync Scheduled Times'}
        </button>
        <button type="button" className="tab" onClick={onSendOfferLetters} disabled={offerLettersState.loading}>
          {offerLettersState.loading ? 'Sending...' : 'Send Offer Letters'}
        </button>
        <button type="button" className="tab" onClick={onCheckOfferReplies} disabled={offerRepliesState.loading}>
          {offerRepliesState.loading ? 'Checking...' : 'Check Replies'}
        </button>
      </div>

      <div className="applications-view-toolbar-messages">
        {syncState.message && <p className="applications-sync-message success">{syncState.message}</p>}
        {syncState.error && <p className="applications-sync-message error">{syncState.error}</p>}
        {offerLettersState.message && <p className="applications-sync-message success">{offerLettersState.message}</p>}
        {offerLettersState.error && <p className="applications-sync-message error">{offerLettersState.error}</p>}
        {offerRepliesState.message && <p className="applications-sync-message success">{offerRepliesState.message}</p>}
        {offerRepliesState.error && <p className="applications-sync-message error">{offerRepliesState.error}</p>}
      </div>

      {error && <StatusMessage text={error} type="error" />}

      {loading ? (
        <StatusMessage text="Loading..." type="" />
      ) : (
        data && (
          <div className="card-grid">
            {data.applications.map((entry) => (
              <ApplicationCard key={entry.email || `${entry.firstName}-${entry.lastName}`} entry={entry} onSave={onUpdateApplication} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
