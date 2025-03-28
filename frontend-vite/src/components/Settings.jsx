import React from 'react';
import Card from './ui/Card';
import { Settings as SettingsIcon, ChevronLeft } from 'lucide-react';

const Settings = ({ setCurrentView }) => {
  return (
    <div className="p-6 text-gray-300">
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-dark-700 flex items-center bg-dark-800/50">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors"
          >
            <ChevronLeft size={20}/>
          </button>
          <h2 className="text-xl font-semibold text-white">Settings</h2>
        </div>

        <div className="p-6">
          <div className="flex items-center mb-6">
            <SettingsIcon size={20} className="text-primary-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Application Settings</h3>
          </div>

          <p className="text-gray-400 mb-4">Settings page is under development.</p>
        </div>
      </Card>
    </div>
  );
};

export default Settings;