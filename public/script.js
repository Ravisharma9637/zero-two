// Zero Two AI Client-side Controller & Chat Simulator

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  // 2. Dropdown Handling for Touch/Click devices
  const dropdownTriggers = document.querySelectorAll('.dropdown-trigger');
  dropdownTriggers.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.dropdown');
      const wasActive = parent.classList.contains('active');

      // Close other dropdowns
      document.querySelectorAll('.dropdown.active').forEach((d) => {
        if (d !== parent) d.classList.remove('active');
      });

      if (!wasActive) {
        parent.classList.add('active');
      } else {
        parent.classList.remove('active');
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown.active').forEach((d) => d.classList.remove('active'));
  });

  // 3. Health Endpoint Poller
  const statusBadge = document.getElementById('statusBadge');
  const valBot = document.getElementById('valBot');
  const valDb = document.getElementById('valDb');
  const valUptime = document.getElementById('valUptime');
  const pulseIndicator = document.getElementById('pulseIndicator');

  async function checkHealth() {
    try {
      const res = await fetch('/health');
      if (res.ok) {
        const data = await res.json();
        if (statusBadge) statusBadge.textContent = 'ONLINE';
        if (statusBadge) statusBadge.style.color = '#00ff88';
        if (valBot) valBot.textContent = data.bot || 'active';
        if (valDb) valDb.textContent = data.database || 'active';
        if (valUptime) {
          const s = data.uptime || 0;
          valUptime.textContent = `${Math.floor(s / 60)}m ${s % 60}s`;
        }
        if (pulseIndicator) pulseIndicator.style.background = '#00ff88';
      } else {
        if (statusBadge) statusBadge.textContent = 'CONNECTING';
        if (statusBadge) statusBadge.style.color = '#ffaa00';
        if (valBot) valBot.textContent = 'standby';
        if (pulseIndicator) pulseIndicator.style.background = '#ffaa00';
      }
    } catch {
      if (statusBadge) statusBadge.textContent = 'STANDBY';
      if (statusBadge) statusBadge.style.color = '#ff3377';
      if (valBot) valBot.textContent = 'standby';
      if (valDb) valDb.textContent = 'local';
    }
  }

  checkHealth();
  setInterval(checkHealth, 8000);

  // 4. Interactive Chat Simulator
  const simForm = document.getElementById('simForm');
  const simInput = document.getElementById('simInput');
  const simMessages = document.getElementById('simMessages');
  const darlingToggle = document.getElementById('darlingToggle');
  const toggleLabel = document.getElementById('toggleLabel');
  const quickChips = document.querySelectorAll('.quick-chips .chip');

  let simHistory = [];

  if (darlingToggle && toggleLabel) {
    darlingToggle.addEventListener('change', () => {
      if (darlingToggle.checked) {
        toggleLabel.textContent = 'Darling Mode';
        toggleLabel.style.color = 'var(--accent-pink-light)';
      } else {
        toggleLabel.textContent = 'Normal Mode';
        toggleLabel.style.color = 'var(--text-muted)';
      }
    });
  }

  function appendMessage(sender, text, isUser = false) {
    if (!simMessages) return;

    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${isUser ? 'user' : 'bot'}`;

    const senderSpan = document.createElement('span');
    senderSpan.className = 'bubble-sender';
    senderSpan.textContent = sender;

    const p = document.createElement('p');
    p.textContent = text;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'bubble-time';
    const now = new Date();
    timeSpan.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (!isUser) {
      bubble.appendChild(senderSpan);
    }
    bubble.appendChild(p);
    bubble.appendChild(timeSpan);

    simMessages.appendChild(bubble);
    simMessages.scrollTop = simMessages.scrollHeight;
  }

  async function handleSendMessage(rawText) {
    const text = rawText.trim();
    if (!text) return;

    appendMessage('You', text, true);
    if (simInput) simInput.value = '';

    const isDarling = Boolean(darlingToggle && darlingToggle.checked);

    // Temporary thinking bubble
    const typingBubble = document.createElement('div');
    typingBubble.className = 'msg-bubble bot';
    typingBubble.innerHTML = '<span class="bubble-sender">Zero Two</span><p>Thinking... ✨</p>';
    simMessages.appendChild(typingBubble);
    simMessages.scrollTop = simMessages.scrollHeight;

    try {
      const response = await fetch('/api/chat-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: simHistory,
          isDarling,
        }),
      });

      typingBubble.remove();

      if (response.ok) {
        const data = await response.json();
        const reply = data.reply || '...';
        appendMessage('Zero Two', reply, false);

        // Update simulator history
        simHistory.push({ role: 'user', content: text });
        simHistory.push({ role: 'assistant', content: reply });
        if (simHistory.length > 8) {
          simHistory = simHistory.slice(-6);
        }
      } else {
        appendMessage('Zero Two', isDarling ? "Darling, something went wrong on my end 🥺 meowww" : "Error processing message! 😏", false);
      }
    } catch {
      typingBubble.remove();
      appendMessage('Zero Two', isDarling ? "I'm right here with you, Darling~ 💗 meowww" : "Connection glitch! Try again! ✨", false);
    }
  }

  if (simForm && simInput) {
    simForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSendMessage(simInput.value);
    });
  }

  // Quick Chips
  quickChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cmd = chip.getAttribute('data-cmd');
      if (cmd) {
        handleSendMessage(cmd);
      }
    });
  });
});
