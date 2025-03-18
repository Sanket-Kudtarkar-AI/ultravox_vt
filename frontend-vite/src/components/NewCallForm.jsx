import React, {useState, useEffect, useRef} from 'react';
import {Loader2, Phone, User, ChevronDown, X, Check} from 'lucide-react';

const NewCallForm = ({
                         onSubmit,
                         loading,
                         agents,
                         selectedAgentId,
                         onSelectAgent,
                         savedRecipients = []
                     }) => {
    const [formData, setFormData] = useState({
        recipient_phone_number: '',
        plivo_phone_number: '+912231043958'
    });

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [recipientInput, setRecipientInput] = useState('');
    const [filteredRecipients, setFilteredRecipients] = useState([]);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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

    const handleSubmit = (e) => {
        e.preventDefault();

        // Get selected agent data
        const selectedAgent = agents.find(agent => agent.id === selectedAgentId);
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
    const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

    return (
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700">
            <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">Make a New Call</h2>

                {/* Agent Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Selected Agent
                    </label>

                    {selectedAgent ? (
                        <div
                            className="flex items-center justify-between bg-gray-700 p-3 rounded-lg border border-gray-600">
                            <div className="flex items-center">
                                <Phone className="text-blue-400 mr-3" size={20}/>
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
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => onSelectAgent(null)}
                                    className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                                >
                                    Change Agent
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-700 rounded-lg border border-dashed border-gray-600">
                            <Phone className="mx-auto text-gray-500 mb-2" size={24}/>
                            <p className="text-gray-400">No agent selected</p>
                            <button
                                type="button"
                                onClick={() => onSelectAgent(null)}
                                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                            >
                                Select an Agent
                            </button>
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
                                            className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white pr-10"
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
                                            className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                            <ul className="py-1">
                                                {filteredRecipients.map((recipient, idx) => (
                                                    <li key={idx}>
                                                        <button
                                                            type="button"
                                                            className="w-full text-left px-4 py-2 hover:bg-gray-600 text-white flex items-center justify-between transition-colors"
                                                            onClick={() => selectRecipient(recipient)}
                                                        >
                                                            <div className="flex items-center">
                                                                <User size={14} className="mr-2 text-gray-400"/>
                                                                {recipient}
                                                            </div>
                                                            {recipient === recipientInput && (
                                                                <Check size={14} className="text-green-500"/>
                                                            )}
                                                        </button>
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

                            {/* From Phone Number */}
                            <div>
                                <label htmlFor="plivo_phone_number"
                                       className="block text-sm font-medium text-gray-300 mb-1">
                                    From Phone Number*
                                </label>
                                <input
                                    id="plivo_phone_number"
                                    name="plivo_phone_number"
                                    type="text"
                                    required
                                    placeholder="+912231043958"
                                    value={formData.plivo_phone_number}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Enter your Plivo phone number with country code
                                </p>
                            </div>
                        </div>

                        {/* Agent Summary */}
                        <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
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
                                selectedAgent.settings.max_duration === '240s' ? '4 minutes' : '5 minutes'}
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
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors hover:animate-bounce-gentle"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin mr-2"/>
                                        Initiating Call...
                                    </>
                                ) : (
                                    <>
                                        <Phone size={18} className="mr-2"/>
                                        Make Call
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default NewCallForm;