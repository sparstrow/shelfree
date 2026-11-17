/* @ds-bundle: {"format":4,"namespace":"ShelfreeDesignSystem_0318eb","components":[{"name":"Badge","sourcePath":"components/badges/Badge.jsx"},{"name":"CountChip","sourcePath":"components/badges/Badge.jsx"},{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"IconButton","sourcePath":"components/buttons/Button.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SearchInput","sourcePath":"components/forms/Input.jsx"},{"name":"SelectField","sourcePath":"components/forms/Input.jsx"},{"name":"Avatar","sourcePath":"components/layout/Avatar.jsx"},{"name":"Tabs","sourcePath":"components/layout/Avatar.jsx"}],"sourceHashes":{"components/badges/Badge.jsx":"f442b1133fef","components/buttons/Button.jsx":"22cde410dbaf","components/forms/Input.jsx":"a9b01d08dd30","components/layout/Avatar.jsx":"867f1e398658","designs/erp/ios-frame.jsx":"be3343be4b51","lib/record-nav.js":"2cf1f7f7cc79","lib/shelfree-data.js":"1fd2a1c54ae0","lib/tailwind-shadcn.js":"4b81831ee71d","lib/utils.js":"5bb19e0b1485"},"inlinedExternals":[],"unexposedExports":[{"name":"badgeVariants","sourcePath":"components/badges/Badge.jsx"},{"name":"buttonVariants","sourcePath":"components/buttons/Button.jsx"},{"name":"cn","sourcePath":"lib/utils.js"},{"name":"cva","sourcePath":"lib/utils.js"},{"name":"migrateNoFormat","sourcePath":"lib/shelfree-data.js"},{"name":"reconcileItemCategories","sourcePath":"lib/shelfree-data.js"},{"name":"seedAccounts","sourcePath":"lib/shelfree-data.js"},{"name":"seedAll","sourcePath":"lib/shelfree-data.js"},{"name":"seedAssemblyOrders","sourcePath":"lib/shelfree-data.js"},{"name":"seedBOMs","sourcePath":"lib/shelfree-data.js"},{"name":"seedCarriers","sourcePath":"lib/shelfree-data.js"},{"name":"seedCharges","sourcePath":"lib/shelfree-data.js"},{"name":"seedContacts","sourcePath":"lib/shelfree-data.js"},{"name":"seedCustomerPrices","sourcePath":"lib/shelfree-data.js"},{"name":"seedCustomers","sourcePath":"lib/shelfree-data.js"},{"name":"seedEmployees","sourcePath":"lib/shelfree-data.js"},{"name":"seedInvoices","sourcePath":"lib/shelfree-data.js"},{"name":"seedItemCategories","sourcePath":"lib/shelfree-data.js"},{"name":"seedItems","sourcePath":"lib/shelfree-data.js"},{"name":"seedNotes","sourcePath":"lib/shelfree-data.js"},{"name":"seedOrders","sourcePath":"lib/shelfree-data.js"},{"name":"seedProducts","sourcePath":"lib/shelfree-data.js"},{"name":"seedPurchaseOrders","sourcePath":"lib/shelfree-data.js"},{"name":"seedPurchaseReceipts","sourcePath":"lib/shelfree-data.js"},{"name":"seedUsers","sourcePath":"lib/shelfree-data.js"},{"name":"seedVendors","sourcePath":"lib/shelfree-data.js"},{"name":"seedWarehouses","sourcePath":"lib/shelfree-data.js"}]} */

(() => {

const __ds_ns = (window.ShelfreeDesignSystem_0318eb = window.ShelfreeDesignSystem_0318eb || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/layout/Avatar.jsx
try { (() => {
function Avatar({
  name,
  color,
  size = 'md',
  src
}) {
  const initials = name ? name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() : '?';

  // Deterministic colour from name if none provided
  const palette = ['oklch(0.6 0.13 25)',
  // red-ish
  'oklch(0.6 0.13 58)',
  // amber
  'oklch(0.6 0.13 155)',
  // green
  'oklch(0.6 0.13 245)',
  // blue
  'oklch(0.6 0.13 290)',
  // violet
  'oklch(0.6 0.13 330)' // pink
  ];
  const bg = color || palette[(name || '').charCodeAt(0) % palette.length] || palette[0];
  const sizes = {
    sm: {
      width: '24px',
      height: '24px',
      fontSize: '10px',
      borderRadius: '50%'
    },
    md: {
      width: '30px',
      height: '30px',
      fontSize: '11px',
      borderRadius: '50%'
    },
    lg: {
      width: '40px',
      height: '40px',
      fontSize: '14px',
      borderRadius: '50%'
    },
    xl: {
      width: '56px',
      height: '56px',
      fontSize: '20px',
      borderRadius: '50%'
    }
  };
  const s = sizes[size] || sizes.md;
  if (src) {
    return /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: name,
      style: {
        ...s,
        objectFit: 'cover',
        flexShrink: 0
      }
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...s,
      background: bg,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      fontWeight: 600,
      flexShrink: 0,
      userSelect: 'none'
    }
  }, initials);
}
function Tabs({
  tabs = [],
  activeId,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      gap: '2px',
      background: 'var(--muted)',
      borderRadius: '9px',
      padding: '3px'
    }
  }, tabs.map(tab => {
    const isActive = tab.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      onClick: () => onSelect && onSelect(tab.id),
      style: {
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
        whiteSpace: 'nowrap'
      }
    }, tab.label, tab.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: '5px',
        opacity: 0.55,
        fontSize: '11px'
      }
    }, tab.count));
  }));
}
Object.assign(__ds_scope, { Avatar, Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Avatar.jsx", error: String((e && e.message) || e) }); }

// designs/erp/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "designs/erp/ios-frame.jsx", error: String((e && e.message) || e) }); }

// lib/record-nav.js
try { (() => {
/* ============================================================================
 * record-nav.js — Reusable record-navigation controller
 * ----------------------------------------------------------------------------
 * Standardises the three-tier "open a record" interaction used across every
 * list page (Items, Stock by location, Sales orders, Invoices, Vendors, …):
 *
 *   1. single-click a row          →  open the SIDE DRAWER  (quick preview card)
 *   2. "Open card" button in drawer →  open the CENTERED CARD (modal)
 *   3. double-click a row           →  open the record in a NEW TAB (full page)
 *
 * One controller instance per host component. It owns a single unified slice
 * of the host's React state (`host.state.nav`) so every page shares the exact
 * same selection / tab model and behaves identically — change it once here and
 * all pages stay consistent.
 *
 * The host wires three concerns it alone knows about, via optional hooks:
 *   host.openRecordCard(entity, id)  — open this entity's centered card
 *   host.closeRecordCard()           — close whatever centered card is open
 *   host.recordCardOpen()            — is any centered card currently open?
 *   host.navTabLabel(entity, id)     — friendly label for a new-tab pill
 *   host.recordContext(entity,id,e)  — right-click handler (optional)
 *
 * Usage in a row:  <div onClick="{{ r.select }}"
 *                       onDoubleClick="{{ r.openTab }}"
 *                       onContextMenu="{{ r.ctx }}"> … </div>
 *   built with:    const r = host.nav.rowProps('orders', o.no);
 * ========================================================================== */

(function (root) {
  'use strict';

  var NAV_INIT = {
    sel: null,
    // { entity, id } | null          → which row's drawer is open
    tabs: {},
    // { [entity]: [id, …] }           → open full-page tabs
    active: {} // { [entity]: id | 'list' }       → active tab per page
  };
  function same(a, entity, id) {
    return !!a && a.entity === entity && a.id === id;
  }
  function createRecordNav(host) {
    function nav() {
      return host.state.nav || NAV_INIT;
    }
    function patch(p) {
      host.setState(function (s) {
        var cur = s.nav || NAV_INIT;
        return {
          nav: Object.assign({}, cur, p)
        };
      });
    }
    var api = {
      INIT: NAV_INIT,
      /* ---------------------------------------------------------------- *
       * Queries — derive the legacy per-page view-state from one model    *
       * ---------------------------------------------------------------- */
      selId: function (entity) {
        var n = nav();
        return same(n.sel, entity, n.sel && n.sel.id) && n.sel.entity === entity ? n.sel.id : null;
      },
      isSel: function (entity, id) {
        return same(nav().sel, entity, id);
      },
      openTabs: function (entity) {
        return nav().tabs && nav().tabs[entity] || [];
      },
      activeTab: function (entity) {
        var a = nav().active || {};
        return a[entity] || 'list';
      },
      isListView: function (entity) {
        return api.activeTab(entity) === 'list';
      },
      activeId: function (entity) {
        var t = api.activeTab(entity);
        return t === 'list' ? null : t;
      },
      /* ---------------------------------------------------------------- *
       * Row binding — the one function every page's rows call             *
       * ---------------------------------------------------------------- */
      rowProps: function (entity, id) {
        return {
          isSel: same(nav().sel, entity, id),
          select: function () {
            api.select(entity, id);
          },
          openCard: function () {
            api.openCard(entity, id);
          },
          openTab: function () {
            api.openTab(entity, id);
          },
          ctx: function (e) {
            if (host.recordContext) host.recordContext(entity, id, e);
          }
        };
      },
      /* ---------------------------------------------------------------- *
       * Transitions                                                       *
       * ---------------------------------------------------------------- */
      // single-click: toggle the side drawer for this row
      select: function (entity, id) {
        if (same(nav().sel, entity, id)) {
          patch({
            sel: null
          });
          return;
        }
        patch({
          sel: {
            entity: entity,
            id: id
          }
        });
        if (host.onRecordSelect) host.onRecordSelect(entity, id);
      },
      closeDrawer: function () {
        patch({
          sel: null
        });
      },
      // force-select a row (no toggle) — used by context menus / cross-page jumps
      setSel: function (entity, id) {
        patch({
          sel: {
            entity: entity,
            id: id
          }
        });
      },
      // drawer button: open the centered card (delegated to host content)
      openCard: function (entity, id) {
        patch({
          sel: {
            entity: entity,
            id: id
          }
        });
        if (host.openRecordCard) host.openRecordCard(entity, id);
      },
      closeCard: function () {
        if (host.closeRecordCard) host.closeRecordCard();
      },
      // double-click: open the record in a new full-page tab
      openTab: function (entity, id) {
        var n = nav();
        var tabs = Object.assign({}, n.tabs);
        var list = (tabs[entity] || []).slice();
        if (list.indexOf(id) === -1) list.push(id);
        tabs[entity] = list;
        var active = Object.assign({}, n.active);
        active[entity] = id;
        patch({
          tabs: tabs,
          active: active,
          sel: null
        });
        if (host.closeRecordCard) host.closeRecordCard();
      },
      activateTab: function (entity, id) {
        var active = Object.assign({}, nav().active);
        active[entity] = id;
        patch({
          active: active
        });
      },
      backToList: function (entity) {
        var active = Object.assign({}, nav().active);
        active[entity] = 'list';
        patch({
          active: active
        });
      },
      closeTab: function (entity, id) {
        var n = nav();
        var list = (n.tabs[entity] || []).filter(function (x) {
          return x !== id;
        });
        var tabs = Object.assign({}, n.tabs);
        tabs[entity] = list;
        var active = Object.assign({}, n.active);
        if ((active[entity] || 'list') === id) {
          active[entity] = list.length ? list[list.length - 1] : 'list';
        }
        patch({
          tabs: tabs,
          active: active
        });
      },
      /* ---------------------------------------------------------------- *
       * Tab strip — render-ready descriptors for the page tab bar         *
       * ---------------------------------------------------------------- */
      tabBar: function (entity, listLabel) {
        var n = nav();
        var list = n.tabs && n.tabs[entity] || [];
        var active = n.active && n.active[entity] || 'list';
        function tabStyle(on) {
          return {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '30px',
            padding: '0 4px 0 12px',
            borderRadius: '8px 8px 0 0',
            border: '1px solid ' + (on ? 'var(--border)' : 'transparent'),
            borderBottom: on ? '1px solid var(--background)' : '1px solid transparent',
            marginBottom: '-1px',
            background: on ? 'var(--background)' : 'transparent',
            color: on ? 'var(--foreground)' : 'var(--muted-fg)',
            fontSize: '12.5px',
            fontWeight: on ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            fontFamily: 'inherit'
          };
        }
        var out = [{
          id: 'list',
          label: listLabel || 'List',
          closeable: false,
          active: active === 'list',
          style: tabStyle(active === 'list'),
          select: function () {
            api.backToList(entity);
          },
          close: function () {}
        }];
        list.forEach(function (id) {
          out.push({
            id: id,
            label: host.navTabLabel ? host.navTabLabel(entity, id) : String(id),
            closeable: true,
            active: active === id,
            style: tabStyle(active === id),
            select: function () {
              api.activateTab(entity, id);
            },
            close: function (e) {
              if (e && e.stopPropagation) e.stopPropagation();
              api.closeTab(entity, id);
            }
          });
        });
        return out;
      },
      /* ---------------------------------------------------------------- *
       * Escape / back — close the deepest open surface, return handled    *
       * ---------------------------------------------------------------- */
      handleEsc: function () {
        var n = nav();
        if (host.recordCardOpen && host.recordCardOpen()) {
          api.closeCard();
          return true;
        }
        var act = n.active || {};
        for (var ent in act) {
          if (act.hasOwnProperty(ent) && (act[ent] || 'list') !== 'list') {
            api.backToList(ent);
            return true;
          }
        }
        if (n.sel) {
          api.closeDrawer();
          return true;
        }
        return false;
      }
    };
    return api;
  }
  root.RecordNav = {
    createRecordNav: createRecordNav,
    NAV_INIT: NAV_INIT
  };
})(typeof window !== 'undefined' ? window : this);
})(); } catch (e) { __ds_ns.__errors.push({ path: "lib/record-nav.js", error: String((e && e.message) || e) }); }

// lib/shelfree-data.js
try { (() => {
// Shelfree ERP — seed / sample data.
// Kept out of the main .dc.html so routine edits to the app don't have to
// re-read ~240 lines of mock records. Pure data + tiny builders, no app logic.
//
// Business: Kanalora — manufactures/assembles Tiruvannamalai
// mountain-shaped ceramic sambrani (dhoop) holders (2-piece: ceramic lid +
// base tray, twist-lock assembly) from a ceramics vendor, bundles with dhoop
// cones, and sells to pooja/religious stores, souvenir shops, temple-adjacent
// stalls, and hotel/homestay gift counters around Tiruvannamalai — a market
// driven by Girivalam and full-moon (Pournami) pilgrim/tourist traffic.

function seedItems() {
  const I = (no, desc, category, uom, vendor, cost, price, lead, rp, rq, locs, so, supply, attrs) => ({
    no,
    desc,
    category,
    type: 'Inventory',
    uom,
    vendor,
    cost,
    price,
    lead,
    rp,
    rq,
    ss: Math.round(rp * 0.2),
    costing: 'FIFO',
    // Stock is keyed by Locations & warehouses id (seedWarehouses). The 4th seed
    // number is returns stock — returns are the RET area inside TVM-MAIN, not a location.
    locs: {
      'WH-TVM': locs[0] + (locs[3] || 0),
      'WH-ASSY': locs[1],
      'WH-CHN': locs[2]
    },
    qtySO: so,
    qtySupply: supply,
    attrs,
    blocked: false
  });
  return [
  // Finished goods — Sambrani Holder (Ceramic, 18cm, twist-lock 2-piece)
  I('ASH-PWH-18', 'Arunachala Mountain Sambrani Holder, Pearl White', 'Sambrani Holder', 'NOS', '', 145.00, 399.00, 12, 40, 80, [58, 20, 14, 1], 34, 40, {
    Glaze: 'Pearl White',
    Height: '18 cm',
    BaseDia: '13 cm',
    Material: 'Ceramic',
    VentHole: '6 mm'
  }), I('ASH-TER-18', 'Arunachala Mountain Sambrani Holder, Terracotta', 'Sambrani Holder', 'NOS', '', 138.00, 379.00, 12, 40, 80, [46, 16, 10, 0], 28, 40, {
    Glaze: 'Terracotta',
    Height: '18 cm',
    BaseDia: '13 cm',
    Material: 'Ceramic',
    VentHole: '6 mm'
  }), I('ASH-BLK-18', 'Arunachala Mountain Sambrani Holder, Charcoal Black', 'Sambrani Holder', 'NOS', '', 152.00, 419.00, 12, 30, 60, [22, 8, 6, 0], 24, 30, {
    Glaze: 'Charcoal Black',
    Height: '18 cm',
    BaseDia: '13 cm',
    Material: 'Ceramic',
    VentHole: '6 mm'
  }),
  // Finished goods — Combo (Holder + 12 dhoop cones)
  I('CMB-PWH-12', 'Mountain Holder + 12 Dhoop Cones Combo, Pearl White', 'Combo Pack', 'NOS', '', 168.00, 449.00, 12, 30, 60, [30, 14, 8, 0], 26, 30, {
    Glaze: 'Pearl White',
    Includes: '12 Sambrani Cones',
    Material: 'Ceramic + Dhoop'
  }), I('CMB-TER-12', 'Mountain Holder + 12 Dhoop Cones Combo, Terracotta', 'Combo Pack', 'NOS', '', 161.00, 429.00, 12, 30, 60, [24, 10, 6, 0], 22, 30, {
    Glaze: 'Terracotta',
    Includes: '12 Sambrani Cones',
    Material: 'Ceramic + Dhoop'
  }), I('CMB-BLK-12', 'Mountain Holder + 12 Dhoop Cones Combo, Charcoal Black', 'Combo Pack', 'NOS', '', 175.00, 469.00, 12, 20, 40, [12, 6, 4, 0], 16, 20, {
    Glaze: 'Charcoal Black',
    Includes: '12 Sambrani Cones',
    Material: 'Ceramic + Dhoop'
  }),
  // Consumables — Sambrani / dhoop cones
  I('SBC-CONE-12', 'Sambrani Dhoop Cones, Pack of 12', 'Sambrani Cones', 'BOX', 'Malaimayil Dhoop & Sambrani Works', 22.00, 69.00, 6, 150, 300, [220, 60, 40, 4], 120, 200, {
    Scent: 'Classic Sambrani',
    Count: '12'
  }), I('SBC-CONE-24', 'Sambrani Dhoop Cones, Pack of 24', 'Sambrani Cones', 'BOX', 'Malaimayil Dhoop & Sambrani Works', 38.00, 119.00, 6, 100, 200, [150, 40, 24, 2], 80, 150, {
    Scent: 'Classic Sambrani',
    Count: '24'
  }), I('SBC-CONE-50', 'Sambrani Dhoop Cones, Bulk Pack of 50 (Retailer)', 'Sambrani Cones', 'BOX', 'Malaimayil Dhoop & Sambrani Works', 68.00, 199.00, 6, 60, 120, [80, 20, 10, 0], 40, 90, {
    Scent: 'Classic Sambrani',
    Count: '50'
  }), I('SBC-CONE-SDL', 'Sandalwood Premium Dhoop Cones, Pack of 12', 'Sambrani Cones', 'BOX', 'Malaimayil Dhoop & Sambrani Works', 34.00, 99.00, 6, 80, 150, [90, 25, 14, 1], 55, 100, {
    Scent: 'Sandalwood Blend',
    Count: '12'
  }),
  // Accessories
  I('ASH-STAND-WD', 'Wooden Display Stand for Sambrani Holder', 'Accessory', 'NOS', 'Sri Annamalai Packaging Co.', 85.00, 249.00, 14, 20, 40, [16, 4, 2, 0], 12, 20, {
    Material: 'Sheesham Wood',
    Height: '6 cm'
  }), I('SBC-ASHTRAY', 'Replacement Ash Catcher Tray (Spare)', 'Accessory', 'NOS', 'Kailash Ceramics Works', 28.00, 89.00, 14, 25, 50, [20, 6, 4, 0], 10, 25, {
    Material: 'Ceramic',
    Fits: 'ASH-18 Series'
  }),
  // Raw materials / components — purchased unassembled, not sellable
  I('RM-LID-PWH', 'Ceramic Mountain Lid, Pearl White Glaze (component)', 'Ceramic Component', 'NOS', 'Kailash Ceramics Works', 62.00, 0, 21, 100, 200, [180, 90, 0, 2], 0, 160, {
    Glaze: 'Pearl White',
    Stage: 'Unassembled component'
  }), I('RM-LID-TER', 'Ceramic Mountain Lid, Terracotta Glaze (component)', 'Ceramic Component', 'NOS', 'Kailash Ceramics Works', 58.00, 0, 21, 80, 160, [140, 70, 0, 1], 0, 120, {
    Glaze: 'Terracotta',
    Stage: 'Unassembled component'
  }), I('RM-LID-BLK', 'Ceramic Mountain Lid, Charcoal Black Glaze (component)', 'Ceramic Component', 'NOS', 'Kailash Ceramics Works', 65.00, 0, 21, 60, 120, [70, 40, 0, 0], 0, 80, {
    Glaze: 'Charcoal Black',
    Stage: 'Unassembled component'
  }), I('RM-BASE-STD', 'Ceramic Base Tray w/ Ash Catcher (component)', 'Ceramic Component', 'NOS', 'Kailash Ceramics Works', 41.00, 0, 21, 220, 400, [360, 180, 0, 3], 0, 300, {
    Material: 'Ceramic',
    Stage: 'Unassembled component'
  }), I('RM-GASKET', 'Silicone Twist-Lock Gasket Ring (component)', 'Ceramic Component', 'NOS', 'Vellore Silicone Components', 3.20, 0, 10, 400, 800, [620, 240, 0, 0], 0, 500, {
    Material: 'Silicone'
  }), I('RM-CONE-BULK', 'Raw Sambrani Dhoop Coil, Bulk (kg)', 'Raw Material', 'KGS', 'Malaimayil Dhoop & Sambrani Works', 410.00, 0, 8, 30, 60, [42, 18, 0, 0], 0, 40, {
    Material: 'Sambrani resin blend'
  }),
  // Packaging
  I('PKG-BOX-STD', 'Kraft Gift Box, Arunachala Branded (Standard)', 'Packaging', 'NOS', 'Sri Annamalai Packaging Co.', 18.00, 0, 10, 300, 600, [480, 140, 0, 4], 0, 400, {
    Material: 'Kraft board',
    Fits: 'ASH-18 Series'
  }), I('PKG-BOX-PREM', 'Rigid Gift Box, Arunachala Branded (Combo/Premium)', 'Packaging', 'NOS', 'Sri Annamalai Packaging Co.', 34.00, 0, 10, 150, 300, [220, 70, 0, 2], 0, 200, {
    Material: 'Rigid board',
    Fits: 'CMB Series'
  }), I('PKG-FOAM-INS', 'Foam Insert Wrap (ceramic protection)', 'Packaging', 'BOX', 'Sri Annamalai Packaging Co.', 4.50, 0, 10, 200, 400, [150, 50, 0, 1], 0, 300, {
    Pack: '50 / box'
  }), I('PKG-CARE-CARD', 'Care & Usage Instruction Card', 'Packaging', 'BOX', 'Sri Annamalai Packaging Co.', 1.20, 0, 10, 400, 800, [520, 180, 0, 0], 0, 600, {
    Pack: '200 / box'
  })].map(it => ({
    ...it,
    sellable: ['ASH-PWH-18', 'ASH-TER-18', 'ASH-BLK-18', 'CMB-PWH-12', 'CMB-TER-12', 'CMB-BLK-12', 'SBC-CONE-12', 'SBC-CONE-24', 'SBC-CONE-50', 'SBC-CONE-SDL', 'ASH-STAND-WD', 'SBC-ASHTRAY'].includes(it.no)
  }))
  // Item-level tracking depth. These only surface when the matching workspace
  // scale axis (lotBatch / expiry / serial / barcodes) is switched on — see
  // docs/erp-app/README.md. Ceramics and cones move in fired/production lots;
  // dhoop resin and cones have shelf life; nothing here is serialised.
  .map((it, i) => ({
    ...it,
    tracksLot: ['Sambrani Holder', 'Combo Pack', 'Ceramic Component', 'Sambrani Cones', 'Raw Material'].includes(it.category),
    tracksExpiry: ['Sambrani Cones', 'Raw Material'].includes(it.category),
    tracksSerial: false,
    // GS1 India (890) retail barcodes on sellable SKUs only; components and
    // packaging are internal and carry none.
    barcode: it.sellable ? '890' + String(4210000000 + i * 137).padStart(10, '0') : ''
  }));
}

// Item category tree for Kanalora. Leaf names MUST match the `category` field on
// seedItems() — an item stores its most-specific (leaf) category name and the ERP
// derives the full path from this tree. reconcile() is the wiring: any category
// that exists on an item but not in the tree is appended as a root node, so the
// Settings → Item categories screen can never drift from the catalogue.
function seedItemCategories() {
  const C = (id, code, name, parent, color, desc) => ({
    id,
    code,
    name,
    parent,
    color,
    desc,
    active: true
  });
  const tree = [C('grp-fg', 'FG', 'Finished Goods', '', '#c98a1a', 'Assembled, saleable Arunachala sambrani holders and bundles.'), C('cat-holder', 'SBH', 'Sambrani Holder', 'grp-fg', '#c98a1a', 'Two-piece ceramic mountain holder — lid + ash-catcher base, twist-lock.'), C('cat-combo', 'CMB', 'Combo Pack', 'grp-fg', '#e0a83a', 'Holder bundled with a dhoop cone pack in retail gift packaging.'), C('grp-cons', 'CONS', 'Consumables', '', '#0f9d6e', 'Repeat-purchase burn goods sold alongside the holders.'), C('cat-cones', 'SBC', 'Sambrani Cones', 'grp-cons', '#0f9d6e', 'Sambrani and sandalwood dhoop cones in retail and bulk packs.'), C('cat-accessory', 'ACC', 'Accessory', '', '#0ea5e9', 'Display stands and spare trays sold as add-ons.'), C('grp-comp', 'COMP', 'Components', '', '#4f46e5', 'Purchased parts consumed by in-house assembly — not sold as-is.'), C('cat-ceramic', 'CRM', 'Ceramic Component', 'grp-comp', '#4f46e5', 'Molded and fired lids, base trays and gasket rings from the ceramics vendor.'), C('cat-raw', 'RAW', 'Raw Material', 'grp-comp', '#8b5cf6', 'Bulk sambrani resin blend and other inputs held by weight.'), C('cat-packaging', 'PKG', 'Packaging', '', '#b45309', 'Cartons, gift boxes, foam inserts and printed inserts.')];
  return reconcileItemCategories(tree, seedItems());
}

// Append any item category missing from the tree, so settings always covers the
// live catalogue. Exported so the app can re-run it whenever items change.
function reconcileItemCategories(cats, items) {
  const palette = ['#c98a1a', '#4f46e5', '#0f9d6e', '#e11d63', '#0ea5e9', '#8b5cf6', '#64748b'];
  const out = [...(cats || [])];
  const has = name => out.some(c => (c.name || '').toLowerCase() === String(name).toLowerCase());
  const codeFor = name => {
    let base = name.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 4) || 'CAT';
    let code = base,
      n = 2;
    while (out.some(c => (c.code || '').toUpperCase() === code)) code = (base.slice(0, 3) + n++).toUpperCase();
    return code;
  };
  [...new Set((items || []).map(i => i && i.category).filter(Boolean))].forEach(name => {
    if (has(name)) return;
    out.push({
      id: 'cat-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      code: codeFor(name),
      name,
      parent: '',
      color: palette[out.length % palette.length],
      desc: '',
      active: true
    });
  });
  return out;
}
function seedOrders() {
  const O = (no, customer, orderDate, shipDate, location, status, lines) => ({
    no,
    customer,
    orderDate,
    shipDate,
    location,
    status,
    lines
  });
  return [
  // Clustered around the Pournami (full-moon) rush of 2026-07-29 and the run-up to it.
  O('SO00014', 'Sri Annamalaiyar Pooja Stores', '2026-07-30', '2026-07-31', 'TVM-MAIN', 'Shipped', [['ASH-PWH-18', 24], ['SBC-CONE-12', 40]]), O('SO00013', 'Girivalam Path Handicrafts', '2026-07-29', '2026-07-30', 'TVM-MAIN', 'Open', [['CMB-PWH-12', 30]]), O('SO00012', 'Arunachala Souvenirs & Gifts', '2026-07-29', '2026-08-02', 'CHN-DC', 'Released', [['ASH-TER-18', 18], ['ASH-STAND-WD', 10]]), O('SO00011', 'Ramana Ashram Gift Corner', '2026-07-29', '2026-08-03', 'TVM-MAIN', 'Open', [['CMB-TER-12', 20]]), O('SO00010', 'Full Moon Bazaar', '2026-07-28', '2026-07-29', 'TVM-MAIN', 'Invoiced', [['SBC-CONE-50', 30], ['SBC-CONE-SDL', 20]]), O('SO00009', 'Kailash Pooja Samagri', '2026-07-28', '2026-08-04', 'TVM-MAIN', 'Open', [['ASH-BLK-18', 15]]), O('SO00008', 'Thiruvannamalai Temple Bazaar', '2026-07-27', '2026-07-29', 'CHN-DC', 'Open', [['ASH-PWH-18', 12], ['SBC-CONE-24', 24]]), O('SO00007', 'Hotel Trisul Gift Counter', '2026-07-25', '2026-08-05', 'TVM-MAIN', 'Released', [['CMB-PWH-12', 12], ['CMB-BLK-12', 8], ['SBC-CONE-12', 20]]), O('SO00006', 'Sparsa Resort Boutique', '2026-07-24', '2026-08-06', 'TVM-MAIN', 'Open', [['ASH-PWH-18', 10], ['ASH-STAND-WD', 6]]), O('SO00005', 'Adi Annamalai Handicrafts', '2026-07-22', '2026-07-30', 'CHN-DC', 'Shipped', [['SBC-CONE-50', 40], ['SBC-ASHTRAY', 15]]), O('SO00004', 'Vinayaka Pooja Store', '2026-07-20', '2026-07-28', 'TVM-MAIN', 'Open', [['ASH-TER-18', 16], ['ASH-BLK-18', 10]]), O('SO00003', 'Nithya Pooja Needs', '2026-07-18', '2026-07-28', 'TVM-MAIN', 'Released', [['CMB-TER-12', 14], ['SBC-CONE-12', 30], ['SBC-CONE-SDL', 12]]), O('SO00002', 'Annamalai Craft Emporium', '2026-06-30', '2026-07-02', 'TVM-MAIN', 'Shipped', [['ASH-PWH-18', 20], ['CMB-PWH-12', 10]]), O('SO00001', 'Hilltop Homestay Gift Shop', '2026-06-29', '2026-07-01', 'CHN-DC', 'Invoiced', [['ASH-STAND-WD', 8], ['SBC-CONE-24', 16]])];
}
function seedInvoices() {
  return [{
    no: 'INV00010',
    customer: 'Sri Annamalaiyar Pooja Stores',
    invDate: '2026-07-30',
    dueDate: '2026-08-14',
    amount: 13176.00,
    status: 'Draft'
  }, {
    no: 'INV00009',
    customer: 'Full Moon Bazaar',
    invDate: '2026-07-28',
    dueDate: '2026-08-12',
    amount: 7955.00,
    status: 'Open'
  }, {
    no: 'INV00008',
    customer: 'Girivalam Path Handicrafts',
    invDate: '2026-07-29',
    dueDate: '2026-08-13',
    amount: 13470.00,
    status: 'Open'
  }, {
    no: 'INV00007',
    customer: 'Hotel Trisul Gift Counter',
    invDate: '2026-07-25',
    dueDate: '2026-08-09',
    amount: 8368.00,
    status: 'Open'
  }, {
    no: 'INV00006',
    customer: 'Kailash Pooja Samagri',
    invDate: '2026-07-28',
    dueDate: '2026-08-04',
    amount: 6285.00,
    status: 'Overdue'
  }, {
    no: 'INV00005',
    customer: 'Adi Annamalai Handicrafts',
    invDate: '2026-07-22',
    dueDate: '2026-08-06',
    amount: 9535.00,
    status: 'Paid'
  }, {
    no: 'INV00004',
    customer: 'Annamalai Craft Emporium',
    invDate: '2026-06-30',
    dueDate: '2026-07-14',
    amount: 9180.00,
    status: 'Paid'
  }, {
    no: 'INV00003',
    customer: 'Nithya Pooja Needs',
    invDate: '2026-07-18',
    dueDate: '2026-07-25',
    amount: 6558.00,
    status: 'Overdue'
  }, {
    no: 'INV00002',
    customer: 'Vinayaka Pooja Store',
    invDate: '2026-07-20',
    dueDate: '2026-08-03',
    amount: 7134.00,
    status: 'Paid'
  }, {
    no: 'INV00001',
    customer: 'Hilltop Homestay Gift Shop',
    invDate: '2026-06-29',
    dueDate: '2026-07-13',
    amount: 3696.00,
    status: 'Paid'
  }];
}

// Purchasing · purchase orders (goods-in). A PO references a Vendor (V000xx),
// carries dated header + a receiving location code, a responsible buyer
// (Purchasing Employee id, nullable), and line items. Line desc/uom/unitCost are
// resolved from the current Item record at seed time so nothing is hardcoded;
// subtotal/total are DERIVED in the app (poSubtotal), never stored.
// status ∈ Draft | Issued | Partially received | Received | Closed | Cancelled
function seedPurchaseOrders() {
  const itemIx = {};
  seedItems().forEach(it => {
    itemIx[it.no] = it;
  });
  const mkLines = pairs => pairs.map(([no, qty]) => {
    const it = itemIx[no] || {};
    return {
      item: no,
      desc: it.desc || no,
      qty,
      uom: it.uom || 'NOS',
      unitCost: it.cost || 0
    };
  });
  const PO = (no, vendor, orderDate, expectedDate, location, status, buyer, lines, notes) => ({
    no,
    vendor,
    orderDate,
    expectedDate,
    location,
    status,
    buyer,
    notes: notes || '',
    lines: mkLines(lines)
  });
  return [PO('PO00001', 'V00001', '2026-07-12', '2026-08-02', 'TVM-MAIN', 'Issued', 'EMP00007', [['RM-LID-PWH', 200], ['RM-LID-TER', 150], ['RM-BASE-STD', 400]], 'Kiln batch for Pournami restock.'), PO('PO00002', 'V00001', '2026-07-11', '2026-07-29', 'TVM-MAIN', 'Partially received', 'EMP00020', [['RM-LID-BLK', 120], ['RM-GASKET', 500]], 'Split delivery agreed with vendor.'), PO('PO00003', 'V00002', '2026-07-10', '2026-08-01', 'TVM-MAIN', 'Issued', 'EMP00020', [['RM-CONE-BULK', 25], ['SBC-CONE-12', 200], ['SBC-CONE-SDL', 100]], ''), PO('PO00004', 'V00003', '2026-07-08', '2026-07-18', 'TVM-MAIN', 'Received', 'EMP00021', [['PKG-BOX-STD', 600], ['PKG-BOX-PREM', 300]], 'Received in full.'), PO('PO00005', 'V00003', '2026-07-07', '2026-07-14', 'CHN-DC', 'Received', 'EMP00007', [['PKG-FOAM-INS', 400], ['PKG-CARE-CARD', 800]], ''), PO('PO00006', 'V00001', '2026-07-14', '2026-07-27', 'CHN-DC', 'Draft', 'EMP00007', [['RM-BASE-STD', 300], ['RM-GASKET', 600]], 'Awaiting quote confirmation before issue.'), PO('PO00007', 'V00002', '2026-06-28', '2026-07-08', 'TVM-MAIN', 'Closed', 'EMP00020', [['SBC-CONE-24', 150]], 'Closed — fully invoiced and paid.'), PO('PO00008', 'V00004', '2026-07-13', '2026-07-24', 'TVM-MAIN', 'Draft', null, [['RM-GASKET', 500]], 'Buyer not yet assigned.'), PO('PO00009', 'V00001', '2026-07-05', '2026-06-30', 'TVM-MAIN', 'Issued', 'EMP00021', [['RM-LID-PWH', 100]], 'Expedite — expected date already passed.'), PO('PO00010', 'V00003', '2026-07-15', '2026-07-25', 'CHN-DC', 'Cancelled', 'EMP00007', [['PKG-CARE-CARD', 400]], 'Cancelled — duplicate of PO00005.')];
}

// Purchasing · purchase receipts (GRN — goods-in against a purchase order).
// A receipt records what physically arrived: qtyReceived lands in stock at the
// receipt's location, qtyRejected is logged but never enters stock (it goes back
// to the vendor and becomes a debit note in the purchase-finance stage).
// Line desc/uom/unitCost mirror the PO line they receive against.
// status ∈ Draft | Posted | Cancelled. Posted receipts are immutable history —
// the seeded ones below are what put the PO statuses in seedPurchaseOrders()
// where they are, and their quantities are already reflected in seedItems() locs.
function seedPurchaseReceipts() {
  const itemIx = {};
  seedItems().forEach(it => {
    itemIx[it.no] = it;
  });
  const mkLines = rows => rows.map(([no, ordered, received, rejected, reason]) => {
    const it = itemIx[no] || {};
    return {
      item: no,
      desc: it.desc || no,
      uom: it.uom || 'NOS',
      qtyOrdered: ordered,
      qtyReceived: received,
      qtyRejected: rejected || 0,
      rejectReason: reason || '',
      unitCost: it.cost || 0
    };
  });
  const R = (no, po, vendor, receiptDate, location, status, receivedBy, vendorDocNo, rows, notes) => ({
    no,
    po,
    vendor,
    receiptDate,
    location,
    status,
    receivedBy,
    vendorDocNo,
    notes: notes || '',
    postedAt: status === 'Posted' ? receiptDate + 'T10:30:00.000Z' : null,
    lines: mkLines(rows)
  });
  return [R('GRN00005', 'PO00001', 'V00001', '2026-09-18', 'TVM-MAIN', 'Draft', 'EMP00007', '', [['RM-LID-PWH', 200, 120, 0, ''], ['RM-LID-TER', 150, 0, 0, ''], ['RM-BASE-STD', 400, 0, 0, '']], 'Part load unloaded at the gate — counting the pearl-white lids before posting.'), R('GRN00004', 'PO00002', 'V00001', '2026-07-22', 'TVM-MAIN', 'Posted', 'EMP00020', 'KCW-1187', [['RM-LID-BLK', 120, 74, 6, 'Kiln cracks at the peak vent'], ['RM-GASKET', 500, 500, 0, '']], 'First half of the split delivery. Six black lids cracked in firing — returned with the driver.'), R('GRN00003', 'PO00007', 'V00002', '2026-07-06', 'TVM-MAIN', 'Posted', 'EMP00020', 'MDS-2291', [['SBC-CONE-24', 150, 150, 0, '']], 'Full delivery ahead of the Pournami restock.'), R('GRN00002', 'PO00005', 'V00003', '2026-07-13', 'CHN-DC', 'Posted', 'EMP00007', 'SAP-0774', [['PKG-FOAM-INS', 400, 400, 0, ''], ['PKG-CARE-CARD', 800, 800, 0, '']], ''), R('GRN00001', 'PO00004', 'V00003', '2026-07-17', 'TVM-MAIN', 'Posted', 'EMP00021', 'SAP-0761', [['PKG-BOX-STD', 600, 600, 0, ''], ['PKG-BOX-PREM', 300, 300, 0, '']], 'Received in full, counted against the challan.')];
}

// Finance · chart of accounts — MINIMAL, purchase-side only (freight step 1).
// Per CLAUDE.md the CoA grows stage by stage: production/WIP accounts land with
// production finance, revenue/AR with sales finance. Never seed speculatively.
// system:true = Shelfree posts to it automatically → code/type/group locked,
// can't be deactivated or deleted. directPosting:false = control account, only
// documents (receipts, bills) may post, never a manual G/L line.
// Code ranges: 1xxx Asset · 2xxx Liability · 3xxx Equity · 4xxx Income · 5xxx/6xxx Expense.
function seedAccounts() {
  const A = (no, name, type, group, desc, directPosting) => ({
    no,
    name,
    type,
    group,
    desc,
    system: true,
    active: true,
    directPosting: !!directPosting,
    createdAt: '2026-09-22T09:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z'
  });
  return [A('1300', 'Inventory', 'Asset', 'Current assets', 'Stock on hand at landed cost — ceramic lids and bases, dhoop cones, packaging. Receipts debit it; freight allocated to received lines lands here too.'), A('1410', 'GST input — CGST', 'Asset', 'Current assets', 'Central GST paid on intra-state purchases (Tamil Nadu vendors), claimable as input tax credit.'), A('1411', 'GST input — SGST', 'Asset', 'Current assets', 'State GST paid on intra-state purchases, claimable as input tax credit.'), A('1412', 'GST input — IGST', 'Asset', 'Current assets', 'Integrated GST paid on inter-state purchases, claimable as input tax credit.'), A('2100', 'Accounts payable — vendors', 'Liability', 'Current liabilities', 'What Kanalora owes vendors and carriers on posted bills.'), A('2110', 'Freight inward clearing', 'Liability', 'Current liabilities', 'Expected freight accrued when goods are received, cleared when the vendor or carrier bill arrives.'), A('2320', 'GST payable — reverse charge', 'Liability', 'Current liabilities', 'GST Kanalora pays itself on transporter (GTA) freight under reverse charge.'), A('5110', 'Freight inward', 'Expense', 'Direct expenses', 'Freight on inbound goods. Allocated into inventory when landed cost is on; the residual is freight variance.', true), A('6190', 'Round off', 'Expense', 'Indirect expenses', 'Paise added or dropped when a bill or invoice total is rounded to the nearest rupee (Tax settings).'), A('5115', 'Other purchase charges', 'Expense', 'Direct expenses', 'Packing, transit insurance and loading/unloading on inbound goods.', true)];
}

// Purchasing · Charges — non-stock charges that sit on document lines as Type = Charge
// (freight step 1). Each posts to a CoA account; allocate:true spreads the amount onto
// item lines as landed cost. gst 'Goods rate' = composite supply, taxed like the goods.
// FRT-IN is system: policy-generated freight lines use it. Sales-side FRT-OUT lands
// with Sales finance (step 6) together with its Freight recovered income account.
function seedCharges() {
  const C = (no, name, purchaseAcct, gst, sac, allocate, system, desc) => ({
    no,
    name,
    direction: 'Purchase',
    purchaseAcct,
    salesAcct: '',
    gst,
    sac,
    allocate,
    system,
    active: true,
    desc,
    createdAt: '2026-09-22T09:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z'
  });
  return [C('FRT-IN', 'Freight inward', '5110', 'Goods rate', '996511', true, true, 'Freight on inbound goods — kiln-fired lids and bases from the ceramics vendor, cone and packaging lots. Freight lines generated from a vendor\'s freight policy use this charge.'), C('INS', 'Transit insurance', '5115', '18%', '997136', true, false, 'Insurance on high-value kiln loads between the ceramics vendor and our Tiruvannamalai unit.'), C('LOAD', 'Loading & unloading', '5115', '18%', '996719', false, false, 'Hamali labour to unload at our unit — booked straight to expense, not spread onto stock.'), C('PKG', 'Packing & forwarding', '5115', 'Goods rate', '998540', true, false, 'Crating and bubble-wrap the ceramics vendor adds for fragile lids and bases.')];
}

// Purchasing · Carriers — who physically moves goods (freight step 1, task 3).
// type = carrier-type code (COURIER | GTA | OWN built-ins; more in Settings › Carrier types). rcm = GST on the freight is paid by
// us under reverse charge (GTA default); off = carrier charges GST (forward charge).
// trackUrl holds a {tracking} placeholder that the AWB / LR no. is dropped into.
// The raw contact/phone here only seed People › Contacts; seedCarriers() swaps them for contactId.
function carriersRaw() {
  const K = (no, name, type, gstin, rcm, trackUrl, service, contact, phone, desc, active) => ({
    no,
    name,
    type,
    gstin,
    rcm,
    trackUrl,
    service,
    contact,
    phone,
    desc,
    active: active !== false,
    createdAt: '2026-09-24T09:00:00.000Z',
    updatedAt: '2026-09-24T09:00:00.000Z'
  });
  return [K('STC', 'ST Courier', 'COURIER', '33AAECS4721K1Z8', false, 'https://www.stcourier.com/track/shipment?awb={tracking}', 'Standard surface', 'Karthik R.', '9443152876', 'Tiruvannamalai branch on Car Street. Default for cone packs and small packaging lots from Chennai.'), K('PCL', 'Professional Couriers', 'COURIER', '33AABFP6603M1Z2', false, 'https://www.tpcindia.com/track.aspx?id={tracking}', 'Express', 'Divya S.', '9884027315', 'Next-day to Chennai and Vellore. Used when a Pournami rush needs sample stock fast.'), K('DTDC', 'DTDC Express', 'COURIER', '33AAACD8217Q1ZK', false, 'https://www.dtdc.in/tracking.asp?cnno={tracking}', 'Lite', 'Front desk', '04175224410', 'Backup courier — wider reach for out-of-state packaging vendors.'), K('ART', 'Arunachala Road Transport', 'GTA', '33AKTPM3390D1Z4', true, '', 'Part load', 'Murugan P.', '9786341129', 'Local lorry, Tiruvannamalai–Chennai lane. Carries kiln-fired lids and bases from the ceramics vendor in crates. GTA under reverse charge — we pay the GST on its freight bills.'), K('SRL', 'Sri Ramana Logistics', 'GTA', '33ABHFS5518N1ZQ', false, 'https://sriramanalogistics.in/lr/{tracking}', 'Full truck load', 'Senthil V.', '9025518843', 'GTA that opted for forward charge — its bills carry GST. Used for Karthigai Deepam season bulk loads.'), K('OWN', 'Kanalora van', 'OWN', '', false, '', 'Local pickup', '', '', 'Our Tata Ace for pickups within ~40 km — ceramics vendor and local packaging supplier.')];
}

// Locations & warehouses — the ONE location registry (spec §2.7). Every screen that
// needs a location (GST registrations, item stock, receipts, assembly, filters)
// reads this list via the app's siteDefs(). state = GST state code; pobStatus =
// principal | additional | undeclared (on the GST certificate, REG-14 on the portal);
// managerEmpId → seedEmployees (internal staff, not People › Contacts);
// operatorVendorId → the 3PL's vendor record (their GSTIN, contacts, storage bills).
// Mirrored by baseWarehouses() in designs/erp/SFLocationsWarehouses.dc.html — keep in step.
function seedWarehouses() {
  return [{
    id: 'WH-TVM',
    name: 'Tiruvannamalai — Main',
    code: 'TVM-MAIN',
    type: 'mixed',
    addr: '12 Kanakaraya Mudali Street',
    city: 'Tiruvannamalai',
    state: '33',
    zip: '606601',
    country: 'IN',
    area: 6200,
    status: 'active',
    pobStatus: 'principal',
    managerEmpId: 'EMP00003',
    operatorVendorId: ''
  }, {
    id: 'WH-ASSY',
    name: 'Assembly unit',
    code: 'TVM-ASSY',
    type: 'mixed',
    addr: 'Plot 7, Vengikkal Industrial Estate',
    city: 'Tiruvannamalai',
    state: '33',
    zip: '606604',
    country: 'IN',
    area: 1800,
    status: 'active',
    pobStatus: 'additional',
    managerEmpId: 'EMP00002',
    operatorVendorId: ''
  }, {
    id: 'WH-CHN',
    name: 'Chennai DC',
    code: 'CHN-DC',
    type: '3pl',
    addr: 'Unit 4, Ambattur Industrial Estate',
    city: 'Chennai',
    state: '33',
    zip: '600058',
    country: 'IN',
    area: 2400,
    status: 'setup',
    pobStatus: 'undeclared',
    managerEmpId: 'EMP00013',
    operatorVendorId: 'V00006'
  }];
}
function seedProducts() {
  const P = (sku, name, axis, children, msrp, channels, tags, blurb) => ({
    sku,
    name,
    axis,
    children,
    msrp,
    channels,
    tags,
    blurb
  });
  return [P('PRD-MOUNTAIN', 'Arunachala Mountain Sambrani Holder', 'Glaze Finish', ['ASH-PWH-18', 'ASH-TER-18', 'ASH-BLK-18'], 399, ['Retail', 'Temple Stalls', 'Souvenir Shops'], ['Sambrani holders', 'Best seller'], 'Ceramic two-piece holder shaped after Arunachala hill; twist-lock lid vents dhoop smoke through a hidden peak vent.'), P('PRD-COMBO', 'Mountain Holder + Cones Combo', 'Glaze Finish', ['CMB-PWH-12', 'CMB-TER-12', 'CMB-BLK-12'], 449, ['Retail', 'Souvenir Shops', 'Hotel Gift Counters'], ['Combo', 'Gifting'], 'Ready-to-gift bundle: mountain holder plus a starter pack of 12 dhoop cones in matching packaging.'), P('PRD-CONES', 'Arunachala Sambrani Dhoop Cones', 'Pack Size', ['SBC-CONE-12', 'SBC-CONE-24', 'SBC-CONE-50'], 69, ['Retail', 'Wholesale', 'Temple Stalls'], ['Consumable', 'Repeat purchase'], 'Classic sambrani dhoop cones sized for the mountain holder; the bulk 50-pack serves retailer counters.'), P('PRD-PREMCONE', 'Sandalwood Premium Dhoop Cones', 'Scent', ['SBC-CONE-SDL'], 99, ['Retail', 'Souvenir Shops'], ['Premium'], 'Sandalwood-blended dhoop cones for a slower, richer burn — positioned as a premium upsell.'), P('PRD-STAND', 'Wooden Display Stand', 'Accessory', ['ASH-STAND-WD'], 249, ['Retail', 'Souvenir Shops'], ['Accessory'], 'Sheesham wood base that lifts the holder for shelf and counter display.'), P('PRD-SPARE', 'Replacement Ash Catcher Tray', 'Spare Part', ['SBC-ASHTRAY'], 89, ['Retail'], ['Spare part'], 'Standalone ceramic ash tray sold as a spare for the ASH-18 holder series.')];
}
function vendorsRaw() {
  // Flat record — address fields are top-level so editing patches are trivial.
  // hist = buy-from history counts. purchasePerson = id of the responsible Purchasing employee (see seedEmployees).
  const V = (no, name, name2, category, contact, email, phone, addr, city, state, zip, country, respCenter, locationCode, blocked, paymentMethod, paymentTerms, balance, balanceDue, budgeted, overdue, outstandingOrders, vendorSince, hist, subInfo, purchasePerson) => ({
    no,
    name,
    name2,
    category,
    contact,
    email,
    phone,
    addr1: addr[0],
    addr2: addr[1] || '',
    city,
    state,
    zip,
    country,
    respCenter,
    locationCode,
    blocked,
    paymentMethod,
    paymentTerms,
    currency: 'INR',
    balance,
    balanceDue,
    budgetedAmount: budgeted,
    overdue,
    outstandingOrders,
    vendorSince,
    hist: {
      quotes: hist[0],
      orders: hist[1],
      invoices: hist[2],
      returnOrders: hist[3],
      creditMemos: hist[4],
      pstdReceipts: hist[5],
      pstdInvoices: hist[6]
    },
    subInfo: subInfo || {
      sub: false
    },
    purchasePerson
  });
  const rows = [V('V00001', 'Kailash Ceramics Works', 'KAILASHCER', 'Ceramic Manufacturing', 'Murugesan Pillai', 'orders@kailashceramics.example', '+91 94421 10287', ['14 Kiln Street, Sathuvachari'], 'Vellore', 'Tamil Nadu', '632009', 'India', 'TVM-MAIN', 'TVM-MAIN', '', 'EFT', 'NET 30', 68400.00, 21200.00, 250000, 0, 48600, '2022-11-08', [3, 6, 5, 0, 1, 44, 40], {
    sub: true,
    ops: ['Ceramic Molding', 'Glazing & Kiln Firing'],
    wc: 'CER-01',
    cost: 58.00,
    lead: 21,
    cert: ''
  }, 'EMP00007'), V('V00002', 'Malaimayil Dhoop & Sambrani Works', 'MALAIMAYIL', 'Sambrani / Dhoop Cones', 'Chitra Selvaraj', 'sales@malaimayildhoop.example', '+91 98430 55162', ['27 Agraharam Street'], 'Coimbatore', 'Tamil Nadu', '641001', 'India', 'TVM-MAIN', 'TVM-MAIN', '', 'EFT', 'NET 15', 24680.00, 9450.00, 90000, 0, 21300, '2023-02-19', [2, 5, 4, 0, 0, 38, 35], {
    sub: false
  }, 'EMP00020'), V('V00003', 'Sri Annamalai Packaging Co.', 'ANNAMPKG', 'Packaging', 'Vetrivel Raja', 'orders@sriannamalaipkg.example', '+91 97862 40315', ['3 Kanakaraya Mudali Street'], 'Tiruvannamalai', 'Tamil Nadu', '606601', 'India', 'TVM-MAIN', 'TVM-MAIN', '', 'UPI', '2/10 NET 30', 9420.00, 3120.00, 40000, 0, 7600, '2023-06-02', [1, 4, 3, 0, 0, 31, 29], {
    sub: false
  }, 'EMP00007'), V('V00004', 'Vellore Silicone Components', 'VELSIL', 'Component', 'Ashwin Kumaravel', 'sales@vellorosilicone.example', '+91 90031 87754', ['61 Industrial Estate Road'], 'Vellore', 'Tamil Nadu', '632010', 'India', 'TVM-MAIN', 'TVM-MAIN', '', 'EFT', 'NET 30', 2140.00, 0, 15000, 0, 1800, '2024-01-14', [0, 2, 1, 0, 0, 14, 13], {
    sub: false
  }, 'EMP00021'), V('V00005', 'TN Express Cargo & Logistics', 'TNXCARGO', 'Logistics', 'Balamurugan S.', 'dispatch@tnexpresscargo.example', '+91 89257 60021', ['Transport Nagar, Polur Road'], 'Tiruvannamalai', 'Tamil Nadu', '606601', 'India', 'TVM-MAIN', 'TVM-MAIN', '', 'UPI', 'NET 15', 5620.00, 1840.00, 30000, 0, 4100, '2023-04-25', [0, 0, 8, 0, 1, 0, 62], {
    sub: false
  }, 'EMP00021'), V('V00006', 'Ambattur Logistics Park Pvt Ltd', 'AMBLOGI', '3PL warehousing', 'Ramesh Kannan', 'accounts@ambatturlogistics.example', '+91 44 2625 8810', ['Unit 4, Ambattur Industrial Estate'], 'Chennai', 'Tamil Nadu', '600058', 'India', 'CHN-DC', 'CHN-DC', '', 'EFT', 'NET 30', 0, 0, 216000, 0, 0, '2026-09-01', [0, 0, 0, 0, 0, 0, 0], {
    sub: false
  }, 'EMP00021')];
  // Vendor profile page (docs/vendor-page/README.md): GSTIN (all Tamil Nadu, state
  // code 33) and a contacts list whose primary entry mirrors the flat contact fields.
  const gst = (v, i) => '33AAFC' + String(v.name2 || 'X')[0] + String(5100 + i * 37) + 'M1Z' + i % 10;
  const extraContacts = {
    'V00001': [{
      name: 'Selvi Murugesan',
      role: 'Accounts',
      phone: '+91 94421 10290',
      email: 'accounts@kailashceramics.example'
    }, {
      name: 'Raghu Anand',
      role: 'Kiln dispatch',
      phone: '+91 94421 10311',
      email: 'dispatch@kailashceramics.example'
    }],
    'V00002': [{
      name: 'Prakash Selvaraj',
      role: 'Dispatch',
      phone: '+91 98430 55170',
      email: 'dispatch@malaimayildhoop.example'
    }],
    'V00006': [{
      name: 'Priya Venkatesh',
      role: 'Site operations',
      phone: '+91 44 2625 8822',
      email: 'ops@ambatturlogistics.example'
    }],
    'V00005': [{
      name: 'Booking desk',
      role: 'Bookings',
      phone: '+91 89257 60000',
      email: 'bookings@tnexpresscargo.example'
    }]
  };
  // supplies: goods (POs) | services (bills only, no PO) | both — spec §2.7 decision 8.
  const supplies = {
    'V00005': 'services',
    'V00006': 'services'
  };
  // GST registration (spec 2026-09-28-vendor-gst-registration): why a vendor does or doesn't charge GST.
  // regular | composition | unregistered | sez | overseas. Unregistered/overseas carry no GSTIN.
  const gstReg = {
    'V00003': 'composition',
    'V00004': 'unregistered'
  };
  return rows.map((v, i) => ({
    ...v,
    supplies: supplies[v.no] || 'goods',
    gstRegType: gstReg[v.no] || 'regular',
    gstin: gstReg[v.no] === 'unregistered' ? '' : v.no === 'V00006' ? '33AAKCA4417H1Z6' : gst(v, i),
    contacts: [{
      id: v.no + '-C1',
      name: v.contact,
      role: 'Owner',
      phone: v.phone,
      email: v.email,
      isPrimary: true
    }].concat((extraContacts[v.no] || []).map((p, k) => ({
      id: v.no + '-C' + (k + 2),
      ...p,
      isPrimary: false
    })))
  }));
}
function customersRaw() {
  // salesRep = id of the responsible Sales employee (see seedEmployees).
  const C = (no, name, contact, phone, email, city, state, terms, balance, creditLimit, overdue, status, lastOrder, salesRep, openOrders) => ({
    no,
    name,
    contact,
    phone,
    email,
    city,
    state,
    terms,
    balance,
    creditLimit,
    overdue,
    status,
    lastOrder,
    salesRep,
    openOrders
  });
  const rows = [C('CUS00001', 'Sri Annamalaiyar Pooja Stores', 'Ganesan Murthy', '+91 94420 11562', 'orders@annamalaiyarpooja.example', 'Tiruvannamalai — Sannathi Street', 'Tamil Nadu', 'NET 15', 13176.00, 40000, 0, 'Active', '2026-07-30', 'EMP00016', 2), C('CUS00002', 'Girivalam Path Handicrafts', 'Kalaivani Ramesh', '+91 98430 27741', 'girivalamcrafts@example.com', 'Tiruvannamalai — Girivalam Road', 'Tamil Nadu', 'NET 15', 13470.00, 35000, 0, 'Active', '2026-07-29', 'EMP00017', 2), C('CUS00003', 'Arunachala Souvenirs & Gifts', 'Dhanasekar Iyer', '+91 90477 63510', 'contact@arunachalasouvenirs.example', 'Tiruvannamalai — Car Street', 'Tamil Nadu', 'NET 30', 5940.00, 30000, 0, 'Active', '2026-07-29', 'EMP00018', 1), C('CUS00004', 'Ramana Ashram Gift Corner', 'Meenakshi Sundaram', '+91 91765 40982', 'giftcorner@ramanaashramgifts.example', 'Tiruvannamalai — Chengam Road', 'Tamil Nadu', 'NET 15', 8990.00, 25000, 8990.00, 'On hold', '2026-07-29', 'EMP00019', 1), C('CUS00005', 'Hotel Trisul Gift Counter', 'Suresh Babu', '+91 96001 22874', 'frontoffice@hoteltrisul.example', 'Tiruvannamalai — Polur Road', 'Tamil Nadu', 'NET 30', 8368.00, 30000, 0, 'Active', '2026-07-25', 'EMP00016', 1), C('CUS00006', 'Sparsa Resort Boutique', 'Anitha Rajagopal', '+91 93450 71126', 'boutique@sparsaresort.example', 'Tiruvannamalai — Kanji Road', 'Tamil Nadu', 'NET 30', 4260.00, 20000, 0, 'Active', '2026-07-24', 'EMP00017', 1), C('CUS00007', 'Kailash Pooja Samagri', 'Palanivel Chettiar', '+91 99400 38215', 'orders@kailashsamagri.example', 'Tiruvannamalai — Kalyana Mahal Street', 'Tamil Nadu', 'NET 15', 6285.00, 20000, 6285.00, 'On hold', '2026-07-28', 'EMP00018', 1), C('CUS00008', 'Adi Annamalai Handicrafts', 'Revathi Ganapathy', '+91 90928 45671', 'sales@adiannamalaicrafts.example', 'Tiruvannamalai — Adi Annamalai Nagar', 'Tamil Nadu', 'NET 30', 9535.00, 25000, 0, 'Active', '2026-07-22', 'EMP00019', 1), C('CUS00009', 'Sri Ramana Ashram Book & Gift Stall', 'Bhaskaran Nair', '+91 89399 20147', 'stall@ramanaashram.example', 'Tiruvannamalai — Ramana Nagar', 'Tamil Nadu', 'NET 15', 0, 15000, 0, 'Active', '2026-07-16', 'EMP00016', 0), C('CUS00010', 'Thiruvannamalai Temple Bazaar', 'Karpagam Velu', '+91 97914 63382', 'bazaar@ttbazaar.example', 'Tiruvannamalai — Sannathi Street', 'Tamil Nadu', 'NET 15', 4680.00, 22000, 0, 'Active', '2026-07-27', 'EMP00018', 1), C('CUS00011', 'Vinayaka Pooja Store', 'Manikandan Raju', '+91 91503 82264', 'orders@vinayakapooja.example', 'Tiruvannamalai — Big Street', 'Tamil Nadu', 'NET 30', 7134.00, 20000, 0, 'Active', '2026-07-20', 'EMP00017', 1), C('CUS00012', 'Hilltop Homestay Gift Shop', 'Deepika Chandrasekar', '+91 90807 11239', 'giftshop@hilltophomestay.example', 'Tiruvannamalai — Girivalam Road', 'Tamil Nadu', 'NET 30', 3696.00, 15000, 0, 'Active', '2026-06-29', 'EMP00019', 0), C('CUS00013', 'Annamalai Craft Emporium', 'Sivaraman Pillai', '+91 89033 47128', 'orders@annamalaicraftemporium.example', 'Tiruvannamalai — Polur Road', 'Tamil Nadu', 'NET 30', 9180.00, 28000, 0, 'Active', '2026-06-30', 'EMP00016', 0), C('CUS00014', 'Nithya Pooja Needs', 'Latha Krishnamurthy', '+91 96296 51873', 'orders@nithyapoojaneeds.example', 'Tiruvannamalai — Chengam Road', 'Tamil Nadu', 'NET 15', 6558.00, 18000, 6558.00, 'On hold', '2026-07-18', 'EMP00018', 1), C('CUS00015', 'Full Moon Bazaar', 'Ezhilarasan Muthu', '+91 90478 26410', 'contact@fullmoonbazaar.example', 'Tiruvannamalai — Sannathi Street', 'Tamil Nadu', 'NET 15', 7955.00, 25000, 0, 'Active', '2026-07-28', 'EMP00017', 1), C('CUS00016', 'Sri Arunachaleswarar Gift House', 'Padma Venkataraman', '+91 98847 30592', 'giftshouse@arunachaleswarar.example', 'Tiruvannamalai — Car Street', 'Tamil Nadu', 'NET 30', 0, 16000, 0, 'Prospect', '', 'EMP00019', 0)];
  // createdAt      = when the account was opened. Drives the "new customers only"
  //                  eligibility mode for customer-specific pricing.
  // pricingEligible = hand-picked flag used by the "selected customers" mode.
  // See docs/sales-pricing/README.md.
  const meta = {
    'CUS00001': ['2023-02-14', true],
    'CUS00002': ['2023-05-09', true],
    'CUS00003': ['2023-08-21', false],
    'CUS00004': ['2023-11-02', false],
    'CUS00005': ['2024-01-18', true],
    'CUS00006': ['2024-03-07', false],
    'CUS00007': ['2024-06-25', false],
    'CUS00008': ['2024-09-12', false],
    'CUS00009': ['2024-12-03', false],
    'CUS00010': ['2025-02-19', true],
    'CUS00011': ['2025-05-28', false],
    'CUS00012': ['2025-08-14', false],
    'CUS00013': ['2025-11-06', false],
    'CUS00014': ['2026-01-22', false],
    'CUS00015': ['2026-06-10', true],
    'CUS00016': ['2026-08-01', false]
  };
  // GSTIN (Tamil Nadu state code 33) + credit-hold flag, used by the customer
  // profile page's Contact & billing and Credit & risk tabs.
  const gst = n => '33AABCS' + String(1000 + n) + 'K1Z' + n % 10;
  // Extra ship-to points and second contacts for the accounts that have them —
  // festival stalls and hotel counters genuinely ship to more than one address.
  const extraShipTo = {
    'CUS00001': [{
      label: 'Girivalam stall (Pournami)',
      address: 'Girivalam Road, near Yamalingam shrine, Tiruvannamalai'
    }],
    'CUS00005': [{
      label: 'Banquet block store',
      address: 'Hotel Trisul, Polur Road — service entrance, Tiruvannamalai'
    }],
    'CUS00008': [{
      label: 'Workshop',
      address: 'Adi Annamalai village road, Tiruvannamalai'
    }]
  };
  const extraContacts = {
    'CUS00001': [{
      name: 'Vasanthi Ganesan',
      role: 'Accounts',
      phone: '+91 94420 11599',
      email: 'accounts@annamalaiyarpooja.example'
    }],
    'CUS00005': [{
      name: 'Front office desk',
      role: 'Receiving',
      phone: '+91 96001 22800',
      email: 'stores@hoteltrisul.example'
    }]
  };
  const seedNotes = {
    'CUS00001': [{
      at: '2026-07-30',
      by: 'Kavitha Elumalai',
      text: 'Wants the Pournami order packed a day early — driver collects from the workshop.'
    }, {
      at: '2026-05-11',
      by: 'Suresh Kannan',
      text: 'Agreed prices reviewed for the year; Pearl White holder held at last year\u2019s rate.'
    }],
    'CUS00004': [{
      at: '2026-07-29',
      by: 'Kavitha Elumalai',
      text: 'On hold — invoice INV00006 overdue. Release once part payment lands.'
    }]
  };
  return rows.map((c, i) => {
    const m = meta[c.no] || ['2026-01-01', false];
    const shipTo = [{
      id: c.no + '-S1',
      label: 'Main store',
      address: c.city + ', ' + c.state,
      isDefault: true
    }].concat((extraShipTo[c.no] || []).map((s, k) => ({
      id: c.no + '-S' + (k + 2),
      label: s.label,
      address: s.address,
      isDefault: false
    })));
    const contacts = [{
      id: c.no + '-C1',
      name: c.contact,
      role: 'Owner',
      phone: c.phone,
      email: c.email,
      isPrimary: true
    }].concat((extraContacts[c.no] || []).map((p, k) => ({
      id: c.no + '-C' + (k + 2),
      name: p.name,
      role: p.role,
      phone: p.phone,
      email: p.email,
      isPrimary: false
    })));
    const notes = (seedNotes[c.no] || []).map((n, k) => ({
      id: c.no + '-N' + (k + 1),
      ...n
    }));
    return {
      ...c,
      createdAt: m[0],
      pricingEligible: m[1],
      gstin: gst(i + 1),
      creditHold: c.status === 'On hold',
      riskNote: c.overdue > 0 ? 'Carrying an overdue balance — check before releasing new orders.' : '',
      shipTo,
      contacts,
      notes
    };
  });
}

// People · Contacts — one shared directory of the external people Kanalora deals
// with: vendor owners and accounts desks, customer buyers, carrier branch contacts.
// A record that needs a person (carrier, vendor, customer — and any future table)
// holds a reference to a contact `no`, never its own copy of name/phone/email.
// Derived from the party seeds so ids are stable across loads: CON00001… in the
// order carriers → vendors → customers, deduped by name. Phone/email are PII.
let _contactIx = null;
function contactIndex() {
  if (_contactIx) return _contactIx;
  const list = [],
    by = new Map();
  const add = (name, phone, email) => {
    const n = String(name || '').trim();
    if (!n) return;
    const k = n.toLowerCase();
    if (by.has(k)) return;
    const c = {
      no: 'CON' + String(list.length + 1).padStart(5, '0'),
      name: n,
      phone: phone || '',
      email: email || '',
      desc: '',
      active: true,
      createdAt: '2026-09-24T09:00:00.000Z',
      updatedAt: '2026-09-24T09:00:00.000Z'
    };
    list.push(c);
    by.set(k, c.no);
  };
  carriersRaw().forEach(k => add(k.contact, k.phone, ''));
  vendorsRaw().forEach(v => v.contacts.forEach(p => add(p.name, p.phone, p.email)));
  customersRaw().forEach(c => c.contacts.forEach(p => add(p.name, p.phone, p.email)));
  _contactIx = {
    list,
    id: name => by.get(String(name || '').trim().toLowerCase()) || ''
  };
  return _contactIx;
}
function seedContacts() {
  return contactIndex().list.map(c => ({
    ...c
  }));
}
// Party contact lists are link rows: { id, contactId, role, isPrimary }. role and
// isPrimary belong to the link (Accounts at this vendor), not to the person.
// The flat contact/phone/email on vendors & customers mirror the primary link.
const linkParty = rec => ({
  ...rec,
  contacts: (rec.contacts || []).map(p => ({
    id: p.id,
    contactId: contactIndex().id(p.name),
    role: p.role || '',
    isPrimary: !!p.isPrimary
  }))
});
function seedCarriers() {
  return carriersRaw().map(({
    contact,
    phone,
    ...k
  }) => ({
    ...k,
    contactId: contactIndex().id(contact)
  }));
}
function seedVendors() {
  return vendorsRaw().map(linkParty);
}
function seedCustomers() {
  return customersRaw().map(linkParty);
}

// Customer-specific sales prices — EXCEPTIONS layered over the item's list price
// (item.price). One row per customer + item + minQty tier; a row only applies
// between effFrom/effTo. Growth-tier feature, inert until the customerPricing
// axis is on. Spec: docs/superpowers/specs/2026-08-12-customer-specific-pricing.md
function seedCustomerPrices() {
  const P = (id, customer, item, price, minQty, effFrom, effTo, note) => ({
    id,
    customer,
    item,
    price,
    minQty: minQty || 1,
    effFrom: effFrom || '',
    effTo: effTo || '',
    uom: '',
    currency: 'INR',
    note: note || ''
  });
  return [
  // Sri Annamalaiyar Pooja Stores — oldest account, agreed trade price + a bulk tier.
  P('CP00001', 'CUS00001', 'ASH-PWH-18', 360.00, 1, '2026-04-01', '', 'Annual trade agreement'), P('CP00002', 'CUS00001', 'ASH-PWH-18', 340.00, 50, '2026-04-01', '', 'Bulk tier'), P('CP00003', 'CUS00001', 'ASH-TER-18', 345.00, 1, '2026-04-01', ''), P('CP00004', 'CUS00001', 'SBC-CONE-24', 105.00, 1, '2026-04-01', ''), P('CP00005', 'CUS00001', 'SBC-CONE-24', 96.00, 20, '2026-04-01', '', 'Bulk tier'),
  // Girivalam Path Handicrafts
  P('CP00006', 'CUS00002', 'ASH-PWH-18', 369.00, 1, '2026-04-01', ''), P('CP00007', 'CUS00002', 'CMB-PWH-12', 415.00, 1, '2026-04-01', ''),
  // Hotel Trisul Gift Counter — seasonal rate for the Deepam season only.
  P('CP00008', 'CUS00005', 'CMB-PWH-12', 429.00, 1, '2026-07-01', '2026-12-31', 'Deepam season rate'),
  // Thiruvannamalai Temple Bazaar
  P('CP00009', 'CUS00010', 'SBC-CONE-12', 62.00, 1, '2026-05-01', ''),
  // Full Moon Bazaar — Pournami volumes.
  P('CP00010', 'CUS00015', 'ASH-TER-18', 355.00, 1, '2026-07-01', ''), P('CP00011', 'CUS00015', 'ASH-TER-18', 335.00, 40, '2026-07-01', '', 'Pournami bulk')];
}

// Production · bills of materials. ONE entity for both kinds (see
// docs/superpowers/specs/2026-08-02-boms-assembly-production-orders.md):
//   kind 'assembly'   — a parts list, one step, no routing (Starter base, ungated)
//   kind 'production' — adds operations[]/yieldPct/wipLocation (Growth axis; seeded
//                       here but inert until the `production` axis is on)
// Exactly one ACTIVE version per parentItem at any date; older versions keep their
// effectiveTo so an order can resolve the BOM that was in force on its order date.
// Line desc/uom/unitCost resolve from the live Item record — never hardcoded.
// Rolled-up cost = materials + labourCost + overheadPct% — DERIVED in the app.
function seedBOMs() {
  const itemIx = {};
  seedItems().forEach(it => {
    itemIx[it.no] = it;
  });
  const mkLines = rows => rows.map(([no, qtyPer, scrapPct, note], i) => {
    const it = itemIx[no] || {};
    return {
      lineNo: (i + 1) * 10,
      item: no,
      desc: it.desc || no,
      qtyPer,
      uom: it.uom || 'NOS',
      scrapPct: scrapPct || 0,
      note: note || ''
    };
  });
  const B = (no, parentItem, version, status, effectiveFrom, effectiveTo, outputQty, labourCost, overheadPct, lines, notes) => {
    const p = itemIx[parentItem] || {};
    return {
      no,
      parentItem,
      parentDesc: p.desc || parentItem,
      kind: 'assembly',
      version,
      status,
      effectiveFrom,
      effectiveTo,
      outputQty,
      uom: p.uom || 'NOS',
      labourCost,
      overheadPct,
      lines: mkLines(lines),
      notes: notes || '',
      operations: [],
      yieldPct: 100,
      wipLocation: 'WH-ASSY',
      createdAt: effectiveFrom + 'T09:00:00',
      updatedAt: effectiveFrom + 'T09:00:00',
      createdBy: 'EMP00002'
    };
  };
  const holder = (glaze, lid) => [[lid, 1, 3], ['RM-BASE-STD', 1, 3], ['RM-GASKET', 1, 1], ['PKG-FOAM-INS', 0.02, 0, 'One wrap; foam is stocked by the 50-piece box.'], ['PKG-BOX-STD', 1, 1], ['PKG-CARE-CARD', 0.005, 0, 'Cards are stocked by the 200-piece box.']];
  const combo = (holderNo, box) => [[holderNo, 1, 1, 'Sub-assembly — built by its own BOM.'], ['SBC-CONE-12', 1, 0], [box, 1, 1]];
  const boms = [
  // ── Holders (level 1) ──────────────────────────────────────────────────
  B('BOM00001', 'ASH-PWH-18', 'v2', 'active', '2026-04-01', null, 1, 18.00, 5, holder('Pearl White', 'RM-LID-PWH'), 'Twist-lock 15°. Check the 6 mm vent hole is clear before packing.'), B('BOM00002', 'ASH-TER-18', 'v1', 'active', '2026-01-15', null, 1, 18.00, 5, holder('Terracotta', 'RM-LID-TER'), ''), B('BOM00003', 'ASH-BLK-18', 'v1', 'active', '2026-01-15', null, 1, 20.00, 5, holder('Charcoal Black', 'RM-LID-BLK'), 'Black glaze shows dust — wipe down before boxing.'),
  // ── Combos (level 2 — parent of a parent) ──────────────────────────────
  B('BOM00004', 'CMB-PWH-12', 'v1', 'active', '2026-02-10', null, 1, 12.00, 5, combo('ASH-PWH-18', 'PKG-BOX-PREM'), ''), B('BOM00005', 'CMB-TER-12', 'v1', 'active', '2026-02-10', null, 1, 12.00, 5, combo('ASH-TER-18', 'PKG-BOX-PREM'), ''), B('BOM00006', 'CMB-BLK-12', 'v1', 'active', '2026-02-10', null, 1, 12.00, 5, combo('ASH-BLK-18', 'PKG-BOX-PREM'), ''),
  // ── Superseded version, kept for history ───────────────────────────────
  B('BOM00007', 'ASH-PWH-18', 'v1', 'archived', '2025-11-01', '2026-03-31', 1, 15.00, 5, [['RM-LID-PWH', 1, 5], ['RM-BASE-STD', 1, 5], ['PKG-BOX-STD', 1, 1], ['PKG-CARE-CARD', 0.005, 0]], 'Pre-gasket design — lid sat loose on the base. Superseded by v2.'),
  // ── Draft awaiting sign-off ────────────────────────────────────────────
  B('BOM00008', 'ASH-STAND-WD', 'v1', 'draft', '2026-07-28', null, 1, 25.00, 5, [['PKG-CARE-CARD', 0.005, 0]], 'Placeholder — sheesham blank is still bought finished. Draft until we cut in-house.')];
  // Production BOM — the only genuine transformation (bulk resin → cone packs).
  // Seeded but inert: hidden entirely unless the `production` axis is on.
  boms.push({
    ...B('BOM00009', 'SBC-CONE-12', 'v1', 'active', '2026-05-01', null, 1, 6.00, 8, [['RM-CONE-BULK', 0.34, 0, 'Bulk sambrani resin, by weight.']], 'Press, dry 48 h, cure, pack 12. Yield allows for cracked cones at de-mould.'),
    kind: 'production',
    yieldPct: 92,
    operations: [{
      seq: 10,
      name: 'Press cones',
      workCentre: null,
      setupMin: 15,
      runMinPerUnit: 1.2,
      notes: ''
    }, {
      seq: 20,
      name: 'Air dry',
      workCentre: null,
      setupMin: 0,
      runMinPerUnit: 0,
      notes: '48 h rack time — not machine time.'
    }, {
      seq: 30,
      name: 'Cure & pack',
      workCentre: null,
      setupMin: 10,
      runMinPerUnit: 0.8,
      notes: ''
    }]
  });
  return boms;
}

// Production · assembly orders. Lines are EXPLODED FROM THE BOM AT CREATION and
// the bomId/bomVersion snapshotted, so editing a BOM never mutates a live order.
// status ∈ planned | draft | released | inProgress | finished | cancelled
//   ('planned' only appears when the planning capability is on)
// qtyConsumed is 0 until the order is finished (auto-backflush) or the operator
// posts manual consumption. sourceSalesLine is RESERVED for assemble-to-order.
function seedAssemblyOrders() {
  const itemIx = {};
  seedItems().forEach(it => {
    itemIx[it.no] = it;
  });
  const bomIx = {};
  seedBOMs().forEach(b => {
    if (b.status === 'active') bomIx[b.parentItem] = b;
  });
  const AO = (no, item, qty, qtyFinished, location, dueDate, status, assignee, orderDate, notes, consumedRatio) => {
    const bom = bomIx[item] || {
      no: '',
      version: '',
      lines: [],
      outputQty: 1
    };
    const it = itemIx[item] || {};
    const lines = bom.lines.map(l => {
      const req = Math.ceil(l.qtyPer * (1 + (l.scrapPct || 0) / 100) * qty / (bom.outputQty || 1) * 1000) / 1000;
      return {
        lineNo: l.lineNo,
        item: l.item,
        desc: l.desc,
        uom: l.uom,
        scrapPct: l.scrapPct,
        qtyRequired: req,
        qtyConsumed: Math.round(req * (consumedRatio || 0) * 1000) / 1000,
        note: l.note
      };
    });
    return {
      no,
      item,
      desc: it.desc || item,
      uom: it.uom || 'NOS',
      bomId: bom.no,
      bomVersion: bom.version,
      qty,
      qtyFinished,
      location,
      dueDate,
      orderDate,
      status,
      assignee,
      lines,
      sourceSalesLine: null,
      notes: notes || '',
      createdAt: orderDate + 'T08:30:00'
    };
  };
  return [AO('AO00001', 'CMB-PWH-12', 40, 0, 'WH-TVM', '2026-08-07', 'released', 'EMP00002', '2026-07-30', 'Pournami build-ahead for the Girivalam stalls.', 0), AO('AO00002', 'ASH-PWH-18', 60, 24, 'WH-TVM', '2026-08-05', 'inProgress', 'EMP00012', '2026-07-29', 'First 24 packed and moved to Main.', 0.4), AO('AO00003', 'ASH-BLK-18', 30, 0, 'WH-TVM', '2026-08-12', 'draft', null, '2026-08-01', 'Black glaze — waiting on the kiln batch from Kailash Ceramics.', 0), AO('AO00004', 'ASH-TER-18', 50, 50, 'WH-TVM', '2026-07-24', 'finished', 'EMP00012', '2026-07-18', 'Completed in full; 2 lids lost to chipping, covered by scrap allowance.', 1), AO('AO00005', 'CMB-BLK-12', 25, 0, 'WH-TVM', '2026-08-14', 'released', 'EMP00002', '2026-08-01', 'Short on gaskets — released anyway, vendor delivery due 2026-08-04.', 0), AO('AO00006', 'CMB-TER-12', 20, 0, 'WH-TVM', '2026-07-20', 'cancelled', null, '2026-07-12', 'Cancelled — customer switched the order to Pearl White.', 0)];
}

// People · HR directory. Flat records; managerId points at another employee id.
// dept ∈ Operations | Manufacturing | Warehouse | Sales | Purchasing | Finance
// status ∈ Active | On leave | Terminated ; type ∈ Full-time | Part-time | Contractor
function seedEmployees() {
  const E = (id, name, title, dept, managerId, status, type, email, phone, location, joinDate) => ({
    id,
    name,
    title,
    dept,
    managerId,
    status,
    type,
    email,
    phone,
    location,
    joinDate
  });
  return [E('EMP00001', 'Karthik Subramaniam', 'Founder & Operations Head', 'Operations', null, 'Active', 'Full-time', 'karthik.subramaniam@kanalora.example', '+91 90031 44210', 'Tiruvannamalai, TN', '2022-01-10'), E('EMP00002', 'Murugan Selvam', 'Assembly Unit Manager', 'Manufacturing', 'EMP00001', 'Active', 'Full-time', 'murugan.selvam@kanalora.example', '+91 90031 44231', 'Tiruvannamalai, TN', '2022-03-21'), E('EMP00003', 'Lakshmi Narayanan', 'Warehouse Supervisor', 'Warehouse', 'EMP00001', 'Active', 'Full-time', 'lakshmi.narayanan@kanalora.example', '+91 90031 44252', 'Tiruvannamalai, TN', '2022-05-09'), E('EMP00004', 'Senthil Kumar', 'Ceramic Quality Inspector', 'Manufacturing', 'EMP00002', 'Active', 'Full-time', 'senthil.kumar@kanalora.example', '+91 90031 44273', 'Tiruvannamalai, TN', '2022-08-02'), E('EMP00005', 'Deepa Ramaswamy', 'Sales Lead', 'Sales', 'EMP00001', 'Active', 'Full-time', 'deepa.ramaswamy@kanalora.example', '+91 90031 44294', 'Vellore, TN', '2022-09-19'), E('EMP00006', 'Arun Prakash', 'Store Relationship Executive', 'Sales', 'EMP00005', 'Active', 'Full-time', 'arun.prakash@kanalora.example', '+91 90031 44315', 'Vellore, TN', '2023-01-16'), E('EMP00007', 'Bhuvaneswari Iyer', 'Procurement Manager', 'Purchasing', 'EMP00001', 'Active', 'Full-time', 'bhuvaneswari.iyer@kanalora.example', '+91 90031 44336', 'Tiruvannamalai, TN', '2023-03-06'), E('EMP00008', 'Vignesh Raja', 'Buyer', 'Purchasing', 'EMP00007', 'On leave', 'Full-time', 'vignesh.raja@kanalora.example', '+91 90031 44357', 'Tiruvannamalai, TN', '2023-06-27'), E('EMP00009', 'Kavitha Elumalai', 'Finance Manager', 'Finance', 'EMP00001', 'Active', 'Full-time', 'kavitha.elumalai@kanalora.example', '+91 90031 44378', 'Tiruvannamalai, TN', '2023-08-14'), E('EMP00010', 'Ramesh Babu', 'Staff Accountant', 'Finance', 'EMP00009', 'Active', 'Full-time', 'ramesh.babu@kanalora.example', '+91 90031 44399', 'Tiruvannamalai, TN', '2023-11-20'), E('EMP00011', 'Muthulakshmi Pandian', 'Packing Associate', 'Warehouse', 'EMP00003', 'Active', 'Full-time', 'muthulakshmi.pandian@kanalora.example', '+91 90031 44410', 'Tiruvannamalai, TN', '2024-01-08'), E('EMP00012', 'Gopalakrishnan Iyer', 'Assembly Associate', 'Manufacturing', 'EMP00002', 'Active', 'Part-time', 'gopalakrishnan.iyer@kanalora.example', '+91 90031 44431', 'Tiruvannamalai, TN', '2024-04-15'), E('EMP00013', 'Anitha Chezhian', 'Logistics Coordinator', 'Warehouse', 'EMP00003', 'Active', 'Full-time', 'anitha.chezhian@kanalora.example', '+91 90031 44452', 'Tiruvannamalai, TN', '2024-07-01'), E('EMP00014', 'Divya Shankar', 'Product Designer (Ceramic Forms)', 'Manufacturing', 'EMP00002', 'Contractor', 'Contractor', 'divya.shankar@studioform.example', '+91 90031 44473', 'Remote — Chennai, TN', '2024-09-23'), E('EMP00015', 'Preethi Narasimhan', 'Sales Development Rep', 'Sales', 'EMP00005', 'Terminated', 'Full-time', 'preethi.narasimhan@kanalora.example', '+91 90031 44494', 'Vellore, TN', '2023-10-02'), E('EMP00016', 'Suresh Kannan', 'Store Relationship Executive', 'Sales', 'EMP00005', 'Active', 'Full-time', 'suresh.kannan@kanalora.example', '+91 90031 44515', 'Tiruvannamalai, TN', '2023-04-11'), E('EMP00017', 'Nandhini Balaji', 'Store Relationship Executive', 'Sales', 'EMP00005', 'Active', 'Full-time', 'nandhini.balaji@kanalora.example', '+91 90031 44536', 'Tiruvannamalai, TN', '2023-07-24'), E('EMP00018', 'Vasanth Kumar', 'Store Relationship Executive', 'Sales', 'EMP00005', 'Active', 'Full-time', 'vasanth.kumar@kanalora.example', '+91 90031 44557', 'Tiruvannamalai, TN', '2023-12-05'), E('EMP00019', 'Sangeetha Murugan', 'Sales Development Rep', 'Sales', 'EMP00005', 'Active', 'Full-time', 'sangeetha.murugan@kanalora.example', '+91 90031 44578', 'Tiruvannamalai, TN', '2024-02-19'), E('EMP00020', 'Ilango Chandran', 'Buyer', 'Purchasing', 'EMP00007', 'Active', 'Full-time', 'ilango.chandran@kanalora.example', '+91 90031 44599', 'Tiruvannamalai, TN', '2023-05-08'), E('EMP00021', 'Revathi Sundaram', 'Buyer', 'Purchasing', 'EMP00007', 'Active', 'Full-time', 'revathi.sundaram@kanalora.example', '+91 90031 44610', 'Tiruvannamalai, TN', '2023-09-14')];
}

// People · app user accounts. Each may link to an employee (empId).
// role ∈ Admin | Manager | Warehouse | Sales | Purchasing | Finance | Viewer
// status ∈ Active | Pending | Suspended ; twoFA boolean
// perms: per-module access ∈ none | read | write, keyed by module id.
function seedUsers() {
  const P = (home, finance, sales, purchasing, warehouse, people) => ({
    home,
    finance,
    sales,
    purchasing,
    warehouse,
    people,
    production: warehouse
  });
  const U = (id, empId, name, email, role, status, twoFA, lastActive, perms) => ({
    id,
    empId,
    name,
    email,
    role,
    status,
    twoFA,
    lastActive,
    perms
  });
  return [U('USR00001', 'EMP00001', 'Karthik Subramaniam', 'karthik.subramaniam@kanalora.example', 'Admin', 'Active', true, '2026-08-01T08:42:00', P('write', 'write', 'write', 'write', 'write', 'write')), U('USR00002', 'EMP00002', 'Murugan Selvam', 'murugan.selvam@kanalora.example', 'Manager', 'Active', true, '2026-08-01T07:15:00', P('read', 'read', 'read', 'read', 'write', 'read')), U('USR00003', 'EMP00003', 'Lakshmi Narayanan', 'lakshmi.narayanan@kanalora.example', 'Warehouse', 'Active', true, '2026-07-31T18:03:00', P('read', 'none', 'none', 'read', 'write', 'none')), U('USR00004', 'EMP00005', 'Deepa Ramaswamy', 'deepa.ramaswamy@kanalora.example', 'Sales', 'Active', false, '2026-07-31T14:37:00', P('read', 'none', 'write', 'none', 'read', 'none')), U('USR00005', 'EMP00006', 'Arun Prakash', 'arun.prakash@kanalora.example', 'Sales', 'Active', false, '2026-07-30T16:22:00', P('read', 'none', 'write', 'none', 'read', 'none')), U('USR00006', 'EMP00007', 'Bhuvaneswari Iyer', 'bhuvaneswari.iyer@kanalora.example', 'Purchasing', 'Active', true, '2026-08-01T06:58:00', P('read', 'read', 'none', 'write', 'read', 'none')), U('USR00007', 'EMP00009', 'Kavitha Elumalai', 'kavitha.elumalai@kanalora.example', 'Finance', 'Active', true, '2026-07-29T11:09:00', P('read', 'write', 'read', 'read', 'read', 'none')), U('USR00008', 'EMP00010', 'Ramesh Babu', 'ramesh.babu@kanalora.example', 'Finance', 'Suspended', false, '2026-07-18T09:44:00', P('read', 'write', 'none', 'none', 'none', 'none')), U('USR00009', 'EMP00013', 'Anitha Chezhian', 'anitha.chezhian@kanalora.example', 'Warehouse', 'Active', false, '2026-07-31T13:51:00', P('read', 'none', 'none', 'read', 'write', 'none')), U('USR00010', null, 'Elavarasi Mani', 'elavarasi.mani@kanalora.example', 'Manager', 'Pending', false, null, P('read', 'read', 'read', 'read', 'read', 'read')), U('USR00011', null, 'audit@kanalora.example', 'audit@kanalora.example', 'Viewer', 'Pending', false, null, P('read', 'read', 'read', 'read', 'read', 'read'))];
}

// ─────────────────────────── NOTES (app-wide) ───────────────────────────
// ONE append-only collection for every record in the app, keyed by
// {entityType, entityNo} — entityNo is the record's own primary key
// (PO00001, GRN00005, RM-LID-PWH, CUS00001…), which is what the Notes page's
// Reference column narrows on. A note is NEVER edited or deleted; it can only
// be marked invalid, once, with a permanent reason. Spec:
// docs/superpowers/specs/2026-09-20-notes-system.md · docs/notes/README.md
//
// The per-document `notes` string that still exists on PO/PR/BOM/AO seed rows
// and the `customer.notes` array are SEED TEXT SOURCES ONLY — they are read
// here to become the first note of each thread, and the app itself never reads
// them again. Everything else below is a real multi-author thread.
function seedNotes() {
  const empName = {};
  const empId = {};
  seedEmployees().forEach(e => {
    empName[e.id] = e.name;
    empId[e.name] = e.id;
  });
  const out = [];
  const add = (entityType, entityNo, createdAt, by, text, invalid) => {
    const authorId = empId[by] || by;
    out.push({
      id: 'NOTE-' + String(out.length + 1).padStart(5, '0'),
      entityType,
      entityNo,
      text,
      authorId,
      authorName: empName[authorId] || by,
      createdAt,
      status: invalid ? 'invalid' : 'valid',
      invalidReason: invalid ? invalid.reason : null,
      invalidatedBy: invalid ? empId[invalid.by] || invalid.by : null,
      invalidatedByName: invalid ? empName[empId[invalid.by] || invalid.by] || invalid.by : null,
      invalidatedAt: invalid ? invalid.at : null
    });
  };
  // 1 — each seeded document's own note text becomes the opening note.
  seedPurchaseOrders().forEach(po => {
    if (po.notes) add('purchaseOrder', po.no, po.orderDate + 'T09:40:00', po.buyer || 'EMP00007', po.notes);
  });
  seedPurchaseReceipts().forEach(r => {
    if (r.notes) add('purchaseReceipt', r.no, r.receiptDate + 'T11:05:00', r.receivedBy || 'EMP00003', r.notes);
  });
  seedBOMs().forEach(b => {
    if (b.notes) add('bom', b.no, b.effectiveFrom + 'T09:15:00', b.createdBy || 'EMP00002', b.notes);
  });
  seedAssemblyOrders().forEach(a => {
    if (a.notes) add('assemblyOrder', a.no, a.orderDate + 'T08:45:00', a.assignee || 'EMP00002', a.notes);
  });
  seedCustomers().forEach(c => (c.notes || []).forEach(n => add('customer', c.no, n.at + 'T10:20:00', n.by, n.text)));
  // 2 — the threads that follow: several people on the same record over time.
  add('purchaseOrder', 'PO00001', '2026-07-28T16:10:00', 'Ilango Chandran', 'Kailash Ceramics called — kiln is running two days behind. Pearl White lids will land with the Terracotta batch, not before.');
  add('purchaseOrder', 'PO00001', '2026-08-03T09:25:00', 'Lakshmi Narayanan', 'First 120 base trays arrived and are booked in under GRN00005. Rest still open.');
  add('purchaseOrder', 'PO00001', '2026-08-04T12:02:00', 'Vignesh Raja', 'Vendor says the whole order shipped on the 2nd — nothing outstanding.', {
    by: 'Bhuvaneswari Iyer',
    at: '2026-08-04T15:40:00',
    reason: 'Incorrect — only 120 of 750 units have been received. Checked against GRN00005.'
  });
  add('purchaseOrder', 'PO00001', '2026-09-14T10:30:00', 'Bhuvaneswari Iyer', 'Chasing the balance before Pournami on the 26th. Vendor has committed to the 20th.');
  add('purchaseReceipt', 'GRN00005', '2026-09-17T15:12:00', 'Senthil Kumar', 'Four lids with hairline crazing on the glaze — set aside, not counted into stock. Photos with the challan.');
  add('purchaseReceipt', 'GRN00005', '2026-09-18T09:05:00', 'Bhuvaneswari Iyer', 'Told the vendor about the four cracked lids. They will replace on the next kiln run, no debit note needed.');
  add('vendor', 'V00001', '2026-06-22T11:40:00', 'Bhuvaneswari Iyer', 'Kiln capacity is the constraint here, not clay supply. Anything over 400 lids needs three weeks notice.');
  add('vendor', 'V00001', '2026-09-12T17:20:00', 'Karthik Subramaniam', 'Visited the unit. Glaze consistency on Charcoal Black has improved a lot since the last batch.');
  add('vendor', 'V00007', '2026-08-30T14:15:00', 'Revathi Sundaram', 'Cone packs now arrive shrink-wrapped in 50s — count on receipt is faster, no loose cones.');
  add('item', 'FG-HOLDER-PWH', '2026-09-08T10:05:00', 'Deepa Ramaswamy', 'Pearl White is what the Girivalam path stalls ask for first. Keep it stocked through every full-moon week.');
  add('item', 'FG-HOLDER-PWH', '2026-09-15T18:30:00', 'Murugan Selvam', 'Twist-lock fit runs tight on lids from the July kiln batch — a light sand on the tabs before packing fixes it.');
  add('item', 'RM-LID-PWH', '2026-09-16T09:50:00', 'Senthil Kumar', 'Reject rate on this lid is about 3% at goods-in, mostly glaze crazing at the peak vent.');
  add('bom', 'BOM00001', '2026-09-02T11:25:00', 'Murugan Selvam', 'Added the 15-minute cure wait after twist-lock check — assemblers were packing too early and marking the base.');
  add('assemblyOrder', 'AO00001', '2026-09-19T08:40:00', 'Gopalakrishnan Iyer', 'Short two base trays this morning; borrowed from the Terracotta bin and will square it up when GRN lands.');
  add('customer', 'CUS00001', '2026-09-19T16:45:00', 'Suresh Kannan', 'Owner asked for a Karthigai Deepam display box quote — 60 units, mixed glazes. Passing to Deepa.');
  add('customer', 'CUS00004', '2026-09-10T13:10:00', 'Arun Prakash', 'Part payment promised by the 25th. Nothing new ships until it clears.');
  return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// One call that returns the full seed bundle, ready to drop into state.
function seedAll() {
  return {
    items: seedItems(),
    notes: seedNotes(),
    vendors: seedVendors(),
    orders: seedOrders(),
    purchaseOrders: seedPurchaseOrders(),
    purchaseReceipts: seedPurchaseReceipts(),
    boms: seedBOMs(),
    assemblyOrders: seedAssemblyOrders(),
    invoices: seedInvoices(),
    products: seedProducts(),
    customers: seedCustomers(),
    customerPrices: seedCustomerPrices(),
    employees: seedEmployees(),
    users: seedUsers()
  };
}

// ── Record-number format (2026-10-24) ──
// Every auto-number is PREFIX + 5-digit zero-padded running number, no hyphen,
// steps of 1 (V00001, CUS00001, SO00001, GRN00001…). Padding is a minimum, not a
// cap: after 99999 the series continues as 100000. migrateNoFormat() rewrites
// browser-stored data from the old hyphenated / steps-of-10 numbers once, across
// every shelfree.* store, so cross-references stay consistent with these seeds.
const NO_LEGACY = {
  "SO": [10406, 10409, 10412, 10413, 10415, 10418, 10421, 10424, 10427, 10428, 10430, 10431, 10433, 10434],
  "INV": [20838, 20842, 20851, 20855, 20860, 20866, 20874, 20891, 20902, 20905],
  "V": [10, 11, 12, 13, 14, 15, 20],
  "GRN": [10, 20, 30, 40, 50],
  "CUS": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160],
  "CP": [10, 11, 12, 13, 14, 20, 21, 50, 100, 150, 151],
  "BOM": [10, 20, 30, 40, 50, 60, 70, 80, 90],
  "AO": [10, 20, 30, 40, 50, 60]
};
function migrateNoFormat() {
  try {
    const flag = 'shelfree.noFormat.v2';
    if (localStorage.getItem(flag)) return;
    const RANKED = new Set(Object.keys(NO_LEGACY));
    const re = () => /\b(V|CUS|SO|INV|GRN|BOM|AO|CP|EMP|USR|CON|PP|ITM)-(\d+)(?![\dA-Za-z])/g;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('shelfree.') === 0) keys.push(k);
    }
    const vals = keys.map(k => localStorage.getItem(k) || '');
    const sets = {};
    for (const p in NO_LEGACY) sets[p] = new Set(NO_LEGACY[p]);
    vals.forEach(v => {
      for (const m of v.matchAll(re())) if (RANKED.has(m[1])) sets[m[1]].add(+m[2]);
    });
    const rank = {};
    for (const p in sets) rank[p] = new Map([...sets[p]].sort((a, b) => a - b).map((n, i) => [n, i + 1]));
    const fix = s => s.replace(re(), (_, p, d) => p + String(RANKED.has(p) ? rank[p].get(+d) : +d).padStart(5, '0'));
    keys.forEach((k, i) => {
      const nv = fix(vals[i]);
      if (nv !== vals[i]) localStorage.setItem(k, nv);
    });
    localStorage.setItem(flag, '1');
  } catch (e) {}
}
Object.assign(__ds_scope, { seedItems, seedItemCategories, reconcileItemCategories, seedOrders, seedInvoices, seedPurchaseOrders, seedPurchaseReceipts, seedAccounts, seedCharges, seedWarehouses, seedProducts, seedContacts, seedCarriers, seedVendors, seedCustomers, seedCustomerPrices, seedBOMs, seedAssemblyOrders, seedEmployees, seedUsers, seedNotes, seedAll, migrateNoFormat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "lib/shelfree-data.js", error: String((e && e.message) || e) }); }

// lib/tailwind-shadcn.js
try { (() => {
/* Shelfree × shadcn/ui — Tailwind (Play CDN) theme config.
 *
 * Load AFTER <script src="https://cdn.tailwindcss.com"></script> in any page/card
 * that mounts a design-system component. Maps shadcn utility classes onto Shelfree's
 * brand via the HSL-channel vars in tokens/shadcn.css (--sh-*).
 *
 * preflight is ON — shadcn components rely on Tailwind's base reset to normalise
 * native form controls (button/input backgrounds, etc.). It only affects pages that
 * load THIS file (component hosts), not hand-written app chrome that links styles.css
 * alone. The Claude Code (B) handoff replaces this with a real compiled Tailwind build.
 */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--sh-border) / <alpha-value>)',
        input: 'hsl(var(--sh-input) / <alpha-value>)',
        ring: 'hsl(var(--sh-ring) / <alpha-value>)',
        background: 'hsl(var(--sh-background) / <alpha-value>)',
        foreground: 'hsl(var(--sh-foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--sh-primary) / <alpha-value>)',
          foreground: 'hsl(var(--sh-primary-foreground) / <alpha-value>)'
        },
        secondary: {
          DEFAULT: 'hsl(var(--sh-secondary) / <alpha-value>)',
          foreground: 'hsl(var(--sh-secondary-foreground) / <alpha-value>)'
        },
        destructive: {
          DEFAULT: 'hsl(var(--sh-destructive) / <alpha-value>)',
          foreground: 'hsl(var(--sh-destructive-foreground) / <alpha-value>)'
        },
        muted: {
          DEFAULT: 'hsl(var(--sh-muted) / <alpha-value>)',
          foreground: 'hsl(var(--sh-muted-foreground) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'hsl(var(--sh-accent) / <alpha-value>)',
          foreground: 'hsl(var(--sh-accent-foreground) / <alpha-value>)'
        },
        popover: {
          DEFAULT: 'hsl(var(--sh-popover) / <alpha-value>)',
          foreground: 'hsl(var(--sh-popover-foreground) / <alpha-value>)'
        },
        card: {
          DEFAULT: 'hsl(var(--sh-card) / <alpha-value>)',
          foreground: 'hsl(var(--sh-card-foreground) / <alpha-value>)'
        }
      },
      borderRadius: {
        lg: 'var(--sh-radius)',
        md: 'calc(var(--sh-radius) - 2px)',
        sm: 'calc(var(--sh-radius) - 4px)'
      }
    }
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "lib/tailwind-shadcn.js", error: String((e && e.message) || e) }); }

// lib/utils.js
try { (() => {
/* Shelfree × shadcn/ui — class utilities.
 *
 * cn()  — shadcn's className composer. Here it's a clsx-style join (strings,
 *         arrays, and {class: cond} objects). NOTE: no tailwind-merge dedupe —
 *         at the Claude Code (B) handoff swap this for `twMerge(clsx(inputs))`.
 * cva() — faithful minimal class-variance-authority: base + variants +
 *         defaultVariants + compoundVariants, with class/className pass-through.
 */

function cn(...inputs) {
  const out = [];
  const add = v => {
    if (!v) return;
    if (typeof v === 'string' || typeof v === 'number') out.push(String(v));else if (Array.isArray(v)) v.forEach(add);else if (typeof v === 'object') for (const k in v) if (v[k]) out.push(k);
  };
  inputs.forEach(add);
  return out.join(' ');
}
function cva(base, config) {
  return (props = {}) => {
    const classes = [base];
    if (config && config.variants) {
      const defaults = config.defaultVariants || {};
      for (const key in config.variants) {
        const val = props[key] != null ? props[key] : defaults[key];
        if (val != null && config.variants[key][val]) classes.push(config.variants[key][val]);
      }
      for (const cv of config.compoundVariants || []) {
        const {
          class: cvClass,
          className: cvClassName,
          ...conds
        } = cv;
        const match = Object.keys(conds).every(k => {
          const p = props[k] != null ? props[k] : defaults[k];
          return p === conds[k];
        });
        if (match) classes.push(cvClass || cvClassName);
      }
    }
    if (props.class) classes.push(props.class);
    if (props.className) classes.push(props.className);
    return cn(...classes);
  };
}
Object.assign(__ds_scope, { cn, cva });
})(); } catch (e) { __ds_ns.__errors.push({ path: "lib/utils.js", error: String((e && e.message) || e) }); }

// components/badges/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * shadcn/ui Badge — real source, extended with Shelfree's semantic status variants.
 * Requires Tailwind + the shadcn theme config on the host page.
 *
 * shadcn variants: default | secondary | destructive | outline
 * Shelfree status variants: ok | info | warn | bad | neutral (map ERP record states).
 */
const badgeVariants = __ds_scope.cva("inline-flex items-center gap-1.5 rounded-md border font-medium leading-none whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
      secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
      outline: "text-foreground",
      ok: "border-transparent bg-[var(--ok-bg)] text-[color:var(--ok-fg)]",
      info: "border-transparent bg-[var(--info-bg)] text-[color:var(--info-fg)]",
      warn: "border-transparent bg-[var(--warn-bg)] text-[color:var(--warn-fg)]",
      bad: "border-transparent bg-[var(--bad-bg)] text-[color:var(--bad-fg)]",
      neutral: "border-transparent bg-[var(--neutral-bg)] text-[color:var(--neutral-fg)]",
      primary: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80"
    },
    size: {
      default: "px-2.5 py-0.5 text-xs",
      sm: "px-1.5 py-0.5 text-[11px] rounded-[5px]",
      pill: "px-2.5 py-0.5 text-[11.5px] rounded-full"
    }
  },
  defaultVariants: {
    variant: "neutral",
    size: "default"
  }
});
function Badge({
  className,
  variant,
  size,
  dot = false,
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: __ds_scope.cn(badgeVariants({
      variant,
      size,
      className
    }))
  }, props), dot ? /*#__PURE__*/React.createElement("span", {
    className: "inline-block size-1.5 rounded-full bg-current shrink-0"
  }) : null, children);
}
const countChipVariants = __ds_scope.cva("inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11.5px] font-medium leading-none", {
  variants: {
    variant: {
      neutral: "bg-muted text-muted-foreground",
      primary: "bg-primary/15 text-primary",
      bad: "bg-[var(--bad-bg)] text-[color:var(--bad-fg)]",
      warn: "bg-[var(--warn-bg)] text-[color:var(--warn-fg)]"
    }
  },
  defaultVariants: {
    variant: "neutral"
  }
});
function CountChip({
  count,
  variant,
  className,
  ...props
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: __ds_scope.cn(countChipVariants({
      variant,
      className
    }))
  }, props), count);
}
Object.assign(__ds_scope, { badgeVariants, Badge, CountChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/badges/Badge.jsx", error: String((e && e.message) || e) }); }

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * shadcn/ui Button — real source, adapted for Shelfree.
 * Faithful cva variant map + shadcn class strings. Requires Tailwind + the
 * shadcn theme config on the host page (see CLAUDE.md → UI baseline).
 *
 * Variants: default | destructive | outline | secondary | ghost | link
 * Transitional aliases (primary/danger/warning, size md) keep legacy call sites
 * working during migration — remove once callers move to shadcn names.
 */
const buttonVariants = __ds_scope.cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
      primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
      danger: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      warning: "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
    },
    size: {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8",
      icon: "h-9 w-9",
      md: "h-9 px-4 py-2"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
});
function Button({
  className,
  variant,
  size,
  asChild = false,
  icon,
  iconPosition = 'start',
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    className: __ds_scope.cn(buttonVariants({
      variant,
      size,
      className
    }))
  }, props), icon && iconPosition === 'start' ? icon : null, children, icon && iconPosition === 'end' ? icon : null);
}
function IconButton({
  label,
  icon,
  children,
  className,
  variant = 'ghost',
  ...props
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    className: __ds_scope.cn(buttonVariants({
      variant,
      size: 'icon',
      className
    })),
    title: label,
    "aria-label": label
  }, props), icon || children);
}
Object.assign(__ds_scope, { buttonVariants, Button, IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * shadcn/ui Input — real source, wrapped to keep Shelfree's label/prefix/suffix/
 * error/hint affordances. Requires Tailwind + the shadcn theme config on the host.
 * Pass through any native <input> attribute (value, onChange, type, disabled, …).
 */
function Input({
  className,
  type = 'text',
  label,
  error,
  hint,
  prefix,
  suffix,
  width,
  ...props
}) {
  const control = /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center"
  }, prefix ? /*#__PURE__*/React.createElement("span", {
    className: "absolute left-3 flex text-muted-foreground pointer-events-none"
  }, prefix) : null, /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    className: __ds_scope.cn("flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", prefix ? "pl-9" : "", suffix ? "pr-9" : "", error ? "border-destructive focus-visible:ring-destructive" : "border-input", className)
  }, props)), suffix ? /*#__PURE__*/React.createElement("span", {
    className: "absolute right-3 flex text-muted-foreground pointer-events-none"
  }, suffix) : null);
  if (!label && !error && !hint) return /*#__PURE__*/React.createElement("div", {
    style: {
      width: width || '100%'
    }
  }, control);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1.5",
    style: {
      width: width || '100%'
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "text-sm font-medium text-muted-foreground"
  }, label) : null, control, error || hint ? /*#__PURE__*/React.createElement("p", {
    className: __ds_scope.cn("text-xs m-0", error ? "text-destructive" : "text-muted-foreground")
  }, error || hint) : null);
}

/** Compact search bar with a built-in search icon — toolbar filter rows. */
function SearchInput({
  placeholder = 'Search…',
  width = '240px',
  className,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "relative inline-flex",
    style: {
      width
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 flex text-muted-foreground pointer-events-none"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  }))), /*#__PURE__*/React.createElement("input", _extends({
    placeholder: placeholder,
    className: __ds_scope.cn("h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring", className)
  }, props)));
}

/** Native <select> with a hidden appearance and a custom chevron. */
function SelectField({
  options = [],
  label,
  width,
  className,
  children,
  ...props
}) {
  const control = /*#__PURE__*/React.createElement("div", {
    className: "relative inline-flex w-full"
  }, /*#__PURE__*/React.createElement("select", _extends({
    className: __ds_scope.cn("h-9 w-full appearance-none rounded-md border border-input bg-transparent pl-3 pr-8 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)
  }, props), children || options.map(opt => /*#__PURE__*/React.createElement("option", {
    key: opt.value,
    value: opt.value
  }, opt.label))), /*#__PURE__*/React.createElement("span", {
    className: "absolute right-2.5 top-1/2 -translate-y-1/2 flex text-muted-foreground pointer-events-none"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))));
  if (!label) return /*#__PURE__*/React.createElement("div", {
    style: {
      width: width || '100%'
    }
  }, control);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1.5",
    style: {
      width: width || '100%'
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-sm font-medium text-muted-foreground"
  }, label), control);
}
Object.assign(__ds_scope, { Input, SearchInput, SelectField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.CountChip = __ds_scope.CountChip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.SelectField = __ds_scope.SelectField;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
