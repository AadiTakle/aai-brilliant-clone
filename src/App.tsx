import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { Nav } from './components/Nav'
import { AppRoutes } from './app/AppRoutes'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
