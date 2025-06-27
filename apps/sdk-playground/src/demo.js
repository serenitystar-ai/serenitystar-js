import { codeExamples } from './code-examples';

const demos = [
  {
    group: 'Real-time Assistant',
    demos: [{
      id: 'realtime',
      title: 'Realtime Session Demo',
      description: 'Experience real-time voice interaction with an AI assistant. This demo showcases bidirectional communication and voice processing capabilities.',
      buttons: [
        { id: 'start-session', label: 'Start Session' },
        { id: 'stop-session', label: 'Stop Session' }
      ],
      codeExample: codeExamples.realtime
    }]
  },
  {
    group: 'Assistants',
    demos: [{
      id: 'conversation-sse',
      title: 'Translation with SSE',
      description: 'Watch translations appear in real-time using Server-Sent Events (SSE). Perfect for seeing how streaming responses work in translation tasks.',
      resultId: 'sse-response',
      buttonId: 'start-sse',
      codeExample: codeExamples.conversationSse
    },
    {
      id: 'conversation-normal',
      title: 'Translation without SSE',
      description: 'Traditional translation demo that returns complete responses. Compare this with the SSE version to understand the differences in response handling.',
      resultId: 'normal-response',
      buttonId: 'start-normal',
      codeExample: codeExamples.conversationNormal
    }]
  },
  {
    group: 'Activities',
    demos: [{
      id: 'activity-sse',
      title: 'Text Summarizer with SSE',
      description: 'See text summarization happen in real-time as the AI processes your content chunk by chunk using streaming responses.',
      resultId: 'sse-response-activity',
      buttonId: 'start-sse-activity',
      codeExample: codeExamples.activitySse
    },
    {
      id: 'activity-normal',
      title: 'Text Summarizer without SSE',
      description: 'Get complete text summaries in a single response.',
      resultId: 'normal-response-activity',
      buttonId: 'start-normal-activity',
      codeExample: codeExamples.activityNormal
    },
    {
      id: 'cooking-sse',
      title: 'Cooking with SSE',
      description: 'Watch as recipe instructions and ingredients are generated in real-time. Experience how streaming makes recipe generation feel more interactive.',
      resultId: 'sse-response-cooking',
      buttonId: 'start-sse-cooking',
      codeExample: codeExamples.cookingSse
    },
    {
      id: 'cooking-normal',
      title: 'Cooking without SSE',
      description: 'Receive complete recipe recommendations in one go. Perfect for saving or printing entire recipes at once.',
      resultId: 'normal-response-cooking',
      buttonId: 'start-normal-cooking',
      codeExample: codeExamples.cookingNormal
    }]
  },
  {
    group: 'Chat Completions',
    demos: [{
      id: 'chat-sse',
      title: 'Cooking with SSE',
      description: 'Engage in a streaming conversation about cooking where responses appear word by word, creating a more natural dialogue experience.',
      resultId: 'sse-response-chat',
      buttonId: 'start-sse-chat',
      codeExample: codeExamples.chatSse
    },
    {
      id: 'chat-normal',
      title: 'Cooking without SSE',
      description: 'Have a traditional chat conversation about cooking where responses appear as complete messages. Ideal for quick Q&A sessions.',
      resultId: 'normal-response-chat',
      buttonId: 'start-normal-chat',
      codeExample: codeExamples.chatNormal
    }]
  },
  {
    group: 'Proxies',
    demos: [{
      id: 'proxy-sse',
      title: 'Proxy with SSE',
      description: 'See how proxy agents handle tasks in real-time with streaming responses, showcasing dynamic decision-making and task delegation.',
      resultId: 'sse-response-proxy',
      buttonId: 'start-sse-proxy',
      codeExample: codeExamples.proxySse
    },
    {
      id: 'proxy-normal',
      title: 'Proxy without SSE',
      description: 'Experience proxy agent task handling with complete responses, demonstrating the full decision-making process in one response.',
      resultId: 'normal-response-proxy',
      buttonId: 'start-normal-proxy',
      codeExample: codeExamples.proxyNormal
    }]
  },
  {
    group: 'Plans',
    demos: [{
      id: 'plan-sse',
      title: 'Event Planner with SSE',
      description: 'Watch an AI event planner work in real-time, breaking down event requirements and generating organized plans step by step.',
      resultId: 'sse-response-plan',
      buttonId: 'start-sse-plan',
      codeExample: codeExamples.planSse
    },
    {
      id: 'plan-normal',
      title: 'Event Planner with SSE',
      description: 'Get comprehensive event plans delivered as complete packages. Ideal for quick event planning and organization needs.',
      resultId: 'normal-response-plan',
      buttonId: 'start-normal-plan',
      codeExample: codeExamples.planNormal
    }]
  }
];

function initializeDemos() {
  const demoList = document.querySelector('.demo-list');
  const demoContainer = document.querySelector('.demo-container');

  demos.forEach((group, groupIndex) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'demo-group';
    
    const groupHeader = document.createElement('h3');
    groupHeader.className = 'group-header';
    groupHeader.textContent = group.group;
    groupDiv.appendChild(groupHeader);

    const groupList = document.createElement('ul');
    groupList.className = 'group-list';

    group.demos.forEach((demo, index) => {
      const li = document.createElement('li');
      li.textContent = demo.title;
      li.dataset.demoId = demo.id;
      // Solo resaltar si es el primer elemento del primer grupo
      if (groupIndex === 0 && index === 0) li.classList.add('active');
      groupList.appendChild(li);
    });

    groupDiv.appendChild(groupList);
    demoList.appendChild(groupDiv);
  });

  // Show first demo by default
  showDemo(demos[0].demos[0]);

  demoList.addEventListener('click', (e) => {
    if (e.target.tagName === 'LI') {
      const demo = demos.flatMap(g => g.demos).find(d => d.id === e.target.dataset.demoId);
      if (demo) {
        document.querySelectorAll('.demo-list li').forEach(li => li.classList.remove('active'));
        e.target.classList.add('active');
        showDemo(demo);
      }
    }
  });
}

function showDemo(demo) {
  const demoContainer = document.querySelector('.demo-container');
  
  demoContainer.innerHTML = `
    <h1>${demo.title}</h1>
    <p>${demo.description}</p>
    ${demo.codeExample ? `
      <pre class="code-block"><code class="language-javascript">${demo.codeExample}</code></pre>
    ` : ''}
    ${demo.buttons ? 
      demo.buttons.map(btn => `<button id="${btn.id}" class="run-button">${btn.label}</button>`).join(' ') :
      `<button id="${demo.buttonId}" class="run-button">Run Demo</button>`
    }
    <div class="loading-indicator">Running demo...</div>
    <div id="${demo.resultId || 'result'}" class="result-box"></div>
  `;

  // Initialize syntax highlighting if available
  if (window.hljs) {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }

  // Dispatch an event to notify that the demo content has changed
  window.dispatchEvent(new CustomEvent('demoContentChanged'));
}

document.addEventListener('DOMContentLoaded', initializeDemos);
