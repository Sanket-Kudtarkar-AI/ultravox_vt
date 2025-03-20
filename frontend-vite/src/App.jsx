import React, {useState, useEffect} from 'react';
import {Phone, BarChart, Bell, CheckCircle, XCircle, AlertTriangle, X} from 'lucide-react';
import './App.css';
import CallDetails from './components/CallDetails';
import NewCallForm from './components/NewCallForm';
import RecentCalls from './components/RecentCalls';
import CallStatus from './components/CallStatus';
import Sidebar from './components/Sidebar';
import AgentForm from './components/AgentForm';
import AgentSelector from './components/AgentSelector';
import Analysis from './components/Analysis';
import Dashboard from './components/Dashboard';
import PageLayout from './components/ui/PageLayout';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';

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

  // Call from number history
  const [savedFromNumbers, setSavedFromNumbers] = useState([]);

  // Server status monitoring
  const [serverStatus, setServerStatus] = useState('unknown');

  // Call analysis state
  const [callAnalysisData, setCallAnalysisData] = useState(null);

  // Pagination for call history
  const [currentPage, setCurrentPage] = useState(1);
  const [callsPerPage, setCallsPerPage] = useState(10);

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
            if (oldestAgent) {
              setSelectedAgentId(oldestAgent.id);
            }
          } else {
            // Check if the selected agent still exists after reloading
            const agentExists = parsedAgents.some(agent => agent.id === selectedAgentId);
            if (!agentExists) {
              // Reset selectedAgentId if the agent no longer exists
              setSelectedAgentId(parsedAgents[0]?.id || null);
            }
          }
        } else {
          // If no agents exist, ensure selectedAgentId is null
          setSelectedAgentId(null);
        }
      } else {
        // If no agents are stored, ensure selectedAgentId is null
        setSelectedAgentId(null);
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

      // Load saved from numbers
      const savedFromNumbersList = localStorage.getItem('fromNumbers');
      if (savedFromNumbersList) {
        try {
          const parsedFromNumbers = JSON.parse(savedFromNumbersList);
          if (Array.isArray(parsedFromNumbers)) {
            setSavedFromNumbers(parsedFromNumbers);
          }
        } catch (error) {
          console.error('Error parsing saved from numbers:', error);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      setSelectedAgentId(null); // Reset on error
    }
  }, []);

  // Save agents to localStorage when they change
  useEffect(() => {
    try {
      if (agents && agents.length > 0) {
        localStorage.setItem('agents', JSON.stringify(agents));
      }
    } catch (error) {
      console.error('Error saving agents to localStorage:', error);
    }
  }, [agents]);

  // Save recipients to localStorage when they change
  useEffect(() => {
    try {
      if (savedRecipients && savedRecipients.length > 0) {
        localStorage.setItem('recipients', JSON.stringify(savedRecipients));
      }
    } catch (error) {
      console.error('Error saving recipients to localStorage:', error);
    }
  }, [savedRecipients]);

  // Save from numbers to localStorage when they change
  useEffect(() => {
    try {
      if (savedFromNumbers && savedFromNumbers.length > 0) {
        localStorage.setItem('fromNumbers', JSON.stringify(savedFromNumbers));
      }
    } catch (error) {
      console.error('Error saving from numbers to localStorage:', error);
    }
  }, [savedFromNumbers]);

  // Server status check
  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/status`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
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
    const intervalId = setInterval(checkServerStatus, 1000);
    return () => clearInterval(intervalId);
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
      setAgents(prevAgents => {
        const updatedAgents = prevAgents.filter(a => a.id !== agentId);

        // If we're deleting the currently selected agent
        if (selectedAgentId === agentId) {
          // Select another agent if available, otherwise set to null
          if (updatedAgents.length > 0) {
            setSelectedAgentId(updatedAgents[0].id);
          } else {
            setSelectedAgentId(null);
          }
        }

        return updatedAgents;
      });

      showNotification('success', 'Agent deleted successfully');
    }
  };

  const handleSaveAgent = (agent) => {
    try {
      if (isEditingAgent) {
        // Update existing agent
        const updatedAgents = agents.map(a => a.id === agent.id ? agent : a);
        setAgents(updatedAgents);
        showNotification('success', `Agent "${agent.name}" updated successfully`);
      } else {
        // Create new agent
        const newAgent = {
          ...agent,
          id: generateId(),
          created_at: new Date().toISOString()
        };
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
      // Open the edit form when selecting an agent from the sidebar
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
      const response = await fetch(`${API_BASE_URL}/recent_calls?limit=20`); // Increased limit for pagination
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
          // Put the most recent at the beginning
          const newRecipients = [callData.recipient_phone_number, ...prev.filter(r => r !== callData.recipient_phone_number)];
          // Immediately save to localStorage
          try {
            localStorage.setItem('recipients', JSON.stringify(newRecipients));
          } catch (error) {
            console.error('Error saving recipients to localStorage:', error);
          }
          return newRecipients;
        });
      } else if (callData.recipient_phone_number) {
        // Move used number to front of the list
        setSavedRecipients(prev => {
          const newRecipients = [callData.recipient_phone_number, ...prev.filter(r => r !== callData.recipient_phone_number)];
          localStorage.setItem('recipients', JSON.stringify(newRecipients));
          return newRecipients;
        });
      }

      // Save from number if not already saved or move to front if used
      if (callData.plivo_phone_number) {
        setSavedFromNumbers(prev => {
          const newFromNumbers = [callData.plivo_phone_number, ...prev.filter(n => n !== callData.plivo_phone_number)];
          try {
            localStorage.setItem('fromNumbers', JSON.stringify(newFromNumbers));
          } catch (error) {
            console.error('Error saving from numbers to localStorage:', error);
          }
          return newFromNumbers;
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
        showNotification('success', `Call initiated successfully`);
        setActiveCall({
          ...callData,
          call_uuid: data.call_uuid,
          ultravoxCallId: data.ultravox_call_id, // Store Ultravox call ID
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

  // View call analysis
  const viewCallAnalysis = (call) => {
    // For Ultravox calls, we need both the callId from Ultravox and the callUuid from Plivo
    setLoading(true);

    // If this call already has a stored Ultravox callId (from an active call or details response)
    if (call.ultravox_call_id) {
      setCallAnalysisData({
        callUuid: call.call_uuid,
        ultravoxCallId: call.ultravox_call_id,
        callDetails: call
      });
      setCurrentView('call-analysis');
      setLoading(false);
    }
    // Check for the old property name (used in frontend only)
    else if (call.ultravoxCallId) {
      setCallAnalysisData({
        callUuid: call.call_uuid,
        ultravoxCallId: call.ultravoxCallId,
        callDetails: call
      });
      setCurrentView('call-analysis');
      setLoading(false);
    }
    // Check if the Ultravox ID is in the details object
    else if (call.details && call.details.ultravox_call_id) {
      setCallAnalysisData({
        callUuid: call.call_uuid,
        ultravoxCallId: call.details.ultravox_call_id,
        callDetails: call
      });
      setCurrentView('call-analysis');
      setLoading(false);
    }
    // If this is from call history, fetch the mapping from backend
    else {
      // Fetch the mapping from the backend
      fetch(`${API_BASE_URL}/call_mapping/${call.call_uuid}`)
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success' && data.mapping) {
            setCallAnalysisData({
              callUuid: call.call_uuid,
              ultravoxCallId: data.mapping.ultravox_call_id,
              callDetails: call
            });
            setCurrentView('call-analysis');
          } else {
            // If mapping not found, still show analysis but with limited functionality
            setCallAnalysisData({
              callUuid: call.call_uuid,
              ultravoxCallId: null,
              callDetails: call,
              mappingNotFound: true
            });
            setCurrentView('call-analysis');
            showNotification('warning', 'Limited analysis available: Ultravox data mapping not found');
          }
        })
        .catch(err => {
          console.error('Error fetching call mapping:', err);
          // Still show analysis with limited functionality
          setCallAnalysisData({
            callUuid: call.call_uuid,
            ultravoxCallId: null,
            callDetails: call,
            mappingNotFound: true
          });
          setCurrentView('call-analysis');
          showNotification('error', 'Error retrieving call analysis data');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  // Display notification
  const showNotification = (type, message) => {
    const notificationId = Date.now();
    setNotification({type, message, id: notificationId});
    // Clear notification after 5 seconds
    setTimeout(() => {
      setNotification(prev => prev && prev.id === notificationId ? null : prev);
    }, 5000);
  };

  // Handle pagination
  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentCalls = recentCalls.slice(indexOfFirstCall, indexOfLastCall);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Show all calls
  const handleViewAllCalls = () => {
    setCurrentView('recent-calls');
  };

  // Render content based on current view
  const renderContent = () => {
    switch(currentView) {
      case 'dashboard':
        return (
          <Dashboard
            recentCalls={recentCalls}
            agents={agents}
            onCreateAgent={handleCreateAgent}
            onSelectAgent={handleSelectAgent}
            onViewDetails={viewCallDetails}
            setCurrentView={setCurrentView}
            onViewAllCalls={handleViewAllCalls}
          />
        );

      case 'new-call':
        return (
          <PageLayout
            title="Make a New Call"
            subtitle="Start a new AI-powered call with your selected agent"
          >
            <NewCallForm
              onSubmit={makeCall}
              loading={loading}
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={handleSelectAgent}
              savedRecipients={savedRecipients}
              savedFromNumbers={savedFromNumbers}
              onRemoveRecipient={(index) => {
                const newList = [...savedRecipients];
                newList.splice(index, 1);
                setSavedRecipients(newList);
                localStorage.setItem('recipients', JSON.stringify(newList));
              }}
              onRemoveFromNumber={(index) => {
                const newList = [...savedFromNumbers];
                newList.splice(index, 1);
                setSavedFromNumbers(newList);
                localStorage.setItem('fromNumbers', JSON.stringify(newList));
              }}
            />
          </PageLayout>
        );

      case 'agent-form':
        return (
          <AgentForm
            agent={currentAgent}
            isEditing={isEditingAgent}
            onSave={handleSaveAgent}
            onCancel={() => setCurrentView('dashboard')}
            loading={loading}
          />
        );

      case 'call-status':
        return activeCall && (
          <PageLayout
            title="Call Status"
            subtitle="Monitor your active call"
            actions={
              <>
                <Button
                  onClick={() => viewCallAnalysis(activeCall)}
                  variant="primary"
                  icon={<BarChart size={18} />}
                >
                  View Analysis
                </Button>
                <Button
                  onClick={() => setCurrentView('new-call')}
                  variant="secondary"
                  icon={<Phone size={18} />}
                >
                  New Call
                </Button>
              </>
            }
          >
            <CallStatus
              call={activeCall}
              onRefreshStatus={() => getCallStatus(activeCall.call_uuid)}
              loading={loading}
            />
          </PageLayout>
        );

      case 'recent-calls':
        return (
          <PageLayout title="Recent Calls" subtitle="View your call history">
            <RecentCalls
              calls={currentCalls}
              loading={loading}
              onRefresh={fetchRecentCalls}
              onViewDetails={viewCallDetails}
              onViewAnalysis={viewCallAnalysis}
              currentPage={currentPage}
              callsPerPage={callsPerPage}
              totalCalls={recentCalls.length}
              paginate={paginate}
            />
          </PageLayout>
        );

      case 'call-details':
        return activeCall && (
          <PageLayout
            title="Call Details"
            subtitle={`Call to ${activeCall.to_number || activeCall.recipient_phone_number}`}
            onBack={() => setCurrentView('recent-calls')}
          >
            <CallDetails
              call={activeCall}
              onRefreshStatus={() => getCallStatus(activeCall.call_uuid)}
              loading={loading}
              onViewAnalysis={viewCallAnalysis}
            />
          </PageLayout>
        );

      case 'call-analysis':
        return callAnalysisData && (
          <Analysis
            callId={callAnalysisData.ultravoxCallId}
            callUuid={callAnalysisData.callUuid}
            onClose={() => setCurrentView('recent-calls')}
            serverStatus={serverStatus}
          />
        );

      case 'settings':
        return (
          <PageLayout title="Settings" subtitle="Configure your application">
            <div className="space-y-6">
              {/* API Configuration */}
              <div className="bg-dark-800/40 rounded-xl shadow-lg p-6 border border-dark-700">
                <h2 className="text-xl font-medium mb-4 text-white">API Configuration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">API Base URL</label>
                    <input
                      type="text"
                      value={API_BASE_URL}
                      readOnly
                      className="w-full px-3 py-2 border border-dark-600 rounded-lg bg-dark-700/70 text-white"
                    />
                  </div>
                  <p className="text-sm text-gray-400">
                    To change the API URL, update the API_BASE_URL constant in the App.jsx file.
                  </p>
                </div>
              </div>

              {/* Saved Recipients Management */}
              <div className="bg-dark-800/40 rounded-xl shadow-lg p-6 border border-dark-700">
                <h2 className="text-xl font-medium mb-4 text-white">Saved Recipients</h2>
                {savedRecipients.length > 0 ? (
                  <div className="space-y-2">
                    {savedRecipients.map((recipient, index) => (
                      <div key={index}
                        className="flex items-center justify-between py-2 px-3 border-b border-dark-700 bg-dark-700/30 rounded-lg">
                        <div className="font-medium text-white flex items-center">
                          <Phone size={16} className="mr-2 text-primary-400" />
                          {recipient}
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const newList = [...savedRecipients];
                            newList.splice(index, 1);
                            setSavedRecipients(newList);
                            localStorage.setItem('recipients', JSON.stringify(newList));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No recipients saved yet. Recipients will be automatically
                    saved when you make calls.</p>
                )}
              </div>

              {/* Saved From Numbers Management */}
              <div className="bg-dark-800/40 rounded-xl shadow-lg p-6 border border-dark-700">
                <h2 className="text-xl font-medium mb-4 text-white">Saved From Numbers</h2>
                {savedFromNumbers.length > 0 ? (
                  <div className="space-y-2">
                    {savedFromNumbers.map((number, index) => (
                      <div key={index}
                        className="flex items-center justify-between py-2 px-3 border-b border-dark-700 bg-dark-700/30 rounded-lg">
                        <div className="font-medium text-white flex items-center">
                          <Phone size={16} className="mr-2 text-primary-400" />
                          {number}
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const newList = [...savedFromNumbers];
                            newList.splice(index, 1);
                            setSavedFromNumbers(newList);
                            localStorage.setItem('fromNumbers', JSON.stringify(newList));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No from numbers saved yet. From numbers will be automatically
                    saved when you make calls.</p>
                )}
              </div>
            </div>
          </PageLayout>
        );

      default:
        return (
          <PageLayout title="404" subtitle="Page not found">
            <div className="text-center p-12">
              <p className="text-gray-400">The requested page could not be found.</p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setCurrentView('dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          </PageLayout>
        );
    }
  };

  // Render notification
  const renderNotification = () => {
    if (!notification) return null;

    const getNotificationStyles = (type) => {
      switch(type) {
        case 'success':
          return {
            bg: 'bg-gradient-to-r from-green-900/80 to-green-800/80',
            border: 'border-green-700',
            text: 'text-green-300',
            icon: <CheckCircle size={18} className="text-green-400" />
          };
        case 'warning':
          return {
            bg: 'bg-gradient-to-r from-yellow-900/80 to-yellow-800/80',
            border: 'border-yellow-700',
            text: 'text-yellow-300',
            icon: <AlertTriangle size={18} className="text-yellow-400" />
          };
        case 'error':
          return {
            bg: 'bg-gradient-to-r from-red-900/80 to-red-800/80',
            border: 'border-red-700',
            text: 'text-red-300',
            icon: <XCircle size={18} className="text-red-400" />
          };
        default:
          return {
            bg: 'bg-gradient-to-r from-dark-800/80 to-dark-700/80',
            border: 'border-dark-600',
            text: 'text-gray-300',
            icon: <Bell size={18} className="text-gray-400" />
          };
      }
    };

    const styles = getNotificationStyles(notification.type);

    return (
      <div className={`fixed top-4 right-4 z-50 max-w-md p-3 rounded-lg shadow-xl border ${styles.border} ${styles.bg} backdrop-blur-sm animate-slide-in-left`}>
        <div className={`flex items-center ${styles.text}`}>
          <div className="mr-3">{styles.icon}</div>
          <div className="flex-1">{notification.message}</div>
          <button
            onClick={() => setNotification(null)}
            className="ml-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-dark-700/50"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Update call status more frequently in call-status view
  useEffect(() => {
    let interval;
    if (currentView === 'call-status' && activeCall && activeCall.call_uuid) {
      interval = setInterval(() => {
        getCallStatus(activeCall.call_uuid);
      }, 500); // Update every 500ms (0.5 seconds)
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentView, activeCall]);

  return (
      <div className="flex h-screen w-screen bg-gradient-to-b from-dark-900 to-dark-950 overflow-hidden">
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
        <div className="flex-1 overflow-auto bg-gradient-to-b from-dark-900 to-dark-950 text-gray-200 custom-scrollbar">
          <div className="lg:pl-0 pl-12">  {/* Add left padding on mobile to prevent overlap */}
            {renderNotification()}
            {renderContent()}
          </div>
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