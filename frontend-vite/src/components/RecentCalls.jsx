import React from 'react';
import { RefreshCw, Info, PhoneCall } from 'lucide-react';

const RecentCalls = ({ calls, loading, onRefresh, onViewDetails }) => {
  // Helper function to format call status
  const getStatusBadge = (status) => {
    if (status === 'ANSWER') {
      return <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded-full">Completed</span>;
    } else if (status === 'BUSY') {
      return <span className="bg-yellow-900 text-yellow-300 text-xs px-2 py-1 rounded-full">Busy</span>;
    } else if (status === 'NO_ANSWER') {
      return <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">No Answer</span>;
    } else if (status === 'FAILED') {
      return <span className="bg-red-900 text-red-300 text-xs px-2 py-1 rounded-full">Failed</span>;
    } else {
      return <span className="bg-blue-900 text-blue-300 text-xs px-2 py-1 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-700">
      <div className="p-6 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Call History</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
        >
          <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          <p>Loading calls...</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <PhoneCall size={24} className="mx-auto mb-2" />
          <p>No call history available</p>
          <p className="text-sm mt-1">Make your first call to see it here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 bg-gray-800">
              {calls.map((call, index) => (
                <tr key={index} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{call.to_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">{call.from_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">
                      {new Date(call.initiation_time).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">
                      {call.call_duration ? `${call.call_duration} seconds` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(call.call_state)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onViewDetails(call)}
                      className="text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      <Info size={14} className="mr-1" />
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentCalls;