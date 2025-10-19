import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, handleApiError } from '../services/api'
import { progressService, CourseProgress } from '../services/progressService'
import { 
  Play, 
  Clock, 
  User, 
  BookOpen, 
  Loader2, 
  ArrowLeft,
  Brain,
  Target,
  Bookmark,
  CheckCircle,
  Circle,
  TrendingUp
} from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import toast from 'react-hot-toast'

interface Video {
  videoId: string
  title: string
  thumbnail: string
  duration: string
  description: string
}

interface Course {
  id: string
  playlistId: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  videos: Video[]
  tags: string[]
  difficulty: string
  category: string
  metadata: {
    totalVideos: number
    totalDuration: string
  }
}

const PlaylistPage: React.FC = () => {
  const { playlistId } = useParams<{ playlistId: string }>()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (playlistId) {
      fetchCourse()
      fetchProgress()
    }
  }, [playlistId])

  // Auto-select first video when course loads
  useEffect(() => {
    if (course && course.videos.length > 0 && !selectedVideo) {
      setSelectedVideo(course.videos[0])
    }
  }, [course, selectedVideo])

  const fetchCourse = async () => {
    if (!playlistId) return

    setIsLoading(true)
    try {
      const response = await api.get(`/youtube/course/${playlistId}`)
      setCourse(response.data.data.course)
    } catch (error) {
      handleApiError(error)
      navigate('/search')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProgress = async () => {
    if (!playlistId) return

    setIsLoadingProgress(true)
    try {
      const progressData = await progressService.getCourseProgress(playlistId)
      setProgress(progressData)
    } catch (error) {
      console.log('No progress data found for this course')
      setProgress(null)
    } finally {
      setIsLoadingProgress(false)
    }
  }

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video)
  }

  const playVideo = (video: Video) => {
    const videoIndex = course?.videos.findIndex(v => v.videoId === video.videoId) || 0
    navigate(`/video/${video.videoId}`, {
      state: {
        playlistId: course?.playlistId,
        videos: course?.videos || [],
        currentIndex: videoIndex
      }
    })
  }

  const startAssessment = async () => {
    if (!course) return

    try {
      const response = await api.post('/assessments/start', {
        courseId: course.id,
        videoId: selectedVideo?.videoId || course.videos[0]?.videoId,
        numQuestions: 10
      })
      
      const { assessmentId } = response.data.data
      navigate(`/assessment/${assessmentId}`)
    } catch (error) {
      handleApiError(error)
    }
  }

  const savePlaylist = async () => {
    if (!course) return

    try {
      console.log('Saving playlist:', {
        playlistId: course.playlistId,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail
      })
      
      // Save playlist to user's saved playlists
      const response = await api.post('/youtube/save-playlist', {
        playlistId: course.playlistId,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail
      })
      
      console.log('Save playlist response:', response.data)
      toast.success('Playlist saved to your library!')
    } catch (error) {
      console.error('Error saving playlist:', error)
      handleApiError(error)
    }
  }

  const markVideoCompleted = async (video: Video) => {
    if (!course) return

    try {
      await progressService.markVideoCompleted(
        course.playlistId,
        video.videoId,
        video.title
      )
      
      // Refresh progress data
      await fetchProgress()
      toast.success('Video marked as completed!')
    } catch (error) {
      console.error('Error marking video as completed:', error)
      handleApiError(error)
    }
  }

  const isVideoCompleted = (videoId: string): boolean => {
    if (!progress) return false
    return progress.completedVideos.some(v => v.videoId === videoId)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Course not found
          </h3>
          <p className="text-gray-600 mb-4">
            The requested course could not be found.
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/search')}
          className="flex items-center text-gray-600 hover:text-primary-600 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Search
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Course Info */}
          <div className="lg:w-2/3">
            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-6">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {course.title}
                </h1>
                <p className="text-lg text-gray-600 mb-4">
                  by {course.channelTitle}
                </p>
                <p className="text-gray-700 leading-relaxed">
                  {course.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {course.metadata.totalDuration}
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {course.metadata.totalVideos} videos
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 mr-1" />
                  {course.difficulty}
                </div>
              </div>
              
              {/* Progress Indicator */}
              {progress && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-blue-900">Your Progress</h3>
                    <span className="text-sm font-medium text-blue-700">
                      {progress.completionPercentage}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.completionPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm text-blue-700">
                    <span>{progress.completedVideos.length} of {progress.totalVideos} videos completed</span>
                    {progress.averageTestScore > 0 && (
                      <span>Avg Test Score: {progress.averageTestScore}%</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="lg:w-1/3">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Course Actions</h3>
              </div>
              <div className="card-content space-y-4">
                <button
                  onClick={startAssessment}
                  className="btn btn-primary w-full"
                >
                  <Brain className="h-5 w-5 mr-2" />
                  Take Assessment
                </button>
                
                <div className="text-sm text-gray-600">
                  <p className="mb-2">
                    <strong>Assessment includes:</strong>
                  </p>
                  <ul className="space-y-1 text-xs">
                    <li>• AI-generated questions from video content</li>
                    <li>• Cognitive load tracking via webcam</li>
                    <li>• Personalized feedback and recommendations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player */}
      {selectedVideo && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Now Playing: {selectedVideo.title}
          </h2>
          <VideoPlayer
            videoId={selectedVideo.videoId}
            title={selectedVideo.title}
            description={selectedVideo.description}
            autoplay={true}
            className="mb-4"
            onSavePlaylist={savePlaylist}
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={savePlaylist}
                className="btn btn-secondary"
              >
                <Bookmark className="h-5 w-5 mr-2" />
                Save Playlist
              </button>
              <button
                onClick={() => startAssessment()}
                className="btn btn-primary"
              >
                <Brain className="h-5 w-5 mr-2" />
                Take Assessment
              </button>
              <button
                onClick={() => navigate(`/video/${selectedVideo.videoId}`)}
                className="btn btn-outline"
              >
                <Play className="h-5 w-5 mr-2" />
                Open in Full Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video List */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Course Videos ({course.videos.length})
        </h2>
        
        <div className="space-y-4">
          {course.videos.map((video, index) => (
            <div
              key={video.videoId}
              className={`card cursor-pointer transition-colors ${
                selectedVideo?.videoId === video.videoId
                  ? 'ring-2 ring-primary-500 bg-primary-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleVideoSelect(video)}
            >
              <div className="flex">
                <div className="w-48 h-32 bg-gray-200 rounded-l-lg overflow-hidden flex-shrink-0">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded mr-3">
                          {index + 1}
                        </span>
                        <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                          {video.title}
                        </h3>
                        {isVideoCompleted(video.videoId) && (
                          <CheckCircle className="h-5 w-5 text-green-600 ml-2" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {video.description}
                      </p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {video.duration}
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          playVideo(video)
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Play
                      </button>
                      {!isVideoCompleted(video.videoId) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markVideoCompleted(video)
                          }}
                          className="btn btn-outline btn-sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PlaylistPage
