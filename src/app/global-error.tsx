"use client";

// Global error boundary — catches errors in the root layout itself. Must render
// its own <html>/<body>. Kept dependency-free and self-contained (inline styles)
// so it works even if the app's CSS failed to load.

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f7f5", color: "#1a1a18" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#6b6b66", maxWidth: 440, marginTop: 8 }}>An unexpected error occurred. Your data is safe. Please try again.</p>
          {error.digest && <p style={{ fontSize: 12, color: "#8a8a84", marginTop: 8 }}>Reference: {error.digest}</p>}
          <button onClick={() => reset()} style={{ marginTop: 20, height: 40, padding: "0 20px", background: "#1B5E20", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
