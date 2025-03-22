import React, { useState, useRef } from 'react';
import {
  PhoneCall, Upload, X, Plus, Users, Check, BarChart, Save,
  Play, Pause, Clock, ListFilter, RefreshCw, ArrowLeft
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Badge from './ui/Badge';
import Papa from 'papaparse';

const CampaignManager = ({
  agents,
  onBack,
  onCreateAgent,
  savedFromNumbers,
  API_BASE_URL
}) => {
  const [currentStep, setCurrentStep] = useState('create'); // 'create', 'review', 'running', 'results'
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [fromNumber, setFromNumber] = useState(savedFromNumbers[0] || '');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [validContacts, setValidContacts] = useState([]);
  const [invalidContacts, setInvalidContacts] = useState([]);
  const [campaignStatus, setCampaignStatus] = useState('idle'); // 'idle', 'running', 'paused', 'completed'
  const [completedCalls, setCompletedCalls] = useState(0);
  const [callResults, setCallResults] = useState([]);
  const fileInputRef = useRef(null);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCsvData(results.data);
        validateContacts(results.data);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
      }
    });
  };

  // Validate phone numbers from CSV
  const validateContacts = (data) => {
    const validList = [];
    const invalidList = [];

    data.forEach((row, index) => {
      // Get phone number from column (could be 'phone', 'phone_number', 'mobile', etc.)
      const phoneNumber = row.phone || row.phone_number || row.mobile || row.contact || row.number || '';

      // Check if it's a valid phone number with country code
      const isValid = phoneNumber && /^\+[1-9]\d{1,14}$/.test(phoneNumber.trim());

      if (isValid) {
        validList.push({
          id: index,
          name: row.name || row.contact_name || row.customer_name || `Contact ${index + 1}`,
          phone: phoneNumber.trim(),
          selected: true,
          data: row // Store all row data for reference
        });
      } else if (phoneNumber) {
        invalidList.push({
          id: index,
          name: row.name || row.contact_name || row.customer_name || `Contact ${index + 1}`,
          phone: phoneNumber,
          reason: 'Invalid phone format, must include country code (e.g., +918879415567)',
          data: row
        });
      }
    });

    setValidContacts(validList);
    setInvalidContacts(invalidList);
    setSelectedContacts(validList);
  };

  // Handle contact selection
  const toggleContactSelection = (id) => {
    setSelectedContacts(prev => {
      const contact = prev.find(c => c.id === id);
      if (contact) {
        // If already in selected contacts, toggle selection
        return prev.map(c => c.id === id ? {...c, selected: !c.selected} : c);
      } else {
        // If not in selected contacts, add it
        const newContact = validContacts.find(c => c.id === id);
        if (newContact) {
          return [...prev, {...newContact, selected: true}];
        }
      }
      return prev;
    });
  };

  // Handle campaign start
  const startCampaign = async () => {
    // Validate campaign data
    if (!campaignName) {
      alert('Please enter a campaign name');
      return;
    }

    if (!selectedAgent) {
      alert('Please select an agent');
      return;
    }

    if (!fromNumber) {
      alert('Please enter a from number');
      return;
    }

    if (!selectedContacts.some(c => c.selected)) {
      alert('Please select at least one contact');
      return;
    }

    // Prepare campaign data
    const campaignData = {
      name: campaignName,
      agent_id: selectedAgent,
      from_number: fromNumber,
      contacts: selectedContacts.filter(c => c.selected).map(c => ({
        name: c.name,
        phone: c.phone,
        data: c.data
      }))
    };

    // For demo purposes, we'll simulate the API call
    setLoading(true);
    setCampaignStatus('running');
    setCurrentStep('running');

    // Simulate API call delay
    setTimeout(() => {
      console.log('Starting campaign:', campaignData);
      setLoading(false);

      // Simulate call processing
      simulateCallProcessing(campaignData);
    }, 1500);
  };

  // Simulate call processing
  const simulateCallProcessing = (campaignData) => {
    const totalContacts = campaignData.contacts.length;
    let processed = 0;

    // Create empty call results array
    const results = campaignData.contacts.map(contact => ({
      id: Math.random().toString(36).substr(2, 9),
      name: contact.name,
      phone: contact.phone,
      status: 'pending',
      call_uuid: null,
      vtCallId: null,
      duration: null,
      timestamp: null,
      summary: null
    }));

    setCallResults(results);

    // Process calls one by one with some delay between them
    const processNextCall = () => {
      if (processed >= totalContacts || campaignStatus !== 'running') {
        // All calls processed or campaign paused/stopped
        if (processed >= totalContacts) {
          setCampaignStatus('completed');
          setCurrentStep('results');
        }
        return;
      }

      // Update current call status to 'calling'
      setCallResults(prev => {
        const updated = [...prev];
        updated[processed] = {
          ...updated[processed],
          status: 'calling',
          timestamp: new Date().toISOString()
        };
        return updated;
      });

      // Simulate API call
      setTimeout(() => {
        // Generate random call result
        const callStatus = Math.random() > 0.3 ? 'completed' : (Math.random() > 0.5 ? 'no-answer' : 'failed');
        const duration = callStatus === 'completed' ? Math.floor(Math.random() * 120) + 30 : 0;

        // Update call result
        setCallResults(prev => {
          const updated = [...prev];
          updated[processed] = {
            ...updated[processed],
            status: callStatus,
            call_uuid: `sim-${Math.random().toString(36).substr(2, 9)}`,
            vtCallId: callStatus === 'completed' ? `vt-${Math.random().toString(36).substr(2, 9)}` : null,
            duration: duration,
            timestamp: new Date().toISOString(),
            summary: callStatus === 'completed' ? 'The call was connected and the recipient expressed interest in the product.' : null
          };
          return updated;
        });

        // Increment completed calls counter
        setCompletedCalls(prev => prev + 1);

        // Move to next call
        processed++;
        processNextCall();
      }, Math.random() * 2000 + 1000); // Random delay between 1-3 seconds
    };

    // Start processing calls
    processNextCall();
  };

  // Handle pause/resume campaign
  const toggleCampaignStatus = () => {
    setCampaignStatus(prev => prev === 'running' ? 'paused' : 'running');
  };

  // Handle create new campaign button
  const handleCreateNew = () => {
    setCurrentStep('create');
    setCampaignName('');
    setSelectedAgent('');
    setFileName('');
    setCsvData([]);
    setValidContacts([]);
    setInvalidContacts([]);
    setSelectedContacts([]);
    setCampaignStatus('idle');
    setCompletedCalls(0);
    setCallResults([]);
  };

  // Get selected agent data
  const getSelectedAgentData = () => {
    return agents.find(agent => agent.id === selectedAgent) || null;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'create':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Campaign Name"
                id="campaign_name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Enter campaign name"
                required
              />

              <Select
                label="Agent"
                id="agent"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                options={agents.map(agent => ({ value: agent.id, label: agent.name }))}
                placeholder="Select an agent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="From Number"
                id="from_number"
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
                placeholder="+912231043958"
                required
                helperText="Enter your Plivo phone number with country code"
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Contact List (CSV File)<span className="text-red-400 ml-1">*</span>
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dark-600 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-400">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary-400 hover:text-primary-300"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          ref={fileInputRef}
                          accept=".csv"
                          onChange={handleFileUpload}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      CSV with phone numbers columns
                    </p>
                    {fileName && (
                      <p className="text-sm text-primary-400 mt-2">
                        {fileName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {validContacts.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-white flex items-center">
                    <Users size={18} className="mr-2 text-primary-400" />
                    Valid Contacts ({validContacts.length})
                  </h3>
                  <div className="text-sm text-gray-400">
                    {selectedContacts.filter(c => c.selected).length} selected
                  </div>
                </div>

                <div className="bg-dark-700/30 rounded-lg border border-dark-600 max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-dark-600">
                    <thead className="bg-dark-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={validContacts.length > 0 && validContacts.every(c => selectedContacts.some(sc => sc.id === c.id && sc.selected))}
                            onChange={() => {
                              const allSelected = validContacts.every(c => selectedContacts.some(sc => sc.id === c.id && sc.selected));
                              setSelectedContacts(validContacts.map(c => ({...c, selected: !allSelected})));
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-400 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Phone
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-dark-700/10 divide-y divide-dark-600">
                      {validContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-dark-600/30 transition-colors">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedContacts.some(c => c.id === contact.id && c.selected)}
                              onChange={() => toggleContactSelection(contact.id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-400 rounded"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-white">
                            {contact.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            {contact.phone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {invalidContacts.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-white flex items-center">
                    <X size={18} className="mr-2 text-red-400" />
                    Invalid Contacts ({invalidContacts.length})
                  </h3>
                </div>

                <div className="bg-dark-700/30 rounded-lg border border-dark-600 max-h-48 overflow-y-auto">
                  <table className="min-w-full divide-y divide-dark-600">
                    <thead className="bg-dark-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Issue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-dark-700/10 divide-y divide-dark-600">
                      {invalidContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-dark-600/30 transition-colors">
                          <td className="px-4 py-2 text-sm text-white">
                            {contact.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            {contact.phone}
                          </td>
                          <td className="px-4 py-2 text-sm text-red-300">
                            {contact.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end space-x-3">
              <Button
                onClick={onBack}
                variant="outline"
                size="md"
                icon={<ArrowLeft size={16} />}
              >
                Cancel
              </Button>

              <Button
                onClick={() => setCurrentStep('review')}
                variant="primary"
                size="md"
                disabled={!campaignName || !selectedAgent || !fromNumber || !selectedContacts.some(c => c.selected)}
                icon={<Check size={16} />}
              >
                Review Campaign
              </Button>
            </div>
          </div>
        );

      case 'review':
        const agent = getSelectedAgentData();
        const selectedContactsCount = selectedContacts.filter(c => c.selected).length;

        return (
          <div className="space-y-6">
            <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
              <h3 className="text-lg font-medium text-white mb-4">Campaign Summary</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Campaign Name:</span>
                    <div className="text-white font-medium">{campaignName}</div>
                  </div>

                  <div>
                    <span className="text-gray-400 text-sm">From Number:</span>
                    <div className="text-white font-medium">{fromNumber}</div>
                  </div>

                  <div>
                    <span className="text-gray-400 text-sm">Total Contacts:</span>
                    <div className="text-white font-medium">{selectedContactsCount}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Agent:</span>
                    <div className="text-white font-medium">{agent?.name || 'Unknown Agent'}</div>
                  </div>

                  <div>
                    <span className="text-gray-400 text-sm">Voice:</span>
                    <div className="text-white font-medium">{agent?.settings?.voice || 'Default'}</div>
                  </div>

                  <div>
                    <span className="text-gray-400 text-sm">Language:</span>
                    <div className="text-white font-medium">
                      {agent?.settings?.language_hint === 'hi' ? 'Hindi' :
                        agent?.settings?.language_hint === 'en' ? 'English' :
                          agent?.settings?.language_hint === 'mr' ? 'Marathi' : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-dark-600">
                <div className="text-gray-400 text-sm mb-2">Estimated Time:</div>
                <div className="text-white font-medium flex items-center">
                  <Clock size={16} className="mr-2 text-primary-400" />
                  Approximately {Math.ceil(selectedContactsCount * 3 / 60)} minutes
                  <span className="text-gray-400 text-sm ml-2">
                    (based on average call time of 3 minutes)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <ListFilter size={18} className="mr-2 text-primary-400" />
                Selected Contacts Preview
              </h3>

              <div className="max-h-48 overflow-y-auto border border-dark-600 rounded-lg">
                <table className="min-w-full divide-y divide-dark-600">
                  <thead className="bg-dark-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-700/10 divide-y divide-dark-600">
                    {selectedContacts.filter(c => c.selected).slice(0, 5).map((contact) => (
                      <tr key={contact.id} className="hover:bg-dark-600/30 transition-colors">
                        <td className="px-4 py-2 text-sm text-white">
                          {contact.name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-300">
                          {contact.phone}
                        </td>
                      </tr>
                    ))}
                    {selectedContacts.filter(c => c.selected).length > 5 && (
                      <tr>
                        <td colSpan="2" className="px-4 py-2 text-sm text-gray-400 text-center">
                          + {selectedContacts.filter(c => c.selected).length - 5} more contacts
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <Button
                onClick={() => setCurrentStep('create')}
                variant="outline"
                size="md"
                icon={<ArrowLeft size={16} />}
              >
                Back
              </Button>

              <Button
                onClick={startCampaign}
                variant="primary"
                size="md"
                loading={loading}
                icon={<Play size={16} />}
              >
                Start Campaign
              </Button>
            </div>
          </div>
        );

      case 'running':
        const completedCount = callResults.filter(r => r.status !== 'pending' && r.status !== 'calling').length;
        const totalCount = callResults.length;
        const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        return (
          <div className="space-y-6">
            <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-white flex items-center">
                  <PhoneCall size={18} className="mr-2 text-primary-400" />
                  {campaignName}
                </h3>

                <Badge
                  variant={campaignStatus === 'running' ? 'success' : campaignStatus === 'paused' ? 'warning' : 'info'}
                  glow={campaignStatus === 'running'}
                >
                  {campaignStatus === 'running' ? 'Running' :
                   campaignStatus === 'paused' ? 'Paused' :
                   campaignStatus === 'completed' ? 'Completed' : 'Idle'}
                </Badge>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{completedCount} of {totalCount} calls completed ({Math.round(progress)}%)</span>
                </div>
                <div className="w-full bg-dark-600 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary-600 to-primary-400 h-4"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-dark-800/50 p-3 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1">Completed</div>
                  <div className="text-lg font-medium text-white">{callResults.filter(r => r.status === 'completed').length}</div>
                </div>

                <div className="bg-dark-800/50 p-3 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1">Failed/No Answer</div>
                  <div className="text-lg font-medium text-white">{callResults.filter(r => r.status === 'failed' || r.status === 'no-answer').length}</div>
                </div>

                <div className="bg-dark-800/50 p-3 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1">Pending</div>
                  <div className="text-lg font-medium text-white">{callResults.filter(r => r.status === 'pending' || r.status === 'calling').length}</div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                {campaignStatus !== 'completed' && (
                  <Button
                    onClick={toggleCampaignStatus}
                    variant={campaignStatus === 'running' ? 'warning' : 'primary'}
                    size="md"
                    icon={campaignStatus === 'running' ? <Pause size={16} /> : <Play size={16} />}
                  >
                    {campaignStatus === 'running' ? 'Pause Campaign' : 'Resume Campaign'}
                  </Button>
                )}

                <Button
                  onClick={() => setCurrentStep('results')}
                  variant="primary"
                  size="md"
                  icon={<BarChart size={16} />}
                  disabled={completedCount === 0}
                >
                  View Results
                </Button>
              </div>
            </div>

            <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <RefreshCw size={18} className="mr-2 text-primary-400" />
                Real-time Progress
              </h3>

              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-dark-600">
                  <thead className="bg-dark-800/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-700/10 divide-y divide-dark-600">
                    {callResults.map((result) => (
                      <tr key={result.id} className="hover:bg-dark-600/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">{result.name}</span>
                            <span className="text-xs text-gray-400">{result.phone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {result.status === 'pending' && (
                            <Badge variant="default">Pending</Badge>
                          )}
                          {result.status === 'calling' && (
                            <Badge variant="info" glow>
                              <div className="flex items-center">
                                <PhoneCall size={12} className="mr-1 animate-pulse" />
                                Calling
                              </div>
                            </Badge>
                          )}
                          {result.status === 'completed' && (
                            <Badge variant="success">
                              <div className="flex items-center">
                                <Check size={12} className="mr-1" />
                                Completed
                              </div>
                            </Badge>
                          )}
                          {result.status === 'failed' && (
                            <Badge variant="error">Failed</Badge>
                          )}
                          {result.status === 'no-answer' && (
                            <Badge variant="warning">No Answer</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {result.timestamp ? formatTimestamp(result.timestamp) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {result.duration ? `${result.duration}s` : '-'}
                        </td>
                      </tr>
                    ))}
                    {callResults.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                          No calls processed yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'results':
        // Calculate statistics
        const totalCalls = callResults.length;
        const completedCalls = callResults.filter(r => r.status === 'completed').length;
        const failedCalls = callResults.filter(r => r.status === 'failed').length;
        const noAnswerCalls = callResults.filter(r => r.status === 'no-answer').length;
        const completionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
        const avgDuration = completedCalls > 0
          ? Math.round(callResults.filter(r => r.status === 'completed').reduce((acc, curr) => acc + (curr.duration || 0), 0) / completedCalls)
          : 0;

        return (
          <div className="space-y-6">
            <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-white flex items-center">
                  <BarChart size={18} className="mr-2 text-primary-400" />
                  Campaign Results: {campaignName}
                </h3>

                <Badge variant="info">Completed</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-800/50 p-4 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1">Total Calls</div>
                  <div className="text-xl font-bold text-white">{totalCalls}</div>
                </div>

                <div className="bg-dark-800/50 p-4 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1">Completion Rate</div>
                  <div className="text-xl font-bold text-white">{completionRate}%</div>
                </div>

                <div className="bg-dark-800/50 p-4 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1">Avg. Duration</div>
                  <div className="text-xl font-bold text-white">{avgDuration}s</div>
                </div>

                <div className="bg-dark-800/50 p-4 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1">Total Talk Time</div>
                  <div className="text-xl font-bold text-white">
                    {Math.floor(callResults.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 60)}m {callResults.reduce((acc, curr) => acc + (curr.duration || 0), 0) % 60}s
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-900/20 border border-green-900/30 p-4 rounded-lg">
                  <div className="text-green-400 text-sm font-medium mb-1">Completed</div>
                  <div className="text-2xl font-bold text-white">{completedCalls}</div>
                  <div className="text-green-300/70 text-xs mt-1">{Math.round((completedCalls / totalCalls) * 100)}% of total</div>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-900/30 p-4 rounded-lg">
                  <div className="text-yellow-400 text-sm font-medium mb-1">No Answer</div>
                  <div className="text-2xl font-bold text-white">{noAnswerCalls}</div>
                  <div className="text-yellow-300/70 text-xs mt-1">{Math.round((noAnswerCalls / totalCalls) * 100)}% of total</div>
                </div>

                <div className="bg-red-900/20 border border-red-900/30 p-4 rounded-lg">
                  <div className="text-red-400 text-sm font-medium mb-1">Failed</div>
                  <div className="text-2xl font-bold text-white">{failedCalls}</div>
                  <div className="text-red-300/70 text-xs mt-1">{Math.round((failedCalls / totalCalls) * 100)}% of total</div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  onClick={handleCreateNew}
                  variant="primary"
                  size="md"
                  icon={<Plus size={16} />}
                >
                  Create New Campaign
                </Button>

                <Button
                  onClick={() => {/* Would download CSV in real implementation */}}
                  variant="secondary"
                  size="md"
                  icon={<Save size={16} />}
                >
                  Export Results
                </Button>
              </div>
            </div>

            <div className="bg-dark-700/30 p-6 rounded-lg border border-dark-600">
              <h3 className="text-lg font-medium text-white mb-4">Call Details</h3>

              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-dark-600">
                  <thead className="bg-dark-800/50 sticky top-0">
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
                        Summary
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-700/10 divide-y divide-dark-600">
                    {callResults.map((result) => (
                      <tr key={result.id} className="hover:bg-dark-600/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">{result.name}</span>
                            <span className="text-xs text-gray-400">{result.phone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {result.status === 'completed' && (
                            <Badge variant="success">
                              <div className="flex items-center">
                                <Check size={12} className="mr-1" />
                                Completed
                              </div>
                            </Badge>
                          )}
                          {result.status === 'failed' && (
                            <Badge variant="error">Failed</Badge>
                          )}
                          {result.status === 'no-answer' && (
                            <Badge variant="warning">No Answer</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {result.duration ? `${result.duration}s` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">
                          {result.summary || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!result.vtCallId}
                            icon={<BarChart size={14} />}
                          >
                            Analysis
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return null;
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

        {currentStep === 'create' && (
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
        {renderStepContent()}
      </div>
    </Card>
  );
};

export default CampaignManager;