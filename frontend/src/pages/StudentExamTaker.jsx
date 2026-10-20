import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  isAssessmentAvailable,
  loadQuizAttempts,
  loadQuizzes,
  saveQuizAttempts,
  scoreAssessment,
} from './quizStore';
import './InstructorQuizBuilder.css';
import './StudentExamTaker.css';

const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

const StudentExamTaker = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'guest';
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const answersRef = useRef(answers);
  const attemptRef = useRef(attempt);
  const finalizeRef = useRef(null);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { attemptRef.current = attempt; }, [attempt]);

  useEffect(() => {
    const initializeAttempt = () => {
      try {
        const assessment = loadQuizzes().find((item) => item.id === examId);
        if (!assessment || assessment.status !== 'Published') {
          setError('This assessment is unavailable or has not been published.');
          return;
        }
        setQuiz(assessment);
        if (!isAssessmentAvailable(assessment)) {
          setError(assessment.availableFrom && !isAssessmentAvailable({ availableFrom: assessment.availableFrom })
            ? 'This assessment is not available yet.'
            : 'The availability window for this assessment has ended.');
          return;
        }

        const storedAttempts = loadQuizAttempts();
        const learnerAttempts = storedAttempts[username] || [];
        const existingAttempt = [...learnerAttempts].reverse().find((item) => item.quizId === examId && item.status === 'In Progress');
        if (existingAttempt) {
          setAttempt(existingAttempt);
          setAnswers(existingAttempt.answers || {});
          setSecondsLeft(Math.max(0, Math.ceil((new Date(existingAttempt.expiresAt).getTime() - Date.now()) / 1000)));
          return;
        }

        const quizAttempts = learnerAttempts.filter((item) => item.quizId === examId);
        if (quizAttempts.length >= Number(assessment.maxAttempts)) {
          setAttempt(quizAttempts[quizAttempts.length - 1] || null);
          setError(quizAttempts.length ? '' : 'No attempts are available for this assessment.');
          return;
        }

        const startedAt = new Date();
        const newAttempt = {
          id: globalThis.crypto?.randomUUID?.() || `attempt-${Date.now()}`,
          quizId: examId,
          startedAt: startedAt.toISOString(),
          expiresAt: new Date(startedAt.getTime() + Number(assessment.timeLimit) * 60000).toISOString(),
          attemptNumber: quizAttempts.length + 1,
          status: 'In Progress',
          answers: {},
        };
        saveQuizAttempts({ ...storedAttempts, [username]: [...learnerAttempts, newAttempt] });
        setAttempt(newAttempt);
        setSecondsLeft(Number(assessment.timeLimit) * 60);
      } catch (loadError) {
        setError(loadError.message || 'Could not load this assessment.');
      }
    };
    const timer = window.setTimeout(initializeAttempt, 0);
    return () => window.clearTimeout(timer);
  }, [examId, username]);

  const finalizeAttempt = (expired = false) => {
    const currentAttempt = attemptRef.current;
    if (!quiz || !currentAttempt || currentAttempt.status !== 'In Progress') return;
    try {
      const result = scoreAssessment(quiz, answersRef.current);
      const completedAttempt = {
        ...currentAttempt,
        answers: answersRef.current,
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
        expired,
        ...result,
      };
      const storedAttempts = loadQuizAttempts();
      const learnerAttempts = storedAttempts[username] || [];
      const updatedAttempts = learnerAttempts.map((item) => item.id === completedAttempt.id ? completedAttempt : item);
      saveQuizAttempts({ ...storedAttempts, [username]: updatedAttempts });
      attemptRef.current = completedAttempt;
      setAttempt(completedAttempt);
      setShowConfirmation(false);
    } catch (saveError) {
      setSubmissionError(saveError.message || 'Could not submit this assessment.');
    }
  };

  useEffect(() => { finalizeRef.current = finalizeAttempt; });

  useEffect(() => {
    if (attempt?.status !== 'In Progress') return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) finalizeRef.current?.(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt]);

  const updateAnswer = (questionId, value) => {
    const nextAnswers = { ...answersRef.current, [questionId]: value };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setSubmissionError('');
    try {
      const currentAttempt = attemptRef.current;
      const storedAttempts = loadQuizAttempts();
      const updatedAttempts = (storedAttempts[username] || []).map((item) => (
        item.id === currentAttempt.id ? { ...item, answers: nextAnswers } : item
      ));
      saveQuizAttempts({ ...storedAttempts, [username]: updatedAttempts });
    } catch (saveError) {
      setSubmissionError(saveError.message || 'Your answer could not be saved.');
    }
  };

  const openFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((fullscreenError) => {
        setError(fullscreenError.message || 'Fullscreen mode could not be enabled.');
      });
    } else {
      document.exitFullscreen?.().catch((fullscreenError) => {
        setError(fullscreenError.message || 'Fullscreen mode could not be closed.');
      });
    }
  };

  if (error && !quiz) {
    return <main className="student-exam-page"><section className="exam-message-card"><p className="quiz-eyebrow">ASSESSMENT ACCESS</p><h1>Exam unavailable</h1><p role="alert">{error}</p><button type="button" className="quiz-button secondary" onClick={() => navigate('/lms')}>Return to learning center</button></section></main>;
  }
  if (!quiz) return <main className="student-exam-page"><p className="exam-loading">Loading assessment…</p></main>;

  if (attempt?.status === 'Submitted') {
    return (
      <main className="student-exam-page exam-result-page">
        <section className="quiz-result-card">
          <p className="quiz-eyebrow">ASSESSMENT COMPLETE</p>
          <span className={`exam-result-mark ${attempt.passed ? 'passed' : 'failed'}`}>{attempt.passed ? 'PASS' : 'REVIEW'}</span>
          <h1>{attempt.passed ? 'Assessment passed' : 'Assessment not passed'}</h1>
          <p className="exam-result-description">{attempt.expired ? 'Time expired and your responses were submitted.' : 'Your responses have been submitted and scored.'}</p>
          <div className="exam-score-grid">
            <div><span>Score</span><strong>{attempt.percentage}%</strong></div>
            <div><span>Points</span><strong>{attempt.earnedPoints} / {attempt.possiblePoints}</strong></div>
            <div><span>Passing score</span><strong>{quiz.passingScore}%</strong></div>
          </div>
          <p className="exam-attempt-count">Attempt {attempt.attemptNumber || 1} of {quiz.maxAttempts}</p>
          <button type="button" className="quiz-button secondary" onClick={() => navigate('/lms')}>Return to learning center</button>
        </section>
      </main>
    );
  }

  if (attempt && attempt.status !== 'In Progress') {
    return <main className="student-exam-page"><section className="exam-message-card"><p className="quiz-eyebrow">ATTEMPTS USED</p><h1>No attempts remaining</h1><p>You have reached the maximum number of attempts for this assessment.</p><button type="button" className="quiz-button secondary" onClick={() => navigate('/lms')}>Return to learning center</button></section></main>;
  }

  if (error) {
    return <main className="student-exam-page"><section className="exam-message-card"><p className="quiz-eyebrow">ASSESSMENT NOTICE</p><h1>Assessment unavailable</h1><p role="alert">{error}</p><button type="button" className="quiz-button secondary" onClick={() => navigate('/lms')}>Return to learning center</button></section></main>;
  }

  const answeredCount = quiz.questions.filter((question) => String(answers[question.id] || '').trim()).length;
  const currentQuestion = quiz.questions[activeQuestion];
  const lowTime = secondsLeft <= 5 * 60;

  return (
    <main className="student-exam-page exam-taking-page">
      <header className="exam-header">
        <div><p className="quiz-eyebrow">WHARFINTEL / ASSESSMENT</p><h1>{quiz.title}</h1><span>{username}</span></div>
        <div className="exam-header-actions"><div className={`exam-timer ${lowTime ? 'low-time' : ''}`} role="timer" aria-live="off"><small>TIME REMAINING</small><strong>{formatTime(secondsLeft)}</strong></div><button type="button" className="exam-fullscreen-button" onClick={openFullscreen} aria-label="Toggle fullscreen">⛶</button></div>
      </header>
      <div className="exam-body">
        <aside className="exam-question-nav" aria-label="Question navigation">
          <div className="exam-nav-heading"><strong>Questions</strong><span>{answeredCount}/{quiz.questions.length} answered</span></div>
          <div className="exam-question-grid">
            {quiz.questions.map((question, index) => (
              <button type="button" key={question.id} className={`${activeQuestion === index ? 'current' : ''} ${String(answers[question.id] || '').trim() ? 'answered' : ''}`} onClick={() => setActiveQuestion(index)} aria-label={`Go to question ${index + 1}${answers[question.id] ? ', answered' : ', unanswered'}`}>{index + 1}</button>
            ))}
          </div>
          <div className="exam-nav-legend"><span><i className="current" />Current</span><span><i className="answered" />Answered</span><span><i />Unanswered</span></div>
        </aside>
        <section className="exam-question-panel" aria-labelledby="exam-question-heading">
          <div className="exam-question-meta"><span>QUESTION {String(activeQuestion + 1).padStart(2, '0')} / {String(quiz.questions.length).padStart(2, '0')}</span><span>{currentQuestion.points} point{Number(currentQuestion.points) === 1 ? '' : 's'}</span></div>
          <h2 id="exam-question-heading">{currentQuestion.prompt}</h2>
          {currentQuestion.type === 'multiple-choice' && <div className="exam-answer-list">{currentQuestion.options.map((option, index) => <label className={`exam-choice ${answers[currentQuestion.id] === option ? 'selected' : ''}`} key={`${currentQuestion.id}-${index}`}><input type="radio" name={currentQuestion.id} value={option} checked={answers[currentQuestion.id] === option} onChange={() => updateAnswer(currentQuestion.id, option)} /><span>{option}</span></label>)}</div>}
          {currentQuestion.type === 'true-false' && <div className="exam-answer-list">{['True', 'False'].map((option) => <label className={`exam-choice ${answers[currentQuestion.id] === option ? 'selected' : ''}`} key={option}><input type="radio" name={currentQuestion.id} value={option} checked={answers[currentQuestion.id] === option} onChange={() => updateAnswer(currentQuestion.id, option)} /><span>{option}</span></label>)}</div>}
          {currentQuestion.type === 'identification' && <label className="exam-identification"><span>Your answer</span><input value={answers[currentQuestion.id] || ''} onChange={(event) => updateAnswer(currentQuestion.id, event.target.value)} autoComplete="off" /></label>}
          <footer className="exam-question-footer">
            <button type="button" className="quiz-button secondary" onClick={() => setActiveQuestion((index) => Math.max(0, index - 1))} disabled={activeQuestion === 0}>← Previous</button>
            <button type="button" className="quiz-button secondary" onClick={() => setActiveQuestion((index) => Math.min(quiz.questions.length - 1, index + 1))} disabled={activeQuestion === quiz.questions.length - 1}>Next →</button>
          </footer>
          {submissionError && <p className="quiz-form-message error" role="alert">{submissionError}</p>}
        </section>
      </div>
      <footer className="exam-submit-bar"><span>{quiz.description || 'Your answers are saved in this browser while the assessment is in progress.'}</span><button type="button" className="quiz-button primary" onClick={() => setShowConfirmation(true)}>Submit exam</button></footer>
      {showConfirmation && <div className="exam-confirm-backdrop"><section className="exam-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="exam-confirm-title"><p className="quiz-eyebrow">FINAL SUBMISSION</p><h2 id="exam-confirm-title">Submit this exam?</h2><p>{answeredCount === quiz.questions.length ? 'You have answered every question.' : `${quiz.questions.length - answeredCount} question${quiz.questions.length - answeredCount === 1 ? '' : 's'} remain unanswered. Unanswered questions score zero.`} You cannot change answers after submitting.</p><div><button type="button" className="quiz-button secondary" onClick={() => setShowConfirmation(false)}>Keep working</button><button type="button" className="quiz-button primary" onClick={() => finalizeAttempt(false)}>Submit & score</button></div></section></div>}
    </main>
  );
};

export default StudentExamTaker;
