function Header({ persona, status }) {
  return (
    <section className="card header-card">
      <div>
        <p className="eyebrow">SENTINEL AI</p>
        <h1>Autonomous AI Security Research Agent</h1>
        <p className="subtext">An autonomous security research analyst that discovers, evaluates, remembers and publishes.</p>
      </div>
      <div className="status-pill">
        <span className="status-dot"></span>
        <span>AUTONOMOUS AGENT RUNNING</span>
      </div>
      <div className="persona-summary">
        <div>
          <strong>Persona:</strong> {persona.name}
        </div>
        <div>
          <strong>Domain:</strong> {persona.domain}
        </div>
      </div>
    </section>
  );
}

export default Header;
