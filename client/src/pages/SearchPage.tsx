import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, handleApiError } from '../services/api'
import { Search, Play, Clock, User, BookOpen, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Playlist {
  playlistId: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  publishedAt: string
}

interface Course {
  id: string
  playlistId: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  tags: string[]
  difficulty: string
  category: string
  metadata: {
    totalVideos: number
    totalDuration: string
  }
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'playlists' | 'courses'>('playlists')
  const navigate = useNavigate()

  const searchPlaylists = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const response = await api.get('/youtube/search', {
        params: { query: searchQuery, maxResults: 10 }
      })
      setPlaylists(response.data.data.playlists)
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const searchCourses = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const response = await api.get('/youtube/search-courses', {
        params: { q: searchQuery, limit: 10 }
      })
      setCourses(response.data.data.courses)
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === 'playlists') {
      searchPlaylists(query)
    } else {
      searchCourses(query)
    }
  }

  const handlePlaylistSelect = async (playlistId: string) => {
    try {
      const response = await api.get(`/youtube/playlist/${playlistId}`)
      const courseId = response.data.data.course.id
      navigate(`/playlist/${playlistId}`)
    } catch (error) {
      handleApiError(error)
    }
  }

  const handleCourseSelect = (courseId: string) => {
    navigate(`/playlist/${courseId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Discover Learning Content
        </h1>
        <p className="text-lg text-gray-600">
          Search for educational playlists and courses to enhance your learning
        </p>
      </div>

      {/* Search Form */}
      <div className="max-w-2xl mx-auto mb-8">
        <form onSubmit={handleSearch} className="relative">
          <div className="flex">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for topics, subjects, or courses..."
              className="input flex-1 rounded-r-none"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="btn btn-primary rounded-l-none px-6"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'playlists'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            YouTube Playlists
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'courses'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Saved Courses
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : activeTab === 'playlists' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <div
                key={playlist.playlistId}
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePlaylistSelect(playlist.playlistId)}
              >
                <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                  <img
                    src={playlist.thumbnail}
                    alt={playlist.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="card-content">
                  <h3 className="card-title text-lg line-clamp-2">
                    {playlist.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    by {playlist.channelTitle}
                  </p>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {playlist.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleCourseSelect(course.id)}
              >
                <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="card-content">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                      {course.difficulty}
                    </span>
                    <span className="text-xs text-gray-500">
                      {course.metadata.totalVideos} videos
                    </span>
                  </div>
                  <h3 className="card-title text-lg line-clamp-2 mb-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    by {course.channelTitle}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {course.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {course.metadata.totalDuration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (
          <>
            {activeTab === 'playlists' && playlists.length === 0 && query && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No playlists found
                </h3>
                <p className="text-gray-600">
                  Try searching with different keywords
                </p>
              </div>
            )}
            
            {activeTab === 'courses' && courses.length === 0 && query && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No courses found
                </h3>
                <p className="text-gray-600">
                  Try searching with different keywords or browse playlists
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SearchPage
