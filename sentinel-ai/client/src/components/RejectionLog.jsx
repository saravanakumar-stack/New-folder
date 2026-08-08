function RejectionLog({ rejections }) {
  return (
    <section className="card rejection-card">
      <div className="section-header">
        <h2>Editorial Rejection Log</h2>
      </div>
      {rejections.length === 0 ? (
        <p className="empty-state">No rejections recorded yet.</p>
      ) : (
        <div className="rejection-grid">
          {rejections.map((entry) => (
            <div key={entry.id} className="rejection-item">
              <strong>{entry.topic}</strong>
              <span>Score: {entry.score ?? '–'}</span>
              <p>{entry.reason}</p>
              <small>{new Date(entry.createdAt).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default RejectionLog;
