const NAVIGATION = [
  { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
  { id: 'courses', label: 'Course management', icon: 'courses' },
  { id: 'students', label: 'Learners', icon: 'learners' },
  { id: 'submissions', label: 'Submission review', icon: 'reviews' },
  { id: 'assessments', label: 'Assessments', icon: 'assessments' },
  { id: 'schedule', label: 'Training schedule', icon: 'schedule' },
];

const ICON_PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  courses: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
  learners: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
  reviews: <><path d="M4 4h16v13H8l-4 3z" /><path d="m8 10 2.5 2.5L16 7" /></>,
  assessments: <><path d="M7 3h10l3 3v15H4V3z" /><path d="M14 3v4h6M8 12h8M8 16h5" /></>,
  schedule: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
};

const SidebarIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICON_PATHS[name]}
  </svg>
);

const InstructorWorkspaceSidebar = ({ activeSection, onNavigate, onLogout, pendingCount, username }) => (
  <aside className="instructor-workspace-sidebar">
    <div className="instructor-brand">
      <span className="instructor-brand-mark" aria-hidden="true"><SidebarIcon name="courses" /></span>
      <span><strong>WharfIntel</strong><small>INSTRUCTOR PORTAL</small></span>
    </div>

    <nav className="instructor-workspace-nav" aria-label="Instructor workspace">
      <span className="instructor-nav-heading">TEACHING WORKSPACE</span>
      {NAVIGATION.map((item) => (
        <button
          className={`instructor-workspace-nav-item ${activeSection === item.id ? 'is-active' : ''}`}
          type="button"
          key={item.id}
          onClick={() => onNavigate(item.id)}
          aria-current={activeSection === item.id ? 'page' : undefined}
        >
          <SidebarIcon name={item.icon} />
          <span>{item.label}</span>
          {item.id === 'submissions' && pendingCount > 0 && <span className="instructor-nav-count">{pendingCount}</span>}
        </button>
      ))}
    </nav>

    <div className="instructor-sidebar-footer">
      <div className="instructor-sidebar-profile">
        <span className="instructor-avatar">{username.slice(0, 1).toUpperCase()}</span>
        <span><strong>{username}</strong><small>Instructor</small></span>
      </div>
      <button className="instructor-sidebar-logout" type="button" onClick={onLogout}>
        <SidebarIcon name="logout" /><span>Sign out</span>
      </button>
    </div>
  </aside>
);

export default InstructorWorkspaceSidebar;
