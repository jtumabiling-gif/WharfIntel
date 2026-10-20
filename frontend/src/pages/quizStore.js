export const QUIZZES_STORAGE_KEY = 'wharfintel:lms-quizzes:v1';
export const QUIZ_ATTEMPTS_STORAGE_KEY = 'wharfintel:lms-quiz-attempts:v1';

const readCollection = (key, label, fallback) => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  const value = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error(`Saved ${label} data is invalid.`);
  return value;
};

export const loadQuizzes = () => readCollection(QUIZZES_STORAGE_KEY, 'quiz', []);

export const saveQuizzes = (quizzes) => {
  localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(quizzes));
};

export const loadQuizAttempts = () => {
  const raw = localStorage.getItem(QUIZ_ATTEMPTS_STORAGE_KEY);
  if (!raw) return {};
  const attempts = JSON.parse(raw);
  if (!attempts || typeof attempts !== 'object' || Array.isArray(attempts)) {
    throw new Error('Saved quiz attempt data is invalid.');
  }
  return attempts;
};

export const saveQuizAttempts = (attempts) => {
  localStorage.setItem(QUIZ_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
};

export const createAssessmentId = () => (
  globalThis.crypto?.randomUUID?.() || `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

export const isAssessmentAvailable = (quiz, now = Date.now()) => {
  const startsAt = quiz.availableFrom ? new Date(quiz.availableFrom).getTime() : null;
  const endsAt = quiz.availableUntil ? new Date(quiz.availableUntil).getTime() : null;
  return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt >= now);
};

export const scoreAssessment = (quiz, answers) => {
  const possiblePoints = quiz.questions.reduce((total, question) => total + Number(question.points || 0), 0);
  const earnedPoints = quiz.questions.reduce((total, question) => {
    const answer = String(answers[question.id] ?? '').trim().toLocaleLowerCase();
    const correctAnswer = String(question.answer ?? '').trim().toLocaleLowerCase();
    return total + (answer && answer === correctAnswer ? Number(question.points || 0) : 0);
  }, 0);
  const percentage = possiblePoints ? Math.round((earnedPoints / possiblePoints) * 100) : 0;
  return {
    earnedPoints,
    possiblePoints,
    percentage,
    passed: percentage >= Number(quiz.passingScore),
  };
};
