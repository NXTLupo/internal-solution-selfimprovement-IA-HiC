import { useState } from 'react';
import Navigation from '../../components/Navigation';
import RedditBrowser from './RedditBrowser';
import LiveMonitor from './LiveMonitor';

function RedditHub() {
  const backgroundColor = 'rgba(21,31,31,255)';
  const [activeTab, setActiveTab] = useState<'browse' | 'monitor'>('browse');

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      <Navigation />
      
      <div className="p-8 flex-grow">
        <div className="max-w-screen-2xl mx-auto w-full">
          <h1 className="pb-2 text-4xl font-bold mb-8 bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text">
            Reddit Hub
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            Browse existing Reddit posts from your database and monitor subreddits in real-time.
          </p>
          
          {/* Tab Navigation */}
          <div className="flex mb-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
                activeTab === 'browse'
                  ? 'bg-gray-800 text-white border-b-2 border-green-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📚 Browse Database
            </button>
            <button
              onClick={() => setActiveTab('monitor')}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors ml-2 ${
                activeTab === 'monitor'
                  ? 'bg-gray-800 text-white border-b-2 border-orange-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📡 Live Monitor
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'browse' ? (
            <RedditBrowser onSwitchToMonitor={() => setActiveTab('monitor')} />
          ) : (
            <LiveMonitor />
          )}
        </div>
      </div>
    </div>
  );
}

export default RedditHub; 