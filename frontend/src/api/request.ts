export function apiUrl(path: string, params?: URLSearchParams) {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  return base + '/api/v1' + path + (params ? '?' + params : '')
}

export async function request(path: string, signal: AbortSignal, params?: URLSearchParams, options?: RequestInit) {
  let response
  try {
    response = await fetch(apiUrl(path, params), { ...options, signal })
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('No se pudo conectar con AgroNexa. Verifica la conexión e inténtalo de nuevo.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'La consulta no pudo completarse.')
  }
  return response
}
