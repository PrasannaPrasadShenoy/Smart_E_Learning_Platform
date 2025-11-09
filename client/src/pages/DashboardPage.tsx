import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api, handleApiError } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Target, 
  Clock,
  BookOpen,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface Assessment {
  id: string
  course: {
    title: string
    thumbnail: string
  }
  videoId?: string
  videoTitle?: string
  testName?: string
  testScore: number
  cli: number
  cliClassification: string
  confidence: number
  createdAt: string
}

interface Insights {
  totalAssessments: number
  insights: Array<{
    type: string
    value: number
    message: string
  }>
  trends: {
    trend: string
    averageCLI: number
    improvement: number
    recommendations: string[]
  }
}

const DashboardPage: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user, isLoading: authLoading, token } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Fetch data when component mounts or when navigating to dashboard
  useEffect(() => {
    // Only fetch if we're on the dashboard page
    if (location.pathname !== '/dashboard') {
      setIsLoading(false)
      return
    }

    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // Redirect to login if not authenticated
    if (!user) {
      navigate('/login', { replace: true })
      setIsLoading(false)
      return
    }

    // Get user ID - try both _id and id
    const userId = user.id || (user as any)._id
    if (!userId) {
      console.warn('User ID not available:', user)
      setIsLoading(false)
      return
    }

    // Ensure token is set in API client
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    // Fetch dashboard data
    const fetchDashboardData = async () => {
      setIsLoading(true)
      try {
        console.log('Fetching dashboard data for user:', userId)
        // Fetch user assessments
        const assessmentsResponse = await api.get(`/assessments/user/${userId}`)
        const fetchedAssessments = assessmentsResponse.data.data.assessments || []
        console.log('Fetched assessments:', fetchedAssessments.length)
        setAssessments(fetchedAssessments)

        // Fetch insights
        const insightsResponse = await api.get(`/assessments/analytics/${userId}`)
        console.log('Fetched insights:', insightsResponse.data.data)
        setInsights(insightsResponse.data.data || null)
      } catch (error) {
        console.error('Dashboard data fetch error:', error)
        // Set empty arrays on error
        setAssessments([])
        setInsights(null)
        handleApiError(error)
      } finally {
        setIsLoading(false)
      }
    }

    // Always fetch when user is available and auth is done
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.pathname, authLoading, token])

  const getScoreColor = (score: number) => {
    const safeScore = score || 0
    if (safeScore >= 80) return 'text-green-600'
    if (safeScore >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCLIColor = (cli: number) => {
    const safeCli = cli || 0
    if (safeCli <= 35) return 'text-green-600'
    if (safeCli <= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCLIClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Low Load':
        return 'bg-green-100 text-green-800'
      case 'Moderate Load':
        return 'bg-yellow-100 text-yellow-800'
      case 'High Load':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Chart data
  const scoreData = {
    labels: assessments.slice(-7).map((_, index) => `Test ${index + 1}`),
    datasets: [
      {
        label: 'Test Score',
        data: assessments.slice(-7).map(a => {
          const score = a.testScore
          return (score !== undefined && !isNaN(score)) ? score : 0
        }),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'CLI',
        data: assessments.slice(-7).map(a => {
          const cli = a.cli
          return (cli !== undefined && !isNaN(cli)) ? cli : 0
        }),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  }

  const cliDistributionData = {
    labels: ['Low Load', 'Moderate Load', 'High Load'],
    datasets: [
      {
        data: [
          assessments.filter(a => a.cliClassification === 'Low Load').length,
          assessments.filter(a => a.cliClassification === 'Moderate Load').length,
          assessments.filter(a => a.cliClassification === 'High Load').length,
        ],
        backgroundColor: [
          'rgb(34, 197, 94)',
          'rgb(234, 179, 8)',
          'rgb(239, 68, 68)',
        ],
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  }

  // Show loading while auth is being checked or data is being fetched
  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    )
  }

  // If no user after loading, don't render (redirect will happen)
  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Track your learning progress and cognitive performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assessments.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assessments.length > 0 
                    ? Math.round(assessments.reduce((sum, a) => sum + (a.testScore || 0), 0) / assessments.length) || 0
                    : 0
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Brain className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average CLI</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assessments.length > 0 
                    ? Math.round(assessments.reduce((sum, a) => sum + (a.cli || 0), 0) / assessments.length) || 0
                    : 0
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Improvement</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insights?.trends?.improvement !== undefined && !isNaN(insights.trends.improvement) ? 
                    `${insights.trends.improvement > 0 ? '+' : ''}${Math.round(insights.trends.improvement)}`
                    : '0'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Performance Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Performance Trends</h3>
            <p className="card-description">
              Your test scores and cognitive load over time
            </p>
          </div>
          <div className="card-content">
            {assessments.length > 0 ? (
              <Line data={scoreData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No assessment data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CLI Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Cognitive Load Distribution</h3>
            <p className="card-description">
              Distribution of your cognitive load levels
            </p>
          </div>
          <div className="card-content">
            {assessments.length > 0 ? (
              <Doughnut data={cliDistributionData} options={{ responsive: true }} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No cognitive data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="card mb-8">
        <div className="card-header">
          <h3 className="card-title">Recent Assessments</h3>
          <p className="card-description">
            Your latest learning assessments and results
          </p>
        </div>
        <div className="card-content">
          {assessments.length > 0 ? (
            <div className="space-y-4">
              {assessments.slice(0, 5).map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={assessment.course.thumbnail}
                    alt={assessment.course.title}
                    className="w-16 h-12 object-cover rounded-lg mr-4"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 line-clamp-1">
                      {assessment.testName || assessment.course.title}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {assessment.videoTitle || assessment.course.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Score</p>
                      <p className={`font-bold ${getScoreColor(assessment.testScore || 0)}`}>
                        {assessment.testScore !== undefined && !isNaN(assessment.testScore) ? assessment.testScore : 0}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">CLI</p>
                      <p className={`font-bold ${getCLIColor(assessment.cli || 0)}`}>
                        {assessment.cli !== undefined && !isNaN(assessment.cli) ? Math.round(assessment.cli) : 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Load</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCLIClassificationColor(assessment.cliClassification)}`}>
                        {assessment.cliClassification}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No assessments yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start your learning journey by taking an assessment
              </p>
              <button
                onClick={() => navigate('/search')}
                className="btn btn-primary"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Find Courses
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Insights */}
      {insights && insights.insights && insights.insights.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Learning Insights</h3>
            <p className="card-description">
              AI-generated insights about your learning patterns
            </p>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.insights.map((insight, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{insight.message}</p>
                </div>
              ))}
            </div>
            
            {insights?.trends?.recommendations && insights.trends.recommendations.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {insights.trends.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-primary-600 mr-2">•</span>
                      <span className="text-sm text-gray-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Learning Insights</h3>
            <p className="card-description">
              Complete some assessments to see your learning insights
            </p>
          </div>
          <div className="card-content">
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No insights available yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Take some assessments to generate personalized insights
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
