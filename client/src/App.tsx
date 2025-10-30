import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { useEffect, useState } from 'react'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SearchPage from './pages/SearchPage'
import PlaylistPage from './pages/PlaylistPage'
import VideoPlayerPage from './pages/VideoPlayerPage'
import AssessmentPage from './pages/AssessmentPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import CompletedPage from './pages/CompletedPage'

// Components
import Navbar from './components/Navbar'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, isLoading, checkAuth } = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      await checkAuth()
      setIsInitialized(true)
    }
    initializeAuth()
  }, []) // Remove checkAuth from dependencies to prevent multiple calls

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        
        {user && <Navbar />}
        
        <main className={user ? 'pt-16' : ''}>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/register" 
              element={!user ? <RegisterPage /> : <Navigate to="/dashboard" replace />} 
            />
            
            {/* Protected routes */}
            <Route 
              path="/" 
              element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/search" 
              element={user ? <SearchPage /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/playlist/:playlistId" 
              element={user ? <PlaylistPage /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/video/:videoId" 
              element={user ? <VideoPlayerPage /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/assessment/:assessmentId" 
              element={user ? <AssessmentPage /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/dashboard" 
              element={user ? <DashboardPage /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/profile" 
              element={user ? <ProfilePage /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/profile/completed" 
              element={user ? <CompletedPage /> : <Navigate to="/login" replace />} 
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
