import DatabaseSubreddits from './DatabaseSubreddits';

interface RedditBrowserProps {
  onSwitchToMonitor: () => void;
}

function RedditBrowser({ onSwitchToMonitor }: RedditBrowserProps) {
  // Handle selecting a subreddit - this will switch to monitor tab and start monitoring
  const handleSelectSubreddit = (subredditName: string) => {
    // Switch to monitor tab
    onSwitchToMonitor();
    
    // Dispatch a custom event to let LiveMonitor know to start monitoring this subreddit
    window.dispatchEvent(new CustomEvent('startMonitoring', { 
      detail: { subredditName } 
    }));
  };

  return (
    <div>
      <DatabaseSubreddits onSelectSubreddit={handleSelectSubreddit} />
    </div>
  );
}

export default RedditBrowser; 