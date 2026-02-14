import React, { useMemo } from 'react';

const STATUS_ORDER = ['Pending', 'In Progress', 'Completed'];

const getProgressColor = (percentage = 0) => {
  if (percentage >= 100) return 'bg-gradient-to-r from-green-500 to-emerald-500';
  if (percentage >= 50) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
  if (percentage >= 25) return 'bg-gradient-to-r from-amber-400 to-orange-400';
  return 'bg-gradient-to-r from-red-400 to-pink-400';
};

const STATUS_CARD_STYLES = {
  Pending: {
    container: 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200',
    text: 'text-amber-700',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  'In Progress': {
    container: 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200',
    text: 'text-blue-700',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  Completed: {
    container: 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200',
    text: 'text-green-700',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
};

function TaskProgress({ tasks }) {
  // Calculate individual progress - the current user's status on each task
  const progressData = useMemo(() => {
    const totalTasks = tasks.length;
    const statusCounts = {
      Pending: 0,
      'In Progress': 0,
      Completed: 0
    };

    // Count tasks by the viewer's individual status
    tasks.forEach((task) => {
      // viewerStatus is the current user's status on this task
      // For owned tasks: it's ownerStatus
      // For shared tasks: it's the participant's status
      const myStatus = task.viewerStatus || task.ownerStatus || task.status || 'Pending';
      const normalized = STATUS_ORDER.includes(myStatus) ? myStatus : 'Pending';
      statusCounts[normalized] += 1;
    });

    const completedTasks = statusCounts.Completed;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Count shared tasks
    const sharedTasks = tasks.filter((task) => task.participants && task.participants.length > 0).length;
    const ownedTasks = tasks.filter((task) => task.isOwner).length;

    return {
      percentage,
      totalTasks,
      completedTasks,
      sharedTasks,
      ownedTasks,
      breakdown: {
        pending: statusCounts.Pending,
        inProgress: statusCounts['In Progress'],
        completed: statusCounts.Completed
      }
    };
  }, [tasks]);

  if (progressData.totalTasks === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No tasks to show yet. Create your first task!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            My Progress
          </h3>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {progressData.percentage}%
          </span>
          <span className="text-sm text-gray-600 font-medium">
            {progressData.completedTasks} of {progressData.totalTasks} tasks completed
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden shadow-inner">
          <div
            className={`h-full ${getProgressColor(progressData.percentage)} transition-all duration-500 ease-out rounded-full flex items-center justify-end pr-3 shadow-md`}
            style={{ width: `${Math.max(progressData.percentage, 0)}%` }}
          >
            {progressData.percentage > 15 && (
              <span className="text-xs font-bold text-white">
                {progressData.percentage}%
              </span>
            )}
          </div>
        </div>
        {progressData.percentage <= 15 && progressData.percentage > 0 && (
          <div className="text-right mt-1">
            <span className="text-xs font-semibold text-gray-600">
              {progressData.percentage}%
            </span>
          </div>
        )}
      </div>

      {/* Task breakdown by type */}
      <div className="mb-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {progressData.ownedTasks} owned
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {progressData.sharedTasks} shared
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className={`text-center p-4 rounded-xl ${STATUS_CARD_STYLES[status].container} transition-all duration-300 hover:scale-105`}
          >
            <div className={`flex justify-center mb-2 ${STATUS_CARD_STYLES[status].text}`}>
              {STATUS_CARD_STYLES[status].icon}
            </div>
            <div className={`text-3xl font-bold ${STATUS_CARD_STYLES[status].text}`}>
              {status === 'Pending'
                ? progressData.breakdown.pending
                : status === 'In Progress'
                  ? progressData.breakdown.inProgress
                  : progressData.breakdown.completed}
            </div>
            <div className={`text-xs font-semibold mt-1 ${STATUS_CARD_STYLES[status].text}`}>
              {status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskProgress;
