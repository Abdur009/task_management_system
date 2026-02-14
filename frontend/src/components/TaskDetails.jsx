import React from 'react';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed'];

const getStatusBadge = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    case 'In Progress':
      return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
    case 'Pending':
    default:
      return 'bg-gradient-to-r from-amber-400 to-orange-400 text-white';
  }
};

const getOverallProgressColor = (percentage = 0) => {
  if (percentage >= 100) return 'bg-gradient-to-r from-green-500 to-emerald-500';
  if (percentage >= 50) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
  if (percentage >= 25) return 'bg-gradient-to-r from-amber-400 to-orange-400';
  return 'bg-gradient-to-r from-red-400 to-pink-400';
};

const formatDate = (dateString) => {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const toDisplayName = (user) => {
  if (!user) return 'Unknown user';
  return user.username || user.email || `User #${user.id}`;
};

const TaskDetails = ({ task, onClose, onEdit, onDelete, onShare, onUpdateProgress }) => {
  if (!task) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl mb-4">
          <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <p className="text-gray-700 font-semibold text-lg">Select a task</p>
        <p className="text-gray-500 text-sm mt-2">Click on a task to view its details</p>
      </div>
    );
  }

  const permissions = task.permissions || {};
  const overallProgress = task.overallProgress ?? 0;
  const totalParticipants = task.totalParticipants ?? 1;
  const completedParticipants = task.completedParticipants ?? 0;
  const viewerAccessLabel =
    task.viewerAccessLevel === 'owner'
      ? 'Owner (full access)'
      : task.viewerAccessLevel === 'full'
        ? 'Full access'
        : 'Limited access';

  const participantRows = [
    {
      id: task.owner?.id ?? `owner-${task.id}`,
      name: toDisplayName(task.owner),
      email: task.owner?.email,
      access: 'Owner',
      status: task.ownerStatus || 'Pending',
      isCurrentUser: task.viewerAccessLevel === 'owner'
    },
    ...(task.participants || []).map((participant) => ({
      id: participant.id,
      name: toDisplayName(participant),
      email: participant.email,
      access: participant.accessLevel === 'full' ? 'Full access' : 'Limited access',
      status: participant.status,
      isCurrentUser: participant.isCurrentUser
    }))
  ];

  const handleProgressChange = (nextStatus) => {
    if (!permissions.canUpdateProgress || nextStatus === task.status) {
      return;
    }
    if (onUpdateProgress) {
      onUpdateProgress(task, nextStatus);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your access: {viewerAccessLabel}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Title</h3>
          <p className="text-lg font-semibold text-gray-900">{task.title}</p>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gradient-to-br from-gray-50 to-purple-50 p-4 rounded-xl border border-gray-200">
            {task.description || <span className="text-gray-400 italic">No description provided</span>}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Due Date</h3>
            <p className="text-sm text-gray-700 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
              {task.due_date ? (
                <>
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(task.due_date)}
                </>
              ) : (
                <span className="text-gray-400">Not set</span>
              )}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Task ID</h3>
            <p className="text-sm text-gray-600 font-mono bg-gray-50 px-3 py-2 rounded-lg inline-block">#{task.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-purple-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m1 4H8a2 2 0 01-2-2v-5a2 2 0 012-2h8a2 2 0 012 2v5a2 2 0 01-2 2zm-6-7V7a2 2 0 012-2h0a2 2 0 012 2v4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Progress</p>
                  <p className="text-sm text-gray-600">
                    {completedParticipants} of {totalParticipants} participants completed
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-900">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full ${getOverallProgressColor(overallProgress)} transition-all duration-500 ease-out`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                My Progress
              </h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(task.status)}`}>
                {task.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {permissions.canUpdateProgress
                ? 'Update your progress to keep collaborators in sync.'
                : 'You cannot change progress for this task.'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((option) => {
                const isActive = task.status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleProgressChange(option)}
                    disabled={!permissions.canUpdateProgress || isActive}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                      isActive
                        ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                        : permissions.canUpdateProgress
                          ? 'border-gray-200 hover:border-purple-400 hover:bg-purple-50 text-gray-600'
                          : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-4a4 4 0 11-8 0 4 4 0 018 0zm5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Participants
            </h3>
            <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
              {totalParticipants} {totalParticipants === 1 ? 'person' : 'people'}
            </span>
          </div>
          <div className="space-y-2">
            {participantRows.map((participant) => (
              <div
                key={`${participant.id}-${participant.access}`}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
                  participant.isCurrentUser ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-200 to-indigo-200 flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-700">
                      {(participant.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      {participant.name}
                      {participant.isCurrentUser && (
                        <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{participant.email || 'Email hidden'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    {participant.access}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(participant.status)}`}>
                    {participant.status}
                  </span>
                </div>
              </div>
            ))}
            {participantRows.length <= 1 && (
              <div className="text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 px-3 py-2 rounded-lg">
                No collaborators yet. Share this task to work together.
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-3">
          {onShare && permissions.canShare && (
            <button
              onClick={() => onShare(task)}
              className="flex-1 min-w-[120px] py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500/40"
            >
              Share Task
            </button>
          )}
          {onEdit && permissions.canEdit && (
            <button
              onClick={() => onEdit(task)}
              className="flex-1 min-w-[120px] py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/40"
            >
              Edit Task
            </button>
          )}
          {onDelete && permissions.canDelete && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this task?')) {
                  onDelete(task.id);
                }
              }}
              className="flex-1 min-w-[120px] py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-500/40"
            >
              Delete Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;
