import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, ArrowLeft, ArrowRight, Check, FileText, Users,
  Calendar, RefreshCw, AlertTriangle, ChevronDown, ChevronUp,
  X, Plus, Phone, Info, Save, Clock, Play, User, Badge
} from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const CampaignCreationWizard = ({
  agents,
  savedFromNumbers,
  API_BASE_URL,
  onBack,
  onCampaignCreated,
  campaign // If provided, we're editing an existing campaign
}) => {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // File upload state
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const fileInputRef = useRef(null);

  // Column mapping state
  const [phoneColumnIndex, setPhoneColumnIndex] = useState(-1);
  const [nameColumnIndex, setNameColumnIndex] = useState(-1);
  const [showColumnMapping, setShowColumnMapping] = useState(true);

  // Contact validation state
  const [validContacts, setValidContacts] = useState([]);
  const [invalidContacts, setInvalidContacts] = useState([]);
  const [showInvalidContacts, setShowInvalidContacts] = useState(false);

  // Campaign details state
  const [campaignName, setCampaignName] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleNow, setScheduleNow] = useState(true);

  // Editing state
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Initialize form values on component mount
  useEffect(() => {
    // Set default values for new campaign or use existing values for editing
    if (campaign) {
      // Editing an existing campaign
      setCampaignName(campaign.campaign_name || '');
      setSelectedAgentId(campaign.assigned_agent_id || '');
      setFromNumber(campaign.from_number || '');

      if (campaign.schedule_date) {
        const scheduleDateTime = new Date(campaign.schedule_date);
        setScheduleDate(scheduleDateTime.toISOString().split('T')[0]);

        const hours = scheduleDateTime.getHours().toString().padStart(2, '0');
        const minutes = scheduleDateTime.getMinutes().toString().padStart(2, '0');
        setScheduleTime(`${hours}:${minutes}`);

        setScheduleNow(false);
      }

      // Since we're editing, also set the file name
      if (campaign.file_name) {
        setFileName(campaign.file_name);
      }

      // Fetch existing contacts when editing
      fetchCampaignContacts(campaign.campaign_id);
    } else {
      // New campaign - set smart defaults

      // Default agent - use the first agent in the list (oldest)
      if (agents && agents.length > 0) {
        setSelectedAgentId(agents[0].agent_id);
      }

      // Default from number - use the first saved number
      if (savedFromNumbers && savedFromNumbers.length > 0) {
        setFromNumber(savedFromNumbers[0]);
      }

      // Set default schedule time to 1 hour from now
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() + 1);

      setScheduleDate(defaultDate.toISOString().split('T')[0]);

      const defaultHours = defaultDate.getHours().toString().padStart(2, '0');
      const defaultMinutes = defaultDate.getMinutes().toString().padStart(2, '0');
      setScheduleTime(`${defaultHours}:${defaultMinutes}`);
    }
  }, [campaign, agents, savedFromNumbers]);

  // Function to fetch campaign contacts when editing
  const fetchCampaignContacts = async (campaignId) => {
    if (!campaignId) return;

    setIsLoadingContacts(true);

    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/contacts`);

      if (!response.ok) {
        throw new Error(`Error fetching campaign contacts: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success' && data.contacts && data.contacts.length > 0) {
        // Create a synthetic file data structure from the contacts
        const contactsData = data.contacts.map(contact => {
          // Convert contact's additional_data from string to object if needed
          let additionalData = {};
          if (contact.additional_data) {
            try {
              additionalData = typeof contact.additional_data === 'string'
                ? JSON.parse(contact.additional_data)
                : contact.additional_data;
            } catch (e) {
              console.error('Error parsing additional_data:', e);
            }
          }

          // Create a data object that includes name and phone plus any additional data
          return {
            name: contact.name || '',
            phone: contact.phone || '',
            ...additionalData
          };
        });

        // Extract headers from the first contact
        const sampleContact = contactsData[0];
        const extractedHeaders = Object.keys(sampleContact);

        // Set the file data and headers
        setFileData(contactsData);
        setHeaders(extractedHeaders);

        // Try to find phone and name columns
        let phoneColIndex = extractedHeaders.findIndex(h =>
          h.toLowerCase() === 'phone' || h.toLowerCase().includes('phone')
        );

        let nameColIndex = extractedHeaders.findIndex(h =>
          h.toLowerCase() === 'name' || h.toLowerCase().includes('name')
        );

        // Set column indices
        setPhoneColumnIndex(phoneColIndex !== -1 ? phoneColIndex : 0);
        setNameColumnIndex(nameColIndex !== -1 ? nameColIndex : 1);

        // Now validate contacts based on the detected columns
        validateContacts(
          contactsData,
          extractedHeaders[phoneColIndex !== -1 ? phoneColIndex : 0],
          extractedHeaders[nameColIndex !== -1 ? nameColIndex : 1]
        );

        setContactsLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching campaign contacts:', error);
      setError('Error loading campaign contacts. ' + error.message);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setLoading(true);
    setFileName(selectedFile.name);
    setFile(selectedFile);

    // Based on file type, use different parsers
    if (selectedFile.name.endsWith('.csv')) {
      parseCSV(selectedFile);
    } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
      parseExcel(selectedFile);
    } else {
      setError('Unsupported file type. Please upload a CSV or Excel file.');
      setLoading(false);
    }
  };

  // Parse CSV files using PapaParse
  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        handleParseComplete(results.data, results.meta.fields);
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
        setLoading(false);
      }
    });
  };

  // Parse Excel files using SheetJS
  const parseExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Extract headers (first row)
        const headers = jsonData[0];

        // Convert to object array format
        const rows = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = {};
          for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = jsonData[i][j];
          }
          rows.push(row);
        }

        handleParseComplete(rows, headers);
      } catch (error) {
        setError(`Error parsing Excel file: ${error.message}`);
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle completion of file parsing
  const handleParseComplete = (data, headers) => {
    setFileData(data);
    setHeaders(headers);

    // Try to auto-detect phone and name columns
    let detectedPhoneColumnIndex = -1;
    let detectedNameColumnIndex = -1;

    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase();

      // Detect phone column
      if (
        headerLower.includes('phone') ||
        headerLower.includes('mobile') ||
        headerLower.includes('contact') ||
        headerLower.includes('number')
      ) {
        detectedPhoneColumnIndex = index;
      }

      // Detect name column
      if (
        headerLower.includes('name') ||
        headerLower.includes('customer') ||
        headerLower.includes('client') ||
        headerLower.includes('contact name')
      ) {
        detectedNameColumnIndex = index;
      }
    });

    setPhoneColumnIndex(detectedPhoneColumnIndex);
    setNameColumnIndex(detectedNameColumnIndex);

    // Validate contacts based on detected columns
    if (detectedPhoneColumnIndex !== -1) {
      validateContacts(data, headers[detectedPhoneColumnIndex], detectedNameColumnIndex !== -1 ? headers[detectedNameColumnIndex] : null);
    }

    setLoading(false);
  };

  // Validate and automatically correct phone numbers
  const validateContacts = (data, phoneColumn, nameColumn) => {
    const validList = [];
    const invalidList = [];

    data.forEach((row, index) => {
      // Get phone number from the selected column
      let phoneNumber = row[phoneColumn] ? row[phoneColumn].toString().trim() : '';

      // Get name from the selected column or use a default
      const name = nameColumn && row[nameColumn] ? row[nameColumn].toString().trim() : `Contact ${index + 1}`;

      // Auto-correct common phone number format issues
      if (phoneNumber) {
        // Remove any non-digit characters except leading +
        const originalPhone = phoneNumber;
        phoneNumber = phoneNumber.replace(/[^\d+]/g, '');

        // Add country code if missing (assuming Indian numbers - +91)
        if (phoneNumber.startsWith('91') && !phoneNumber.startsWith('+91')) {
          // If it starts with 91 but not +91, add the +
          phoneNumber = '+' + phoneNumber;
        } else if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('91')) {
          // If doesn't start with + or 91, assume it's an Indian number and add +91
          if (phoneNumber.length === 10) {
            // Likely an Indian number without country code
            phoneNumber = '+91' + phoneNumber;
          } else {
            // Add + if missing but has some country code
            phoneNumber = '+' + phoneNumber;
          }
        }

        // Check if it's now a valid phone number with country code
        const isValid = /^\+[1-9]\d{1,14}$/.test(phoneNumber) && phoneNumber.length >= 10;

        if (isValid) {
          validList.push({
            id: index,
            name: name,
            phone: phoneNumber, // Use corrected phone number
            selected: true,
            data: {...row, [phoneColumn]: phoneNumber}, // Update the phone in data too
            wasFixed: phoneNumber !== originalPhone // Flag if we fixed it
          });
        } else {
          invalidList.push({
            id: index,
            name: name,
            phone: originalPhone,
            reason: 'Invalid phone format. Should be a mobile number with country code (e.g., +918879415567)',
            data: row
          });
        }
      }
    });

    // Display a message if we auto-fixed any numbers
    const fixedCount = validList.filter(contact => contact.wasFixed).length;
    if (fixedCount > 0) {
      setTimeout(() => {
        alert(`${fixedCount} phone numbers were automatically formatted to the correct format. You can review them in the valid contacts list.`);
      }, 500);
    }

    setValidContacts(validList);
    setInvalidContacts(invalidList);
  };

  // Update validation when column selection changes
  const handleColumnSelectionChange = () => {
    if (phoneColumnIndex === -1) return;

    const phoneColumn = headers[phoneColumnIndex];
    const nameColumn = nameColumnIndex !== -1 ? headers[nameColumnIndex] : null;

    validateContacts(fileData, phoneColumn, nameColumn);
  };

  // Toggle contact selection
  const toggleContactSelection = (id) => {
    setValidContacts(prev => prev.map(contact =>
      contact.id === id ? { ...contact, selected: !contact.selected } : contact
    ));
  };

  // Select or deselect all contacts
  const toggleSelectAll = () => {
    const allSelected = validContacts.every(contact => contact.selected);
    setValidContacts(prev => prev.map(contact => ({ ...contact, selected: !allSelected })));
  };

  // Handle campaign creation/update
  const handleCreateCampaign = async () => {
    // Validate form
    if (!campaignName) {
      setError('Please enter a campaign name');
      return;
    }

    if (!selectedAgentId) {
      setError('Please select an agent');
      return;
    }

    if (!fromNumber) {
      setError('Please enter a from number');
      return;
    }

    const selectedValidContacts = validContacts.filter(contact => contact.selected);
    if (selectedValidContacts.length === 0) {
      setError('Please select at least one valid contact');
      return;
    }

    // Prepare campaign data
    const campaignData = {
      campaign_name: campaignName,
      assigned_agent_id: selectedAgentId,
      from_number: fromNumber,
      total_contacts: selectedValidContacts.length,
      file_name: fileName
    };

    // Add schedule_date if not scheduled now
    if (!scheduleNow && scheduleDate && scheduleTime) {
      const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      campaignData.schedule_date = scheduleDateTime.toISOString();
      campaignData.status = 'scheduled';
    } else {
      campaignData.status = 'created';
    }

    setLoading(true);
    setError(null);

    try {
      // Determine if creating new or updating
      const isUpdate = !!campaign;
      const url = isUpdate
        ? `${API_BASE_URL}/campaigns/${campaign.campaign_id}`
        : `${API_BASE_URL}/campaigns`;

      const method = isUpdate ? 'PUT' : 'POST';

      // Create or update the campaign first
      const campaignResponse = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignData)
      });

      if (!campaignResponse.ok) {
        throw new Error(`Error ${isUpdate ? 'updating' : 'creating'} campaign: ${campaignResponse.status}`);
      }

      const campaignResult = await campaignResponse.json();

      if (campaignResult.status !== 'success') {
        throw new Error(campaignResult.message || `Failed to ${isUpdate ? 'update' : 'create'} campaign`);
      }

      const campaignId = isUpdate ? campaign.campaign_id : campaignResult.campaign.campaign_id;

      // Now add contacts to the campaign
      const contactsUrl = `${API_BASE_URL}/campaigns/${campaignId}/contacts`;

      const contactsData = selectedValidContacts.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        status: 'pending',
        additional_data: contact.data
      }));

      const contactsResponse = await fetch(contactsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactsData)
      });

      if (!contactsResponse.ok) {
        throw new Error(`Error adding contacts: ${contactsResponse.status}`);
      }

      const contactsResult = await contactsResponse.json();

      if (contactsResult.status !== 'success') {
        throw new Error(contactsResult.message || 'Failed to add contacts');
      }

      // Success! Notify parent component
      onCampaignCreated(isUpdate ? { ...campaign, ...campaignData } : campaignResult.campaign);

    } catch (err) {
      console.error('Error creating campaign:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Move to next step in the wizard
  const nextStep = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!campaignName) {
        setError('Please enter a campaign name');
        return;
      }

      if (!selectedAgentId) {
        setError('Please select an agent');
        return;
      }

      if (!fromNumber) {
        setError('Please enter a from number');
        return;
      }

      if (!file && !campaign && !contactsLoaded) {
        setError('Please upload a contact list');
        return;
      }
    } else if (currentStep === 2) {
      if (phoneColumnIndex === -1) {
        setError('Please select a phone number column');
        return;
      }

      if (validContacts.length === 0) {
        setError('No valid contacts found in the file');
        return;
      }

      if (validContacts.filter(c => c.selected).length === 0) {
        setError('Please select at least one contact');
        return;
      }
    } else if (currentStep === 3) {
      if (!scheduleNow && (!scheduleDate || !scheduleTime)) {
        setError('Please select both date and time for scheduling');
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
    setError(null);
  };

  // Move to previous step in the wizard
  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    setError(null);
  };

  // Render step indicators
  const renderSteps = () => {
    const steps = [
      { number: 1, title: 'Basic Info', icon: <Info size={14} /> },
      { number: 2, title: 'Contact List', icon: <Users size={14} /> },
      { number: 3, title: 'Schedule', icon: <Calendar size={14} /> },
      { number: 4, title: 'Review', icon: <FileText size={14} /> }
    ];

    // Handler for clicking on a step indicator
    const handleStepClick = (stepNumber) => {
      // Only allow navigating to previous or current steps
      if (stepNumber <= currentStep) {
        setCurrentStep(stepNumber);
      }
    };

    return (
      <div className="flex items-center justify-end mb-6">
        <div className="flex bg-dark-800/80 rounded-full p-1 border border-dark-600 shadow-inner">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* Step with modern indicator */}
              <div
                className={`flex items-center rounded-full px-3 py-1.5 transition-all duration-300 ${
                  currentStep === step.number
                    ? 'bg-primary-600 text-white shadow-lg'
                    : currentStep > step.number
                    ? 'bg-primary-800/40 text-primary-300 cursor-pointer hover:bg-primary-800/60'
                    : 'bg-transparent text-gray-400'
                }`}
                onClick={() => handleStepClick(step.number)}
              >
                <div className={`flex items-center justify-center w-5 h-5 rounded-full mr-1.5 transition-all ${
                  currentStep === step.number
                    ? 'bg-white text-primary-600'
                    : currentStep > step.number
                    ? 'bg-primary-700 text-white'
                    : 'bg-dark-700 text-gray-400'
                }`}>
                  {currentStep > step.number ? <Check size={10} /> : step.number}
                </div>
                <span className="text-xs font-medium">{step.title}</span>
              </div>

              {/* Connector (except after last step) */}
              {index < steps.length - 1 && (
                <div className="mx-1 text-gray-500">/</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // Render Step 1: Basic Information
  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white mb-4">
        Step 1: Campaign Setup
      </h3>

      {/* Campaign Name */}
      <Input
        label="Campaign Name"
        id="campaign_name"
        value={campaignName}
        onChange={(e) => setCampaignName(e.target.value)}
        placeholder="Enter a name for your campaign"
        required
      />

      {/* Agent Selection */}
      <Select
        label="Agent"
        id="agent"
        value={selectedAgentId}
        onChange={(e) => setSelectedAgentId(e.target.value)}
        options={agents.map(agent => ({ value: agent.agent_id, label: agent.name }))}
        placeholder="Select an agent to make calls"
        required
      />

      {/* From Number */}
      <Select
        label="From Number"
        id="from_number"
        value={fromNumber}
        onChange={(e) => setFromNumber(e.target.value)}
        options={savedFromNumbers.map(number => ({ value: number, label: number }))}
        placeholder="Select a phone number to call from"
        required
      />

      {/* File Upload */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">
          Contact List (CSV or Excel File)
          <span className="text-red-400 ml-1">*</span>
        </label>

        <div
          className={`mt-1 border-2 border-dashed rounded-lg ${
            file || contactsLoaded
              ? 'border-primary-600/50 bg-primary-900/10' 
              : 'border-dark-600 hover:border-dark-500'
          } transition-colors`}
        >
          <div className="p-6 text-center">
            {loading || isLoadingContacts ? (
              <div className="flex flex-col items-center">
                <RefreshCw size={24} className="text-primary-400 animate-spin mb-2" />
                <p className="text-gray-400">Processing file...</p>
              </div>
            ) : file || (fileName && contactsLoaded) ? (
              <div className="flex flex-col items-center">
                <FileText size={24} className="text-primary-400 mb-2" />
                <p className="text-white font-medium mb-1">{fileName}</p>
                <p className="text-gray-400 text-sm">
                  {fileData.length} records found
                </p>
                <button
                  onClick={() => {
                    setFile(null);
                    setFileName('');
                    setFileData([]);
                    setHeaders([]);
                    setValidContacts([]);
                    setInvalidContacts([]);
                    setContactsLoaded(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-2 px-3 py-1 bg-dark-700 hover:bg-dark-600 text-white text-sm rounded-md inline-flex items-center"
                >
                  <X size={14} className="mr-1" />
                  Remove File
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload size={24} className="text-gray-400 mb-2" />
                <p className="text-gray-400 mb-1">
                  Drag and drop your file here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="text-primary-400 hover:text-primary-300 font-medium"
                  >
                    browse
                  </button>
                </p>
                <p className="text-gray-500 text-sm">
                  Supported formats: CSV, XLSX
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Step 2: Column Mapping & Contact Validation
  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white mb-4">
        Step 2: Contact List Configuration
      </h3>

      {/* Column Mapping Section */}
      <div className="bg-dark-700/30 p-4 rounded-lg border border-dark-600">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setShowColumnMapping(!showColumnMapping)}
        >
          <h4 className="font-medium text-white flex items-center">
            <Info size={16} className="mr-2 text-primary-400" />
            Column Mapping
          </h4>
          <button className="text-gray-400 hover:text-white p-1">
            {showColumnMapping ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showColumnMapping && (
          <div className="mt-4 space-y-4">
            <p className="text-gray-400 text-sm">
              Map columns from your file to the required fields for the campaign.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone Number Column <span className="text-red-400">*</span>
                </label>
                <select
                  value={phoneColumnIndex}
                  onChange={(e) => {
                    setPhoneColumnIndex(parseInt(e.target.value));
                    setTimeout(handleColumnSelectionChange, 0);
                  }}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                >
                  <option value="-1">Select a column</option>
                  {headers.map((header, index) => (
                    <option key={index} value={index}>{header}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Phone numbers should include country code (e.g., +918879415567)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name Column (Optional)
                </label>
                <select
                  value={nameColumnIndex}
                  onChange={(e) => {
                    setNameColumnIndex(parseInt(e.target.value));
                    setTimeout(handleColumnSelectionChange, 0);
                  }}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                >
                  <option value="-1">Select a column</option>
                  {headers.map((header, index) => (
                    <option key={index} value={index}>{header}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Name is used for better identification in reports
                </p>
              </div>
            </div>

            {/* Preview of file data */}
            {headers.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-white mb-2">Data Preview</h5>
                <div className="max-h-32 overflow-y-auto bg-dark-800/50 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-dark-700/50">
                      <tr>
                        {headers.map((header, index) => (
                          <th
                            key={index}
                            className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                              index === phoneColumnIndex
                                ? 'text-primary-400 border-b border-primary-400'
                                : index === nameColumnIndex
                                ? 'text-accent-400 border-b border-accent-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600/50">
                      {fileData.slice(0, 3).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-dark-700/30">
                          {headers.map((header, colIndex) => (
                            <td
                              key={colIndex}
                              className={`px-3 py-2 ${
                                colIndex === phoneColumnIndex
                                  ? 'text-primary-400'
                                  : colIndex === nameColumnIndex
                                  ? 'text-accent-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              {row[header] !== undefined ? row[header] : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {fileData.length > 3 && (
                  <p className="mt-2 text-xs text-gray-400">
                    Showing 3 of {fileData.length} records
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Valid Contacts Section */}
      <div className="bg-dark-700/30 p-5 rounded-lg border border-dark-600 hover:border-primary-500/30 transition-colors shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-white flex items-center">
            <div className="w-8 h-8 rounded-full bg-green-900/30 border border-green-500/20 flex items-center justify-center mr-3">
              <Check size={16} className="text-green-400" />
            </div>
            Valid Contacts
          </h4>
          <div className="flex items-center space-x-2">
            <Badge variant="success" pill>
              {validContacts.filter(c => c.selected).length} selected
            </Badge>
            <span className="text-sm text-gray-400">of {validContacts.length} valid</span>
          </div>
        </div>

        {isLoadingContacts ? (
          <div className="flex flex-col items-center py-10">
            <RefreshCw size={32} className="text-primary-400 animate-spin mb-4" />
            <p className="text-gray-400">Loading contacts...</p>
          </div>
        ) : validContacts.length > 0 ? (
          <>
            <div className="bg-dark-800/50 rounded-lg border border-dark-600 overflow-hidden shadow-inner">
              <table className="min-w-full">
                <thead className="bg-dark-700/80">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={validContacts.length > 0 && validContacts.every(c => c.selected)}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-500 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Phone Number
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-600/30">
                  {validContacts.slice(0, 5).map((contact) => (
                    <tr key={contact.id} className="hover:bg-dark-700/40 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={contact.selected}
                          onChange={() => toggleContactSelection(contact.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-500 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {contact.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={contact.wasFixed ? "text-primary-400 font-medium" : "text-gray-300"}>
                          {contact.phone}
                          {contact.wasFixed &&
                            <span className="ml-2 text-xs bg-primary-900/30 text-primary-300 px-1.5 py-0.5 rounded-full">
                              auto-fixed
                            </span>
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {validContacts.length > 5 && (
              <div className="mt-3 px-4 py-2 bg-dark-800/30 border border-dark-700/50 rounded-md flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  Showing 5 of {validContacts.length} valid contacts
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => alert("This would show all contacts in a full implementation")}
                >
                  View All
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 bg-dark-800/30 rounded-lg border border-dark-600/50">
            <div className="w-12 h-12 rounded-full bg-yellow-900/20 border border-yellow-500/20 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} className="text-yellow-400" />
            </div>
            <p className="text-white font-medium">No valid contacts found</p>
            <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
              Please check that your phone column has numbers with country code format.
              Phone numbers will be auto-corrected when possible.
            </p>
          </div>
        )}
      </div>

      {/* Invalid Contacts Section */}
      {invalidContacts.length > 0 && (
        <div className="bg-dark-700/30 p-5 rounded-lg border border-dark-600 hover:border-yellow-500/20 transition-colors shadow-md">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setShowInvalidContacts(!showInvalidContacts)}
          >
            <h4 className="font-medium text-white flex items-center">
              <div className="w-8 h-8 rounded-full bg-yellow-900/30 border border-yellow-500/20 flex items-center justify-center mr-3">
                <AlertTriangle size={16} className="text-yellow-400" />
              </div>
              Invalid Contacts
            </h4>
            <div className="flex items-center space-x-2">
              <Badge variant="warning" pill>
                {invalidContacts.length} invalid
              </Badge>
              <button className="text-gray-400 hover:text-white p-1 bg-dark-800/50 hover:bg-dark-800 rounded-full transition-colors">
                {showInvalidContacts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {showInvalidContacts && (
            <div className="mt-4 animate-fade-in">
              <div className="bg-dark-800/50 rounded-lg border border-dark-600 overflow-hidden shadow-inner">
                <table className="min-w-full">
                  <thead className="bg-dark-700/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Issue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-600/30">
                    {invalidContacts.slice(0, 5).map((contact) => (
                      <tr key={contact.id} className="hover:bg-dark-700/40 transition-colors">
                        <td className="px-4 py-3 text-sm text-white">
                          {contact.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                          {contact.phone}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-300">
                          {contact.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidContacts.length > 5 && (
                <div className="mt-3 px-4 py-2 bg-dark-800/30 border border-dark-700/50 rounded-md flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    Showing 5 of {invalidContacts.length} invalid contacts
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => alert("This would show all invalid contacts in a full implementation")}
                  >
                    View All
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render Step 3: Schedule Campaign
  const renderStep3 = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 rounded-full bg-primary-900/40 border border-primary-500/30 flex items-center justify-center mr-3">
            <Calendar size={18} className="text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">
            Step 3: Schedule Campaign
          </h3>
        </div>

        {/* Schedule Settings */}
        <div className="bg-dark-800/40 p-5 rounded-lg border border-dark-600 hover:border-primary-500/30 transition-colors shadow-md max-w-3xl mx-auto">
          <h4 className="font-medium text-white mb-5 flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary-900/30 border border-primary-500/20 flex items-center justify-center mr-3">
              <Calendar size={16} className="text-primary-400" />
            </div>
            When should this campaign run?
          </h4>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-dark-700/50 to-dark-700/30 rounded-lg p-4 border border-dark-600/50">
              <div className="flex items-center space-x-3 mb-4">
                <input
                  id="schedule-now"
                  type="radio"
                  checked={scheduleNow}
                  onChange={() => setScheduleNow(true)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-500"
                />
                <label htmlFor="schedule-now" className="text-white font-medium">
                  Start campaign when created
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  id="schedule-later"
                  type="radio"
                  checked={!scheduleNow}
                  onChange={() => setScheduleNow(false)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-500"
                />
                <label htmlFor="schedule-later" className="text-white font-medium">
                  Schedule for later
                </label>
              </div>
            </div>

            {!scheduleNow && (
              <div className="bg-gradient-to-r from-dark-700/50 to-dark-700/30 rounded-lg p-6 border border-dark-600/50 shadow-inner animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <Calendar size={14} className="mr-1.5 text-primary-400" />
                      Date
                    </label>
                    <div className="relative">
                      <input
                        id="schedule-date"
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-dark-800 border border-dark-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 rounded-lg text-white transition-colors shadow-sm"
                        required={!scheduleNow}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Select the date to run this campaign</p>
                  </div>

                  <div>
                    <label htmlFor="schedule-time" className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <Clock size={14} className="mr-1.5 text-primary-400" />
                      Time
                    </label>
                    <div className="relative">
                      <input
                        id="schedule-time"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-800 border border-dark-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 rounded-lg text-white transition-colors shadow-sm"
                        required={!scheduleNow}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Select the time in 24-hour format (HH:MM)</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-primary-900/10 p-5 rounded-lg border border-primary-600/20 mt-6">
              <h5 className="text-sm font-medium text-gray-300 flex items-center mb-3">
                <Clock size={14} className="mr-1.5 text-primary-400" />
                Estimated Campaign Duration
              </h5>
              <div className="font-medium text-white flex items-center">
                <div className="bg-primary-600/20 text-primary-300 rounded-full px-3 py-1 text-sm font-semibold mr-2">
                  ~{Math.ceil(validContacts.filter(c => c.selected).length * 3 / 60)} minutes
                </div>
                <span className="text-xs text-gray-400">
                  (based on avg. call time of 3 minutes)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 bg-dark-900/40 border border-primary-900/20 rounded-lg text-sm text-center max-w-3xl mx-auto mt-8">
          <p className="text-gray-300">
            Click "Continue" to review your campaign details before launching.
          </p>
        </div>
      </div>
    );
  };

  // Render Step 4: Review Campaign
  const renderStep4 = () => {
    const selectedContactsCount = validContacts.filter(c => c.selected).length;
    const selectedAgent = agents.find(a => a.agent_id === selectedAgentId);

    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 rounded-full bg-primary-900/40 border border-primary-500/30 flex items-center justify-center mr-3">
            <FileText size={18} className="text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">
            Step 4: Review Campaign
          </h3>
        </div>

        {/* Review Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campaign Summary */}
          <div className="bg-dark-800/40 p-5 rounded-lg border border-dark-600 hover:border-primary-500/30 transition-colors shadow-md">
            <h4 className="font-medium text-white mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-900/30 border border-blue-500/20 flex items-center justify-center mr-3">
                <Info size={16} className="text-blue-400" />
              </div>
              Campaign Details
            </h4>

            <div className="space-y-4">
              <div className="bg-dark-700/50 rounded-lg p-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Campaign Name</span>
                  <span className="text-white font-medium">{campaignName}</span>
                </div>
              </div>

              <div className="bg-dark-700/50 rounded-lg p-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">From Number</span>
                  <span className="text-white font-medium">{fromNumber}</span>
                </div>
              </div>

              <div className="bg-dark-700/50 rounded-lg p-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">File Name</span>
                  <span className="text-white font-medium">{fileName || 'No file uploaded'}</span>
                </div>
              </div>

              <div className="bg-dark-700/50 rounded-lg p-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Contacts</span>
                  <span className="text-white font-medium">
                    {selectedContactsCount} contacts selected
                  </span>
                </div>
              </div>

              {selectedAgent && (
                <div className="space-y-3 mt-4">
                  <h5 className="text-sm font-medium text-gray-300 flex items-center">
                    <User size={14} className="mr-1.5 text-accent-400" />
                    Agent Information
                  </h5>

                  <div className="bg-dark-700/50 rounded-lg p-3 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Agent</span>
                      <span className="text-white font-medium">{selectedAgent.name}</span>
                    </div>
                  </div>

                  <div className="bg-dark-700/50 rounded-lg p-3 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Language</span>
                      <span className="text-white font-medium">
                        {selectedAgent.settings?.language_hint === 'hi' ? 'Hindi' :
                         selectedAgent.settings?.language_hint === 'en' ? 'English' :
                         selectedAgent.settings?.language_hint === 'mr' ? 'Marathi' : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-dark-700/50 rounded-lg p-3 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Voice</span>
                      <span className="text-white font-medium">{selectedAgent.settings?.voice || 'Default'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Info */}
          <div className="bg-dark-800/40 p-5 rounded-lg border border-dark-600 hover:border-primary-500/30 transition-colors shadow-md">
            <h4 className="font-medium text-white mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary-900/30 border border-primary-500/20 flex items-center justify-center mr-3">
                <Calendar size={16} className="text-primary-400" />
              </div>
              Schedule Information
            </h4>

            <div className="space-y-4">
              <div className="bg-dark-700/50 rounded-lg p-4 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Run Time</span>
                  <span className="text-white font-medium">
                    {scheduleNow ? 'Immediately after creation' : (
                      `${new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}`
                    )}
                  </span>
                </div>

                {!scheduleNow && (
                  <div className="flex items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse mr-2"></div>
                    <span className="text-xs text-green-400">
                      Campaign will start automatically at the scheduled time
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-dark-700/50 rounded-lg p-4 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Duration</span>
                  <span className="text-white font-medium">
                    ~{Math.ceil(selectedContactsCount * 3 / 60)} minutes
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-primary-900/10 border border-primary-500/20 rounded-lg">
                <h5 className="text-sm font-medium text-gray-300 mb-2">Estimated Completion</h5>

                {scheduleNow ? (
                  <div className="text-white">
                    {new Date(new Date().getTime() + (selectedContactsCount * 3 * 60 * 1000)).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </div>
                ) : (
                  <div className="text-white">
                    {new Date(new Date(`${scheduleDate}T${scheduleTime}`).getTime() +
                      (selectedContactsCount * 3 * 60 * 1000)).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Contacts Preview */}
        <div className="bg-dark-800/40 p-5 rounded-lg border border-dark-600 hover:border-primary-500/30 transition-colors shadow-md">
          <h4 className="font-medium text-white mb-4 flex items-center">
            <div className="w-8 h-8 rounded-full bg-accent-900/30 border border-accent-500/20 flex items-center justify-center mr-3">
              <Users size={16} className="text-accent-400" />
            </div>
            Selected Contacts Preview
          </h4>

          <div className="max-h-56 overflow-y-auto border border-dark-600 rounded-lg shadow-inner">
            <table className="min-w-full">
              <thead className="bg-dark-700/80 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Phone Number
                  </th>
                </tr>
              </thead>
              <tbody className="bg-dark-800/50 divide-y divide-dark-600/30">
                {validContacts
                  .filter(contact => contact.selected)
                  .slice(0, 8)
                  .map((contact) => (
                    <tr key={contact.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="px-4 py-2 text-sm text-white">
                        {contact.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-300">
                        {contact.phone}
                      </td>
                    </tr>
                  ))
                }

                {validContacts.filter(c => c.selected).length > 8 && (
                  <tr>
                    <td colSpan="2" className="px-4 py-2 text-sm text-gray-400 text-center">
                      + {validContacts.filter(c => c.selected).length - 8} more contacts
                    </td>
                  </tr>
                )}

                {validContacts.filter(c => c.selected).length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-4 py-4 text-sm text-gray-400 text-center">
                      No contacts selected
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 bg-primary-900/20 border border-primary-600/20 rounded-lg text-center max-w-3xl mx-auto mt-4">
          <p className="text-primary-300">
            Click "Create Campaign" to launch your campaign{scheduleNow ? ' immediately' : ' at the scheduled time'}.
          </p>
        </div>
      </div>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      {renderSteps()}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-900/40 p-4 rounded-lg text-white flex items-start">
          <AlertTriangle size={20} className="text-red-400 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        {currentStep > 1 ? (
          <Button
            onClick={prevStep}
            variant="outline"
            size="md"
            icon={<ArrowLeft size={16} />}
          >
            Back
          </Button>
        ) : (
          <Button
            onClick={onBack}
            variant="outline"
            size="md"
            icon={<ArrowLeft size={16} />}
          >
            Cancel
          </Button>
        )}

        {currentStep < 4 ? (
          <Button
            onClick={nextStep}
            variant="primary"
            size="md"
            icon={<ArrowRight size={16} />}
            disabled={loading || isLoadingContacts}
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleCreateCampaign}
            variant="primary"
            size="md"
            icon={campaign ? <Save size={16} /> : <Play size={16} />}
            disabled={loading || isLoadingContacts}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                {campaign ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {campaign ? 'Update Campaign' : 'Create Campaign'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CampaignCreationWizard;