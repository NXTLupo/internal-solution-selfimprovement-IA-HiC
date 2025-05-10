import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ activeTab, onTabChange, model, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={onTabChange}
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        model={model}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          activeTab={activeTab}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;