import React, { useState } from 'react';
import {
  Activity,
  Phone,
  Clock,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Edit
} from 'lucide-react';

const Sidebar = ({
  currentView,
  setCurrentView,
  agents,
  selectedAgentId,
  onSelectAgent,
  onCreateAgent,
  onDeleteAgent,
  onDuplicateAgent,
  onEditAgent,
  serverStatus = 'unknown' // Default value if prop not passed
}) => {
  const [isAgentsExpanded, setIsAgentsExpanded] = useState(true);

  // Helper to get the status indicator color and text
  const getServerStatusInfo = () => {
    switch(serverStatus) {
      case 'online':
        return { color: 'green', text: 'Online' };
      case 'offline':
        return { color: 'red', text: 'Offline' };
      default:
        return { color: 'yellow', text: 'Checking...' };
    }
  };

  const statusInfo = getServerStatusInfo();

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-800 w-64 p-4 flex flex-col">
      <div className="text-white text-xl font-bold mb-8 flex items-center animate-fade-in">
        <Phone className="mr-2 text-blue-400"/>
        <span>AI Call Manager</span>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {/* Dashboard item */}
          <li className="animate-slide-in-left" style={{animationDelay: '50ms'}}>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <div className="mr-3"><Activity size={18} /></div>
              <span>Dashboard</span>
            </button>
          </li>

          {/* Agents section with collapsible list */}
          <li className="mt-4 animate-slide-in-left" style={{animationDelay: '100ms'}}>
            <div className="mb-1 flex items-center justify-between px-2 text-sm text-gray-500 font-medium">
              <span>AGENTS</span>
              <button
                onClick={() => onCreateAgent()}
                className="p-0.5 text-gray-400 hover:text-blue-400 rounded focus:outline-none"
                title="Create New Agent"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Toggle button for expanding/collapsing agents list */}
            <button
              onClick={() => setIsAgentsExpanded(!isAgentsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors mb-1"
            >
              <div className="flex items-center">
                <div className="mr-3"><Phone size={18} /></div>
                <span>My Agents</span>
              </div>
              {isAgentsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* List of agents */}
            {isAgentsExpanded && (
              <ul className="pl-8 space-y-1">
                {agents.length === 0 ? (
                  <li className="text-sm text-gray-500 py-1 px-3 animate-fade-in">
                    No agents created yet
                  </li>
                ) : (
                  agents.map((agent, index) => (
                    <li key={agent.id} className="relative group animate-fade-in" style={{animationDelay: `${150 + index * 50}ms`}}>
                      <button
                        onClick={() => onSelectAgent(agent.id)}
                        className={`w-full text-left flex items-center py-1.5 px-3 text-sm rounded-lg transition-colors ${
                          selectedAgentId === agent.id
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                        }`}
                      >
                        {agent.name}
                      </button>

                      {/* Action buttons - visible on hover */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden group-hover:flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAgent(agent.id);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-400 rounded focus:outline-none"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateAgent(agent.id);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-400 rounded focus:outline-none"
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAgent(agent.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 rounded focus:outline-none"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </li>

          {/* Other navigation items */}
          <li className="mt-4 animate-slide-in-left" style={{animationDelay: '150ms'}}>
            <div className="mb-1 px-2 text-sm text-gray-500 font-medium">
              CALLS
            </div>
          </li>
          <li className="animate-slide-in-left" style={{animationDelay: '200ms'}}>
            <button
              onClick={() => setCurrentView('new-call')}
              className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                currentView === 'new-call'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <div className="mr-3"><Phone size={18} /></div>
              <span>New Call</span>
            </button>
          </li>
          <li className="animate-slide-in-left" style={{animationDelay: '250ms'}}>
            <button
              onClick={() => setCurrentView('recent-calls')}
              className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                currentView === 'recent-calls'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <div className="mr-3"><Clock size={18} /></div>
              <span>Recent Calls</span>
            </button>
          </li>

          {/* Settings at the bottom */}
          <li className="mt-4 animate-slide-in-left" style={{animationDelay: '300ms'}}>
            <div className="mb-1 px-2 text-sm text-gray-500 font-medium">
              SYSTEM
            </div>
          </li>
          <li className="animate-slide-in-left" style={{animationDelay: '350ms'}}>
            <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                currentView === 'settings'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <div className="mr-3"><Settings size={18} /></div>
              <span>Settings</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-700 animate-fade-in" style={{animationDelay: '400ms'}}>
        <div className="text-gray-400 text-sm">
          <div className="flex items-center">
            {/* Pulsing animation when online */}
            <div className={`w-2 h-2 rounded-full mr-2 ${
              statusInfo.color === 'green' 
                ? 'bg-green-500 animate-pulse' 
                : statusInfo.color === 'red'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
            }`}></div>
            <span>Server Status: {statusInfo.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;


