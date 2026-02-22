import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || "https://one-2-1.onrender.com"

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

export function setAuthToken(token: string | null){
  if(token){
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export default api
