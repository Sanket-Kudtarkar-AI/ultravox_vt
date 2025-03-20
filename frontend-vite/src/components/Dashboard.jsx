import React from 'react';
import { Phone, Activity, Clock, Users, ArrowUpRight, Plus } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

const StatCard = ({ title, value, icon, trend = null, trendValue = null }) => (
  <Card className="p-6 hover:border-primary-700/50 transition-colors">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-400 text-sm mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
        {trend && (
          <p className={`text-xs flex items-center ${
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </p>
        )}
      </div>
      <div className="bg-dark-700/50 p-2 rounded-lg">
        {icon}
      </div>
    </div>
  </Card>
);

const Dashboard = ({ recentCalls, agents, onCreateAgent, onSelectAgent, onViewDetails, setCurrentView }) => {
  // Calculate dashboard statistics
  const totalCalls = recentCalls.length;
  const completedCalls = recentCalls.filter(call => call.call_state === 'ANSWER').length;
  const completionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

  // Get today's calls
  const today = new Date().toDateString();
  const todayCalls = recentCalls.filter(call =>
    new Date(call.initiation_time).toDateString() === today
  ).length;

  return (
    <div className="p-6 text-gray-300">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <Button
          variant="primary"
          size="md"
          icon={<Phone size={16} />}
          onClick={() => setCurrentView('new-call')}
        >
          New Call
        </Button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Agents"
          value={agents.length}
          icon={<Users size={24} className="text-primary-400" />}
        />
        <StatCard
          title="Calls Today"
          value={todayCalls}
          icon={<Phone size={24} className="text-accent-400" />}
          trend="up"
          trendValue="12% from yesterday"
        />
        <StatCard
          title="Total Calls"
          value={totalCalls}
          icon={<Activity size={24} className="text-blue-400" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={<Clock size={24} className="text-green-400" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 p-6 border-t-4 border-t-primary-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Quick Actions</h3>
            <Phone className="text-primary-400"/>
          </div>

          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              icon={<Phone size={18} />}
              onClick={() => setCurrentView('new-call')}
            >
              Make a New Call
            </Button>

            <Button
              variant="outline"
              fullWidth
              icon={<Plus size={18} />}
              onClick={onCreateAgent}
            >
              Create New Agent
            </Button>

            <Button
              variant="secondary"
              fullWidth
              icon={<Clock size={18} />}
              onClick={() => setCurrentView('recent-calls')}
            >
              View Call History
            </Button>
          </div>
        </Card>

        {/* My Agents */}
        <Card className="lg:col-span-1 p-6 border-t-4 border-t-accent-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">My Agents</h3>
            <Users className="text-accent-400"/>
          </div>

          {agents.length > 0 ? (
            <div className="space-y-3">
              {agents.slice(0, 3).map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between py-3 px-4 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors"
                >
                  <div>
                    <div className="font-medium text-white">{agent.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {agent.settings.voice} • {
                        agent.settings.language_hint === 'hi' ? 'Hindi' :
                        agent.settings.language_hint === 'en' ? 'English' : 'Marathi'
                      }
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectAgent(agent.id)}
                    className="p-1.5 bg-dark-600 hover:bg-primary-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              ))}

              {agents.length > 3 && (
                <button className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center mt-2">
                  View all {agents.length} agents
                  <ArrowUpRight size={14} className="ml-1" />
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-400 mb-3">No agents created yet.</p>
              <Button
                variant="accent"
                onClick={onCreateAgent}
                icon={<Plus size={16} />}
              >
                Create Your First Agent
              </Button>
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-1 p-6 border-t-4 border-t-blue-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Recent Activity</h3>
            <Clock className="text-blue-400"/>
          </div>

          {recentCalls.length > 0 ? (
            <div className="space-y-3">
              {recentCalls.slice(0, 3).map((call, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 px-4 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer"
                  onClick={() => onViewDetails(call)}
                >
                  <div>
                    <div className="font-medium text-white">{call.to_number}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(call.initiation_time).toLocaleString()}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    call.call_state === 'ANSWER' 
                      ? 'bg-green-900/70 text-green-300' 
                      : 'bg-yellow-900/70 text-yellow-300'
                  }`}>
                    {call.call_state === 'ANSWER' ? 'Completed' : call.call_state}
                  </span>
                </div>
              ))}

              <button
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center mt-2"
                  onClick={() => setCurrentView('recent-calls')}
              >
                View all calls
                <ArrowUpRight size={14} className="ml-1"/>
              </button>
            </div>
          ) : (
              <p className="text-gray-400">No recent calls</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;