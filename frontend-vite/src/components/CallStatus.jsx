import React, {useState, useEffect} from 'react';
import {Phone, RefreshCw, Clock, AlertCircle, CheckCircle, PhoneOff} from 'lucide-react';

const CallStatus = ({call, onRefreshStatus, loading}) => {
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Auto refresh the status every 5 seconds if enabled
    useEffect(() => {
        let interval;
        if (autoRefresh && call && call.call_uuid) {
            interval = setInterval(() => {
                onRefreshStatus();
                setLastUpdated(new Date());
            }, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh, call, onRefreshStatus]);

    // Format the status display
    const getStatusDisplay = () => {
        if (!call) return {icon: <AlertCircle/>, text: 'Unknown', color: 'gray'};

        if (call.details && call.details.call_status === 'in-progress') {
            return {
                icon: <Phone className="animate-pulse"/>,
                text: 'In Progress',
                color: 'green'
            };
        } else if (call.details && call.details.call_state === 'ANSWER') {
            return {
                icon: <CheckCircle/>,
                text: 'Completed',
                color: 'blue'
            };
        } else if (call.details &&
            (call.details.call_state === 'BUSY' ||
                call.details.hangup_cause_name === 'NORMAL_CLEARING')) {
            return {
                icon: <PhoneOff/>,
                text: 'Ended',
                color: 'yellow'
            };
        } else if (call.details && call.details.hangup_cause_name === 'NORMAL_CLEARING') {
            return {
                icon: <CheckCircle/>,
                text: 'Completed',
                color: 'green'
            };
        } else if (call.details && call.details.hangup_cause_name) {
            return {
                icon: <AlertCircle/>,
                text: call.details.hangup_cause_name,
                color: 'red'
            };
        }

        // Default case for calls that are initiating or unknown
        return {
            icon: <Clock/>,
            text: 'Initiating',
            color: 'yellow'
        };
    };

    const statusDisplay = getStatusDisplay();
    const colorClass = `text-${statusDisplay.color}-400`;

    return (
        <div className="bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-700">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Call Information</h2>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-400">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                        <button
                            onClick={() => {
                                onRefreshStatus();
                                setLastUpdated(new Date());
                            }}
                            disabled={loading}
                            className="p-2 text-gray-400 hover:text-gray-300 rounded-full hover:bg-gray-700 transition-colors"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""}/>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="space-y-4">
                            <div>
                                <div className="text-sm text-gray-400 mb-1">Recipient Number</div>
                                <div className="font-medium text-white">{call.recipient_phone_number}</div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-400 mb-1">From Number</div>
                                <div className="font-medium text-white">{call.plivo_phone_number}</div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-400 mb-1">Call UUID</div>
                                <div className="font-medium break-all text-white">{call.call_uuid}</div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-400 mb-1">Initiated At</div>
                                <div className="font-medium text-white">
                                    {call.timestamp ? new Date(call.timestamp).toLocaleString() : 'Unknown'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="bg-gray-700 p-4 rounded-lg mb-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-gray-400">Call Status</div>
                                <div className={`flex items-center ${colorClass} ${
                                    statusDisplay.text === 'In Progress' ? 'animate-glow' : ''
                                }`}>
                                    {statusDisplay.icon}
                                    <span className="ml-2 font-medium">{statusDisplay.text}</span>
                                </div>
                            </div>

                            {call.details && (
                                <div className="space-y-3">
                                    {call.details.call_duration && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Duration:</span>
                                            <span
                                                className="font-medium text-white">{call.details.call_duration} seconds</span>
                                        </div>
                                    )}

                                    {call.details.answer_time && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Answered At:</span>
                                            <span className="font-medium text-white">{call.details.answer_time}</span>
                                        </div>
                                    )}

                                    {call.details.end_time && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Ended At:</span>
                                            <span className="font-medium text-white">{call.details.end_time}</span>
                                        </div>
                                    )}

                                    {call.details.hangup_cause_name && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Hangup Cause:</span>
                                            <span
                                                className="font-medium text-white">{call.details.hangup_cause_name}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="auto-refresh"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="mr-2 bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="auto-refresh" className="text-sm text-gray-300">
                                Auto-refresh status every 5 seconds
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {call.system_prompt && (
                <div className="border-t border-gray-700 p-6">
                    <h3 className="text-lg font-medium mb-2 text-white">System Prompt</h3>
                    <div className="bg-gray-700 p-4 rounded-lg text-sm text-gray-300 text-left">
                        <pre className="whitespace-pre-wrap font-mono text-xs text-left">{call.system_prompt}</pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallStatus;