import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, assessmentApi, handleApiError } from '../services/api'
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Brain,
  Eye,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Question {
  id: string
  question: string
  options: string[]
  difficulty: string
  topic: string
  timeStamp: number
}

interface AssessmentData {
  assessmentId: string
  questions: Question[]
  totalQuestions: number
  timeLimit: number
  videoId?: string
}

interface Metrics {
  timestamp: number
  avgOnScreen: number
  blinkRatePerMin: number
  headMovement: number
  eyeGazeStability: number
}

const AssessmentPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const [assessment, setAssessment] = useState<AssessmentData | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [metrics, setMetrics] = useState<Metrics[]>([])
  const [confidence, setConfidence] = useState(3)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const metricsIntervalRef = useRef<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (assessmentId) {
      fetchAssessment()
    }
  }, [assessmentId])

  useEffect(() => {
    if (assessment && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (assessment && timeLeft === 0) {
      handleSubmitAssessment()
    }
  }, [timeLeft, assessment])

  const fetchAssessment = async () => {
    if (!assessmentId) return

    setIsLoading(true)
    try {
      console.log('🔍 Fetching assessment:', assessmentId)
      
      // Get the assessment data (questions and basic info)
      const response = await api.get(`/assessments/${assessmentId}`)
      console.log('📊 Assessment response:', response.data)
      
      const { questions, totalQuestions, timeLimit } = response.data.data
      
      console.log('❓ Questions received:', questions?.length || 0)
      console.log('📝 Questions data:', questions)
      
      if (!questions || questions.length === 0) {
        console.error('❌ No questions available for assessment')
        throw new Error('No questions available for this assessment')
      }
      
      setAssessment({
        assessmentId,
        questions,
        totalQuestions,
        timeLimit
      })
      setTimeLeft(timeLimit)
      
      console.log('✅ Assessment loaded successfully')
    } catch (error) {
      console.error('❌ Error fetching assessment:', error)
      handleApiError(error)
      navigate('/search')
    } finally {
      setIsLoading(false)
    }
  }

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsWebcamActive(true)
        
        // Start metrics collection
        startMetricsCollection()
      }
    } catch (error) {
      console.error('Error accessing webcam:', error)
      toast.error('Unable to access webcam. Assessment will continue without cognitive tracking.')
    }
  }, [])

  const startMetricsCollection = useCallback(() => {
    metricsIntervalRef.current = setInterval(() => {
      collectMetrics()
    }, 2000) // Collect metrics every 2 seconds
  }, [])

  const collectMetrics = useCallback(() => {
    // Simulate metrics collection (in real implementation, use MediaPipe)
    const newMetric: Metrics = {
      timestamp: Date.now(),
      avgOnScreen: Math.random() * 20 + 80, // 80-100%
      blinkRatePerMin: Math.random() * 10 + 15, // 15-25 blinks/min
      headMovement: Math.random() * 30, // 0-30%
      eyeGazeStability: Math.random() * 20 + 80 // 80-100%
    }
    
    setMetrics(prev => [...prev, newMetric])
    
    // Send metrics to server
    sendMetricsToServer(newMetric)
  }, [])

  const sendMetricsToServer = useCallback(async (metric: Metrics) => {
    try {
      await assessmentApi.post(`/assessments/${assessmentId}/metrics`, {
        metrics: [metric]
      })
    } catch (error) {
      console.error('Error sending metrics:', error)
    }
  }, [assessmentId])

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleNextQuestion = () => {
    if (currentQuestion < assessment!.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmitAssessment = async () => {
    if (!assessment) return

    setIsSubmitting(true)
    
    // Show submission progress
    toast.loading('Submitting assessment...', {
      id: 'submission-progress',
      duration: 0
    })
    
    // Stop metrics collection
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current)
    }

    try {
      const response = await assessmentApi.post(`/assessments/${assessmentId}/complete`, {
        answers: Object.entries(answers).map(([questionId, selectedAnswer]) => ({
          questionId,
          selectedAnswer,
          timeSpent: 30, // Default time per question
          confidence: confidence
        })),
        confidence: confidence,
        timeSpent: assessment!.timeLimit - timeLeft
      })

      const { assessment: _result } = response.data.data
      
      // Dismiss loading toast and show success
      toast.dismiss('submission-progress')
      toast.success('Assessment submitted successfully!', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          padding: '16px 24px',
          borderRadius: '8px'
        }
      })
      
      // Redirect back to video page with assessment results
      const videoId = assessment?.videoId || 'unknown'
      navigate(`/video/${videoId}?assessment=${assessmentId}&completed=true`)
    } catch (error: any) {
      console.error('Assessment submission error:', error)
      
      // Dismiss loading toast
      toast.dismiss('submission-progress')
      
      if (error.code === 'ECONNABORTED') {
        toast.error('Assessment submission timed out. Please try again.', {
          duration: 8000,
          style: {
            background: '#EF4444',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '16px 24px',
            borderRadius: '8px',
            maxWidth: '500px'
          }
        })
      } else {
        handleApiError(error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Assessment not found
          </h3>
          <p className="text-gray-600 mb-4">
            The requested assessment could not be found.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="btn btn-primary"
          >
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  // Add safety checks for questions array
  if (!assessment.questions || assessment.questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Questions Available
          </h3>
          <p className="text-gray-600 mb-4">
            This assessment doesn't have any questions yet.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="btn btn-primary"
          >
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  const currentQ = assessment.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / assessment.totalQuestions) * 100

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/search')}
          className="flex items-center text-gray-600 hover:text-primary-600 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Search
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assessment</h1>
            <p className="text-gray-600">
              Question {currentQuestion + 1} of {assessment.totalQuestions}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              {formatTime(timeLeft)}
            </div>
            
            {!isWebcamActive && (
              <button
                onClick={startWebcam}
                className="btn btn-outline btn-sm"
              >
                <Eye className="h-4 w-4 mr-1" />
                Enable Tracking
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Question */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded">
                    {currentQ.difficulty}
                  </span>
                  <span className="text-sm text-gray-500">
                    {currentQ.topic}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {Math.floor(currentQ.timeStamp / 60)}:{(currentQ.timeStamp % 60).toString().padStart(2, '0')}
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {currentQ.question}
              </h2>

              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      answers[currentQ.id] === option
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={option}
                      checked={answers[currentQ.id] === option}
                      onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        answers[currentQ.id] === option
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQ.id] === option && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                        )}
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
              className="btn btn-outline"
            >
              Previous
            </button>

            <div className="flex items-center space-x-4">
              {currentQuestion === assessment.questions.length - 1 ? (
                <button
                  onClick={handleSubmitAssessment}
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  )}
                  Submit Assessment
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="btn btn-primary"
                >
                  Next Question
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Confidence Level */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Confidence Level</h3>
              </div>
              <div className="card-content">
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">
                    How confident are you in your answer? (1-5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={confidence}
                    onChange={(e) => setConfidence(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Not confident</span>
                    <span>Very confident</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-medium text-primary-600">
                      {confidence}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Webcam Status */}
            {isWebcamActive && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title text-lg">Cognitive Tracking</h3>
                </div>
                <div className="card-content">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Focus Level:</span>
                      <span className="text-green-600 font-medium">
                        {metrics.length > 0 ? Math.round(metrics[metrics.length - 1].avgOnScreen) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Blink Rate:</span>
                      <span className="text-blue-600 font-medium">
                        {metrics.length > 0 ? Math.round(metrics[metrics.length - 1].blinkRatePerMin) : 0}/min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data Points:</span>
                      <span className="text-gray-900 font-medium">
                        {metrics.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Instructions</h3>
              </div>
              <div className="card-content">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    Read each question carefully
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    Select the best answer
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    Rate your confidence level
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    Stay focused on the screen
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden video element for webcam */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="hidden"
      />
    </div>
  )
}

export default AssessmentPage
