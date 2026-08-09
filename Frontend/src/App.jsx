import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Dashboard from './pages/Dashboard.jsx';

const INITIAL_PERSONA = {
  name: 'Ada',
  domain: 'AI Security'
};

function App() {
  const [agentId, setAgentId] = useState(localStorage.getItem('sentinelAgentId'));
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState([]);
  const [rejections, setRejections] = useState([]);
  const [memory, setMemory] = useState({ published: [], rejected: [] });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiBase = '/api/agent';

  const currentStage = useMemo(() => {
    if (!activity.length) return 'INITIALIZING';
    const latest = activity[0].eventType;
    if (latest.includes('DISCOVERED')) return 'DISCOVERING';
    if (latest.includes('REJECTED')) return 'EVALUATING';
    if (latest.includes('DUPLICATE') || latest.includes('SELECTED')) return 'MEMORY';
    if (latest.includes('POST_PUBLISHED')) return 'PUBLISHING';
    return 'RUNNING';
  }, [activity]);

  const fetchData = async (id) => {
    try {
      const [statusRes, statsRes, feedRes, rejectionsRes, memoryRes, activityRes] = await Promise.all([
        axios.get(`${apiBase}/status`, { params: { agentId: id } }),
        axios.get(`${apiBase}/stats`, { params: { agentId: id } }),
        axios.get(`${apiBase}/feed`, { params: { agentId: id } }),
        axios.get(`${apiBase}/rejections`, { params: { agentId: id } }),
        axios.get(`${apiBase}/memory`, { params: { agentId: id } }),
        axios.get(`${apiBase}/activity`, { params: { agentId: id } })
      ]);
      setStatus(statusRes.data);
      setStats(statsRes.data);
      setFeed(feedRes.data.posts);
      setRejections(rejectionsRes.data.rejects);
      setMemory(memoryRes.data);
      setActivity(activityRes.data.activity);
      setLoading(false);
    } catch (err) {
      setError('Unable to load SentinelAI data.');
      setLoading(false);
    }
  };

  const initializeAgent = async () => {
    try {
      const response = await axios.post(`${apiBase}/init`, { persona: INITIAL_PERSONA });
      const id = response.data.agentId;
      localStorage.setItem('sentinelAgentId', id);
      setAgentId(id);
      return id;
    } catch (err) {
      setError('Agent initialization failed.');
      console.error(err);
      return null;
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      const id = agentId || await initializeAgent();
      if (id) await fetchData(id);
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!agentId) return;
    const interval = setInterval(() => fetchData(agentId), 25000);
    return () => clearInterval(interval);
  }, [agentId]);

  return (
    <div className="app-shell">
      {loading ? (
        <div className="loading-state">Starting SentinelAI Autonomous Feed...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : (
        <Dashboard
          agentId={agentId}
          persona={INITIAL_PERSONA}
          status={status}
          stats={stats}
          feed={feed}
          rejections={rejections}
          memory={memory}
          activity={activity}
          stage={currentStage}
        />
      )}
    </div>
  );
}

export default App;
