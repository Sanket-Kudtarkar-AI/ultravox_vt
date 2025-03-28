import React, { useState, useEffect } from 'react';
import {
  Phone, RefreshCw, ChevronLeft, Play, Pause, Square,
  BarChart, Clock, CheckCircle, XCircle, AlertCircle,
  User, Activity
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

const CampaignMonitoring = ({
  campaign,
  API_BASE_URL,
  onBack,
  onUpdateStatus,
  onViewResults
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Analysis availability tracking state
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [checkingAnalysis, setCheckingAnalysis] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Fetch campaign stats and contacts when component mounts
  useEffect(() => {
    fetchCampaignData();

    // Start auto-refresh interval if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchCampaignData();
        setLastUpdated(new Date());
      }, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [campaign.campaign_id, autoRefresh]);

  // Check analysis availability when contacts change
  useEffect(() => {
    if (contacts.filter(c => c.status === 'completed').length > 0) {
      checkAnalysisAvailability();
    }
  }, [contacts]);

  // Retry checking analysis for up to 15 seconds
  useEffect(() => {
    if (retryCount > 0 && retryCount <= MAX_RETRIES &&
        analysisProgress < 100 && contacts.filter(c => c.status === 'completed').length > 0) {
      const timer = setTimeout(() => {
        checkAnalysisAvailability();
      }, 5000); // 5 second intervals for 15 seconds total

      return () => clearTimeout(timer);
    }
  }, [retryCount, analysisProgress, contacts]);

  // Function to check analysis availability for completed calls
  const checkAnalysisAvailability = async () => {
    try {
      // Only check analysis for completed contacts with call UUIDs
      const completedContacts = contacts.filter(contact =>
        contact.status === 'completed' && contact.call_uuid
      );

      if (completedContacts.length === 0) {
        setAnalysisProgress(0);
        return;
      }

      setCheckingAnalysis(true);

      // Track successful analysis results
      let availableAnalysis = 0;
      let statuses = {...analysisStatus};

      // Process calls in batches to avoid too many parallel requests
      const batchSize = 5;
      for (let i = 0; i < completedContacts.length; i += batchSize) {
        const batch = completedContacts.slice(i, i + batchSize);

        // Run checks in parallel for this batch
        const results = await Promise.all(batch.map(async (contact) => {
          const callUuid = contact.call_uuid;

          // Skip if we already know this call has full analysis
          if (statuses[callUuid] && statuses[callUuid].hasAnalysis) {
            return statuses[callUuid];
          }

          // Get the VT call ID mapping
          const mappingResponse = await fetch(`${API_BASE_URL}/call_mapping/${callUuid}`);

          if (!mappingResponse.ok) {
            return { callUuid, hasAnalysis: false, reason: 'mapping-error' };
          }

          const mappingData = await mappingResponse.json();

          if (mappingData.status !== 'success' || !mappingData.mapping.ultravox_call_id) {
            return { callUuid, hasAnalysis: false, reason: 'no-mapping' };
          }

          const vtCallId = mappingData.mapping.ultravox_call_id;

          // Check transcription
          const transcriptResponse = await fetch(`${API_BASE_URL}/call_transcription/${vtCallId}`);
          const hasTranscript = transcriptResponse.ok;

          // Check recording
          const recordingResponse = await fetch(`${API_BASE_URL}/call_recording/${vtCallId}`);
          const hasRecording = recordingResponse.ok;

          // Check analytics (for summary)
          const analyticsResponse = await fetch(`${API_BASE_URL}/call_analytics/${vtCallId}/${callUuid}`);
          let hasSummary = false;

          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            hasSummary = analyticsData.status === 'success' &&
                        analyticsData.analytics &&
                        analyticsData.analytics.ultravox &&
                        analyticsData.analytics.ultravox.summary;
          }

          const allAvailable = hasTranscript && hasRecording && hasSummary;

          return {
            callUuid,
            vtCallId,
            hasAnalysis: allAvailable,
            details: {
              transcript: hasTranscript,
              recording: hasRecording,
              summary: hasSummary
            }
          };
        }));

        // Update our tracking
        results.forEach(result => {
          if (result.hasAnalysis) availableAnalysis++;
          statuses[result.callUuid] = result;
        });

        // Update progress after each batch
        setAnalysisStatus(statuses);
        setAnalysisProgress(Math.round((availableAnalysis / completedContacts.length) * 100));
      }

      setCheckingAnalysis(false);

      // Schedule a retry if not all analyses are available yet
      if (completedContacts.length > 0 && availableAnalysis < completedContacts.length) {
        setRetryCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error checking analysis availability:', error);
      setCheckingAnalysis(false);
    }
  };

  // Fetch campaign data from API
  const fetchCampaignData = async () => {
    if (!campaign || !campaign.campaign_id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch campaign statistics
      const statsResponse = await fetch(`${API_BASE_URL}/campaigns/${campaign.campaign_id}/stats`);

      if (!statsResponse.ok) {
        throw new Error(`Error fetching campaign stats: ${statsResponse.status}`);
      }

      const statsData = await statsResponse.json();

      if (statsData.status === 'success') {
        setCampaignStats(statsData.statistics);
      } else {
        throw new Error(statsData.message || 'Failed to fetch campaign statistics');
      }

      // Fetch campaign contacts
      const contactsResponse = await fetch(`${API_BASE_URL}/campaigns/${campaign.campaign_id}/contacts`);

      if (!contactsResponse.ok) {
        throw new Error(`Error fetching campaign contacts: ${contactsResponse.status}`);
      }

      const contactsData = await contactsResponse.json();

      if (contactsData.status === 'success') {
        setContacts(contactsData.contacts);
      } else {
        throw new Error(contactsData.message || 'Failed to fetch campaign contacts');
      }
    } catch (err) {
      console.error('Error fetching campaign data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format dates
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Helper to get status badge for contacts
  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return <Badge variant="success" pill><CheckCircle size={14} className="mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="error" pill><XCircle size={14} className="mr-1" />Failed</Badge>;
      case 'no-answer':
        return <Badge variant="warning" pill><AlertCircle size={14} className="mr-1" />No Answer</Badge>;
      case 'calling':
        return <Badge variant="info" pill glow><Phone size={14} className="mr-1 animate-pulse" />Calling</Badge>;
      case 'pending':
        return <Badge variant="default" pill><Clock size={14} className="mr-1" />Pending</Badge>;
      default:
        return <Badge variant="default" pill>{status}</Badge>;
    }
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!campaignStats) return 0;

    const {
      total_contacts,
      completed_contacts,
      failed_contacts,
      no_answer_contacts
    } = campaignStats;

    if (!total_contacts) return 0;

    const processedContacts = completed_contacts + failed_contacts + no_answer_contacts;
    return Math.round((processedContacts / total_contacts) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Phone size={20} className="mr-2 text-primary-400" />
            {campaign.campaign_name}
          </h3>
          <Badge
            variant={campaign.status === 'running' ? 'success' : 'warning'}
            pill
            glow={campaign.status === 'running'}
            className="ml-4"
          >
            {campaign.status === 'running' ? (
              <div className="flex items-center">
                <Play size={14} className="mr-1" />
                Running
              </div>
            ) : (
              <div className="flex items-center">
                <Pause size={14} className="mr-1" />
                Paused
              </div>
            )}
          </Badge>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-400 bg-dark-700/50 px-3 py-1 rounded-lg flex items-center">
            <Clock size={14} className="mr-1.5" />
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>

          <Button
            onClick={fetchCampaignData}
            variant="secondary"
            size="sm"
            disabled={loading}
            icon={<RefreshCw size={16} className={loading ? "animate-spin" : ""} />}
          >
            Refresh
          </Button>

          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            icon={<ChevronLeft size={16} />}
          >
            Back
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-900/40 p-4 rounded-lg text-white flex items-start">
          <AlertCircle size={20} className="text-red-400 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Campaign Progress and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Card */}
        <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600 col-span-2">
          <h4 className="text-lg font-medium text-white mb-4 flex items-center">
            <Activity size={18} className="mr-2 text-primary-400" />
            Campaign Progress
          </h4>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Overall Progress</span>
              <span className="text-white">{calculateProgress()}%</span>
            </div>

            <div className="w-full bg-dark-600 rounded-full h-4 mb-1">
              <div
                className="bg-gradient-to-r from-primary-600 to-primary-400 h-4 rounded-full transition-all duration-500"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>

          {/* Analysis Progress */}
          {contacts.filter(c => c.status === 'completed').length > 0 && (
            <div className="mt-6 mb-4">
              <h5 className="text-sm font-medium text-white mb-2 flex items-center">
                <Activity size={14} className="mr-1.5 text-accent-400" />
                Analysis Progress
              </h5>

              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Analysis Ready</span>
                <span className="text-white">{analysisProgress}%</span>
              </div>

              <div className="w-full bg-dark-600 rounded-full h-2.5 mb-1">
                <div
                  className="bg-gradient-to-r from-accent-600 to-accent-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>

              <div className="text-xs text-gray-500">
                {checkingAnalysis ? (
                  <div className="flex items-center">
                    <RefreshCw size={10} className="animate-spin mr-1" />
                    Checking analysis availability...
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>
                      {Object.values(analysisStatus).filter(s => s?.hasAnalysis).length} of {
                        contacts.filter(c => c.status === 'completed').length
                      } calls have complete analysis
                    </span>
                    <button
                      onClick={checkAnalysisAvailability}
                      className="text-accent-400 hover:text-accent-300 flex items-center"
                    >
                      <RefreshCw size={10} className="mr-1" />
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Summaries */}
          {campaignStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-dark-800/50 p-3 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Total Calls</div>
                <div className="text-xl font-bold text-white">{campaignStats.total_contacts || 0}</div>
              </div>

              <div className="bg-green-900/20 border border-green-900/30 p-3 rounded-lg">
                <div className="text-xs text-green-400 mb-1">Completed</div>
                <div className="text-xl font-bold text-white">{campaignStats.completed_contacts || 0}</div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-900/30 p-3 rounded-lg">
                <div className="text-xs text-yellow-400 mb-1">No Answer</div>
                <div className="text-xl font-bold text-white">{campaignStats.no_answer_contacts || 0}</div>
              </div>

              <div className="bg-red-900/20 border border-red-900/30 p-3 rounded-lg">
                <div className="text-xs text-red-400 mb-1">Failed</div>
                <div className="text-xl font-bold text-white">{campaignStats.failed_contacts || 0}</div>
              </div>
            </div>
          )}
        </div>

        {/* Controls Card */}
        <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
          <h4 className="text-lg font-medium text-white mb-4">Campaign Controls</h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Auto Refresh:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="border-t border-dark-600 my-4"></div>

            {campaign.status === 'running' ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => onUpdateStatus('paused')}
                  variant="warning"
                  fullWidth
                  icon={<Pause size={16} />}
                >
                  Pause
                </Button>

                <Button
                  onClick={() => onUpdateStatus('completed')}
                  variant="danger"
                  fullWidth
                  icon={<Square size={16} />}
                >
                  Stop
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => onUpdateStatus('running')}
                variant="success"
                fullWidth
                icon={<Play size={16} />}
              >
                Resume Campaign
              </Button>
            )}

            <Button
              onClick={onViewResults}
              variant="primary"
              fullWidth
              icon={<BarChart size={16} />}
            >
              View Results
            </Button>
          </div>

          {/* Campaign Info */}
          {campaignStats && (
            <div className="mt-6 pt-4 border-t border-dark-600">
              <h5 className="text-sm font-medium text-white mb-2">Campaign Info</h5>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white">{formatDateTime(campaign.created_at)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Agent:</span>
                  <span className="text-white">{campaign.assigned_agent_name}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">From:</span>
                  <span className="text-white">{campaign.from_number}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
        <h4 className="text-lg font-medium text-white mb-4 flex items-center">
          <Phone size={18} className="mr-2 text-primary-400" />
          Latest Calls
        </h4>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Call UUID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600/50">
              {contacts
                .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
                .slice(0, 10)
                .map((contact) => (
                  <tr key={contact.id} className="hover:bg-dark-700/30">
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <div className="text-white font-medium">{contact.name}</div>
                        <div className="text-gray-400 text-sm">{contact.phone}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(contact.status)}
                    </td>
                    <td className="px-4 py-4 text-gray-300">
                      {formatDateTime(contact.updated_at)}
                    </td>
                    <td className="px-4 py-4 text-gray-300">
                      {contact.status === 'completed' && contact.additional_data?.duration
                        ? `${contact.additional_data.duration}s`
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-gray-300 font-mono text-xs">
                      {contact.call_uuid || '-'}
                    </td>
                    <td className="px-4 py-4">
                      {contact.status === 'completed' ? (
                        <div>
                          {analysisStatus[contact.call_uuid] ? (
                            <div className="flex items-center space-x-1">
                              {analysisStatus[contact.call_uuid].hasAnalysis ? (
                                <Button
                                  variant="accent"
                                  size="xs"
                                  icon={<BarChart size={14} />}
                                  onClick={() => {
                                    // Link to analysis view
                                    window.open(`/analysis/${contact.call_uuid}/${analysisStatus[contact.call_uuid].vtCallId}`, '_blank');
                                  }}
                                >
                                  View
                                </Button>
                              ) : (
                                <div className="flex items-center text-xs text-yellow-400">
                                  <div className="w-2 h-2 rounded-full bg-yellow-400 mr-1.5 animate-pulse"></div>
                                  Processing
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center text-xs text-gray-400">
                              <div className="w-2 h-2 rounded-full bg-gray-500 mr-1.5"></div>
                              Checking...
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}

              {contacts.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    No calls have been made yet for this campaign.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CampaignMonitoring;