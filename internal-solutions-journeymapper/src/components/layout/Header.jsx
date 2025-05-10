import React from 'react';
import { Search } from 'lucide-react';

const Header = ({ activeTab, sidebarOpen }) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'data':
        return 'Data Overview';
      case 'journey':
        return 'Journey Map';
      case 'conversation':
        return 'Conversation Interface';
      case 'insights':
        return 'Journey Insights';
      case 'settings':
        return 'Settings';
      default:
        return 'AI Journey Mapper';
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'data':
        return 'Upload and analyze customer data';
      case 'journey':
        return 'Interactive customer journey visualization';
      case 'conversation':
        return 'Chat with AI about your journey map';
      case 'insights':
        return 'Key metrics and insights from your journey';
      case 'settings':
        return 'Configure application settings';
      default:
        return 'AI-powered journey mapping tool';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">{getTabTitle()}</h1>
          <p className="text-sm text-gray-500">{getTabDescription()}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            + New Project
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;