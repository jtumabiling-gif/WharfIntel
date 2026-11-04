import { useNavigate } from 'react-router-dom';

const NAVIGATION = [
  {
    group: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'tasks', label: 'My tasks', icon: 'tasks' },
    ],
  },
  {
    group: 'General',
    items: [
      { id: 'courses', label: 'Courses', icon: 'courses' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar' },
      { id: 'plans', label: 'Plans', icon: 'plans' },
    ],
  },
  {
    group: 'Other',
    items: [
      { id: 'news', label: 'News', icon: 'news' },
      { id: 'templates', label: 'Activity templates', icon: 'templates' },
    ],
  },
];

const ICON_PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  tasks: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  courses: <><path d="m3 7 9-4 9 4-9 4z" /><path d="M5 9v7c4 3 10 3 14 0V9M21 8v7" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3" /></>,
  plans: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /><path d="M16 7h3v3" /></>,
  news: <><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  templates: <><rect x="3" y="4" width="8" height="7" rx="1" /><rect x="13" y="4" width="8" height="7" rx="1" /><rect x="3" y="13" width="8" height="7" rx="1" /><rect x="13" y="13" width="8" height="7" rx="1" /></>,
  command: <><path d="m9 18 6-6-6-6" /><path d="M4 12h11M20 5v14" /></>,
};

const WorkspaceIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICON_PATHS[name]}
  </svg>
);

const LMSWorkspaceSidebar = ({ activeSection, onNavigate, taskCount, username, role }) => {
  const navigate = useNavigate();
  const initials = username && username !== 'guest'
    ? username.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'WI';

  return (
    <aside className="lms-workspace-sidebar">
      <div className="lms-workspace-brand">
        <span className="lms-brand-mark" aria-hidden="true">W</span>
        <span><strong>WharfIntel</strong><small>LEARNING PORTAL</small></span>
      </div>
      <nav className="lms-workspace-nav" aria-label="Learning management">
        {NAVIGATION.map((group) => (
          <div className="lms-nav-group" key={group.group}>
            <span className="lms-nav-group-label">{group.group}</span>
            {group.items.map((item) => (
              <button
                className={`lms-nav-item ${activeSection === item.id ? 'is-active' : ''}`}
                type="button"
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={activeSection === item.id ? 'page' : undefined}
              >
                <WorkspaceIcon name={item.icon} />
                <span>{item.label}</span>
                {item.id === 'tasks' && taskCount > 0 && <span className="lms-nav-count">{taskCount}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="lms-workspace-sidebar-footer">
        <div className="lms-workspace-profile">
          <span className="lms-profile-avatar">{initials}</span>
          <span><strong>{username === 'guest' ? 'Guest learner' : username}</strong><small>{role === 'instructor' || role === 'admin' ? 'Instructor account' : 'Learner account'}</small></span>
        </div>
        <button className="lms-command-center-link" type="button" onClick={() => navigate('/dashboard')}>
          <WorkspaceIcon name="command" />
          <span>Command center</span>
        </button>
      </div>
    </aside>
  );
};

export default LMSWorkspaceSidebar;
