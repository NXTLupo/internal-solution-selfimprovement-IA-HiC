import React from 'react';

interface NavItem {
  index: number;
  kind: string;
  label: string;
}

interface Props {
  items: NavItem[];
  activeIndex: number;
}

export const SideNav: React.FC<Props> = ({ items, activeIndex }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
    e.preventDefault();
    const target = document.querySelector(`[data-section-index="${index}"]`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 40,
        paddingRight: '24px',
      }}
      className="hidden lg:block"
    >
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => {
          const active = item.index === activeIndex;
          return (
            <li key={item.index}>
              <a
                href={`#s-${item.index}-${item.kind}`}
                onClick={(e) => handleClick(e, item.index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
                aria-label={`Scroll to ${item.label}`}
              >
                <div
                  style={{
                    textAlign: 'right',
                    marginRight: '12px',
                    opacity: active ? 1 : 0,
                    transition: 'opacity 0.3s',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}
                  className="hover:opacity-100"
                >
                  {item.label}
                </div>
                <div
                  style={{
                    width: active ? '14px' : '10px',
                    height: active ? '14px' : '10px',
                    borderRadius: '50%',
                    backgroundColor: active ? 'var(--accent-primary)' : 'var(--nav-dot)',
                    transition: 'all 0.3s',
                    flexShrink: 0,
                    boxShadow: active ? `0 0 16px var(--accent-primary)` : 'none',
                  }}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
