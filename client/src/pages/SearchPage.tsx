import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, handleApiError } from '../services/api'
import { Search, BookOpen, Loader2, Key } from 'lucide-react'
import toast from 'react-hot-toast'

interface Playlist {
  playlistId: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  publishedAt: string
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('')
  const [courseKey, setCourseKey] = useState('')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingKey, setIsLoadingKey] = useState(false)
  const [activeTab, setActiveTab] = useState<'playlists' | 'key'>('playlists')
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchPlaylists(query)
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

  const handleSearchByKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseKey.trim()) {
      toast.error('Please enter a course key')
      return
    }

    setIsLoadingKey(true)
    try {
      const response = await api.get(`/youtube/course-by-key/${courseKey.trim().toUpperCase()}`)
      const course = response.data.data.course
      toast.success('Course found! Redirecting...')
      navigate(`/playlist/${course.playlistId}`)
    } catch (error: any) {
      console.error('Error searching by key:', error)
      const errorMessage = error.response?.data?.message || 'Invalid or expired course key'
      toast.error(errorMessage)
    } finally {
      setIsLoadingKey(false)
    }
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
            onClick={() => setActiveTab('key')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'key'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Key className="w-4 h-4 inline mr-1" />
            Search by Key
          </button>
        </div>
      </div>

      {/* Search Form */}
      {activeTab === 'key' ? (
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSearchByKey} className="relative">
            <div className="flex">
              <input
                type="text"
                value={courseKey}
                onChange={(e) => setCourseKey(e.target.value.toUpperCase())}
                placeholder="Enter course key (e.g., ABC12345)"
                className="input flex-1 rounded-r-none uppercase"
                maxLength={8}
              />
              <button
                type="submit"
                disabled={isLoadingKey || !courseKey.trim()}
                className="btn btn-primary rounded-l-none px-6"
              >
                {isLoadingKey ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Key className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Enter the course key provided by your teacher to access the course
          </p>
        </div>
      ) : (
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
      )}

      {/* Results */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
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
        )}

        {!isLoading && activeTab === 'playlists' && playlists.length === 0 && query && (
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
      </div>
    </div>
  )
}

export default SearchPage
