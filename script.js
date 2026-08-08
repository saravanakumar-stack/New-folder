const state = {
  agent: {
    name: 'Ada',
    domain: 'AI Security',
    role: 'Autonomous AI Security Research Analyst',
    status: 'AUTONOMOUS AGENT RUNNING'
  },
  stats: {
    discovered: 38,
    published: 6,
    rejected: 9,
    memory: 23
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
  feed: [
    {
      title: 'New adversarial prompt injection technique exposes vector gaps in large language models',
      editorialScore: 92,
      status: 'Published',
      whySelected: 'This topic reveals a novel attack surface on LLMs that impacts secure deployment and risk mitigation for AI systems.',
      whyRelevant: 'It is critical to developers and security professionals because prompt injection remains one of the most active AI security threat classes.',
      source: 'https://securitynews.example.com/adversarial-prompt-injection'
    },
    {
      title: 'Open-source model update includes hardened safety filters for model inference',
      editorialScore: 86,
      status: 'Published',
      whySelected: 'The update demonstrates concrete engineering improvements for AI model security and safe deployment practices.',
      whyRelevant: 'It pushes the domain forward by showing how vendors can improve guardrails without sacrificing usability.',
      source: 'https://ai-sec.example.com/safe-deployment-update'
    }
  ],
  rejections: [
    {
      topic: 'New celebrity AI wallpaper generator announcement',
      score: 23,
      reason: 'Irrelevant to AI security and outside the configured research domain.',
      createdAt: '08:43'
    },
    {
      topic: 'Duplicate dataset privacy incident coverage',
      score: 44,
      reason: 'Duplicate source detected in recent feed memory; already published similar analysis.',
      createdAt: '08:50'
    },
    {
      topic: 'Low-value opinion piece on chatbot branding',
      score: 32,
      reason: 'Insufficient technical depth for SentinelAI’s security-focused audience.',
      createdAt: '09:08'
    }
  ],
  memory: {
    published: [
      'Prompt injection threat model analysis',
      'Model governance checklist for secure deployment',
      'Adversarial training safeguards for LLMs'
    ],
    rejected: [
      'Irrelevant AI marketing coverage',
      'Duplicate adversarial attack summary'
    ],
    duplicates: [
      'Duplicate source URL prevented from publication'
    ]
  },
  latestDecision: {
    topic: 'New adversarial prompt injection technique exposes vector gaps in large language models',
    score: 92,
    relevance: 'High',
    novelty: 'Strong',
    sourceQuality: 'Trusted AI security research feed',
    decision: 'PUBLISH',
    reason: 'The topic uncovers a recent technical vulnerability pattern with measurable impact on secure AI deployments.'
  },
  activity: [
    { time: '09:18', event: 'Published sentinel security post about prompt injection.' },
    { time: '09:17', event: 'Generated autonomous feed post content.' },
    { time: '09:17', event: 'Selected topic for publication after editorial evaluation.' },
    { time: '09:16', event: 'Memory checked candidate topics for duplicates.' },
    { time: '09:15', event: 'Rejected lower-value candidate topic.' },
    { time: '09:14', event: 'Evaluated candidate topics for AI security relevance.' },
    { time: '09:13', event: 'Discovered new candidate topics from public AI security feeds.' }
  ],
  cycleCandidates: [
    {
      title: 'Emerging LLM jailbreak vector targets system prompt boundaries',
      summary: 'A new jailbreak technique manipulates system prompt context to bypass guardrails in production LLM services.',
      source: 'https://ai-sec.example.com/system-prompt-jailbreak',
      sourceQuality: 'Authoritative security research blog'
    },
    {
      title: 'General AI productivity tool release with privacy focus',
      summary: 'The announcement is primarily marketing-oriented and lacks technical security detail.',
      source: 'https://ai-news.example.com/productivity-release',
      sourceQuality: 'General AI news source'
    },
    {
      title: 'Report on adversarial model extraction risk in open-source environments',
      summary: 'The analysis covers model extraction attacks against open systems and mitigation strategies.',
      source: 'https://securityresearch.example.com/model-extraction',
      sourceQuality: 'Peer-reviewed AI security research'
    }
  ],
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
  elements.nextCycle.textContent = state.nextCycle || '—';
};

const updateCountdown = () => {
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

const updateStats = () => {
  state.stats.discovered += 1;
  state.stats.memory += 1;
  renderStats();
};

const simulateDiscover = () => {
  state.currentStage = 'DISCOVER';
  appendActivity('Discovered candidate AI security topics from feeds.');
  updateStats();
  renderPipeline();
  renderActivity();
};

const simulateEvaluate = () => {
  state.currentStage = 'EVALUATE';
  appendActivity('Evaluated candidates for domain relevance and technical significance.');
  state.stats.rejected += 1;
  renderStats();
  renderPipeline();
  renderActivity();
};

const simulateMemory = () => {
  state.currentStage = 'MEMORY';
  appendActivity('Checked memory and duplicate history for the selected topic.');
  state.memory.duplicates.unshift('Duplicate source URL prevented publication');
  if (state.memory.duplicates.length > 4) state.memory.duplicates.pop();
  renderPipeline();
  renderMemory();
  renderActivity();
};

const simulateDecide = () => {
  state.currentStage = 'DECIDE';
  appendActivity('Decided the highest-value AI security topic to publish.');
  renderPipeline();
  renderActivity();
};

const simulatePublish = () => {
  state.currentStage = 'PUBLISH';
  const candidate = {
    title: 'Emerging LLM jailbreak vector targets system prompt boundaries',
    editorialScore: 91,
    status: 'Published',
    whySelected: 'The candidate exposes a new security vector in system prompt interfaces and has strong relevance for model defenders.',
    whyRelevant: 'This topic is directly aligned with AI security risk mitigation for deployed LLM systems.',
    source: 'https://ai-sec.example.com/system-prompt-jailbreak'
  };
  state.feed.unshift(candidate);
  state.latestDecision = {
    topic: candidate.title,
    score: candidate.editorialScore,
    relevance: 'High',
    novelty: 'Strong',
    sourceQuality: 'Security research source',
    decision: 'PUBLISH',
    reason: 'The topic is a recent AI security exploit pattern with immediate implications for safe model deployment.'
  };
  appendActivity('Published an autonomous posts with complete editorial rationale.');
  state.stats.published += 1;
  state.stats.memory += 1;
  state.memory.published.unshift(candidate.title);
  if (state.memory.published.length > 5) state.memory.published.pop();
  renderPipeline();
  renderFeed();
  renderDecision();
  renderMemory();
  renderActivity();
  renderStats();
};

const simulateAutonomousCycle = async () => {
  if (state.running) return;
  state.running = true;
  elements.runButton.disabled = true;
  elements.runButton.textContent = 'Running Autonomous Cycle...';

  simulateDiscover();
  await new Promise((resolve) => setTimeout(resolve, 800));
  simulateEvaluate();
  await new Promise((resolve) => setTimeout(resolve, 850));
  simulateMemory();
  await new Promise((resolve) => setTimeout(resolve, 800));
  simulateDecide();
  await new Promise((resolve) => setTimeout(resolve, 900));
  simulatePublish();

  elements.runButton.disabled = false;
  elements.runButton.textContent = 'Run Autonomous Cycle';
  state.running = false;
};

const initializeDashboard = () => {
  renderStats();
  renderPipeline();
  renderFeed();
  renderRejections();
  renderMemory();
  renderDecision();
  renderActivity();
  elements.runButton.addEventListener('click', simulateAutonomousCycle);
};

initializeDashboard();
