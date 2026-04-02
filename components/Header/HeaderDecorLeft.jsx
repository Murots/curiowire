export default function HeaderDecorLeft() {
  return (
    <svg
      viewBox="0 0 900 140"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        height: "100%",
        width: "720px", // 👈 mye bredere
        pointerEvents: "none",
        zIndex: 1,
        opacity: 0.9,
        overflow: "visible",

        // 👇 super viktig: fade ut før search
        maskImage: "linear-gradient(to right, black 75%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, black 75%, transparent 100%)",
      }}
    >
      <defs>
        <linearGradient id="cw-left-line-1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffcc9c" stopOpacity="0.65" />
          <stop offset="60%" stopColor="#ffcc9c" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffcc9c" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="cw-left-line-2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffc28a" stopOpacity="0.5" />
          <stop offset="65%" stopColor="#ffc28a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffc28a" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="cw-left-glow-1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd9b8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffd9b8" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="cw-left-glow-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffc995" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffc995" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 🔥 MAIN FLOW LINE – går langt mot midten */}
      <path
        d="M0,88 C140,40 260,28 360,32 C470,36 580,64 720,96"
        stroke="url(#cw-left-line-1)"
        strokeWidth="1.5"
        fill="none"
      />

      {/* 🔥 SECONDARY FLOW */}
      <path
        d="M0,110 C160,70 300,48 420,52 C540,56 630,78 780,112"
        stroke="url(#cw-left-line-2)"
        strokeWidth="1.1"
        fill="none"
      />

      {/* 🔥 subtle upper line */}
      <path
        d="M0,60 C120,36 200,30 260,32"
        stroke="url(#cw-left-line-2)"
        strokeWidth="0.9"
        fill="none"
      />

      {/* 🔥 nodes (mer spredt mot midten) */}
      <circle cx="140" cy="52" r="10" fill="url(#cw-left-glow-1)" />
      <circle cx="140" cy="52" r="2.1" fill="#ffe3c7" />

      <circle cx="300" cy="58" r="9" fill="url(#cw-left-glow-2)" />
      <circle cx="300" cy="58" r="2" fill="#ffd6ae" />

      <circle cx="460" cy="66" r="8" fill="url(#cw-left-glow-2)" />
      <circle cx="460" cy="66" r="1.8" fill="#ffd2a3" />

      <circle cx="600" cy="82" r="7" fill="url(#cw-left-glow-2)" />
      <circle cx="600" cy="82" r="1.6" fill="#ffcfa0" />
    </svg>
  );
}
