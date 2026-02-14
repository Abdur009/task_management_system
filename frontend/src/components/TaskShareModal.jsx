import React, { useEffect, useState } from 'react';

const TaskShareModal = ({ task, onClose, onShare, loading = false, error = null }) => {
  const [identifier, setIdentifier] = useState('');
  const [accessLevel, setAccessLevel] = useState('limited');

  useEffect(() => {
    if (task) {
      setIdentifier('');
      setAccessLevel('limited');
    }
  }, [task]);

  if (!task) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!identifier.trim() || loading) {
      return;
    }
    onShare({
      identifier: identifier.trim(),
      accessLevel
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-white/40 max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          title="Close"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-4a4 4 0 11-8 0 4 4 0 018 0zm5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Share task</h2>
            <p className="text-sm text-gray-500">
              Invite a teammate to collaborate on <span className="font-semibold text-gray-700">{task.title}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="share-identifier" className="block text-sm font-semibold text-gray-700 mb-2">
              Email or username
            </label>
            <input
              id="share-identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="teammate@example.com"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Access level</p>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`px-4 py-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  accessLevel === 'limited'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="access-level"
                  value="limited"
                  className="hidden"
                  checked={accessLevel === 'limited'}
                  onChange={() => setAccessLevel('limited')}
                  disabled={loading}
                />
                <span className="block text-sm font-semibold">Limited</span>
                <span className="block text-xs text-gray-500 mt-1">
                  Collaborator can update their progress only.
                </span>
              </label>
              <label
                className={`px-4 py-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  accessLevel === 'full'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="access-level"
                  value="full"
                  className="hidden"
                  checked={accessLevel === 'full'}
                  onChange={() => setAccessLevel('full')}
                  disabled={loading}
                />
                <span className="block text-sm font-semibold">Full access</span>
                <span className="block text-xs text-gray-500 mt-1">
                  Collaborator can edit, delete, and update progress.
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading || !identifier.trim()}
            >
              {loading ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskShareModal;
