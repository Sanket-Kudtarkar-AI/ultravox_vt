import React, {useState, useEffect} from 'react';
import {Save, X, Loader2, Mic, Settings, ArrowLeft} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

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

        // Prepare the data for the API
        const agentData = {
            agent_id: formData.id || undefined, // Include ID only if it exists
            name: formData.name,
            system_prompt: formData.system_prompt,
            initial_messages: filteredInitialMessages.length > 0 ? filteredInitialMessages : [''],
            settings: {
                language_hint: formData.settings.language_hint,
                voice: formData.settings.voice,
                max_duration: formData.settings.max_duration,
                recording_enabled: formData.settings.recording_enabled,
                vad_settings: formData.settings.vad_settings,
                inactivity_messages: formData.settings.inactivity_messages
            }
        };

        onSave(agentData);
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

    // Updated duration options to include more options
    const durationOptions = [
        {value: '60s', label: '1 minute'},
        {value: '120s', label: '2 minutes'},
        {value: '180s', label: '3 minutes'},
        {value: '300s', label: '5 minutes'},
        {value: '480s', label: '8 minutes'},
        {value: '600s', label: '10 minutes'},
        {value: '900s', label: '15 minutes'}
    ];

    const TabButton = ({label, icon, isActive, onClick}) => (
        <button
            onClick={onClick}
            className={`px-6 py-3 font-medium flex items-center transition-colors ${
                isActive
                    ? 'text-white border-b-2 border-primary-500 bg-dark-700/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-dark-700/10'
            }`}
        >
            {icon}
            <span className="ml-2">{label}</span>
        </button>
    );

    return (
        <Card className="animate-slide-in-up overflow-hidden">
            <div
                className="flex justify-between items-center border-b border-dark-700 p-4 bg-dark-800/50 backdrop-blur-sm">
                <div className="flex items-center">
                    <button
                        onClick={onCancel}
                        className="mr-3 p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20}/>
                    </button>
                    <h2 className="text-xl font-semibold text-white">
                        {isEditing ? 'Edit Agent' : 'Create New Agent'}
                    </h2>
                </div>

                <div className="flex space-x-2">
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        size="md"
                        icon={<X size={18}/>}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        variant="primary"
                        size="md"
                        icon={loading ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                    >
                        Save Agent
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-dark-700 bg-dark-800/30">
                <TabButton
                    label="Agent Script"
                    icon={<Mic size={18} className="mr-2"/>}
                    isActive={activeTab === 'agent'}
                    onClick={() => setActiveTab('agent')}
                />
                <TabButton
                    label="Settings"
                    icon={<Settings size={18} className="mr-2"/>}
                    isActive={activeTab === 'settings'}
                    onClick={() => setActiveTab('settings')}
                />
            </div>

            <form onSubmit={handleSubmit} className="overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                    {/* Agent Name (Always Shown) */}
                    <div className="mb-6">
                        <Input
                            id="name"
                            name="name"
                            label="Agent Name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter agent name (e.g., Muashmi Real Estate Agent)"
                            icon={<Mic size={16} className="text-primary-400"/>}
                        />
                    </div>

                    {/* Agent Tab Content */}
                    {activeTab === 'agent' && (
                        <div className="space-y-6 animate-fade-in">
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
                                    className="w-full px-4 py-2 border border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-dark-700/70 text-white font-mono"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Define the AI assistant's role, character, and conversation guidelines
                                </p>
                            </div>

                            {/* Initial Messages */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-300">
                                        Welcome Messages (Initial Messages)
                                    </label>
                                    <Button
                                        type="button"
                                        onClick={addInitialMessage}
                                        variant="primary"
                                        size="sm"
                                    >
                                        + Add Message
                                    </Button>
                                </div>

                                {formData.initial_messages.map((message, index) => (
                                    <div key={index} className="flex mb-2 group">
                    <textarea
                        rows="2"
                        value={message}
                        onChange={(e) => handleInitialMessageChange(index, e.target.value)}
                        placeholder={`Welcome message ${index + 1}...`}
                        className="flex-grow px-3 py-2 border border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-dark-700/70 text-white mr-2"
                    />
                                        {formData.initial_messages.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeInitialMessage(index)}
                                                className="px-2 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-400 self-center transition-opacity duration-200"
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
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Language Hint */}
                                <Select
                                    id="language_hint"
                                    name="language_hint"
                                    label="Primary Language"
                                    value={formData.settings.language_hint}
                                    onChange={handleSettingsChange}
                                    options={languageOptions}
                                />

                                {/* Voice Selection */}
                                <Select
                                    id="voice"
                                    name="voice"
                                    label="Voice"
                                    value={formData.settings.voice}
                                    onChange={handleSettingsChange}
                                    options={voiceOptions}
                                />

                                {/* Max Duration */}
                                <Select
                                    id="max_duration"
                                    name="max_duration"
                                    label="Maximum Call Duration"
                                    value={formData.settings.max_duration}
                                    onChange={handleSettingsChange}
                                    options={durationOptions}
                                />
                            </div>

                            {/* Recording Enabled */}
                            <div className="flex items-center p-3 bg-dark-700/30 rounded-lg">
                                <input
                                    id="recording_enabled"
                                    type="checkbox"
                                    checked={formData.settings.recording_enabled}
                                    onChange={() => handleToggleChange('recording_enabled')}
                                    className="h-4 w-4 text-primary-600 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="recording_enabled" className="ml-2 text-sm text-gray-300">
                                    Enable Call Recording
                                </label>
                            </div>

                            {/* VAD Settings */}
                            <div>
                                <h3 className="text-md font-medium text-white mb-3 flex items-center">
                                    <Settings size={16} className="mr-2 text-primary-400"/>
                                    Voice Activity Detection Settings
                                </h3>
                                <div
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-dark-700/30 p-4 rounded-lg border border-dark-600/50">
                                    <Input
                                        id="turnEndpointDelay"
                                        name="turnEndpointDelay"
                                        label="Turn Endpoint Delay"
                                        value={formData.settings.vad_settings.turnEndpointDelay}
                                        onChange={handleVadSettingChange}
                                        placeholder="0.384s"
                                    />
                                    <Input
                                        id="minimumTurnDuration"
                                        name="minimumTurnDuration"
                                        label="Minimum Turn Duration"
                                        value={formData.settings.vad_settings.minimumTurnDuration}
                                        onChange={handleVadSettingChange}
                                        placeholder="0s"
                                    />
                                    <Input
                                        id="minimumInterruptionDuration"
                                        name="minimumInterruptionDuration"
                                        label="Minimum Interruption Duration"
                                        value={formData.settings.vad_settings.minimumInterruptionDuration}
                                        onChange={handleVadSettingChange}
                                        placeholder="0.05s"
                                    />
                                    <Input
                                        id="frameActivationThreshold"
                                        name="frameActivationThreshold"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="1"
                                        label="Frame Activation Threshold"
                                        value={formData.settings.vad_settings.frameActivationThreshold}
                                        onChange={handleVadSettingChange}
                                        placeholder="0.1"
                                    />
                                </div>
                            </div>

                            {/* Inactivity Messages */}
                            <div>
                                <h3 className="text-md font-medium text-white mb-3 flex items-center">
                                    <Mic size={16} className="mr-2 text-primary-400"/>
                                    Inactivity Messages
                                </h3>

                                {formData.settings.inactivity_messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-3 bg-dark-700/30 p-3 rounded-lg border border-dark-600/50 hover:border-dark-500/50 transition-colors group"
                                    >
                                        <div className="md:col-span-2">
                                            <label
                                                className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
                                            <input
                                                type="text"
                                                value={message.duration}
                                                onChange={(e) => handleInactivityMessageChange(index, 'duration', e.target.value)}
                                                placeholder="8s"
                                                className="w-full px-2 py-1 text-sm border border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-dark-700/70 text-white"
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
                                                className="w-full px-2 py-1 text-sm border border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-dark-700/70 text-white"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex items-end justify-center">
                                            <Button
                                                type="button"
                                                onClick={() => removeInactivityMessage(index)}
                                                variant="danger"
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            >
                                                <X size={16}/>
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {/* Add new inactivity message */}
                                <div
                                    className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-2 p-3 bg-dark-700/10 rounded-lg border border-dashed border-dark-600/50">
                                    <div className="md:col-span-2">
                                        <input
                                            type="text"
                                            value={newInactivityMessage.duration}
                                            onChange={(e) => setNewInactivityMessage({
                                                ...newInactivityMessage,
                                                duration: e.target.value
                                            })}
                                            placeholder="Duration (e.g., 8s)"
                                            className="w-full px-2 py-1 text-sm border border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-dark-700/70 text-white"
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
                                            className="w-full px-2 py-1 text-sm border border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-dark-700/70 text-white"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <Button
                                            type="button"
                                            onClick={addInactivityMessage}
                                            variant="primary"
                                            size="sm"
                                            fullWidth
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Card>
    );
};

export default AgentForm;