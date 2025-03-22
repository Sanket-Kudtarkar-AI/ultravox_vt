import React, { useState, useEffect } from 'react';
import {
  User, Phone, MessageCircle, ThumbsUp, ThumbsDown, CheckCircle,
  List, DollarSign, Heart, RefreshCw, AlertTriangle
} from 'lucide-react';
import Button from './ui/Button';

const EntityAnalysis = ({ callId, serverStatus }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE_URL = 'http://localhost:5000/api';

  // Fetch analysis data
  const fetchAnalysis = async () => {
    if (!callId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/analyze_transcript/${callId}`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'success' && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setError(data.message || 'Failed to analyze transcript');
      }
    } catch (err) {
      console.error('Error analyzing transcript:', err);
      setError(err.message || 'An error occurred while analyzing the transcript');
    } finally {
      setLoading(false);
    }
  };

  // Fetch analysis on component mount
  useEffect(() => {
    if (callId && serverStatus === 'online') {
      fetchAnalysis();
    }
  }, [callId, serverStatus]);

  // Helper function to render sentiment
  const renderSentiment = (sentiment) => {
    if (!sentiment) return null;

    const lowerSentiment = sentiment.toLowerCase();

    if (lowerSentiment.includes('positive')) {
      return (
        <div className="flex items-center text-green-400">
          <ThumbsUp size={16} className="mr-1" />
          {sentiment}
        </div>
      );
    } else if (lowerSentiment.includes('negative')) {
      return (
        <div className="flex items-center text-red-400">
          <ThumbsDown size={16} className="mr-1" />
          {sentiment}
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-400">
          <MessageCircle size={16} className="mr-1" />
          {sentiment}
        </div>
      );
    }
  };

  // Helper function to render a list
  const renderList = (items) => {
    if (!items || items.length === 0) return <span className="text-gray-500">None detected</span>;

    // Handle if items is a string
    if (typeof items === 'string') {
      // Try to split by commas or new lines
      const splitItems = items.split(/,|\n/).map(item => item.trim()).filter(Boolean);
      if (splitItems.length > 1) {
        return (
          <ul className="list-disc pl-5 space-y-1">
            {splitItems.map((item, index) => (
              <li key={index} className="text-gray-300">{item}</li>
            ))}
          </ul>
        );
      }
      return <span className="text-gray-300">{items}</span>;
    }

    // If it's an array
    if (Array.isArray(items)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-gray-300">{item}</li>
          ))}
        </ul>
      );
    }

    // Fallback
    return <span className="text-gray-300">{JSON.stringify(items)}</span>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw size={32} className="text-primary-400 mb-4 animate-spin" />
        <p className="text-gray-400">Analyzing transcript with OpenAI...</p>
        <p className="text-gray-500 text-sm mt-2">This may take a few moments</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle size={32} className="text-red-400 mb-4" />
        <p className="text-white font-medium mb-2">Analysis Error</p>
        <p className="text-gray-400 text-center max-w-md">{error}</p>
        <Button
          onClick={fetchAnalysis}
          variant="primary"
          className="mt-4"
          icon={<RefreshCw size={16} />}
        >
          Retry Analysis
        </Button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <MessageCircle size={32} className="text-gray-400 mb-4" />
        <p className="text-white font-medium mb-2">No Analysis Available</p>
        <p className="text-gray-400 text-center max-w-md">
          AI-powered transcript analysis has not been performed yet.
        </p>
        <Button
          onClick={fetchAnalysis}
          variant="primary"
          className="mt-4"
          icon={<RefreshCw size={16} />}
        >
          Analyze Transcript
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information Card */}
        <div className="bg-dark-700/30 rounded-lg p-4 border border-dark-600/50">
          <h3 className="text-white font-medium mb-3 flex items-center">
            <User size={16} className="mr-2 text-primary-400" />
            Customer Information
          </h3>

          <div className="space-y-3">
            <div>
              <div className="text-gray-400 text-sm mb-1">Name</div>
              <div className="text-white">{analysis.customer_name || 'Not mentioned'}</div>
            </div>

            <div>
              <div className="text-gray-400 text-sm mb-1">Contact Details</div>
              <div className="text-white flex items-center">
                <Phone size={14} className="mr-1 text-gray-500" />
                {analysis.contact_details || 'Not mentioned'}
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm mb-1">Sentiment</div>
              {renderSentiment(analysis.sentiment)}
            </div>
          </div>
        </div>

        {/* Call Content Card */}
        <div className="bg-dark-700/30 rounded-lg p-4 border border-dark-600/50">
          <h3 className="text-white font-medium mb-3 flex items-center">
            <MessageCircle size={16} className="mr-2 text-primary-400" />
            Call Content
          </h3>

          <div className="space-y-3">
            <div>
              <div className="text-gray-400 text-sm mb-1">Topics Discussed</div>
              {renderList(analysis.topics)}
            </div>

            <div>
              <div className="text-gray-400 text-sm mb-1">Products/Services Mentioned</div>
              {renderList(analysis.products_mentioned)}
            </div>

            <div>
              <div className="text-gray-400 text-sm mb-1">Financial Figures</div>
              <div className="text-white flex items-center">
                <DollarSign size={14} className="mr-1 text-gray-500" />
                {analysis.financial_figures || 'None mentioned'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Needs Card */}
      <div className="bg-dark-700/30 rounded-lg p-4 border border-dark-600/50">
        <h3 className="text-white font-medium mb-3 flex items-center">
          <Heart size={16} className="mr-2 text-red-400" />
          Customer Needs & Pain Points
        </h3>

        <div className="bg-dark-800/50 p-3 rounded-lg">
          {renderList(analysis.customer_needs)}
        </div>
      </div>

      {/* Action Items Card */}
      <div className="bg-dark-700/30 rounded-lg p-4 border border-dark-600/50">
        <h3 className="text-white font-medium mb-3 flex items-center">
          <CheckCircle size={16} className="mr-2 text-green-400" />
          Follow-up Actions
        </h3>

        <div className="bg-dark-800/50 p-3 rounded-lg">
          {renderList(analysis.follow_up_actions)}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={fetchAnalysis}
          variant="primary"
          size="sm"
          icon={<RefreshCw size={14} />}
        >
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
};

export default EntityAnalysis;