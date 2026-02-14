import React, { useEffect, useRef } from 'react';

const NotificationBell = ({
  notifications = [],
  unreadCount = 0,
  isOpen = false,
  onToggle = () => {},
  onSelect = () => {},
  onMarkAllRead = () => {},
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const formatRelativeTime = (isoString) => {
    if (!isoString) {
      return '';
    }
    const date = new Date(isoString);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (Number.isNaN(diffMinutes)) {
      return '';
    }
    if (diffMinutes < 1) {
      return 'just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  };

  const hasNotifications = notifications && notifications.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => onToggle(!isOpen)}
        className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        title="Notifications"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800">Notifications</p>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className={`text-xs font-semibold ${
                unreadCount === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-purple-600 hover:text-purple-700'
              }`}
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {hasNotifications ? (
              notifications.map((notification) => {
                const isUnread = !notification.isRead;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => onSelect(notification)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors duration-150 ${
                      isUnread ? 'bg-gradient-to-r from-purple-50 to-indigo-50' : 'bg-white'
                    } hover:bg-purple-50/70`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isUnread ? (
                          <span className="block w-2 h-2 bg-purple-500 rounded-full mt-1"></span>
                        ) : (
                          <span className="block w-2 h-2 bg-transparent rounded-full mt-1"></span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
