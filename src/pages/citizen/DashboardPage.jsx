import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
    fetchWeather,
    sendPrompt,
    buildSystemPrompt,
    buildUserPrompt,
} from '../../lib/api'
import {
    CloudRain, AlertTriangle, Brain, History, RefreshCw,
    Thermometer, Wind, Droplets, Eye, MapPin, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'

function getWindValue(weatherData) {
    const candidates = [
        weatherData?.velmedia,
        weatherData?.vmax,
        weatherData?.windSpeed,
        weatherData?.viento,
    ]

    const windValue = candidates.find((value) => value !== undefined && value !== null && value !== '')
    return windValue
}

function buildWeatherAlert(weatherData) {
    if (!weatherData) return null

    const precipitation = Number(weatherData.prec)
    const wind = Number(getWindValue(weatherData))

    if (Number.isFinite(precipitation) && precipitation >= 100) {
        return {
            severity: 'critical',
            title: 'Alerta meteorológica por lluvia intensa',
            description: `La API está devolviendo ${precipitation} mm de precipitación. Evita desplazamientos y revisa zonas inundables.`,
        }
    }

    if (Number.isFinite(wind) && wind >= 70) {
        return {
            severity: 'critical',
            title: 'Alerta meteorológica por viento fuerte',
            description: `La API está devolviendo ${wind} km/h de viento. Evita exteriores y asegura objetos en balcones o terrazas.`,
        }
    }

    if (Number.isFinite(precipitation) && precipitation >= 30) {
        return {
            severity: 'warning',
            title: 'Aviso por precipitación elevada',
            description: `La API está devolviendo ${precipitation} mm de precipitación. Mantente atento a posibles incidencias.`,
        }
    }

    if (Number.isFinite(wind) && wind >= 40) {
        return {
            severity: 'warning',
            title: 'Aviso por viento',
            description: `La API está devolviendo ${wind} km/h de viento. Toma precauciones en exteriores.`,
        }
    }

    return null
}

export default function DashboardPage() {
    const { user, profile } = useAuth()

    const [weather, setWeather] = useState(null)
    const [weatherLoading, setWeatherLoading] = useState(false)
    const [recommendation, setRecommendation] = useState(null)
    const [recLoading, setRecLoading] = useState(false)
    const [alerts, setAlerts] = useState([])
    const [activeTab, setActiveTab] = useState('weather')
    const [weatherHistory, setWeatherHistory] = useState([])
    const [llmHistory, setLlmHistory] = useState([])
    const [alertHistory, setAlertHistory] = useState([])
    const [expandedRec, setExpandedRec] = useState(null)
    const [weatherAlert, setWeatherAlert] = useState(null)

    // Fetch active alerts on mount + subscribe to realtime
    useEffect(() => {
        loadActiveAlerts()
        loadHistory()
        handleFetchWeather()

        // Realtime subscription for new alerts
        const channel = supabase
            .channel('alerts-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'alerts' },
                (payload) => {
                    const newAlert = payload.new
                    setAlerts((prev) => [newAlert, ...prev])
                    toast(
                        `🚨 Nueva alerta: ${newAlert.title}`,
                        {
                            duration: 8000,
                            style: {
                                background: newAlert.severity === 'critical' ? '#dc2626' : '#f59e0b',
                                color: '#fff',
                                fontWeight: '600',
                            },
                        }
                    )
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    async function loadActiveAlerts() {
        const { data } = await supabase
            .from('alerts')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false })
        setAlerts(data || [])
    }

    async function loadHistory() {
        const [wRes, lRes, aRes] = await Promise.all([
            supabase.from('weather_logs').select('*').order('created_at', { ascending: false }).limit(20),
            supabase.from('llm_queries').select('*').order('created_at', { ascending: false }).limit(20),
            supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(20),
        ])
        setWeatherHistory(wRes.data || [])
        setLlmHistory(lRes.data || [])
        setAlertHistory(aRes.data || [])
    }

    async function handleFetchWeather() {
        setWeatherLoading(true)
        try {
            const data = await fetchWeather(false)
            setWeather(data)
            setWeatherAlert(buildWeatherAlert(data))

            // Save to history
            await supabase.from('weather_logs').insert({
                user_id: user.id,
                weather_data: data,
                disaster: false,
            })
            loadHistory()
        } catch (err) {
            setWeatherAlert(null)
            toast.error('Error al obtener datos meteorológicos')
            console.error(err)
        } finally {
            setWeatherLoading(false)
        }
    }

    async function handleGetRecommendation() {
        if (!weather) {
            toast.error('Primero obtén los datos meteorológicos')
            return
        }

        setRecLoading(true)
        try {
            const systemPrompt = buildSystemPrompt()
            const userPrompt = buildUserPrompt(weather, profile)
            const response = await sendPrompt(systemPrompt, userPrompt)

            const responseText =
                typeof response === 'string'
                    ? response
                    : response?.response || response?.message || JSON.stringify(response)

            setRecommendation(responseText)

            // Save to history
            await supabase.from('llm_queries').insert({
                user_id: user.id,
                system_prompt: systemPrompt,
                user_prompt: userPrompt,
                response: responseText,
            })
            loadHistory()
            toast.success('Recomendación generada')
        } catch (err) {
            toast.error('Error al generar recomendación')
            console.error(err)
        } finally {
            setRecLoading(false)
        }
    }

    const severityClass = (s) =>
        s === 'critical' ? 'severity-critical' : s === 'warning' ? 'severity-warning' : 'severity-info'

    const visibleAlerts = weatherAlert ? [weatherAlert, ...alerts] : alerts
    const windValue = getWindValue(weather)

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Panel de Ciudadano</h1>
                    <p className="dashboard-subtitle">
                        <MapPin size={16} /> {profile?.provincia || 'Sin provincia'} · {profile?.tipo_vivienda || 'Sin vivienda'}
                    </p>
                </div>
            </div>

            {/* Active Alerts Banner */}
            {visibleAlerts.length > 0 && (
                <div className="alerts-section">
                    {visibleAlerts.map((alert, index) => (
                        <div key={alert.id || `weather-alert-${index}`} className={`alert-banner ${severityClass(alert.severity)}`}>
                            <AlertTriangle size={22} />
                            <div className="alert-banner-content">
                                <strong>{alert.title}</strong>
                                <p>{alert.description}</p>
                            </div>
                            <span className="alert-badge">{alert.severity?.toUpperCase()}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Weather Section */}
            <section className="dashboard-card">
                <div className="card-header">
                    <h2><CloudRain size={22} /> Previsión Meteorológica</h2>
                    {weatherLoading && (
                        <span className="dashboard-subtitle">
                            <RefreshCw size={16} className="spinning" /> Cargando datos...
                        </span>
                    )}
                </div>

                {weather ? (
                    <div className="weather-display">
                        <div className="weather-grid">
                            {weather.tmed !== undefined && (
                                <div className="weather-stat">
                                    <Thermometer size={24} />
                                    <div>
                                        <span className="stat-value">{weather.tmed}°C</span>
                                        <span className="stat-label">Temperatura Med.</span>
                                    </div>
                                </div>
                            )}
                            {weather.hrMedia !== undefined && (
                                <div className="weather-stat">
                                    <Droplets size={24} />
                                    <div>
                                        <span className="stat-value">{weather.hrMedia}%</span>
                                        <span className="stat-label">Humedad</span>
                                    </div>
                                </div>
                            )}
                            {windValue !== undefined && windValue !== null && windValue !== '' && (
                                <div className="weather-stat">
                                    <Wind size={24} />
                                    <div>
                                        <span className="stat-value">{windValue} km/h</span>
                                        <span className="stat-label">Viento</span>
                                    </div>
                                </div>
                            )}
                            {weather.prec !== undefined && weather.prec !== null && (
                                <div className="weather-stat">
                                    <CloudRain size={24} />
                                    <div>
                                        <span className="stat-value">{weather.prec} mm</span>
                                        <span className="stat-label">Precipitación</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Show full JSON for any extra fields */}
                        <details className="weather-raw">
                            <summary>Ver datos completos</summary>
                            <pre>{JSON.stringify(weather, null, 2)}</pre>
                        </details>
                    </div>
                ) : weatherLoading ? (
                    <p className="empty-state">
                        Cargando la previsión meteorológica...
                    </p>
                ) : (
                    <p className="empty-state">
                        No se han podido cargar los datos meteorológicos.
                    </p>
                )}
            </section>

            {/* AI Recommendation Section */}
            <section className="dashboard-card recommendation-card">
                <div className="card-header">
                    <h2><Brain size={22} /> Recomendación IA Personalizada</h2>
                    <button
                        className="btn-primary"
                        onClick={handleGetRecommendation}
                        disabled={recLoading || !weather}
                    >
                        {recLoading ? (
                            <>
                                <RefreshCw size={16} className="spinning" /> Analizando...
                            </>
                        ) : (
                            '🤖 Pedir Recomendación'
                        )}
                    </button>
                </div>

                {recommendation ? (
                    <div className="recommendation-content">
                        <div className="recommendation-text" style={{ whiteSpace: 'pre-wrap' }}>
                            {recommendation}
                        </div>
                    </div>
                ) : (
                    <p className="empty-state">
                        {weather
                            ? 'Pulsa el botón para obtener recomendaciones personalizadas basadas en tu perfil.'
                            : 'Primero obtén los datos meteorológicos.'}
                    </p>
                )}
            </section>

            {/* History Section */}
            <section className="dashboard-card">
                <div className="card-header">
                    <h2><History size={22} /> Historial</h2>
                </div>

                <div className="history-tabs">
                    <button
                        className={`tab ${activeTab === 'weather' ? 'active' : ''}`}
                        onClick={() => setActiveTab('weather')}
                    >
                        Meteorología
                    </button>
                    <button
                        className={`tab ${activeTab === 'llm' ? 'active' : ''}`}
                        onClick={() => setActiveTab('llm')}
                    >
                        Consultas IA
                    </button>
                    <button
                        className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('alerts')}
                    >
                        Alertas
                    </button>
                </div>

                <div className="history-content">
                    {activeTab === 'weather' && (
                        <div className="history-list">
                            {weatherHistory.length === 0 ? (
                                <p className="empty-state">Sin registros meteorológicos</p>
                            ) : (
                                weatherHistory.map((w) => (
                                    <div key={w.id} className="history-item">
                                        <span className="history-date">
                                            {new Date(w.created_at).toLocaleString('es-ES')}
                                        </span>
                                        <span className={`history-badge ${w.disaster ? 'badge-danger' : 'badge-normal'}`}>
                                            {w.disaster ? 'Desastre' : 'Normal'}
                                        </span>
                                        <details>
                                            <summary>Ver datos</summary>
                                            <pre>{JSON.stringify(w.weather_data, null, 2)}</pre>
                                        </details>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'llm' && (
                        <div className="history-list">
                            {llmHistory.length === 0 ? (
                                <p className="empty-state">Sin consultas al LLM</p>
                            ) : (
                                llmHistory.map((q, i) => (
                                    <div key={q.id} className="history-item">
                                        <div
                                            className="history-item-header"
                                            onClick={() => setExpandedRec(expandedRec === i ? null : i)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="history-date">
                                                {new Date(q.created_at).toLocaleString('es-ES')}
                                            </span>
                                            {expandedRec === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                        {expandedRec === i && (
                                            <div className="history-detail">
                                                <div className="history-detail-section">
                                                    <strong>Respuesta:</strong>
                                                    <p style={{ whiteSpace: 'pre-wrap' }}>{q.response}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'alerts' && (
                        <div className="history-list">
                            {alertHistory.length === 0 ? (
                                <p className="empty-state">Sin alertas registradas</p>
                            ) : (
                                alertHistory.map((a) => (
                                    <div key={a.id} className={`history-item ${severityClass(a.severity)}`}>
                                        <span className="history-date">
                                            {new Date(a.created_at).toLocaleString('es-ES')}
                                        </span>
                                        <strong>{a.title}</strong>
                                        <p>{a.description}</p>
                                        <span className={`alert-badge ${severityClass(a.severity)}`}>
                                            {a.severity?.toUpperCase()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
