import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, Home, Heart, Phone, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

const PROVINCIAS = [
    'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila',
    'Badajoz', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria',
    'Castellón', 'Ciudad Real', 'Córdoba', 'A Coruña', 'Cuenca',
    'Girona', 'Granada', 'Guadalajara', 'Gipuzkoa', 'Huelva', 'Huesca',
    'Illes Balears', 'Jaén', 'León', 'Lleida', 'Lugo', 'Madrid',
    'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Las Palmas',
    'Pontevedra', 'La Rioja', 'Salamanca', 'Santa Cruz de Tenerife',
    'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo',
    'Valencia', 'Valladolid', 'Bizkaia', 'Zamora', 'Zaragoza', 'Ceuta', 'Melilla'
]

const TIPOS_VIVIENDA = [
    { value: 'Sótano', icon: '🏚️', desc: 'Nivel subterráneo' },
    { value: 'Planta baja', icon: '🏠', desc: 'Nivel de calle' },
    { value: 'Piso alto', icon: '🏢', desc: 'Pisos superiores' },
    { value: 'Casa de campo', icon: '🏡', desc: 'Zona rural' },
]

const NECESIDADES = [
    { value: 'Silla de ruedas', label: 'Silla de ruedas' },
    { value: 'Movilidad reducida', label: 'Movilidad reducida' },
    { value: 'Persona dependiente', label: 'Persona dependiente' },
    { value: 'Mascotas', label: 'Mascotas' },
    { value: 'Discapacidad visual', label: 'Discapacidad visual' },
    { value: 'Discapacidad auditiva', label: 'Discapacidad auditiva' },
    { value: 'Persona mayor sola', label: 'Persona mayor que vive sola' },
]

export default function CompleteProfilePage() {
    const { user, profile, updateProfile } = useAuth()
    const navigate = useNavigate()

    const [provincia, setProvincia] = useState(profile?.provincia || '')
    const [tipoVivienda, setTipoVivienda] = useState(profile?.tipo_vivienda || '')
    const [necesidades, setNecesidades] = useState(profile?.necesidades_especiales || [])
    const [phone, setPhone] = useState(profile?.phone || '')
    const [loading, setLoading] = useState(false)

    function toggleNecesidad(value) {
        setNecesidades((prev) =>
            prev.includes(value)
                ? prev.filter((n) => n !== value)
                : [...prev, value]
        )
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!provincia || !tipoVivienda) {
            toast.error('Por favor, completa los campos obligatorios')
            return
        }

        setLoading(true)
        try {
            await updateProfile({
                provincia,
                tipo_vivienda: tipoVivienda,
                necesidades_especiales: necesidades,
                phone,
            })
            toast.success('¡Perfil completado!')
            navigate(profile?.role === 'admin' ? '/admin' : '/dashboard')
        } catch (err) {
            toast.error(err.message || 'Error al guardar el perfil')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="complete-profile-page">
            <div className="profile-form-container">
                <div className="profile-form-header">
                    <h1>Completa tu Perfil</h1>
                    <p>
                        Necesitamos esta información para ofrecerte recomendaciones de
                        seguridad personalizadas ante emergencias climáticas.
                    </p>
                </div>

                <form className="profile-form" onSubmit={handleSubmit}>

                    {/* Provincia */}
                    <div className="form-group">
                        <label htmlFor="cp-provincia">
                            <MapPin size={16} className="label-icon" />
                            Provincia <span className="required">*</span>
                        </label>
                        <select
                            id="cp-provincia"
                            value={provincia}
                            onChange={(e) => setProvincia(e.target.value)}
                            required
                        >
                            <option value="">Selecciona tu provincia</option>
                            {PROVINCIAS.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tipo de vivienda */}
                    <div className="form-group">
                        <label>
                            <Home size={16} className="label-icon" />
                            Tipo de Vivienda <span className="required">*</span>
                        </label>
                        <div className="vivienda-grid">
                            {TIPOS_VIVIENDA.map((tipo) => (
                                <button
                                    key={tipo.value}
                                    type="button"
                                    className={`vivienda-card ${tipoVivienda === tipo.value ? 'selected' : ''}`}
                                    onClick={() => setTipoVivienda(tipo.value)}
                                >
                                    <span className="vivienda-icon">{tipo.icon}</span>
                                    <span className="vivienda-name">{tipo.value}</span>
                                    <span className="vivienda-desc">{tipo.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Necesidades especiales */}
                    <div className="form-group">
                        <label>
                            <Heart size={16} className="label-icon" />
                            Necesidades Especiales
                        </label>
                        <p className="form-hint">
                            Selecciona todas las que apliquen para ti o las personas a tu cargo.
                        </p>
                        <div className="necesidades-grid">
                            {NECESIDADES.map((n) => (
                                <label
                                    key={n.value}
                                    className={`necesidad-chip ${necesidades.includes(n.value) ? 'selected' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={necesidades.includes(n.value)}
                                        onChange={() => toggleNecesidad(n.value)}
                                    />
                                    <span>{n.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Teléfono */}
                    <div className="form-group">
                        <label htmlFor="cp-phone">
                            <Phone size={16} className="label-icon" />
                            Teléfono de Contacto
                        </label>
                        <input
                            id="cp-phone"
                            type="tel"
                            placeholder="+34 600 000 000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary btn-full btn-lg"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Completar Perfil'}
                        {!loading && <ArrowRight size={20} />}
                    </button>
                </form>
            </div>
        </div>
    )
}
