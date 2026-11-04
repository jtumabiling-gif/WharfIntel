import { useEffect, useState } from 'react';
import {
  loadLmsNotifications,
  LMS_NOTIFICATIONS_STORAGE_KEY,
  markLmsNotificationsRead,
} from './lmsStore';
import './LMSNotificationCenter.css';

const formatNotificationDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
};

const LMSNotificationCenter = ({ role, username, courses, isDarkMode }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const viewerId = `${role}:${username}`;
  const enrolledCourseIds = new Set(courses.map((course) => course.id));
  const visibleNotifications = notifications.filter((notification) => {
    const isLearner = !['admin', 'instructor'].includes(role);
    const matchesRole = notification.recipientRole === role
      || (notification.recipientRole === 'student' && isLearner)
      || (role === 'admin' && notification.recipientRole === 'instructor');
    if (!matchesRole) return false;
    if (notification.recipientUsername && notification.recipientUsername !== username) return false;
    if (notification.courseId && !notification.recipientUsername && role === 'student' && !enrolledCourseIds.has(notification.courseId)) return false;
    return true;
  });
  const unreadCount = visibleNotifications.filter((notification) => !notification.readBy?.includes(viewerId)).length;

  useEffect(() => {
    const refresh = (event) => {
      if (event?.key && event.key !== LMS_NOTIFICATIONS_STORAGE_KEY) return;
      try {
        setNotifications(loadLmsNotifications());
        setError('');
      } catch (loadError) {
        setError(loadError.message || 'Could not load notifications.');
      }
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('lms-notifications-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('lms-notifications-updated', refresh);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  const markRead = (ids) => {
    try {
      markLmsNotificationsRead(ids, viewerId);
      setError('');
    } catch (saveError) {
      setError(saveError.message || 'Could not update notification status.');
    }
  };

  return (
    <div className={`lms-notification-center${isDarkMode ? ' is-dark' : ''}`}>
      <button
        className="lms-notification-trigger"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        aria-controls="lms-notification-panel"
        title="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && <span className="lms-notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {isOpen && (
        <section className="lms-notification-panel" id="lms-notification-panel" aria-label="Notifications">
          <header className="lms-notification-header">
            <div><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread` : 'Up to date'}</span></div>
            <button type="button" onClick={() => markRead(visibleNotifications.map((item) => item.id))} disabled={!unreadCount}>Mark all read</button>
          </header>
          {error && <p className="lms-notification-error" role="alert">{error}</p>}
          {visibleNotifications.length ? (
            <div className="lms-notification-list">
              {visibleNotifications.map((notification) => {
                const isUnread = !notification.readBy?.includes(viewerId);
                return (
                  <button
                    className={`lms-notification-item${isUnread ? ' is-unread' : ''}`}
                    key={notification.id}
                    type="button"
                    onClick={() => isUnread && markRead([notification.id])}
                  >
                    <span className={`lms-notification-dot type-${notification.type || 'activity'}`} aria-hidden="true" />
                    <span className="lms-notification-copy">
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                      <small>{formatNotificationDate(notification.createdAt)}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : !error ? (
            <p className="lms-notification-empty">No notifications yet. Course updates and activity will appear here.</p>
          ) : null}
        </section>
      )}
    </div>
  );
};

export default LMSNotificationCenter;
