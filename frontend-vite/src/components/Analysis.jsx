import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  MessageSquare,
  FileAudio,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  User,
  Bot,
  BarChart
} from 'lucide-react';

const Analysis = ({ callId, callUuid, onClose, serverStatus }) => {
  const [activeTab, setActiveTab] = useState('transcription');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transcription, setTranscription] = useState([]);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [expandedMessageIds, setExpandedMessageIds] = useState([]);

  // Check if Ultravox data is available
  const ultravoxDataAvailable = !!callId;

  // API base URL - update this to your actual API endpoint
  const API_BASE_URL = 'http://localhost:5000/api';
  const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api';

  // Fetch call transcription on component mount
  useEffect(() => {
    if (callId && serverStatus === 'online') {
      fetchTranscription();
      fetchRecordingUrl();
      // Fetch analytics if we have implemented that endpoint
      fetchAnalytics();
    }
  }, [callId, serverStatus]);

  // Helper function to toggle message expansion
  const toggleMessageExpansion = (messageId) => {
    setExpandedMessageIds(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  // Fetch call transcription
  const fetchTranscription = async () => {
    if (!ultravoxDataAvailable) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call your backend API which will proxy to Ultravox
      const response = await fetch(`${API_BASE_URL}/call_transcription/${callId}`);

      if (!response.ok) {
        throw new Error(`Error fetching transcription: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success' && data.results) {
        setTranscription(data.results);
      } else {
        setError(data.message || 'Failed to fetch transcription');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      console.error('Error fetching transcription:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recording URL
  const fetchRecordingUrl = async () => {
    if (!ultravoxDataAvailable) {
      return;
    }

    try {
      // Call your backend API which will proxy to Ultravox
      const response = await fetch(`${API_BASE_URL}/call_recording/${callId}`);

      if (!response.ok) {
        console.error(`Error fetching recording URL: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.status === 'success' && data.url) {
        setRecordingUrl(data.url);
      }
    } catch (err) {
      console.error('Error fetching recording URL:', err);
    }
  };

  // Fetch call analytics
  const fetchAnalytics = async () => {
    if (!ultravoxDataAvailable) {
      return;
    }

    try {
      // This could be a backend endpoint that combines data from both Plivo and Ultravox
      const response = await fetch(`${API_BASE_URL}/call_analytics/${callId}/${callUuid}`);

      if (!response.ok) {
        console.error(`Error fetching analytics: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.status === 'success') {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  // Calculate statistics from transcription data
  const calculateStats = () => {
    if (!transcription || transcription.length === 0) {
      return {
        totalMessages: 0,
        agentMessages: 0,
        userMessages: 0,
        avgAgentResponseLength: 0,
        avgUserResponseLength: 0,
        totalDuration: 0
      };
    }

    const agentMessages = transcription.filter(msg => msg.role === 'assistant');
    const userMessages = transcription.filter(msg => msg.role === 'user');

    const agentTextLengths = agentMessages.map(msg => msg.text.length);
    const userTextLengths = userMessages.map(msg => msg.text.length);

    const avgAgentResponseLength = agentTextLengths.length > 0
      ? Math.round(agentTextLengths.reduce((a, b) => a + b, 0) / agentTextLengths.length)
      : 0;

    const avgUserResponseLength = userTextLengths.length > 0
      ? Math.round(userTextLengths.reduce((a, b) => a + b, 0) / userTextLengths.length)
      : 0;

    // Calculate call duration if timestamps are available
    let totalDuration = 0;
    if (transcription.length > 1) {
      const firstMsg = transcription[0];
      const lastMsg = transcription[transcription.length - 1];

      if (firstMsg.timestamp && lastMsg.timestamp) {
        const startTime = new Date(firstMsg.timestamp);
        const endTime = new Date(lastMsg.timestamp);
        totalDuration = Math.round((endTime - startTime) / 1000);
      }
    }

    return {
      totalMessages: transcription.length,
      agentMessages: agentMessages.length,
      userMessages: userMessages.length,
      avgAgentResponseLength,
      avgUserResponseLength,
      totalDuration
    };
  };

  const stats = calculateStats();

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Format duration in seconds to minutes:seconds
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-700">
      <div className="p-6 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Call Analysis</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchTranscription}
            disabled={loading || serverStatus !== 'online' || !ultravoxDataAvailable}
            className="flex items-center px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
          >
            Close
          </button>
        </div>
      </div>

      {!ultravoxDataAvailable ? (
        <div className="p-8 text-center text-gray-400">
          <Info size={24} className="mx-auto mb-2" />
          <p className="text-lg font-medium mb-2">Ultravox data mapping not found</p>
          <p className="text-sm">
            The system couldn't find a mapping between this call and its Ultravox data.
            This may happen for calls made before the analysis feature was implemented.
          </p>
          <p className="text-sm mt-4">
            Call UUID: {callUuid}
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('transcription')}
              className={`px-6 py-3 font-medium flex items-center ${
                activeTab === 'transcription'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <MessageSquare size={18} className="mr-2" />
              Transcription
            </button>
            <button
              onClick={() => setActiveTab('recording')}
              className={`px-6 py-3 font-medium flex items-center ${
                activeTab === 'recording'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <FileAudio size={18} className="mr-2" />
              Recording
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 font-medium flex items-center ${
                activeTab === 'analytics'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <BarChart size={18} className="mr-2" />
              Analytics
            </button>
          </div>

          <div className="p-6">
            {/* Transcription Tab */}
            {activeTab === 'transcription' && (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">Call Transcription</h3>
                  <div className="text-sm text-gray-400">
                    {stats.totalMessages} messages • {formatDuration(stats.totalDuration)} duration
                  </div>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-gray-400">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
                    <p>Loading transcription...</p>
                  </div>
                ) : error ? (
                  <div className="p-8 text-center text-red-400">
                    <Info size={24} className="mx-auto mb-2" />
                    <p>{error}</p>
                    <p className="text-sm mt-2">
                      Note: Transcription may not be available immediately after call completion.
                    </p>
                  </div>
                ) : transcription.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <MessageSquare size={24} className="mx-auto mb-2" />
                    <p>No transcription available</p>
                    <p className="text-sm mt-2">
                      Transcription may take a few minutes to become available after call completion.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transcription.map((message, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg ${
                          message.role === 'assistant' 
                            ? 'bg-blue-900/20 border-l-4 border-blue-500' 
                            : 'bg-gray-700 border-l-4 border-gray-500'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            {message.role === 'assistant' ? (
                              <Bot size={16} className="text-blue-400 mr-2" />
                            ) : (
                              <User size={16} className="text-gray-400 mr-2" />
                            )}
                            <span className="font-medium text-white">
                              {message.role === 'assistant' ? 'Agent' : 'User'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatTimestamp(message.timestamp)}
                          </div>
                        </div>

                        <div className="text-gray-300 whitespace-pre-wrap">
                          {expandedMessageIds.includes(message.id) || message.text.length <= 100
                            ? message.text
                            : `${message.text.substring(0, 100)}...`}
                        </div>

                        {message.text.length > 100 && (
                          <button
                            onClick={() => toggleMessageExpansion(message.id)}
                            className="mt-2 text-blue-400 hover:text-blue-300 text-sm flex items-center"
                          >
                            {expandedMessageIds.includes(message.id) ? (
                              <>
                                <ChevronUp size={14} className="mr-1" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} className="mr-1" />
                                Show more
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recording Tab */}
            {activeTab === 'recording' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-white">Call Recording</h3>
                </div>

                {!recordingUrl ? (
                  <div className="p-8 text-center text-gray-400">
                    <FileAudio size={24} className="mx-auto mb-2" />
                    <p>Recording not available</p>
                    <p className="text-sm mt-2">
                      Recordings may take a few minutes to become available after call completion.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-700 p-6 rounded-lg">
                    <div className="mb-4">
                      <audio controls className="w-full">
                        <source src={recordingUrl} type="audio/wav" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                    <div className="flex justify-end">
                      <a
                        href={recordingUrl}
                        download="call_recording.wav"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                      >
                        <Download size={16} className="mr-2" />
                        Download Recording
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-white">Call Analytics</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Total Messages</div>
                    <div className="text-2xl font-bold text-white">{stats.totalMessages}</div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Call Duration</div>
                    <div className="text-2xl font-bold text-white">{formatDuration(stats.totalDuration)}</div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Message Ratio</div>
                    <div className="text-2xl font-bold text-white">
                      {stats.agentMessages}:{stats.userMessages}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Avg. Agent Response Length</div>
                    <div className="text-2xl font-bold text-white">{stats.avgAgentResponseLength} chars</div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Avg. User Response Length</div>
                    <div className="text-2xl font-bold text-white">{stats.avgUserResponseLength} chars</div>
                  </div>
                </div>

                {analytics && (
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-white mb-2">Additional Analytics</h4>
                    <pre className="text-sm text-gray-300 overflow-auto p-2 bg-gray-800 rounded">
                      {JSON.stringify(analytics, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analysis;