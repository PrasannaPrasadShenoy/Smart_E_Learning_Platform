import React from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface NotesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  notes: {
    shortNotes: string;
    detailedNotes: string;
    videoTitle: string;
    estimatedReadTime?: {
      shortNotes: number;
      detailedNotes: number;
    };
  };
  type: 'short' | 'detailed';
}

const NotesPopup: React.FC<NotesPopupProps> = ({ isOpen, onClose, notes, type }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const currentNotes = type === 'short' ? notes.shortNotes : notes.detailedNotes;
  const readTime = type === 'short' 
    ? notes.estimatedReadTime?.shortNotes || 5
    : notes.estimatedReadTime?.detailedNotes || 15;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentNotes);
      setCopied(true);
      toast.success('Notes copied to clipboard!', {
        duration: 2000,
        style: {
          background: '#10B981',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          padding: '12px 20px',
          borderRadius: '8px'
        }
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy notes', {
        duration: 2000,
        style: {
          background: '#EF4444',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          padding: '12px 20px',
          borderRadius: '8px'
        }
      });
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([currentNotes], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${notes.videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${type}_notes.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast.success(`${type === 'short' ? 'Short' : 'Detailed'} notes downloaded!`, {
      duration: 2000,
      style: {
        background: '#10B981',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '12px 20px',
        borderRadius: '8px'
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {type === 'short' ? (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {type === 'short' ? 'Short Notes' : 'Detailed Notes'}
              </h2>
              <p className="text-sm text-gray-600">{notes.videoTitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ~{readTime} min read
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {currentNotes.split(' ').length} words
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {currentNotes}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopy}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Generated by Intelligent Learning Assistant (ILA)
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesPopup;
