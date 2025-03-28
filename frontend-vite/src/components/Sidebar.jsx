import React, {useState} from 'react';
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
    BarChart,
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

    // Helper to get the server status indicator color and text
    const getServerStatusInfo = () => {
        switch (serverStatus) {
            case 'online':
                return {color: 'bg-green-500', text: 'Online'};
            case 'offline':
                return {color: 'bg-red-500', text: 'Offline'};
            default:
                return {color: 'bg-yellow-500', text: 'Checking...'};
        }
    };

    const statusInfo = getServerStatusInfo();

    // NavItem component that delays navigation to allow the pop animation to complete.
    const NavItem = ({icon, label, active, onClick, delay}) => {
        const [pop, setPop] = useState(false);
        const [ripple, setRipple] = useState({active: false, x: 0, y: 0});

        const handleClick = (e) => {
            // Calculate ripple position relative to button
            const button = e.currentTarget;
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Activate ripple effect
            setRipple({active: true, x, y});
            setPop(true);

            // Delay navigation to let the animation play
            setTimeout(() => {
                onClick();
            }, 400);
        };

        return (
            <li style={{animationDelay: `${delay}ms`}} className="relative overflow-hidden">
                <button
                    onClick={handleClick}
                    onAnimationEnd={() => setPop(false)}
                    className={`
            relative w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 overflow-hidden
            ${active
                        ? 'bg-gradient-to-r from-primary-900/50 to-primary-800/30 text-primary-400 font-medium'
                        : 'text-gray-400 hover:bg-dark-700/70 hover:text-white'
                    }
            ${pop ? 'animate-pop-fancy' : ''}
          `}
                >
                    {/* Ripple effect */}
                    {ripple.active && (
                        <span
                            className="absolute animate-ripple rounded-full bg-white/20 pointer-events-none"
                            style={{
                                left: ripple.x + 'px',
                                top: ripple.y + 'px',
                                width: '120px',
                                height: '120px',
                                marginLeft: '-60px',
                                marginTop: '-60px',
                                transform: 'scale(0)',
                            }}
                            onAnimationEnd={() => setRipple({active: false, x: 0, y: 0})}
                        />
                    )}

                    <div className="mr-3 z-10">{icon}</div>
                    <span className="z-10">{label}</span>
                </button>
            </li>
        );
    };

    const renderNavigation = () => (
        <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1.5 px-3">
                {/* Dashboard item */}
                <NavItem
                    icon={<Activity size={18}/>}
                    label="Dashboard"
                    active={currentView === 'dashboard'}
                    onClick={() => setCurrentView('dashboard')}
                    delay={50}
                />

                {/* Agents section with collapsible list */}
                <li className="mt-6" style={{animationDelay: '100ms'}}>
                    <div
                        className="mb-2 flex items-center justify-between px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                        <span>AGENTS</span>
                        <button
                            onClick={() => onCreateAgent()}
                            className="p-0.5 text-gray-400 hover:text-primary-400 rounded focus:outline-none"
                            title="Create New Agent"
                        >
                            <Plus size={16}/>
                        </button>
                    </div>

                    {/* Toggle button for agents list */}
                    <button
                        onClick={() => setIsAgentsExpanded(!isAgentsExpanded)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-300 hover:bg-dark-700/70 hover:text-white transition-colors mb-1"
                    >
                        <div className="flex items-center">
                            <div className="mr-3"><Users size={18}/></div>
                            <span>My Agents</span>
                        </div>
                        <ChevronRight size={16}
                                      className={`transition-transform duration-200 ${isAgentsExpanded ? 'rotate-90' : ''}`}/>
                    </button>

                    {/* List of agents */}
                    {isAgentsExpanded && (
                        <ul className="pl-8 space-y-1 mt-1">
                            {agents.map((agent, index) => (
                                <li key={agent.agent_id} className="relative group"
                                    style={{animationDelay: `${150 + index * 50}ms`}}>
                                    <button
                                        onClick={() => onEditAgent(agent.agent_id)}  // Make sure we're using agent.agent_id
                                        className={`w-full text-left flex items-center py-1.5 px-3 text-sm rounded-lg transition-all duration-200
        ${selectedAgentId === agent.agent_id
                                            ? 'bg-primary-900/40 text-primary-300'
                                            : 'text-gray-400 hover:bg-dark-700/50 hover:text-white'
                                        }
      `}
                                    >
                                        {agent.name}
                                    </button>

                                    {/* Action buttons - visible on hover (EDIT BUTTON REMOVED) */}
                                    <div
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                        {/* Edit button removed */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDuplicateAgent(agent.agent_id);
                                            }}
                                            className="p-1 text-gray-400 hover:text-primary-400 rounded focus:outline-none"
                                            title="Duplicate"
                                        >
                                            <Copy size={14}/>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteAgent(agent.agent_id);
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-400 rounded focus:outline-none"
                                            title="Delete"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>

                {/* Campaigns section */}
                <li className="mt-6" style={{animationDelay: '200ms'}}>
                    <div className="mb-2 px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                        CAMPAIGNS
                    </div>
                </li>

                <NavItem
                    icon={<BarChart size={18}/>}
                    label="Campaign Manager"
                    active={currentView === 'campaign-manager'}
                    onClick={() => setCurrentView('campaign-manager')}
                    delay={250}
                />
                {/* Calls section */}
                <li className="mt-6" style={{animationDelay: '150ms'}}>
                    <div className="mb-2 px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                        CALLS
                    </div>
                </li>

                <NavItem
                    icon={<Phone size={18}/>}
                    label="New Call"
                    active={currentView === 'new-call'}
                    onClick={() => setCurrentView('new-call')}
                    delay={200}
                />

                <NavItem
                    icon={<Clock size={18}/>}
                    label="Recent Calls"
                    active={currentView === 'recent-calls'}
                    onClick={() => setCurrentView('recent-calls')}
                    delay={250}
                />

                {/* Settings section */}
                <li className="mt-6" style={{animationDelay: '300ms'}}>
                    <div className="mb-2 px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                        SYSTEM
                    </div>
                </li>

                <NavItem
                    icon={<Settings size={18}/>}
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
                    style={{position: 'fixed', zIndex: 1000}}
                >
                    {isMobileMenuOpen ? <X size={24} className="text-gray-300"/> :
                        <Menu size={24} className="text-gray-300"/>}
                </button>
            </div>

            {/* Mobile sidebar */}
            <div className={`
        lg:hidden fixed inset-0 z-40 transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}>
                <div
                    className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
                <div className={`
          w-64 h-full bg-gradient-to-b from-dark-900 to-dark-950 shadow-xl overflow-hidden flex flex-col
          transition-transform duration-300
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
                    <div className="p-4 border-b border-dark-700">
                        <div className="text-white text-xl font-bold flex items-center">
                            <Phone className="mr-2 text-primary-400"/>
                            <span>VT Call Manager</span>
                        </div>
                    </div>
                    {renderNavigation()}
                    <div className="mt-auto p-4 border-t border-dark-700" style={{animationDelay: '400ms'}}>
                        <div className="flex items-center text-sm text-gray-400">
                            <div
                                className={`w-2 h-2 rounded-full mr-2 ${statusInfo.color} ${serverStatus === 'online' ? 'animate-pulse' : ''}`}></div>
                            <span>Server Status: {statusInfo.text}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div
                className="hidden lg:flex bg-gradient-to-b from-dark-900 to-dark-950 w-64 flex-col border-r border-dark-700 shadow-lg">
                <div className="p-4 border-b border-dark-700">
                    <div className="text-white text-xl font-bold flex items-center">
                        <Phone className="mr-2 text-primary-400"/>
                        <span>VT Call Manager</span>
                    </div>
                </div>
                {renderNavigation()}
                <div className="mt-auto p-4 border-t border-dark-700" style={{animationDelay: '400ms'}}>
                    <div className="flex items-center text-sm text-gray-400">
                        <div
                            className={`w-2 h-2 rounded-full mr-2 ${statusInfo.color} ${serverStatus === 'online' ? 'animate-pulse' : ''}`}></div>
                        <span>Server Status: {statusInfo.text}</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
