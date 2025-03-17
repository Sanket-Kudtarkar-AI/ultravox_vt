import React, {useState, useEffect} from 'react';
import {Phone, Activity, Phone as PhoneIcon, Clock, Users, Settings, ChevronRight, X} from 'lucide-react';
import './App.css';
import CallDetails from './components/CallDetails';
import NewCallForm from './components/NewCallForm';
import RecentCalls from './components/RecentCalls';
import CallStatus from './components/CallStatus';

function App() {
    const [currentView, setCurrentView] = useState('dashboard');
    const [activeCall, setActiveCall] = useState(null);
    const [recentCalls, setRecentCalls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);

    // API base URL - update this to your actual API endpoint
    const API_BASE_URL = 'http://localhost:5000/api';

    // Fetch recent calls on component mount
    useEffect(() => {
        if (currentView === 'dashboard' || currentView === 'recent-calls') {
            fetchRecentCalls();
        }
    }, [currentView]);

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
    // Update the makeCall function in App.jsx to handle the new form structure

    const makeCall = async (callData) => {
        try {
            setLoading(true);

            // Transform the form data to the API expected format
            const apiCallData = {
                recipient_phone_number: callData.recipient_phone_number,
                plivo_phone_number: callData.plivo_phone_number,
                system_prompt: callData.system_prompt,
                language_hint: callData.language_hint,
                max_duration: callData.max_duration,
                voice: callData.voice,
                // Add additional parameters if your API supports them
                vad_settings: callData.vad_settings,
                recording_enabled: callData.recording_enabled
            };

            // Handle initial messages if any were provided
            if (callData.initial_messages && callData.initial_messages.length > 0) {
                apiCallData.initial_messages = callData.initial_messages;
            }

            // Handle inactivity messages if any were provided
            if (callData.inactivity_messages && callData.inactivity_messages.length > 0) {
                apiCallData.inactivity_messages = callData.inactivity_messages;
            }

            const response = await fetch(`${API_BASE_URL}/make_call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiCallData),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setNotification({
                    type: 'success',
                    message: `Call initiated successfully. Call UUID: ${data.call_uuid}`
                });
                setActiveCall({
                    ...apiCallData,
                    call_uuid: data.call_uuid,
                    status: 'initiated',
                    timestamp: data.timestamp
                });
                setCurrentView('call-status');
            } else {
                setNotification({
                    type: 'error',
                    message: data.message || 'Failed to initiate call'
                });
            }
        } catch (err) {
            setNotification({
                type: 'error',
                message: 'Error connecting to server. Please check your connection.'
            });
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
                setError(data.message || 'Failed to fetch call status');
                return null;
            }
        } catch (err) {
            setError('Error connecting to server. Please check your connection.');
            console.error('Error fetching call status:', err);
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

    // Clear notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Navigation items
    const navItems = [
        {id: 'dashboard', icon: <Activity size={20}/>, label: 'Dashboard'},
        {id: 'new-call', icon: <Phone size={20}/>, label: 'New Call'},
        {id: 'recent-calls', icon: <Clock size={20}/>, label: 'Recent Calls'},
        {id: 'settings', icon: <Settings size={20}/>, label: 'Settings'},
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="bg-gradient-to-b from-gray-900 to-gray-800 w-64 p-4 flex flex-col">
                <div className="text-white text-xl font-bold mb-8 flex items-center">
                    <PhoneIcon className="mr-2 text-blue-400"/>
                    <span>AI Call Manager</span>
                </div>

                <nav className="flex-1">
                    <ul className="space-y-2">
                        {navItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => setCurrentView(item.id)}
                                    className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                                        currentView === item.id
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                                >
                                    <div className="mr-3">{item.icon}</div>
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="mt-auto pt-4 border-t border-gray-700">
                    <div className="text-gray-400 text-sm">
                        <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                            <span>Server Status: Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-900 to-gray-800">
                {/* Notification */}
                {notification && (
                    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg flex items-start z-50 ${
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
                            <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700">
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

                            <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700">
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
                                            <ChevronRight size={16}/>
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-gray-400">No recent calls</p>
                                )}
                            </div>

                            <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-white">System Status</h3>
                                    <Activity className="text-blue-400"/>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-gray-400">Server</span>
                                            <span className="text-sm text-green-400 font-medium">Online</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full w-full"></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-gray-400">API Connection</span>
                                            <span className="text-sm text-green-400 font-medium">Connected</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full w-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Call View */}
                {currentView === 'new-call' && (
                    <div className="p-6 text-gray-300">
                        <h1 className="text-3xl font-bold mb-6 text-white">Make a New Call</h1>
                        <NewCallForm onSubmit={makeCall} loading={loading}/>
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
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;