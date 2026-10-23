# WharfIntel Project Changes

This document summarizes the LMS, authentication, and instructor-access work visible in the project changes, from account provisioning through the assessment workflow and latest UI updates.

## Login, instructor registration, and invite codes

- Added distinct **Instructor Login** and **Instructor account registration** modes to the login/register dialog, alongside the existing commander and admin access modes.
- Instructor registration collects an invite code and submits it with the new account credentials. On successful registration, the UI signs the instructor in and sends them to `/lms/instructor`.
- Login checks the selected access mode against the account role. Instructor accounts are routed to the instructor dashboard, admin accounts to `/admin`, and regular users to `/dashboard`; signing in through the wrong role-specific mode is rejected.
- Added **Generate Instructor Invite** in the Admin Dashboard's Personnel area.
- Invite generation asks the admin to re-enter their password, creates a random single-use code, displays its 24-hour expiry, and provides a copy action.
- Backend invite records store a hash of the code, the creating admin, creation and expiry times, and redemption time. Registration validates the code, rejects invalid, expired, or already-used codes, assigns the new account the instructor role, then marks the invite redeemed.
- Instructor invite generation verifies the admin's account role and password on the backend. The raw invite code is returned for sharing; only its hash is persisted.
- Added the backend user-role and instructor-invite data fields/models needed for role-aware login and invite tracking.

## Student assessments and grading

- Multiple-choice and true/false questions are auto-scored for the instructor's review workspace.
- Submitted assessments remain **Pending Review** until an instructor finalizes and releases a grade. Students do not see a provisional pass/fail result or final score while the submission is waiting.
- The student submission screen explains that the assessment is awaiting instructor evaluation.
- Instructors can review each response alongside its answer key or rubric, enter marks for subjective questions, add written feedback, and release the combined score.
- After release, the student result displays **Assessment passed** or **Assessment failed**, together with the score, passing threshold, and any instructor feedback.
- Older ungraded `Submitted` attempts are treated as awaiting review for compatibility.

## Instructor dashboard

- Added **Submission Checking** and **Student Management** dashboard tabs.
- Submission Checking lists pending attempts and opens a grading workspace with student/submission details, response review, point entry, feedback, and grade release.
- The dashboard opens on Submission Checking if pending reviews are already present and displays a pending-review count on the tab.
- The review list recognizes both current pending-review attempts and older ungraded submissions. It also explains when matching quiz data is unavailable.
- Student Management provides a searchable student directory, course/batch filtering, progress and assessment summaries, performance history, course-enrollment controls, and certificate records.
- Removed the **Create New Quiz / Exam** action from the Quiz & Exam Manager panel. The separate dashboard-header create action remains.
- Changed the restricted instructor-dashboard action from **Back to LMS** to **Back to home page**, which navigates to `/`.

## Learner LMS interface

- **View result** opens an in-page result panel rather than opening a new browser tab. Pending submissions show review status; graded submissions show the released result.
- Refined the assessment action buttons. **Take exam** and **Resume exam** now share the View result button's visual style.
- Updated the LMS background and surface colors to a dark navy/slate grid matching the supplied reference image.
- Improved LMS course-card and result-panel contrast, spacing, hover states, and responsive behavior.

## Storage and limitations

Assessment definitions, attempts, learner progress, and related instructor actions currently use browser `localStorage`. They are available within the same browser profile and origin, but are **not synchronized across different devices, browsers, or profiles**. Cross-device student/instructor review requires server-backed assessment storage.

## Main files changed

- `frontend/src/pages/AuthPage.jsx`
- `frontend/src/pages/AuthStyle.css`
- `frontend/src/pages/Admin.jsx`
- `frontend/src/pages/Admin.css`
- `backend/app/main.py`
- `backend/app/models.py`
- `frontend/src/pages/InstructorManagementViews.jsx`
- `frontend/src/pages/InstructorManagementViews.css`
- `frontend/src/pages/InstructorLMSPage.jsx`
- `frontend/src/pages/InstructorQuizBuilder.jsx`
- `frontend/src/pages/LMSPage.jsx`
- `frontend/src/pages/LMSPage.css`
- `frontend/src/pages/StudentExamTaker.jsx`
- `frontend/src/pages/StudentExamTaker.css`
- `frontend/src/pages/lmsStore.js`
- `frontend/src/pages/quizStore.js`

## Validation and GitHub

- Focused ESLint checks passed for the changed React files.
- The frontend production build passed.
- Quiz-scoring and pending-review compatibility checks passed.
- The latest LMS updates were pushed to GitHub `main` in commit `9cdfdc4` (`Polish LMS assessment actions and navigation`). The preceding instructor-review visibility update is commit `740a83c`, and the initial grading-workflow implementation is commit `1f2a22f`.
