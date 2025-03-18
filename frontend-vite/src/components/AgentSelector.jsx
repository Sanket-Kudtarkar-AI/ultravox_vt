import React, { useState, useEffect } from 'react';
import { X, Search, Phone, User, Check, Plus } from 'lucide-react';

const AgentSelector = ({
  isOpen,
  onClose,
  agents,
  onSelectAgent,
  onCreateNewAgent
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl border border-gray-700 max-h-[80vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-700 p-4">
          <h2 className="text-xl font-semibold text-white">Select an Agent</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
            />
          </div>
        </div>

        {/* Agent List */}
        <div className="overflow-y-auto flex-grow">
          {filteredAgents.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Phone size={24} className="mx-auto mb-2" />
              <p>{searchTerm ? 'No agents match your search' : 'No agents available'}</p>
              <button
                onClick={handleCreateNewAgent}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center mx-auto"
              >
                <Plus size={16} className="mr-1" />
                Create New Agent
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {filteredAgents.map(agent => (
                <li key={agent.id}>
                  <button
                    onClick={() => {
                      onSelectAgent(agent.id);
                      onClose();
                    }}
                    className="w-full px-4 py-3 hover:bg-gray-700 text-left transition-colors flex items-center"
                  >
                    <div className="rounded-full bg-gray-700 p-2 mr-3">
                      <User size={16} className="text-blue-400" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-white font-medium">{agent.name}</h3>
                      <p className="text-gray-400 text-sm">
                        {agent.settings.voice} • {
                          agent.settings.language_hint === 'hi' ? 'Hindi' :
                          agent.settings.language_hint === 'en' ? 'English' : 'Marathi'
                        }
                      </p>
                    </div>
                    <div className="text-gray-400">
                      <Check size={16} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateNewAgent}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
          >
            <Plus size={16} className="mr-1" />
            Create New Agent
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentSelector;