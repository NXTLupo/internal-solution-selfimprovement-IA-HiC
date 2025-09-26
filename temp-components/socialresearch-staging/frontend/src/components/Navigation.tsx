import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundColor = 'rgba(21,31,31,255)';

  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/reddit-browser', label: 'Reddit Hub', icon: '🔍' },
  ];

  return (
    <div className="w-full py-3 px-6 flex justify-between items-center border-b border-gray-700" style={{ backgroundColor }}>
      <div className="flex items-center">
        <div className="cursor-pointer mr-8" onClick={() => navigate('/')}>
          <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
        </div>
        <nav className="flex space-x-6">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors font-medium ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Navigation; 