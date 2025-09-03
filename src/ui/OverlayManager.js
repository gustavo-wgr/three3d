// Minimal DOM-based overlay manager with a tiny event system.
// Exposes: on/off, showSurveyOverlay, showAttrakDiff, showThankYou

export class OverlayManager {
  constructor() {
    this.listeners = new Map(); // event -> Set<fn>
    this.container = null;
    this.activeView = null; // 'survey' | 'attrak' | 'thanks' | null
    this.ensureStyles();
  }

  // ======== Event Emitter ========
  on(eventName, handler) {
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set());
    this.listeners.get(eventName).add(handler);
  }

  off(eventName, handler) {
    const set = this.listeners.get(eventName);
    if (set) set.delete(handler);
  }

  emit(eventName, payload) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); } catch (_) {}
    }
  }

  // ======== Public API ========
  showSurveyOverlay(questions, contextProvider) {
    this.activeView = 'survey';
    this.mountContainer();
    const title = this.el('div', 'om-title', 'Quick Survey');
    const form = this.el('form', 'om-form');
    const fields = [];

    (questions || []).forEach((q, idx) => {
      const row = this.el('div', 'om-row');
      const label = this.el('label', 'om-label', `${q.text || q.key || 'Question'} `);
      const input = this.createScaleInput(1, 7, 4);
      input.name = q.key || `q${idx+1}`;
      const hint = this.el('div', 'om-hint', `${q.left || 'low'} — ${q.right || 'high'}`);
      row.appendChild(label); row.appendChild(input); row.appendChild(hint);
      form.appendChild(row);
      fields.push(input);
    });

    const actions = this.el('div', 'om-actions');
    const submitBtn = this.el('button', 'om-btn', 'Submit');
    submitBtn.type = 'submit';
    actions.appendChild(submitBtn);
    form.appendChild(actions);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {};
      fields.forEach((inp) => { payload[inp.name] = Number(inp.value); });
      try {
        if (typeof contextProvider === 'function') {
          const ctx = contextProvider();
          if (ctx && typeof ctx === 'object') Object.assign(payload, { __context: ctx });
        }
      } catch (_) {}
      this.hide();
      this.emit('surveySubmit', payload);
    });

    this.container.appendChild(title);
    this.container.appendChild(form);
    this.show();
  }

  showAttrakDiff() {
    this.activeView = 'attrak';
    this.mountContainer();
    const title = this.el('div', 'om-title', 'AttrakDiff (short)');
    const form = this.el('form', 'om-form');
    const statements = [
      { key: 'pragmatic', text: 'Pragmatic Quality', left: 'impractical', right: 'practical' },
      { key: 'hedonicStimulation', text: 'Hedonic: Stimulation', left: 'dull', right: 'exciting' },
      { key: 'hedonicIdentity', text: 'Hedonic: Identity', left: 'isolating', right: 'connecting' },
      { key: 'attractiveness', text: 'Attractiveness', left: 'unappealing', right: 'appealing' }
    ];

    const fields = [];
    statements.forEach((s, idx) => {
      const row = this.el('div', 'om-row');
      const label = this.el('label', 'om-label', s.text);
      const input = this.createScaleInput(1, 7, 4);
      input.name = s.key || `a${idx+1}`;
      const hint = this.el('div', 'om-hint', `${s.left} — ${s.right}`);
      row.appendChild(label); row.appendChild(input); row.appendChild(hint);
      form.appendChild(row);
      fields.push(input);
    });

    const actions = this.el('div', 'om-actions');
    const submitBtn = this.el('button', 'om-btn', 'Finish');
    submitBtn.type = 'submit';
    actions.appendChild(submitBtn);
    form.appendChild(actions);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {};
      fields.forEach((inp) => { payload[inp.name] = Number(inp.value); });
      this.hide();
      this.emit('attrakSubmit', payload);
    });

    this.container.appendChild(title);
    this.container.appendChild(form);
    this.show();
  }

  showThankYou() {
    this.activeView = 'thanks';
    this.mountContainer();
    const msg = this.el('div', 'om-title', 'Thank you!');
    const sub = this.el('div', 'om-sub', 'Your responses have been recorded.');
    const close = this.el('button', 'om-btn', 'Close');
    close.addEventListener('click', () => this.hide());
    const actions = this.el('div', 'om-actions');
    actions.appendChild(close);
    this.container.appendChild(msg);
    this.container.appendChild(sub);
    this.container.appendChild(actions);
    this.show();
  }

  // ======== Internals ========
  mountContainer() {
    this.unmount();
    const el = document.createElement('div');
    el.className = 'om-container';
    this.container = el;
    document.body.appendChild(el);
  }

  unmount() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  hide() {
    this.unmount();
    this.activeView = null;
  }

  show() {
    if (this.container) this.container.style.display = 'flex';
  }

  createScaleInput(min, max, value) {
    const wrap = this.el('div', 'om-scale');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.step = '1';
    const ticks = this.el('div', 'om-ticks');
    for (let i = min; i <= max; i++) {
      const t = this.el('span', 'om-tick', String(i));
      ticks.appendChild(t);
    }
    wrap.appendChild(input);
    wrap.appendChild(ticks);
    // Return input, but keep the scale wrapper in DOM via parent caller
    // Callers append input directly; we keep wrapper by replacing input.parent later
    // Simpler: return the input but insert ticks next to it (sibling) in caller
    // For clarity, we just return the input and rely on caller layout.
    return input;
  }

  el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (typeof text === 'string') e.textContent = text;
    return e;
  }

  ensureStyles() {
    if (document.getElementById('om-styles')) return;
    const style = document.createElement('style');
    style.id = 'om-styles';
    style.textContent = `
      .om-container { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; z-index: 99999; }
      .om-container::before { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(2px); }
      .om-title { position: relative; color: #fff; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center; }
      .om-sub { position: relative; color: #ddd; font-size: 14px; margin-bottom: 16px; text-align: center; }
      .om-form { position: relative; width: min(560px, 92vw); background: rgba(20,20,20,0.95); border: 1px solid #333; border-radius: 10px; padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
      .om-row { display: grid; grid-template-columns: 1fr; gap: 6px; margin-bottom: 12px; }
      .om-label { color: #eaeaea; font-size: 14px; }
      .om-hint { color: #a8a8a8; font-size: 12px; }
      .om-actions { display: flex; justify-content: center; gap: 8px; margin-top: 8px; }
      .om-btn { cursor: pointer; padding: 8px 14px; border-radius: 8px; background: #4a74ff; color: #fff; border: none; font-weight: 600; }
      .om-btn:hover { background: #3b5ee0; }
      .om-scale { display: flex; flex-direction: column; gap: 4px; }
      .om-scale input[type=range] { width: 100%; }
      .om-ticks { display: flex; justify-content: space-between; color: #888; font-size: 10px; }
    `;
    document.head.appendChild(style);
  }
}


