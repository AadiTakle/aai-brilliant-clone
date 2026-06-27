import { Route, Routes } from 'react-router-dom'
import { CoursePage } from '../pages/CoursePage'
import { LessonPage } from '../pages/LessonPage'
import { MasteryPage } from '../pages/MasteryPage'
import { CheckpointPage } from '../pages/CheckpointPage'
import { ResultsPage } from '../pages/ResultsPage'
import { CreateLessonPage } from '../pages/CreateLessonPage'
import { AiLessonPage } from '../pages/AiLessonPage'
import { SignInPage } from '../auth/SignInPage'
import { SignUpPage } from '../auth/SignUpPage'
import { RequireAuth } from '../auth/RequireAuth'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CoursePage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route
        path="/lessons/:lessonId/step/:stepIndex"
        element={
          <RequireAuth>
            <LessonPage />
          </RequireAuth>
        }
      />
      <Route
        path="/lessons/:lessonId/mastery"
        element={
          <RequireAuth>
            <MasteryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/checkpoint/:checkpointId"
        element={
          <RequireAuth>
            <CheckpointPage />
          </RequireAuth>
        }
      />
      <Route
        path="/lessons/:lessonId/results"
        element={
          <RequireAuth>
            <ResultsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/create"
        element={
          <RequireAuth>
            <CreateLessonPage />
          </RequireAuth>
        }
      />
      <Route
        path="/ai-lessons/:lessonId"
        element={
          <RequireAuth>
            <AiLessonPage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
