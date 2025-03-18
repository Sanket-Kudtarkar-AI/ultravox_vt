import React, {useState, useEffect} from 'react';
import {Save, X, Loader2, Mic, Settings, ArrowLeft} from 'lucide-react';

const AgentForm = ({
                       agent,
                       isEditing,
                       onSave,
                       onCancel,
                       loading
                   }) => {
    const [activeTab, setActiveTab] = useState('agent');
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        system_prompt: '',
        initial_messages: [''],
        settings: {
            language_hint: 'hi',
            voice: 'Maushmi',
            max_duration: '180s',
            recording_enabled: true,
            vad_settings: {
                turnEndpointDelay: '0.384s',
                minimumTurnDuration: '0s',
                minimumInterruptionDuration: '0.05s',
                frameActivationThreshold: 0.1
            },
            inactivity_messages: [
                {
                    duration: '8s',
                    message: 'are you there?',
                    endBehavior: 'END_BEHAVIOR_UNSPECIFIED'
                }
            ]
        }
    });

    const [newInactivityMessage, setNewInactivityMessage] = useState({
        duration: '8s',
        message: '',
        endBehavior: 'END_BEHAVIOR_UNSPECIFIED'
    });

    // Initialize form with agent data if provided
    useEffect(() => {
        if (agent) {
            setFormData({
                id: agent.id || '',
                name: agent.name || '',
                system_prompt: agent.system_prompt || '',
                initial_messages: agent.initial_messages || [''],
                settings: {
                    language_hint: agent.settings?.language_hint || 'hi',
                    voice: agent.settings?.voice || 'Maushmi',
                    max_duration: agent.settings?.max_duration || '180s',
                    recording_enabled: agent.settings?.recording_enabled !== false,
                    vad_settings: {
                        turnEndpointDelay: agent.settings?.vad_settings?.turnEndpointDelay || '0.384s',
                        minimumTurnDuration: agent.settings?.vad_settings?.minimumTurnDuration || '0s',
                        minimumInterruptionDuration: agent.settings?.vad_settings?.minimumInterruptionDuration || '0.05s',
                        frameActivationThreshold: agent.settings?.vad_settings?.frameActivationThreshold || 0.1
                    },
                    inactivity_messages: agent.settings?.inactivity_messages || [
                        {
                            duration: '8s',
                            message: 'are you there?',
                            endBehavior: 'END_BEHAVIOR_UNSPECIFIED'
                        }
                    ]
                }
            });
        }
    }, [agent]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSettingsChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [name]: value
            }
        }));
    };

    const handleToggleChange = (name) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [name]: !prev.settings[name]
            }
        }));
    };

    const handleVadSettingChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                vad_settings: {
                    ...prev.settings.vad_settings,
                    [name]: value
                }
            }
        }));
    };

    const handleInitialMessageChange = (index, value) => {
        const updatedMessages = [...formData.initial_messages];
        updatedMessages[index] = value;
        setFormData(prev => ({
            ...prev,
            initial_messages: updatedMessages
        }));
    };

    const addInitialMessage = () => {
        setFormData(prev => ({
            ...prev,
            initial_messages: [...prev.initial_messages, '']
        }));
    };

    const removeInitialMessage = (index) => {
        setFormData(prev => ({
            ...prev,
            initial_messages: prev.initial_messages.filter((_, i) => i !== index)
        }));
    };

    const handleInactivityMessageChange = (index, field, value) => {
        const updatedMessages = [...formData.settings.inactivity_messages];
        updatedMessages[index] = {
            ...updatedMessages[index],
            [field]: value
        };
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                inactivity_messages: updatedMessages
            }
        }));
    };

    const addInactivityMessage = () => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                inactivity_messages: [...prev.settings.inactivity_messages, newInactivityMessage]
            }
        }));
        setNewInactivityMessage({
            duration: '8s',
            message: '',
            endBehavior: 'END_BEHAVIOR_UNSPECIFIED'
        });
    };

    const removeInactivityMessage = (index) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                inactivity_messages: prev.settings.inactivity_messages.filter((_, i) => i !== index)
            }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Filter out any empty initial messages
        const filteredInitialMessages = formData.initial_messages.filter(
            message => message && message.trim() !== ''
        );

        onSave({
            ...formData,
            initial_messages: filteredInitialMessages.length > 0 ? filteredInitialMessages : ['']
        });
    };

    const languageOptions = [
        {value: 'hi', label: 'Hindi (Hinglish)'},
        {value: 'en', label: 'English'},
        {value: 'mr', label: 'Marathi'}
    ];

    const voiceOptions = [
        {value: 'Maushmi', label: 'Maushmi (Female)'},
        {value: 'Ravi', label: 'Ravi (Male)'}
    ];

    const durationOptions = [
        {value: '60s', label: '1 minute'},
        {value: '120s', label: '2 minutes'},
        {value: '180s', label: '3 minutes'},
        {value: '240s', label: '4 minutes'},
        {value: '300s', label: '5 minutes'}
    ];

    return (
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 animate-slide-in-up">
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
                <div className="flex items-center">
                    <button
                        onClick={onCancel}
                        className="mr-3 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20}/>
                    </button>
                    <h2 className="text-xl font-semibold text-white">
                        {isEditing ? 'Edit Agent' : 'Create New Agent'}
                    </h2>
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-2 text-gray-400 hover:text-white border border-gray-600 rounded-lg flex items-center transition-colors"
                    >
                        <X size={18} className="mr-1"/>
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center transition-colors"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin mr-1"/>
                        ) : (
                            <Save size={18} className="mr-1"/>
                        )}
                        Save Agent
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('agent')}
                    className={`px-6 py-3 font-medium flex items-center ${
                        activeTab === 'agent'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-400 hover:text-gray-300'
                    }`}
                >
                    <Mic size={18} className="mr-2"/>
                    Agent Script
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 font-medium flex items-center ${
                        activeTab === 'settings'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-400 hover:text-gray-300'
                    }`}
                >
                    <Settings size={18} className="mr-2"/>
                    Settings
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="p-6">
                    {/* Agent Name (Always Shown) */}
                    <div className="mb-6">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                            Agent Name*
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter agent name (e.g., Muashmi Real Estate Agent)"
                            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                        />
                    </div>

                    {/* Agent Tab Content */}
                    {activeTab === 'agent' && (
                        <div className="space-y-6">
                            {/* System Prompt */}
                            <div>
                                <label htmlFor="system_prompt" className="block text-sm font-medium text-gray-300 mb-1">
                                    Agent Script (System Prompt)*
                                </label>
                                <textarea
                                    id="system_prompt"
                                    name="system_prompt"
                                    rows="8"
                                    value={formData.system_prompt}
                                    onChange={handleChange}
                                    placeholder="Enter the system prompt that defines your agent's behavior..."
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white font-mono"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Define the AI assistant's role, character, and conversation guidelines
                                </p>
                            </div>

                            {/* Initial Messages */}
                            // In the AgentForm component, we'll still collect the initial messages,
                            // but we'll add a note that they may not be used:

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-300">
                                        Welcome Messages (Initial Messages)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addInitialMessage}
                                        className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                    >
                                        + Add Message
                                    </button>
                                </div>

                                {formData.initial_messages.map((message, index) => (
                                    <div key={index} className="flex mb-2">
      <textarea
          rows="2"
          value={message}
          onChange={(e) => handleInitialMessageChange(index, e.target.value)}
          placeholder={`Welcome message ${index + 1}...`}
          className="flex-grow px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white mr-2"
      />
                                        {formData.initial_messages.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeInitialMessage(index)}
                                                className="px-2 text-gray-400 hover:text-red-400 self-center"
                                            >
                                                <X size={18}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <p className="mt-1 text-xs text-gray-400">
                                    These messages would normally be spoken at the beginning of the call, but they're
                                    currently disabled due to API limitations.
                                    The assistant will introduce itself based on the system prompt instead.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Settings Tab Content */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Language Hint */}
                                <div>
                                    <label htmlFor="language_hint"
                                           className="block text-sm font-medium text-gray-300 mb-1">
                                        Primary Language
                                    </label>
                                    <select
                                        id="language_hint"
                                        name="language_hint"
                                        value={formData.settings.language_hint}
                                        onChange={handleSettingsChange}
                                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                    >
                                        {languageOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Voice Selection */}
                                <div>
                                    <label htmlFor="voice" className="block text-sm font-medium text-gray-300 mb-1">
                                        Voice
                                    </label>
                                    <select
                                        id="voice"
                                        name="voice"
                                        value={formData.settings.voice}
                                        onChange={handleSettingsChange}
                                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                    >
                                        {voiceOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Max Duration */}
                                <div>
                                    <label htmlFor="max_duration"
                                           className="block text-sm font-medium text-gray-300 mb-1">
                                        Maximum Call Duration
                                    </label>
                                    <select
                                        id="max_duration"
                                        name="max_duration"
                                        value={formData.settings.max_duration}
                                        onChange={handleSettingsChange}
                                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                    >
                                        {durationOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Recording Enabled */}
                            <div className="flex items-center">
                                <input
                                    id="recording_enabled"
                                    type="checkbox"
                                    checked={formData.settings.recording_enabled}
                                    onChange={() => handleToggleChange('recording_enabled')}
                                    className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="recording_enabled" className="ml-2 text-sm text-gray-300">
                                    Enable Call Recording
                                </label>
                            </div>

                            {/* VAD Settings */}
                            <div>
                                <h3 className="text-md font-medium text-white mb-3">Voice Activity Detection
                                    Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-700 p-4 rounded-lg">
                                    <div>
                                        <label htmlFor="turnEndpointDelay"
                                               className="block text-sm font-medium text-gray-300 mb-1">
                                            Turn Endpoint Delay
                                        </label>
                                        <input
                                            id="turnEndpointDelay"
                                            name="turnEndpointDelay"
                                            type="text"
                                            value={formData.settings.vad_settings.turnEndpointDelay}
                                            onChange={handleVadSettingChange}
                                            placeholder="0.384s"
                                            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="minimumTurnDuration"
                                               className="block text-sm font-medium text-gray-300 mb-1">
                                            Minimum Turn Duration
                                        </label>
                                        <input
                                            id="minimumTurnDuration"
                                            name="minimumTurnDuration"
                                            type="text"
                                            value={formData.settings.vad_settings.minimumTurnDuration}
                                            onChange={handleVadSettingChange}
                                            placeholder="0s"
                                            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="minimumInterruptionDuration"
                                               className="block text-sm font-medium text-gray-300 mb-1">
                                            Minimum Interruption Duration
                                        </label>
                                        <input
                                            id="minimumInterruptionDuration"
                                            name="minimumInterruptionDuration"
                                            type="text"
                                            value={formData.settings.vad_settings.minimumInterruptionDuration}
                                            onChange={handleVadSettingChange}
                                            placeholder="0.05s"
                                            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="frameActivationThreshold"
                                               className="block text-sm font-medium text-gray-300 mb-1">
                                            Frame Activation Threshold
                                        </label>
                                        <input
                                            id="frameActivationThreshold"
                                            name="frameActivationThreshold"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            value={formData.settings.vad_settings.frameActivationThreshold}
                                            onChange={handleVadSettingChange}
                                            placeholder="0.1"
                                            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Inactivity Messages */}
                            <div>
                                <h3 className="text-md font-medium text-white mb-3">Inactivity Messages</h3>

                                {formData.settings.inactivity_messages.map((message, index) => (
                                    <div key={index}
                                         className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-3 bg-gray-700 p-3 rounded-lg">
                                        <div className="md:col-span-2">
                                            <label
                                                className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
                                            <input
                                                type="text"
                                                value={message.duration}
                                                onChange={(e) => handleInactivityMessageChange(index, 'duration', e.target.value)}
                                                placeholder="8s"
                                                className="w-full px-2 py-1 text-sm border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                            />
                                        </div>
                                        <div className="md:col-span-5">
                                            <label
                                                className="block text-xs font-medium text-gray-400 mb-1">Message</label>
                                            <input
                                                type="text"
                                                value={message.message}
                                                onChange={(e) => handleInactivityMessageChange(index, 'message', e.target.value)}
                                                placeholder="Are you there?"
                                                className="w-full px-2 py-1 text-sm border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex items-end justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeInactivityMessage(index)}
                                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Add new inactivity message */}
                                <div className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-2">
                                    <div className="md:col-span-2">
                                        <input
                                            type="text"
                                            value={newInactivityMessage.duration}
                                            onChange={(e) => setNewInactivityMessage({
                                                ...newInactivityMessage,
                                                duration: e.target.value
                                            })}
                                            placeholder="Duration (e.g., 8s)"
                                            className="w-full px-2 py-1 text-sm border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="md:col-span-5">
                                        <input
                                            type="text"
                                            value={newInactivityMessage.message}
                                            onChange={(e) => setNewInactivityMessage({
                                                ...newInactivityMessage,
                                                message: e.target.value
                                            })}
                                            placeholder="Message (e.g., Are you there?)"
                                            className="w-full px-2 py-1 text-sm border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <button
                                            type="button"
                                            onClick={addInactivityMessage}
                                            className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

export default AgentForm;