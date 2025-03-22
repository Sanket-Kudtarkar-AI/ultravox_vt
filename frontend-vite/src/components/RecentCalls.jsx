import React from 'react';
import {RefreshCw, Info, PhoneCall, BarChart, Clock, CheckCircle, XCircle, AlertCircle} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

const RecentCalls = ({
                         calls,
                         loading,
                         onRefresh,
                         onViewDetails,
                         onViewAnalysis,
                         currentPage,
                         callsPerPage,
                         totalCalls,
                         paginate
                     }) => {
    // Helper function to format call status
    const getStatusBadge = (status) => {
        if (status === 'ANSWER') {
            return <Badge variant="success" pill>
                <div className="flex items-center">
                    <CheckCircle size={12} className="mr-1"/>
                    Completed
                </div>
            </Badge>;
        } else if (status === 'BUSY') {
            return <Badge variant="warning" pill>
                <div className="flex items-center">
                    <AlertCircle size={12} className="mr-1"/>
                    Busy
                </div>
            </Badge>;
        } else if (status === 'NO_ANSWER') {
            return <Badge variant="default" pill>
                <div className="flex items-center">
                    <XCircle size={12} className="mr-1"/>
                    No Answer
                </div>
            </Badge>;
        } else if (status === 'FAILED') {
            return <Badge variant="error" pill>
                <div className="flex items-center">
                    <XCircle size={12} className="mr-1"/>
                    Failed
                </div>
            </Badge>;
        } else {
            return <Badge variant="info" pill>
                <div className="flex items-center">
                    <Info size={12} className="mr-1"/>
                    {status}
                </div>
            </Badge>;
        }
    };

    // Calculate pagination metrics
    const indexOfFirstCall = (currentPage - 1) * callsPerPage;
    const indexOfLastCall = Math.min(currentPage * callsPerPage, totalCalls);

    return (
        <Card className="overflow-hidden">
            <div
                className="p-6 border-b border-dark-700 flex justify-between items-center bg-dark-800/50 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-white">Call History</h2>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                    icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>}
                >
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-gray-400">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin"/>
                    <p>Loading calls...</p>
                </div>
            ) : calls.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                    <PhoneCall size={24} className="mx-auto mb-2"/>
                    <p>No call history available</p>
                    <p className="text-sm mt-1">Make your first call to see it here</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    {/* Add this after the header div but before the content */}
                    {calls.length > 0 && (
                        <div className="p-4 border-b border-dark-700 flex justify-between items-center">
                            <div className="text-sm text-gray-400">
                                Showing {indexOfFirstCall + 1} to {indexOfLastCall} of {totalCalls} calls
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                {Array.from({length: Math.ceil(totalCalls / callsPerPage)}).map((_, index) => (
                                    <Button
                                        key={index}
                                        variant={currentPage === index + 1 ? "primary" : "outline"}
                                        size="sm"
                                        onClick={() => paginate(index + 1)}
                                    >
                                        {index + 1}
                                    </Button>
                                )).slice(Math.max(0, currentPage - 3), Math.min(currentPage + 2, Math.ceil(totalCalls / callsPerPage)))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === Math.ceil(totalCalls / callsPerPage)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                    <table className="w-full">
                        <thead className="bg-dark-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">To</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">From</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date
                                & Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                        {calls.map((call, index) => (
                            <tr key={index} className="bg-dark-800/30 hover:bg-dark-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-white">{call.to_number}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-400">{call.from_number}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-400 flex items-center">
                                        <Clock size={14} className="mr-1 text-primary-400"/>
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
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => onViewDetails(call)}
                                            icon={<Info size={14}/>}
                                        >
                                            Details
                                        </Button>

                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => onViewAnalysis(call)}
                                            icon={<BarChart size={14}/>}
                                        >
                                            Analysis
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {calls.length > 0 && (
                        <div className="p-4 border-t border-dark-700 flex justify-between items-center">
                            <div className="text-sm text-gray-400">
                                Showing {indexOfFirstCall + 1} to {indexOfLastCall} of {totalCalls} calls
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                {Array.from({length: Math.ceil(totalCalls / callsPerPage)}).map((_, index) => (
                                    <Button
                                        key={index}
                                        variant={currentPage === index + 1 ? "primary" : "outline"}
                                        size="sm"
                                        onClick={() => paginate(index + 1)}
                                    >
                                        {index + 1}
                                    </Button>
                                )).slice(Math.max(0, currentPage - 3), Math.min(currentPage + 2, Math.ceil(totalCalls / callsPerPage)))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === Math.ceil(totalCalls / callsPerPage)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default RecentCalls;