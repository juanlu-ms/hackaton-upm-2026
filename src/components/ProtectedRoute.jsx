import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Protects routes that require authentication.
 * Optionally restricts by role and redirects to profile completion if needed.
 */
export default function ProtectedRoute({ children, requiredRole }) {
    const { user, profile, loading, isProfileComplete } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Cargando...</p>
            </div>
        )
    }

    // Not logged in → redirect to login
    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Profile incomplete → redirect to complete profile
    if (!isProfileComplete()) {
        return <Navigate to="/complete-profile" replace />
    }

    // Role check (e.g., admin-only routes)
    if (requiredRole && profile?.role !== requiredRole) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}
