import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { fetchWeather, sendPrompt, buildSystemPrompt } from "../../lib/api";
import {
	CloudRain,
	AlertTriangle,
	Plus,
	History,
	RefreshCw,
	Thermometer,
	Wind,
	Droplets,
	Eye,
	Send,
	Users,
	Bell,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

export default function BackofficePage() {
	const { user } = useAuth();

	const [weather, setWeather] = useState(null);
	const [weatherLoading, setWeatherLoading] = useState(false);
	const [showAlertForm, setShowAlertForm] = useState(false);
	const [alertTitle, setAlertTitle] = useState("");
	const [alertDesc, setAlertDesc] = useState("");
	const [alertSeverity, setAlertSeverity] = useState("warning");
	const [alertLoading, setAlertLoading] = useState(false);
	const [riskAnalysis, setRiskAnalysis] = useState(null);
	const [riskLoading, setRiskLoading] = useState(false);

	const [activeTab, setActiveTab] = useState("weather");
	const [weatherHistory, setWeatherHistory] = useState([]);
	const [llmHistory, setLlmHistory] = useState([]);
	const [alertHistory, setAlertHistory] = useState([]);
	const [expandedItem, setExpandedItem] = useState(null);

	useEffect(() => {
		loadHistory();
	}, []);

	async function loadHistory() {
		const [wRes, lRes, aRes] = await Promise.all([
			supabase
				.from("weather_logs")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(50),
			supabase
				.from("llm_queries")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(50),
			supabase
				.from("alerts")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(50),
		]);
		setWeatherHistory(wRes.data || []);
		setLlmHistory(lRes.data || []);
		setAlertHistory(aRes.data || []);
	}

	async function handleFetchWeather(disaster = false) {
		setWeatherLoading(true);
		try {
			const data = await fetchWeather(disaster);
			setWeather(data);

			await supabase.from("weather_logs").insert({
				user_id: user.id,
				weather_data: data,
				disaster,
			});
			loadHistory();
			toast.success("Datos meteorológicos actualizados");
		} catch (err) {
			toast.error("Error al obtener datos meteorológicos");
			console.error(err);
		} finally {
			setWeatherLoading(false);
		}
	}

	async function handleRiskAnalysis() {
		if (!weather) {
			toast.error("Primero obtén los datos meteorológicos");
			return;
		}

		setRiskLoading(true);
		try {
			const systemPrompt = `Eres un analista de riesgos meteorológicos para el sistema de gestión de emergencias de protección civil de España. Tu tarea es analizar datos meteorológicos y determinar si se debe emitir una alerta a la población.

RESPONDE con el siguiente formato exacto:
1. NIVEL DE RIESGO: [BAJO/MEDIO/ALTO/CRÍTICO]
2. RECOMENDACIÓN: [EMITIR ALERTA / NO EMITIR ALERTA / MONITORIZAR]
3. JUSTIFICACIÓN: Breve explicación técnica
4. ALERTA SUGERIDA: Si recomiendas emitir alerta, propón el título y descripción.

Sé preciso, técnico y directo.`;

			const userPrompt = `Analiza estos datos meteorológicos y determina si es necesario emitir una alerta a la población:\n\n${JSON.stringify(weather, null, 2)}`;

			const response = await sendPrompt(systemPrompt, userPrompt);
			const responseText =
				typeof response === "string" ? response : (
					response?.response || response?.message || JSON.stringify(response)
				);

			setRiskAnalysis(responseText);

			await supabase.from("llm_queries").insert({
				user_id: user.id,
				system_prompt: systemPrompt,
				user_prompt: userPrompt,
				response: responseText,
			});
			loadHistory();
			toast.success("Análisis de riesgo completado");
		} catch (err) {
			toast.error("Error al analizar riesgo");
			console.error(err);
		} finally {
			setRiskLoading(false);
		}
	}

	async function handleCreateAlert(e) {
		e.preventDefault();
		if (!alertTitle || !alertDesc) {
			toast.error("Completa todos los campos de la alerta");
			return;
		}

		setAlertLoading(true);
		try {
			const { error } = await supabase.from("alerts").insert({
				title: alertTitle,
				description: alertDesc,
				severity: alertSeverity,
				created_by: user.id,
				active: true,
			});
			if (error) throw error;

			toast.success("🚨 Alerta emitida a todos los ciudadanos");
			setAlertTitle("");
			setAlertDesc("");
			setAlertSeverity("warning");
			setShowAlertForm(false);
			loadHistory();
		} catch (err) {
			toast.error("Error al crear alerta");
			console.error(err);
		} finally {
			setAlertLoading(false);
		}
	}

	async function handleToggleAlert(alertId, currentActive) {
		try {
			await supabase
				.from("alerts")
				.update({ active: !currentActive })
				.eq("id", alertId);
			toast.success(currentActive ? "Alerta desactivada" : "Alerta reactivada");
			loadHistory();
		} catch (err) {
			toast.error("Error al actualizar alerta");
		}
	}

	const severityClass = (s) =>
		s === "critical" ? "severity-critical"
		: s === "warning" ? "severity-warning"
		: "severity-info";

	return (
		<div className="dashboard admin-dashboard">
			<div className="dashboard-header">
				<div>
					<h1>Panel de Backoffice</h1>
					<p className="dashboard-subtitle">
						<Users size={16} /> Administración de Emergencias
					</p>
				</div>
				<button
					className="btn-danger btn-lg"
					onClick={() => setShowAlertForm(!showAlertForm)}
				>
					<Bell size={20} />
					{showAlertForm ? "Cancelar" : "Crear Alerta"}
				</button>
			</div>

			{/* Alert Creation Form */}
			{showAlertForm && (
				<section className="dashboard-card alert-form-card">
					<h2>
						<Plus size={22} /> Nueva Alerta de Emergencia
					</h2>
					<form onSubmit={handleCreateAlert}>
						<div className="form-group">
							<label htmlFor="alert-title">Título de la Alerta</label>
							<input
								id="alert-title"
								type="text"
								placeholder="Ej: Alerta Roja por lluvias torrenciales"
								value={alertTitle}
								onChange={(e) => setAlertTitle(e.target.value)}
								required
							/>
						</div>
						<div className="form-group">
							<label htmlFor="alert-desc">Descripción</label>
							<textarea
								id="alert-desc"
								placeholder="Describe la situación de emergencia..."
								value={alertDesc}
								onChange={(e) => setAlertDesc(e.target.value)}
								required
								rows={4}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="alert-sev">Severidad</label>
							<div className="severity-selector">
								{["info", "warning", "critical"].map((s) => (
									<button
										key={s}
										type="button"
										className={`severity-btn ${severityClass(s)} ${alertSeverity === s ? "selected" : ""}`}
										onClick={() => setAlertSeverity(s)}
									>
										{s === "info" ?
											"ℹ️ Info"
										: s === "warning" ?
											"⚠️ Warning"
										:	"🔴 Crítico"}
									</button>
								))}
							</div>
						</div>
						<button
							type="submit"
							className="btn-danger btn-full"
							disabled={alertLoading}
						>
							<Send size={18} />
							{alertLoading ?
								"Emitiendo..."
							:	"Emitir Alerta a Todos los Ciudadanos"}
						</button>
					</form>
				</section>
			)}

			{/* Weather Section */}
			<section className="dashboard-card">
				<div className="card-header">
					<h2>
						<CloudRain size={22} /> Previsión Meteorológica
					</h2>
					<div className="card-actions">
						<button
							className="btn-secondary"
							onClick={() => handleFetchWeather(false)}
							disabled={weatherLoading}
						>
							<RefreshCw
								size={16}
								className={weatherLoading ? "spinning" : ""}
							/>
							Normal
						</button>
						<button
							className="btn-danger"
							onClick={() => handleFetchWeather(true)}
							disabled={weatherLoading}
						>
							<AlertTriangle size={16} />
							Desastre
						</button>
					</div>
				</div>

				{weather ?
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
							{weather.velmedia !== undefined && weather.velmedia !== null && (
								<div className="weather-stat">
									<Wind size={24} />
									<div>
										<span className="stat-value">{weather.velmedia} km/h</span>
										<span className="stat-label">Viento Med.</span>
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
						<details className="weather-raw">
							<summary>Ver datos completos</summary>
							<pre>{JSON.stringify(weather, null, 2)}</pre>
						</details>
					</div>
				:	<p className="empty-state">
						Obtén la previsión meteorológica para analizar la situación.
					</p>
				}
			</section>

			{/* Risk Analysis Section */}
			<section className="dashboard-card">
				<div className="card-header">
					<h2>
						<AlertTriangle size={22} /> Análisis de Riesgo
					</h2>
					<button
						className="btn-primary"
						onClick={handleRiskAnalysis}
						disabled={riskLoading || !weather}
					>
						{riskLoading ?
							<>
								<RefreshCw size={16} className="spinning" /> Analizando...
							</>
						:	"🤖 Analizar Riesgo"}
					</button>
				</div>

				{riskAnalysis ?
					<div className="recommendation-content">
						<div
							className="recommendation-text"
							style={{ whiteSpace: "pre-wrap" }}
						>
							{riskAnalysis}
						</div>
					</div>
				:	<p className="empty-state">
						{weather ?
							"Solicita un análisis de riesgo basado en los datos meteorológicos."
						:	"Primero obtén los datos meteorológicos."}
					</p>
				}
			</section>

			{/* History Section */}
			<section className="dashboard-card">
				<div className="card-header">
					<h2>
						<History size={22} /> Historial Completo
					</h2>
				</div>

				<div className="history-tabs">
					<button
						className={`tab ${activeTab === "weather" ? "active" : ""}`}
						onClick={() => setActiveTab("weather")}
					>
						Meteorología
					</button>
					<button
						className={`tab ${activeTab === "llm" ? "active" : ""}`}
						onClick={() => setActiveTab("llm")}
					>
						Consultas IA
					</button>
					<button
						className={`tab ${activeTab === "alerts" ? "active" : ""}`}
						onClick={() => setActiveTab("alerts")}
					>
						Alertas Emitidas
					</button>
				</div>

				<div className="history-content">
					{activeTab === "weather" && (
						<div className="history-list">
							{weatherHistory.length === 0 ?
								<p className="empty-state">Sin registros</p>
							:	weatherHistory.map((w) => (
									<div key={w.id} className="history-item">
										<span className="history-date">
											{new Date(w.created_at).toLocaleString("es-ES")}
										</span>
										<span
											className={`history-badge ${w.disaster ? "badge-danger" : "badge-normal"}`}
										>
											{w.disaster ? "Desastre" : "Normal"}
										</span>
										<details>
											<summary>Ver datos</summary>
											<pre>{JSON.stringify(w.weather_data, null, 2)}</pre>
										</details>
									</div>
								))
							}
						</div>
					)}

					{activeTab === "llm" && (
						<div className="history-list">
							{llmHistory.length === 0 ?
								<p className="empty-state">Sin consultas</p>
							:	llmHistory.map((q, i) => (
									<div key={q.id} className="history-item">
										<div
											className="history-item-header"
											onClick={() =>
												setExpandedItem(expandedItem === i ? null : i)
											}
											style={{ cursor: "pointer" }}
										>
											<span className="history-date">
												{new Date(q.created_at).toLocaleString("es-ES")}
											</span>
											{expandedItem === i ?
												<ChevronUp size={16} />
											:	<ChevronDown size={16} />}
										</div>
										{expandedItem === i && (
											<div className="history-detail">
												<p style={{ whiteSpace: "pre-wrap" }}>{q.response}</p>
											</div>
										)}
									</div>
								))
							}
						</div>
					)}

					{activeTab === "alerts" && (
						<div className="history-list">
							{alertHistory.length === 0 ?
								<p className="empty-state">Sin alertas emitidas</p>
							:	alertHistory.map((a) => (
									<div
										key={a.id}
										className={`history-item ${severityClass(a.severity)}`}
									>
										<div className="history-item-header">
											<span className="history-date">
												{new Date(a.created_at).toLocaleString("es-ES")}
											</span>
											<span
												className={`alert-badge ${severityClass(a.severity)}`}
											>
												{a.severity?.toUpperCase()}
											</span>
											<span
												className={`alert-status ${a.active ? "active" : "inactive"}`}
											>
												{a.active ? "🟢 Activa" : "⚪ Inactiva"}
											</span>
										</div>
										<strong>{a.title}</strong>
										<p>{a.description}</p>
										<button
											className="btn-sm"
											onClick={() => handleToggleAlert(a.id, a.active)}
										>
											{a.active ? "Desactivar" : "Reactivar"}
										</button>
									</div>
								))
							}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
