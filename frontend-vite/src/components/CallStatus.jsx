import React, {useState, useEffect} from 'react';
import {
    Phone,
    RefreshCw,
    Clock,
    Info,
    Shield,
    BarChart,
    PhoneOff
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import {
    getStatusDisplay,
    formatCallDuration,
    getHangupCauseDescription,
    getHangupSourceDescription,
    CALL_STATUS
} from '../utils/callStatusUtils';

const CallStatus = ({call, onRefreshStatus, loading, onViewAnalysis}) => {
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [fetchingMapping, setFetchingMapping] = useState(false);

    // Auto refresh the status every 1 second if enabled
    useEffect(() => {
        let interval;
        if (autoRefresh && call && call.call_uuid) {
            interval = setInterval(() => {
                onRefreshStatus();
                setLastUpdated(new Date());
            }, 1000); // 1 second for real-time updates
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh, call, onRefreshStatus]);

    // Get formatted status display using our utility
    const statusDisplay = () => {
        if (!call) return {
            icon: <Info size={12} />,
            text: 'Unknown',
            variant: 'default',
            description: 'Call status unknown'
        };

        // Handle live call phases
        if (call.phase === 'live') {
            // Get status from live call API
            const status = call.call_status ||
                (call.details && call.details.call_status) ||
                'unknown';

            return getStatusDisplay(status);
        }
        // Handle completed call phases
        else if (call.phase === 'completed') {
            // Get status from completed call API
            const callState = call.details && call.details.call_state;

            // Use the Plivo call state
            return getStatusDisplay(callState, true);
        }

        // Default case - unknown status
        return getStatusDisplay(CALL_STATUS.UNKNOWN);
    };

    const handleViewAnalysis = () => {
        // Check if call is completed before allowing analysis
        const isCallCompleted =
            call.phase === 'completed' ||
            (call.details &&
                (call.details.call_state === 'ANSWER' ||
                    call.details.hangup_cause_name === 'NORMAL_CLEARING' ||
                    call.status === 'completed'));

        if (!isCallCompleted) {
            // Show notification or alert that analysis is only available for completed calls
            console.log("Analysis is only available for completed calls");
            return; // Exit early
        }

        // Always fetch the mapping before showing analysis
        setFetchingMapping(true);

        console.log("CallStatus: Fetching VT call ID mapping for", call.call_uuid);

        fetch(`http://localhost:5000/api/call_mapping/${call.call_uuid}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Mapping API returned ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("CallStatus: Mapping API response:", data);

                if (data.status === 'success' && data.mapping && data.mapping.ultravox_call_id) {
                    // Create an enhanced call object with the correct VT call ID
                    const enhancedCall = {
                        ...call,
                        // Use a different property name to avoid confusion
                        vtCallId: data.mapping.ultravox_call_id
                    };

                    console.log("CallStatus: Passing to analysis with VT call ID:",
                        data.mapping.ultravox_call_id);

                    // Pass the enhanced call to the analysis view
                    onViewAnalysis(enhancedCall);
                } else {
                    console.error("CallStatus: No valid mapping found in response:", data);
                    // Pass the original call object if no mapping found
                    onViewAnalysis({
                        ...call,
                        vtCallId: null, // Explicitly set to null to indicate mapping not found
                        mappingError: "No valid VT call ID mapping found"
                    });
                }
            })
            .catch(err => {
                console.error("CallStatus: Error fetching VT call ID mapping:", err);
                // Pass the original call with an error flag
                onViewAnalysis({
                    ...call,
                    vtCallId: null,
                    mappingError: `Error fetching mapping: ${err.message}`
                });
            })
            .finally(() => {
                setFetchingMapping(false);
            });
    };

    // Get the current status display object
    const currentStatus = statusDisplay();

    return (
        <Card className="overflow-hidden shadow-elegant">
            <div
                className="p-6 border-b border-dark-700 bg-gradient-to-r from-dark-800/80 to-dark-900/80 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                        <Phone size={20} className="mr-2 text-primary-400"/>
                        Call Information
                    </h2>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-400 bg-dark-700/50 px-3 py-1 rounded-lg">
                            <Clock size={14} className="inline-block mr-1.5"/>
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
                            icon={<RefreshCw size={16} className={loading ? "animate-spin" : ""}/>}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="space-y-4">
                            <div
                                className="bg-dark-700/30 p-4 rounded-lg border border-dark-600/40 hover:border-dark-500/40 transition-colors">
                                <div className="text-sm text-gray-400 mb-1">Recipient Number</div>
                                <div className="font-medium text-white flex items-center">
                                    <Phone size={16} className="mr-2 text-primary-400"/>
                                    {call.recipient_phone_number || call.to_number || "Unknown"}
                                </div>
                            </div>

                            <div
                                className="bg-dark-700/30 p-4 rounded-lg border border-dark-600/40 hover:border-dark-500/40 transition-colors">
                                <div className="text-sm text-gray-400 mb-1">From Number</div>
                                <div className="font-medium text-white flex items-center">
                                    <Phone size={16} className="mr-2 text-primary-400"/>
                                    {call.plivo_phone_number || call.from_number || "Unknown"}
                                </div>
                            </div>

                            <div
                                className="bg-dark-700/30 p-4 rounded-lg border border-dark-600/40 hover:border-dark-500/40 transition-colors">
                                <div className="text-sm text-gray-400 mb-1">Call UUID</div>
                                <div
                                    className="font-medium break-all text-white bg-dark-800/50 p-2 rounded font-mono text-sm">
                                    {call.call_uuid}
                                </div>
                            </div>

                            <div
                                className="bg-dark-700/30 p-4 rounded-lg border border-dark-600/40 hover:border-dark-500/40 transition-colors">
                                <div className="text-sm text-gray-400 mb-1">Initiated At</div>
                                <div className="font-medium text-white flex items-center">
                                    <Clock size={16} className="mr-2 text-primary-400"/>
                                    {call.details && call.details.initiation_time ? call.details.initiation_time :
                                        call.initialTimestamp ? new Date(call.initialTimestamp).toLocaleString() :
                                            'Unknown'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div
                            className="bg-dark-700/30 p-4 rounded-lg mb-4 border border-dark-600/40 shadow-elegant hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-gray-400">Call Status</div>
                                <Badge
                                    variant={currentStatus.variant}
                                    pill
                                    glow={currentStatus.text === 'In Progress' || currentStatus.text === 'Ringing'}
                                >
                                    <div className="flex items-center">
                                        {currentStatus.icon}
                                        <span className="ml-1">{currentStatus.text}</span>
                                    </div>
                                </Badge>
                            </div>

                            <p className="text-xs text-gray-400 mb-3">{currentStatus.description}</p>

                            {/* Status change timeline */}
                            {call.statusHistory && call.statusHistory.length > 1 && (
                                <div className="flex justify-between p-2 bg-dark-800/70 rounded-lg mb-3">
                                    <span className="text-xs text-gray-400">Timeline:</span>
                                    <span className="text-xs font-medium text-white">
                                        {call.statusHistory.map((s, i) => {
                                            const statusInfo = getStatusDisplay(s.status);
                                            return (
                                                <span key={i} className={`inline-block mx-1 text-${statusInfo.variant === 'success' ? 'green' : 
                                                    statusInfo.variant === 'warning' ? 'yellow' : 
                                                    statusInfo.variant === 'info' ? 'blue' : 'white'}-400`}>
                                                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                                    {i < call.statusHistory.length - 1 && ' → '}
                                                </span>
                                            );
                                        })}
                                    </span>
                                </div>
                            )}

                            <div className="space-y-3">
                                {/* Call details based on phase */}
                                {call.details && call.details.call_duration && (
                                    <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                        <span className="text-sm text-gray-400">Duration:</span>
                                        <span className="font-medium text-white">
                                            {formatCallDuration(call.details.call_duration)}
                                        </span>
                                    </div>
                                )}

                                {call.phase === 'live' && call.details && call.details.session_start && (
                                    <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                        <span className="text-sm text-gray-400">Started:</span>
                                        <span className="font-medium text-white">
                                            {new Date(call.details.session_start).toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                {call.phase === 'completed' && call.details && call.details.answer_time && (
                                    <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                        <span className="text-sm text-gray-400">Answered:</span>
                                        <span className="font-medium text-white">{call.details.answer_time}</span>
                                    </div>
                                )}

                                {call.phase === 'completed' && call.details && call.details.end_time && (
                                    <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                        <span className="text-sm text-gray-400">Ended:</span>
                                        <span className="font-medium text-white">{call.details.end_time}</span>
                                    </div>
                                )}

                                {call.details && call.details.hangup_cause_name && (
                                    <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                        <span className="text-sm text-gray-400">Hangup Cause:</span>
                                        <span className="font-medium text-white" title={getHangupCauseDescription(call.details.hangup_cause_name)}>
                                            {call.details.hangup_cause_name}
                                        </span>
                                    </div>
                                )}

                                {call.details && call.details.hangup_source && (
                                    <div className="flex justify-between p-2 bg-dark-800/50 rounded-lg">
                                        <span className="text-sm text-gray-400">Hangup Source:</span>
                                        <span className="font-medium text-white" title={getHangupSourceDescription(call.details.hangup_source)}>
                                            {call.details.hangup_source}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Analysis Button */}
                        <div className="mt-4">
                            <Button
                                onClick={handleViewAnalysis}
                                variant="primary"
                                size="md"
                                icon={<BarChart size={18} className="mr-2"/>}
                                fullWidth
                                disabled={fetchingMapping || !(call.phase === 'completed' || (call.details && (call.details.call_state === 'ANSWER' || call.details.hangup_cause_name === 'NORMAL_CLEARING' || call.status === 'completed')))}
                                className={!(call.phase === 'completed' || (call.details && (call.details.call_state === 'ANSWER' || call.details.hangup_cause_name === 'NORMAL_CLEARING' || call.status === 'completed'))) ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                                {fetchingMapping ? (
                                    <>
                                        <RefreshCw size={18} className="mr-2 animate-spin"/>
                                        Preparing Analysis...
                                    </>
                                ) : !(call.phase === 'completed' || (call.details && (call.details.call_state === 'ANSWER' || call.details.hangup_cause_name === 'NORMAL_CLEARING' || call.status === 'completed'))) ? (
                                    <>Analysis (Call in progress)</>
                                ) : (
                                    <>View Call Analysis</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {call.system_prompt && (
                <div className="border-t border-dark-700 p-6 bg-gradient-to-b from-dark-800/50 to-dark-900/50">
                    <h3 className="text-lg font-medium mb-3 text-white flex items-center">
                        <Shield size={18} className="mr-2 text-primary-400"/>
                        System Prompt
                    </h3>
                    <div
                        className="bg-dark-700/30 p-4 rounded-lg text-gray-300 border border-dark-600/40 shadow-inner overflow-auto max-h-96">
                        <pre className="whitespace-pre-wrap font-mono text-xs">{call.system_prompt}</pre>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default CallStatus;