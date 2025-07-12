// admin-ai-assistant.js
// Combined CSS injector and AI Draft Assistant logic
(function() {
  // Only run on jamesroy.coachlab.io
  if (window.location.host !== 'jamesroy.coachlab.io') return;

  // Inject CSS
  const style = document.createElement('style');
  style.innerHTML = `
    #ai-draft-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 360px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      resize: vertical;
      overflow: hidden;
      background: white;
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 99999;
      font-family: "Inter", sans-serif;
    }
    #ai-tabs { display: flex; gap: 10px; margin-bottom: 10px; }
    .ai-tab { cursor: pointer; padding: 4px 8px; border-radius: 6px; background: #eee; }
    .ai-tab.active { background: #ccc; font-weight: bold; }
    #promptItems { margin-bottom: 10px; max-height: 120px; overflow-y: auto; }
    .prompt-item { margin-bottom: 4px; cursor: pointer; }
    textarea, input[type="text"] { width: 100%; margin-bottom: 10px; }
    textarea { height: 60px; }
    #draftOutput {
      white-space: pre-wrap;
      border-top: 1px solid #ddd;
      padding-top: 10px;
      margin-top: 10px;
      flex-grow: 1;
      overflow-y: auto;
    }
    .btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
    .btn-row button {
      flex: 1 1 30%; min-width: 80px; padding: 6px 8px; font-size: 14px;
    }
    #saveStatus {
      font-size: 0.9em; color: green;
      margin-top: -8px; margin-bottom: 10px; display: none;
    }
  `;
  document.head.appendChild(style);

  // Build panel HTML
  const panel = document.createElement('div');
  panel.id = 'ai-draft-panel';
  panel.innerHTML = `
    <h3>🧠 AI Draft Assistant</h3>
    <div id="ai-tabs">
      <div class="ai-tab active" id="tab-prebuilt">Prebuilt</div>
      <div class="ai-tab" id="tab-custom">My Prompts</div>
    </div>
    <div id="promptItems"></div>
    <input type="text" id="promptName" placeholder="Prompt Name" />
    <textarea id="customPrompt" placeholder="Enter or edit your prompt..."></textarea>
    <div class="btn-row">
      <button onclick="newPrompt()">➕ New</button>
      <button onclick="savePrompt()">💾 Save Prompt</button>
      <button onclick="deletePrompt()">🗑️ Delete</button>
    </div>
    <div id="saveStatus">✅ Prompt saved!</div>
    <label><input type="checkbox" id="useSelectedText" checked> Use selected text</label>
    <label><input type="checkbox" id="usePageContext"> Use full page context if no selection</label>
    <button onclick="generateDraft()" style="margin-top:10px;width:100%">✨ Generate Draft</button>
    <div id="draftOutput"></div>
    <button onclick="copyDraft()">📋 Copy</button>
    <button onclick="replaceSelectedText()">🔁 Replace in page</button>
  `;
  document.body.appendChild(panel);

  // Prebuilt prompts
  const prebuilt = [
    { name: 'Referral Follow-up', text: 'Write a follow-up email asking for a referral from a happy client.' },
    { name: 'Talk Title Generator', text: 'Generate 5 talk titles for a leadership keynote.' },
    { name: 'Speaker Bio', text: 'Write a short bio for a coach focused on mindset.' }
  ];
  let currentPromptIndex = -1;

  // Render prompt items
  function renderPromptItems(tab = 'prebuilt') {
    const container = document.getElementById('promptItems');
    container.innerHTML = '';
    const prompts = tab === 'prebuilt'
      ? prebuilt
      : JSON.parse(localStorage.getItem('customPrompts') || '[]');
    prompts.forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'prompt-item';
      div.textContent = p.name;
      div.onclick = () => {
        document.getElementById('promptName').value = p.name;
        document.getElementById('customPrompt').value = p.text;
        currentPromptIndex = idx;
      };
      container.appendChild(div);
    });
  }

  // Tab handlers
  document.getElementById('tab-prebuilt').onclick = () => {
    document.getElementById('tab-prebuilt').classList.add('active');
    document.getElementById('tab-custom').classList.remove('active');
    renderPromptItems('prebuilt');
  };
  document.getElementById('tab-custom').onclick = () => {
    document.getElementById('tab-custom').classList.add('active');
    document.getElementById('tab-prebuilt').classList.remove('active');
    renderPromptItems('custom');
  };
  renderPromptItems();

  // CRUD functions
  window.newPrompt = () => {
    document.getElementById('promptName').value = '';
    document.getElementById('customPrompt').value = '';
    currentPromptIndex = -1;
  };
  window.savePrompt = () => {
    const name = document.getElementById('promptName').value.trim();
    const text = document.getElementById('customPrompt').value.trim();
    if (!name || !text) return alert('Both name and text required.');
    const saved = JSON.parse(localStorage.getItem('customPrompts') || '[]');
    if (currentPromptIndex >= 0) {
      saved[currentPromptIndex] = { name, text };
    } else {
      saved.push({ name, text });
      currentPromptIndex = saved.length - 1;
    }
    localStorage.setItem('customPrompts', JSON.stringify(saved));
    renderPromptItems('custom');
    const status = document.getElementById('saveStatus');
    status.style.display = 'block';
    setTimeout(() => status.style.display = 'none', 1500);
  };
  window.deletePrompt = () => {
    if (currentPromptIndex < 0) return;
    const saved = JSON.parse(localStorage.getItem('customPrompts') || '[]');
    saved.splice(currentPromptIndex, 1);
    localStorage.setItem('customPrompts', JSON.stringify(saved));
    newPrompt();
    renderPromptItems('custom');
  };

  // Generate draft with content-type check
  window.generateDraft = async () => {
    const output = document.getElementById('draftOutput');
    output.textContent = '⏳ Generating…';
    let prompt = document.getElementById('customPrompt').value;
    const sel = window.getSelection().toString();
    if (document.getElementById('useSelectedText').checked && sel) {
      prompt += `\n\nEdit this: ${sel}`;
    } else if (document.getElementById('usePageContext').checked) {
      const ctx = document.body.innerText.slice(0, 4000);
      prompt += `\n\nHere is the full page context:\n${ctx}`;
    }
    try {
      const res = await fetch('https://24612ab5-abc3-4124-be0a-738610000fe5-00-3acn4r832x9a7.worf.replit.dev/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        output.textContent = data.result || data.error || 'No result.';
      } else {
        const text = await res.text();
        console.error('Expected JSON but got:', text);
        output.textContent = 'Error: unexpected response (see console)';
      }
    } catch (err) {
      console.error('Network error:', err);
      output.textContent = 'Error: ' + err.message;
    }
  };

  // Copy & replace functions
  window.copyDraft = () => {
    navigator.clipboard.writeText(
      document.getElementById('draftOutput').textContent
    );
  };
  window.replaceSelectedText = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const text = document.getElementById('draftOutput').textContent;
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
  };
})();
