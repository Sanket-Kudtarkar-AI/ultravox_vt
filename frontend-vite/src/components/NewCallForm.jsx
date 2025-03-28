import React, {useState, useEffect, useRef} from 'react';
import {Loader2, Phone, User, ChevronDown, X, Check} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

const NewCallForm = ({
                         onSubmit,
                         loading,
                         agents,
                         selectedAgentId,
                         onSelectAgent,
                         savedRecipients = [],
                         savedFromNumbers = [],
                         onRemoveRecipient,
                         onRemoveFromNumber
                     }) => {
    const [formData, setFormData] = useState({
        recipient_phone_number: '',
        plivo_phone_number: '+912231043958'
    });

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [recipientInput, setRecipientInput] = useState('');
    const [filteredRecipients, setFilteredRecipients] = useState([]);

    // From number state
    const [fromNumberInput, setFromNumberInput] = useState(formData.plivo_phone_number || '');
    const [dropdownFromOpen, setDropdownFromOpen] = useState(false);
    const [filteredFromNumbers, setFilteredFromNumbers] = useState([]);

    const dropdownRef = useRef(null);
    const fromDropdownRef = useRef(null);

    useEffect(() => {
        // If agents are available and none is selected, select the first (oldest) one
        if (agents.length > 0 && !selectedAgentId) {
            onSelectAgent(agents[0].agent_id);
        }
    }, [agents, selectedAgentId, onSelectAgent]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (fromDropdownRef.current && !fromDropdownRef.current.contains(event.target)) {
                setDropdownFromOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Initialize with default values from saved lists
    useEffect(() => {
        // Set default recipient to the most recently used one
        if (savedRecipients.length > 0) {
            setRecipientInput(savedRecipients[0]);
            setFormData(prev => ({...prev, recipient_phone_number: savedRecipients[0]}));
        }

        // Set default from number to the most recently used one
        if (savedFromNumbers.length > 0) {
            setFromNumberInput(savedFromNumbers[0]);
            setFormData(prev => ({...prev, plivo_phone_number: savedFromNumbers[0]}));
        }
    }, [savedRecipients, savedFromNumbers]);

    // Filter recipients based on input
    useEffect(() => {
        if (recipientInput) {
            const filtered = savedRecipients.filter(number =>
                number.includes(recipientInput)
            );
            setFilteredRecipients(filtered);
        } else {
            setFilteredRecipients(savedRecipients);
        }
    }, [recipientInput, savedRecipients]);

    // Filter from numbers based on input
    useEffect(() => {
        if (fromNumberInput) {
            const filtered = savedFromNumbers.filter(number =>
                number.includes(fromNumberInput)
            );
            setFilteredFromNumbers(filtered);
        } else {
            setFilteredFromNumbers(savedFromNumbers);
        }
    }, [fromNumberInput, savedFromNumbers]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleRecipientInputChange = (e) => {
        const value = e.target.value;
        setRecipientInput(value);
        setFormData(prev => ({...prev, recipient_phone_number: value}));
        if (value && !dropdownOpen) {
            setDropdownOpen(true);
        } else if (!value) {
            setDropdownOpen(false);
        }
    };

    const selectRecipient = (recipient) => {
        setFormData(prev => ({...prev, recipient_phone_number: recipient}));
        setRecipientInput(recipient);
        setDropdownOpen(false);
    };

    const handleFromNumberInputChange = (e) => {
        const value = e.target.value;
        setFromNumberInput(value);
        setFormData(prev => ({...prev, plivo_phone_number: value}));
        if (value && !dropdownFromOpen) {
            setDropdownFromOpen(true);
        } else if (!value) {
            setDropdownFromOpen(false);
        }
    };

    const selectFromNumber = (number) => {
        setFormData(prev => ({...prev, plivo_phone_number: number}));
        setFromNumberInput(number);
        setDropdownFromOpen(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Get selected agent data
        const selectedAgent = agents.find(agent => agent.agent_id === selectedAgentId);
        if (!selectedAgent) {
            alert('Please select an agent first');
            return;
        }

        // Construct call data from agent configuration
        const callData = {
            ...formData,
            system_prompt: selectedAgent.system_prompt,
            initial_messages: selectedAgent.initial_messages,
            language_hint: selectedAgent.settings.language_hint,
            voice: selectedAgent.settings.voice,
            max_duration: selectedAgent.settings.max_duration,
            recording_enabled: selectedAgent.settings.recording_enabled,
            vad_settings: selectedAgent.settings.vad_settings,
            inactivity_messages: selectedAgent.settings.inactivity_messages
        };

        onSubmit(callData);
    };

    // Find selected agent
    const selectedAgent = agents.find(agent => agent.agent_id === selectedAgentId);

    return (
        <Card className="animate-fade-in">
            <div className="p-6 border-b border-dark-700">
                <h2 className="text-xl font-semibold text-white mb-4">Make a New Call</h2>

                {/* Agent Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Selected Agent
                    </label>

                    {selectedAgent ? (
                        <div
                            className="flex items-center justify-between bg-dark-700/50 p-4 rounded-lg border border-dark-600">
                            <div className="flex items-center">
                                <div className="p-2 rounded-lg bg-primary-900/50 text-primary-400 mr-3">
                                    <Phone size={20}/>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">{selectedAgent.name}</h3>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                        {selectedAgent.settings.voice} • {
                                        selectedAgent.settings.language_hint === 'hi' ? 'Hindi' :
                                            selectedAgent.settings.language_hint === 'en' ? 'English' : 'Marathi'
                                    }
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onSelectAgent(null)}
                            >
                                Change Agent
                            </Button>
                        </div>
                    ) : (
                        <div
                            className="text-center py-8 bg-dark-700/40 rounded-lg border border-dashed border-dark-600 backdrop-blur-sm">
                            <div
                                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-600/50 text-gray-400 mb-3">
                                <Phone size={24}/>
                            </div>
                            <p className="text-gray-400 mb-4">No agent selected</p>
                            <Button
                                variant="primary"
                                onClick={() => onSelectAgent(null)}
                            >
                                Select an Agent
                            </Button>
                        </div>
                    )}
                </div>

                {selectedAgent && (
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Recipient Phone Number with Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <label htmlFor="recipient_phone_number"
                                       className="block text-sm font-medium text-gray-300 mb-1">
                                    Recipient Phone Number*
                                </label>
                                <div className="relative">
                                    <div className="flex">
                                        <input
                                            id="recipient_phone_number"
                                            type="text"
                                            required
                                            value={recipientInput}
                                            onChange={handleRecipientInputChange}
                                            onClick={() => {
                                                if (savedRecipients.length > 0) {
                                                    setDropdownOpen(true);
                                                }
                                            }}
                                            placeholder="+918879415567"
                                            className="w-full px-4 py-2 border border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-dark-700/70 text-white pr-10"
                                        />
                                        {savedRecipients.length > 0 && (
                                            <button
                                                type="button"
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                            >
                                                <ChevronDown size={18}/>
                                            </button>
                                        )}
                                    </div>

                                    {/* Recipients Dropdown */}
                                    {dropdownOpen && filteredRecipients.length > 0 && (
                                        <div
                                            className="absolute z-10 mt-1 w-full bg-dark-700 border border-dark-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                            <ul className="py-1">
                                                {filteredRecipients.map((recipient, idx) => (
                                                    <li key={idx}>
                                                        <div
                                                            className="flex items-center justify-between px-4 py-2 hover:bg-dark-600 text-white">
                                                            <button
                                                                type="button"
                                                                className="flex-grow text-left flex items-center transition-colors"
                                                                onClick={() => selectRecipient(recipient)}
                                                            >
                                                                <User size={14} className="mr-2 text-gray-400"/>
                                                                {recipient}
                                                                {recipient === recipientInput && (
                                                                    <Check size={14} className="ml-2 text-green-500"/>
                                                                )}
                                                            </button>
                                                            {onRemoveRecipient && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onRemoveRecipient(idx)}
                                                                    className="text-gray-400 hover:text-red-400 p-1"
                                                                >
                                                                    <X size={14}/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-gray-400">
                                    Enter the phone number with country code (e.g., +918879415567)
                                </p>
                            </div>

                            {/* From Phone Number with Dropdown */}
                            <div className="relative" ref={fromDropdownRef}>
                                <label htmlFor="plivo_phone_number"
                                       className="block text-sm font-medium text-gray-300 mb-1">
                                    From Phone Number*
                                </label>
                                <div className="relative">
                                    <div className="flex">
                                        <input
                                            id="plivo_phone_number"
                                            type="text"
                                            required
                                            value={fromNumberInput}
                                            onChange={handleFromNumberInputChange}
                                            onClick={() => {
                                                if (savedFromNumbers.length > 0) {
                                                    setDropdownFromOpen(true);
                                                }
                                            }}
                                            placeholder="+912231043958"
                                            className="w-full px-4 py-2 border border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-dark-700/70 text-white pr-10"
                                        />
                                        {savedFromNumbers.length > 0 && (
                                            <button
                                                type="button"
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                onClick={() => setDropdownFromOpen(!dropdownFromOpen)}
                                            >
                                                <ChevronDown size={18}/>
                                            </button>
                                        )}
                                    </div>

                                    {/* From Numbers Dropdown */}
                                    {dropdownFromOpen && filteredFromNumbers.length > 0 && (
                                        <div
                                            className="absolute z-10 mt-1 w-full bg-dark-700 border border-dark-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                            <ul className="py-1">
                                                {filteredFromNumbers.map((number, idx) => (
                                                    <li key={idx}>
                                                        <div
                                                            className="flex items-center justify-between px-4 py-2 hover:bg-dark-600 text-white">
                                                            <button
                                                                type="button"
                                                                className="flex-grow text-left flex items-center transition-colors"
                                                                onClick={() => selectFromNumber(number)}
                                                            >
                                                                <Phone size={14} className="mr-2 text-gray-400"/>
                                                                {number}
                                                                {number === fromNumberInput && (
                                                                    <Check size={14} className="ml-2 text-green-500"/>
                                                                )}
                                                            </button>
                                                            {onRemoveFromNumber && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onRemoveFromNumber(idx)}
                                                                    className="text-gray-400 hover:text-red-400 p-1"
                                                                >
                                                                    <X size={14}/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-gray-400">
                                    Enter your Plivo phone number with country code
                                </p>
                            </div>
                        </div>

                        {/* Agent Summary */}
                        <div className="mt-6 p-4 bg-dark-700/50 rounded-lg border border-dark-600 backdrop-blur-sm">
                            <h3 className="text-white font-medium mb-2">Agent Configuration Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-400">Voice: <span
                                        className="text-white">{selectedAgent.settings.voice}</span></p>
                                    <p className="text-gray-400">Language: <span className="text-white">
                    {selectedAgent.settings.language_hint === 'hi' ? 'Hindi' :
                        selectedAgent.settings.language_hint === 'en' ? 'English' : 'Marathi'}
                  </span></p>
                                    <p className="text-gray-400">Max Duration: <span className="text-white">
                    {selectedAgent.settings.max_duration === '60s' ? '1 minute' :
                        selectedAgent.settings.max_duration === '120s' ? '2 minutes' :
                            selectedAgent.settings.max_duration === '180s' ? '3 minutes' :
                                selectedAgent.settings.max_duration === '300s' ? '5 minutes' :
                                    selectedAgent.settings.max_duration === '480s' ? '8 minutes' :
                                        selectedAgent.settings.max_duration === '600s' ? '10 minutes' : '15 minutes'}
                  </span></p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Recording: <span className="text-white">
                    {selectedAgent.settings.recording_enabled ? 'Enabled' : 'Disabled'}
                  </span></p>
                                    <p className="text-gray-400">Initial Messages: <span className="text-white">
                    {selectedAgent.initial_messages.length}
                  </span></p>
                                    <p className="text-gray-400">Inactivity Messages: <span className="text-white">
                    {selectedAgent.settings.inactivity_messages.length}
                  </span></p>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="mt-6">
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                disabled={loading}
                                className="group"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin mr-2"/>
                                        Initiating Call...
                                    </>
                                ) : (
                                    <>
                                        <Phone size={18} className="mr-2 group-hover:animate-pulse"/>
                                        Make Call
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Card>
    );
};

export default NewCallForm;