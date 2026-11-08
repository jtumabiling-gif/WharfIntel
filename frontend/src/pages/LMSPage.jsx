import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  getLmsAttachment,
  LEARNER_PROGRESS_PREFIX,
  loadInstructorModules,
  MODULES_STORAGE_KEY,
  publishLmsNotification,
} from './lmsStore';
import {
  isAssessmentAvailable,
  loadQuizAttempts,
  loadQuizzes,
  QUIZ_ATTEMPTS_STORAGE_KEY,
  QUIZZES_STORAGE_KEY,
} from './quizStore';
import './LMSPage.css';
import LMSWorkspaceSidebar from './LMSWorkspaceSidebar';
import LMSNotificationCenter from './LMSNotificationCenter';
import WorkspaceThemeToggle from './WorkspaceThemeToggle';
import useWorkspaceTheme from './useWorkspaceTheme';

const MotionDiv = motion.div;
const MotionSection = motion.section;
const MotionArticle = motion.article;

const COURSE_CATALOG = [
  {
    id: 'port-safety',
    title: 'Port Safety Protocols',
    category: 'SAFETY',
    level: 'Core training',
    duration: '1 hr 40 min',
    description: 'Build safer routines for terminal access, berth operations, and hazard reporting.',
    accent: 'cyan',
    lessons: [
      { title: 'Terminal hazard identification', duration: '14 min', completed: true },
      { title: 'Personal protective equipment', duration: '12 min', completed: true },
      { title: 'Berth and quay access', duration: '16 min', completed: true },
      { title: 'Safe cargo-area walkthroughs', duration: '18 min', completed: false },
      { title: 'Permit-to-work procedures', duration: '20 min', completed: false },
      { title: 'Incident reporting drill', duration: '20 min', completed: false },
    ],
  },
  {
    id: 'emergency-response',
    title: 'Emergency Response',
    category: 'RESPONSE',
    level: 'Operational',
    duration: '2 hr 10 min',
    description: 'Coordinate first response, vessel communications, and incident escalation.',
    accent: 'amber',
    lessons: [
      { title: 'Command roles and escalation', duration: '20 min', completed: true },
      { title: 'Vessel-to-shore communications', duration: '24 min', completed: false },
      { title: 'Medical response coordination', duration: '28 min', completed: false },
      { title: 'Fire and evacuation procedures', duration: '30 min', completed: false },
      { title: 'Tabletop response exercise', duration: '28 min', completed: false },
    ],
  },
  {
    id: 'logistics-handling',
    title: 'Cargo & Logistics Handling',
    category: 'LOGISTICS',
    level: 'Specialist',
    duration: '2 hr 25 min',
    description: 'Improve cargo planning, load integrity, and handoff accuracy across the wharf.',
    accent: 'blue',
    lessons: [
      { title: 'Cargo manifest essentials', duration: '18 min', completed: true },
      { title: 'Load planning and weight limits', duration: '22 min', completed: true },
      { title: 'Cold-chain handling', duration: '20 min', completed: true },
      { title: 'Hazardous goods segregation', duration: '25 min', completed: true },
      { title: 'Seal checks and documentation', duration: '20 min', completed: true },
      { title: 'Transfer and handoff controls', duration: '20 min', completed: true },
      { title: 'Final dispatch assessment', duration: '20 min', completed: false },
    ],
  },
  {
    id: 'port-security',
    title: 'Port Facility Security',
    category: 'SECURITY',
    level: 'Core training',
    duration: '1 hr 30 min',
    description: 'Apply access-control, visitor screening, and suspicious-activity procedures.',
    accent: 'slate',
    lessons: [
      { title: 'Facility security levels', duration: '18 min', completed: false },
      { title: 'Access control and credentials', duration: '22 min', completed: false },
      { title: 'Visitor and contractor screening', duration: '24 min', completed: false },
      { title: 'Security incident response', duration: '26 min', completed: false },
    ],
  },
  {
    id: 'vessel-traffic',
    title: 'Vessel Traffic Fundamentals',
    category: 'NAVIGATION',
    level: 'Certification track',
    duration: '2 hr 5 min',
    accent: 'green',
    description: 'Read traffic patterns and support safe coordination in busy port approaches.',
    lessons: [
      { title: 'Traffic service fundamentals', duration: '20 min', completed: true },
      { title: 'AIS data and vessel identity', duration: '22 min', completed: true },
      { title: 'Approach and movement planning', duration: '20 min', completed: true },
      { title: 'Radio phraseology', duration: '21 min', completed: true },
      { title: 'Near-miss prevention', duration: '20 min', completed: true },
      { title: 'Knowledge assessment', duration: '22 min', completed: true },
    ],
  },
  {
    id: 'marine-environment',
    title: 'Marine Environmental Care',
    category: 'ENVIRONMENT',
    level: 'Core training',
    duration: '1 hr 20 min',
    accent: 'teal',
    description: 'Prevent spills and reduce operational impact on surrounding marine habitats.',
    lessons: [
      { title: 'Pollution prevention basics', duration: '16 min', completed: false },
      { title: 'Spill-kit readiness', duration: '18 min', completed: false },
      { title: 'Waste segregation at port', duration: '20 min', completed: false },
      { title: 'Environmental incident reporting', duration: '26 min', completed: false },
    ],
  },
];

const CERTIFICATIONS = [
  { id: 'safety-cert', name: 'Port Safety Fundamentals', code: 'WS-2048', expires: 'Expires 18 May 2027', tone: 'cyan' },
  { id: 'traffic-cert', name: 'Vessel Traffic Awareness', code: 'WS-1931', expires: 'Expires 02 Aug 2027', tone: 'green' },
];

const FILTERS = ['All courses', 'In progress', 'Not started', 'Completed'];
const getCourseProgress = (course) => {
  const completed = course.lessons.filter((lesson) => lesson.completed).length;
  return {
    completed,
    total: course.lessons.length,
    percent: Math.round((completed / course.lessons.length) * 100),
  };
};

const getCourseStatus = (course) => {
  const { completed, total } = getCourseProgress(course);
  if (completed === total) return 'Completed';
  if (completed === 0) return 'Not started';
  return 'In progress';
};

const loadCourses = (storageKey, instructorModules = []) => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const moduleById = new Map(instructorModules.map((module) => [module.id, module]));
    const knownCourseIds = new Set(COURSE_CATALOG.map((course) => course.id));
    const categoryAccents = {
      'Port Safety': 'cyan',
      Logistics: 'blue',
      'Emergency Response': 'amber',
      'Vessel Operations': 'green',
    };
    const catalogCourses = COURSE_CATALOG.map((course) => {
      const module = moduleById.get(course.id);
      if (module && module.status !== 'Active') return null;
      if (!module) {
        return {
          ...course,
          lessons: course.lessons.map((lesson, index) => ({
            ...lesson,
            id: lesson.id || `${course.id}-section-${index + 1}`,
          })),
        };
      }

      const sections = Array.isArray(module.sections) && module.sections.length
        ? module.sections
        : course.lessons.map((lesson, index) => ({ ...lesson, id: `${course.id}-section-${index + 1}` }));

      return {
        ...course,
        faculty: module.faculty || course.faculty,
        courseCode: module.courseCode || course.courseCode,
        programYearSection: module.programYearSection || module.targetAudience || course.programYearSection,
        courseUnits: module.courseUnits ?? course.courseUnits,
        title: module.title,
        category: module.displayCategory || module.category.toUpperCase(),
        level: course.level,
        description: module.description,
        accent: module.accent || categoryAccents[module.category] || course.accent,
        resourceUrl: module.resourceUrl,
        deadline: module.deadline,
        lessons: sections.map((section, index) => ({
          ...section,
          id: section.id || `${course.id}-section-${index + 1}`,
          duration: section.duration || course.lessons[index]?.duration || '30 min',
          description: section.description || '',
          resourceUrl: section.resourceUrl || '',
          completed: section.completed ?? course.lessons[index]?.completed ?? false,
        })),
      };
    }).filter(Boolean);
    const additionalCourses = instructorModules
      .filter((module) => module.status === 'Active' && !knownCourseIds.has(module.id))
      .map((module) => {
        const sections = Array.isArray(module.sections) && module.sections.length
          ? module.sections
          : [{ id: `${module.id}-section-1`, title: module.title, description: module.description, resourceUrl: module.resourceUrl }];
        return {
          id: module.id,
          title: module.title,
          category: module.category.toUpperCase(),
          level: '',
          faculty: module.faculty || '',
          courseCode: module.courseCode || '',
          programYearSection: module.programYearSection || module.targetAudience || '',
          courseUnits: module.courseUnits ?? '',
          duration: `${sections.length * 30} min`,
          description: module.description,
          accent: categoryAccents[module.category] || 'cyan',
          resourceUrl: module.resourceUrl,
          deadline: module.deadline,
          lessons: sections.map((section, index) => ({
            ...section,
            id: section.id || `${module.id}-section-${index + 1}`,
            duration: section.duration || '30 min',
            description: section.description || '',
            resourceUrl: section.resourceUrl || '',
            completed: Boolean(section.completed),
          })),
        };
      });

    const enrolledCourseIds = Array.isArray(saved.__enrolledCourses) ? new Set(saved.__enrolledCourses) : null;
    return [...catalogCourses, ...additionalCourses]
      .filter((course) => !enrolledCourseIds || enrolledCourseIds.has(course.id))
      .map((course) => ({
      ...course,
      lessons: course.lessons.map((lesson) => ({
        ...lesson,
        completed: Boolean(saved.__downloadedLessons?.[course.id]?.[lesson.id]),
      })),
    }));
  } catch {
    return COURSE_CATALOG.map((course) => ({
      ...course,
      lessons: course.lessons.map((lesson, index) => ({
        ...lesson,
        id: lesson.id || `${course.id}-section-${index + 1}`,
        completed: false,
      })),
    }));
  }
};

const StatIcon = ({ type }) => {
  const paths = {
    courses: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    modules: <><path d="m4 12 5 5L20 6" /><circle cx="12" cy="12" r="9" /></>,
    certificates: <><circle cx="12" cy="8" r="5" /><path d="m8.5 12-1 9 4.5-2.5 4.5 2.5-1-9" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
};

const CourseMark = ({ accent }) => (
  <span className={`lms-course-mark lms-accent-${accent}`} aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8.5A3.5 3.5 0 0 1 8.5 5H27v21H8.5A3.5 3.5 0 0 0 5 29.5z" />
      <path d="M5 8.5v21M11 11h10M11 16h10M11 21h6" />
    </svg>
  </span>
);

const LMSPage = () => {
  const reduceMotion = useReducedMotion();
  const [isLightMode, toggleTheme] = useWorkspaceTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const username = localStorage.getItem('username') || 'guest';
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const requestedSection = searchParams.get('view');
  const activeSection = ['dashboard', 'tasks', 'courses', 'calendar', 'plans', 'news', 'templates'].includes(requestedSection)
    ? requestedSection
    : 'dashboard';
  const storageKey = `${LEARNER_PROGRESS_PREFIX}${username}`;
  const [instructorModules, setInstructorModules] = useState(() => loadInstructorModules());
  const [courses, setCourses] = useState(() => loadCourses(storageKey, instructorModules));
  const [filter, setFilter] = useState('All courses');
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedAssessmentResult, setSelectedAssessmentResult] = useState(null);
  const [expandedLessonId, setExpandedLessonId] = useState(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState({});
  const [assessmentError, setAssessmentError] = useState('');
  const [activityError, setActivityError] = useState('');
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  useEffect(() => {
    const refreshAssessments = (event) => {
      if (event?.key && ![QUIZZES_STORAGE_KEY, QUIZ_ATTEMPTS_STORAGE_KEY].includes(event.key)) return;
      try {
        setQuizzes(loadQuizzes());
        setQuizAttempts(loadQuizAttempts());
        setAssessmentError('');
      } catch (error) {
        setAssessmentError(error.message || 'Could not load assessment data.');
      }
    };
    refreshAssessments();
    window.addEventListener('storage', refreshAssessments);
    return () => window.removeEventListener('storage', refreshAssessments);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const progress = Object.fromEntries(courses.map((course) => [
        course.id,
        Object.fromEntries(course.lessons.map((lesson, index) => [
          lesson.id || `${course.id}-section-${index + 1}`,
          lesson.completed,
        ])),
      ]));
      localStorage.setItem(storageKey, JSON.stringify({ ...saved, ...progress, __role: role }));
    } catch {
      // Keep course progress usable for this session if browser storage is disabled.
    }
  }, [courses, role, storageKey]);

  useEffect(() => {
    const syncModules = (event) => {
      if (event?.key && ![MODULES_STORAGE_KEY, storageKey].includes(event.key)) return;
      const nextModules = loadInstructorModules();
      setInstructorModules(nextModules);
      setCourses(loadCourses(storageKey, nextModules));
    };
    window.addEventListener('storage', syncModules);
    return () => window.removeEventListener('storage', syncModules);
  }, [storageKey]);

  useEffect(() => {
    if (!selectedCourse) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (selectedAssessmentResult) setSelectedAssessmentResult(null);
        else setSelectedCourseId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCourse, selectedAssessmentResult]);

  const completedLessons = courses.reduce(
    (total, course) => total + getCourseProgress(course).completed,
    0,
  );
  const hasPendingReview = (courseId) => quizzes.some((quiz) => {
    if (quiz.courseId !== courseId) return false;
    const attempts = (quizAttempts[username] || []).filter((attempt) => attempt.quizId === quiz.id);
    return attempts[attempts.length - 1]?.status === 'Pending Review';
  });
  const getDisplayedCourseProgress = (course) => {
    const progress = getCourseProgress(course);
    const releasedScores = quizzes.filter((quiz) => quiz.courseId === course.id).map((quiz) => {
      const latest = [...(quizAttempts[username] || [])].reverse().find((attempt) => attempt.quizId === quiz.id);
      return latest?.status === 'Graded' && Number.isFinite(Number(latest.percentage))
        ? Number(latest.percentage)
        : null;
    }).filter((score) => score !== null);
    const averageAssessment = releasedScores.length
      ? releasedScores.reduce((total, score) => total + score, 0) / releasedScores.length
      : null;
    const combinedPercent = averageAssessment === null
      ? progress.percent
      : Math.round((progress.percent + averageAssessment) / 2);
    return {
      ...progress,
      percent: hasPendingReview(course.id) && combinedPercent === 100 ? 99 : combinedPercent,
    };
  };
  const getDisplayedCourseStatus = (course) => {
    const progress = getDisplayedCourseProgress(course);
    if (progress.percent === 100) return 'Completed';
    if (progress.percent === 0 && !hasPendingReview(course.id)) return getCourseStatus(course);
    return 'In progress';
  };
  const readinessPercent = (() => {
    const lessonCount = courses.reduce((total, course) => total + course.lessons.length, 0);
    if (!lessonCount) return 0;
    const percent = Math.round((completedLessons / lessonCount) * 100);
    return percent === 100 && courses.some((course) => hasPendingReview(course.id)) ? 99 : percent;
  })();
  const filteredCourses = courses.filter((course) => {
    const matchesFilter = filter === 'All courses' || getDisplayedCourseStatus(course) === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${course.title} ${course.category} ${course.description}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const markLessonDownloaded = (courseId, lessonId) => {
    const course = courses.find((item) => item.id === courseId);
    const lesson = course?.lessons.find((item) => item.id === lessonId);
    if (!course || !lesson) return;

    const updatedLessons = course.lessons.map((item) => (
      item.id === lessonId ? { ...item, completed: true } : item
    ));
    const nextCourses = courses.map((item) => (
      item.id === courseId
        ? { ...item, lessons: updatedLessons }
        : item
    ));
    setCourses(nextCourses);

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const downloadedLessons = saved.__downloadedLessons || {};
      saved.__downloadedLessons = {
        ...downloadedLessons,
        [courseId]: { ...downloadedLessons[courseId], [lessonId]: true },
      };
      saved[courseId] = Object.fromEntries(updatedLessons.map((item) => [item.id, item.completed]));
      saved.__lastActivity = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      setAttachmentError('The file downloaded, but this browser could not save your lesson progress.');
    }

    if (!lesson.completed) {
      const courseCompleted = updatedLessons.every((item) => item.completed);
      const title = courseCompleted ? 'Course completed' : 'Lesson completed';
      const message = courseCompleted
        ? `${username} completed all lessons in ${course.title}.`
        : `${username} completed "${lesson.title}" in ${course.title}.`;
      try {
        publishLmsNotification({
          recipientRole: 'instructor',
          courseId,
          title,
          message,
          type: 'activity',
        });
        publishLmsNotification({
          recipientRole: 'student',
          recipientUsername: username,
          courseId,
          title: courseCompleted ? 'Course completed' : 'Lesson marked complete',
          message: courseCompleted ? `You completed ${course.title}.` : `You completed "${lesson.title}".`,
          type: 'activity',
        });
        setActivityError('');
      } catch (notificationError) {
        setActivityError(`Progress was saved, but its notification could not be sent: ${notificationError.message || 'browser storage is unavailable'}.`);
      }
    }
  };

  const downloadAttachment = async (attachment, courseId, lessonId) => {
    setAttachmentError('');
    try {
      const file = await getLmsAttachment(attachment.id);
      if (!file) throw new Error('This attachment is no longer available in this browser.');
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      markLessonDownloaded(courseId, lessonId);
    } catch (error) {
      setAttachmentError(error.message || 'Could not open this attachment.');
    }
  };

  /*
   * Keep lesson completion controlled by successful attachment downloads.
   * A browser does not expose a reliable signal for when a download finishes;
   * the lesson is marked when its attachment is handed to the browser.
   */

  const openExam = (quiz) => {
    window.open(`/lms/exam/${encodeURIComponent(quiz.id)}`, '_blank', 'noopener,noreferrer');
  };

  const openAssessmentResult = (quiz, attempt) => {
    setSelectedAssessmentResult({ quiz, attempt });
  };

  const getAssessmentStatus = (quiz) => {
    const attempts = (quizAttempts[username] || []).filter((attempt) => attempt.quizId === quiz.id);
    const latest = attempts[attempts.length - 1];
    if (latest?.status === 'In Progress') return 'Pending';
    if (latest?.status === 'Pending Review' || latest?.status === 'Submitted') return 'Needs review';
    if (latest?.status === 'Graded') return latest.passed === true ? 'Passed' : 'Failed';
    return 'Not Attempted';
  };

  const canTakeAssessment = (quiz) => {
    const attempts = (quizAttempts[username] || []).filter((attempt) => attempt.quizId === quiz.id);
    return quiz.status === 'Published'
      && isAssessmentAvailable(quiz)
      && (attempts.some((attempt) => attempt.status === 'In Progress') || attempts.length < Number(quiz.maxAttempts));
  };

  const taskItems = courses.flatMap((course) => course.lessons
    .filter((lesson) => !lesson.completed)
    .map((lesson) => ({
      id: `${course.id}:${lesson.id}`,
      title: lesson.title,
      course,
      kind: 'Lesson',
      deadline: course.deadline || '',
      action: () => setSelectedCourseId(course.id),
    })));
  const assignedAssessments = quizzes
    .filter((quiz) => quiz.status === 'Published' && canTakeAssessment(quiz))
    .map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      course: courses.find((course) => course.id === quiz.courseId),
      kind: 'Assessment',
      deadline: quiz.availableUntil || '',
      action: () => openExam(quiz),
    }));
  const allTaskItems = [...assignedAssessments, ...taskItems];
  const calendarItems = instructorModules
    .filter((module) => module.status === 'Active' && module.deadline && module.deadline >= new Date().toISOString().slice(0, 10))
    .map((module) => ({
      id: module.id,
      title: module.title,
      date: module.deadline,
      type: 'Course deadline',
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const navigateSection = (section) => {
    setSearchParams(section === 'dashboard' ? {} : { view: section });
    document.querySelector('.lms-content-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cardMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className={`lms-page lms-workspace-layout ${isLightMode ? '' : 'theme-dark'}`}>
      <LMSWorkspaceSidebar
        activeSection={activeSection}
        onNavigate={navigateSection}
        taskCount={allTaskItems.length}
        username={username}
        role={role}
      />
      <div className="lms-shell">
        <header className="lms-topbar">
          <div className="lms-topbar-actions">
            <span className="lms-breadcrumb">Learning management <span>/</span> {activeSection === 'templates' ? 'Activity templates' : activeSection === 'tasks' ? 'My tasks' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</span>
            <div className="lms-user-actions">
              <LMSNotificationCenter role={role} username={username} courses={courses} isDarkMode={!isLightMode} />
              <WorkspaceThemeToggle isLightMode={isLightMode} onToggle={toggleTheme} />
              <div className="lms-user-chip">
                <span className="lms-online-dot" />
                <span>{username === 'guest' ? 'Training profile' : username}</span>
              </div>
            </div>
          </div>
        </header>
        {activityError && <p className="lms-activity-error" role="alert">{activityError}</p>}

        <div className="lms-content-scroll">
        <MotionSection
          className="lms-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <p className="lms-eyebrow"><span /> CREW DEVELOPMENT / TRAINING DECK</p>
            <h1>{activeSection === 'dashboard' ? 'Dashboard' : activeSection === 'tasks' ? 'My tasks' : activeSection === 'courses' ? 'Courses' : activeSection === 'calendar' ? 'Calendar' : activeSection === 'plans' ? 'Training plans' : activeSection === 'news' ? 'Learning updates' : 'Activity templates'}</h1>
            <p className="lms-intro">{activeSection === 'dashboard' ? 'Your training progress, assignments, and upcoming deadlines.' : activeSection === 'tasks' ? 'Keep track of your unfinished modules and available assessments.' : activeSection === 'courses' ? 'Explore your maritime training courses and continue learning.' : activeSection === 'calendar' ? 'Upcoming training deadlines from your active courses.' : activeSection === 'plans' ? 'Review your courses and the progress you have made in each.' : activeSection === 'news' ? 'Updates from your published training and assessments.' : 'Browse the lesson activities available in your course modules.'}</p>
          </div>
          {activeSection !== 'tasks' && activeSection !== 'news' && activeSection !== 'templates' && <div className="lms-readiness">
            <span className="lms-readiness-label">FLEET READINESS</span>
            <strong>{readinessPercent}%</strong>
            <span className="lms-readiness-track"><span style={{ width: `${readinessPercent}%` }} /></span>
          </div>}
        </MotionSection>

        {activeSection === 'dashboard' && <section className="lms-stats" aria-label="Training summary">
          <MotionArticle className="lms-stat-card" {...cardMotion} transition={{ delay: 0.04, duration: 0.3 }}>
            <span className="lms-stat-icon courses"><StatIcon type="courses" /></span>
            <div><span className="lms-stat-label">Enrolled Courses</span><strong>{courses.length}</strong><small>Available in your track</small></div>
          </MotionArticle>
          <MotionArticle className="lms-stat-card" {...cardMotion} transition={{ delay: 0.1, duration: 0.3 }}>
            <span className="lms-stat-icon modules"><StatIcon type="modules" /></span>
            <div><span className="lms-stat-label">Completed Modules</span><strong>{completedLessons}</strong><small>Across all courses</small></div>
          </MotionArticle>
          <MotionArticle className="lms-stat-card" {...cardMotion} transition={{ delay: 0.16, duration: 0.3 }}>
            <span className="lms-stat-icon certificates"><StatIcon type="certificates" /></span>
            <div><span className="lms-stat-label">Active Certifications</span><strong>{CERTIFICATIONS.length}</strong><small>Credentials in good standing</small></div>
          </MotionArticle>
        </section>}

        {(activeSection === 'dashboard' || activeSection === 'tasks') && (
          <section className={`lms-workspace-overview ${activeSection === 'tasks' ? 'tasks-view' : ''}`} aria-label={activeSection === 'tasks' ? 'My tasks' : 'Training overview'}>
            <div className="lms-workspace-main-panel">
              <div className="lms-panel-heading">
                <div><p className="lms-eyebrow">ASSIGNED TRAINING</p><h2>{activeSection === 'tasks' ? 'All tasks' : 'My tasks'}</h2></div>
                <span className="lms-panel-count">{allTaskItems.length} OPEN</span>
              </div>
              {allTaskItems.length ? (
                <div className="lms-task-list">
                  {allTaskItems.slice(0, activeSection === 'tasks' ? undefined : 6).map((task) => (
                    <article className="lms-task-row" key={task.id}>
                      <span className={`lms-task-type ${task.kind === 'Assessment' ? 'is-assessment' : ''}`}>{task.kind === 'Assessment' ? 'Q' : 'L'}</span>
                      <div className="lms-task-copy"><strong>{task.title}</strong><span>{task.course?.title || 'Training activity'}</span></div>
                      <span className="lms-task-due">{task.deadline ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${task.deadline}T00:00:00`)) : 'In progress'}</span>
                      <button type="button" onClick={task.action}>{task.kind === 'Assessment' ? 'Open' : 'Continue'} <span aria-hidden="true">›</span></button>
                    </article>
                  ))}
                </div>
              ) : <p className="lms-panel-empty">You’re all caught up. No open lessons or assessments.</p>}
              {activeSection === 'dashboard' && allTaskItems.length > 6 && <button className="lms-view-all" type="button" onClick={() => navigateSection('tasks')}>View all tasks <span aria-hidden="true">›</span></button>}
            </div>
            {activeSection === 'dashboard' && (
              <aside className="lms-agenda-panel">
                <div className="lms-panel-heading"><div><p className="lms-eyebrow">YOUR SCHEDULE</p><h2>Upcoming</h2></div></div>
                {calendarItems.length ? (
                  <div className="lms-agenda-list">
                    {calendarItems.slice(0, 5).map((item) => (
                      <article className="lms-agenda-item" key={item.id}>
                        <span className="lms-agenda-date">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${item.date}T00:00:00`))}</span>
                        <div><strong>{item.title}</strong><span>{item.type}</span></div>
                      </article>
                    ))}
                  </div>
                ) : <p className="lms-panel-empty">No course deadlines are scheduled.</p>}
                <button className="lms-view-all" type="button" onClick={() => navigateSection('calendar')}>View calendar <span aria-hidden="true">›</span></button>
              </aside>
            )}
          </section>
        )}

        {activeSection === 'calendar' && (
          <section className="lms-workspace-main-panel lms-detail-panel">
            <div className="lms-panel-heading"><div><p className="lms-eyebrow">COURSE SCHEDULE</p><h2>Upcoming deadlines</h2></div><span className="lms-panel-count">{calendarItems.length} DATES</span></div>
            <div className="lms-calendar-list">
              {calendarItems.map((item) => (
                <article className="lms-calendar-row" key={item.id}>
                  <span className="lms-calendar-date">{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${item.date}T00:00:00`))}</span>
                  <div><strong>{item.title}</strong><span>{item.type}</span></div>
                </article>
              ))}
              {!calendarItems.length && <p className="lms-panel-empty">There are no upcoming deadlines in your active courses.</p>}
            </div>
          </section>
        )}

        {activeSection === 'news' && (
          <section className="lms-workspace-main-panel lms-detail-panel">
            <div className="lms-panel-heading"><div><p className="lms-eyebrow">LEARNING UPDATES</p><h2>Published training</h2></div><span className="lms-panel-count">{courses.length} COURSES</span></div>
            <div className="lms-news-list">
              {courses.map((course) => (
                <article className="lms-news-row" key={course.id}>
                  <span className="lms-news-mark"><CourseMark accent={course.accent} /></span>
                  <div><strong>{course.title}</strong><span>{course.description}</span></div>
                  <button type="button" onClick={() => navigateSection('courses')}>View course <span aria-hidden="true">›</span></button>
                </article>
              ))}
            </div>
          </section>
        )}

        {(activeSection === 'plans' || activeSection === 'templates') && (
          <section className="lms-workspace-main-panel lms-detail-panel">
            <div className="lms-panel-heading"><div><p className="lms-eyebrow">{activeSection === 'plans' ? 'YOUR ASSIGNED PATH' : 'LESSON LIBRARY'}</p><h2>{activeSection === 'plans' ? 'Course progress' : 'Activities by course'}</h2></div><span className="lms-panel-count">{courses.length} COURSES</span></div>
            <div className="lms-plan-list">
              {courses.map((course) => {
                const progress = getDisplayedCourseProgress(course);
                return (
                  <article className="lms-plan-row" key={course.id}>
                    <div className={`lms-plan-mark lms-accent-${course.accent}`}><CourseMark accent={course.accent} /></div>
                    <div className="lms-plan-copy"><strong>{course.title}</strong><span>{activeSection === 'plans' ? `${progress.completed} of ${progress.total} modules complete` : `${course.lessons.length} lesson activities · ${course.duration}`}</span></div>
                    <span className="lms-mini-progress"><i style={{ width: `${progress.percent}%` }} /></span>
                    <strong className="lms-plan-percent">{progress.percent}%</strong>
                    <button type="button" onClick={() => setSelectedCourseId(course.id)}>{activeSection === 'plans' ? 'Open plan' : 'Browse'} <span aria-hidden="true">›</span></button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeSection === 'courses' && <section className="lms-courses-section" aria-labelledby="lms-courses-title">
          <div className="lms-section-heading">
            <div>
              <p className="lms-eyebrow">YOUR TRAINING PLAN</p>
              <h2 id="lms-courses-title">Maritime modules</h2>
            </div>
            <label className="lms-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
              </svg>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a course" aria-label="Search maritime courses" />
            </label>
          </div>

          <div className="lms-course-toolbar">
            <div className="lms-filter-list" role="group" aria-label="Filter courses">
              {FILTERS.map((option) => (
                <button key={option} type="button" className={filter === option ? 'selected' : ''} onClick={() => setFilter(option)} aria-pressed={filter === option}>
                  {option}
                </button>
              ))}
            </div>
            <span className="lms-result-count">{filteredCourses.length} COURSES</span>
          </div>

          <div className="lms-course-grid">
            {filteredCourses.map((course) => {
                const progress = getDisplayedCourseProgress(course);
                const status = getDisplayedCourseStatus(course);
                const action = status === 'Completed' ? 'Review course' : status === 'Not started' ? 'Start course' : 'Continue course';

                return (
                  <article className="lms-course-card" key={course.id}>
                    <div className="lms-card-topline">
                      <CourseMark accent={course.accent} />
                      <span className={`lms-status lms-status-${status.toLowerCase().replace(' ', '-')}`}>{status}</span>
                    </div>
                    <div className="lms-course-meta"><span>{course.category}</span>{course.level && <span>{course.level}</span>}</div>
                    <h3>{course.title}</h3>
                    <p className="lms-course-description">{course.description}</p>
                    <dl className="lms-course-details">
                      <div><dt>Faculty:</dt><dd>{course.faculty || 'Not assigned'}</dd></div>
                      <div><dt>Course Code:</dt><dd>{course.courseCode || 'Not assigned'}</dd></div>
                      <div><dt>Program/Year/Section:</dt><dd>{course.programYearSection || course.level || 'Not assigned'}</dd></div>
                      <div><dt>Course Units:</dt><dd>{course.courseUnits ?? 'Not set'}</dd></div>
                    </dl>
                    <div className="lms-course-progress-label">
                      <span>{progress.completed} / {progress.total} modules</span>
                      <strong>{progress.percent}%</strong>
                    </div>
                    <div className="lms-progress-track" role="progressbar" aria-label={`${course.title} progress`} aria-valuenow={progress.percent} aria-valuemin="0" aria-valuemax="100">
                      <span className={`lms-progress-fill lms-accent-${course.accent}`} style={{ width: `${progress.percent}%` }} />
                    </div>
                    <div className="lms-card-footer">
                      <span className="lms-duration"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>{course.duration}</span>
                      <button className="lms-course-action" type="button" onClick={() => setSelectedCourseId(course.id)}>{action}<span aria-hidden="true">→</span></button>
                    </div>
                  </article>
                );
              })}
            {filteredCourses.length === 0 && <p className="lms-empty-state">No courses match that search. Try a different title or filter.</p>}
          </div>
        </section>}

        {['dashboard', 'courses'].includes(activeSection) && <section className="lms-certifications" aria-labelledby="lms-certifications-title">
          <div className="lms-cert-heading">
            <div><p className="lms-eyebrow">QUALIFICATIONS</p><h2 id="lms-certifications-title">Active certifications</h2></div>
            <span className="lms-cert-count">{CERTIFICATIONS.length} VALID</span>
          </div>
          <div className="lms-cert-grid">
            {CERTIFICATIONS.map((certification, index) => (
              <MotionArticle className="lms-cert-card" key={certification.id} {...cardMotion} transition={{ delay: 0.08 + index * 0.08, duration: 0.3 }}>
                <span className={`lms-cert-seal lms-accent-${certification.tone}`}><StatIcon type="certificates" /></span>
                <div><h3>{certification.name}</h3><p>{certification.code} <span>·</span> {certification.expires}</p></div>
                <span className="lms-valid-mark">VALID</span>
              </MotionArticle>
            ))}
          </div>
        </section>}

        </div>

        <AnimatePresence>
          {selectedCourse && (
            <MotionDiv className="lms-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCourseId(null); }}>
              <MotionSection className="lms-course-modal" role="dialog" aria-modal="true" aria-labelledby="lms-modal-title" initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}>
                <header className="lms-modal-header">
                  <div><p className="lms-eyebrow">{selectedCourse.category} / COURSE OUTLINE</p><h2 id="lms-modal-title">{selectedCourse.title}</h2></div>
                  <button className="lms-modal-close" type="button" onClick={() => setSelectedCourseId(null)} aria-label="Close course outline">×</button>
                </header>
                <div className="lms-modal-progress">
                  <span>{getDisplayedCourseProgress(selectedCourse).completed} of {selectedCourse.lessons.length} modules complete</span>
                  <strong>{getDisplayedCourseProgress(selectedCourse).percent}%</strong>
                </div>
                <div className="lms-lesson-list">
                  {selectedCourse.lessons.map((lesson, index) => {
                    const lessonId = lesson.id || `${selectedCourse.id}-section-${index + 1}`;
                    const isExpanded = expandedLessonId === lessonId;
                    return (
                      <article className={`lms-lesson-item ${lesson.completed ? 'is-complete' : ''}`} key={lessonId}>
                        <div className="lms-lesson-row">
                          <button className="lms-lesson-expand" type="button" onClick={() => setExpandedLessonId(isExpanded ? null : lessonId)} aria-expanded={isExpanded} aria-controls={`lesson-details-${lessonId}`}>
                            <span className="lms-lesson-check" aria-hidden="true">{lesson.completed ? '✓' : String(index + 1).padStart(2, '0')}</span>
                            <span className="lms-lesson-title"><strong>{lesson.title}</strong><small>{isExpanded ? 'Hide lesson details' : 'View lesson details'}</small></span>
                            <span className="lms-lesson-duration">{lesson.duration}</span>
                            <span className={`lms-lesson-chevron ${isExpanded ? 'is-expanded' : ''}`} aria-hidden="true">
                              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
                            </span>
                          </button>
                          <div className="lms-lesson-completion" role="status" aria-label={`${lesson.title}: ${lesson.completed ? 'done' : 'not done'}`}>
                            <span className={`lms-lesson-completion-mark ${lesson.completed ? 'is-complete' : ''}`} aria-hidden="true">
                              {lesson.completed ? '✓' : ''}
                            </span>
                            <span>{lesson.completed ? 'Done' : 'Complete'}</span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="lms-lesson-details" id={`lesson-details-${lessonId}`}>
                            <p>{lesson.description || 'No additional lesson details have been provided.'}</p>
                            {lesson.resourceUrl ? (
                              <a className="lms-lesson-resource" href={lesson.resourceUrl} target="_blank" rel="noreferrer">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg>
                                Open lesson resource
                              </a>
                            ) : lesson.attachment ? (
                              <button className="lms-lesson-resource lms-file-download" type="button" onClick={() => downloadAttachment(lesson.attachment, selectedCourse.id, lessonId)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 17v3h14v-3" /></svg>
                                <span className="lms-file-download-label">Download</span>
                                <span className="lms-file-download-name" title={lesson.attachment.name}>{lesson.attachment.name}</span>
                              </button>
                            ) : (
                              <span className="lms-lesson-no-resource">No resource attached</span>
                            )}
                            {attachmentError && <p className="lms-attachment-error" role="alert">{attachmentError}</p>}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                <section className="lms-assessments" aria-labelledby="lms-assessments-title">
                  <div className="lms-assessments-heading"><div><p className="lms-eyebrow">KNOWLEDGE CHECK</p><h3 id="lms-assessments-title">Quizzes &amp; exams</h3></div><span>{quizzes.filter((quiz) => quiz.courseId === selectedCourse.id && quiz.status === 'Published').length} ASSIGNED</span></div>
                  {assessmentError && <p className="lms-attachment-error" role="alert">{assessmentError}</p>}
                  <div className="lms-assessment-list">
                    {quizzes.filter((quiz) => quiz.courseId === selectedCourse.id && quiz.status === 'Published').map((quiz) => {
                      const status = getAssessmentStatus(quiz);
                      const available = isAssessmentAvailable(quiz);
                      const inProgress = status === 'Pending';
                      const latestAttempt = [...(quizAttempts[username] || [])].reverse().find((attempt) => attempt.quizId === quiz.id);
                      const canViewResult = ['Pending Review', 'Submitted', 'Graded'].includes(latestAttempt?.status);
                      const canTake = canTakeAssessment(quiz);
                      return (
                        <article className="lms-assessment-row" key={quiz.id}>
                          <div><strong>{quiz.title}</strong><span>{quiz.questions?.length || 0} questions · {quiz.timeLimit} min · {quiz.maxAttempts} attempt{Number(quiz.maxAttempts) === 1 ? '' : 's'}</span></div>
                          <span className={`lms-assessment-status status-${status.toLowerCase().replace(' ', '-')}`}>{status}</span>
                          <div className="lms-assessment-actions">
                            {canTake && (
                              <button
                                className="lms-result-button is-launch"
                                type="button"
                                onClick={() => openExam(quiz)}
                                aria-label={`${inProgress ? 'Resume' : 'Take'} ${quiz.title}`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M14 4h6v6" />
                                  <path d="m20 4-9 9" />
                                  <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
                                </svg>
                                <span>{inProgress ? 'Resume exam' : 'Take exam'}</span>
                                <span className="lms-result-button-arrow" aria-hidden="true">→</span>
                              </button>
                            )}
                            {canViewResult && (
                              <button
                                className={`lms-result-button ${latestAttempt.status === 'Graded' ? 'is-released' : 'is-pending'}`}
                                type="button"
                                onClick={() => openAssessmentResult(quiz, latestAttempt)}
                                aria-label={latestAttempt.status === 'Graded' ? `View released result for ${quiz.title}` : `Check review status for ${quiz.title}`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                                  <circle cx="12" cy="12" r="2.5" />
                                </svg>
                                <span>{latestAttempt.status === 'Graded' ? 'View result' : 'Check review status'}</span>
                                <span className="lms-result-button-arrow" aria-hidden="true">→</span>
                              </button>
                            )}
                          </div>
                          {!available && <small className="lms-assessment-availability">{quiz.availableFrom && !isAssessmentAvailable({ availableFrom: quiz.availableFrom }) ? 'Not available yet' : 'Availability ended'}</small>}
                        </article>
                      );
                    })}
                    {quizzes.filter((quiz) => quiz.courseId === selectedCourse.id && quiz.status === 'Published').length === 0 && !assessmentError && <p className="lms-empty-state">No quizzes or exams have been assigned to this course yet.</p>}
                  </div>
                </section>
                <footer className="lms-modal-footer"><span>Progress saves automatically to this profile.</span><button type="button" onClick={() => setSelectedCourseId(null)}>Done</button></footer>
              </MotionSection>
            </MotionDiv>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {selectedAssessmentResult && (
            <MotionDiv
              className="lms-modal-backdrop lms-result-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAssessmentResult(null); }}
            >
              <MotionSection
                className="lms-course-modal lms-result-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lms-result-title"
                initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
              >
                <header className="lms-modal-header">
                  <div>
                    <p className="lms-eyebrow">ASSESSMENT / RESULT</p>
                    <h2 id="lms-result-title">{selectedAssessmentResult.quiz.title}</h2>
                  </div>
                  <button className="lms-modal-close" type="button" onClick={() => setSelectedAssessmentResult(null)} aria-label="Close assessment result">×</button>
                </header>
                {selectedAssessmentResult.attempt.status === 'Pending Review' || selectedAssessmentResult.attempt.status === 'Submitted' ? (
                  <div className="lms-result-pending" role="status">
                    <span className="lms-result-badge pending">IN REVIEW</span>
                    <h3>Submitted / Pending Review</h3>
                    <p>Your submission has been received and is waiting for instructor evaluation.</p>
                    <small>Your final score and pass status will appear here after your instructor releases the grade.</small>
                  </div>
                ) : selectedAssessmentResult.attempt.status === 'Graded' ? (
                  <div className="lms-result-content">
                    <div className={`lms-result-outcome ${selectedAssessmentResult.attempt.passed === true ? 'passed' : 'failed'}`}>
                      <span className={`lms-result-badge ${selectedAssessmentResult.attempt.passed === true ? 'passed' : 'failed'}`}>
                        {selectedAssessmentResult.attempt.passed === true ? 'PASS' : 'FAIL'}
                      </span>
                      <h3>{selectedAssessmentResult.attempt.passed === true ? 'Assessment passed' : 'Assessment failed'}</h3>
                      <p>Your instructor has released your final score.</p>
                    </div>
                    <div className="lms-result-score-grid">
                      <div><span>Score</span><strong>{selectedAssessmentResult.attempt.percentage}%</strong></div>
                      <div><span>Points</span><strong>{selectedAssessmentResult.attempt.earnedPoints} / {selectedAssessmentResult.attempt.possiblePoints}</strong></div>
                      <div><span>Passing score</span><strong>{selectedAssessmentResult.quiz.passingScore}%</strong></div>
                    </div>
                    {selectedAssessmentResult.quiz.questions.some((question) => selectedAssessmentResult.attempt.manualGrades?.[question.id]?.feedback?.trim()) && (
                      <section className="lms-result-feedback">
                        <h4>Instructor feedback</h4>
                        {selectedAssessmentResult.quiz.questions.filter((question) => selectedAssessmentResult.attempt.manualGrades?.[question.id]?.feedback?.trim()).map((question) => (
                          <article key={question.id}>
                            <strong>{question.prompt}</strong>
                            <p>{selectedAssessmentResult.attempt.manualGrades[question.id].feedback}</p>
                          </article>
                        ))}
                      </section>
                    )}
                    <p className="lms-result-attempt">Attempt {selectedAssessmentResult.attempt.attemptNumber || 1} of {selectedAssessmentResult.quiz.maxAttempts}</p>
                  </div>
                ) : (
                  <div className="lms-result-pending" role="status">
                    <span className="lms-result-badge pending">IN PROGRESS</span>
                    <h3>This assessment is still in progress</h3>
                    <p>Resume the assessment to continue. Your result will be available here after you submit and your instructor releases a grade.</p>
                  </div>
                )}
                <footer className="lms-modal-footer">
                  <span>Assessment results update after instructor evaluation.</span>
                  <button type="button" onClick={() => setSelectedAssessmentResult(null)}>Done</button>
                </footer>
              </MotionSection>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LMSPage;