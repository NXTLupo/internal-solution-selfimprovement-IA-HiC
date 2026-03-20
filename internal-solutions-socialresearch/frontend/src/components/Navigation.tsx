import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundColor = '#ffffff';

  const navigationItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/reddit-browser', label: 'Reddit Hub' },
  ];

  return (
    <div className="w-full py-3 px-6 flex justify-between items-center border-b border-[#e5e5e5]" style={{ backgroundColor }}>
      <div className="flex items-center">
        <div className="cursor-pointer mr-8" onClick={() => navigate('/')}>
          <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
        </div>
        <nav className="flex space-x-6">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center px-4 py-2 rounded-[4px] transition-colors font-medium ${
                location.pathname === item.path
                  ? 'bg-[#caca20] text-[#115054]'
                  : 'text-[#525252] hover:text-[#141414] hover:bg-[#f5f5f5]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Navigation; 