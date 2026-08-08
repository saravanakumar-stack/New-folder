function Pipeline({ stage }) {
  const steps = ['DISCOVER', 'EVALUATE', 'MEMORY', 'DECIDE', 'PUBLISH'];
  return (
    <section className="card pipeline-card">
      <div className="pipeline-header">
        <p>Autonomous Pipeline</p>
        <span>{stage}</span>
      </div>
      <div className="pipeline-flow">
        {steps.map((step, index) => (
          <div key={step} className={`pipeline-step ${step === stage || stage.includes(step) ? 'active' : ''}`}>
            <span>{step}</span>
            {index < steps.length - 1 && <span className="pipeline-arrow">↓</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default Pipeline;
