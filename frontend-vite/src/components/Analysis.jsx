import React, { useState, useEffect, useRef } from 'react';
import {
    RefreshCw,
    Download,
    MessageSquare,
    FileAudio,
    ChevronLeft,
    Clock,
    Info,
    User,
    Bot,
    Phone,
    BarChart,
    Activity,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Brain
} from 'lucide-react';
import Button from './ui/Button';
import EntityAnalysis from './EntityAnalysis';
import WaveformPlayer from './WaveformPlayer';

const TabButton = ({active, icon, label, onClick}) => (
    <button
        onClick={onClick}
        className={`px-6 py-3 font-medium flex items-center transition-colors ${
            active
                ? 'text-white border-b-2 border-primary-500 bg-dark-700/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-dark-700/10'
        }`}
    >
        {icon}
        <span className="ml-2">{label}</span>
    </button>
);

const StatCard = ({title, value, className = ""}) => (
    <div className={`bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg ${className}`}>
        <div className="text-gray-400 text-sm mb-1">{title}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
    </div>
);

// Rename callId to ultravoxCallId in the props for clarity
const Analysis = ({callId: ultravoxCallId, callUuid, onClose, serverStatus}) => {
    const [activeTab, setActiveTab] = useState('transcription');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [transcription, setTranscription] = useState([]);
    const [recordingUrl, setRecordingUrl] = useState(null);
    const [recordingError, setRecordingError] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioTime, setAudioTime] = useState(0);
    const audioRef = useRef(null);

    console.log("==================== ANALYSIS COMPONENT DEBUG ====================");
    console.log("Received props - callId:", ultravoxCallId, "callUuid:", callUuid);

    // Check if Ultravox data is available
    const ultravoxDataAvailable = !!ultravoxCallId;

    // API base URL - update this to your actual API endpoint
    const API_BASE_URL = 'http://localhost:5000/api';

    // Add a refresh all data function
    const refreshAllData = () => {
        if (ultravoxCallId) {
            setLoading(true);

            // Track success of all operations
            let successCount = 0;
            let totalOperations = ultravoxDataAvailable ? 3 : 0;

            const finishOperation = (success) => {
                if (success) successCount++;
                if (--totalOperations <= 0) {
                    setLoading(false);
                    if (successCount > 0) {
                        // If at least one operation succeeded, show a success message
                        console.log("Data refreshed successfully");
                    }
                }
            };

            if (ultravoxDataAvailable) {
                // Fetch transcription
                fetchTranscription()
                    .then(() => finishOperation(true))
                    .catch(() => finishOperation(false));

                // Fetch recording URL - don't let it block other operations
                try {
                    fetchRecordingUrl()
                        .then(() => finishOperation(true))
                        .catch((err) => {
                            console.warn("Recording fetch failed but continuing:", err);
                            finishOperation(false);
                        });
                } catch (error) {
                    console.error("Critical error in recording fetch:", error);
                    finishOperation(false);
                }

                // Fetch analytics
                fetchAnalytics()
                    .then(() => finishOperation(true))
                    .catch(() => finishOperation(false));
            } else {
                setLoading(false);
            }
        }
    };

    // Fetch call data on component mount
    useEffect(() => {
        if (ultravoxCallId && serverStatus === 'online') {
            console.log("Fetching data with ultravoxCallId:", ultravoxCallId); // Add debug logging
            fetchTranscription();

            // Wrap recording fetch in try-catch to prevent it from blocking other functionality
            try {
                fetchRecordingUrl().catch(err => {
                    console.warn("Recording fetch failed but continuing with other data:", err);
                    // Don't let recording errors block other functionality
                });
            } catch (error) {
                console.error("Critical error in recording fetch:", error);
            }

            fetchAnalytics();
        }
    }, [ultravoxCallId, serverStatus]);

    // Fetch call transcription - return a promise for better control
    const fetchTranscription = async () => {
        if (!ultravoxDataAvailable) return Promise.resolve();

        try {
            setLoading(true);
            setError(null);
            console.log("ANALYSIS COMPONENT - Fetching transcription with Ultravox ID:", ultravoxCallId);

            // Make the API request
            const response = await fetch(`${API_BASE_URL}/call_transcription/${ultravoxCallId}`);
            console.log("ANALYSIS COMPONENT - Transcription response status:", response.status);

            // Check response status
            if (!response.ok) {
                console.error(`ANALYSIS COMPONENT - Error response: ${response.status} ${response.statusText}`);
                throw new Error(`Error fetching transcription: ${response.status}`);
            }

            // Parse the JSON response BEFORE trying to access any properties
            const responseData = await response.json();

            // Now we can safely log and use the data
            console.log("ANALYSIS COMPONENT - Transcription data received");

            if (responseData.status === 'success' && responseData.results) {
                console.log("ANALYSIS COMPONENT - Number of messages:", responseData.results.length);
                setTranscription(responseData.results);
                return Promise.resolve(true);
            } else {
                setError(responseData.message || 'Failed to fetch transcription');
                return Promise.reject(responseData.message || 'Failed to fetch transcription');
            }
        } catch (err) {
            setError(`Error: ${err.message}`);
            console.error('ANALYSIS COMPONENT - Error fetching transcription:', err);
            return Promise.reject(err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch recording URL - return a promise for better control
    const fetchRecordingUrl = async () => {
        if (!ultravoxDataAvailable) return Promise.resolve();

        try {
            console.log("ANALYSIS COMPONENT - Fetching recording URL with Ultravox ID:", ultravoxCallId);

            const response = await fetch(`${API_BASE_URL}/call_recording/${ultravoxCallId}`);
            console.log("ANALYSIS COMPONENT - Recording URL response status:", response.status);

            if (!response.ok) {
                // Handle specific status codes
                if (response.status === 425) {
                    console.warn("ANALYSIS COMPONENT - Recording not ready yet (425 Too Early)");
                    // Set recording-specific error, not general error
                    setRecordingError("Recording not ready yet. Please try refreshing in a few moments.");
                    return Promise.reject("Recording not ready yet");
                } else {
                    console.error(`ANALYSIS COMPONENT - Error fetching recording URL: ${response.status}`);
                    setRecordingError(`Error fetching recording: ${response.status}`);
                    return Promise.reject(`Error fetching recording URL: ${response.status}`);
                }
            }

            // Parse the JSON response
            const responseData = await response.json();
            console.log("ANALYSIS COMPONENT - Recording URL response data:", responseData);

            if (responseData.status === 'success' && responseData.url) {
                console.log("ANALYSIS COMPONENT - Successfully retrieved recording URL:", responseData.url);

                // Create proxy URL - encode the original URL
                const originalUrl = responseData.url;
                const proxyUrl = `${API_BASE_URL}/proxy_audio/${encodeURIComponent(originalUrl)}`;

                console.log("ANALYSIS COMPONENT - Using proxy URL:", proxyUrl);
                setRecordingUrl(proxyUrl);
                setRecordingError(null);
                return Promise.resolve(true);
            } else {
                console.warn("ANALYSIS COMPONENT - No URL in recording response:", responseData);
                setRecordingError("No recording URL available");
                return Promise.reject(responseData.message || 'No recording URL available');
            }
        } catch (err) {
            console.error('ANALYSIS COMPONENT - Error fetching recording URL:', err);
            setRecordingError(err.message || "Failed to fetch recording URL");
            return Promise.reject(err.message || "Failed to fetch recording URL");
        }
    };

    // Fetch call analytics - return a promise for better control
    const fetchAnalytics = async () => {
        if (!ultravoxDataAvailable) return Promise.resolve();

        try {
            console.log("Fetching analytics for call ID:", ultravoxCallId, "and call UUID:", callUuid);
            const response = await fetch(`${API_BASE_URL}/call_analytics/${ultravoxCallId}/${callUuid}`);
            console.log("Analytics response status:", response.status);

            if (!response.ok) {
                console.error(`Error fetching analytics: ${response.status}`);
                return Promise.reject(`Error fetching analytics: ${response.status}`);
            }

            const data = await response.json();
            console.log("Analytics data:", data);

            if (data.status === 'success') {
                setAnalytics(data.analytics);
                return Promise.resolve(true);
            } else {
                return Promise.reject(data.message || 'Failed to fetch analytics');
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            return Promise.reject(err);
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

        // Identify agent and user role names based on what's in the data
        const agentRoles = ['MESSAGE_ROLE_AGENT', 'assistant'];
        const userRoles = ['MESSAGE_ROLE_USER', 'user'];

        const agentMessages = transcription.filter(msg => agentRoles.includes(msg.role));
        const userMessages = transcription.filter(msg => userRoles.includes(msg.role));

        // Filter out messages without text before calculating lengths
        const agentTextLengths = agentMessages
            .filter(msg => msg.text)
            .map(msg => msg.text.length || 0);

        const userTextLengths = userMessages
            .filter(msg => msg.text)
            .map(msg => msg.text.length || 0);

        const avgAgentResponseLength = agentTextLengths.length > 0
            ? Math.round(agentTextLengths.reduce((a, b) => a + b, 0) / agentTextLengths.length)
            : 0;

        const avgUserResponseLength = userTextLengths.length > 0
            ? Math.round(userTextLengths.reduce((a, b) => a + b, 0) / userTextLengths.length)
            : 0;

        // Calculate call duration with multiple fallback approaches
        let totalDuration = 0;

        // 1. Try to calculate from message timestamps
        if (transcription.length > 1) {
            const messagesWithTimestamps = transcription.filter(msg => msg.timestamp);
            if (messagesWithTimestamps.length >= 2) {
                const firstMsg = messagesWithTimestamps[0];
                const lastMsg = messagesWithTimestamps[messagesWithTimestamps.length - 1];

                try {
                    const startTime = new Date(firstMsg.timestamp);
                    const endTime = new Date(lastMsg.timestamp);
                    totalDuration = Math.round((endTime - startTime) / 1000);
                } catch (e) {
                    console.error("Error calculating duration from timestamps:", e);
                }
            }
        }

        // 2. If no timestamp duration, try to estimate based on callStageMessageIndex
        if (totalDuration === 0) {
            const lastIndex = transcription.reduce((max, msg) => {
                return (msg.callStageMessageIndex !== undefined && msg.callStageMessageIndex > max)
                    ? msg.callStageMessageIndex
                    : max;
            }, -1);

            if (lastIndex > 0) {
                // Rough estimate: 8 seconds per message exchange
                totalDuration = lastIndex * 8;
            }
        }

        // 3. If still no duration and analytics data is available, use that
        if (totalDuration === 0 && analytics) {
            // Try Ultravox data first
            if (analytics.ultravox && analytics.ultravox.created && analytics.ultravox.ended) {
                try {
                    const startTime = new Date(analytics.ultravox.created);
                    const endTime = new Date(analytics.ultravox.ended);
                    totalDuration = Math.round((endTime - startTime) / 1000);
                } catch (e) {
                    console.error("Error calculating duration from Ultravox data:", e);
                }
            }

            // If still no duration, try Plivo data
            if (totalDuration === 0 && analytics.plivo && analytics.plivo.call_duration) {
                totalDuration = parseInt(analytics.plivo.call_duration, 10);
            }

            // Last resort: use combined stats
            if (totalDuration === 0 && analytics.combined && analytics.combined.total_duration) {
                totalDuration = analytics.combined.total_duration;
            }
        }

        return {
            totalMessages: transcription.length,
            agentMessages: agentMessages.length,
            userMessages: userMessages.length,
            avgAgentResponseLength,
            avgUserResponseLength,
            totalDuration,
            messagesWithoutText: transcription.filter(msg => !msg.text).length
        };
    };

    const stats = calculateStats();

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'No time data';

        try {
            // Create a date object from the timestamp
            const date = new Date(timestamp);

            // Check if the date is valid
            if (isNaN(date.getTime())) {
                console.error("Invalid timestamp format:", timestamp);
                return 'Invalid time format';
            }

            // Format date for Indian Standard Time (IST)
            const options = {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata' // IST timezone
            };

            return date.toLocaleTimeString('en-IN', options) + ' IST';
        } catch (error) {
            console.error("Error formatting timestamp:", error, "Raw timestamp:", timestamp);
            return 'Time format error';
        }
    };

    // Format duration in seconds to hours:minutes:seconds
    const formatDuration = (seconds) => {
        if (!seconds || seconds === 0) return '0:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    };

    // Handle audio playback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setAudioTime(audio.currentTime);
        const updatePlayState = () => setIsPlaying(!audio.paused);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('play', updatePlayState);
        audio.addEventListener('pause', updatePlayState);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('play', updatePlayState);
            audio.removeEventListener('pause', updatePlayState);
        };
    }, [recordingUrl]);

    return (
        <div className="bg-gradient-to-b from-dark-900 to-dark-800 rounded-xl shadow-lg overflow-hidden border border-dark-700">
            {/* Header */}
            <div className="p-6 border-b border-dark-700 flex justify-between items-center bg-dark-800/50 backdrop-blur-sm">
                <div className="flex items-center">
                    <button
                        onClick={onClose}
                        className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors"
                    >
                        <ChevronLeft size={20}/>
                    </button>
                    <h2 className="text-xl font-semibold text-white">Call Analysis</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={refreshAllData}
                        disabled={loading || serverStatus !== 'online' || !ultravoxDataAvailable}
                        className="flex items-center px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`}/>
                        Refresh Data
                    </button>
                </div>
            </div>

            {!ultravoxDataAvailable ? (
                <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-900/30 text-yellow-400 mb-4">
                        <AlertTriangle size={32}/>
                    </div>
                    <p className="text-lg font-medium mb-2 text-white">VT call ID mapping not found</p>
                    <p className="text-sm text-gray-400 max-w-md mx-auto">
                        The system couldn't find a mapping between this call and its VT call ID.
                        This may happen for calls made before the analysis feature was implemented.
                    </p>
                    <p className="text-sm mt-4 text-gray-500">
                        Call UUID: {callUuid}
                    </p>
                </div>
            ) : (
                <>
                    {/* Tabs */}
                    <div className="flex border-b border-dark-700 bg-dark-800/30">
                        <TabButton
                            active={activeTab === 'transcription'}
                            icon={<MessageSquare size={18}/>}
                            label="Transcription"
                            onClick={() => setActiveTab('transcription')}
                        />
                        <TabButton
                            active={activeTab === 'recording'}
                            icon={<FileAudio size={18}/>}
                            label="Recording"
                            onClick={() => setActiveTab('recording')}
                        />
                        <TabButton
                            active={activeTab === 'analytics'}
                            icon={<BarChart size={18}/>}
                            label="Analytics"
                            onClick={() => setActiveTab('analytics')}
                        />
                        <TabButton
                            active={activeTab === 'ai-analysis'}
                            icon={<Brain size={18}/>}
                            label="AI Analysis"
                            onClick={() => setActiveTab('ai-analysis')}
                        />
                    </div>

                    <div className="p-6">
                        {/* Transcription Tab */}
                        {activeTab === 'transcription' && (
                            <div>
                                <div className="mb-6 flex justify-between items-center bg-dark-800/30 p-4 rounded-lg">
                                    <h3 className="text-lg font-medium text-white">Call Transcription</h3>
                                    <div className="text-sm text-gray-400 flex items-center">
                                        <MessageSquare size={14} className="mr-1.5"/>
                                        {stats.totalMessages} messages
                                        <span className="mx-2">•</span>
                                        <Clock size={14} className="mr-1.5"/>
                                        {formatDuration(stats.totalDuration)}
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="p-12 text-center">
                                        <RefreshCw size={32} className="mx-auto mb-4 text-primary-400 animate-spin"/>
                                        <p className="text-gray-400">Loading transcription...</p>
                                    </div>
                                ) : error ? (
                                    <div className="p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/30 text-red-400 mb-4">
                                            <XCircle size={32}/>
                                        </div>
                                        <p className="text-lg font-medium mb-2 text-white">Could not load transcription</p>
                                        <p className="text-sm text-gray-400 max-w-md mx-auto">{error}</p>
                                        <p className="text-sm mt-4 text-gray-500">
                                            Note: Transcription may take a few minutes to become available after call
                                            completion.
                                        </p>
                                        <Button
                                            onClick={refreshAllData}
                                            variant="primary"
                                            className="mt-4"
                                            icon={<RefreshCw size={16}/>}
                                        >
                                            Refresh Data
                                        </Button>
                                    </div>
                                ) : transcription.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-700/50 text-gray-400 mb-4">
                                            <MessageSquare size={32}/>
                                        </div>
                                        <p className="text-lg font-medium mb-2 text-white">No transcription available</p>
                                        <p className="text-sm text-gray-400 max-w-md mx-auto">
                                            Transcription may take a few minutes to become available after call
                                            completion. Please refresh the data to check if it's ready.
                                        </p>
                                        <Button
                                            onClick={refreshAllData}
                                            variant="primary"
                                            className="mt-4"
                                            icon={<RefreshCw size={16}/>}
                                        >
                                            Refresh Data
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                                        {transcription.map((message, index) => {
                                            // Debug logging for message timestamp
                                            console.log(`Message ${index} timestamp:`, message.timestamp, typeof message.timestamp);

                                            return (
                                                <div
                                                    key={index}
                                                    className={`p-4 rounded-lg transition-all hover:translate-x-1 ${
                                                        message.role === 'MESSAGE_ROLE_AGENT' || message.role === 'assistant'
                                                            ? 'bg-gradient-to-r from-primary-900/30 to-primary-800/10 border-l-4 border-primary-500'
                                                            : 'bg-gradient-to-r from-dark-700/50 to-dark-800/30 border-l-4 border-gray-500'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center">
                                                            {message.role === 'MESSAGE_ROLE_AGENT' || message.role === 'assistant' ? (
                                                                <div className="p-1.5 rounded-lg bg-primary-900/50 text-primary-400 mr-2">
                                                                    <Bot size={14}/>
                                                                </div>
                                                            ) : (
                                                                <div className="p-1.5 rounded-lg bg-dark-700/70 text-gray-400 mr-2">
                                                                    <User size={14}/>
                                                                </div>
                                                            )}
                                                            <span className="font-medium text-white">
                                                                {message.role === 'MESSAGE_ROLE_AGENT' || message.role === 'assistant' ? 'Agent' : 'User'}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs font-medium bg-dark-700/70 px-3 py-1 rounded-full flex items-center">
                                                            <Clock size={12} className="mr-1.5 text-primary-400" />
                                                            <span className="text-white">
                                                                {formatTimestamp(message.timestamp)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="text-gray-300 whitespace-pre-wrap pl-8">
                                                        {message.text ? (
                                                            message.text
                                                        ) : (
                                                            <span className="italic text-gray-500">
                                                                [No text available - Voice input]
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* If there's a message-specific duration, display it */}
                                                    {message.duration && (
                                                        <div className="text-xs text-gray-500 mt-1 pl-8">
                                                            Duration: {message.duration}s
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recording Tab */}
                        {activeTab === 'recording' && (
                            <div>
                                <div className="mb-6 flex justify-between items-center bg-dark-800/30 p-4 rounded-lg">
                                    <h3 className="text-lg font-medium text-white">Call Recording</h3>
                                    <div className="text-sm text-gray-400 flex items-center">
                                        <Clock size={14} className="mr-1.5"/>
                                        {formatDuration(stats.totalDuration)} duration
                                    </div>
                                </div>

                                {!recordingUrl ? (
                                    <div className="p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-700/50 text-gray-400 mb-4">
                                            <FileAudio size={32}/>
                                        </div>
                                        <p className="text-lg font-medium mb-2 text-white">Recording not available</p>
                                        <p className="text-sm text-gray-400 max-w-md mx-auto">
                                            {recordingError || "Recordings may take a few minutes to become available after call completion."}
                                        </p>
                                        <Button
                                            onClick={refreshAllData}
                                            variant="primary"
                                            className="mt-4"
                                            icon={<RefreshCw size={16}/>}
                                        >
                                            Refresh Data
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="bg-dark-800/50 backdrop-blur-sm p-6 rounded-lg">
                                        <div className="mb-6">
                                            <div className="relative">
                                                {/* Try using WaveformPlayer, but have a fallback */}
                                                <h4 className="text-white font-medium mb-4">Recording Playback</h4>
                                                <div className="p-4 bg-dark-700/30 rounded-lg mb-4">
                                                    <div className="text-center p-3">
                                                        <audio
                                                            ref={audioRef}
                                                            controls
                                                            className="w-full"
                                                            src={recordingUrl}
                                                            preload="auto"
                                                        >
                                                            Your browser does not support the audio element.
                                                        </audio>
                                                    </div>

                                                    <p className="text-sm text-gray-400 text-center mt-2">
                                                        If the audio fails to load, you can <a
                                                            href={recordingUrl}
                                                            download="call_recording.wav"
                                                            className="text-primary-400 hover:text-primary-300 underline"
                                                        >
                                                            download the recording
                                                        </a> directly.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <a
                                                href={recordingUrl}
                                                download="call_recording.wav"
                                                className="px-4 py-2 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center"
                                            >
                                                <Download size={16} className="mr-2"/>
                                                Download Recording
                                            </a>
                                        </div>

                                        {/* Call details */}
                                        {analytics && analytics.ultravox && (
                                            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div className="bg-dark-700/30 p-3 rounded-lg">
                                                    <div className="text-gray-400 mb-1">Voice</div>
                                                    <div className="font-medium text-white">{analytics.ultravox.voice || 'Standard'}</div>
                                                </div>
                                                <div className="bg-dark-700/30 p-3 rounded-lg">
                                                    <div className="text-gray-400 mb-1">Language</div>
                                                    <div className="font-medium text-white">
                                                        {analytics.ultravox.language_hint === 'hi' ? 'Hindi' :
                                                        analytics.ultravox.language_hint === 'en' ? 'English' :
                                                        analytics.ultravox.language_hint || 'Unknown'}
                                                    </div>
                                                </div>
                                                <div className="bg-dark-700/30 p-3 rounded-lg">
                                                    <div className="text-gray-400 mb-1">First Speaker</div>
                                                    <div className="font-medium text-white">
                                                        {analytics.ultravox.first_speaker === 'FIRST_SPEAKER_AGENT' ? 'Agent' :
                                                        analytics.ultravox.first_speaker === 'FIRST_SPEAKER_USER' ? 'User' :
                                                        analytics.ultravox.first_speaker || 'Unknown'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Analytics Tab */}
                        {activeTab === 'analytics' && (
                            <div>
                                <div className="mb-6 flex justify-between items-center bg-dark-800/30 p-4 rounded-lg">
                                    <h3 className="text-lg font-medium text-white">Call Analytics</h3>
                                    <div className="text-sm text-gray-400 flex items-center">
                                        <Clock size={14} className="mr-1.5"/>
                                        {formatDuration(stats.totalDuration)} total duration
                                    </div>
                                </div>

                                {!analytics ? (
                                    <div className="p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-700/50 text-gray-400 mb-4">
                                            <BarChart size={32}/>
                                        </div>
                                        <p className="text-lg font-medium mb-2 text-white">Analytics not available</p>
                                        <p className="text-sm text-gray-400 max-w-md mx-auto">
                                            Analytics may take a few minutes to become available after call completion.
                                        </p>
                                        <Button
                                            onClick={refreshAllData}
                                            variant="primary"
                                            className="mt-4"
                                            icon={<RefreshCw size={16}/>}
                                        >
                                            Refresh Data
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Call Summary - Moved to top */}
                                        {analytics?.ultravox?.summary && (
                                            <div className="bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg mb-6">
                                                <h4 className="font-medium text-white mb-2 flex items-center">
                                                    <MessageSquare size={16} className="mr-2 text-primary-400" />
                                                    Call Summary
                                                </h4>
                                                <div className="bg-dark-800/50 p-4 rounded-lg">
                                                    <p className="text-gray-300">{analytics.ultravox.summary}</p>
                                                    {analytics.ultravox.short_summary && (
                                                        <div className="mt-4 pt-4 border-t border-dark-700">
                                                            <h5 className="text-sm font-medium text-gray-400 mb-2">Short Summary</h5>
                                                            <p className="text-gray-300">{analytics.ultravox.short_summary}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Key Metrics Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <StatCard
                                                title="Total Messages"
                                                value={stats.totalMessages}
                                            />
                                            <StatCard
                                                title="Call Duration"
                                                value={formatDuration(stats.totalDuration)}
                                            />
                                            <StatCard
                                                title="Agent/User Messages"
                                                value={`${stats.agentMessages}/${stats.userMessages}`}
                                            />
                                        </div>

                                        {/* Voice-only Messages */}
                                        {stats.messagesWithoutText > 0 && (
                                            <div className="bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg mb-6">
                                                <div className="text-gray-400 text-sm mb-1">Voice-only Inputs</div>
                                                <div className="text-2xl font-bold text-white">{stats.messagesWithoutText} messages</div>
                                                <div className="text-sm text-gray-400 mt-1">
                                                    These are voice inputs without transcribed text
                                                </div>
                                            </div>
                                        )}

                                        {/* Duration sources */}
                                        <div className="bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg mb-6">
                                            <h4 className="font-medium text-white mb-2">Duration Details</h4>
                                            <div className="text-sm text-gray-300">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="mb-1">
                                                            <span className="text-gray-400">Calculated:</span> {formatDuration(stats.totalDuration)}
                                                        </p>
                                                        {analytics?.plivo?.call_duration && (
                                                            <p className="mb-1">
                                                                <span className="text-gray-400">Plivo:</span> {formatDuration(analytics.plivo.call_duration)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        {analytics?.ultravox?.created && analytics?.ultravox?.ended && (
                                                            <p className="mb-1">
                                                                <span className="text-gray-400">Ultravox:</span> {
                                                                formatDuration(
                                                                    Math.round(
                                                                        (new Date(analytics.ultravox.ended) -
                                                                            new Date(analytics.ultravox.created)) / 1000
                                                                    )
                                                                )
                                                            }
                                                            </p>
                                                        )}
                                                        {analytics?.combined?.total_duration && (
                                                            <p className="mb-1">
                                                                <span className="text-gray-400">Combined:</span> {formatDuration(analytics.combined.total_duration)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Message Statistics - Simplified without removed metrics */}
                                        {transcription.length > 0 && (
                                            <div className="bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg mb-6">
                                                <h4 className="font-medium text-white mb-2">Message Statistics</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-dark-800/50 p-3 rounded-lg">
                                                        <p className="text-xs text-gray-400">Agent Messages</p>
                                                        <p className="text-lg font-bold text-white">{stats.agentMessages}</p>
                                                    </div>
                                                    <div className="bg-dark-800/50 p-3 rounded-lg">
                                                        <p className="text-xs text-gray-400">User Messages</p>
                                                        <p className="text-lg font-bold text-white">{stats.userMessages}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Call Information */}
                                        <div className="bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg">
                                            <h4 className="font-medium text-white mb-2">Call Information</h4>
                                            <div className="bg-dark-800/50 p-4 rounded-lg">
                                                {/* Ultravox Data */}
                                                {analytics.ultravox && (
                                                    <div className="mb-4">
                                                        <h5 className="text-sm font-medium text-primary-400 mb-2 flex items-center">
                                                            <Bot size={14} className="mr-1.5"/>
                                                            VT Details
                                                        </h5>
                                                        <div className="space-y-1 text-sm pl-4 border-l-2 border-primary-900/50">
                                                            {analytics.ultravox.created && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Created:</span>
                                                                    <span className="text-white">{new Date(analytics.ultravox.created).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            {analytics.ultravox.joined && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Joined:</span>
                                                                    <span className="text-white">{new Date(analytics.ultravox.joined).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            {analytics.ultravox.ended && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Ended:</span>
                                                                    <span className="text-white">{new Date(analytics.ultravox.ended).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            {analytics.ultravox.end_reason && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">End Reason:</span>
                                                                    <span className="text-white">{analytics.ultravox.end_reason}</span>
                                                                </div>
                                                            )}
                                                            {analytics.ultravox.first_speaker && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">First Speaker:</span>
                                                                    <span className="text-white">{analytics.ultravox.first_speaker}</span>
                                                                </div>
                                                            )}
                                                            {analytics.ultravox.language_hint && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Language:</span>
                                                                    <span className="text-white">{analytics.ultravox.language_hint}</span>
                                                                </div>
                                                            )}
                                                            {analytics.ultravox.voice && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Voice:</span>
                                                                    <span className="text-white">{analytics.ultravox.voice}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Plivo Data */}
                                                {analytics.plivo && (
                                                    <div>
                                                        <h5 className="text-sm font-medium text-blue-400 mb-2 flex items-center">
                                                            <Phone size={14} className="mr-1.5"/>
                                                            Plivo Details
                                                        </h5>
                                                        <div className="space-y-1 text-sm pl-4 border-l-2 border-blue-900/50">
                                                            {analytics.plivo.from_number && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">To:</span>
                                                                    <span className="text-white">{analytics.plivo.to_number}</span>
                                                                </div>
                                                            )}
                                                            {analytics.plivo.call_direction && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Direction:</span>
                                                                    <span className="text-white">{analytics.plivo.call_direction}</span>
                                                                </div>
                                                            )}
                                                            {analytics.plivo.call_duration && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Duration:</span>
                                                                    <span className="text-white">{analytics.plivo.call_duration} seconds</span>
                                                                </div>
                                                            )}
                                                            {analytics.plivo.call_state && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">State:</span>
                                                                    <span className={`text-white px-1.5 py-0.5 rounded-full text-xs ${
                                                                        analytics.plivo.call_state === 'ANSWER'
                                                                            ? 'bg-green-900/50 text-green-300'
                                                                            : 'bg-yellow-900/50 text-yellow-300'
                                                                    }`}>
                                                                        {analytics.plivo.call_state}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {analytics.plivo.initiation_time && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Initiated:</span>
                                                                    <span className="text-white">{analytics.plivo.initiation_time}</span>
                                                                </div>
                                                            )}
                                                            {analytics.plivo.end_time && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Ended:</span>
                                                                    <span className="text-white">{analytics.plivo.end_time}</span>
                                                                </div>
                                                            )}
                                                            {analytics.plivo.hangup_cause_name && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-400">Hangup Cause:</span>
                                                                    <span className="text-white">{analytics.plivo.hangup_cause_name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* AI Analysis Tab */}
                        {activeTab === 'ai-analysis' && (
                            <div>
                                <div className="mb-6 flex justify-between items-center bg-dark-800/30 p-4 rounded-lg">
                                    <h3 className="text-lg font-medium text-white">AI Transcript Analysis</h3>
                                    <div className="text-sm text-gray-400 flex items-center">
                                        <Brain size={14} className="mr-1.5"/>
                                        Powered by OpenAI
                                    </div>
                                </div>

                                <EntityAnalysis
                                    callId={ultravoxCallId}
                                    serverStatus={serverStatus}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Analysis;