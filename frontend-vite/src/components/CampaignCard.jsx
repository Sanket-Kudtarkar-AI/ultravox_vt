import React, { useState } from 'react';
import {
  Play, Pause, Square, Edit, Copy, Trash2, BarChart,
  Phone, Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  User, Eye, Activity
} from 'lucide-react';
import Badge from './ui/Badge';
import Button from './ui/Button';

const CampaignCard = ({
  campaign,
  onEdit,
  onDuplicate,
  onDelete,
  onViewResults,
  onUpdateStatus
}) => {
  const [showActions, setShowActions] = useState(false);

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Helper to determine status badge properties
  const getStatusBadge = (status) => {
    switch(status) {
      case 'running':
        return { variant: 'success', icon: <Play size={14} />, text: 'Running', glow: true };
      case 'paused':
        return { variant: 'warning', icon: <Pause size={14} />, text: 'Paused' };
      case 'completed':
        return { variant: 'info', icon: <CheckCircle size={14} />, text: 'Completed' };
      case 'scheduled':
        return { variant: 'purple', icon: <Calendar size={14} />, text: 'Scheduled' };
      case 'created':
        return { variant: 'default', icon: <Clock size={14} />, text: 'Created' };
      default:
        return { variant: 'default', icon: <AlertCircle size={14} />, text: status };
    }
  };

  // Calculate progress
  const calculateProgress = () => {
    if (campaign.progress !== undefined && campaign.progress !== null) {
      return campaign.progress;
    }

    if (campaign.statistics && campaign.statistics.progress !== undefined) {
      return campaign.statistics.progress;
    }

    if (campaign.statistics) {
      const { total_contacts, completed_contacts, failed_contacts, no_answer_contacts } = campaign.statistics;
      if (total_contacts && total_contacts > 0) {
        const processed = (completed_contacts || 0) + (failed_contacts || 0) + (no_answer_contacts || 0);
        return Math.round((processed / total_contacts) * 100);
      }
    }

    return 0;
  };

  // Get analysis progress if available
  const analysisProgress = campaign.analysis_progress !== undefined ?
    campaign.analysis_progress :
    (campaign.statistics && campaign.statistics.analysis_progress !== undefined ?
      campaign.statistics.analysis_progress :
      0);

  const progressPercent = calculateProgress();
  const statusBadge = getStatusBadge(campaign.status);

  return (
    <div
      className="bg-dark-700/30 rounded-lg border border-dark-600 overflow-hidden hover:border-primary-700/50 transition-colors shadow-md hover:shadow-lg"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Card Header */}
      <div className="p-3 border-b border-dark-600 bg-dark-800/40 flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-dark-600 p-1.5 rounded-lg mr-2">
            <Phone size={16} className="text-primary-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">{campaign.campaign_name}</h3>
            <p className="text-gray-400 text-xs flex items-center">
              <Clock size={12} className="mr-1" />
              Created: {formatDate(campaign.created_at)}
            </p>
          </div>
        </div>

        <Badge
          variant={statusBadge.variant}
          pill
          glow={statusBadge.glow}
        >
          <div className="flex items-center">
            {statusBadge.icon}
            <span className="ml-1">{statusBadge.text}</span>
          </div>
        </Badge>
      </div>

      {/* Card Body */}
      <div className="p-3">
        {/* Agent Information */}
        <div className="flex items-start mb-2">
          <User size={14} className="text-gray-400 mr-1.5 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Agent</p>
            <p className="text-white font-medium text-sm">{campaign.assigned_agent_name || 'Unknown Agent'}</p>
          </div>
        </div>

        {/* Campaign Schedule - Only show if scheduled */}
        {campaign.schedule_date && (
          <div className="flex items-start mb-2">
            <Calendar size={14} className="text-gray-400 mr-1.5 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400">Scheduled For</p>
              <p className="text-white font-medium text-sm">{formatDate(campaign.schedule_date)}</p>
            </div>
          </div>
        )}

        {/* Contact Statistics */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-400">Progress</span>
            <span className="text-white">{progressPercent}%</span>
          </div>

          <div className="w-full bg-dark-600 rounded-full h-2 mb-0.5">
            <div
              className="bg-gradient-to-r from-primary-600 to-primary-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>{campaign.total_contacts || 0} contacts</span>
            <span>
              {campaign.statistics ?
                `${campaign.statistics.completed_contacts || 0} completed` :
                '0 completed'}
            </span>
          </div>
        </div>

        {/* Analysis Progress - Only show for completed campaigns or if analysis progress > 0 */}
        {(campaign.status === 'completed' || analysisProgress > 0) && (
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-0.5 items-center">
              <span className="text-gray-400 flex items-center">
                <Activity size={10} className="mr-1 text-accent-400" />
                Analysis Ready
              </span>
              <span className="text-white">{analysisProgress}%</span>
            </div>

            <div className="w-full bg-dark-600 rounded-full h-2 mb-0.5">
              <div
                className="bg-gradient-to-r from-accent-600 to-accent-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Success Rate if available */}
        {campaign.statistics && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-dark-800/50 p-1.5 rounded-lg">
              <p className="text-xs text-gray-400">Completion</p>
              <p className="text-white font-medium text-sm">
                {campaign.statistics.completion_percentage || 0}%
              </p>
            </div>

            <div className="bg-dark-800/50 p-1.5 rounded-lg">
              <p className="text-xs text-gray-400">Success Rate</p>
              <p className="text-white font-medium text-sm">
                {campaign.statistics.success_rate || 0}%
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`flex flex-wrap justify-between transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <div>
            {/* View Results - show for any campaign status */}
            <Button
              onClick={onViewResults}
              variant="primary"
              size="xs"
              icon={<BarChart size={12} />}
              title="View Campaign Details"
            >
              Details
            </Button>
          </div>

          <div className="space-x-1">
            {/* Edit Button - only for created/scheduled */}
            {(campaign.status === 'created' || campaign.status === 'scheduled') && (
              <Button
                onClick={onEdit}
                variant="outline"
                size="xs"
                icon={<Edit size={12} />}
                title="Edit Campaign"
              />
            )}

            {/* Duplicate Button */}
            <Button
              onClick={onDuplicate}
              variant="outline"
              size="xs"
              icon={<Copy size={12} />}
              title="Duplicate Campaign"
            />

            {/* Delete Button */}
            <Button
              onClick={onDelete}
              variant="danger"
              size="xs"
              icon={<Trash2 size={12} />}
              title="Delete Campaign"
            />
          </div>
        </div>

        {/* Status Control Buttons */}
        {(campaign.status === 'created' || campaign.status === 'scheduled' || campaign.status === 'paused') && (
          <Button
            onClick={() => onUpdateStatus('running')}
            variant="success"
            size="xs"
            icon={<Play size={12} />}
            fullWidth
            className="mt-2"
          >
            {campaign.status === 'paused' ? 'Resume Campaign' : 'Start Campaign'}
          </Button>
        )}

        {campaign.status === 'running' && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button
              onClick={() => onUpdateStatus('paused')}
              variant="warning"
              size="xs"
              icon={<Pause size={12} />}
              fullWidth
            >
              Pause
            </Button>

            <Button
              onClick={() => onUpdateStatus('completed')}
              variant="danger"
              size="xs"
              icon={<Square size={12} />}
              fullWidth
            >
              Stop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignCard;