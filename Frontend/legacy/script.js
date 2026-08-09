const API_BASE = (() => {
  if (window.location.protocol === 'file:') {
    return 'http://localhost:5000/api/agent';
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${window.location.protocol}//${window.location.hostname}:5000/api/agent`;
  }
  return '/api/agent';
})();
const AGENT_STORAGE_KEY = 'sentinel-ai-agent-id';

const state = {
  agentId: localStorage.getItem(AGENT_STORAGE_KEY),
  agent: {
    name: '-',
    domain: '-',
    minimumScore: 80,
    role: 'Autonomous Research Analyst',
    status: 'UNKNOWN'
  },
  stats: {
    discovered: 0,
    published: 0,
    rejected: 0,
    memory: 0
  },
  pipeline: [
    { step: 'DISCOVER', description: 'Finding fresh AI Security topics', status: 'WAITING', result: 'Awaiting discovery.' },
    { step: 'EVALUATE', description: 'AI editorial scoring', status: 'WAITING', result: 'Awaiting evaluation.' },
    { step: 'MEMORY', description: 'Checking previously published content', status: 'WAITING', result: 'Awaiting memory check.' },
    { step: 'DECIDE', description: 'Publish or reject', status: 'WAITING', result: 'Awaiting decision.' },
    { step: 'PUBLISH', description: 'Generate and store post', status: 'WAITING', result: 'Awaiting publication.' }
  ],
  currentStage: null,
  currentAction: 'Waiting for the next cycle.',
  lastCycle: '—',
  nextCycleAt: null,
  feed: [],
  rejections: [],
  memory: {
    published: [],
    rejected: [],
    duplicates: []
  },
  latestDecision: {
    topic: '—',
    score: '—',
    relevance: '—',
    novelty: '—',
    sourceQuality: '—',
    decision: '—',
    reason: '—'
  },
  activity: [],
  running: false
};

const elements = {
  statsDiscovered: document.querySelector('#topics-discovered'),
  statsPublished: document.querySelector('#published-posts'),
  statsRejected: document.querySelector('#rejected-topics'),
  statsMemory: document.querySelector('#memory-records'),
  pipelineList: document.querySelector('#pipeline-list'),
  feedContainer: document.querySelector('#feed-list'),
  rejectionContainer: document.querySelector('#rejection-list'),
  memoryPublished: document.querySelector('#memory-published'),
  memoryRejected: document.querySelector('#memory-rejected'),
  memoryDuplicates: document.querySelector('#memory-duplicates'),
  decisionTopic: document.querySelector('#decision-topic'),
  decisionScore: document.querySelector('#decision-score'),
  decisionRelevance: document.querySelector('#decision-relevance'),
  decisionNovelty: document.querySelector('#decision-novelty'),
  decisionSource: document.querySelector('#decision-source'),
  decisionOutcome: document.querySelector('#decision-outcome'),
  decisionReason: document.querySelector('#decision-reason'),
  activityContainer: document.querySelector('#activity-list'),
  currentActionMessage: document.querySelector('#current-action-message'),
  lastCycle: document.querySelector('#last-cycle'),
  nextCycle: document.querySelector('#next-cycle'),
  runButton: document.querySelector('#run-cycle')
};

const renderStats = () => {
  elements.statsDiscovered.textContent = state.stats.discovered;
  elements.statsPublished.textContent = state.stats.published;
  elements.statsRejected.textContent = state.stats.rejected;
  elements.statsMemory.textContent = state.stats.memory;
};

const renderPipeline = () => {
  elements.pipelineList.innerHTML = '';
  state.pipeline.forEach((stage) => {
    const stepElement = document.createElement('div');
    stepElement.className = `pipeline-step ${stage.status.toLowerCase()}`;
    let statusMarkup = `<span class="stage-status ${stage.status.toLowerCase()}">${stage.status}</span>`;
    if (stage.status === 'RUNNING') {
      statusMarkup = `<span class="stage-status running"><span class="spinner"></span>RUNNING</span>`;
    } else if (stage.status === 'COMPLETED') {
      statusMarkup = `<span class="stage-status completed">✓ COMPLETED</span>`;
    }

    stepElement.innerHTML = `
      <div>
        <strong>${stage.step}</strong>
        <span class="stage-description">${stage.description}</span>
      </div>
      <div class="stage-meta">
        ${statusMarkup}
        <span class="stage-result">${stage.result}</span>
      </div>
    `;
    elements.pipelineList.appendChild(stepElement);
  });
};

const renderActionPanel = () => {
  elements.currentActionMessage.textContent = state.currentAction;
  elements.lastCycle.textContent = state.lastCycle;
  if (!state.nextCycleAt) {
    elements.nextCycle.textContent = 'Pending';
    return;
  }
  const now = new Date();
  const diff = Math.max(0, Math.floor((state.nextCycleAt - now) / 1000));
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;
  elements.nextCycle.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const updateCountdown = () => {
  renderActionPanel();
};

const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('API fetch failed:', url, error.message);
    return null;
  }
};

const fetchAgentData = async () => {
  if (!state.agentId) return;
  const [statusRes, statsRes, feedRes, rejectionsRes, memoryRes, activityRes, decisionRes] = await Promise.all([
    safeFetch(`${API_BASE}/status?agentId=${state.agentId}`),
    safeFetch(`${API_BASE}/stats?agentId=${state.agentId}`),
    safeFetch(`${API_BASE}/feed?agentId=${state.agentId}`),
    safeFetch(`${API_BASE}/rejections?agentId=${state.agentId}`),
    safeFetch(`${API_BASE}/memory?agentId=${state.agentId}`),
    safeFetch(`${API_BASE}/activity?agentId=${state.agentId}`),
    safeFetch(`${API_BASE}/latest-decision?agentId=${state.agentId}`)
  ]);

  if (statusRes?.status) {
    state.agent.status = statusRes.status;
    state.agent.name = statusRes.persona.name || state.agent.name;
    state.agent.domain = statusRes.persona.domain || state.agent.domain;
    state.agent.minimumScore = statusRes.minimumScore || state.agent.minimumScore;
  }
  if (statsRes) {
    state.stats.discovered = statsRes.discovered ?? state.stats.discovered;
    state.stats.published = statsRes.published ?? state.stats.published;
    state.stats.rejected = statsRes.rejected ?? state.stats.rejected;
    state.stats.memory = statsRes.memory ?? state.stats.memory;
  }
  if (feedRes?.posts) {
    state.feed = feedRes.posts.map((item) => ({
      title: item.text.length > 90 ? item.text.substring(0, 90) + '…' : item.text,
      editorialScore: item.editorialScore ?? 'N/A',
      status: 'Published',
      whySelected: item.whySelected,
      whyRelevant: item.whyRelevant,
      source: item.sources?.[0] || 'Unknown source'
    }));
  }
  if (rejectionsRes?.rejects) {
    state.rejections = rejectionsRes.rejects.map((entry) => ({
      topic: entry.topic,
      score: entry.score,
      reason: entry.reason,
      createdAt: new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  }
  if (memoryRes) {
    state.memory.published = memoryRes.published?.map((item) => item.title) || state.memory.published;
    state.memory.rejected = memoryRes.rejected?.map((item) => item.topic) || state.memory.rejected;
  }
  if (activityRes?.activity) {
    state.activity = activityRes.activity.map((item) => ({
      time: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: item.message
    }));
  }
  if (decisionRes?.topic) {
    state.latestDecision = {
      topic: decisionRes.topic,
      score: decisionRes.score,
      relevance: decisionRes.decision === 'publish' ? 'High' : 'Low',
      novelty: 'N/A',
      sourceQuality: decisionRes.sourceName || 'Unknown source',
      decision: decisionRes.decision?.toUpperCase() || 'N/A',
      reason: decisionRes.reason || ''
    };
  }

  renderStats();
  renderFeed();
  renderRejections();
  renderMemory();
  renderDecision();
  renderActivity();
  renderPipeline();
  renderActionPanel();
  hydrateUI();
};

const hydrateUI = () => {
  document.getElementById('header-persona-name').textContent = state.agent.name;
  document.getElementById('header-persona-domain').textContent = state.agent.domain;
  document.getElementById('header-minimum-score').textContent = `${state.agent.minimumScore}/100`;
  document.getElementById('card-persona-name').textContent = state.agent.name;
  document.getElementById('card-persona-domain').textContent = state.agent.domain;
  document.getElementById('card-minimum-score').textContent = `${state.agent.minimumScore}/100`;
};

const setStageState = (step, status, result) => {
  const stage = state.pipeline.find((stageItem) => stageItem.step === step);
  if (!stage) return;
  stage.status = status;
  if (result !== undefined) stage.result = result;
};

const resetPipeline = () => {
  state.pipeline.forEach((stage) => {
    stage.status = 'WAITING';
    stage.result = `Awaiting ${stage.step.toLowerCase()} stage.`;
  });
  state.currentStage = null;
};

const buildPostItem = (post) => {
  const postElement = document.createElement('article');
  postElement.className = 'post-entry';
  postElement.innerHTML = `
    <div class="post-header">
      <h3>${post.title}</h3>
      <div class="post-meta">
        <span>Score ${post.editorialScore}</span>
        <span>${post.status}</span>
      </div>
    </div>
    <div class="post-body">${post.whySelected}</div>
    <div class="post-rationale">
      <div><strong>Why relevant</strong><p>${post.whyRelevant}</p></div>
      <div class="source-chip">${post.source}</div>
    </div>
  `;
  return postElement;
};

const renderFeed = () => {
  elements.feedContainer.innerHTML = '';
  state.feed.forEach((post) => {
    elements.feedContainer.appendChild(buildPostItem(post));
  });
};

const buildRejectionItem = (entry) => {
  const rejectionElement = document.createElement('article');
  rejectionElement.className = 'rejection-entry';
  rejectionElement.innerHTML = `
    <div class="rejection-header">
      <h3>${entry.topic}</h3>
      <div class="rejection-meta"><span>Score ${entry.score}</span><span>${entry.createdAt}</span></div>
    </div>
    <div class="rejection-body"><strong>Reason</strong><p>${entry.reason}</p></div>
  `;
  return rejectionElement;
};

const renderRejections = () => {
  elements.rejectionContainer.innerHTML = '';
  state.rejections.forEach((entry) => {
    elements.rejectionContainer.appendChild(buildRejectionItem(entry));
  });
};

const renderMemory = () => {
  elements.memoryPublished.innerHTML = '';
  state.memory.published.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `${item} <span>Published</span>`;
    elements.memoryPublished.appendChild(li);
  });

  elements.memoryRejected.innerHTML = '';
  state.memory.rejected.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `${item} <span>Rejected</span>`;
    elements.memoryRejected.appendChild(li);
  });

  elements.memoryDuplicates.innerHTML = '';
  state.memory.duplicates.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `${item} <span>Duplicate</span>`;
    elements.memoryDuplicates.appendChild(li);
  });
};

const renderDecision = () => {
  const decision = state.latestDecision;
  elements.decisionTopic.textContent = decision.topic;
  elements.decisionScore.textContent = decision.score;
  elements.decisionRelevance.textContent = decision.relevance;
  elements.decisionNovelty.textContent = decision.novelty;
  elements.decisionSource.textContent = decision.sourceQuality;
  elements.decisionOutcome.textContent = decision.decision;
  elements.decisionReason.textContent = decision.reason;
};

const renderActivity = () => {
  elements.activityContainer.innerHTML = '';
  state.activity.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'timeline-entry';
    item.innerHTML = `<div class="timeline-time">${entry.time}</div><strong>${entry.event}</strong>`;
    elements.activityContainer.appendChild(item);
  });
};

const appendActivity = (event) => {
  const now = new Date();
  const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  state.activity.unshift({ time: formatted, event });
  if (state.activity.length > 12) state.activity.pop();
};

// Backend-driven pipeline status
const updatePipelineFromActivity = () => {
  const latestEvents = state.activity.map(a => a.event);
  
  // Very simple pipeline mapping based on recent events (simulating the UI effect from real backend logs)
  resetPipeline();
  
  if (latestEvents.some(e => e.includes('Autonomous cycle started'))) {
    setStageState('DISCOVER', 'RUNNING', 'Scanning candidate sources...');
    state.currentAction = 'Finding fresh topics in active feeds.';
  }
  if (latestEvents.some(e => e.includes('Discovered'))) {
    setStageState('DISCOVER', 'COMPLETED', 'Topics found');
    setStageState('EVALUATE', 'RUNNING', 'Analyzing candidate quality...');
  }
  if (latestEvents.some(e => e.includes('Evaluated') || e.includes('Scoring'))) {
    setStageState('EVALUATE', 'COMPLETED', 'Evaluation done');
    setStageState('MEMORY', 'RUNNING', 'Checking history and existing content...');
  }
  if (latestEvents.some(e => e.includes('Memory checked') || e.includes('Duplicate'))) {
    setStageState('MEMORY', 'COMPLETED', 'Checks complete');
    setStageState('DECIDE', 'RUNNING', 'Applying editorial rules...');
  }
  if (latestEvents.some(e => e.includes('Selected topic') || e.includes('Rejected'))) {
    setStageState('DECIDE', 'COMPLETED', 'Decision made');
    setStageState('PUBLISH', 'RUNNING', 'Generating post...');
  }
  if (latestEvents.some(e => e.includes('Published selected topic') || e.includes('Generated published post') || e.includes('Autonomous cycle completed'))) {
    setStageState('PUBLISH', 'COMPLETED', 'Workflow finished');
    state.currentAction = 'Autonomous cycle completed successfully.';
  }
};

const pushBackendCycle = async () => {
  if (state.running || !state.agentId) return;
  state.running = true;
  elements.runButton.disabled = true;
  elements.runButton.textContent = 'Triggering Cycle...';
  
  try {
    await safeFetch(`${API_BASE}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: { name: state.agent.name, domain: state.agent.domain } })
    });
  } catch (error) {
    console.error('Failed to trigger backend cycle');
  }

  setTimeout(() => {
    elements.runButton.disabled = false;
    elements.runButton.textContent = 'Run Autonomous Cycle';
    state.running = false;
  }, 3000);
};

const showSuccessPanel = (agentId, agentName, agentDomain, minimumScore) => {
  const successOverlay = document.createElement('div');
  successOverlay.className = 'modal-overlay';
  successOverlay.innerHTML = `
    <div class="modal-card success-card">
      <h2>Agent Created Successfully</h2>
      <p style="margin: 20px 0; color: #6da0ff; text-align: center;">✓</p>
      <div class="success-details">
        <div class="detail-row">
          <span class="detail-label">Agent Name</span>
          <span class="detail-value">${agentName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Domain</span>
          <span class="detail-value">${agentDomain}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Minimum Score</span>
          <span class="detail-value">${minimumScore}/100</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Agent ID</span>
          <span class="detail-value" style="font-family: monospace; font-size: 0.85rem;">${agentId}</span>
        </div>
      </div>
      <div class="success-links">
        <h4>Access Link</h4>
        <div class="access-link-container">
          <input type="text" id="access-link-input" readonly value="${window.location.origin}${window.location.pathname}?agentId=${agentId}" style="width: 100%; padding: 10px; border: 1px solid rgba(116, 151, 249, 0.3); border-radius: 8px; background: rgba(0, 0, 0, 0.2); color: #e9eef8; font-family: monospace; font-size: 0.85rem; margin-bottom: 12px;">
          <div style="display: flex; gap: 12px;">
            <button id="copy-link-btn" class="primary-button" style="flex: 1;">Copy Link</button>
            <button id="open-dashboard-btn" class="primary-button" style="flex: 1;">Open Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(successOverlay);

  const copyBtn = document.getElementById('copy-link-btn');
  const dashboardBtn = document.getElementById('open-dashboard-btn');
  const accessLinkInput = document.getElementById('access-link-input');

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(accessLinkInput.value);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Link';
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      accessLinkInput.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Link';
      }, 2000);
    }
  });

  dashboardBtn.addEventListener('click', () => {
    successOverlay.remove();
  });
};

const showAgentNotFoundError = () => {
  const errorOverlay = document.createElement('div');
  errorOverlay.className = 'modal-overlay';
  errorOverlay.innerHTML = `
    <div class="modal-card error-card">
      <h2>Agent Not Found</h2>
      <p style="margin: 20px 0; text-align: center;">The agent you're looking for doesn't exist or is no longer available.</p>
      <p style="text-align: center; color: #b8c6df; font-size: 0.9rem;">Please create a new agent to get started.</p>
      <button id="create-new-agent-btn" class="primary-button full-width" style="margin-top: 20px;">Create New Agent</button>
    </div>
  `;
  document.body.appendChild(errorOverlay);

  const createNewBtn = document.getElementById('create-new-agent-btn');
  createNewBtn.addEventListener('click', () => {
    errorOverlay.remove();
    // Clear URL
    window.history.replaceState({}, document.title, window.location.pathname);
    localStorage.removeItem(AGENT_STORAGE_KEY);
    state.agentId = null;
    initOverlay.style.display = 'flex';
    appShell.style.display = 'none';
  });
};

const initOverlay = document.getElementById('init-overlay');
const appShell = document.querySelector('.app-shell');
const agentDomainSelect = document.getElementById('agent-domain');
const customDomainGroup = document.getElementById('custom-domain-group');
const createAgentBtn = document.getElementById('create-agent-btn');
const errorMsg = document.getElementById('init-error');

if (agentDomainSelect) {
  agentDomainSelect.addEventListener('change', (e) => {
    if (e.target.value === 'Custom Domain') {
      customDomainGroup.style.display = 'block';
    } else {
      customDomainGroup.style.display = 'none';
    }
  });
}

const minimumScoreSlider = document.getElementById('minimum-score');
const scoreDisplay = document.getElementById('score-display');
if (minimumScoreSlider) {
  minimumScoreSlider.addEventListener('change', (e) => {
    scoreDisplay.textContent = `${e.target.value}/100`;
  });
  minimumScoreSlider.addEventListener('input', (e) => {
    scoreDisplay.textContent = `${e.target.value}/100`;
  });
}

if (createAgentBtn) {
  createAgentBtn.addEventListener('click', async () => {
    const name = document.getElementById('agent-name').value.trim();
    let domain = agentDomainSelect.value;
    if (domain === 'Custom Domain') {
      domain = document.getElementById('custom-domain').value.trim();
    }
    const minimumScore = parseInt(minimumScoreSlider.value, 10);
    
    if (!name || !domain) {
      errorMsg.style.display = 'block';
      errorMsg.textContent = 'Please provide both a name and a domain.';
      return;
    }
    errorMsg.style.display = 'none';
    createAgentBtn.disabled = true;
    createAgentBtn.textContent = 'Initializing...';
    
    try {
      const response = await fetch(`${API_BASE}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          persona: { name, domain },
          minimumScore 
        })
      });
      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      
      if (data.agentId) {
        state.agentId = data.agentId;
        state.agent.minimumScore = minimumScore;
        localStorage.setItem(AGENT_STORAGE_KEY, state.agentId);
        
        // Show success panel with access link
        showSuccessPanel(data.agentId, name, domain, minimumScore);
        
        initOverlay.style.display = 'none';
        appShell.style.display = 'block';
        state.currentAction = 'Agent initialized. Synchronizing backend state.';
        await fetchAgentData();
      }
    } catch (err) {
      errorMsg.style.display = 'block';
      errorMsg.textContent = 'Failed to create agent properly.';
      createAgentBtn.disabled = false;
      createAgentBtn.textContent = 'Create Autonomous Agent';
    }
  });
}

const initializeDashboard = async () => {
  elements.runButton.addEventListener('click', async () => {
    await pushBackendCycle();
    await fetchAgentData();
  });

  // Check URL parameters for agentId
  const urlParams = new URLSearchParams(window.location.search);
  const urlAgentId = urlParams.get('agentId');

  const agentToUse = urlAgentId || state.agentId;

  if (agentToUse) {
    state.agentId = agentToUse;
    // Verify agent exists
    try {
      const statusRes = await safeFetch(`${API_BASE}/status?agentId=${agentToUse}`);
      if (statusRes) {
        // Agent exists, show dashboard
        if (!urlAgentId) {
          // Only update localStorage if we got agentId from there, not from URL
          localStorage.setItem(AGENT_STORAGE_KEY, agentToUse);
        }
        initOverlay.style.display = 'none';
        appShell.style.display = 'block';
        state.currentAction = 'Agent recovered. Synchronizing backend state.';
        await fetchAgentData();
      } else {
        // Agent not found
        showAgentNotFoundError();
        initOverlay.style.display = 'flex';
        appShell.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to verify agent:', error);
      showAgentNotFoundError();
      initOverlay.style.display = 'flex';
      appShell.style.display = 'none';
    }
  } else {
    // Show configuration prompt
    initOverlay.style.display = 'flex';
    appShell.style.display = 'none';
  }

  setInterval(() => {
    if (state.agentId) {
      fetchAgentData().then(() => {
        updatePipelineFromActivity();
      });
    }
    renderActionPanel();
  }, 5000);
};

initializeDashboard();
