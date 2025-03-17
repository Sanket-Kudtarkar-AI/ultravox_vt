import React, { useState } from 'react';
import { Loader2, Phone, Mic, Settings } from 'lucide-react';

const NewCallForm = ({ onSubmit, loading }) => {
  const [activeTab, setActiveTab] = useState('agent');
  const [formData, setFormData] = useState({
    recipient_phone_number: '',
    plivo_phone_number: '+912231043958',
    system_prompt: '',
    initial_messages: [],
    language_hint: 'hi',
    max_duration: '180s',
    voice: 'Maushmi',
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
  });

  const [useDefaultPrompt, setUseDefaultPrompt] = useState(true);
  const [newInactivityMessage, setNewInactivityMessage] = useState({
    duration: '8s',
    message: '',
    endBehavior: 'END_BEHAVIOR_UNSPECIFIED'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVadSettingChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      vad_settings: {
        ...prev.vad_settings,
        [name]: value
      }
    }));
  };

  const handleInactivityMessageChange = (index, field, value) => {
    const updatedMessages = [...formData.inactivity_messages];
    updatedMessages[index] = {
      ...updatedMessages[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      inactivity_messages: updatedMessages
    }));
  };

  const addInactivityMessage = () => {
    setFormData(prev => ({
      ...prev,
      inactivity_messages: [...prev.inactivity_messages, newInactivityMessage]
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
      inactivity_messages: prev.inactivity_messages.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // If using default prompt, don't include the system_prompt field
    const submitData = useDefaultPrompt
      ? { ...formData, system_prompt: undefined }
      : formData;

    onSubmit(submitData);
  };

  const languageOptions = [
    { value: 'hi', label: 'Hindi (Hinglish)' },
    { value: 'en', label: 'English' },
    { value: 'mr', label: 'Marathi' }
  ];

  const voiceOptions = [
    { value: 'Maushmi', label: 'Maushmi (Female)' },
    { value: 'Ravi', label: 'Ravi (Male)' }
  ];

  const durationOptions = [
    { value: '60s', label: '1 minute' },
    { value: '120s', label: '2 minutes' },
    { value: '180s', label: '3 minutes' },
    { value: '240s', label: '4 minutes' },
    { value: '300s', label: '5 minutes' }
  ];

  return (
    <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700">
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
          <Mic size={18} className="mr-2" />
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
          <Settings size={18} className="mr-2" />
          Settings
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="p-6">
          {/* Basic Fields (Always Shown) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="recipient_phone_number" className="block text-sm font-medium text-gray-300 mb-1">
                Recipient Phone Number*
              </label>
              <input
                id="recipient_phone_number"
                name="recipient_phone_number"
                type="text"
                required
                placeholder="+918879415567"
                value={formData.recipient_phone_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
              />
            </div>

            <div>
              <label htmlFor="plivo_phone_number" className="block text-sm font-medium text-gray-300 mb-1">
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
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
              />
            </div>
          </div>

          {/* Agent Tab Content */}
          {activeTab === 'agent' && (
            <div className="space-y-6">
              {/* System Prompt Toggle */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center mb-4">
                  <input
                    id="default-prompt"
                    type="checkbox"
                    checked={useDefaultPrompt}
                    onChange={() => setUseDefaultPrompt(!useDefaultPrompt)}
                    className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="default-prompt" className="ml-2 text-sm text-gray-300">
                    Use default system prompt for real estate agent (Muashmi)
                  </label>
                </div>

                {/* Custom System Prompt */}
                {!useDefaultPrompt && (
                  <div>
                    <label htmlFor="system_prompt" className="block text-sm font-medium text-gray-300 mb-1">
                      Agent Script (System Prompt)
                    </label>
                    <textarea
                      id="system_prompt"
                      name="system_prompt"
                      rows="8"
                      value={formData.system_prompt}
                      onChange={handleChange}
                      placeholder="Enter your custom system prompt here..."
                      className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Define the AI assistant's role, character, and conversation guidelines
                    </p>
                  </div>
                )}
              </div>

              {/* Initial Messages (Welcome Message) */}
              <div>
                <label htmlFor="initial_message" className="block text-sm font-medium text-gray-300 mb-1">
                  Welcome Message (Initial Message)
                </label>
                <textarea
                  id="initial_message"
                  name="initial_message"
                  rows="3"
                  placeholder="Enter an initial message that the AI will say when the call starts..."
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                />
                <p className="mt-1 text-xs text-gray-400">
                  This message will be spoken at the beginning of the call
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
                  <label htmlFor="language_hint" className="block text-sm font-medium text-gray-300 mb-1">
                    Primary Language
                  </label>
                  <select
                    id="language_hint"
                    name="language_hint"
                    value={formData.language_hint}
                    onChange={handleChange}
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
                    value={formData.voice}
                    onChange={handleChange}
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
                  <label htmlFor="max_duration" className="block text-sm font-medium text-gray-300 mb-1">
                    Maximum Call Duration
                  </label>
                  <select
                    id="max_duration"
                    name="max_duration"
                    value={formData.max_duration}
                    onChange={handleChange}
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
                  checked={formData.recording_enabled}
                  onChange={() =>
                    setFormData(prev => ({ ...prev, recording_enabled: !prev.recording_enabled }))
                  }
                  className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="recording_enabled" className="ml-2 text-sm text-gray-300">
                  Enable Call Recording
                </label>
              </div>

              {/* VAD Settings */}
              <div>
                <h3 className="text-md font-medium text-white mb-3">Voice Activity Detection Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-700 p-4 rounded-lg">
                  <div>
                    <label htmlFor="turnEndpointDelay" className="block text-sm font-medium text-gray-300 mb-1">
                      Turn Endpoint Delay
                    </label>
                    <input
                      id="turnEndpointDelay"
                      name="turnEndpointDelay"
                      type="text"
                      value={formData.vad_settings.turnEndpointDelay}
                      onChange={handleVadSettingChange}
                      placeholder="0.384s"
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="minimumTurnDuration" className="block text-sm font-medium text-gray-300 mb-1">
                      Minimum Turn Duration
                    </label>
                    <input
                      id="minimumTurnDuration"
                      name="minimumTurnDuration"
                      type="text"
                      value={formData.vad_settings.minimumTurnDuration}
                      onChange={handleVadSettingChange}
                      placeholder="0s"
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="minimumInterruptionDuration" className="block text-sm font-medium text-gray-300 mb-1">
                      Minimum Interruption Duration
                    </label>
                    <input
                      id="minimumInterruptionDuration"
                      name="minimumInterruptionDuration"
                      type="text"
                      value={formData.vad_settings.minimumInterruptionDuration}
                      onChange={handleVadSettingChange}
                      placeholder="0.05s"
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="frameActivationThreshold" className="block text-sm font-medium text-gray-300 mb-1">
                      Frame Activation Threshold
                    </label>
                    <input
                      id="frameActivationThreshold"
                      name="frameActivationThreshold"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.vad_settings.frameActivationThreshold}
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

                {formData.inactivity_messages.map((message, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-3 bg-gray-700 p-3 rounded-lg">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
                      <input
                        type="text"
                        value={message.duration}
                        onChange={(e) => handleInactivityMessageChange(index, 'duration', e.target.value)}
                        placeholder="8s"
                        className="w-full px-2 py-1 text-sm border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Message</label>
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
                      onChange={(e) => setNewInactivityMessage({...newInactivityMessage, duration: e.target.value})}
                      placeholder="Duration (e.g., 8s)"
                      className="w-full px-2 py-1 text-sm border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                    />
                  </div>
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      value={newInactivityMessage.message}
                      onChange={(e) => setNewInactivityMessage({...newInactivityMessage, message: e.target.value})}
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

          {/* Submit Button */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Initiating Call...
                </>
              ) : (
                'Make Call'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewCallForm;