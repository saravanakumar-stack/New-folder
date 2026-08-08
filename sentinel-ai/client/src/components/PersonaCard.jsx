function PersonaCard({ persona, status }) {
  return (
    <section className="card persona-card">
      <div className="section-header">
        <h2>Persona</h2>
      </div>
      <div className="persona-details">
        <div><strong>Name</strong><span>{persona.name}</span></div>
        <div><strong>Domain</strong><span>{persona.domain}</span></div>
        <div><strong>Role</strong><span>Autonomous AI Security Research Analyst</span></div>
        <div><strong>Writing Style</strong><span>Analytical · Evidence-based · Technical · Concise · Non-clickbait</span></div>
        <div><strong>Audience</strong><span>Developers · AI engineers · Security researchers · Technology professionals</span></div>
      </div>
    </section>
  );
}

export default PersonaCard;
