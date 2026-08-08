function Feed({ feed }) {
  return (
    <section className="card feed-card">
      <div className="section-header">
        <h2>Latest Autonomous Posts</h2>
      </div>
      {feed.length === 0 ? (
        <p className="empty-state">No posts published yet. The agent is discovering and evaluating topics.</p>
      ) : (
        feed.map((post) => (
          <article key={post.id} className="post-card">
            <div className="post-meta">
              <span>{new Date(post.createdAt).toLocaleString()}</span>
              <span>Score</span>
              <strong>{post.editorialScore ?? 'N/A'}</strong>
            </div>
            <p className="post-text">{post.text}</p>
            <div className="post-rationale">
              <div>
                <strong>Why selected</strong>
                <p>{post.whySelected}</p>
              </div>
              <div>
                <strong>Why relevant</strong>
                <p>{post.whyRelevant}</p>
              </div>
            </div>
            <div className="post-sources">
              <strong>Sources</strong>
              <ul>
                {post.sources.map((source) => (
                  <li key={source}><a href={source} target="_blank" rel="noreferrer">{source}</a></li>
                ))}
              </ul>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

export default Feed;
