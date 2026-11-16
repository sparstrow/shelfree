export function Avatar({ name, color, size = 'md', src }) {
  const initials = name
    ? name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // Deterministic colour from name if none provided
  const palette = [
    'oklch(0.6 0.13 25)',   // red-ish
    'oklch(0.6 0.13 58)',   // amber
    'oklch(0.6 0.13 155)',  // green
    'oklch(0.6 0.13 245)',  // blue
    'oklch(0.6 0.13 290)',  // violet
    'oklch(0.6 0.13 330)',  // pink
  ];
  const bg = color || palette[(name || '').charCodeAt(0) % palette.length] || palette[0];

  const sizes = {
    sm: { width: '24px', height: '24px', fontSize: '10px', borderRadius: '50%' },
    md: { width: '30px', height: '30px', fontSize: '11px', borderRadius: '50%' },
    lg: { width: '40px', height: '40px', fontSize: '14px', borderRadius: '50%' },
    xl: { width: '56px', height: '56px', fontSize: '20px', borderRadius: '50%' },
  };
  const s = sizes[size] || sizes.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ ...s, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      ...s,
      background: bg,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      fontWeight: 600,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

export function Tabs({ tabs = [], activeId, onSelect }) {
  return (
    <div style={{
      display: 'inline-flex',
      gap: '2px',
      background: 'var(--muted)',
      borderRadius: '9px',
      padding: '3px',
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect && onSelect(tab.id)}
            style={{
              height: '26px',
              padding: '0 11px',
              border: 'none',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: isActive ? 'var(--card)' : 'transparent',
              color: isActive ? 'var(--foreground)' : 'var(--muted-fg)',
              boxShadow: isActive ? 'var(--shadow)' : 'none',
              transition: 'background .14s ease, color .14s ease, box-shadow .14s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {tab.count != null && (
              <span style={{ marginLeft: '5px', opacity: 0.55, fontSize: '11px' }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
