// Minimal DOM-based overlay manager with a tiny event system.
// Exposes: on/off, showSurveyOverlay, showAttrakDiff, showThankYou

export class OverlayManager {
  constructor() {
    this.listeners = new Map(); // event -> Set<fn>
    this.container = null;
    this.activeView = null; // 'survey' | 'attrak' | 'thanks' | null
    // Default survey questions live here to keep UI logic centralized
    this.surveyQuestions = [
      { key: 'qOverall', text: 'How do you rate the overall visual quality of these models?', left: 'very poor', right: 'excellent', summary: 'QUALITY' },
      { key: 'q4', text: 'How authentic did you find the pictures you looked at?', left: 'not authentic at all', right: 'very authentic', summary: 'AUTHENTICITY' },
      { key: 'q5', text: 'How detailed were you able to perceive the pictures?', left: 'not at all detailed', right: 'very detailed', summary: 'DETAILS' },
      { key: 'q6', text: 'How strongly did you feel immersed in the scene of the pictures?', left: 'not at all', right: 'very much', summary: 'IMMERSION' }
    ];
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
  // showSurveyOverlay can be called as:
  // - showSurveyOverlay(contextProvider)
  // - showSurveyOverlay(questionsArray, contextProvider) [legacy]
  showSurveyOverlay(arg1, arg2) {
    let questions;
    let contextProvider;
    if (Array.isArray(arg1)) {
      questions = arg1;
      contextProvider = arg2;
    } else if (typeof arg1 === 'function') {
      questions = this.surveyQuestions;
      contextProvider = arg1;
    } else {
      questions = this.surveyQuestions;
      contextProvider = undefined;
    }
    this.activeView = 'survey';
    this.mountContainer();
    const form = this.el('form', 'om-form');
    form.classList.add('survey');
    const fields = [];
    // Compute dynamic title using contextProvider if available
    let blockTitle = 'Block';
    try {
      if (typeof contextProvider === 'function') {
        const ctx = contextProvider();
        if (ctx && typeof ctx === 'object') {
          const idx = (typeof ctx.sequenceIndex === 'number') ? (ctx.sequenceIndex + 1) : null;
          blockTitle = idx ? `Block ${idx}` : 'Block';
        }
      }
    } catch (_) {}
    const titleEl = this.el('div', 'om-title', blockTitle);
    form.appendChild(titleEl);

    (questions || []).forEach((q, idx) => {
      const row = this.el('div', 'om-row');
      // Big category headline (e.g., QUALITY, AUTHENTICITY)
      const category = this.el('div', 'om-cat', String((q.summary || q.key || '').toString().toUpperCase()));
      // Smaller subtitle with the question text
      const subtitle = this.el('div', 'om-qtext', q.text || q.key || 'Question');
      // Left/Right labels properly aligned
      const pair = this.el('div', 'om-pair');
      const leftEl = this.el('span', 'om-left', q.left || 'low');
      const rightEl = this.el('span', 'om-right', q.right || 'high');
      pair.appendChild(leftEl);
      pair.appendChild(rightEl);
      // Choices
      const { element: chooserEl, input } = this.createScaleInput(1, 7, null);
      input.name = q.key || `q${idx+1}`;
      // Compose
      const head = this.el('div', 'om-head');
      head.appendChild(category);
      head.appendChild(subtitle);
      row.appendChild(head);
      row.appendChild(chooserEl);
      row.appendChild(pair);
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

    this.container.appendChild(form);
    this.show();
  }

  // Allow external configuration of survey questions if needed
  setSurveyQuestions(questions) {
    if (Array.isArray(questions)) {
      this.surveyQuestions = questions;
    }
  }

  showAttrakDiff() {
    this.activeView = 'attrak';
    this.mountContainer();
    const form = this.el('form', 'om-form');
    form.classList.add('attrak');
    const titleEl = this.el('div', 'om-title', 'Thank you!');
    const subEl = this.el('div', 'om-sub', 'You finished the experiment. Before leaving, please answer this form about how you rate your experience in the WHOLE experiment, about ALL the models you saw today.');
    const statements = [
      { key: 'impractical_practical', text: 'Impractical — Practical', left: 'impractical', right: 'practical' },
      { key: 'unpredictable_predictable', text: 'Unpredictable — Predictable', left: 'unpredictable', right: 'predictable' },
      { key: 'confusing_structured', text: 'Confusing — Clearly structured', left: 'confusing', right: 'clearly structured' },
      { key: 'tacky_stylish', text: 'Tacky — Stylish', left: 'tacky', right: 'stylish' },
      { key: 'cheap_premium', text: 'Cheap — Premium', left: 'cheap', right: 'premium' },
      { key: 'unimaginative_creative', text: 'Unimaginative — Creative', left: 'unimaginative', right: 'creative' },
      { key: 'dull_captivating', text: 'Dull — Captivating', left: 'dull', right: 'captivating' },
      { key: 'ugly_attractive', text: 'Ugly — Attractive', left: 'ugly', right: 'attractive' },
      { key: 'bad_good', text: 'Bad — Good', left: 'bad', right: 'good' }
    ];

    const fields = [];
    form.appendChild(titleEl);
    form.appendChild(subEl);
    statements.forEach((s, idx) => {
      const row = this.el('div', 'om-row');
      const pair = this.el('div', 'om-pair');
      const leftEl = this.el('span', 'om-left', s.left);
      const rightEl = this.el('span', 'om-right', s.right);
      pair.appendChild(leftEl);
      pair.appendChild(rightEl);
      const { element: chooserEl, input } = this.createScaleInput(1, 7, null);
      input.name = s.key || `a${idx+1}`;
      row.appendChild(chooserEl);
      row.appendChild(pair);
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
    // VR-friendly choice buttons (1..7) with a hidden input as form value source
    const wrap = this.el('div', 'om-choices');
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.value = (value == null ? '' : String(value));
    const updateSelected = (val) => {
      hidden.value = String(val);
      const buttons = wrap.querySelectorAll('.om-choice-btn');
      buttons.forEach((b) => {
        if (b.dataset && b.dataset.value === String(val)) b.classList.add('selected');
        else b.classList.remove('selected');
      });
    };
    for (let i = min; i <= max; i++) {
      const btn = this.el('button', 'om-choice-btn', String(i));
      btn.type = 'button';
      btn.setAttribute('data-value', String(i));
      btn.addEventListener('click', () => updateSelected(i));
      wrap.appendChild(btn);
    }
    // Do not preselect any value if value is null/undefined
    if (value != null) { updateSelected(value); }
    wrap.appendChild(hidden);
    return { element: wrap, input: hidden };
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
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
      .om-container, .om-container * { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; }
      .om-container { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; z-index: 99999; }
      .om-container::before { content: ''; position: absolute; inset: 0; background: radial-gradient(1200px 800px at 50% 50%, rgba(40,40,52,0.9), rgba(10,10,14,0.96)); backdrop-filter: blur(5px); }
      .om-title { position: relative; color: #fff; font-size: 38px; font-weight: 800; margin-bottom: 20px; text-align: center; letter-spacing: 0.6px; text-shadow: 0 1px 0 rgba(0,0,0,0.3); }
      .om-sub { position: relative; color: #cfd2dc; font-size: 20px; margin-bottom: 28px; text-align: center; }
      .om-form { position: relative; width: min(1100px, 98vw); max-height: min(92vh, 1200px); overflow: auto; background: linear-gradient(180deg, rgba(28,28,34,0.96), rgba(20,20,26,0.96)); border: 1px solid rgba(255,255,255,0.12); border-radius: 22px; padding: 26px 26px 28px; box-shadow: 0 28px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06); }
      .om-form.attrak { width: min(1080px, 98vw); max-height: min(92vh, 1180px); }
      .om-row { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 18px; }
      .om-label { color: #f6f7fb; font-size: 27px; font-weight: 900; line-height: 1.35; }
      .om-sub { font-size: 22px; color: #cfd6e6; margin-top: -10px; margin-bottom: 16px; }
      .om-pair { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 10px; }
      .om-left { color: #b3bac9; font-size: 21px; font-weight: 800; justify-self: start; }
      .om-right { color: #b3bac9; font-size: 21px; font-weight: 800; justify-self: end; }
      .om-actions { display: flex; justify-content: center; gap: 18px; margin-top: 18px; }
      .om-btn { cursor: pointer; padding: 18px 26px; border-radius: 18px; background: #5b7cfa; color: #fff; border: none; font-weight: 900; letter-spacing: 0.4px; font-size: 24px; box-shadow: 0 16px 30px rgba(91,124,250,0.45); }
      .om-btn:hover { background: #4a6aea; }
      .om-btn:active { transform: translateY(1px); }
      .om-choices { display: grid; grid-template-columns: repeat(7, minmax(64px, 1fr)); gap: 12px; }
      .om-choice-btn { cursor: pointer; height: 64px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.16); background: radial-gradient(120px 90px at 50% 30%, rgba(255,255,255,0.12), rgba(255,255,255,0.03)); color: #e8ecf5; font-size: 22px; font-weight: 900; letter-spacing: 0.35px; box-shadow: 0 12px 22px rgba(0,0,0,0.30); outline: none; }
      .om-choice-btn:hover { border-color: rgba(255,255,255,0.25); }
      .om-choice-btn:focus-visible { box-shadow: 0 0 0 3px rgba(255,255,255,0.35), 0 10px 20px rgba(0,0,0,0.28); }
      .om-choice-btn.selected { background: linear-gradient(180deg, #6ea2ff, #4a74ff); color: #fff; border-color: rgba(255,255,255,0.38); box-shadow: 0 14px 26px rgba(74,116,255,0.5); }
      @media (hover: none) and (pointer: coarse) { .om-choice-btn { height: 72px; font-size: 24px; } .om-btn { padding: 20px 30px; font-size: 26px; } }
      /* Survey-specific readability tweaks */
      .om-form.survey .om-hint { color: #e3e8f5; font-size: 20px; line-height: 1.4; margin-top: 2px; }
      .om-form.survey .om-label { font-size: 24px; }
      .om-form.survey .om-cat { color: #ffffff; font-size: 34px; font-weight: 900; letter-spacing: 0.6px; margin: 0; }
      .om-form.survey .om-qtext { color: #cfd6e6; font-size: 16px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .om-form.survey .om-head { display: flex; align-items: baseline; gap: 10px; }
      .om-form.survey .om-row { gap: 6px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .om-form.attrak .om-row { gap: 6px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    `;
    document.head.appendChild(style);
  }
}


