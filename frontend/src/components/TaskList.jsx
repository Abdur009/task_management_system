import React from 'react';

const TaskList = ({ tasks, onTaskSelect, onTaskEdit, onTaskDelete, selectedTaskId }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md';
      case 'In Progress':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md';
      case 'Pending':
      default:
        return 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-md';
    }
  };

  const getOverallProgressColor = (percentage = 0) => {
    if (percentage >= 100) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    if (percentage >= 50) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (percentage >= 25) return 'bg-gradient-to-r from-amber-400 to-orange-400';
    return 'bg-gradient-to-r from-red-400 to-pink-400';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl mb-4">
          <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <p className="text-gray-700 font-semibold text-lg">No tasks found</p>
        <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-purple-600 to-indigo-600">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          All Tasks ({tasks.length})
        </h2>
      </div>
      <div className="divide-y divide-gray-100">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`px-6 py-5 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 cursor-pointer transition-all duration-300 ${
              selectedTaskId === task.id 
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-600 shadow-md' 
                : ''
            }`}
            onClick={() => onTaskSelect(task)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 mb-2 truncate">
                  <span className="flex items-center gap-2">
                    {task.title}
                    {task.participants?.length ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-4a4 4 0 11-8 0 4 4 0 018 0zm5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Shared
                      </span>
                    ) : null}
                  </span>
                </h3>
                {task.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m5-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {task.overallProgress ?? 0}% overall
                  </span>
                  {typeof task.totalParticipants === 'number' && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-4a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {task.totalParticipants} {task.totalParticipants === 1 ? 'person' : 'people'}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="text-xs text-gray-600 flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 flex-shrink-0 min-w-[120px]">
                <div className="w-32 bg-gray-200 h-2 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full ${getOverallProgressColor(task.overallProgress ?? 0)} transition-all duration-500 ease-out`}
                    style={{ width: `${task.overallProgress ?? 0}%` }}
                  />
                </div>
                <div className="flex gap-2">
                  {task.permissions?.canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskEdit(task);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transform hover:scale-105"
                      title="Edit task"
                    >
                      Edit
                    </button>
                  )}
                  {task.permissions?.canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this task?')) {
                          onTaskDelete(task.id);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 transform hover:scale-105"
                      title="Delete task"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;
