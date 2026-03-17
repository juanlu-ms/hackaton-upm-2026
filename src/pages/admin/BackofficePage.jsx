import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { fetchWeather, sendPrompt, buildAdminPrompt } from '../../lib/api'
import { AlertTriangle, Bell, RefreshCw, ShieldCheck, Users, Wind, CloudRain, Accessibility, Thermometer, Droplets } from 'lucide-react'
import toast from 'react-hot-toast'

function getWindValue(weatherData) {
    const candidates = [
        weatherData?.velmedia,
        weatherData?.vmax,
        weatherData?.windSpeed,
        weatherData?.viento,
    ]
    return candidates.find((value) => value !== undefined && value !== null && value !== '')
}

function inferSeverityLevel(weatherData) {
    const rain = Number(weatherData?.prec)
    const wind = Number(getWindValue(weatherData))

    if ((Number.isFinite(rain) && rain >= 100) || (Number.isFinite(wind) && wind >= 60)) {
        return { severity: 'critical', label: 'Alerta Roja' }
    }
    if ((Number.isFinite(rain) && rain >= 30) || (Number.isFinite(wind) && wind >= 40)) {
        return { severity: 'warning', label: 'Alerta Naranja' }
    }
    return { severity: 'info', label: 'Alerta Amarilla' }
}

export default function BackofficePage() {
    const { user } = useAuth()

    const [weather, setWeather] = useState(null)
    const [weatherLoading, setWeatherLoading] = useState(false)
    const [analysisLoading, setAnalysisLoading] = useState(false)
    const [analysisText, setAnalysisText] = useState('')
    const [alertLoading, setAlertLoading] = useState(false)
    const [selectedSeverity, setSelectedSeverity] = useState('warning')
    const [activeAlerts, setActiveAlerts] = useState([])
    const [alertHistory, setAlertHistory] = useState([])
    const [updatingAlertId, setUpdatingAlertId] = useState(null)
    const [metrics, setMetrics] = useState({
        citizensRegistered: 0,
        vulnerableProfiles: 0,
        alertsToday: 0,
        basementUsers: 0,
        groundFloorUsers: 0,
        reducedMobilityUsers: 0,
    })

    useEffect(() => {
        loadAdminData()
    }, [])

    async function loadAdminData() {
        await Promise.all([loadMetrics(), loadWeatherAndAnalysis(), loadAlertsData()])
    }

    async function loadAlertsData() {
        try {
            const { data, error } = await supabase
                .from('alerts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error

            const allAlerts = data || []
            setAlertHistory(allAlerts)
            setActiveAlerts(allAlerts.filter((alert) => alert.active))
        } catch (err) {
            console.error(err)
            toast.error('No se pudieron cargar las alertas')
        }
    }

    async function loadMetrics() {
        try {
            const startOfDay = new Date()
            startOfDay.setHours(0, 0, 0, 0)

            const [profilesRes, alertsTodayRes] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, role, tipo_vivienda, necesidades_especiales')
                    .eq('role', 'citizen'),
                supabase
                    .from('alerts')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', startOfDay.toISOString()),
            ])

            if (profilesRes.error) throw profilesRes.error
            if (alertsTodayRes.error) throw alertsTodayRes.error

            const citizens = profilesRes.data || []
            const basementUsers = citizens.filter((p) => p.tipo_vivienda === 'Sótano').length
            const groundFloorUsers = citizens.filter((p) => p.tipo_vivienda === 'Planta baja').length
            const reducedMobilityUsers = citizens.filter((p) =>
                Array.isArray(p.necesidades_especiales)
                && p.necesidades_especiales.some((n) => n?.toLowerCase().includes('movilidad reducida'))
            ).length

            const vulnerableProfiles = citizens.filter((p) => {
                const lowHouse = p.tipo_vivienda === 'Sótano' || p.tipo_vivienda === 'Planta baja'
                const reducedMobility = Array.isArray(p.necesidades_especiales)
                    && p.necesidades_especiales.some((n) => n?.toLowerCase().includes('movilidad reducida'))
                return lowHouse || reducedMobility
            }).length

            setMetrics({
                citizensRegistered: citizens.length,
                vulnerableProfiles,
                alertsToday: alertsTodayRes.count || 0,
                basementUsers,
                groundFloorUsers,
                reducedMobilityUsers,
            })
        } catch (err) {
            console.error(err)
            toast.error('No se pudieron cargar las métricas del backoffice')
        }
    }

    async function loadWeatherAndAnalysis() {
        setWeatherLoading(true)
        setAnalysisLoading(true)
        try {
            const weatherData = await fetchWeather(false)
            setWeather(weatherData)

            await supabase.from('weather_logs').insert({
                user_id: user.id,
                weather_data: weatherData,
                disaster: false,
            })

            const { systemPrompt, userPrompt } = buildAdminPrompt(weatherData)

            const response = await sendPrompt(systemPrompt, userPrompt)
            const responseText =
                typeof response === 'string'
                    ? response
                    : response?.response || response?.message || JSON.stringify(response)

            setAnalysisText(responseText)

            await supabase.from('llm_queries').insert({
                user_id: user.id,
                system_prompt: systemPrompt,
                user_prompt: userPrompt,
                response: responseText,
            })
        } catch (err) {
            console.error(err)
            toast.error('No se pudo obtener el análisis inteligente')
        } finally {
            setWeatherLoading(false)
            setAnalysisLoading(false)
        }
    }

    const recommendedLevel = useMemo(() => inferSeverityLevel(weather), [weather])
    const windValue = useMemo(() => getWindValue(weather), [weather])

    useEffect(() => {
        setSelectedSeverity(recommendedLevel.severity)
    }, [recommendedLevel.severity])

    const severityOptions = {
        info: 'Alerta Amarilla',
        warning: 'Alerta Naranja',
        critical: 'Alerta Roja',
    }

    const severityClass = (severity) => {
        if (severity === 'critical') return 'severity-critical'
        if (severity === 'warning') return 'severity-warning'
        return 'severity-info'
    }

    async function handleSendAlert() {
        const confirmMessage = `Confirmación Requerida\n\nEsta acción enviará una alerta a todos los ciudadanos registrados. ¿Deseas continuar?`
        const isConfirmed = window.confirm(confirmMessage)
        if (!isConfirmed) return

        setAlertLoading(true)
        try {
            const levelLabel = severityOptions[selectedSeverity] || recommendedLevel.label
            const title = `Alerta general ${levelLabel}`
            const precipitation = weather?.prec ?? 'N/D'
            const wind = getWindValue(weather) ?? 'N/D'
            const description = `Se emite ${levelLabel.toLowerCase()} para toda la población registrada. Precipitación actual: ${precipitation} mm. Viento actual: ${wind} km/h. Sigue indicaciones de Protección Civil.`

            const { error } = await supabase.from('alerts').insert({
                title,
                description,
                severity: selectedSeverity,
                created_by: user.id,
                active: true,
            })
            if (error) throw error

            toast.success('🚨 Alerta enviada a todos los ciudadanos')
            await Promise.all([loadMetrics(), loadAlertsData()])
        } catch (err) {
            console.error(err)
            toast.error('Error al enviar la alerta general')
        } finally {
            setAlertLoading(false)
        }
    }

    async function handleToggleAlert(alertId, currentActive) {
        setUpdatingAlertId(alertId)
        try {
            const { error } = await supabase
                .from('alerts')
                .update({ active: !currentActive })
                .eq('id', alertId)

            if (error) throw error

            toast.success(currentActive ? 'Alerta desactivada' : 'Alerta reactivada')
            await Promise.all([loadMetrics(), loadAlertsData()])
        } catch (err) {
            console.error(err)
            toast.error('No se pudo actualizar la alerta')
        } finally {
            setUpdatingAlertId(null)
        }
    }

    return (
        <div className="dashboard admin-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Panel de Backoffice</h1>
                    <p className="dashboard-subtitle">
                        <Users size={16} /> Emisión y control de alertas ciudadanas
                    </p>
                </div>
                <button
                    className="btn-secondary"
                    onClick={loadAdminData}
                    disabled={weatherLoading || analysisLoading || alertLoading}
                >
                    <RefreshCw size={16} className={weatherLoading || analysisLoading ? 'spinning' : ''} />
                    Actualizar datos
                </button>
            </div>

            <section className="admin-kpi-grid">
                <article className="admin-kpi-card">
                    <span className="admin-kpi-label">Ciudadanos registrados</span>
                    <strong className="admin-kpi-value">{metrics.citizensRegistered}</strong>
                </article>
                <article className="admin-kpi-card">
                    <span className="admin-kpi-label">Perfiles vulnerables</span>
                    <strong className="admin-kpi-value">{metrics.vulnerableProfiles}</strong>
                </article>
                <article className="admin-kpi-card">
                    <span className="admin-kpi-label">Alertas hoy</span>
                    <strong className="admin-kpi-value">{metrics.alertsToday}</strong>
                </article>
            </section>

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
                            {weather.tmed !== undefined && weather.tmed !== null && (
                                <div className="weather-stat">
                                    <Thermometer size={24} />
                                    <div>
                                        <span className="stat-value">{weather.tmed}°C</span>
                                        <span className="stat-label">Temperatura Med.</span>
                                    </div>
                                </div>
                            )}
                            {weather.hrMedia !== undefined && weather.hrMedia !== null && (
                                <div className="weather-stat">
                                    <Droplets size={24} />
                                    <div>
                                        <span className="stat-value">{weather.hrMedia}%</span>
                                        <span className="stat-label">Humedad</span>
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
                            {windValue !== undefined && windValue !== null && windValue !== '' && (
                                <div className="weather-stat">
                                    <Wind size={24} />
                                    <div>
                                        <span className="stat-value">{windValue} km/h</span>
                                        <span className="stat-label">Viento</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="empty-state">No hay datos meteorológicos disponibles.</p>
                )}
            </section>

            <section className="admin-panels-grid">
                <article className="dashboard-card">
                    <div className="card-header">
                        <h2><AlertTriangle size={22} /> Analisis Inteligente</h2>
                    </div>

                    {analysisLoading ? (
                        <p className="empty-state">Analizando condiciones meteorológicas...</p>
                    ) : analysisText ? (
                        <div className="recommendation-content">
                            <p className="recommendation-text" style={{ whiteSpace: 'pre-wrap' }}>
                                {analysisText}
                            </p>
                        </div>
                    ) : (
                        <p className="empty-state">No hay análisis disponible.</p>
                    )}

                    <div className="admin-user-metrics">
                        <div className="admin-user-metric-item">
                            <CloudRain size={18} />
                            <span className="admin-user-metric-value">{metrics.basementUsers}</span>
                            <span className="admin-user-metric-label">Sótanos</span>
                        </div>
                        <div className="admin-user-metric-item">
                            <Wind size={18} />
                            <span className="admin-user-metric-value">{metrics.groundFloorUsers}</span>
                            <span className="admin-user-metric-label">Planta Baja</span>
                        </div>
                        <div className="admin-user-metric-item">
                            <Accessibility size={18} />
                            <span className="admin-user-metric-value">{metrics.reducedMobilityUsers}</span>
                            <span className="admin-user-metric-label">Movilidad Reducida</span>
                        </div>
                    </div>
                </article>

                <article className="dashboard-card admin-control-panel">
                    <div className="card-header">
                        <h2><Bell size={22} /> Panel de Control de Alertas</h2>
                    </div>
                    <p className="admin-panel-subtitle">Emisión de alertas generales a ciudadanos</p>

                    <div className="admin-control-list">
                        <div className="admin-control-row">
                            <span>Destinatarios:</span>
                            <strong>{metrics.citizensRegistered} ciudadanos</strong>
                        </div>
                        <div className="admin-control-row">
                            <span>Nivel recomendado:</span>
                            <strong>{recommendedLevel.label}</strong>
                        </div>
                        <div className="admin-control-row admin-control-row-column">
                            <span>Nivel a enviar:</span>
                            <select
                                className="admin-select"
                                value={selectedSeverity}
                                onChange={(e) => setSelectedSeverity(e.target.value)}
                            >
                                <option value="info">Alerta Amarilla</option>
                                <option value="warning">Alerta Naranja</option>
                                <option value="critical">Alerta Roja</option>
                            </select>
                        </div>
                        <div className="admin-control-row">
                            <span>Estado del sistema:</span>
                            <strong><ShieldCheck size={16} /> Operativo</strong>
                        </div>
                    </div>

                    <button
                        className="btn-danger btn-full admin-send-button"
                        onClick={handleSendAlert}
                        disabled={alertLoading}
                    >
                        <Bell size={18} />
                        {alertLoading ? 'Enviando alerta...' : 'Enviar alerta'}
                    </button>
                </article>
            </section>

            <section className="admin-panels-grid">
                <article className="dashboard-card">
                    <div className="card-header">
                        <h2><Bell size={22} /> Alertas activas</h2>
                    </div>
                    {activeAlerts.length === 0 ? (
                        <p className="empty-state">No hay alertas activas en este momento.</p>
                    ) : (
                        <div className="history-list">
                            {activeAlerts.map((alert) => (
                                <div key={alert.id} className={`history-item ${severityClass(alert.severity)}`}>
                                    <div className="history-item-header">
                                        <span className="history-date">
                                            {new Date(alert.created_at).toLocaleString('es-ES')}
                                        </span>
                                        <span className={`alert-badge ${severityClass(alert.severity)}`}>
                                            {severityOptions[alert.severity] || alert.severity}
                                        </span>
                                    </div>
                                    <strong>{alert.title}</strong>
                                    <p>{alert.description}</p>
                                    <button
                                        className="btn-secondary alert-action-btn alert-action-btn-danger"
                                        onClick={() => handleToggleAlert(alert.id, alert.active)}
                                        disabled={updatingAlertId === alert.id}
                                    >
                                        {updatingAlertId === alert.id ? 'Actualizando...' : 'Quitar alerta'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </article>

                <article className="dashboard-card">
                    <div className="card-header">
                        <h2><AlertTriangle size={22} /> Historial de alertas</h2>
                    </div>
                    {alertHistory.length === 0 ? (
                        <p className="empty-state">Sin alertas registradas.</p>
                    ) : (
                        <div className="history-list">
                            {alertHistory.map((alert) => (
                                <div key={alert.id} className={`history-item ${severityClass(alert.severity)}`}>
                                    <div className="history-item-header">
                                        <span className="history-date">
                                            {new Date(alert.created_at).toLocaleString('es-ES')}
                                        </span>
                                        <span className={`alert-status ${alert.active ? 'active' : 'inactive'}`}>
                                            {alert.active ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </div>
                                    <strong>{alert.title}</strong>
                                    <p>{alert.description}</p>
                                    {!alert.active && (
                                        <button
                                            className="btn-secondary alert-action-btn alert-action-btn-success"
                                            onClick={() => handleToggleAlert(alert.id, alert.active)}
                                            disabled={updatingAlertId === alert.id}
                                        >
                                            {updatingAlertId === alert.id ? 'Actualizando...' : 'Reactivar alerta'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </article>
            </section>
        </div>
    )
}
