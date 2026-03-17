import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CompleteProfilePage from './pages/CompleteProfilePage'
import DashboardPage from './pages/citizen/DashboardPage'
import BackofficePage from './pages/admin/BackofficePage'

function RootRedirect() {
  const { user, profile, loading, isProfileComplete } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!isProfileComplete()) return <Navigate to="/complete-profile" replace />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes (no Header/Footer) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Post-login profile completion (with Layout) */}
          <Route
            path="/complete-profile"
            element={
              <Layout>
                <CompleteProfilePage />
              </Layout>
            }
          />

          {/* Protected citizen dashboard */}
          <Route
            path="/dashboard"
            element={
              <Layout>
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              </Layout>
            }
          />

          {/* Protected admin backoffice */}
          <Route
            path="/admin"
            element={
              <Layout>
                <ProtectedRoute requiredRole="admin">
                  <BackofficePage />
                </ProtectedRoute>
              </Layout>
            }
          />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
