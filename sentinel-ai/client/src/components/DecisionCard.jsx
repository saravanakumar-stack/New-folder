function DecisionCard({ feed }) {
  const latest = feed[0];
  if (!latest) {
    return (
      <section className="card decision-card">
        <div className="section-header"><h2>Latest Editorial Decision</h2></div>
        <p className="empty-state">Waiting for the first published post to display editorial reasoning.</p>
      </section>
    );
  }

  return (
    <section className="card decision-card">
      <div className="section-header"><h2>Latest Editorial Decision</h2></div>
      <div className="decision-summary">
        <div><strong>Topic</strong><p>{latest.text.substring(0, 120)}…</p></div>
        <div><strong>Decision</strong><p>✓ PUBLISH</p></div>
        <div><strong>Editorial Score</strong><p>{latest.editorialScore ?? 'N/A'}</p></div>
        <div><strong>Source Quality</strong><p>Verified by autonomous AI editorial process.</p></div>
      </div>
      <div className="decision-rationale">
        <div>
          <strong>Why selected</strong>
          <p>{latest.whySelected}</p>
        </div>
        <div>
          <strong>Why relevant</strong>
          <p>{latest.whyRelevant}</p>
        </div>
      </div>
    </section>
  );
}

export default DecisionCard;
