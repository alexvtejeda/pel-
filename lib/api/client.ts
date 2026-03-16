const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// --- Session event ---

export function signalSessionCleared() {
  window.dispatchEvent(new Event('pelu:session-cleared'))
}

// --- Token refresh ---

async function attemptRefresh(): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!res.ok) {
    signalSessionCleared()
    return false
  }

  return true
}

// --- Fetch wrapper ---

export async function apiClient(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401) {
    const refreshed = await attemptRefresh()
    if (refreshed) {
      return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      })
    }
  }

  return res
}
