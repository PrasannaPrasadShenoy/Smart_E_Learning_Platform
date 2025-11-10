import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Save, Trash2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { api, handleApiError } from '../services/api'
import toast from 'react-hot-toast'

interface Question {
  question: string
  type: 'multiple-choice' | 'true-false' | 'short-answer'
  options: Array<{ text: string; isCorrect: boolean }>
  correctAnswer?: string
  points: number
  explanation: string
}

const CreateQuizPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState(0)
  const [passingScore, setPassingScore] = useState(60)
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false)
  const [showResults, setShowResults] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: '',
        type: 'multiple-choice',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        points: 1,
        explanation: ''
      }
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const updateOption = (questionIndex: number, optionIndex: number, field: 'text' | 'isCorrect', value: any) => {
    const updated = [...questions]
    updated[questionIndex].options[optionIndex] = {
      ...updated[questionIndex].options[optionIndex],
      [field]: value
    }
    setQuestions(updated)
  }

  const addOption = (questionIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].options.push({ text: '', isCorrect: false })
    setQuestions(updated)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions]
    if (updated[questionIndex].options.length > 2) {
      updated[questionIndex].options.splice(optionIndex, 1)
      setQuestions(updated)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Quiz title is required')
      return
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question')
      return
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} is missing text`)
        return
      }

      if (q.type === 'multiple-choice') {
        if (q.options.length < 2) {
          toast.error(`Question ${i + 1} needs at least 2 options`)
          return
        }
        const hasCorrect = q.options.some(opt => opt.isCorrect)
        if (!hasCorrect) {
          toast.error(`Question ${i + 1} needs at least one correct answer`)
          return
        }
        if (q.options.some(opt => !opt.text.trim())) {
          toast.error(`Question ${i + 1} has empty options`)
          return
        }
      } else if (q.type === 'true-false' || q.type === 'short-answer') {
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          toast.error(`Question ${i + 1} needs a correct answer`)
          return
        }
      }
    }

    setIsSaving(true)
    try {
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }

      const response = await api.post('/quiz', {
        title,
        description,
        questions,
        timeLimit,
        passingScore,
        allowMultipleAttempts,
        showResults
      })

      toast.success('Quiz created successfully!')
      navigate('/quiz')
    } catch (error) {
      console.error('Error creating quiz:', error)
      handleApiError(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/quiz')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Quizzes
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Quiz</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input w-full"
                  placeholder="Enter quiz title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input w-full"
                  rows={3}
                  placeholder="Enter quiz description (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Limit (minutes, 0 = no limit)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                    className="input w-full"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseInt(e.target.value) || 60)}
                    className="input w-full"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowMultipleAttempts}
                    onChange={(e) => setAllowMultipleAttempts(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Allow Multiple Attempts</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showResults}
                    onChange={(e) => setShowResults(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Show Results After Submission</span>
                </label>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Questions ({questions.length})</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="btn btn-sm btn-primary"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No questions yet. Click "Add Question" to get started.
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question, qIndex) => (
                  <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-medium text-gray-900">Question {qIndex + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Text *
                        </label>
                        <textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                          className="input w-full"
                          rows={2}
                          placeholder="Enter your question"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Question Type *
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) => {
                              const newType = e.target.value as Question['type']
                              updateQuestion(qIndex, 'type', newType)
                              if (newType === 'true-false') {
                                updateQuestion(qIndex, 'options', [
                                  { text: 'True', isCorrect: false },
                                  { text: 'False', isCorrect: false }
                                ])
                              }
                            }}
                            className="input w-full"
                          >
                            <option value="multiple-choice">Multiple Choice</option>
                            <option value="true-false">True/False</option>
                            <option value="short-answer">Short Answer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Points *
                          </label>
                          <input
                            type="number"
                            value={question.points}
                            onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                            className="input w-full"
                            min="1"
                            required
                          />
                        </div>
                      </div>

                      {question.type === 'multiple-choice' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Options * (check the correct answer)
                          </label>
                          <div className="space-y-2">
                            {question.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={option.isCorrect}
                                  onChange={(e) => updateOption(qIndex, oIndex, 'isCorrect', e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                                  className="input flex-1"
                                  placeholder={`Option ${oIndex + 1}`}
                                  required
                                />
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(qIndex, oIndex)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOption(qIndex)}
                              className="btn btn-sm btn-outline"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Option
                            </button>
                          </div>
                        </div>
                      )}

                      {(question.type === 'true-false' || question.type === 'short-answer') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correct Answer *
                          </label>
                          {question.type === 'true-false' ? (
                            <select
                              value={question.correctAnswer || ''}
                              onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                              className="input w-full"
                              required
                            >
                              <option value="">Select answer</option>
                              <option value="True">True</option>
                              <option value="False">False</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={question.correctAnswer || ''}
                              onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                              className="input w-full"
                              placeholder="Enter correct answer"
                              required
                            />
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Explanation (shown after quiz)
                        </label>
                        <textarea
                          value={question.explanation}
                          onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                          className="input w-full"
                          rows={2}
                          placeholder="Optional explanation for the correct answer"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/quiz')}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || questions.length === 0}
              className="btn btn-primary"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Quiz
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateQuizPage

