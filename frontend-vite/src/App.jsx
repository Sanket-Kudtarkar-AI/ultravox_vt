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
import {
    getAgents,
    getPhoneNumbers,
    savePhoneNumber,
    updateNumberUsage,
    deletePhoneNumber,
    getServerStatus
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

    // Fetch agents from API on component mount
    useEffect(() => {
        const fetchAgents = async () => {
            setIsLoadingAgents(true);
            try {
                const response = await getAgents();
                if (response.status === 'success') {
                    setAgents(response.agents);

                    // If we have agents and none is selected, select the first one
                    if (response.agents.length > 0 && !selectedAgentId) {
                        setSelectedAgentId(response.agents[0].agent_id);
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
        const agent = agents.find(a => a.agent_id === agentId);
        setAgentToEdit(agent);
        setIsCreatingAgent(true);
    };

    // Handle agent duplication
    const handleDuplicateAgent = async (agentId) => {
        // This should now call the API to duplicate
        console.log('Duplicating agent:', agentId);
        // API call would go here
    };

    // Handle agent deletion
    const handleDeleteAgent = async (agentId) => {
        // This should now call the API to delete
        console.log('Deleting agent:', agentId);
        // API call would go here
    };

    // Handle agent save (create or update)
    const handleSaveAgent = async (agent) => {
        // This should now call the API to save
        console.log('Saving agent:', agent);
        // API call would go here
        setIsCreatingAgent(false);
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

                // Set the active call and switch to the call status view
                setActiveCall(data);
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
                        recentCalls={[]} // This would now be fetched from the API as needed
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
                        onRefreshStatus={() => {/* Implement refresh */
                        }}
                        loading={false}
                        onViewAnalysis={handleViewCallAnalysis}
                    />
                );
            case 'recent-calls':
                return (
                    <RecentCalls
                        onViewDetails={handleViewCallDetails}
                        onViewAnalysis={handleViewCallAnalysis}
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
            />

            {/* Agent Form Modal - For creating and editing agents */}
            {isCreatingAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-4xl">
                        <AgentForm
                            agent={agentToEdit}
                            isEditing={!!agentToEdit}
                            onSave={handleSaveAgent}
                            onCancel={() => setIsCreatingAgent(false)}
                            loading={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;