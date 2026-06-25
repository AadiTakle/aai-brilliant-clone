import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AuthProvider } from './auth/AuthProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import { Nav } from './components/Nav'
import { AppRoutes } from './app/AppRoutes'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <BrowserRouter>
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <Nav />
            <div id="main-content" tabIndex={-1}>
              <AppRoutes />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}

export default App
