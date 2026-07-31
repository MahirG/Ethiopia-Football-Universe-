const ACCESS_TOKEN_KEY = 'efu-supabase-access-token'
const REFRESH_TOKEN_KEY = 'efu-supabase-refresh-token'

interface AuthConfig {
  url: string
  publishableKey: string
}

function config(): AuthConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined
  return url && publishableKey ? { url: url.replace(/\/$/, ''), publishableKey } : null
}

export function cloudAuthConfigured(): boolean {
  return config() !== null
}

export function captureAuthSessionFromUrl(): boolean {
  if (!location.hash.includes('access_token=')) return false
  const values = new URLSearchParams(location.hash.slice(1))
  const accessToken = values.get('access_token')
  const refreshToken = values.get('refresh_token')
  if (!accessToken) return false
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  history.replaceState(null, document.title, `${location.pathname}${location.search}`)
  return true
}

export function hasCloudSession(): boolean {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
}

export async function requestMagicLink(email: string): Promise<void> {
  const current = config()
  if (!current) throw new Error('cloud-auth-not-configured')
  const normalized = email.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('invalid-email')
  const response = await fetch(`${current.url}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      apikey: current.publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: normalized,
      create_user: true,
      options: { email_redirect_to: `${location.origin}${location.pathname}` },
    }),
  })
  if (!response.ok) throw new Error(`magic-link-${response.status}`)
}

export async function signOutCloudSession(): Promise<void> {
  const current = config()
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (current && accessToken) {
    await fetch(`${current.url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: current.publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
    }).catch(() => undefined)
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
