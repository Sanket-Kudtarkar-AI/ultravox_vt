import React, {useState, useEffect} from 'react';
import {v4 as uuidv4} from 'uuid';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NewCallForm from './components/NewCallForm';
import CallStatus from './components/CallStatus';
import RecentCalls from './components/RecentCalls';
import CallDetails from './components/CallDetails';
import Analysis from './components/Analysis';
import AgentSelector from './components/AgentSelector';
import AgentForm from './components/AgentForm';
import CampaignManager from './components/CampaignManager';
import Settings from './components/Settings';
import {
    getAgents,
    getPhoneNumbers,
    savePhoneNumber,
    updateNumberUsage,
    deletePhoneNumber,
    getServerStatus,
    createAgent,
    updateAgent,
    deleteAgent,
    getCallStatus
} from './utils/api';

function App() {
    // Server Status
    const [serverStatus, setServerStatus] = useState('checking');

    // Current view/page
    const [currentView, setCurrentView] = useState('dashboard');

    // Agents state
    const [agents, setAgents] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [agentToEdit, setAgentToEdit] = useState(null);
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [isLoadingAgents, setIsLoadingAgents] = useState(true);

    // Phone numbers state
    const [savedRecipients, setSavedRecipients] = useState([]);
    const [savedFromNumbers, setSavedFromNumbers] = useState([]);
    const [isLoadingPhoneNumbers, setIsLoadingPhoneNumbers] = useState(true);

    // Call state
    const [activeCall, setActiveCall] = useState(null);
    const [selectedCall, setSelectedCall] = useState(null);
    const [isLoadingCall, setIsLoadingCall] = useState(false);
    const [callForAnalysis, setCallForAnalysis] = useState(null);

    // Current page for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [callsPerPage] = useState(20);


    const [recentCalls, setRecentCalls] = useState([]);

    // Check server status on component mount and at regular intervals
    useEffect(() => {
        const checkServerStatus = async () => {
            const status = await getServerStatus();
            setServerStatus(status.status);
        };

        // Check immediately on component mount
        checkServerStatus();

        // Then check every 5 seconds
        const intervalId = setInterval(checkServerStatus, 5000);

        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
    }, []);

    // useEffect to fetch recent calls
    useEffect(() => {
        const fetchRecentCalls = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/recent_calls?limit=5');
                const data = await response.json();
                if (data.status === 'success') {
                    setRecentCalls(data.calls);
                } else {
                    console.error('Error fetching recent calls:', data.message);
                }
            } catch (error) {
                console.error('Error fetching recent calls:', error);
            }
        };

        fetchRecentCalls();
    }, []);

    // Add useEffect to monitor isCreatingAgent changes for debugging
    useEffect(() => {
        console.log("isCreatingAgent changed to:", isCreatingAgent);
    }, [isCreatingAgent]);

    // Fetch agents from API on component mount
    useEffect(() => {
        const fetchAgents = async () => {
            setIsLoadingAgents(true);
            try {
                const response = await getAgents();
                if (response.status === 'success') {
                    // Sort agents by creation date (oldest first)
                    const sortedAgents = response.agents.sort((a, b) => {
                        const dateA = new Date(a.created_at || 0);
                        const dateB = new Date(b.created_at || 0);
                        return dateA - dateB; // Ascending order (oldest first)
                    });

                    setAgents(sortedAgents);

                    // ALWAYS select the first (oldest) agent if any agents are available
                    if (sortedAgents.length > 0) {
                        setSelectedAgentId(sortedAgents[0].agent_id);
                    }
                } else {
                    console.error('Error fetching agents:', response.message);
                }
            } catch (error) {
                console.error('Error fetching agents:', error);
            } finally {
                setIsLoadingAgents(false);
            }
        };

        fetchAgents();
    }, []);

    // Fetch saved phone numbers from API on component mount
    useEffect(() => {
        const fetchPhoneNumbers = async () => {
            setIsLoadingPhoneNumbers(true);
            try {
                // Fetch recipient numbers
                const recipientsResponse = await getPhoneNumbers('recipient');
                if (recipientsResponse.status === 'success') {
                    // Sort by last_used (newest first)
                    const sortedRecipients = recipientsResponse.phone_numbers
                        .sort((a, b) => new Date(b.last_used) - new Date(a.last_used))
                        .map(number => number.phone_number);
                    setSavedRecipients(sortedRecipients);
                }

                // Fetch from numbers
                const fromResponse = await getPhoneNumbers('from');
                if (fromResponse.status === 'success') {
                    // Sort by last_used (newest first)
                    const sortedFromNumbers = fromResponse.phone_numbers
                        .sort((a, b) => new Date(b.last_used) - new Date(a.last_used))
                        .map(number => number.phone_number);
                    setSavedFromNumbers(sortedFromNumbers);
                }
            } catch (error) {
                console.error('Error fetching saved phone numbers:', error);
            } finally {
                setIsLoadingPhoneNumbers(false);
            }
        };

        fetchPhoneNumbers();
    }, []);

    // Handle agent selection
    const handleSelectAgent = (agentId) => {
        if (agentId === null) {
            setIsAgentModalOpen(true);
        } else {
            setSelectedAgentId(agentId);
        }
    };

    // Handle agent creation
    const handleCreateAgent = () => {
        setAgentToEdit(null);
        setIsCreatingAgent(true);
    };

    // Handle agent editing
    const handleEditAgent = (agentId) => {
        console.log("Edit agent called with ID:", agentId);
        console.log("Available agents:", agents);

        // Find the agent in our state
        const agent = agents.find(a => a.agent_id === agentId);
        console.log("Found agent:", agent);

        if (agent) {
            // Format the agent data for the form
            const formattedAgent = {
                id: agent.agent_id,
                name: agent.name,
                system_prompt: agent.system_prompt,
                // Parse JSON strings back to objects if needed
                initial_messages: typeof agent.initial_messages === 'string'
                    ? JSON.parse(agent.initial_messages)
                    : agent.initial_messages,
                settings: typeof agent.settings === 'string'
                    ? JSON.parse(agent.settings)
                    : agent.settings
            };

            console.log("Formatted agent for form:", formattedAgent);
            setAgentToEdit(formattedAgent);
            setIsCreatingAgent(true);

            // Close the agent modal if it's open
            if (isAgentModalOpen) {
                setIsAgentModalOpen(false);
            }
        } else {
            console.error('Agent not found with ID:', agentId);
        }
    };

    // Handle agent duplication
    const handleDuplicateAgent = async (agentId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/agents/duplicate/${agentId}`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Refresh the agents list to show the new agent
                const agentsResponse = await getAgents();
                if (agentsResponse.status === 'success') {
                    // Sort by creation date before updating state
                    const sortedAgents = agentsResponse.agents.sort((a, b) => {
                        const dateA = new Date(a.created_at || 0);
                        const dateB = new Date(b.created_at || 0);
                        return dateA - dateB; // Oldest first
                    });

                    setAgents(sortedAgents);
                    alert('Agent duplicated successfully');
                }
            } else {
                console.error('Error duplicating agent:', data.message);
                alert(`Error duplicating agent: ${data.message}`);
            }
        } catch (error) {
            console.error('Error duplicating agent:', error);
            alert('Error duplicating agent. Please try again.');
        }
    };

    // Handle agent deletion
    const handleDeleteAgent = async (agentId) => {
        console.log("Delete called with agent ID:", agentId);
        console.log("All agents:", agents);

        // Add confirmation for safety
        if (window.confirm('Are you sure you want to delete this agent?')) {
            try {
                // Only proceed if we have a valid ID
                if (!agentId) {
                    alert('Cannot delete agent: ID is undefined');
                    return;
                }

                const response = await deleteAgent(agentId);

                if (response.status === 'success') {
                    // Remove agent from local state
                    setAgents(prev => prev.filter(agent => agent.agent_id !== agentId));

                    // If the deleted agent was selected, clear the selection
                    if (selectedAgentId === agentId) {
                        setSelectedAgentId(null);
                    }

                    // Show success notification
                    alert('Agent deleted successfully');
                } else {
                    console.error('Error deleting agent:', response.message);
                    alert(`Error deleting agent: ${response.message}`);
                }
            } catch (error) {
                console.error('Error deleting agent:', error);
                alert('Error deleting agent. Please try again.');
            }
        }
    };

    // Handle agent save (create or update)
    const handleSaveAgent = async (agentData) => {
        setIsLoadingAgents(true);
        console.log("About to save agent data:", agentData);

        try {
            let response;

            if (agentData.id) {
                // If the agent has an ID, it's an update
                response = await updateAgent(agentData.id, agentData);
            } else {
                // Otherwise it's a new agent
                response = await createAgent(agentData);
            }

            if (response.status === 'success') {
                // Refresh the agents list to show the new/updated agent
                const agentsResponse = await getAgents();
                if (agentsResponse.status === 'success') {
                    // Sort by creation date before updating state
                    const sortedAgents = agentsResponse.agents.sort((a, b) => {
                        const dateA = new Date(a.created_at || 0);
                        const dateB = new Date(b.created_at || 0);
                        return dateA - dateB; // Oldest first
                    });

                    setAgents(sortedAgents);

                    // If it was a new agent, select it
                    if (!agentData.id && response.agent) {
                        setSelectedAgentId(response.agent.agent_id);
                    }
                }

                // Close the creation modal
                setIsCreatingAgent(false);
            } else {
                console.error('Error saving agent:', response.message);
                alert(`Error saving agent: ${response.message}`);
            }
        } catch (error) {
            console.error('Error saving agent:', error);
            alert('Error saving agent. Please try again.');
        } finally {
            setIsLoadingAgents(false);
        }
    };

    // Handle adding a new recipient phone number
    const handleAddRecipient = async (phoneNumber) => {
        try {
            const response = await savePhoneNumber({
                phone_number: phoneNumber,
                number_type: 'recipient'
            });

            if (response.status === 'success') {
                // Update the savedRecipients state
                setSavedRecipients(prev => {
                    // Add to the beginning of the array if it doesn't exist
                    if (!prev.includes(phoneNumber)) {
                        return [phoneNumber, ...prev];
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error('Error saving recipient number:', error);
        }
    };

    // Handle removing a recipient phone number
    const handleRemoveRecipient = async (index) => {
        try {
            const phoneNumber = savedRecipients[index];

            // Find the phone number ID by making a request to get it by number
            const response = await getPhoneNumbers();

            if (response.status === 'success') {
                const numberToDelete = response.phone_numbers.find(
                    num => num.phone_number === phoneNumber && num.number_type === 'recipient'
                );

                if (numberToDelete) {
                    // Delete the phone number
                    await deletePhoneNumber(numberToDelete.id);

                    // Update the local state
                    setSavedRecipients(prev => prev.filter((_, i) => i !== index));
                }
            }
        } catch (error) {
            console.error('Error removing recipient number:', error);
        }
    };

    // Handle adding a new from phone number
    const handleAddFromNumber = async (phoneNumber) => {
        try {
            const response = await savePhoneNumber({
                phone_number: phoneNumber,
                number_type: 'from'
            });

            if (response.status === 'success') {
                // Update the savedFromNumbers state
                setSavedFromNumbers(prev => {
                    // Add to the beginning of the array if it doesn't exist
                    if (!prev.includes(phoneNumber)) {
                        return [phoneNumber, ...prev];
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error('Error saving from number:', error);
        }
    };

    // Handle removing a from phone number
    const handleRemoveFromNumber = async (index) => {
        try {
            const phoneNumber = savedFromNumbers[index];

            // Find the phone number ID by making a request to get it by number
            const response = await getPhoneNumbers();

            if (response.status === 'success') {
                const numberToDelete = response.phone_numbers.find(
                    num => num.phone_number === phoneNumber && num.number_type === 'from'
                );

                if (numberToDelete) {
                    // Delete the phone number
                    await deletePhoneNumber(numberToDelete.id);

                    // Update the local state
                    setSavedFromNumbers(prev => prev.filter((_, i) => i !== index));
                }
            }
        } catch (error) {
            console.error('Error removing from number:', error);
        }
    };

    // Refresh call status function with improved handling
    const refreshCallStatus = async () => {
        if (!activeCall || !activeCall.call_uuid) return;

        try {
            const response = await getCallStatus(activeCall.call_uuid);

            if (response.status === 'success') {
                // Get current status
                const newStatus = response.call_status ||
                    (response.phase === 'completed' ? 'completed' : 'unknown');

                // Only add to history if status has changed
                const lastStatus = activeCall.statusHistory &&
                activeCall.statusHistory.length > 0 ?
                    activeCall.statusHistory[activeCall.statusHistory.length - 1].status : null;

                // Normalize status names for better timeline display
                let displayStatus = newStatus;
                if (response.phase === 'completed' && response.details && response.details.call_state === 'ANSWER') {
                    displayStatus = 'completed';
                } else if (newStatus.toLowerCase() === 'in-progress') {
                    displayStatus = 'in-progress';
                } else if (newStatus.toLowerCase() === 'ringing') {
                    displayStatus = 'ringing';
                }

                // Only update if status changed and avoid duplicates
                if (displayStatus !== lastStatus) {
                    setActiveCall(prev => ({
                        ...prev,
                        phase: response.phase,
                        call_status: newStatus,
                        details: response.details,
                        timestamp: new Date().toISOString(),
                        statusHistory: [
                            ...(prev.statusHistory || []),
                            {status: displayStatus, time: new Date().toISOString()}
                        ]
                    }));
                } else {
                    // Update without adding to history
                    setActiveCall(prev => ({
                        ...prev,
                        phase: response.phase,
                        call_status: newStatus,
                        details: response.details,
                        timestamp: new Date().toISOString()
                    }));
                }
            } else {
                console.error('Error refreshing call status:', response.message);
            }
        } catch (error) {
            console.error('Error refreshing call status:', error);
        }
    };

    // Handle initiating a call
    const handleMakeCall = async (callData) => {
        setIsLoadingCall(true);

        // Add the agent ID if an agent is selected
        if (selectedAgentId) {
            callData.agent_id = selectedAgentId;
        }

        try {
            // Make the API request to initiate the call
            const response = await fetch('http://localhost:5000/api/make_call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(callData),
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Update phone number usage
                if (callData.recipient_phone_number) {
                    await updateNumberUsage(callData.recipient_phone_number);
                }

                if (callData.plivo_phone_number) {
                    await updateNumberUsage(callData.plivo_phone_number);
                }

                // Initialize the active call with phase info
                const activeCallData = {
                    ...data,
                    phase: 'live', // Start with live phase
                    call_status: 'initiating',
                    statusHistory: [
                        {status: 'initiating', time: new Date().toISOString()}
                    ],
                    // Add other call data
                    recipient_phone_number: callData.recipient_phone_number,
                    plivo_phone_number: callData.plivo_phone_number,
                    system_prompt: callData.system_prompt
                };

                // Set the active call with initialTimestamp and switch to the call status view
                const activeCallDataWithInitialTime = {
                    ...activeCallData,
                    initialTimestamp: new Date().toISOString()  // Store the initial time once
                };
                setActiveCall(activeCallDataWithInitialTime);
                setCurrentView('call-status');
            } else {
                console.error('Error making call:', data.message);
                alert(`Error making call: ${data.message}`);
            }
        } catch (error) {
            console.error('Error making call:', error);
            alert('Error making call. Please try again.');
        } finally {
            setIsLoadingCall(false);
        }
    };

    // Handle viewing call details
    const handleViewCallDetails = (call) => {
        setSelectedCall(call);
        setCurrentView('call-details');
    };

    // Handle viewing call analysis
    const handleViewCallAnalysis = (call) => {
        setCallForAnalysis(call);
        setCurrentView('call-analysis');
    };

    // Render the main content based on the current view
    const renderMainContent = () => {
        switch (currentView) {
            case 'dashboard':
                return (
                    <Dashboard
                        recentCalls={recentCalls} // Pass actual recentCalls instead of empty array
                        agents={agents}
                        onCreateAgent={handleCreateAgent}
                        onSelectAgent={handleEditAgent}
                        onViewDetails={handleViewCallDetails}
                        setCurrentView={setCurrentView}
                    />
                );
            case 'new-call':
                return (
                    <NewCallForm
                        onSubmit={handleMakeCall}
                        loading={isLoadingCall}
                        agents={agents}
                        selectedAgentId={selectedAgentId}
                        onSelectAgent={handleSelectAgent}
                        savedRecipients={savedRecipients}
                        savedFromNumbers={savedFromNumbers}
                        onRemoveRecipient={handleRemoveRecipient}
                        onRemoveFromNumber={handleRemoveFromNumber}
                        onAddRecipient={handleAddRecipient}
                        onAddFromNumber={handleAddFromNumber}
                    />
                );
            case 'call-status':
                return (
                    <CallStatus
                        call={activeCall}
                        onRefreshStatus={refreshCallStatus}
                        loading={isLoadingCall}
                        onViewAnalysis={handleViewCallAnalysis}
                    />
                );
            case 'recent-calls':
                return (
                    <RecentCalls
                        onViewDetails={handleViewCallDetails}
                        onViewAnalysis={handleViewCallAnalysis}
                        setCurrentView={setCurrentView} // Add this prop
                    />
                );
            case 'call-details':
                return (
                    <CallDetails
                        call={selectedCall}
                        onRefreshStatus={() => {/* Implement refresh */
                        }}
                        loading={false}
                        onViewAnalysis={handleViewCallAnalysis}
                        onBack={() => setCurrentView('recent-calls')} // Add this prop
                    />
                );
            case 'call-analysis':
                return (
                    <Analysis
                        callId={callForAnalysis?.ultravox_id || callForAnalysis?.vtCallId}
                        callUuid={callForAnalysis?.call_uuid}
                        onClose={() => setCurrentView('recent-calls')}
                        serverStatus={serverStatus}
                    />
                );
            case 'campaign-manager':
                return (
                    <CampaignManager
                        agents={agents}
                        onBack={() => setCurrentView('dashboard')}
                        onCreateAgent={handleCreateAgent}
                        savedFromNumbers={savedFromNumbers}
                        API_BASE_URL="http://localhost:5000/api"
                    />
                );
            case 'settings':
                return (
                    <Settings setCurrentView={setCurrentView}/>
                );
            default:
                return <div>404 - View not found</div>;
        }
    };

    return (
        <div className="flex h-screen bg-dark-900 text-white">
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

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto">
                {renderMainContent()}
            </div>

            {/* Agent Selector Modal */}
            <AgentSelector
                isOpen={isAgentModalOpen}
                onClose={() => setIsAgentModalOpen(false)}
                agents={agents}
                onSelectAgent={handleSelectAgent}
                onCreateNewAgent={handleCreateAgent}
                selectedAgentId={selectedAgentId}
                closeOnOutsideClick={true} // Add this prop
            />

            {/* Agent Form Modal - For creating and editing agents */}
            {isCreatingAgent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={(e) => {
                        // Only close if clicking the backdrop, not the form itself
                        if (e.target === e.currentTarget) setIsCreatingAgent(false);
                    }}
                >
                    <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                        <AgentForm
                            agent={agentToEdit}
                            isEditing={!!agentToEdit}
                            onSave={handleSaveAgent}
                            onCancel={() => setIsCreatingAgent(false)}
                            loading={isLoadingAgents}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;