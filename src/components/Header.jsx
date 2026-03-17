import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, LogOut, User, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
    const { user, profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)

    async function handleLogout() {
        await signOut()
        navigate('/login')
    }

    return (
        <header className="app-header">
            <div className="header-content">
                <Link to="/" className="header-logo">
                    <Shield size={28} />
                    <span className="header-title">ClimAlert</span>
                </Link>

                {/* Mobile menu toggle */}
                <button
                    className="menu-toggle"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Abrir menú"
                >
                    {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
                    {user ? (
                        <>
                            <Link
                                to={profile?.role === 'admin' ? '/admin' : '/dashboard'}
                                className="nav-link"
                                onClick={() => setMenuOpen(false)}
                            >
                                Panel
                            </Link>
                            <div className="header-user">
                                <User size={18} />
                                <span className="user-name">
                                    {profile?.full_name || user.email}
                                </span>
                                {profile?.role === 'admin' && (
                                    <span className="role-badge">Admin</span>
                                )}
                            </div>
                            <button className="btn-logout" onClick={handleLogout}>
                                <LogOut size={18} />
                                <span>Cerrar Sesión</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="btn-header btn-header-outline"
                                onClick={() => setMenuOpen(false)}
                            >
                                Iniciar Sesión
                            </Link>
                            <Link
                                to="/register"
                                className="btn-header btn-header-primary"
                                onClick={() => setMenuOpen(false)}
                            >
                                Registrarse
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}
