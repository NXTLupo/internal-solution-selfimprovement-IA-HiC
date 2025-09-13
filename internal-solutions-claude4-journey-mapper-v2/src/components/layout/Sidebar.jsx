import React from 'react';
import { Map, FileText, Settings, Users, MessageSquare, BarChart3, ChevronRight, Zap } from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, sidebarOpen, toggleSidebar, model }) => {
  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
      <div className="p-4 flex items-center justify-between border-b border-gray-100">
        <div className={`flex items-center ${!sidebarOpen && 'justify-center w-full'}`}>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white">
            <Map size={20} />
          </div>
          {sidebarOpen && <span className="ml-3 font-semibold text-lg">Journey Mapper</span>}
        </div>
        <button onClick={toggleSidebar} className={`text-gray-500 hover:text-gray-700 ${!sidebarOpen && 'hidden'}`}>
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="p-4">
        <div className={`mb-4 ${!sidebarOpen && 'flex justify-center'}`}>
          {sidebarOpen ? (
            <div className="bg-indigo-50 rounded-lg p-3">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Zap size={16} />
                </div>
                <div className="ml-3">
                  <div className="text-xs text-indigo-600 font-medium">AI Model</div>
                  <div className="text-sm font-medium">{model}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Zap size={18} />
            </div>
          )}
        </div>
        
        <nav className="mt-6 space-y-1">
          <NavItem 
            active={activeTab === 'data'}
            icon={<FileText size={20} />}
            text="Data Overview"
            collapsed={!sidebarOpen}
            onClick={() => onTabChange('data')}
          />
          <NavItem 
            active={activeTab === 'journey'}
            icon={<Map size={20} />}
            text="Journey Map"
            collapsed={!sidebarOpen}
            onClick={() => onTabChange('journey')}
          />
          <NavItem 
            active={activeTab === 'conversation'}
            icon={<MessageSquare size={20} />}
            text="Conversation"
            collapsed={!sidebarOpen}
            onClick={() => onTabChange('conversation')}
          />
          <NavItem 
            active={activeTab === 'insights'}
            icon={<BarChart3 size={20} />}
            text="Insights"
            collapsed={!sidebarOpen}
            onClick={() => onTabChange('insights')}
          />
          <NavItem 
            active={activeTab === 'settings'}
            icon={<Settings size={20} />}
            text="Settings"
            collapsed={!sidebarOpen}
            onClick={() => onTabChange('settings')}
          />
        </nav>
      </div>
      
      <div className="mt-auto p-4">
        {sidebarOpen ? (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                <Users size={20} />
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium">UX Research Team</div>
                <div className="text-xs text-gray-500">Pro Account</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
              <Users size={20} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NavItem = ({ active, icon, text, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-3 py-3 rounded-lg transition-colors ${
      active
        ? 'bg-indigo-50 text-indigo-600'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    } ${collapsed ? 'justify-center' : ''}`}
  >
    <span className={`${active ? 'text-indigo-600' : 'text-gray-500'}`}>{icon}</span>
    {!collapsed && <span className="ml-3 text-sm font-medium">{text}</span>}
  </button>
);

export default Sidebar;