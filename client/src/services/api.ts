import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
export const api = axios.create({
  baseURL:  'http://localhost:4001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth-storage')
    if (token) {
      try {
        const authData = JSON.parse(token)
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth token:', error)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('auth-storage')
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (error.response?.status === 403) {
      // Only show access denied if it's not a login attempt
      if (!error.config?.url?.includes('/auth/login')) {
        toast.error('Access denied')
      }
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please try again later.')
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.')
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    profile: '/auth/profile',
    logout: '/auth/logout',
  },
  
  // YouTube
  youtube: {
    search: '/youtube/search',
    playlist: (id: string) => `/youtube/playlist/${id}`,
    course: (id: string) => `/youtube/course/${id}`,
    video: (id: string) => `/youtube/video/${id}`,
    transcript: (id: string) => `/youtube/video/${id}/transcript`,
    searchCourses: '/youtube/search-courses',
  },
  
  // Assessments
  assessments: {
    start: '/assessments/start',
    metrics: (id: string) => `/assessments/${id}/metrics`,
    complete: (id: string) => `/assessments/${id}/complete`,
    results: (id: string) => `/assessments/${id}/results`,
    user: (userId: string) => `/assessments/user/${userId}`,
    analytics: (userId: string) => `/assessments/analytics/${userId}`,
  },
  
  // Feedback
  feedback: {
    get: (assessmentId: string) => `/feedback/assessment/${assessmentId}`,
    userHistory: (userId: string) => `/feedback/user/${userId}/history`,
    interaction: (feedbackId: string) => `/feedback/${feedbackId}/interaction`,
    recommendations: (userId: string) => `/feedback/user/${userId}/recommendations`,
    insights: (userId: string) => `/feedback/user/${userId}/insights`,
    suggestedTopics: (userId: string) => `/feedback/user/${userId}/suggested-topics`,
  },
}

// Helper functions
export const handleApiError = (error: any) => {
  const message = error.response?.data?.message || error.message || 'An error occurred'
  toast.error(message)
  return message
}

export const isApiError = (error: any): error is { response: { data: { message: string } } } => {
  return error?.response?.data?.message
}
