import Header from '../components/Header.jsx';
import Stats from '../components/Stats.jsx';
import Pipeline from '../components/Pipeline.jsx';
import Feed from '../components/Feed.jsx';
import RejectionLog from '../components/RejectionLog.jsx';
import MemoryPanel from '../components/MemoryPanel.jsx';
import DecisionCard from '../components/DecisionCard.jsx';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import PersonaCard from '../components/PersonaCard.jsx';

function Dashboard({ persona, status, stats, feed, rejections, memory, activity, stage }) {
  return (
    <main className="dashboard-grid">
      <Header persona={persona} status={status} />
      <Stats stats={stats} />
      <Pipeline stage={stage} />
      <PersonaCard persona={persona} status={status} />
      <Feed feed={feed} />
      <DecisionCard feed={feed} />
      <RejectionLog rejections={rejections} />
      <MemoryPanel memory={memory} />
      <ActivityTimeline activity={activity} />
    </main>
  );
}

export default Dashboard;
