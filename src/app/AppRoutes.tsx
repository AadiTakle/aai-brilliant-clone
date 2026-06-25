import { Route, Routes } from 'react-router-dom'
import { CoursePage } from '../pages/CoursePage'
import { LessonPage } from '../pages/LessonPage'
import { ResultsPage } from '../pages/ResultsPage'
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
        path="/lessons/:lessonId/results"
        element={
          <RequireAuth>
            <ResultsPage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
