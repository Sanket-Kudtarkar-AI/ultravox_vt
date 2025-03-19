import React, {useState, useEffect} from 'react';
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
    AlertTriangle
} from 'lucide-react';

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

const Analysis = ({callId, callUuid, onClose, serverStatus}) => {
    const [activeTab, setActiveTab] = useState('transcription');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [transcription, setTranscription] = useState([]);
    const [recordingUrl, setRecordingUrl] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioTime, setAudioTime] = useState(0);
    const audioRef = React.useRef(null);

    // Check if Ultravox data is available
    const ultravoxDataAvailable = !!callId;

    // API base URL - update this to your actual API endpoint
    const API_BASE_URL = 'http://localhost:5000/api';

    // Fetch call transcription on component mount
    useEffect(() => {
        if (callId && serverStatus === 'online') {
            fetchTranscription();
            fetchRecordingUrl();
            fetchAnalytics();
        }
    }, [callId, serverStatus]);

    // Fetch call transcription
    const fetchTranscription = async () => {
        if (!ultravoxDataAvailable) return;

        try {
            setLoading(true);
            setError(null);

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
        if (!ultravoxDataAvailable) return;

        try {
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
        if (!ultravoxDataAvailable) return;

        try {
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
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
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
        <div
            className="bg-gradient-to-b from-dark-900 to-dark-800 rounded-xl shadow-lg overflow-hidden border border-dark-700">
            {/* Header */}
            <div
                className="p-6 border-b border-dark-700 flex justify-between items-center bg-dark-800/50 backdrop-blur-sm">
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
                        onClick={fetchTranscription}
                        disabled={loading || serverStatus !== 'online' || !ultravoxDataAvailable}
                        className="flex items-center px-3 py-1.5 text-sm bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`}/>
                        Refresh
                    </button>
                </div>
            </div>

            {!ultravoxDataAvailable ? (
                <div className="p-12 text-center">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-900/30 text-yellow-400 mb-4">
                        <AlertTriangle size={32}/>
                    </div>
                    <p className="text-lg font-medium mb-2 text-white">Ultravox data mapping not found</p>
                    <p className="text-sm text-gray-400 max-w-md mx-auto">
                        The system couldn't find a mapping between this call and its Ultravox data.
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
                                        <div
                                            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/30 text-red-400 mb-4">
                                            <XCircle size={32}/>
                                        </div>
                                        <p className="text-lg font-medium mb-2 text-white">Could not load
                                            transcription</p>
                                        <p className="text-sm text-gray-400 max-w-md mx-auto">{error}</p>
                                        <p className="text-sm mt-4 text-gray-500">
                                            Note: Transcription may take a few minutes to become available after call
                                            completion.
                                        </p>
                                    </div>
                                ) : transcription.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div
                                            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-700/50 text-gray-400 mb-4">
                                            <MessageSquare size={32}/>
                                        </div>
                                        <p className="text-lg font-medium mb-2 text-white">No transcription
                                            available</p>
                                        <p className="text-sm text-gray-400 max-w-md mx-auto">
                                            Transcription may take a few minutes to become available after call
                                            completion.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                                        {transcription.map((message, index) => (
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
                                                            <div
                                                                className="p-1.5 rounded-lg bg-primary-900/50 text-primary-400 mr-2">
                                                                <Bot size={14}/>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className="p-1.5 rounded-lg bg-dark-700/70 text-gray-400 mr-2">
                                                                <User size={14}/>
                                                            </div>
                                                        )}
                                                        <span className="font-medium text-white">
                              {message.role === 'MESSAGE_ROLE_AGENT' || message.role === 'assistant' ? 'Agent' : 'User'}
                            </span>
                                                    </div>
                                                    <div
                                                        className="text-xs text-gray-400 bg-dark-700/50 px-2 py-0.5 rounded">
                                                        {formatTimestamp(message.timestamp)}
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
                                            </div>
                                        ))}
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
                                        <div
                                            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-700/50 text-gray-400 mb-4">
                                            <FileAudio size={32}/>
                                        </div>
                                        <p className="text-lg font-medium mb-2 text-white">Recording not available</p>
                                        <p className="text-sm text-gray-400 max-w-md mx-auto">
                                            Recordings may take a few minutes to become available after call completion.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-dark-800/50 backdrop-blur-sm p-6 rounded-lg">
                                        <div className="mb-6">
                                            <div className="relative">
                                                <div
                                                    className="flex items-center justify-center bg-dark-700/50 py-4 mb-4 rounded-lg">
                                                    {isPlaying ? (
                                                        <Activity className="text-primary-400 animate-pulse" size={64}/>
                                                    ) : (
                                                        <FileAudio className="text-gray-500" size={64}/>
                                                    )}
                                                </div>
                                                <audio
                                                    ref={audioRef}
                                                    controls
                                                    className="w-full h-12 [&::-webkit-media-controls-panel]:bg-dark-700"
                                                >
                                                    <source src={recordingUrl} type="audio/wav"/>
                                                    Your browser does not support the audio element.
                                                </audio>
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
                                        title="Message Ratio"
                                        value={`${stats.agentMessages}:${stats.userMessages}`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <StatCard
                                        title="Avg. Agent Response Length"
                                        value={`${stats.avgAgentResponseLength} chars`}
                                        className="bg-primary-900/20"
                                    />
                                    <StatCard
                                        title="Avg. User Response Length"
                                        value={`${stats.avgUserResponseLength} chars`}
                                        className="bg-dark-700/70"
                                    />
                                </div>

                                {stats.messagesWithoutText > 0 && (
                                    <div className="bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg mb-6">
                                        <div className="text-gray-400 text-sm mb-1">Voice-only Inputs</div>
                                        <div
                                            className="text-2xl font-bold text-white">{stats.messagesWithoutText} messages
                                        </div>
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
                                                    <span
                                                        className="text-gray-400">Calculated:</span> {formatDuration(stats.totalDuration)}
                                                </p>
                                                {analytics?.plivo?.call_duration && (
                                                    <p className="mb-1">
                                                        <span
                                                            className="text-gray-400">Plivo:</span> {formatDuration(analytics.plivo.call_duration)}
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
                                                        <span
                                                            className="text-gray-400">Combined:</span> {formatDuration(analytics.combined.total_duration)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Message Statistics */}
                                {transcription.length > 0 && (
                                    <div className="bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg mb-6">
                                        <h4 className="font-medium text-white mb-2">Message Statistics</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-dark-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-400">Agent Messages</p>
                                                <p className="text-lg font-bold text-white">{stats.agentMessages}</p>
                                            </div>
                                            <div className="bg-dark-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-400">User Messages</p>
                                                <p className="text-lg font-bold text-white">{stats.userMessages}</p>
                                            </div>
                                            <div className="bg-dark-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-400">Agent Response %</p>
                                                <p className="text-lg font-bold text-white">
                                                    {stats.totalMessages > 0
                                                        ? Math.round((stats.agentMessages / stats.totalMessages) * 100)
                                                        : 0}%
                                                </p>
                                            </div>
                                            <div className="bg-dark-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-400">Voice-only %</p>
                                                <p className="text-lg font-bold text-white">
                                                    {stats.totalMessages > 0
                                                        ? Math.round((stats.messagesWithoutText / stats.totalMessages) * 100)
                                                        : 0}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Call Information */}
                                {analytics && (
                                    <div className="bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg">
                                        <h4 className="font-medium text-white mb-2">Call Information</h4>
                                        <div className="bg-dark-800/50 p-4 rounded-lg">
                                            {/* Ultravox Data */}
                                            {analytics.ultravox && (
                                                <div className="mb-4">
                                                    <h5 className="text-sm font-medium text-primary-400 mb-2 flex items-center">
                                                        <Bot size={14} className="mr-1.5"/>
                                                        Ultravox Details
                                                    </h5>
                                                    <div
                                                        className="space-y-1 text-sm pl-4 border-l-2 border-primary-900/50">
                                                        {analytics.ultravox.created && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Created:</span>
                                                                <span
                                                                    className="text-white">{new Date(analytics.ultravox.created).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {analytics.ultravox.joined && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Joined:</span>
                                                                <span
                                                                    className="text-white">{new Date(analytics.ultravox.joined).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {analytics.ultravox.ended && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Ended:</span>
                                                                <span
                                                                    className="text-white">{new Date(analytics.ultravox.ended).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {analytics.ultravox.end_reason && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">End Reason:</span>
                                                                <span
                                                                    className="text-white">{analytics.ultravox.end_reason}</span>
                                                            </div>
                                                        )}
                                                        {analytics.ultravox.first_speaker && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">First Speaker:</span>
                                                                <span
                                                                    className="text-white">{analytics.ultravox.first_speaker}</span>
                                                            </div>
                                                        )}
                                                        {analytics.ultravox.language_hint && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Language:</span>
                                                                <span
                                                                    className="text-white">{analytics.ultravox.language_hint}</span>
                                                            </div>
                                                        )}
                                                        {analytics.ultravox.voice && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Voice:</span>
                                                                <span
                                                                    className="text-white">{analytics.ultravox.voice}</span>
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
                                                    <div
                                                        className="space-y-1 text-sm pl-4 border-l-2 border-blue-900/50">
                                                        {analytics.plivo.from_number && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">To:</span>
                                                                <span
                                                                    className="text-white">{analytics.plivo.to_number}</span>
                                                            </div>
                                                        )}
                                                        {analytics.plivo.call_direction && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Direction:</span>
                                                                <span
                                                                    className="text-white">{analytics.plivo.call_direction}</span>
                                                            </div>
                                                        )}
                                                        {analytics.plivo.call_duration && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Duration:</span>
                                                                <span
                                                                    className="text-white">{analytics.plivo.call_duration} seconds</span>
                                                            </div>
                                                        )}
                                                        {analytics.plivo.call_state && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">State:</span>
                                                                <span
                                                                    className={`text-white px-1.5 py-0.5 rounded-full text-xs ${
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
                                                                <span
                                                                    className="text-white">{analytics.plivo.initiation_time}</span>
                                                            </div>
                                                        )}
                                                        {analytics.plivo.end_time && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Ended:</span>
                                                                <span
                                                                    className="text-white">{analytics.plivo.end_time}</span>
                                                            </div>
                                                        )}
                                                        {analytics.plivo.hangup_cause_name && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Hangup Cause:</span>
                                                                <span
                                                                    className="text-white">{analytics.plivo.hangup_cause_name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Call Summary */}
                                {analytics?.ultravox?.summary && (
                                    <div className="bg-dark-700/50 backdrop-blur-sm p-4 rounded-lg mt-6">
                                        <h4 className="font-medium text-white mb-2">Call Summary</h4>
                                        <div className="bg-dark-800/50 p-4 rounded-lg">
                                            <p className="text-gray-300 italic">{analytics.ultravox.summary}</p>
                                            {analytics.ultravox.short_summary && (
                                                <div className="mt-4 pt-4 border-t border-dark-700">
                                                    <h5 className="text-sm font-medium text-gray-400 mb-2">Short
                                                        Summary</h5>
                                                    <p className="text-gray-300">{analytics.ultravox.short_summary}</p>
                                                </div>
                                            )}
                                        </div>
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