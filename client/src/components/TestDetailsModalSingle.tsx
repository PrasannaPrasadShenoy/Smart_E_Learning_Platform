import { motion, AnimatePresence } from 'framer-motion'
import { X, Target, Brain, Clock, Award, BarChart3 } from 'lucide-react'

interface Assessment {
  id: string
  course: {
    title: string
    thumbnail: string
  }
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

interface TestDetailsModalSingleProps {
  test: Assessment
  onClose: () => void
}

const TestDetailsModalSingle: React.FC<TestDetailsModalSingleProps> = ({ test, onClose }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getCLIColor = (cli: number) => {
    if (cli <= 35) return 'text-green-600 bg-green-50'
    if (cli <= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getCLIClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Low Load':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Moderate Load':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'High Load':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 4) return 'text-green-600'
    if (confidence >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{test.videoTitle || test.testName}</h2>
                  <div className="flex items-center gap-4 text-sm text-primary-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(test.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Main Score Display */}
                <div className="text-center py-6">
                  <div className={`inline-block px-8 py-4 rounded-2xl border-4 ${getScoreColor(test.testScore || 0)}`}>
                    <p className="text-sm font-medium mb-1">Test Score</p>
                    <p className="text-5xl font-bold">
                      {test.testScore !== undefined && !isNaN(test.testScore) ? test.testScore : 0}%
                    </p>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Test Score */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Score</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">
                      {test.testScore !== undefined && !isNaN(test.testScore) ? test.testScore : 0}%
                    </p>
                  </div>

                  {/* CLI */}
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-600">CLI</span>
                    </div>
                    <p className={`text-3xl font-bold ${getCLIColor(test.cli || 0).split(' ')[0]}`}>
                      {test.cli !== undefined && !isNaN(test.cli) ? Math.round(test.cli) : 0}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full mt-2 inline-block ${getCLIClassificationColor(test.cliClassification || '')}`}>
                      {test.cliClassification || 'N/A'}
                    </span>
                  </div>

                  {/* Confidence */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Confidence</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className={`text-3xl font-bold ${getConfidenceColor(test.confidence || 0)}`}>
                        {test.confidence || 0}
                      </p>
                      <span className="text-sm text-gray-500">/5</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-3 h-3 rounded-full ${
                            level <= (test.confidence || 0)
                              ? 'bg-green-600'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Time Spent */}
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-600">Time</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatTime(test.timeSpent || 0)}
                    </p>
                  </div>
                </div>

                {/* Performance Indicator */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-600">Performance: </span>
                      <span className={`text-lg font-semibold ${
                        (test.testScore || 0) >= 80 ? 'text-green-600' :
                        (test.testScore || 0) >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(test.testScore || 0) >= 80 ? 'Excellent' :
                         (test.testScore || 0) >= 60 ? 'Good' :
                         'Needs Improvement'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-end">
              <button
                onClick={onClose}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}

export default TestDetailsModalSingle

