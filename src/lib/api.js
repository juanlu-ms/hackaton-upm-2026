/**
 * API helpers for the hackathon external API (weather + LLM)
 * and prompt engineering utilities.
 */

const API_BASE = '/api'
const BEARER_TOKEN = import.meta.env.VITE_BEARER_TOKEN || ''

/**
 * Fetch weather data from the hackathon API.
 * @param {boolean} disaster - Whether to simulate disaster conditions
 */
export async function fetchWeather(disaster = false) {
    const res = await fetch(
        `${API_BASE}/weather?disaster=${disaster}`,
        {
            headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` },
        }
    )
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`)
    return res.json()
}

/**
 * Send a prompt to the LLM via the hackathon API.
 * @param {string} systemPrompt - Instructions for the model
 * @param {string} userPrompt - The user's query
 */
export async function sendPrompt(systemPrompt, userPrompt) {
    const res = await fetch(`${API_BASE}/prompt`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
        }),
    })
    if (!res.ok) throw new Error(`LLM API error: ${res.status}`)
    return res.json()
}

/**
 * Build a system prompt for the emergency expert AI.
 */
export function buildSystemPrompt() {
    return `Eres un asistente de emergencias climáticas. Responde SIEMPRE en español usando markdown simple, corto y limpio.

Usa EXACTAMENTE esta estructura:

### 🚨 Prioridad
**[ALTA/MEDIA/BAJA]**: [una frase breve con el riesgo principal]

### ✅ Qué hacer ahora
1. [acción inmediata]
2. [segunda acción]
3. [tercera acción]

### 📱 Contactos
- **112** Emergencias
- **1006** Protección Civil

> [una frase final corta para mantenerse atento]

Reglas:
- máximo 90 palabras
- sin introducciones ni conclusiones extra
- sin texto fuera de esa estructura
- cada punto debe ser muy corto y directo`
}

/**
 * Build a personalized user prompt with weather data and profile.
 */
export function buildUserPrompt(weatherData, profile) {
    const necesidades = profile?.necesidades_especiales?.length
        ? profile.necesidades_especiales.join(', ')
        : null

    const perfil = [
        profile?.tipo_vivienda && `Vivienda: ${profile.tipo_vivienda}`,
        necesidades && `Necesidades: ${necesidades}`,
    ].filter(Boolean).join(' | ')

    return `Datos meteorológicos: ${JSON.stringify(weatherData)}
${perfil ? `Perfil: ${perfil}` : ''}
Genera el resumen siguiendo el formato indicado.`
}
