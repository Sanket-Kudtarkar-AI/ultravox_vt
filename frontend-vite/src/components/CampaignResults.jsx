import React, { useState, useEffect } from 'react';
import {
  BarChart, ChevronLeft, RefreshCw, Download, CheckCircle, XCircle,
  AlertCircle, Clock, Search, Phone, Filter, Calendar, ChevronDown,
  ChevronUp, PieChart, Activity, ArrowUpRight
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

  // Fetch campaign data when component mounts
  useEffect(() => {
    fetchCampaignData();
  }, [campaign.campaign_id]);

  // Filter contacts when search term, status filter, or contacts change
  useEffect(() => {
    filterContacts();
  }, [searchTerm, statusFilter, contacts]);

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
        filterContacts(contactsData.contacts);
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

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <RefreshCw size={32} className="text-primary-400 animate-spin mb-4" />
            <p className="text-gray-400">Loading campaign results...</p>
          </div>
        </div>
      )}

      {!loading && campaignStats && (
        <>
          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Key Metrics */}
            <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
              <h4 className="text-lg font-medium text-white mb-4 flex items-center">
                <PieChart size={18} className="mr-2 text-primary-400" />
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
            <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
              <h4 className="text-lg font-medium text-white mb-4 flex items-center">
                <Activity size={18} className="mr-2 text-primary-400" />
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
                      Actions
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
                        {getStatusBadge(contact.status)}
                      </td>
                      <td className="px-4 py-4 text-gray-300">
                        {contact.status === 'completed' && contact.additional_data?.duration
                          ? `${contact.additional_data.duration}s`
                          : '-'}
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
                        {contact.call_uuid && contact.status === 'completed' ? (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={<ArrowUpRight size={14} />}
                            onClick={() => {
                              // This would link to the call analysis view
                              // onViewCallAnalysis(contact.call_uuid);
                              alert(`View analysis for call: ${contact.call_uuid}`);
                            }}
                          >
                            Analysis
                          </Button>
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