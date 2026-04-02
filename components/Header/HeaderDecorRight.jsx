export default function HeaderDecorRight() {
  return (
    <svg
      viewBox="0 0 700 140"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        right: 0,
        top: "18px",
        height: "calc(100% - 18px)",
        width: "420px",
        pointerEvents: "none",
        zIndex: 1,
        opacity: 0.95,
        overflow: "visible",
      }}
    >
      <defs>
        <linearGradient id="cw-right-line-1" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#b7ddff" stopOpacity="0.7" />
          <stop offset="55%" stopColor="#9ed0ff" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#9ed0ff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="cw-right-line-2" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#8fc8ff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#8fc8ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8fc8ff" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="cw-right-glow-1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e4f4ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e4f4ff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="cw-right-glow-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b7ddff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#b7ddff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Nettverket er flyttet ned og litt ut til høyre,
          så det ikke sitter bak selve search-feltet */}

      <line
        x1="610"
        y1="82"
        x2="525"
        y2="104"
        stroke="url(#cw-right-line-1)"
        strokeWidth="1.2"
      />
      <line
        x1="525"
        y1="104"
        x2="455"
        y2="86"
        stroke="url(#cw-right-line-2)"
        strokeWidth="1"
      />
      <line
        x1="525"
        y1="104"
        x2="470"
        y2="128"
        stroke="url(#cw-right-line-2)"
        strokeWidth="1"
      />
      <line
        x1="610"
        y1="82"
        x2="650"
        y2="116"
        stroke="url(#cw-right-line-2)"
        strokeWidth="0.9"
      />

      <circle cx="610" cy="82" r="10" fill="url(#cw-right-glow-1)" />
      <circle cx="610" cy="82" r="2.1" fill="#eef8ff" />

      <circle cx="525" cy="104" r="9" fill="url(#cw-right-glow-2)" />
      <circle cx="525" cy="104" r="2" fill="#dcefff" />

      <circle cx="455" cy="86" r="7" fill="url(#cw-right-glow-2)" />
      <circle cx="455" cy="86" r="1.7" fill="#cde7ff" />

      <circle cx="470" cy="128" r="7" fill="url(#cw-right-glow-2)" />
      <circle cx="470" cy="128" r="1.7" fill="#cde7ff" />

      <circle cx="650" cy="116" r="6" fill="url(#cw-right-glow-2)" />
      <circle cx="650" cy="116" r="1.5" fill="#c6e3ff" />
    </svg>
  );
}
