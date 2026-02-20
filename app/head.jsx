// app/head.jsx

export default function Head() {
  return (
    <>
      {/* ✅ Preconnect for raskere bilder (forside/feeds) */}
      <link
        rel="preconnect"
        href="https://qshftfehnecovxxgldsc.supabase.co"
        crossOrigin=""
      />
      <link
        rel="dns-prefetch"
        href="https://qshftfehnecovxxgldsc.supabase.co"
      />

      {/* ✅ Preconnect for GA (bedre enn preload av gtag) */}
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

      <link rel="preconnect" href="https://www.google-analytics.com" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />
    </>
  );
}
