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

// On 401, clear the stale session so the UI redirects to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('df_token')
      localStorage.removeItem('df_user')
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
