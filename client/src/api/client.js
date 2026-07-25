import axios from 'axios'

// In dev, leave VITE_API_BASE_URL empty so calls go to "/api" and Vite proxies
// them to the .NET server. In production, set it to your API origin.
const baseURL = (import.meta.env.VITE_API_BASE_URL || '') + '/api'

const api = axios.create({ baseURL })

// Attach the JWT (saved at login) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('df_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 from an authenticated request (one that carried a token), the
// token is missing/invalid/expired server-side. Clear the stale session and
// tell AuthContext so it can drop its in-memory user and redirect to login —
// otherwise the UI still thinks it's logged in and just shows dead requests.
// (Login/register calls also 401 on bad credentials, but those never carry
// an Authorization header, so they're not affected.)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && err?.config?.headers?.Authorization) {
      localStorage.removeItem('df_token')
      localStorage.removeItem('df_user')
      window.dispatchEvent(new Event('auth:session-expired'))
    }
    return Promise.reject(err)
  }
)

export default api

// Absolute origin of the API, used to load uploaded images (which the API
// serves from /uploads). In dev this falls back to the local API port.
export const API_ORIGIN = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5080'

// Turn a stored relative path (e.g. "/uploads/x.jpg") into a full URL.
export const imageUrl = (path) =>
  !path ? '' : (path.startsWith('http') ? path : API_ORIGIN + path)
