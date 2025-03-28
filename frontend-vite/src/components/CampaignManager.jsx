import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall, Upload, X, Plus, Users, Check, BarChart, Save,
  Play, Pause, Clock, ListFilter, RefreshCw, ArrowLeft,
  Copy, Trash2, Edit, Calendar, Filter, ChevronDown, FileText,
  AlertTriangle, CheckCircle, XCircle, PieChart
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Badge from './ui/Badge';
import Papa from 'papaparse';
import CampaignCard from './CampaignCard';
import CampaignCreationWizard from './CampaignCreationWizard';
import CampaignResults from './CampaignResults';

const CampaignManager = ({
  agents,
  onBack,
  onCreateAgent,
  savedFromNumbers,
  API_BASE_URL
}) => {
  // Main view states
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'results'
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Filtering/sorting states
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch campaigns on component mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Function to fetch campaigns from the API
  const fetchCampaigns = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/campaigns`);

      if (!response.ok) {
        throw new Error(`Error fetching campaigns: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setCampaigns(data.campaigns);
      } else {
        throw new Error(data.message || 'Failed to fetch campaigns');
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle creating a new campaign
  const handleCreateCampaign = () => {
    setCurrentView('create');
    setSelectedCampaign(null);
  };

  // Function to handle editing an existing campaign
  const handleEditCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setCurrentView('create');
  };

  // Function to handle duplicating a campaign
  const handleDuplicateCampaign = async (campaignId) => {
    try {
      // In a real implementation, you would call an API to duplicate the campaign
      // For now, we'll just get the campaign and show a success message
      const campaign = campaigns.find(c => c.campaign_id === campaignId);
      if (campaign) {
        alert(`Campaign ${campaign.campaign_name} would be duplicated. This functionality is not yet implemented.`);
      }
    } catch (err) {
      console.error('Error duplicating campaign:', err);
      alert(`Error duplicating campaign: ${err.message}`);
    }
  };

  // Function to handle deleting a campaign
  const handleDeleteCampaign = async (campaignId) => {
    if (window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      try {
        setIsLoading(true);

        const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error(`Error deleting campaign: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
          // Remove the deleted campaign from state
          setCampaigns(campaigns.filter(c => c.campaign_id !== campaignId));
          alert('Campaign deleted successfully');
        } else {
          throw new Error(data.message || 'Failed to delete campaign');
        }
      } catch (err) {
        console.error('Error deleting campaign:', err);
        alert(`Error deleting campaign: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Function to handle viewing campaign results
  const handleViewResults = (campaign) => {
    setSelectedCampaign(campaign);
    setCurrentView('results');
  };

  // Function to handle campaign status updates (pause/resume/stop)
  const handleUpdateCampaignStatus = async (campaignId, newStatus) => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error(`Error updating campaign status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        // Update the campaign in state
        setCampaigns(campaigns.map(c =>
          c.campaign_id === campaignId
            ? { ...c, status: newStatus }
            : c
        ));
      } else {
        throw new Error(data.message || 'Failed to update campaign status');
      }
    } catch (err) {
      console.error('Error updating campaign status:', err);
      alert(`Error updating campaign status: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle campaign creation completion
  const handleCampaignCreated = (newCampaign) => {
    setCampaigns(prev => [newCampaign, ...prev]);
    setCurrentView('list');
  };

  // Functions for filtering and sorting
  const getFilteredAndSortedCampaigns = () => {
    return campaigns
      .filter(campaign => {
        if (statusFilter === 'all') return true;
        return campaign.status === statusFilter;
      })
      .sort((a, b) => {
        let valueA = a[sortField];
        let valueB = b[sortField];

        // Handle date fields
        if (sortField === 'created_at' || sortField === 'updated_at' || sortField === 'schedule_date') {
          valueA = new Date(valueA || 0);
          valueB = new Date(valueB || 0);
        }

        // Handle string fields
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          const result = valueA.localeCompare(valueB);
          return sortDirection === 'asc' ? result : -result;
        }

        // Handle numeric fields
        const result = valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        return sortDirection === 'asc' ? result : -result;
      });
  };

  // Toggle sort direction or change sort field
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending when changing fields
    }
  };

  // Render different views based on currentView state
  const renderContent = () => {
    switch (currentView) {
      case 'create':
        return (
          <CampaignCreationWizard
            agents={agents}
            savedFromNumbers={savedFromNumbers}
            API_BASE_URL={API_BASE_URL}
            onBack={() => setCurrentView('list')}
            onCampaignCreated={handleCampaignCreated}
            campaign={selectedCampaign} // Pass if editing
          />
        );

      case 'results':
        return (
          <CampaignResults
            campaign={selectedCampaign}
            API_BASE_URL={API_BASE_URL}
            onBack={() => setCurrentView('list')}
          />
        );

      case 'list':
      default:
        const filteredAndSortedCampaigns = getFilteredAndSortedCampaigns();

        return (
          <div className="space-y-6">
            {/* Header with action buttons */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-semibold text-white">All Campaigns</h3>
                <Badge variant="info" pill>
                  {campaigns.length}
                </Badge>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  variant="secondary"
                  size="md"
                  icon={<Filter size={18} />}
                >
                  Filter
                  <ChevronDown size={14} className={`ml-1 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                </Button>

                <Button
                  onClick={fetchCampaigns}
                  variant="secondary"
                  size="md"
                  disabled={isLoading}
                  icon={<RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />}
                >
                  Refresh
                </Button>

                <Button
                  onClick={handleCreateCampaign}
                  variant="primary"
                  size="md"
                  icon={<Plus size={18} />}
                >
                  Create Campaign
                </Button>
              </div>
            </div>

            {/* Filters and sorting (collapsible) */}
            {isFilterOpen && (
              <div className="bg-dark-700/30 p-4 rounded-lg animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Status Filter
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                    >
                      <option value="all">All Statuses</option>
                      <option value="created">Created</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="running">Running</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Sort By
                    </label>
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                    >
                      <option value="created_at">Creation Date</option>
                      <option value="campaign_name">Campaign Name</option>
                      <option value="status">Status</option>
                      <option value="updated_at">Last Updated</option>
                      <option value="schedule_date">Schedule Date</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Sort Direction
                    </label>
                    <select
                      value={sortDirection}
                      onChange={(e) => setSortDirection(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-8 text-center bg-dark-700/30 rounded-lg">
                <AlertTriangle size={40} className="mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-medium mb-2 text-white">Error Loading Campaigns</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <Button
                  onClick={fetchCampaigns}
                  variant="primary"
                  icon={<RefreshCw size={16} />}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !error && (
              <div className="p-8 text-center bg-dark-700/30 rounded-lg">
                <RefreshCw size={40} className="mx-auto mb-4 text-primary-400 animate-spin" />
                <h3 className="text-lg font-medium text-white">Loading Campaigns...</h3>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && campaigns.length === 0 && (
              <div className="p-8 text-center bg-dark-700/30 rounded-lg">
                <FileText size={40} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2 text-white">No Campaigns Found</h3>
                <p className="text-gray-400 mb-4">
                  Create your first campaign to start making automated calls.
                </p>
                <Button
                  onClick={handleCreateCampaign}
                  variant="primary"
                  icon={<Plus size={16} />}
                >
                  Create Campaign
                </Button>
              </div>
            )}

            {/* Campaign Grid */}
            {!isLoading && !error && filteredAndSortedCampaigns.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAndSortedCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.campaign_id}
                    campaign={campaign}
                    onEdit={() => handleEditCampaign(campaign)}
                    onDuplicate={() => handleDuplicateCampaign(campaign.campaign_id)}
                    onDelete={() => handleDeleteCampaign(campaign.campaign_id)}
                    onViewResults={() => handleViewResults(campaign)}
                    onUpdateStatus={(status) => handleUpdateCampaignStatus(campaign.campaign_id, status)}
                  />
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-dark-700 flex justify-between items-center bg-dark-800/50 backdrop-blur-sm">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-3 p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors"
          >
            <ArrowLeft size={20}/>
          </button>
          <h2 className="text-xl font-semibold text-white">Campaign Manager</h2>
        </div>

        {currentView === 'list' && (
          <Button
            onClick={onCreateAgent}
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
          >
            Create New Agent
          </Button>
        )}
      </div>

      <div className="p-6">
        {renderContent()}
      </div>
    </Card>
  );
};

export default CampaignManager;