import React, {useState, useEffect} from 'react';
import {X, Search, Phone, User, Check, Plus, Mic} from 'lucide-react';
import Button from './ui/Button';

const AgentSelector = ({
                           isOpen,
                           onClose,
                           agents,
                           onSelectAgent,
                           onCreateNewAgent,
                           selectedAgentId,
                           closeOnOutsideClick = true

                       }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredAgents, setFilteredAgents] = useState(agents);

    // Update filtered agents when search term or agents changes
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredAgents(agents);
        } else {
            const filtered = agents.filter(agent =>
                agent.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredAgents(filtered);
        }
    }, [searchTerm, agents]);

    // Escape key to close modal
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    // Modified handler to close the modal when creating a new agent
    const handleCreateNewAgent = () => {
        onCreateNewAgent();
        onClose(); // Close the modal when creating a new agent

    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in"
            onClick={closeOnOutsideClick ? onClose : undefined}>
            <div
                className="bg-gradient-to-b from-dark-800 to-dark-900 rounded-xl shadow-lg w-full max-w-2xl border border-dark-700 max-h-[80vh] flex flex-col animate-slide-in-up"
                onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
            >


                <div
                    className="flex justify-between items-center border-b border-dark-700 p-4 bg-dark-800/50 backdrop-blur-sm">
                    <h2 className="text-xl font-semibold text-white">Select an Agent</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-dark-700/70 transition-colors"
                    >
                        <X size={20}/>
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-dark-700 bg-dark-800/30">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-500"/>
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search agents..."
                            className="w-full pl-10 pr-4 py-2 border border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-dark-700/70 text-white"
                        />
                    </div>
                </div>

                {/* Agent List */}
                <div className="overflow-y-auto flex-grow">
                    {filteredAgents.length === 0 ? (
                        <div className="p-8 text-center">
                            <div
                                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-700/50 text-primary-400 mb-4">
                                <Phone size={24} className="animate-pulse"/>
                            </div>
                            <p className="text-gray-300 font-medium">{searchTerm ? 'No agents match your search' : 'No agents available'}</p>
                            <p className="text-gray-400 mt-1 mb-4">{searchTerm ? 'Try a different search term or create a new agent' : 'Create your first agent to get started'}</p>
                            <Button
                                onClick={handleCreateNewAgent}
                                variant="primary"
                                size="md"
                                icon={<Plus size={16}/>}
                            >
                                Create New Agent
                            </Button>
                        </div>
                    ) : (
                        <ul className="divide-y divide-dark-700">
                            {filteredAgents.map((agent, idx) => (
                                <li key={idx}>
                                    <div
                                        className="flex items-center justify-between px-4 py-2 hover:bg-dark-600 text-white">
                                        <button
                                            type="button"
                                            className="flex-grow text-left flex items-center transition-colors"
                                            onClick={() => {
                                                console.log("Selected agent:", agent); // Debug
                                                onSelectAgent(agent.agent_id);  // Use agent_id not id
                                                onClose();
                                            }}
                                        >
                                            <Mic size={14} className="mr-2 text-gray-400"/>
                                            {agent.name}
                                            {agent.agent_id === selectedAgentId && (
                                                <Check size={14} className="ml-2 text-green-500"/>
                                            )}
                                        </button>
                                        {/* No additional action buttons needed here */}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-dark-700 p-4 flex justify-between bg-dark-800/20">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        size="md"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateNewAgent}
                        variant="primary"
                        size="md"
                        icon={<Plus size={16}/>}
                    >
                        Create New Agent
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AgentSelector;