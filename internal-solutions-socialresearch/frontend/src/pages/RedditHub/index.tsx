import { useState } from 'react';
import Navigation from '../../components/Navigation';
import RedditBrowser from './RedditBrowser';
import LiveMonitor from './LiveMonitor';

function RedditHub() {
  const backgroundColor = '#ffffff';
  const [activeTab, setActiveTab] = useState<'browse' | 'monitor'>('browse');

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      <Navigation />

      <div className="p-8 flex-grow">
        <div className="max-w-screen-2xl mx-auto w-full">
          <h1 className="pb-2 text-4xl font-[200] mb-8 text-[#141414]" style={{ fontFamily: 'Archivo, sans-serif' }}>
            Reddit Hub
          </h1>
          <p className="text-[#525252] text-lg mb-8">
            Browse existing Reddit posts from your database and monitor subreddits in real-time.
          </p>

          {/* Tab Navigation */}
          <div className="flex mb-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-6 py-3 font-medium rounded-t-[4px] transition-colors ${
                activeTab === 'browse'
                  ? 'bg-white text-[#141414] border-b-2 border-[#115054]'
                  : 'bg-[#f5f5f5] text-[#525252] hover:bg-[#fafafa]'
              }`}
            >
              📚 Browse Database
            </button>
            <button
              onClick={() => setActiveTab('monitor')}
              className={`px-6 py-3 font-medium rounded-t-[4px] transition-colors ml-2 ${
                activeTab === 'monitor'
                  ? 'bg-white text-[#141414] border-b-2 border-[#fd8e2e]'
                  : 'bg-[#f5f5f5] text-[#525252] hover:bg-[#fafafa]'
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