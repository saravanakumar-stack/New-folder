function MemoryPanel({ memory }) {
  return (
    <section className="card memory-card">
      <div className="section-header">
        <h2>Memory Panel</h2>
      </div>
      <div className="memory-grid">
        <div>
          <h3>Published memories</h3>
          {memory.published.length === 0 ? <p className="empty-state">No published memory yet.</p> : (
            <ul>
              {memory.published.map((topic) => (
                <li key={topic._id}>✓ {topic.title}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3>Rejected memories</h3>
          {memory.rejected.length === 0 ? <p className="empty-state">No rejected memory yet.</p> : (
            <ul>
              {memory.rejected.map((entry) => (
                <li key={entry._id}>✕ {entry.topicId?.title || 'Unknown topic'} — {entry.reason}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default MemoryPanel;
