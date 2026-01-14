import React, { useMemo } from 'react';

function TaskProgress({ tasks }) {
  const progressData = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === 'Completed').length;
    const inProgress = tasks.filter((task) => task.status === 'In Progress').length;
    const pending = tasks.filter((task) => task.status === 'Pending').length;
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      total,
      completed,
      inProgress,
      pending,
      percentage,
    };
  }, [tasks]);

  if (progressData.total === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No tasks to track progress</p>
        </div>
      </div>
    );
  }

  const getProgressColor = (percentage) => {
    if (percentage === 100) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    if (percentage >= 50) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (percentage >= 25) return 'bg-gradient-to-r from-amber-400 to-orange-400';
    return 'bg-gradient-to-r from-red-400 to-pink-400';
  };

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
            Task Progress
          </h3>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {progressData.percentage}%
          </span>
          <span className="text-sm text-gray-600 font-medium">
            {progressData.completed} of {progressData.total} tasks completed
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden shadow-inner">
          <div
            className={`h-full ${getProgressColor(progressData.percentage)} transition-all duration-500 ease-out rounded-full flex items-center justify-end pr-3 shadow-md`}
            style={{ width: `${progressData.percentage}%` }}
          >
            {progressData.percentage > 15 && (
              <span className="text-xs font-bold text-white">
                {progressData.percentage}%
              </span>
            )}
          </div>
        </div>
        {progressData.percentage <= 15 && (
          <div className="text-right mt-1">
            <span className="text-xs font-semibold text-gray-600">
              {progressData.percentage}%
            </span>
          </div>
        )}
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
          <div className="text-3xl font-bold text-amber-700">
            {progressData.pending}
          </div>
          <div className="text-xs text-amber-700 font-semibold mt-1">Pending</div>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="text-3xl font-bold text-blue-700">
            {progressData.inProgress}
          </div>
          <div className="text-xs text-blue-700 font-semibold mt-1">In Progress</div>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <div className="text-3xl font-bold text-green-700">
            {progressData.completed}
          </div>
          <div className="text-xs text-green-700 font-semibold mt-1">Completed</div>
        </div>
      </div>
    </div>
  );
}

export default TaskProgress;
