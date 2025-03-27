// API client functions for interacting with the backend

// Base API URL - can be configured using environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Error handler function to standardize error handling
const handleApiError = (error, customMessage = null) => {
  console.error('API Error:', error);

  // If we have a response with error data, use that
  if (error.response && error.response.data) {
    return {
      status: 'error',
      message: error.response.data.message || customMessage || 'An error occurred while processing your request',
      statusCode: error.response.status
    };
  }

  // Handle network errors
  if (error.request) {
    return {
      status: 'error',
      message: 'Network error - please check your connection',
      statusCode: 0
    };
  }

  // Handle other errors
  return {
    status: 'error',
    message: customMessage || error.message || 'An unexpected error occurred',
    statusCode: 0
  };
};

/**
 * Make a call to the specified phone number
 * @param {Object} callData - Call data (recipient_phone_number, plivo_phone_number, etc.)
 * @returns {Promise<Object>} Call response
 */
export const makeCall = async (callData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/make_call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to initiate call');
  }
};

/**
 * Get the status of a call
 * @param {string} callUuid - Call UUID
 * @returns {Promise<Object>} Call status
 */
export const getCallStatus = async (callUuid) => {
  try {
    const response = await fetch(`${API_BASE_URL}/call_status/${callUuid}`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get call status');
  }
};

/**
 * Get recent calls with pagination
 * @param {number} limit - Number of calls to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} Recent calls
 */
export const getRecentCalls = async (limit = 20, offset = 0) => {
  try {
    const response = await fetch(`${API_BASE_URL}/recent_calls?limit=${limit}&offset=${offset}`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get recent calls');
  }
};

/**
 * Get details for a specific call
 * @param {string} callUuid - Call UUID
 * @returns {Promise<Object>} Call details
 */
export const getCallDetails = async (callUuid) => {
  try {
    const response = await fetch(`${API_BASE_URL}/call_details/${callUuid}`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get call details');
  }
};

/**
 * Get call mapping between Plivo UUID and Ultravox ID
 * @param {string} callUuid - Plivo Call UUID
 * @returns {Promise<Object>} Call mapping
 */
export const getCallMapping = async (callUuid) => {
  try {
    const response = await fetch(`${API_BASE_URL}/call_mapping/${callUuid}`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get call mapping');
  }
};

/**
 * Get call transcription
 * @param {string} callId - Ultravox Call ID
 * @param {boolean} refresh - Whether to refresh cache
 * @returns {Promise<Object>} Call transcription
 */
export const getCallTranscription = async (callId, refresh = false) => {
  try {
    const url = refresh
      ? `${API_BASE_URL}/call_transcription/${callId}?refresh=true`
      : `${API_BASE_URL}/call_transcription/${callId}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get call transcription');
  }
};

/**
 * Get call recording URL
 * @param {string} callId - Ultravox Call ID
 * @param {boolean} refresh - Whether to refresh cache
 * @returns {Promise<Object>} Call recording URL
 */
export const getCallRecording = async (callId, refresh = false) => {
  try {
    const url = refresh
      ? `${API_BASE_URL}/call_recording/${callId}?refresh=true`
      : `${API_BASE_URL}/call_recording/${callId}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get call recording');
  }
};

/**
 * Get call analytics
 * @param {string} callId - Ultravox Call ID
 * @param {string} callUuid - Plivo Call UUID
 * @param {boolean} refresh - Whether to refresh cache
 * @returns {Promise<Object>} Call analytics
 */
export const getCallAnalytics = async (callId, callUuid, refresh = false) => {
  try {
    const url = refresh
      ? `${API_BASE_URL}/call_analytics/${callId}/${callUuid}?refresh=true`
      : `${API_BASE_URL}/call_analytics/${callId}/${callUuid}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get call analytics');
  }
};

/**
 * Analyze call transcript
 * @param {string} callId - Ultravox Call ID
 * @param {boolean} refresh - Whether to refresh cache
 * @returns {Promise<Object>} Analysis results
 */
export const analyzeTranscript = async (callId, refresh = false) => {
  try {
    const url = refresh
      ? `${API_BASE_URL}/analyze_transcript/${callId}?refresh=true`
      : `${API_BASE_URL}/analyze_transcript/${callId}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to analyze transcript');
  }
};

// ==============================
// Agent API Functions
// ==============================

/**
 * Get all agents
 * @returns {Promise<Object>} All agents
 */
export const getAgents = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/agents`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get agents');
  }
};

/**
 * Get a specific agent
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} Agent details
 */
export const getAgent = async (agentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get agent');
  }
};

/**
 * Create a new agent
 * @param {Object} agentData - Agent data
 * @returns {Promise<Object>} Created agent
 */
export const createAgent = async (agentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to create agent');
  }
};

/**
 * Update an existing agent
 * @param {string} agentId - Agent ID
 * @param {Object} agentData - Updated agent data
 * @returns {Promise<Object>} Updated agent
 */
export const updateAgent = async (agentId, agentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to update agent');
  }
};

/**
 * Delete an agent
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAgent = async (agentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete agent');
  }
};

/**
 * Duplicate an agent
 * @param {string} agentId - Agent ID to duplicate
 * @returns {Promise<Object>} Duplicated agent
 */
export const duplicateAgent = async (agentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/duplicate/${agentId}`, {
      method: 'POST'
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to duplicate agent');
  }
};

/**
 * Bulk import agents
 * @param {Array} agents - Array of agent objects
 * @returns {Promise<Object>} Import result
 */
export const bulkImportAgents = async (agents) => {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/bulk-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agents)
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to import agents');
  }
};

// ==============================
// Phone Number API Functions
// ==============================

/**
 * Get all saved phone numbers
 * @param {string} type - Optional type filter ('recipient' or 'from')
 * @returns {Promise<Object>} All phone numbers
 */
export const getPhoneNumbers = async (type = null) => {
  try {
    const url = type
      ? `${API_BASE_URL}/phone-numbers?type=${type}`
      : `${API_BASE_URL}/phone-numbers`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get phone numbers');
  }
};

/**
 * Save a new phone number
 * @param {Object} phoneData - Phone number data
 * @returns {Promise<Object>} Saved phone number
 */
export const savePhoneNumber = async (phoneData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/phone-numbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(phoneData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to save phone number');
  }
};

/**
 * Update a phone number's usage timestamp
 * @param {string} phoneNumber - Phone number to update
 * @returns {Promise<Object>} Updated phone number
 */
export const updateNumberUsage = async (phoneNumber) => {
  try {
    const response = await fetch(`${API_BASE_URL}/phone-numbers/update-usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone_number: phoneNumber })
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to update phone number usage');
  }
};

/**
 * Delete a phone number
 * @param {number} numberId - Phone number ID
 * @returns {Promise<Object>} Deletion result
 */
export const deletePhoneNumber = async (numberId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/phone-numbers/${numberId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete phone number');
  }
};

// ==============================
// Campaign API Functions
// ==============================

/**
 * Get all campaigns
 * @returns {Promise<Object>} All campaigns
 */
export const getCampaigns = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get campaigns');
  }
};

/**
 * Get a specific campaign
 * @param {number} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign details
 */
export const getCampaign = async (campaignId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get campaign');
  }
};

/**
 * Create a new campaign
 * @param {Object} campaignData - Campaign data
 * @returns {Promise<Object>} Created campaign
 */
export const createCampaign = async (campaignData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to create campaign');
  }
};

/**
 * Update a campaign
 * @param {number} campaignId - Campaign ID
 * @param {Object} campaignData - Updated campaign data
 * @returns {Promise<Object>} Updated campaign
 */
export const updateCampaign = async (campaignId, campaignData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to update campaign');
  }
};

/**
 * Delete a campaign
 * @param {number} campaignId - Campaign ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteCampaign = async (campaignId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete campaign');
  }
};

/**
 * Update a campaign's status
 * @param {number} campaignId - Campaign ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated campaign
 */
export const updateCampaignStatus = async (campaignId, status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to update campaign status');
  }
};

/**
 * Get campaign contacts
 * @param {number} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign contacts
 */
export const getCampaignContacts = async (campaignId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/contacts`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get campaign contacts');
  }
};

/**
 * Add contacts to a campaign
 * @param {number} campaignId - Campaign ID
 * @param {Array} contacts - Array of contact objects
 * @returns {Promise<Object>} Added contacts
 */
export const addCampaignContacts = async (campaignId, contacts) => {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contacts)
    });

    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to add campaign contacts');
  }
};

/**
 * Get campaign statistics
 * @param {number} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign statistics
 */
export const getCampaignStats = async (campaignId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/stats`);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { data, status: response.status } };
    }

    return data;
  } catch (error) {
    return handleApiError(error, 'Failed to get campaign statistics');
  }
};

/**
 * Get server status
 * @returns {Promise<Object>} Server status
 */
export const getServerStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/status`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (response.ok) {
      return { status: 'online', timestamp: new Date().toISOString() };
    } else {
      return { status: 'error', message: 'Server returned an error response' };
    }
  } catch (error) {
    console.warn('Server status check failed:', error);
    return { status: 'offline', message: 'Server is not responding' };
  }
};