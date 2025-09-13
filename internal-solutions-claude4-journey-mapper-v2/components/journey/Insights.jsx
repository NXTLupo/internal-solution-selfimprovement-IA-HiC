import React from 'react';

const Insights = ({ title, items, icon, color }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className={`px-6 py-4 border-b border-gray-200 bg-${color}-50`}>
        <div className="flex items-center">
          {icon}
          <h3 className="text-lg font-medium text-gray-800">{title}</h3>
        </div>
      </div>
      <div className="p-6">
        <ul className="space-y-4">
          {items.map((item, index) => (
            <li key={index} className="flex">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full bg-${color}-500 mt-2 mr-3`}></div>
              <p className="text-gray-700">{item}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Insights;