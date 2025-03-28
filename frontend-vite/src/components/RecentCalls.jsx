import React, { useState, useEffect } from 'react';
import {
    RefreshCw, Info, PhoneCall, BarChart, Clock, CheckCircle, XCircle,
    AlertCircle, Tag, MessageSquare, FileAudio, ChevronLeft
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Pagination from './ui/Pagination';
import { getRecentCalls } from '../utils/api';

const RecentCalls = ({
    onViewDetails,
    onViewAnalysis,
    setCurrentView
}) => {
    // State for calls data
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [callsPerPage] = useState(20);
    const [totalCalls, setTotalCalls] = useState(0);

    // Fetch calls on component mount and when pagination changes
    useEffect(() => {
        fetchCalls();
    }, [currentPage]);

    // Function to fetch calls
    const fetchCalls = async () => {
        setLoading(true);
        try {
            const offset = (currentPage - 1) * callsPerPage;
            const response = await getRecentCalls(callsPerPage, offset);

            if (response.status === 'success') {
                setCalls(response.calls);
                setTotalCalls(response.meta.total_count);
            } else {
                setError(response.message || 'Failed to fetch recent calls');
            }
        } catch (error) {
            console.error('Error fetching recent calls:', error);
            setError('An error occurred while fetching recent calls');
        } finally {
            setLoading(false);
        }
    };

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
                    {status || 'Unknown'}
                </div>
            </Badge>;
        }
    };

    // Helper to format timestamp
    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return 'N/A';
        const date = new Date(dateTimeStr);
        return date.toLocaleString();
    };

    // Helper to format campaign badge
    const getCampaignBadge = (campaignName) => {
        if (!campaignName) {
            return <Badge variant="default">General</Badge>;
        } else {
            return <Badge variant="purple" glow>
                <div className="flex items-center">
                    <Tag size={12} className="mr-1"/>
                    {campaignName}
                </div>
            </Badge>;
        }
    };

    // Calculate pagination metrics
    const indexOfFirstCall = (currentPage - 1) * callsPerPage;
    const indexOfLastCall = Math.min(currentPage * callsPerPage, totalCalls);

    // Total page count for pagination
    const totalPages = Math.ceil(totalCalls / callsPerPage);

    return (
        <Card className="overflow-hidden">
            <div
                className="p-6 border-b border-dark-700 flex justify-between items-center bg-dark-800/50 backdrop-blur-sm">
                <div className="flex items-center">
                    <button
                        onClick={() => setCurrentView('dashboard')} // You'll need to pass this prop
                        className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors"
                    >
                        <ChevronLeft size={20}/>
                    </button>
                    <h2 className="text-xl font-semibold text-white">Call History</h2>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchCalls}
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
            ) : error ? (
                <div className="p-8 text-center text-gray-400">
                    <AlertCircle size={24} className="mx-auto mb-2 text-red-400"/>
                    <p className="text-white mb-2">Error loading calls</p>
                    <p className="text-sm">{error}</p>
                    <Button
                        variant="primary"
                        size="sm"
                        className="mt-4"
                        onClick={fetchCalls}
                        icon={<RefreshCw size={14} />}
                    >
                        Retry
                    </Button>
                </div>
            ) : calls.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                    <PhoneCall size={24} className="mx-auto mb-2"/>
                    <p>No call history available</p>
                    <p className="text-sm mt-1">Make your first call to see it here</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    {/* Pagination controls at top */}
                    {calls.length > 0 && (
                        <div className="p-4 border-b border-dark-700 flex justify-between items-center">
                            <div className="text-sm text-gray-400">
                                Showing {indexOfFirstCall + 1} to {indexOfLastCall} of {totalCalls} calls
                            </div>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Campaign</th>
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
                                        {formatDateTime(call.initiation_time)}
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
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getCampaignBadge(call.campaign_name)}
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
                                            disabled={!call.ultravox_id}
                                        >
                                            Analysis
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    {/* Pagination Controls at bottom */}
                    {calls.length > 0 && (
                        <div className="p-4 border-t border-dark-700 flex justify-between items-center">
                            <div className="text-sm text-gray-400">
                                Showing {indexOfFirstCall + 1} to {indexOfLastCall} of {totalCalls} calls
                            </div>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default RecentCalls;