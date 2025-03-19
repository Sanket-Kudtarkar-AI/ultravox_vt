import React from 'react';
import { Phone, Calendar, Clock, User, RefreshCw, BarChart, Info, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

const CallDetails = ({ call, onRefreshStatus, loading, onViewAnalysis }) => {
  const formatPropertyValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return value;
  };

  // Format the status display
  const getStatusDisplay = (status) => {
    if (status === 'ANSWER') return { label: 'Completed', color: 'green', icon: <CheckCircle size={16} /> };
    if (status === 'BUSY') return { label: 'Busy', color: 'yellow', icon: <AlertCircle size={16} /> };
    if (status === 'NO_ANSWER') return { label: 'No Answer', color: 'gray', icon: <XCircle size={16} /> };
    if (status === 'FAILED') return { label: 'Failed', color: 'red', icon: <XCircle size={16} /> };
    return { label: status, color: 'blue', icon: <Info size={16} /> };
  };

  const statusDisplay = getStatusDisplay(call.call_state);

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-dark-700 flex justify-between items-center bg-dark-800/50 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-white">Call Details</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefreshStatus}
          disabled={loading}
          icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
        >
          Refresh
        </Button>
      </div>

      <div className="p-6">
        {/* Basic Call Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 text-white flex items-center">
            <Info size={18} className="mr-2 text-primary-400" />
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start bg-dark-700/30 p-3 rounded-lg">
                <Phone className="w-5 h-5 text-primary-400 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm text-gray-400">Call UUID</div>
                  <div className="font-medium break-all text-white">{call.call_uuid}</div>
                </div>
              </div>

              {/* Display the Ultravox Call ID */}
              <div className="flex items-start bg-dark-700/30 p-3 rounded-lg">
                <User className="w-5 h-5 text-primary-400 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm text-gray-400">Ultravox Call ID</div>
                  <div className="font-medium break-all text-white">
                    {call.ultravox_call_id || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-start bg-dark-700/30 p-3 rounded-lg">
                <User className="w-5 h-5 text-primary-400 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm text-gray-400">From / To</div>
                  <div className="font-medium text-white">
                    {call.from_number} → {call.to_number}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start bg-dark-700/30 p-3 rounded-lg">
                <Calendar className="w-5 h-5 text-primary-400 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm text-gray-400">Initiated At</div>
                  <div className="font-medium text-white">
                    {call.initiation_time && new Date(call.initiation_time).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-start bg-dark-700/30 p-3 rounded-lg">
                <Clock className="w-5 h-5 text-primary-400 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm text-gray-400">Duration</div>
                  <div className="font-medium text-white">
                    {call.call_duration ? `${call.call_duration} seconds` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call Status */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 text-white flex items-center">
            <Phone size={18} className="mr-2 text-primary-400" />
            Call Status
          </h3>
          <div className="bg-dark-700/30 p-4 rounded-lg border border-dark-600/50">
            <div className="flex items-center mb-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-${statusDisplay.color}-900/30 text-${statusDisplay.color}-400 mr-3`}>
                {statusDisplay.icon}
              </div>
              <span className="font-medium text-white">{statusDisplay.label}</span>
            </div>

            <div className="space-y-2">
              {call.end_time && (
                <div className="flex justify-between text-sm p-2 bg-dark-800/50 rounded">
                  <span className="text-gray-400">End Time:</span>
                  <span className="text-white">{call.end_time}</span>
                </div>
              )}

              {call.call_direction && (
                <div className="flex justify-between text-sm p-2 bg-dark-800/50 rounded">
                  <span className="text-gray-400">Direction:</span>
                  <span className="text-white">{call.call_direction}</span>
                </div>
              )}

              {call.hangup_cause_name && (
                <div className="flex justify-between text-sm p-2 bg-dark-800/50 rounded">
                  <span className="text-gray-400">Hangup Cause:</span>
                  <span className="text-white">{call.hangup_cause_name}</span>
                </div>
              )}

              {call.hangup_source && (
                <div className="flex justify-between text-sm p-2 bg-dark-800/50 rounded">
                  <span className="text-gray-400">Hangup Source:</span>
                  <span className="text-white">{call.hangup_source}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Properties */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-white flex items-center">
            <Info size={18} className="mr-2 text-primary-400" />
            All Properties
          </h3>
          <div className="bg-dark-700/30 p-4 rounded-lg overflow-x-auto border border-dark-600/50">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600">
                  <th className="text-left py-2 px-4 font-medium text-gray-400">Property</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-400">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {Object.entries(call).map(([key, value]) => (
                  <tr key={key} className="hover:bg-dark-600/30">
                    <td className="py-2 px-4 align-top font-medium text-gray-300">{key}</td>
                    <td className="py-2 px-4 align-top text-white">
                      {typeof value === 'object' && value !== null ? (
                        <pre className="whitespace-pre-wrap font-mono text-xs bg-dark-800/50 p-2 rounded">{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        formatPropertyValue(value)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-dark-700 flex bg-dark-800/20">
        <Button
          onClick={() => onViewAnalysis(call)}
          variant="primary"
          icon={<BarChart size={18} />}
        >
          View Analysis
        </Button>
      </div>
    </Card>
  );
};

export default CallDetails;