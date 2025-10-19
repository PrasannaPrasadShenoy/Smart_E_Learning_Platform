import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { api, handleApiError } from '../services/api'
import { progressService } from '../services/progressService'
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Settings,
  Brain,
  Loader2,
  Maximize2,
  SkipForward,
  SkipBack,
  List,
  Clock,
  User
} from 'lucide-react'
import toast from 'react-hot-toast'

// Declare YouTube API
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

interface VideoDetails {
  id: string
  title: string
  thumbnail: string
  duration: string
  description: string
  channelTitle?: string
  publishedAt?: string
}

interface PlaylistVideo {
  videoId: string
  title: string
  thumbnail: string
  duration: string
  description: string
}

const VideoPlayerPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>()
  const location = useLocation()
  const [video, setVideo] = useState<VideoDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [quality, setQuality] = useState('auto')
  const [showSettings, setShowSettings] = useState(false)
  
  // Playlist context
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideo[]>([])
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [autoPlayNext, setAutoPlayNext] = useState(true)
  const [showPlaylist, setShowPlaylist] = useState(false)
  
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (videoId) {
      fetchVideoDetails()
      
      // Check URL parameters for playlist context
      const urlParams = new URLSearchParams(window.location.search)
      const playlistParam = urlParams.get('playlist')
      const indexParam = urlParams.get('index')
      
      if (playlistParam && indexParam) {
        // Load playlist context from URL parameters
        loadPlaylistFromUrl(playlistParam, parseInt(indexParam))
      } else {
        // Check if we have playlist context from navigation
        const state = location.state as { playlistId?: string; videos?: PlaylistVideo[]; currentIndex?: number }
        if (state?.playlistId && state?.videos) {
          setPlaylistId(state.playlistId)
          setPlaylistVideos(state.videos)
          setCurrentVideoIndex(state.currentIndex || 0)
        } else {
          // Try to fetch playlist context if video is part of a course
          fetchPlaylistContext()
        }
      }
    }
  }, [videoId, location.state])

  const loadPlaylistFromUrl = async (playlistId: string, index: number) => {
    try {
      console.log('Loading playlist from URL:', playlistId, 'index:', index)
      // Fetch the full playlist data
      const response = await api.get(`/youtube/course/${playlistId}`)
      const course = response.data.data.course
      
      setPlaylistId(playlistId)
      setPlaylistVideos(course.videos)
      setCurrentVideoIndex(index)
      console.log('Playlist loaded from URL:', course.videos.length, 'videos')
    } catch (error) {
      console.error('Error loading playlist from URL:', error)
    }
  }

  const fetchPlaylistContext = async () => {
    if (!videoId) return
    
    try {
      console.log('Fetching playlist context for video:', videoId)
      // Try to find which course/playlist this video belongs to
      const response = await api.get(`/youtube/video/${videoId}/context`)
      console.log('Playlist context response:', response.data)
      if (response.data.data.playlist) {
        setPlaylistId(response.data.data.playlist.id)
        setPlaylistVideos(response.data.data.playlist.videos)
        setCurrentVideoIndex(response.data.data.currentIndex || 0)
        console.log('Playlist context loaded:', response.data.data.playlist.videos.length, 'videos')
      }
    } catch (error) {
      // If no playlist context found, that's okay - video will play standalone
      console.log('No playlist context found for this video:', error.message)
    }
  }

  const fetchVideoDetails = async () => {
    if (!videoId) return

    setIsLoading(true)
    try {
      console.log('Fetching video details for:', videoId)
      const response = await api.get(`/youtube/video/${videoId}`)
      console.log('Video details response:', response.data)
      setVideo(response.data.data.video)
    } catch (error) {
      console.error('Error fetching video details:', error)
      handleApiError(error)
      // Don't navigate away immediately, show error first
      toast.error('Failed to load video details')
    } finally {
      setIsLoading(false)
    }
  }

  const startAssessment = async () => {
    if (!videoId) return

    try {
      const response = await api.post('/assessments/start', {
        courseId: 'temp', // This would be passed from the playlist
        videoId: videoId,
        numQuestions: 10
      })
      
      const { assessmentId } = response.data.data
      navigate(`/assessment/${assessmentId}`)
    } catch (error) {
      handleApiError(error)
    }
  }

  // External control handlers
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    // Open in YouTube for actual control
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
    toast.success(isPlaying ? 'Video paused' : 'Video playing')
  }

  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
    // Open in YouTube for actual control
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
    toast.success(isMuted ? 'Video unmuted' : 'Video muted')
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    toast.success(`Playback speed set to ${speed}x`)
    // Open in YouTube for actual control
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
  }

  const handleQualityChange = (newQuality: string) => {
    setQuality(newQuality)
    toast.success(`Quality set to ${newQuality}`)
    // Open in YouTube for actual control
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
  }

  const openInYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
    toast.success('Opening in YouTube for full controls')
  }

  // YouTube Player API and event handlers
  useEffect(() => {
    let player: any = null
    let checkInterval: NodeJS.Timeout | null = null

    const initializeYouTubePlayer = () => {
      // Clean up existing player
      if (player) {
        player.destroy()
        player = null
      }

      if (window.YT && window.YT.Player) {
        const playerElement = document.getElementById(`youtube-player-${videoId}`)
        if (playerElement) {
          console.log('Initializing YouTube player for video:', videoId)
          player = new window.YT.Player(playerElement, {
            videoId: videoId,
            playerVars: {
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              enablejsapi: 1
            },
            events: {
              onReady: (event: any) => {
                console.log('YouTube player ready for video:', videoId)
              },
              onStateChange: (event: any) => {
                console.log('YouTube player state changed:', event.data, 'for video:', videoId)
                switch (event.data) {
                  case window.YT.PlayerState.ENDED:
                    console.log('Video ended, checking for next video')
                    handleVideoEnded()
                    break
                  case window.YT.PlayerState.PAUSED:
                    setIsPlaying(false)
                    break
                  case window.YT.PlayerState.PLAYING:
                    setIsPlaying(true)
                    break
                }
              }
            }
          })
        }
      } else {
        // Fallback: Check for video end using timer
        console.log('YouTube API not available, using fallback timer')
        checkInterval = setInterval(() => {
          if (iframeRef.current) {
            // This is a simple fallback - in a real implementation,
            // you'd need to track video progress more accurately
            console.log('Checking video status...')
          }
        }, 5000) // Check every 5 seconds
      }
    }

    // Load YouTube API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      
      window.onYouTubeIframeAPIReady = initializeYouTubePlayer
    } else {
      // Small delay to ensure DOM is ready
      setTimeout(initializeYouTubePlayer, 100)
    }

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      if (player) {
        console.log('Destroying YouTube player for video:', videoId)
        player.destroy()
      }
    }
  }, [videoId])

  const markVideoCompleted = async () => {
    if (!video || !playlistId) return

    try {
      await progressService.markVideoCompleted(
        playlistId,
        video.id,
        video.title
      )
      console.log('Video marked as completed:', video.title)
    } catch (error) {
      console.error('Error marking video as completed:', error)
    }
  }

  const handleVideoEnded = async () => {
    // Mark current video as completed
    await markVideoCompleted()
    
    if (autoPlayNext && playlistVideos.length > 0) {
      const nextIndex = currentVideoIndex + 1
      if (nextIndex < playlistVideos.length) {
        const nextVideo = playlistVideos[nextIndex]
        navigate(`/video/${nextVideo.videoId}`, {
          state: {
            playlistId,
            videos: playlistVideos,
            currentIndex: nextIndex
          }
        })
        toast.success(`Playing next: ${nextVideo.title}`)
      } else {
        toast.success('You\'ve reached the end of the playlist!')
      }
    }
  }

  const navigateToVideo = (index: number) => {
    if (index >= 0 && index < playlistVideos.length) {
      const targetVideo = playlistVideos[index]
      setCurrentVideoIndex(index)
      
      // Force page refresh to ensure video loads properly
      window.location.href = `/video/${targetVideo.videoId}?playlist=${playlistId}&index=${index}`
    }
  }

  const goToNextVideo = () => {
    if (currentVideoIndex < playlistVideos.length - 1) {
      navigateToVideo(currentVideoIndex + 1)
    }
  }

  const goToPreviousVideo = () => {
    if (currentVideoIndex > 0) {
      navigateToVideo(currentVideoIndex - 1)
    }
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

  if (!video) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Video not found
          </h3>
          <p className="text-gray-600 mb-4">
            The requested video could not be found.
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
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-primary-600 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Player */}
        <div className="lg:col-span-2">
          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6 relative video-container">
            <div
              ref={iframeRef}
              id={`youtube-player-${videoId}`}
              className="w-full h-full"
            />
          </div>

          {/* Video Info */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {video.title}
            </h1>
            
            {/* Video Metadata */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{video.duration}</span>
              </div>
              {video.channelTitle && (
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  <span>{video.channelTitle}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlayPause}
                  className="btn btn-primary"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 mr-2" />
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                
                <button
                  onClick={handleMuteToggle}
                  className="btn btn-outline"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5 mr-2" />
                  ) : (
                    <Volume2 className="h-5 w-5 mr-2" />
                  )}
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>

                {/* Playlist Navigation Controls */}
                {playlistVideos.length > 0 ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={goToPreviousVideo}
                      disabled={currentVideoIndex === 0}
                      className="btn btn-outline btn-sm disabled:opacity-50"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                    
                    <span className="text-sm text-gray-600">
                      {currentVideoIndex + 1} / {playlistVideos.length}
                    </span>
                    
                    <button
                      onClick={goToNextVideo}
                      disabled={currentVideoIndex === playlistVideos.length - 1}
                      className="btn btn-outline btn-sm disabled:opacity-50"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                    
                    {/* Manual Next Video Button */}
                    {currentVideoIndex < playlistVideos.length - 1 && (
                      <button
                        onClick={goToNextVideo}
                        className="btn btn-primary btn-sm"
                      >
                        <SkipForward className="h-4 w-4 mr-1" />
                        Next Video
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate('/search')}
                      className="btn btn-outline btn-sm"
                    >
                      <List className="h-4 w-4 mr-1" />
                      Find Playlist
                    </button>
                    <span className="text-sm text-gray-500">
                      No playlist context
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {playlistVideos.length > 0 && (
                  <button
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className="btn btn-outline"
                  >
                    <List className="h-5 w-5 mr-2" />
                    Playlist
                  </button>
                )}
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="btn btn-outline"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </button>
                
                <button
                  onClick={openInYouTube}
                  className="btn btn-primary"
                >
                  <Maximize2 className="h-5 w-5 mr-2" />
                  Open in YouTube
                </button>
              </div>
            </div>

            {/* Video Description */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed text-sm">
                {video.description}
              </p>
              {video.publishedAt && (
                <div className="mt-2 text-xs text-gray-500">
                  Published: {new Date(video.publishedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Playlist Panel */}
          {showPlaylist && playlistVideos.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Playlist ({playlistVideos.length} videos)</h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {playlistVideos.map((playlistVideo, index) => (
                  <div
                    key={playlistVideo.videoId}
                    className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                      index === currentVideoIndex
                        ? 'bg-primary-100 border border-primary-300'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => navigateToVideo(index)}
                  >
                    <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0 mr-3">
                      <img
                        src={playlistVideo.thumbnail}
                        alt={playlistVideo.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                        {playlistVideo.title}
                      </h4>
                      <p className="text-xs text-gray-500">{playlistVideo.duration}</p>
                    </div>
                    {index === currentVideoIndex && (
                      <div className="text-primary-600 text-sm font-medium">Now Playing</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Video Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">Playback Speed</label>
                  <select 
                    className="input w-full"
                    value={playbackSpeed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-2">Quality</label>
                  <select 
                    className="input w-full"
                    value={quality}
                    onChange={(e) => handleQualityChange(e.target.value)}
                  >
                    <option value="auto">Auto</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                    <option value="360p">360p</option>
                  </select>
                </div>
              </div>

              {/* Auto-play Settings */}
              {playlistVideos.length > 0 && (
                <div className="mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={autoPlayNext}
                      onChange={(e) => setAutoPlayNext(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Auto-play next video when current video ends</span>
                  </label>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> For full control over playback speed and quality, 
                  click "Open in YouTube" to use YouTube's native controls.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Video Info Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Video Information</h3>
              </div>
              <div className="card-content">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Duration</span>
                    <span className="text-sm font-medium">{video.duration}</span>
                  </div>
                  
                  {video.channelTitle && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Channel</span>
                      <span className="text-sm font-medium">{video.channelTitle}</span>
                    </div>
                  )}
                  
                  {video.publishedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Published</span>
                      <span className="text-sm font-medium">
                        {new Date(video.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Assessment Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Ready to Test Your Knowledge?</h3>
              </div>
              <div className="card-content">
                <p className="text-sm text-gray-600 mb-4">
                  Take an AI-generated assessment based on this video's content.
                </p>
                <button
                  onClick={startAssessment}
                  className="btn btn-primary w-full"
                >
                  <Brain className="h-5 w-5 mr-2" />
                  Start Assessment
                </button>
              </div>
            </div>

            {/* Video Controls */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Video Controls</h3>
              </div>
              <div className="card-content space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Duration</span>
                  <span className="text-sm font-medium">{video.duration}</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Playback Speed</label>
                  <select 
                    className="input w-full"
                    value={playbackSpeed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Quality</label>
                  <select 
                    className="input w-full"
                    value={quality}
                    onChange={(e) => handleQualityChange(e.target.value)}
                  >
                    <option value="auto">Auto</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                    <option value="360p">360p</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Learning Tips */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-lg">Learning Tips</h3>
              </div>
              <div className="card-content">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    Take notes while watching
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    Pause to reflect on key concepts
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    Use the assessment to test understanding
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    Review difficult sections multiple times
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayerPage
