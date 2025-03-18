import React from 'react';
import { Phone, Calendar, Clock, User, RefreshCw, BarChart } from 'lucide-react';

const CallDetails = ({ call, onRefreshStatus, loading, onViewAnalysis }) => {
  const formatPropertyValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return value;
  };

  // Format the status display
  const getStatusDisplay = (status) => {
    if (status === 'ANSWER') return { label: 'Completed', color: 'green' };
    if (status === 'BUSY') return { label: 'Busy', color: 'yellow' };
    if (status === 'NO_ANSWER') return { label: 'No Answer', color: 'gray' };
    if (status === 'FAILED') return { label: 'Failed', color: 'red' };
    return { label: status, color: 'blue' };
  };

  const statusDisplay = getStatusDisplay(call.call_state);

  return (
    <div className="bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-700">
      <div className="p-6 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Call Details</h2>
        <button
          onClick={onRefreshStatus}
          disabled={loading}
          className="flex items-center px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
        >
          <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="p-6">
        {/* Basic Call Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 text-white">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm text-gray-400">Call UUID</div>
                  <div className="font-medium break-all text-white">{call.call_uuid}</div>
                </div>
              </div>

              {/* Display the Ultravox Call ID */}
              <div className="flex items-start">
                <User className="w-5 h-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm text-gray-400">Ultravox Call ID</div>
                  <div className="font-medium break-all text-white">
                    {call.ultravox_call_id || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <User className="w-5 h-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm text-gray-400">From / To</div>
                  <div className="font-medium text-white">
                    {call.from_number} → {call.to_number}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <div className="text-sm text-gray-400">Initiated At</div>
                  <div className="font-medium text-white">
                    {call.initiation_time && new Date(call.initiation_time).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="w-5 h-5 text-gray-500 mt-0.5 mr-3" />
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
          <h3 className="text-lg font-medium mb-4 text-white">Call Status</h3>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center mb-4">
              <div className={`w-3 h-3 rounded-full bg-${statusDisplay.color}-500 mr-2`}></div>
              <span className="font-medium text-white">{statusDisplay.label}</span>
            </div>

            <div className="space-y-2">
              {call.end_time && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">End Time:</span>
                  <span className="text-white">{call.end_time}</span>
                </div>
              )}

              {call.call_direction && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Direction:</span>
                  <span className="text-white">{call.call_direction}</span>
                </div>
              )}

              {call.hangup_cause_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Hangup Cause:</span>
                  <span className="text-white">{call.hangup_cause_name}</span>
                </div>
              )}

              {call.hangup_source && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Hangup Source:</span>
                  <span className="text-white">{call.hangup_source}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Properties */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-white">All Properties</h3>
          <div className="bg-gray-700 p-4 rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-2 px-4 font-medium text-gray-400">Property</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-400">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {Object.entries(call).map(([key, value]) => (
                  <tr key={key} className="hover:bg-gray-600">
                    <td className="py-2 px-4 align-top font-medium text-gray-300">{key}</td>
                    <td className="py-2 px-4 align-top text-white">
                      {typeof value === 'object' && value !== null ? (
                        <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(value, null, 2)}</pre>
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

      <div className="mt-4 p-6 border-t border-gray-700 flex">
        <button
          onClick={() => onViewAnalysis(call)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center mr-2"
        >
          <BarChart size={18} className="mr-2" />
          View Analysis
        </button>
      </div>
    </div>
  );
};

export default CallDetails;
