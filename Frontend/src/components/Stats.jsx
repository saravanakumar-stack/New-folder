function Stats({ stats }) {
  return (
    <section className="card stats-card">
      <div className="stats-grid">
        <div className="stat-card">
          <span>TOPICS DISCOVERED</span>
          <strong>{stats?.topicsDiscovered ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span>PUBLISHED</span>
          <strong>{stats?.published ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span>REJECTED</span>
          <strong>{stats?.rejected ?? 0}</strong>
        </div>
        <div className="stat-card">
          <span>MEMORY</span>
          <strong>{stats?.memory ?? 0}</strong>
        </div>
      </div>
    </section>
  );
}

export default Stats;
