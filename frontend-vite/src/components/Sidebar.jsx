import React, { useState } from 'react';
import {
  Activity,
  Phone,
  Clock,
  Settings,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Edit,
  Menu,
  X,
  Users
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
  serverStatus = 'unknown'
}) => {
  const [isAgentsExpanded, setIsAgentsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to get the status indicator color and text
  const getServerStatusInfo = () => {
    switch(serverStatus) {
      case 'online':
        return { color: 'bg-green-500', text: 'Online' };
      case 'offline':
        return { color: 'bg-red-500', text: 'Offline' };
      default:
        return { color: 'bg-yellow-500', text: 'Checking...' };
    }
  };

  const statusInfo = getServerStatusInfo();

  const NavItem = ({ icon, label, active, onClick, delay }) => (
    <li className="animate-slide-in-left" style={{animationDelay: `${delay}ms`}}>
      <button
        onClick={onClick}
        className={`
          w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200
          ${active 
            ? 'bg-gradient-to-r from-primary-900/50 to-primary-800/30 text-primary-400 font-medium'
            : 'text-gray-400 hover:bg-dark-700/70 hover:text-white'}
        `}
      >
        <div className="mr-3">{icon}</div>
        <span>{label}</span>
      </button>
    </li>
  );

  const renderNavigation = () => (
    <nav className="flex-1 overflow-y-auto py-4">
      <ul className="space-y-1.5 px-3">
        {/* Dashboard item */}
        <NavItem
          icon={<Activity size={18} />}
          label="Dashboard"
          active={currentView === 'dashboard'}
          onClick={() => setCurrentView('dashboard')}
          delay={50}
        />

        {/* Agents section with collapsible list */}
        <li className="mt-6 animate-slide-in-left" style={{animationDelay: '100ms'}}>
          <div className="mb-2 flex items-center justify-between px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
            <span>AGENTS</span>
            <button
              onClick={() => onCreateAgent()}
              className="p-0.5 text-gray-400 hover:text-primary-400 rounded focus:outline-none"
              title="Create New Agent"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Toggle button for agents list */}
          <button
            onClick={() => setIsAgentsExpanded(!isAgentsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-300 hover:bg-dark-700/70 hover:text-white transition-colors mb-1"
          >
            <div className="flex items-center">
              <div className="mr-3"><Users size={18} /></div>
              <span>My Agents</span>
            </div>
            <ChevronRight size={16} className={`transition-transform duration-200 ${isAgentsExpanded ? 'rotate-90' : ''}`} />
          </button>

          {/* List of agents */}
          {isAgentsExpanded && (
            <ul className="pl-8 space-y-1 mt-1">
              {agents.length === 0 ? (
                <li className="text-sm text-gray-500 py-1 px-3 animate-fade-in">
                  No agents created yet
                </li>
              ) : (
                agents.map((agent, index) => (
                  <li key={agent.id} className="relative group animate-fade-in" style={{animationDelay: `${150 + index * 50}ms`}}>
                    <button
                      onClick={() => onSelectAgent(agent.id)}
                      className={`
                        w-full text-left flex items-center py-1.5 px-3 text-sm rounded-lg transition-all duration-200
                        ${selectedAgentId === agent.id
                          ? 'bg-primary-900/40 text-primary-300'
                          : 'text-gray-400 hover:bg-dark-700/50 hover:text-white'}
                      `}
                    >
                      {agent.name}
                    </button>

                    {/* Action buttons - visible on hover */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAgent(agent.id);
                        }}
                        className="p-1 text-gray-400 hover:text-primary-400 rounded focus:outline-none"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateAgent(agent.id);
                        }}
                        className="p-1 text-gray-400 hover:text-primary-400 rounded focus:outline-none"
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

        {/* Calls section */}
        <li className="mt-6 animate-slide-in-left" style={{animationDelay: '150ms'}}>
          <div className="mb-2 px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
            CALLS
          </div>
        </li>

        <NavItem
          icon={<Phone size={18} />}
          label="New Call"
          active={currentView === 'new-call'}
          onClick={() => setCurrentView('new-call')}
          delay={200}
        />

        <NavItem
          icon={<Clock size={18} />}
          label="Recent Calls"
          active={currentView === 'recent-calls'}
          onClick={() => setCurrentView('recent-calls')}
          delay={250}
        />

        {/* Settings section */}
        <li className="mt-6 animate-slide-in-left" style={{animationDelay: '300ms'}}>
          <div className="mb-2 px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
            SYSTEM
          </div>
        </li>

        <NavItem
          icon={<Settings size={18} />}
          label="Settings"
          active={currentView === 'settings'}
          onClick={() => setCurrentView('settings')}
          delay={350}
        />
      </ul>
    </nav>
  );

  return (
    <>
      {/* Mobile menu button - only visible on small screens */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-dark-800 shadow-lg border border-dark-700"
        >
          {isMobileMenuOpen ? <X size={24} className="text-gray-300" /> : <Menu size={24} className="text-gray-300" />}
        </button>
      </div>

      {/* Mobile sidebar - slide in from left */}
      <div className={`
        lg:hidden fixed inset-0 z-40 transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>

        {/* Sidebar */}
        <div className={`
          w-64 h-full bg-gradient-to-b from-dark-900 to-dark-950 shadow-xl overflow-hidden flex flex-col
          transition-transform duration-300
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-4 border-b border-dark-700">
            <div className="text-white text-xl font-bold flex items-center">
              <Phone className="mr-2 text-primary-400"/>
              <span>AI Call Manager</span>
            </div>
          </div>

          {renderNavigation()}

          <div className="mt-auto p-4 border-t border-dark-700 animate-fade-in" style={{animationDelay: '400ms'}}>
            <div className="flex items-center text-sm text-gray-400">
              {/* Status indicator */}
              <div className={`w-2 h-2 rounded-full mr-2 ${statusInfo.color} ${serverStatus === 'online' ? 'animate-pulse' : ''}`}></div>
              <span>Server Status: {statusInfo.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar - always visible on large screens */}
      <div className="hidden lg:flex bg-gradient-to-b from-dark-900 to-dark-950 w-64 flex-col border-r border-dark-700 shadow-lg">
        <div className="p-4 border-b border-dark-700">
          <div className="text-white text-xl font-bold flex items-center">
            <Phone className="mr-2 text-primary-400"/>
            <span>AI Call Manager</span>
          </div>
        </div>

        {renderNavigation()}

        <div className="mt-auto p-4 border-t border-dark-700 animate-fade-in" style={{animationDelay: '400ms'}}>
          <div className="flex items-center text-sm text-gray-400">
            {/* Status indicator */}
            <div className={`w-2 h-2 rounded-full mr-2 ${statusInfo.color} ${serverStatus === 'online' ? 'animate-pulse' : ''}`}></div>
            <span>Server Status: {statusInfo.text}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;