export default function Home() {
  return (
    <main style={{ fontFamily: "monospace", padding: "2rem", maxWidth: "600px" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>shieldcn engine</h1>
      <p style={{ color: "#888", marginBottom: "1.5rem" }}>
        Self-hosted badge rendering engine is running.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <a href="/npm/v/react.svg" style={{ color: "#3b82f6" }}>/npm/v/react.svg</a>
        <a href="/github/stars/facebook/react.svg" style={{ color: "#3b82f6" }}>/github/stars/facebook/react.svg</a>
        <a href="/badge/self--hosted-green.svg" style={{ color: "#3b82f6" }}>/badge/self--hosted-green.svg</a>
        <a href="/api/health" style={{ color: "#3b82f6" }}>/api/health</a>
      </div>
    </main>
  )
}
