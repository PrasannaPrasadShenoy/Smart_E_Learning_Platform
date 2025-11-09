import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api, handleApiError } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { 
  BookOpen, 
  Target,
  Loader2,
  TrendingUp,
  Clock
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import TestDetailsModal from '../components/TestDetailsModal'

interface Assessment {
  id: string
  course: {
    title: string
    thumbnail: string
  }
  courseId?: string
  courseTitle?: string
  videoId: string
  videoTitle: string
  testName: string
  testScore: number
  cli: number
  cliClassification: string
  confidence: number
  timeSpent: number
  createdAt: string
}

interface CourseWithTests {
  courseId: string
  courseTitle: string
  courseThumbnail: string
  assessments: Assessment[]
  averageScore: number
  totalTests: number
  lastTestDate: string
}

const TestScoresPage: React.FC = () => {
  const [courses, setCourses] = useState<CourseWithTests[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<CourseWithTests | null>(null)
  const { user, isLoading: authLoading, token } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  useEffect(() => {
    // Only fetch if we're on the test-scores page
    if (location.pathname !== '/test-scores') {
      setIsLoading(false)
      return
    }

    if (authLoading) {
      return
    }

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

    fetchCoursesWithTests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.pathname, authLoading, token])

  const fetchCoursesWithTests = async () => {
    const userId = user?.id || (user as any)?._id
    if (!userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      console.log('Fetching test scores for user:', userId)
      // Fetch all assessments
      const response = await api.get(`/assessments/user/${userId}?status=completed&limit=1000`)
      const assessments: Assessment[] = response.data.data.assessments || []

      // Group assessments by course
      const courseMap = new Map<string, CourseWithTests>()

      assessments.forEach((assessment) => {
        // Use courseTitle from assessment if available, otherwise extract from course object
        let courseId: string
        let courseTitle: string
        let courseThumbnail: string

        // Prefer courseTitle from assessment schema
        if (assessment.courseTitle) {
          courseTitle = assessment.courseTitle
        }

        // Get courseId and thumbnail
        if (assessment.courseId) {
          courseId = assessment.courseId
        } else if (typeof assessment.course === 'string') {
          courseId = assessment.course
        } else if (assessment.course && typeof assessment.course === 'object') {
          courseId = (assessment.course as any)?._id || (assessment.course as any)?.id || 'unknown'
          if (!courseTitle) {
            courseTitle = assessment.course.title || 'Unknown Course'
          }
          courseThumbnail = assessment.course.thumbnail || ''
        } else {
          courseId = 'unknown'
        }

        // Fallback course title if not set
        if (!courseTitle) {
          if (typeof assessment.course === 'object' && assessment.course) {
            courseTitle = assessment.course.title || 'Unknown Course'
          } else {
            courseTitle = 'Unknown Course'
          }
        }

        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            courseId: courseId,
            courseTitle: courseTitle,
            courseThumbnail: courseThumbnail,
            assessments: [],
            averageScore: 0,
            totalTests: 0,
            lastTestDate: ''
          })
        }

        const course = courseMap.get(courseId)!
        course.assessments.push(assessment)
      })

      // Calculate stats for each course and sort assessments by date
      const coursesArray = Array.from(courseMap.values()).map(course => {
        // Sort assessments by creation date (newest first)
        course.assessments.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        // Calculate average score
        const scores = course.assessments
          .map(a => a.testScore)
          .filter(score => score !== undefined && !isNaN(score))
        
        course.averageScore = scores.length > 0
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : 0

        course.totalTests = course.assessments.length

        // Get last test date
        if (course.assessments.length > 0) {
          course.lastTestDate = course.assessments[0].createdAt
        }

        return course
      })

      // Sort courses by last test date (most recent first)
      coursesArray.sort((a, b) => 
        new Date(b.lastTestDate).getTime() - new Date(a.lastTestDate).getTime()
      )

      setCourses(coursesArray || [])
    } catch (error) {
      console.error('Error fetching courses with tests:', error)
      setCourses([])
      handleApiError(error)
      toast.error('Failed to load test scores')
    } finally {
      setIsLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getCLIColor = (cli: number) => {
    if (cli <= 35) return 'text-green-600'
    if (cli <= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Scores</h1>
        <p className="text-gray-600">
          View all your test attempts and performance metrics by course
        </p>
      </div>

      {/* Courses List */}
      {courses.length > 0 ? (
        <div className="space-y-6">
          {courses.map((course) => (
            <div
              key={course.courseId}
              onClick={() => setSelectedCourse(course)}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="card-content">
                <div className="flex items-start gap-6">
                  {/* Course Thumbnail */}
                  {course.courseThumbnail ? (
                    <img
                      src={course.courseThumbnail}
                      alt={course.courseTitle}
                      className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-32 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-white" />
                    </div>
                  )}

                  {/* Course Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1 line-clamp-2">
                          {course.courseTitle}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {course.totalTests} Test{course.totalTests !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            Avg: {course.averageScore}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(course.lastTestDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Overall Score Badge */}
                      {course.averageScore > 0 && (
                        <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getScoreColor(course.averageScore)}`}>
                          {course.averageScore}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-content">
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No test scores yet
              </h3>
              <p className="text-gray-600 mb-6">
                Complete assessments to see your test scores here
              </p>
              <button
                onClick={() => navigate('/search')}
                className="btn btn-primary"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Browse Courses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Videos Modal */}
      {selectedCourse && (
        <TestDetailsModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  )
}

export default TestScoresPage

