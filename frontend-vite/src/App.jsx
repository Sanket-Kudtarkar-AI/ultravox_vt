import React, {useState, useEffect} from 'react';
import {Phone, Activity, PhoneIcon, Clock, Settings, Users, X} from 'lucide-react';
import './App.css';
import CallDetails from './components/CallDetails';
import NewCallForm from './components/NewCallForm';
import RecentCalls from './components/RecentCalls';
import CallStatus from './components/CallStatus';
import Sidebar from './components/Sidebar';
import AgentForm from './components/AgentForm';
import AgentSelector from './components/AgentSelector';

// Generate a unique ID
const generateId = () => `agent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

function App() {
    // App state
    const [currentView, setCurrentView] = useState('dashboard');
    const [activeCall, setActiveCall] = useState(null);
    const [recentCalls, setRecentCalls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);

    // Agent management state
    const [agents, setAgents] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [currentAgent, setCurrentAgent] = useState(null);
    const [isAgentFormOpen, setIsAgentFormOpen] = useState(false);
    const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false);
    const [isEditingAgent, setIsEditingAgent] = useState(false);

    // Call recipient history
    const [savedRecipients, setSavedRecipients] = useState([]);

    // Server status monitoring
    const [serverStatus, setServerStatus] = useState('unknown');

    // API base URL - update this to your actual API endpoint
    const API_BASE_URL = 'http://localhost:5000/api';

    // Load agents and recipients from localStorage on component mount
    useEffect(() => {
        try {
            // Load agents with proper error handling
            const savedAgents = localStorage.getItem('agents');
            if (savedAgents) {
                const parsedAgents = JSON.parse(savedAgents);
                if (Array.isArray(parsedAgents) && parsedAgents.length > 0) {
                    setAgents(parsedAgents);

                    // Set the oldest agent as default selected if none is currently selected
                    if (!selectedAgentId) {
                        const oldestAgent = [...parsedAgents].sort((a, b) =>
                            new Date(a.created_at) - new Date(b.created_at)
                        )[0];
                        setSelectedAgentId(oldestAgent.id);
                    }
                }
            }

            // Load saved recipients with proper error handling
            const savedRecipientsList = localStorage.getItem('recipients');
            if (savedRecipientsList) {
                try {
                    const parsedRecipients = JSON.parse(savedRecipientsList);
                    if (Array.isArray(parsedRecipients)) {
                        setSavedRecipients(parsedRecipients);
                    }
                } catch (error) {
                    console.error('Error parsing saved recipients:', error);
                }
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }, []);

    // Save agents to localStorage when they change
    useEffect(() => {
        try {
            if (agents && agents.length > 0) {
                console.log('Saving agents to localStorage:', agents);
                localStorage.setItem('agents', JSON.stringify(agents));
            } else {
                // Don't overwrite existing agents with an empty array
                const existingAgents = localStorage.getItem('agents');
                if (!existingAgents) {
                    localStorage.setItem('agents', JSON.stringify([]));
                }
            }
        } catch (error) {
            console.error('Error saving agents to localStorage:', error);
        }
    }, [agents]);

    // Save recipients to localStorage when they change
    useEffect(() => {
        try {
            if (savedRecipients && savedRecipients.length > 0) {
                console.log('Saving recipients to localStorage:', savedRecipients);
                localStorage.setItem('recipients', JSON.stringify(savedRecipients));
            } else {
                // Don't overwrite existing recipients with an empty array
                const existingRecipients = localStorage.getItem('recipients');
                if (!existingRecipients) {
                    localStorage.setItem('recipients', JSON.stringify([]));
                }
            }
        } catch (error) {
            console.error('Error saving recipients to localStorage:', error);
        }
    }, [savedRecipients]);

    // Server status check
    const checkServerStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL.replace('/api', '')}/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Add a cache-busting parameter to prevent caching
                cache: 'no-store',
            });

            if (response.ok) {
                setServerStatus('online');
            } else {
                setServerStatus('offline');
            }
        } catch (err) {
            setServerStatus('offline');
        }
    };

    // Check server status every second
    useEffect(() => {
        checkServerStatus(); // Check immediately on mount

        const intervalId = setInterval(() => {
            checkServerStatus();
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    // Fetch recent calls on component mount
    useEffect(() => {
        if (currentView === 'dashboard' || currentView === 'recent-calls') {
            fetchRecentCalls();
        }
    }, [currentView]);

    // Agent management functions
    const handleCreateAgent = () => {
        setCurrentAgent(null);
        setIsEditingAgent(false);
        setIsAgentFormOpen(true);
        setCurrentView('agent-form');
    };

    const handleEditAgent = (agentId) => {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
            setCurrentAgent(agent);
            setIsEditingAgent(true);
            setIsAgentFormOpen(true);
            setCurrentView('agent-form');
        }
    };

    const handleDuplicateAgent = (agentId) => {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
            const duplicateAgent = {
                ...agent,
                id: generateId(),
                name: `${agent.name} (Copy)`,
                created_at: new Date().toISOString()
            };
            setAgents([...agents, duplicateAgent]);
            showNotification('success', `Agent "${agent.name}" duplicated successfully`);
        }
    };

    const handleDeleteAgent = (agentId) => {
        if (window.confirm('Are you sure you want to delete this agent?')) {
            setAgents(agents.filter(a => a.id !== agentId));
            if (selectedAgentId === agentId) {
                setSelectedAgentId(null);
            }
            showNotification('success', 'Agent deleted successfully');
        }
    };

    const handleSaveAgent = (agent) => {
        try {
            if (isEditingAgent) {
                // Update existing agent
                const updatedAgents = agents.map(a => a.id === agent.id ? agent : a);
                console.log('Updating agent:', agent);
                setAgents(updatedAgents);
                showNotification('success', `Agent "${agent.name}" updated successfully`);
            } else {
                // Create new agent
                const newAgent = {
                    ...agent,
                    id: generateId(),
                    created_at: new Date().toISOString()
                };
                console.log('Creating new agent:', newAgent);
                setAgents(prevAgents => {
                    const newAgents = [...prevAgents, newAgent];
                    // Immediately save to localStorage as a safeguard
                    try {
                        localStorage.setItem('agents', JSON.stringify(newAgents));
                    } catch (error) {
                        console.error('Error immediately saving agents to localStorage:', error);
                    }
                    return newAgents;
                });
                showNotification('success', `Agent "${agent.name}" created successfully`);
            }

            setIsAgentFormOpen(false);
            setCurrentView('dashboard');
        } catch (error) {
            console.error('Error saving agent:', error);
            showNotification('error', 'Error saving agent. Please try again.');
        }
    };

    const handleSelectAgent = (agentId) => {
        if (agentId === null) {
            setIsAgentSelectorOpen(true);
        } else {
            setSelectedAgentId(agentId);
            // Open the edit form when selecting an agent
            const agent = agents.find(a => a.id === agentId);
            if (agent) {
                setCurrentAgent(agent);
                setIsEditingAgent(true);
                setIsAgentFormOpen(true);
                setCurrentView('agent-form');
            }
        }
    };

    // Fetch recent calls
    const fetchRecentCalls = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/recent_calls?limit=5`);
            const data = await response.json();

            if (data.status === 'success') {
                setRecentCalls(data.calls);
            } else {
                setError(data.message || 'Failed to fetch recent calls');
            }
        } catch (err) {
            setError('Error connecting to server. Please check your connection.');
            console.error('Error fetching recent calls:', err);
        } finally {
            setLoading(false);
        }
    };

    // Make a new call
    const makeCall = async (callData) => {
        try {
            setLoading(true);

            // Save recipient number if not already saved
            if (callData.recipient_phone_number && !savedRecipients.includes(callData.recipient_phone_number)) {
                setSavedRecipients(prev => {
                    const newRecipients = [...prev, callData.recipient_phone_number];
                    // Immediately save to localStorage
                    try {
                        localStorage.setItem('recipients', JSON.stringify(newRecipients));
                    } catch (error) {
                        console.error('Error saving recipients to localStorage:', error);
                    }
                    return newRecipients;
                });
            }

            // Format initial messages correctly for the API
            const formattedInitialMessages = callData.initial_messages
                ? callData.initial_messages
                    .filter(msg => msg && msg.trim() !== '')
                    .map(message => ({
                        text: message,
                        role: "assistant"
                    }))
                : [];

            // Prepare API call data with correctly formatted initial messages
            const apiCallData = {
                ...callData,
                initial_messages: formattedInitialMessages
            };

            const response = await fetch(`${API_BASE_URL}/make_call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiCallData),
            });

            const data = await response.json();

            if (data.status === 'success') {
                showNotification('success', `Call initiated successfully. Call UUID: ${data.call_uuid}`);
                setActiveCall({
                    ...callData,
                    call_uuid: data.call_uuid,
                    status: 'initiated',
                    timestamp: data.timestamp
                });
                setCurrentView('call-status');
            } else {
                showNotification('error', data.message || 'Failed to initiate call');
            }
        } catch (err) {
            showNotification('error', 'Error connecting to server. Please check your connection.');
            console.error('Error making call:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get call status
    const getCallStatus = async (callUuid) => {
        if (!callUuid) return;

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/call_status/${callUuid}`);
            const data = await response.json();

            if (data.status === 'success') {
                setActiveCall(prev => ({
                    ...prev,
                    details: data.details,
                    call_status: data.call_status,
                    lastUpdated: new Date().toISOString()
                }));
                return data;
            } else {
                console.error('Error in call status response:', data.message);
                showNotification('error', data.message || 'Failed to fetch call status');
                return null;
            }
        } catch (err) {
            console.error('Error fetching call status:', err);
            showNotification('error', 'Error connecting to server. Please check your connection.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // View call details
    const viewCallDetails = (call) => {
        setActiveCall(call);
        setCurrentView('call-details');
    };

    // Display notification
    const showNotification = (type, message) => {
        setNotification({type, message});
        // Clear notification after 5 seconds
        setTimeout(() => {
            setNotification(null);
        }, 5000);
    };

    return (
        <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                agents={agents}
                selectedAgentId={selectedAgentId}
                onSelectAgent={handleSelectAgent}
                onCreateAgent={handleCreateAgent}
                onDeleteAgent={handleDeleteAgent}
                onDuplicateAgent={handleDuplicateAgent}
                onEditAgent={handleEditAgent}
                serverStatus={serverStatus}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-900 to-gray-800">
                {/* Notification */}
                {notification && (
                    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg flex items-start z-50 animate-slide-in-left ${
                        notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                        <div className="flex-1">{notification.message}</div>
                        <button
                            onClick={() => setNotification(null)}
                            className="ml-4 text-white/80 hover:text-white"
                        >
                            <X size={18}/>
                        </button>
                    </div>
                )}

                {/* Dashboard View */}
                {currentView === 'dashboard' && (
                    <div className="p-6 text-gray-300">
                        <h1 className="text-3xl font-bold mb-6 text-white">Dashboard</h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700 animate-fade-in animation-delay-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-white">Quick Actions</h3>
                                    <Phone className="text-blue-400"/>
                                </div>
                                <button
                                    onClick={() => setCurrentView('new-call')}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
                                >
                                    <Phone size={18} className="mr-2"/>
                                    <span>Make a New Call</span>
                                </button>
                            </div>

                            <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700 animate-fade-in animation-delay-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-white">My Agents</h3>
                                    <Users className="text-blue-400"/>
                                </div>
                                {agents.length > 0 ? (
                                    <div className="space-y-2">
                                        {agents.slice(0, 3).map((agent) => (
                                            <div key={agent.id}
                                                 className="flex items-center justify-between py-2 border-b border-gray-700">
                                                <div>
                                                    <div className="font-medium text-white">{agent.name}</div>
                                                    <div className="text-sm text-gray-400">
                                                        {agent.settings.voice} • {
                                                        agent.settings.language_hint === 'hi' ? 'Hindi' :
                                                            agent.settings.language_hint === 'en' ? 'English' : 'Marathi'
                                                    }
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleEditAgent(agent.id)}
                                                    className="text-sm px-2 py-1 bg-gray-700 text-blue-400 hover:bg-gray-600 rounded transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setCurrentView('agents')}
                                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center mt-2"
                                        >
                                            View all agents
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-gray-400 mb-3">No agents created yet.</p>
                                        <button
                                            onClick={handleCreateAgent}
                                            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                                        >
                                            Create Your First Agent
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700 animate-fade-in animation-delay-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-white">Recent Activity</h3>
                                    <Clock className="text-blue-400"/>
                                </div>
                                {loading ? (
                                    <p className="text-gray-400">Loading recent calls...</p>
                                ) : recentCalls.length > 0 ? (
                                    <div className="space-y-2">
                                        {recentCalls.slice(0, 3).map((call, index) => (
                                            <div key={index}
                                                 className="flex items-center justify-between py-2 border-b border-gray-700">
                                                <div>
                                                    <div className="font-medium text-white">{call.to_number}</div>
                                                    <div
                                                        className="text-sm text-gray-400">{new Date(call.initiation_time).toLocaleString()}</div>
                                                </div>
                                                <span className={`text-sm px-2 py-1 rounded-full ${
                                                    call.call_state === 'ANSWER' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                                                }`}>
                                                    {call.call_state}
                                                </span>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setCurrentView('recent-calls')}
                                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center mt-2"
                                        >
                                            View all calls
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-gray-400">No recent calls</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* New Call View */}
                {currentView === 'new-call' && (
                    <div className="p-6 text-gray-300">
                        <h1 className="text-3xl font-bold mb-6 text-white">Make a New Call</h1>
                        <NewCallForm
                            onSubmit={makeCall}
                            loading={loading}
                            agents={agents}
                            selectedAgentId={selectedAgentId}
                            onSelectAgent={handleSelectAgent}
                            savedRecipients={savedRecipients}
                        />
                    </div>
                )}

                {/* Agent Form View */}
                {currentView === 'agent-form' && (
                    <div className="p-6 text-gray-300">
                        <AgentForm
                            agent={currentAgent}
                            isEditing={isEditingAgent}
                            onSave={handleSaveAgent}
                            onCancel={() => setCurrentView('dashboard')}
                            loading={loading}
                        />
                    </div>
                )}

                {/* Call Status View */}
                {currentView === 'call-status' && activeCall && (
                    <div className="p-6 text-gray-300">
                        <h1 className="text-3xl font-bold mb-6 text-white">Call Status</h1>
                        <CallStatus
                            call={activeCall}
                            onRefreshStatus={() => getCallStatus(activeCall.call_uuid)}
                            loading={loading}
                        />
                        <div className="mt-4 flex space-x-4">
                            <button
                                onClick={() => setCurrentView('dashboard')}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Back to Dashboard
                            </button>
                            <button
                                onClick={() => setCurrentView('new-call')}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                                Make Another Call
                            </button>
                        </div>
                    </div>
                )}

                {/* Recent Calls View */}
                {currentView === 'recent-calls' && (
                    <div className="p-6 text-gray-300">
                        <h1 className="text-3xl font-bold mb-6 text-white">Recent Calls</h1>
                        <RecentCalls
                            calls={recentCalls}
                            loading={loading}
                            onRefresh={fetchRecentCalls}
                            onViewDetails={viewCallDetails}
                        />
                    </div>
                )}

                {/* Call Details View */}
                {currentView === 'call-details' && activeCall && (
                    <div className="p-6 text-gray-300">
                        <h1 className="text-3xl font-bold mb-6 text-white">Call Details</h1>
                        <CallDetails
                            call={activeCall}
                            onRefreshStatus={() => getCallStatus(activeCall.call_uuid)}
                            loading={loading}
                        />
                        <div className="mt-4">
                            <button
                                onClick={() => setCurrentView('recent-calls')}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Back to Recent Calls
                            </button>
                        </div>
                    </div>
                )}

                {/* Settings View */}
                {currentView === 'settings' && (
                    <div className="p-6 text-gray-300">
                        <h1 className="text-3xl font-bold mb-6 text-white">Settings</h1>
                        <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700">
                            <h2 className="text-xl font-medium mb-4 text-white">API Configuration</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">API Base URL</label>
                                    <input
                                        type="text"
                                        value={API_BASE_URL}
                                        readOnly
                                        className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                                    />
                                </div>
                                <p className="text-sm text-gray-400">
                                    To change the API URL, update the API_BASE_URL constant in the App.jsx file.
                                </p>
                            </div>
                        </div>

                        {/* Saved Recipients Management */}
                        <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700 mt-6">
                            <h2 className="text-xl font-medium mb-4 text-white">Saved Recipients</h2>
                            {savedRecipients.length > 0 ? (
                                <div className="space-y-2">
                                    {savedRecipients.map((recipient, index) => (
                                        <div key={index}
                                             className="flex items-center justify-between py-2 border-b border-gray-700">
                                            <div className="font-medium text-white">{recipient}</div>
                                            <button
                                                onClick={() => {
                                                    const newList = [...savedRecipients];
                                                    newList.splice(index, 1);
                                                    setSavedRecipients(newList);
                                                }}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <X size={16}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400">No recipients saved yet. Recipients will be automatically
                                    saved when you make calls.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Agent Selector Modal */}
            <AgentSelector
                isOpen={isAgentSelectorOpen}
                onClose={() => setIsAgentSelectorOpen(false)}
                agents={agents}
                onSelectAgent={setSelectedAgentId}
                onCreateNewAgent={handleCreateAgent}
            />
        </div>
    );
}

export default App;