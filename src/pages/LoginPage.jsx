import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield, ShieldCheck, Brain, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [selectedRole, setSelectedRole] = useState('citizen')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const { signIn, signInWithGoogle } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            await signIn(email, password)
            toast.success('¡Bienvenido de vuelta!')
            navigate(selectedRole === 'admin' ? '/admin' : '/dashboard')
        } catch (err) {
            toast.error(err.message || 'Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    async function handleGoogleLogin() {
        try {
            await signInWithGoogle()
        } catch (err) {
            toast.error(err.message || 'Error con Google')
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-left">
                <div className="auth-left-content">
                    <div className="auth-brand">
                        <Shield size={40} className="auth-brand-icon" />
                        <div>
                            <h1 className="auth-brand-title">
                                Sistema de Gestión de Emergencias Climáticas
                            </h1>
                            <p className="auth-brand-sub">Universidad Politécnica de Madrid</p>
                        </div>
                    </div>

                    <div className="auth-features">
                        <div className="auth-feature">
                            <ShieldCheck size={24} />
                            <div>
                                <h3>Alertas Personalizadas</h3>
                                <p>
                                    Recibe instrucciones específicas basadas en tu perfil y
                                    ubicación.
                                </p>
                            </div>
                        </div>
                        <div className="auth-feature">
                            <Brain size={24} />
                            <div>
                                <h3>Protección Inteligente</h3>
                                <p>
                                    IA avanzada que analiza tu situación y genera recomendaciones
                                    precisas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2>Iniciar Sesión</h2>
                    <p className="auth-form-sub">Accede al sistema de protección ciudadana</p>

                    {/* Role tabs */}
                    <div className="role-tabs">
                        <button
                            type="button"
                            className={`role-tab ${selectedRole === 'citizen' ? 'active' : ''}`}
                            onClick={() => setSelectedRole('citizen')}
                        >
                            Ciudadano
                        </button>
                        <button
                            type="button"
                            className={`role-tab ${selectedRole === 'admin' ? 'active' : ''}`}
                            onClick={() => setSelectedRole('admin')}
                        >
                            Administrador
                        </button>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Correo Electrónico</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="ejemplo@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <div className="password-input-wrap">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                <Eye size={18} />
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>

                    <div className="auth-divider">
                        <span>o continúa con</span>
                    </div>

                    <button
                        type="button"
                        className="btn-google btn-full"
                        onClick={handleGoogleLogin}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Iniciar con Google
                    </button>

                    <p className="auth-footer-link">
                        ¿Primera vez?{' '}
                        <Link to="/register">El sistema te guiará en el registro</Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
