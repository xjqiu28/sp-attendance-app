import useDirectorDashboard from '../../hooks/useDirectorDashboard.ts';
import LoginCard from '../LoginCard/LoginCard.tsx';
import StatusMessage from '../StatusMessage/StatusMessage.tsx';
import DailyView from '../DailyView/DailyView.tsx';
import WeeklyView from '../WeeklyView/WeeklyView.tsx';
import EditDayView from '../EditDayView/EditDayView.tsx';
import WorkHoursView from '../WorkHoursView/WorkHoursView.tsx';
import ApplicationsView from '../ApplicationsView/ApplicationsView.tsx';
import GenerateCodesButton from '../GenerateCodesButton/GenerateCodesButton.tsx';
import '@/App.scss'; // .tab, reused here for the mode tabs and log-out button
import './DirectorDashboard.scss';

interface DirectorDashboardProps {
  names: string[];
  namesLoading: boolean;
  namesLoadFailed: boolean;
  onRosterChange?: () => void;
}

export default function DirectorDashboard({ names, namesLoading, namesLoadFailed, onRosterChange }: DirectorDashboardProps) {
  const {
    selectedName,
    setSelectedName,
    code,
    setCode,
    submitting,
    status,
    credentials,
    mode,
    viewMode,
    dailyData,
    weeklyData,
    dashboardLoading,
    dashboardError,
    generateCodesState,
    editDate,
    editDayData,
    editDayLoading,
    editDayError,
    workHoursData,
    workHoursLoading,
    workHoursError,
    applicationsData,
    applicationsLoading,
    applicationsError,
    syncScheduleState,
    offerLettersState,
    offerRepliesState,
    handleSubmit,
    handleModeChange,
    handleViewModeChange,
    handleWeekChange,
    handleGenerateReport,
    handleRefresh,
    handleLogOut,
    handleGenerateCodes,
    handleEditDateChange,
    handleSaveEntry,
    handleSaveWorkHours,
    handleAddStaff,
    handleApproveWeek,
    handleUnapproveWeek,
    handleUpdateApplication,
    handleSyncScheduledTimes,
    handleSendOfferLetters,
    handleCheckOfferReplies,
  } = useDirectorDashboard({ onRosterChange });

  if (!credentials) {
    return (
      <LoginCard
        title="Director View"
        subtitle="Enter your name and personal code to view attendance."
        names={names}
        namesLoading={namesLoading}
        namesLoadFailed={namesLoadFailed}
        selectedName={selectedName}
        onNameChange={setSelectedName}
        code={code}
        onCodeChange={setCode}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="View Dashboard"
        status={status}
      />
    );
  }

  const heading =
    mode === 'daily'
      ? `Attendance — ${dailyData?.date || ''}`
      : mode === 'weekly'
        ? `Weekly Totals — Week ${weeklyData?.weekNumber || ''}`
        : mode === 'edit'
          ? 'Edit Day'
          : mode === 'workHours'
            ? 'Staff'
            : 'Applications';

  // Each mode's data is cached (see useDirectorDashboard), so switching
  // tabs doesn't refetch — this is the escape hatch for getting fresh
  // data on demand instead.
  const currentModeLoading =
    mode === 'edit'
      ? editDayLoading
      : mode === 'workHours'
        ? workHoursLoading
        : mode === 'applications'
          ? applicationsLoading
          : dashboardLoading;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{heading}</h1>

        <div className="dashboard-header-actions">
          <GenerateCodesButton state={generateCodesState} onClick={handleGenerateCodes} />
          <button type="button" className="tab" onClick={handleRefresh} disabled={currentModeLoading}>
            {currentModeLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="tab" onClick={handleLogOut}>
            Log out
          </button>
        </div>
      </div>

      <div className="dashboard-mode-row">
        <div className="tabs dashboard-mode-tabs">
          <button
            type="button"
            className={mode === 'daily' ? 'tab active' : 'tab'}
            onClick={() => handleModeChange('daily')}
          >
            Daily
          </button>
          <button
            type="button"
            className={mode === 'weekly' ? 'tab active' : 'tab'}
            onClick={() => handleModeChange('weekly')}
          >
            Weekly
          </button>
          <button
            type="button"
            className={mode === 'edit' ? 'tab active' : 'tab'}
            onClick={() => handleModeChange('edit')}
          >
            Edit Day
          </button>
          <button
            type="button"
            className={mode === 'workHours' ? 'tab active' : 'tab'}
            onClick={() => handleModeChange('workHours')}
          >
            Staff
          </button>
          <button
            type="button"
            className={mode === 'applications' ? 'tab active' : 'tab'}
            onClick={() => handleModeChange('applications')}
          >
            Applications
          </button>
        </div>

        <div className="tabs view-mode-tabs">
          <button
            type="button"
            className={viewMode === 'card' ? 'tab active' : 'tab'}
            onClick={() => handleViewModeChange('card')}
          >
            Card
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'tab active' : 'tab'}
            onClick={() => handleViewModeChange('list')}
          >
            List
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <EditDayView
          date={editDate}
          onDateChange={handleEditDateChange}
          data={editDayData}
          loading={editDayLoading}
          error={editDayError}
          onSaveEntry={handleSaveEntry}
          viewMode={viewMode}
        />
      ) : mode === 'workHours' ? (
        <WorkHoursView
          data={workHoursData}
          loading={workHoursLoading}
          error={workHoursError}
          onSaveWorkHours={handleSaveWorkHours}
          onAddStaff={handleAddStaff}
          viewMode={viewMode}
        />
      ) : mode === 'applications' ? (
        <ApplicationsView
          data={applicationsData}
          loading={applicationsLoading}
          error={applicationsError}
          syncState={syncScheduleState}
          onSync={handleSyncScheduledTimes}
          onUpdateApplication={handleUpdateApplication}
          offerLettersState={offerLettersState}
          onSendOfferLetters={handleSendOfferLetters}
          offerRepliesState={offerRepliesState}
          onCheckOfferReplies={handleCheckOfferReplies}
          viewMode={viewMode}
        />
      ) : (
        <>
          {dashboardError && <StatusMessage text={dashboardError} type="error" />}

          {/* Each view only renders once its data has loaded — after a
              failed fetch there's none, and the error above is all that
              shows. */}
          {dashboardLoading ? (
            <StatusMessage text="Loading..." type="" />
          ) : mode === 'daily' ? (
            dailyData && <DailyView data={dailyData} viewMode={viewMode} />
          ) : (
            weeklyData && (
              <WeeklyView
                data={weeklyData}
                onWeekChange={handleWeekChange}
                viewMode={viewMode}
                onApproveWeek={handleApproveWeek}
                onUnapproveWeek={handleUnapproveWeek}
                onGenerateReport={handleGenerateReport}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
