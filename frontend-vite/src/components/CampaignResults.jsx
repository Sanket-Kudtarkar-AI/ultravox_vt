import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, ChevronLeft, RefreshCw, Download, CheckCircle, XCircle,
  AlertCircle, Clock, Search, Phone, Filter, Calendar, ChevronDown,
  ChevronUp, PieChart, Activity, ArrowUpRight, Info
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Input from './ui/Input';

const CampaignResults = ({
  campaign,
  API_BASE_URL,
  onBack
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);

  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPerPage] = useState(20);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Analysis availability tracking state
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [checkingAnalysis, setCheckingAnalysis] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(campaign.status === 'running');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch campaign data on component mount
  useEffect(() => {
    fetchCampaignData();
  }, [campaign.campaign_id]);

  // Filter contacts when search term, status filter, or contacts change
  useEffect(() => {
    filterContacts();
  }, [searchTerm, statusFilter, contacts]);

  // Check analysis availability when contacts are loaded
  useEffect(() => {
    if (contacts.length > 0 && campaign.status === 'completed') {
      checkAnalysisAvailability();
    }
  }, [contacts]);

  // Auto-refresh effect with optimized update strategy
  useEffect(() => {
    let interval;
    if (autoRefresh && campaign.status === 'running') {
      interval = setInterval(() => {
        // Update only what's needed based on the current state
        if (contacts.some(c => c.status === 'calling')) {
          // If we have active calls, prioritize updating call status
          const contactsWithCallUuids = contacts.filter(
            contact => contact.call_uuid && (contact.status === 'calling')
          );

          if (contactsWithCallUuids.length > 0) {
            fetchCallDetails(contactsWithCallUuids);
          } else {
            fetchCampaignData();
          }
        } else {
          // Otherwise do a full refresh but without causing UI flicker
          fetchCampaignData();
        }
      }, 1000); // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, campaign.status, contacts]);

  // Retry checking analysis for up to 15 seconds
  useEffect(() => {
    if (retryCount > 0 && retryCount <= MAX_RETRIES &&
        analysisProgress < 100 && contacts.filter(c => c.status === 'completed').length > 0) {
      const timer = setTimeout(() => {
        checkAnalysisAvailability();
      }, 1000); // 5 second intervals for 15 seconds total

      return () => clearTimeout(timer);
    }
  }, [retryCount, analysisProgress, contacts]);

  // Function to fetch call details for calls that have UUIDs
  const fetchCallDetails = async (contactsWithCallUuids) => {
    if (!contactsWithCallUuids || contactsWithCallUuids.length === 0) return;

    // Don't set loading state during updates
    const updateStartTime = new Date();

    try {
      // Process in batches to avoid too many simultaneous requests
      const batchSize = 5;
      const updatedContacts = [...contacts];

      for (let i = 0; i < contactsWithCallUuids.length; i += batchSize) {
        const batch = contactsWithCallUuids.slice(i, i + batchSize);

        // Process each call in the batch
        await Promise.all(batch.map(async (contact) => {
          if (!contact.call_uuid) return;

          try {
            // Get call details
            const response = await fetch(`${API_BASE_URL}/call_details/${contact.call_uuid}`);

            if (response.ok) {
              const data = await response.json();

              if (data.status === 'success' && data.call) {
                // Find the index of this contact in our contacts array
                const contactIndex = updatedContacts.findIndex(c => c.id === contact.id);

                if (contactIndex !== -1) {
                  // Update the additional_data field with call details
                  let additionalData = {};

                  try {
                    // Parse existing additional_data if it exists
                    if (updatedContacts[contactIndex].additional_data) {
                      additionalData = JSON.parse(updatedContacts[contactIndex].additional_data);
                    }
                  } catch (e) {
                    console.error("Error parsing additional_data:", e);
                    additionalData = {};
                  }

                  // Add call details
                  additionalData.call_log_state = data.call.call_state;
                  additionalData.call_log_hangup_cause = data.call.hangup_cause;
                  additionalData.call_log_duration = data.call.call_duration;

                  // If contact status is still 'calling' but call is completed, update status
                  if (updatedContacts[contactIndex].status === 'calling') {
                    if (data.call.call_state === 'ANSWER') {
                      updatedContacts[contactIndex].status = 'completed';
                    } else if (data.call.call_state === 'FAILED' || data.call.call_state === 'EARLY MEDIA') {
                      updatedContacts[contactIndex].status = 'failed';
                    } else if (data.call.call_state === 'NO_ANSWER' || data.call.call_state === 'BUSY' || data.call.call_state === 'TIMEOUT') {
                      updatedContacts[contactIndex].status = 'no-answer';
                    }
                  }

                  // Update additional_data as JSON string
                  updatedContacts[contactIndex].additional_data = JSON.stringify(additionalData);
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching details for call ${contact.call_uuid}:`, error);
          }
        }));
      }

      // Only update contacts state if there are changes
      const contactsChanged = JSON.stringify(updatedContacts) !== JSON.stringify(contacts);
      if (contactsChanged) {
        setContacts(updatedContacts);
        filterContacts(updatedContacts);
      }

      // Update contacts in database if their status changed
      const contactsWithChangedStatus = updatedContacts.filter(
        c => c.status === 'calling' &&
        (c.additional_data &&
         ((JSON.parse(c.additional_data).call_log_state === 'ANSWER') ||
          (JSON.parse(c.additional_data).call_log_state === 'FAILED') ||
          (JSON.parse(c.additional_data).call_log_state === 'NO_ANSWER') ||
          (JSON.parse(c.additional_data).call_log_state === 'EARLY MEDIA') ||
          (JSON.parse(c.additional_data).call_log_state === 'BUSY') ||
          (JSON.parse(c.additional_data).call_log_state === 'TIMEOUT')))
      );

      if (contactsWithChangedStatus.length > 0) {
        // Call API to update contacts in database
        await Promise.all(contactsWithChangedStatus.map(async (contact) => {
          try {
            const additionalData = JSON.parse(contact.additional_data);
            let newStatus = 'calling';

            if (additionalData.call_log_state === 'ANSWER') {
              newStatus = 'completed';
            } else if (additionalData.call_log_state === 'FAILED' || additionalData.call_log_state === 'EARLY MEDIA') {
              newStatus = 'failed';
            } else if (additionalData.call_log_state === 'NO_ANSWER' || additionalData.call_log_state === 'BUSY' || additionalData.call_log_state === 'TIMEOUT') {
              newStatus = 'no-answer';
            }

            // Update contact status in database
            return fetch(`${API_BASE_URL}/campaigns/${campaign.campaign_id}/contacts/${contact.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                status: newStatus,
                additional_data: additionalData
              })
            });
          } catch (error) {
            console.error(`Error updating contact ${contact.id}:`, error);
          }
        }));
      }

      // Update last updated timestamp only if we completed within a reasonable timeframe
      const updateDuration = new Date() - updateStartTime;
      if (updateDuration < 3000) { // Only update timestamp if refresh was quick
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error fetching call details:", error);
    }
  };

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

      // Set a flag rather than using the global loading state
      setCheckingAnalysis(true);

      // Track successful analysis results
      let availableAnalysis = 0;
      let statuses = {...analysisStatus};

      // Only check for calls that aren't already known to have analysis
      const contactsToCheck = completedContacts.filter(contact =>
        !statuses[contact.call_uuid] || !statuses[contact.call_uuid].hasAnalysis
      );

      if (contactsToCheck.length === 0) {
        // All completed calls already have analysis data
        setCheckingAnalysis(false);
        return;
      }

      // Process calls in batches to avoid too many parallel requests
      const batchSize = 5;
      for (let i = 0; i < contactsToCheck.length; i += batchSize) {
        const batch = contactsToCheck.slice(i, i + batchSize);

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
      }

      // Count total available analyses (including ones we already knew about)
      const totalAvailableAnalyses = Object.values(statuses).filter(s => s?.hasAnalysis).length;

      // Update progress based on total
      setAnalysisStatus(statuses);
      setAnalysisProgress(Math.round((totalAvailableAnalyses / completedContacts.length) * 100));
      setCheckingAnalysis(false);

      // Schedule a retry if not all analyses are available yet
      if (completedContacts.length > 0 && totalAvailableAnalyses < completedContacts.length) {
        setRetryCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error checking analysis availability:', error);
      setCheckingAnalysis(false);
    }
  };

  // Fetch campaign data from API
  const fetchCampaignData = async () => {
    if (!campaign.campaign_id) return;

    // Only show loading state on first load, not during refreshes
    if (!campaignStats) {
      setLoading(true);
    }

    setError(null);
    setLastUpdated(new Date());

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
        const loadedContacts = contactsData.contacts;

        // Don't update contacts if nothing has changed (avoids flickering)
        const contactsChanged = JSON.stringify(loadedContacts) !== JSON.stringify(contacts);

        if (contactsChanged) {
          setContacts(loadedContacts);
          filterContacts(loadedContacts);
        }

        // Find contacts with call_uuid but status still 'calling'
        // These might need to have their statuses updated from call_logs
        const contactsWithCallUuids = loadedContacts.filter(
          contact => contact.call_uuid && (contact.status === 'calling')
        );

        // If we have contacts that might need updating, fetch their call details
        if (contactsWithCallUuids.length > 0) {
          await fetchCallDetails(contactsWithCallUuids);
        }
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

  // Filter contacts based on search term and status filter
  const filterContacts = (contactsToFilter = contacts) => {
    let filtered = [...contactsToFilter];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => contact.status === statusFilter);
    }

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        (contact.name && contact.name.toLowerCase().includes(searchLower)) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchLower)) ||
        (contact.call_uuid && contact.call_uuid.toLowerCase().includes(searchLower))
      );
    }

    setFilteredContacts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  // Export results to CSV
  const exportToCSV = () => {
    if (!contacts || contacts.length === 0) return;

    // Create CSV header
    const headers = [
      'Name',
      'Phone',
      'Status',
      'Call UUID',
      'Duration',
      'Timestamp'
    ];

    // Create CSV rows
    const rows = contacts.map(contact => [
      contact.name || '',
      contact.phone || '',
      contact.status || '',
      contact.call_uuid || '',
      contact.additional_data?.duration || '',
      contact.updated_at || ''
    ]);

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Set link attributes and trigger download
    link.setAttribute('href', url);
    link.setAttribute('download', `${campaign.campaign_name}_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to format dates
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Helper to get status badge for contacts with more detailed statuses
  const getStatusBadge = (status, callState) => {
    // If we have a call_state from the call log, use that for more precise status
    if (callState) {
      switch(callState) {
        case 'ANSWER':
          return <Badge variant="success" pill>
            <div className="flex items-center">
              <CheckCircle size={12} className="mr-1"/>
              Completed
            </div>
          </Badge>;

        case 'BUSY':
          return <Badge variant="warning" pill>
            <div className="flex items-center">
              <AlertCircle size={12} className="mr-1"/>
              Busy
            </div>
          </Badge>;

        case 'NO_ANSWER':
          return <Badge variant="default" pill>
            <div className="flex items-center">
              <XCircle size={12} className="mr-1"/>
              No Answer
            </div>
          </Badge>;

        case 'FAILED':
          return <Badge variant="error" pill>
            <div className="flex items-center">
              <XCircle size={12} className="mr-1"/>
              Failed
            </div>
          </Badge>;

        case 'EARLY MEDIA':
          return <Badge variant="warning" pill>
            <div className="flex items-center">
              <AlertCircle size={12} className="mr-1"/>
              Early Media
            </div>
          </Badge>;

        case 'TIMEOUT':
          return <Badge variant="warning" pill>
            <div className="flex items-center">
              <Clock size={12} className="mr-1"/>
              Timed Out
            </div>
          </Badge>;

        default:
          // Fall back to the contact status if we don't recognize the call_state
          break;
      }
    }

    // If no call_state or unrecognized, use the contact status
    switch(status) {
      case 'completed':
        return <Badge variant="success" pill>
          <div className="flex items-center">
            <CheckCircle size={12} className="mr-1"/>
            Completed
          </div>
        </Badge>;

      case 'failed':
        return <Badge variant="error" pill>
          <div className="flex items-center">
            <XCircle size={12} className="mr-1"/>
            Failed
          </div>
        </Badge>;

      case 'no-answer':
        return <Badge variant="warning" pill>
          <div className="flex items-center">
            <AlertCircle size={12} className="mr-1"/>
            No Answer
          </div>
        </Badge>;

      case 'calling':
        return <Badge variant="info" pill glow>
          <div className="flex items-center">
            <Phone size={12} className="mr-1 animate-pulse"/>
            Calling
          </div>
        </Badge>;

      case 'ringing':
        return <Badge variant="info" pill glow>
          <div className="flex items-center">
            <Phone size={12} className="mr-1 animate-gentle-pulse"/>
            Ringing
          </div>
        </Badge>;

      case 'in-progress':
        return <Badge variant="primary" pill glow>
          <div className="flex items-center">
            <Phone size={12} className="mr-1 animate-pulse"/>
            In Progress
          </div>
        </Badge>;

      case 'pending':
        return <Badge variant="default" pill>
          <div className="flex items-center">
            <Clock size={12} className="mr-1"/>
            Pending
          </div>
        </Badge>;

      default:
        return <Badge variant="default" pill>
          <div className="flex items-center">
            <Info size={12} className="mr-1"/>
            {status || 'Unknown'}
          </div>
        </Badge>;
    }
  };

  // Calculate total pages for pagination
  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);

  // Get current page contacts
  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);

  // Helper functions for pagination
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    // Determine which page numbers to show
    const pageNumbers = [];

    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show first page
      pageNumbers.push(1);

      // Show pages around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      if (startPage > 2) {
        pageNumbers.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }

      // Show last page
      pageNumbers.push(totalPages);
    }

    return (
      <div className="flex justify-center mt-4 space-x-1">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-md ${
            currentPage === 1
              ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
              : 'bg-dark-700 text-white hover:bg-dark-600'
          }`}
        >
          Prev
        </button>

        {pageNumbers.map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' ? goToPage(page) : null}
            className={`px-3 py-1 rounded-md ${
              page === currentPage
                ? 'bg-primary-600 text-white'
                : page === '...'
                ? 'bg-dark-700 text-gray-400 cursor-default'
                : 'bg-dark-700 text-white hover:bg-dark-600'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={nextPage}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-md ${
            currentPage === totalPages
              ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
              : 'bg-dark-700 text-white hover:bg-dark-600'
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <BarChart size={20} className="mr-2 text-primary-400" />
            {campaign.campaign_name} Results
          </h3>
          <Badge
            variant="info"
            pill
            className="ml-4"
          >
            {campaign.status}
          </Badge>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center mr-3">
            <label htmlFor="auto-refresh" className="text-sm text-gray-400 mr-2">
              Auto Refresh:
            </label>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="auto-refresh"
                className="sr-only peer"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
              />
              <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </div>
            {autoRefresh && campaign.status === 'running' && (
              <div className="ml-3 text-xs text-gray-400 flex items-center">
                <Clock size={12} className="mr-1" />
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
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
            onClick={exportToCSV}
            variant="primary"
            size="sm"
            disabled={!contacts || contacts.length === 0}
            icon={<Download size={16} />}
          >
            Export
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

      {/* Loading State - Only show on first load when no data is available */}
      {loading && !campaignStats && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <RefreshCw size={32} className="text-primary-400 animate-spin mb-4" />
            <p className="text-gray-400">Loading campaign results...</p>
          </div>
        </div>
      )}

      {/* Silent refresh indicator when data exists but is refreshing */}
      {loading && campaignStats && (
        <div className="fixed top-4 right-4 bg-dark-800/80 backdrop-blur-sm shadow-lg p-2 rounded-full z-10">
          <RefreshCw size={16} className="text-primary-400 animate-spin" />
        </div>
      )}

      {!loading && campaignStats && (
        <>
          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Key Metrics */}
            <div className="bg-dark-700/30 p-5 rounded-lg border border-dark-600 hover:border-primary-500/30 transition-colors shadow-md">
              <h4 className="font-medium text-white mb-4 flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-900/30 border border-blue-500/20 flex items-center justify-center mr-3">
                  <PieChart size={16} className="text-blue-400" />
                </div>
                Campaign Summary
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Total Contacts</div>
                  <div className="text-2xl font-bold text-white">{campaignStats.total_contacts || 0}</div>
                </div>

                <div className="bg-dark-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Completion Rate</div>
                  <div className="text-2xl font-bold text-white">{campaignStats.completion_rate || 0}%</div>
                </div>

                <div className="bg-dark-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Success Rate</div>
                  <div className="text-2xl font-bold text-white">{campaignStats.success_rate || 0}%</div>
                </div>

                <div className="bg-dark-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Avg. Call Duration</div>
                  <div className="text-2xl font-bold text-white">{campaignStats.average_call_duration || 0}s</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
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
            </div>

            {/* Campaign Progress */}
            <div className="bg-dark-700/30 p-5 rounded-lg border border-dark-600 hover:border-primary-500/30 transition-colors shadow-md">
              <h4 className="font-medium text-white mb-4 flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary-900/30 border border-primary-500/20 flex items-center justify-center mr-3">
                  <Activity size={16} className="text-primary-400" />
                </div>
                Campaign Progress
              </h4>

              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Overall Progress</span>
                  <span className="text-white">{campaignStats.completion_rate || 0}%</span>
                </div>

                <div className="w-full bg-dark-600 rounded-full h-4 mb-1">
                  <div
                    className="bg-gradient-to-r from-primary-600 to-primary-400 h-4 rounded-full"
                    style={{ width: `${campaignStats.completion_rate || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Analysis Progress */}
              {campaign.status === 'completed' && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Analysis Ready</span>
                    <span className="text-white">{analysisProgress}%</span>
                  </div>

                  <div className="w-full bg-dark-600 rounded-full h-4 mb-1">
                    <div
                      className="bg-gradient-to-r from-accent-600 to-accent-400 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${analysisProgress}%` }}
                    ></div>
                  </div>

                  <div className="text-xs text-gray-500">
                    {checkingAnalysis ? (
                      <div className="flex items-center">
                        <RefreshCw size={12} className="animate-spin mr-1" />
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
                          <RefreshCw size={12} className="mr-1" />
                          Refresh
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Campaign Created:</span>
                  <span className="text-white">{formatDateTime(campaignStats.created_at)}</span>
                </div>

                {campaignStats.schedule_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Scheduled Date:</span>
                    <span className="text-white">{formatDateTime(campaignStats.schedule_date)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Last Updated:</span>
                  <span className="text-white">{formatDateTime(campaignStats.updated_at)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">From Number:</span>
                  <span className="text-white">{campaign.from_number}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Agent:</span>
                  <span className="text-white">{campaign.assigned_agent_name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Results */}
          <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-medium text-white flex items-center">
                <Phone size={18} className="mr-2 text-primary-400" />
                Call Results
              </h4>

              <Button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                variant="secondary"
                size="sm"
                icon={<Filter size={16} />}
              >
                Filter
                <ChevronDown size={14} className={`ml-1 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Filters */}
            {isFilterOpen && (
              <div className="mb-6 p-4 bg-dark-800/50 rounded-lg animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Input
                      label="Search"
                      id="search"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      placeholder="Search by name, phone, or ID"
                      icon={<Search size={16} />}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="no-answer">No Answer</option>
                      <option value="calling">Calling</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      variant="outline"
                      fullWidth
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-dark-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Call UUID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Analysis
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-600/50">
                  {currentContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-dark-700/30">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <div className="text-white font-medium">{contact.name}</div>
                          <div className="text-gray-400 text-sm">{contact.phone}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {/* Use the enhanced status badge with call state from additional_data */}
                        {(() => {
                          let callState = null;
                          // Try to extract call_state from additional_data if available
                          if (contact.additional_data) {
                            try {
                              const additionalData = JSON.parse(contact.additional_data);
                              if (additionalData.call_details && additionalData.call_details.call_state) {
                                callState = additionalData.call_details.call_state;
                              } else if (additionalData.call_log_state) {
                                callState = additionalData.call_log_state;
                              }
                            } catch (e) {
                              console.error("Error parsing additional_data:", e);
                            }
                          }
                          return getStatusBadge(contact.status, callState);
                        })()}
                      </td>
                      <td className="px-4 py-4 text-gray-300">
                        {(() => {
                          // Try to get duration from additional_data
                          if (contact.additional_data) {
                            try {
                              const additionalData = JSON.parse(contact.additional_data);
                              if (additionalData.duration) {
                                return `${additionalData.duration}s`;
                              } else if (additionalData.call_details && additionalData.call_details.call_duration) {
                                return `${additionalData.call_details.call_duration}s`;
                              }
                            } catch (e) {
                              console.error("Error parsing additional_data for duration:", e);
                            }
                          }
                          return contact.status === 'completed' ? 'Completed' : '-';
                        })()}
                      </td>
                      <td className="px-4 py-4 text-gray-300">
                        {formatDateTime(contact.updated_at)}
                      </td>
                      <td className="px-4 py-4 text-gray-300 font-mono text-xs">
                        {contact.call_uuid ? (
                          <div className="max-w-[150px] truncate" title={contact.call_uuid}>
                            {contact.call_uuid}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-4">
                        {contact.status === 'completed' || contact.status === 'failed' ? (
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

                  {currentContacts.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                        {filteredContacts.length === 0 && contacts.length > 0
                          ? 'No contacts match your filter criteria'
                          : 'No contacts found for this campaign'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {renderPagination()}
          </div>
        </>
      )}
    </div>
  );
};

export default CampaignResults;