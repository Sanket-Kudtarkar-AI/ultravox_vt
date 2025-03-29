/**
 * Utility functions and constants for call status information
 * Used to provide consistent handling of call statuses, hangup causes, and related information
 */

import {
  CheckCircle,
  XCircle,
  Phone,
  PhoneOff,
  AlertCircle,
  Clock,
  Info,
  MessageSquare
} from 'lucide-react';

// Call Status Definitions
export const CALL_STATUS = {
  RINGING: 'ringing',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  NO_ANSWER: 'no-answer',
  BUSY: 'busy',
  CANCEL: 'cancel',
  TIMEOUT: 'timeout',
  FAILED: 'failed',
  INITIATING: 'initiating',
  UNKNOWN: 'unknown'
};

// Plivo's Call State (from completed calls API)
export const CALL_STATE = {
  ANSWER: 'ANSWER',
  BUSY: 'BUSY',
  NO_ANSWER: 'NO_ANSWER',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
  EARLY_MEDIA: 'EARLY MEDIA'
};

// Hangup Cause Definitions
export const HANGUP_CAUSE = {
  NORMAL_CLEARING: 'NORMAL_CLEARING',
  NORMAL_HANGUP: 'Normal Hangup',
  BUSY_LINE: 'Busy Line',
  NO_ANSWER: 'No Answer',
  DECLINED: 'Declined',
  MACHINE_DETECTED: 'Machine Detected',
  INVALID_ANSWER_XML: 'Invalid Answer XML',
  UNKNOWN: 'Unknown'
};

// Hangup Source Definitions
export const HANGUP_SOURCE = {
  CALLER: 'CALLER',
  CALLEE: 'CALLEE',
  ERROR: 'Error',
  TIMEOUT: 'TIMEOUT',
  SYSTEM: 'SYSTEM',
  UNKNOWN: 'UNKNOWN'
};

// Detailed descriptions for call status
export const CALL_STATUS_DESCRIPTIONS = {
  [CALL_STATUS.RINGING]: 'Phone is ringing at recipient',
  [CALL_STATUS.IN_PROGRESS]: 'Call is currently active',
  [CALL_STATUS.COMPLETED]: 'Call has ended successfully',
  [CALL_STATUS.NO_ANSWER]: 'Recipient did not answer the call',
  [CALL_STATUS.BUSY]: 'Recipient phone was busy',
  [CALL_STATUS.CANCEL]: 'Call was canceled',
  [CALL_STATUS.TIMEOUT]: 'Call timed out without connecting',
  [CALL_STATUS.FAILED]: 'Call failed to connect',
  [CALL_STATUS.INITIATING]: 'Call is being initiated',
  [CALL_STATUS.UNKNOWN]: 'Call status unknown'
};

// Detailed descriptions for hangup causes
export const HANGUP_CAUSE_DESCRIPTIONS = {
  [HANGUP_CAUSE.NORMAL_CLEARING]: 'Call ended normally',
  [HANGUP_CAUSE.NORMAL_HANGUP]: 'Call ended normally',
  [HANGUP_CAUSE.BUSY_LINE]: 'Recipient line was busy',
  [HANGUP_CAUSE.NO_ANSWER]: 'Recipient did not answer',
  [HANGUP_CAUSE.DECLINED]: 'Call was declined by recipient',
  [HANGUP_CAUSE.MACHINE_DETECTED]: 'Answering machine detected',
  [HANGUP_CAUSE.INVALID_ANSWER_XML]: 'System error: Invalid answer XML',
  [HANGUP_CAUSE.UNKNOWN]: 'Unknown reason for call ending'
};

// Detailed descriptions for hangup sources
export const HANGUP_SOURCE_DESCRIPTIONS = {
  [HANGUP_SOURCE.CALLER]: 'Caller ended the call',
  [HANGUP_SOURCE.CALLEE]: 'Recipient ended the call',
  [HANGUP_SOURCE.ERROR]: 'Call ended due to a system error',
  [HANGUP_SOURCE.TIMEOUT]: 'Call ended due to timeout',
  [HANGUP_SOURCE.SYSTEM]: 'Call ended by the system',
  [HANGUP_SOURCE.UNKNOWN]: 'Unknown source for ending the call'
};

// Badge variants for call status
export const CALL_STATUS_VARIANTS = {
  [CALL_STATUS.RINGING]: 'warning',
  [CALL_STATUS.IN_PROGRESS]: 'info',
  [CALL_STATUS.COMPLETED]: 'success',
  [CALL_STATUS.NO_ANSWER]: 'default',
  [CALL_STATUS.BUSY]: 'warning',
  [CALL_STATUS.CANCEL]: 'default',
  [CALL_STATUS.TIMEOUT]: 'warning',
  [CALL_STATUS.FAILED]: 'error',
  [CALL_STATUS.INITIATING]: 'default',
  [CALL_STATUS.UNKNOWN]: 'default',

  // For Plivo Call States
  [CALL_STATE.ANSWER]: 'success',
  [CALL_STATE.BUSY]: 'warning',
  [CALL_STATE.NO_ANSWER]: 'default',
  [CALL_STATE.FAILED]: 'error',
  [CALL_STATE.TIMEOUT]: 'warning',
  [CALL_STATE.EARLY_MEDIA]: 'info'
};

// Icons for call status
export const CALL_STATUS_ICONS = {
  [CALL_STATUS.RINGING]: Phone,
  [CALL_STATUS.IN_PROGRESS]: Phone,
  [CALL_STATUS.COMPLETED]: CheckCircle,
  [CALL_STATUS.NO_ANSWER]: XCircle,
  [CALL_STATUS.BUSY]: PhoneOff,
  [CALL_STATUS.CANCEL]: XCircle,
  [CALL_STATUS.TIMEOUT]: AlertCircle,
  [CALL_STATUS.FAILED]: XCircle,
  [CALL_STATUS.INITIATING]: Clock,
  [CALL_STATUS.UNKNOWN]: Info,

  // For Plivo Call States
  [CALL_STATE.ANSWER]: CheckCircle,
  [CALL_STATE.BUSY]: PhoneOff,
  [CALL_STATE.NO_ANSWER]: XCircle,
  [CALL_STATE.FAILED]: XCircle,
  [CALL_STATE.TIMEOUT]: AlertCircle,
  [CALL_STATE.EARLY_MEDIA]: MessageSquare
};

// Should the status icon have a pulsing animation
export const CALL_STATUS_ANIMATE = {
  [CALL_STATUS.RINGING]: true,
  [CALL_STATUS.IN_PROGRESS]: true,
  [CALL_STATUS.INITIATING]: false,
  // All others default to false
};

/**
 * Get a formatted status display object
 * @param {string} status - The call status
 * @param {boolean} isPlivo - If true, interpret status as Plivo call state
 * @returns {object} Object with icon, text, variant, and description
 */
export const getStatusDisplay = (status, isPlivo = false) => {
  // Normalize status to lowercase for case-insensitive comparison
  const normalizedStatus = status ? status.toLowerCase() : 'unknown';

  // For Plivo call states (from completed calls)
  if (isPlivo) {
    const matchedState = Object.values(CALL_STATE).find(
      state => state.toLowerCase() === normalizedStatus
    );

    if (matchedState) {
      const Icon = CALL_STATUS_ICONS[matchedState] || Info;

      return {
        icon: <Icon size={12} />,
        text: matchedState === CALL_STATE.ANSWER ? 'Completed' : matchedState,
        variant: CALL_STATUS_VARIANTS[matchedState] || 'default',
        description: matchedState === CALL_STATE.ANSWER
          ? 'Call completed successfully'
          : `Call status: ${matchedState}`
      };
    }
  }

  // For regular call status
  const matchedStatus = Object.values(CALL_STATUS).find(
    s => s.toLowerCase() === normalizedStatus
  ) || CALL_STATUS.UNKNOWN;

  const Icon = CALL_STATUS_ICONS[matchedStatus] || Info;
  const animate = CALL_STATUS_ANIMATE[matchedStatus] || false;

  return {
    icon: <Icon size={12} className={animate ? "animate-gentle-pulse" : ""} />,
    text: matchedStatus.charAt(0).toUpperCase() + matchedStatus.slice(1),
    variant: CALL_STATUS_VARIANTS[matchedStatus] || 'default',
    description: CALL_STATUS_DESCRIPTIONS[matchedStatus] || 'Call status unknown'
  };
};

/**
 * Get a description for a hangup cause
 * @param {string} cause - The hangup cause
 * @returns {string} Human-readable description
 */
export const getHangupCauseDescription = (cause) => {
  if (!cause) return 'Unknown reason';

  // Check for exact match
  if (HANGUP_CAUSE_DESCRIPTIONS[cause]) {
    return HANGUP_CAUSE_DESCRIPTIONS[cause];
  }

  // Check for partial match (case insensitive)
  const lowerCause = cause.toLowerCase();
  for (const [key, description] of Object.entries(HANGUP_CAUSE_DESCRIPTIONS)) {
    if (key.toLowerCase().includes(lowerCause) || lowerCause.includes(key.toLowerCase())) {
      return description;
    }
  }

  // If no match, return the original cause
  return cause;
};

/**
 * Get a description for a hangup source
 * @param {string} source - The hangup source
 * @returns {string} Human-readable description
 */
export const getHangupSourceDescription = (source) => {
  if (!source) return 'Unknown source';

  // Check for exact match
  if (HANGUP_SOURCE_DESCRIPTIONS[source]) {
    return HANGUP_SOURCE_DESCRIPTIONS[source];
  }

  // Check for partial match (case insensitive)
  const lowerSource = source.toLowerCase();
  for (const [key, description] of Object.entries(HANGUP_SOURCE_DESCRIPTIONS)) {
    if (key.toLowerCase().includes(lowerSource) || lowerSource.includes(key.toLowerCase())) {
      return description;
    }
  }

  // If no match, return the original source
  return source;
};

/**
 * Format call duration in seconds to a human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "2m 30s" or "1h 15m 30s")
 */
export const formatCallDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};