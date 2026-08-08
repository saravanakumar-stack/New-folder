function ActivityTimeline({ activity }) {
  return (
    <section className="card activity-card">
      <div className="section-header">
        <h2>Activity Timeline</h2>
      </div>
      <ul className="timeline-list">
        {activity.length === 0 ? (
          <li className="empty-state">No activity recorded yet.</li>
        ) : activity.map((event) => (
          <li key={event._id} className="timeline-item">
            <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
            <div>
              <strong>{event.eventType.replace(/_/g, ' ')}</strong>
              <p>{event.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ActivityTimeline;
