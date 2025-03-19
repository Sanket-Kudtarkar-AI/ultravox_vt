import React, {useState, useEffect} from 'react';
import {Phone, RefreshCw, Clock, AlertCircle, CheckCircle, PhoneOff, Info, Shield} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

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
        if (!call) return {
            icon: <AlertCircle/>,
            text: 'Unknown',
            variant: 'default',
            description: 'Call status unknown'
        };

        if (call.details && call.details.call_status === 'in-progress') {
            return {
                icon: <Phone className="animate-pulse"/>,
                text: 'In Progress',
                variant: 'success',
                description: 'Call is currently active'
            };
        } else if (call.details && call.details.call_state === 'ANSWER') {
            return {
                icon: <CheckCircle/>,
                text: 'Completed',
                variant: 'info',
                description: 'Call completed successfully'
            };
        } else if (call.details &&
            (call.details.call_state === 'BUSY' ||
                call.details.hangup_cause_name === 'NORMAL_CLEARING')) {
            return {
                icon: <PhoneOff/>,
                text: 'Ended',
                variant: 'warning',
                description: 'Call has ended'
            };
        } else if (call.details && call.details.hangup_cause_name === 'NORMAL_CLEARING') {
            return {
                icon: <CheckCircle/>,
                text: 'Completed',
                variant: 'success',
                description: 'Call completed successfully'
            };
        } else if (call.details && call.details.hangup_cause_name) {
            return {
                icon: <AlertCircle/>,
                text: call.details.hangup_cause_name,
                variant: 'error',
                description: 'Call ended abnormally'
            };
        }

        // Default case for calls that are initiating or unknown
        return {
            icon: <Clock/>,
            text: 'Initiating',
            variant: 'warning',
            description: 'Call is being initiated'
        };
    };

    const statusDisplay = getStatusDisplay();

    return (
        <Card className="overflow-hidden shadow-elegant">
            <div className="p-6 border-b border-dark-700 bg-gradient-to-r from-dark-800/80 to-dark-900/80 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                        <Phone size={20} className="mr-2 text-primary-400" />
                        Call Information
                    </h2>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-400 bg-dark-700/50 px-3 py-1 rounded-lg">
                            <Clock size={14} className="inline-block mr-1.5" />
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                onRefreshStatus();
                                setLastUpdated(new Date());
                            }}
                            disabled={loading}
                            icon={<RefreshCw size={16} className={loading ? "animate-spin" : ""} />}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="space-y-4">
                            <div className="bg-dark-700/30 p-4 rounded-lg border border-dark-600/40 hover:border-dark-500/40 transition-colors">
                                <div className="text-sm text-gray-400 mb-1">Recipient Number</div>
                                <div className="font-medium text-white flex items-center">
                                    <Phone size={16} className="mr-2 text-primary-400" />
                                    {call.recipient_phone_number}
                                </div>
                            </div>

                            <div className="bg-dark-700/30 p-4 rounded-lg border border-dark-600/40 hover:border-dark-500/40 transition-colors">
                                <div className="text-sm text-gray-400 mb-1">From Number</div>
                                <div className="font-medium text-white flex items-center">
                                    <Phone size={16} className="mr-2 text-primary-400" />
                                    {call.plivo_phone_number}
                                </div>
                            </div>

                            <div className="bg-dark-700/30 p-4 rounded-lg border border-dark-600/40 hover:border-dark-500/40 transition-colors">
                                <div className="text-sm text-gray-400 mb-1">Call UUID</div>
                                <div className="font-medium break-all text-white bg-dark-800/50 p-2 rounded font-mono text-sm">
                                    {call.call_uuid}
                                </div>
                            </div>

                            <div className="bg-dark-700/30 p-4 rounded-lg border border-dark-600/40 hover:border-dark-500/40 transition-colors">
                                <div className="text-sm text-gray-400 mb-1">Initiated At</div>
                                <div className="font-medium text-white flex items-center">
                                    <Clock size={16} className="mr-2 text-primary-400" />
                                    {call.timestamp ? new Date(call.timestamp).toLocaleString() : 'Unknown'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="bg-dark-700/30 p-4 rounded-lg mb-4 border border-dark-600/40 shadow-elegant hover:shadow-lg transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-gray-400">Call Status</div>
                                <Badge
                                    variant={statusDisplay.variant}
                                    pill
                                    glow={statusDisplay.text === 'In Progress'}
                                >
                                    <div className="flex items-center">
                                        {statusDisplay.icon}
                                        <span className="ml-1">{statusDisplay.text}</span>
                                    </div>
                                </Badge>
                            </div>

                            <p className="text-xs text-gray-400 mb-3">{statusDisplay.description}</p>

                            {call.details && (
                                <div className="space-y-3">
                                    {call.details.call_duration && (
                                        <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                            <span className="text-sm text-gray-400">Duration:</span>
                                            <span className="font-medium text-white">{call.details.call_duration} seconds</span>
                                        </div>
                                    )}

                                    {call.details.answer_time && (
                                        <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                            <span className="text-sm text-gray-400">Answered At:</span>
                                            <span className="font-medium text-white">{call.details.answer_time}</span>
                                        </div>
                                    )}

                                    {call.details.end_time && (
                                        <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                            <span className="text-sm text-gray-400">Ended At:</span>
                                            <span className="font-medium text-white">{call.details.end_time}</span>
                                        </div>
                                    )}

                                    {call.details.hangup_cause_name && (
                                        <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                            <span className="text-sm text-gray-400">Hangup Cause:</span>
                                            <span className="font-medium text-white">{call.details.hangup_cause_name}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center bg-dark-700/30 p-3 px-4 rounded-lg border border-dark-600/40">
                            <input
                                type="checkbox"
                                id="auto-refresh"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="mr-2 bg-dark-700 border-dark-600 text-primary-600 focus:ring-primary-500 rounded"
                            />
                            <label htmlFor="auto-refresh" className="text-sm text-gray-300">
                                Auto-refresh status every 5 seconds
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {call.system_prompt && (
                <div className="border-t border-dark-700 p-6 bg-gradient-to-b from-dark-800/50 to-dark-900/50">
                    <h3 className="text-lg font-medium mb-3 text-white flex items-center">
                        <Shield size={18} className="mr-2 text-primary-400" />
                        System Prompt
                    </h3>
                    <div className="bg-dark-700/30 p-4 rounded-lg text-gray-300 border border-dark-600/40 shadow-inner overflow-auto max-h-96">
                        <pre className="whitespace-pre-wrap font-mono text-xs">{call.system_prompt}</pre>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default CallStatus;