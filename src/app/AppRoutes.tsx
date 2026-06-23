import { Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { LessonPage } from '../pages/LessonPage'
import { SignInPage } from '../auth/SignInPage'
import { SignUpPage } from '../auth/SignUpPage'
import { RequireAuth } from '../auth/RequireAuth'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
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
    </Routes>
  )
}
