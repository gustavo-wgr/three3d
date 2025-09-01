import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { XRButton } from "three/addons/webxr/XRButton.js";

export class SceneSetup {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.backgroundSphere = null;
    this.isBackgroundVisible = false;
    this.isInXRSession = false;
    this.xrBlackBackgroundEnabled = false;
    this.coloredBackgroundEnabled = false;
    this.coloredBackgroundColor = new THREE.Color(0x000000);
    this.onSurveyCompleted = null; // Callback for when survey is completed
    this.allSurveyResults = []; // Aggregate of all survey payloads
    this.surveyMetadataProvider = null; // Optional provider for extra context per submission
    this.debugHideOverlays = false; // When true, suppress overlays for debugging
    this.attrakDiffDone = false; // Ensure AttrakDiff is shown only once at end
    this.dataCollector = null; // External data collector for submissions
    this.trainingMode = false; // When true, show training completion instead of survey
  }

  setDataCollector(collector) {
    this.dataCollector = collector || null;
  }

  initialize() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = null; // Always transparent

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 3);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Create background sphere
    this.createBackgroundSphere();

    // Add XR button
    this.sessionInit = {
      requiredFeatures: ["hand-tracking"],
      optionalFeatures: ["local-floor", "bounded-floor", "local", "viewer", "layers"]
    };
    // Prefer local-floor when available
    if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setReferenceSpaceType === 'function') {
      this.renderer.xr.setReferenceSpaceType('local-floor');
    }
    document.body.appendChild(XRButton.createButton(this.renderer, this.sessionInit));

    // Setup XR event listeners
    this.setupXREvents();

    // Prepare survey overlay (hidden by default)
    this.createSurveyOverlay();

    // Prepare welcome overlay and show it by default (hidden once XR starts)
    this.createWelcomeOverlay();
    this.showWelcomeOverlay();

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.0, 0);
    this.controls.update();

    // Lighting
    this.setupLighting();

    // Window resize handler
    window.addEventListener("resize", this.onWindowResize.bind(this), false);
  }

  async startXRSession() {
    try {
      if (navigator.xr && navigator.xr.requestSession) {
        if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setReferenceSpaceType === 'function') {
          this.renderer.xr.setReferenceSpaceType('local-floor');
        }
        const session = await navigator.xr.requestSession('immersive-vr', this.sessionInit || { requiredFeatures: ["hand-tracking"], optionalFeatures: ["local-floor", "local"] });
        if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setSession === 'function') {
          await this.renderer.xr.setSession(session);
          return true;
        }
        return false;
      } else {
        console.warn('WebXR not available to start session programmatically');
        return false;
      }
    } catch (e) {
      // Fallback: try switching to 'local' reference space
      try {
        if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setReferenceSpaceType === 'function') {
          this.renderer.xr.setReferenceSpaceType('local');
        }
        const fallbackInit = Object.assign({}, this.sessionInit || {}, { optionalFeatures: ["local", "viewer"] });
        const session = await navigator.xr.requestSession('immersive-vr', fallbackInit);
        if (this.renderer && this.renderer.xr && typeof this.renderer.xr.setSession === 'function') {
          await this.renderer.xr.setSession(session);
          return true;
        }
      } catch (e2) {
        console.warn('Failed to start XR session programmatically', e2);
      }
      return false;
    }
  }

  createBackgroundSphere() {
    const geometry = new THREE.SphereGeometry(50, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1.0,
    });
    this.backgroundSphere = new THREE.Mesh(geometry, material);
    this.backgroundSphere.position.set(0, 1.6, 0);
    this.scene.add(this.backgroundSphere);
  }

  setupXREvents() {
    this.renderer.xr.addEventListener("sessionstart", () => {
      this.isInXRSession = true;
      // Hide welcome overlay when entering XR
      this.hideWelcomeOverlay();
      // In XR, control whether we see passthrough (transparent) or black background
      // If colored background is enabled, show it; otherwise fallback to black toggle
      if (this.coloredBackgroundEnabled) {
        this.backgroundSphere.material.color.copy(this.coloredBackgroundColor);
        this.backgroundSphere.material.opacity = 1.0;
      } else {
        this.backgroundSphere.material.opacity = this.xrBlackBackgroundEnabled ? 1.0 : 0.0;
      }
      console.log(
        `XR session started - background ${this.coloredBackgroundEnabled ? 'colored' : (this.xrBlackBackgroundEnabled ? 'black' : 'passthrough')}`
      );
    });

    this.renderer.xr.addEventListener("sessionend", () => {
      this.isInXRSession = false;
      this.backgroundSphere.material.opacity = this.isBackgroundVisible ? 1.0 : 0.0;
      console.log("XR session ended - background restored to previous state");
      // Show training ready overlay or post-experience survey
      if (this.trainingMode) {
        this.showTrainingReadyOverlay();
      } else {
        this.showSurveyOverlay();
      }
    });
  }

  createWelcomeOverlay() {
    if (this.welcomeOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = 'welcome-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.3)',
      color: '#fff',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '900',
      fontFamily: 'Arial, sans-serif',
      pointerEvents: 'none'
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: 'rgba(44,62,80,0.95)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '720px',
      width: '85%',
      textAlign: 'center',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      border: '2px solid #3498db',
      pointerEvents: 'auto',
      position: 'relative'
    });

    const title = document.createElement('h1');
    title.textContent = 'Welcome to the experiment';
    title.style.marginTop = '0';
    title.style.color = '#3498db';
    title.style.fontSize = '2em';
    title.style.fontWeight = 'bold';

    const message = document.createElement('p');
    message.textContent = ' [EXPLANATION HERE]. Press Start XR to start the experiment.';
    message.style.fontSize = '1.1em';
    message.style.margin = '12px 0 0 0';
    message.style.color = '#ecf0f1';

    const debugRow = document.createElement('div');
    debugRow.style.display = 'flex';
    debugRow.style.justifyContent = 'center';
    debugRow.style.marginTop = '12px';

    const hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.textContent = 'Hide Overlays (Debug)';
    hideBtn.style.padding = '8px 14px';
    hideBtn.style.cursor = 'pointer';
    hideBtn.style.background = '#34495e';
    hideBtn.style.color = '#ecf0f1';
    hideBtn.style.border = '1px solid #3498db';
    hideBtn.style.borderRadius = '6px';
    hideBtn.addEventListener('click', () => {
      this.debugHideOverlays = true;
      this.hideWelcomeOverlay();
      this.hidePhase1FinishedOverlay();
      this.hideAttrakDiffOverlay();
      this.hideSurveyOverlay();
      console.log('[Debug] Overlays hidden for this session');
    });
    debugRow.appendChild(hideBtn);

    panel.appendChild(title);
    panel.appendChild(message);
    panel.appendChild(debugRow);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    this.welcomeOverlay = overlay;
  }

  setTrainingMode(enabled) {
    this.trainingMode = !!enabled;
  }

  createTrainingReadyOverlay() {
    if (this.trainingReadyOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = 'training-ready-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.6)',
      color: '#fff',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      fontFamily: 'Arial, sans-serif'
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#2c3e50',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '560px',
      width: '85%',
      textAlign: 'center',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      border: '2px solid #3498db'
    });

    const title = document.createElement('h2');
    title.textContent = 'Training Complete';
    title.style.marginTop = '0';
    title.style.color = '#3498db';
    title.style.fontSize = '1.6em';
    title.style.fontWeight = 'bold';

    const message = document.createElement('p');
    message.textContent = 'You are ready to start the experiment. Press OK to continue.';
    message.style.fontSize = '1.1em';
    message.style.margin = '12px 0 18px 0';
    message.style.color = '#ecf0f1';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = 'OK';
    okBtn.style.padding = '10px 16px';
    okBtn.style.cursor = 'pointer';
    okBtn.style.background = '#3498db';
    okBtn.style.color = '#fff';
    okBtn.style.border = 'none';
    okBtn.style.borderRadius = '8px';
    okBtn.style.boxShadow = '0 4px 12px rgba(52,152,219,0.35)';
    okBtn.onmouseover = () => { okBtn.style.boxShadow = '0 6px 16px rgba(52,152,219,0.45)'; };
    okBtn.onmouseout = () => { okBtn.style.boxShadow = '0 4px 12px rgba(52,152,219,0.35)'; };
    okBtn.addEventListener('click', () => {
      this.hideTrainingReadyOverlay();
      this.setTrainingMode(false);
      if (typeof this.onSurveyCompleted === 'function') {
        // Reuse the same progression callback used after surveys
        this.onSurveyCompleted();
      }
    });

    panel.appendChild(title);
    panel.appendChild(message);
    panel.appendChild(okBtn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    this.trainingReadyOverlay = overlay;
  }

  showTrainingReadyOverlay() {
    if (this.debugHideOverlays) {
      // Auto-advance when overlays are suppressed
      this.setTrainingMode(false);
      try {
        if (typeof this.onSurveyCompleted === 'function') {
          this.onSurveyCompleted();
        }
      } catch (_) {}
      return;
    }
    if (!this.trainingReadyOverlay) this.createTrainingReadyOverlay();
    if (this.trainingReadyOverlay) this.trainingReadyOverlay.style.display = 'flex';
    console.log('[Training] Showing training ready overlay');
  }

  hideTrainingReadyOverlay() {
    if (this.trainingReadyOverlay) this.trainingReadyOverlay.style.display = 'none';
  }

  showWelcomeOverlay() {
    if (this.debugHideOverlays) return;
    if (!this.welcomeOverlay) this.createWelcomeOverlay();
    if (this.welcomeOverlay) this.welcomeOverlay.style.display = 'flex';
  }

  hideWelcomeOverlay() {
    if (this.welcomeOverlay) this.welcomeOverlay.style.display = 'none';
  }

  endXRSession() {
    try {
      const session = this.renderer && this.renderer.xr ? this.renderer.xr.getSession() : null;
      if (session && typeof session.end === 'function') {
        session.end();
      }
    } catch (e) {
      console.warn('Failed to end XR session', e);
    }
  }

  createSurveyOverlay() {
    if (this.surveyOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = 'survey-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.8)',
      color: '#111',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999'
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#fff',
      borderRadius: '8px',
      padding: '24px',
      maxWidth: '900px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      fontFamily: 'Arial, sans-serif'
    });

    const title = document.createElement('h2');
    title.textContent = 'Feedback';
    title.style.marginTop = '0';
    title.style.color = '#2c3e50';
    title.style.fontSize = '1.6em';
    title.style.letterSpacing = '0.3px';

    // Removed description for brevity in VR

    const form = document.createElement('form');
    form.id = 'survey-form';

    const questions = [
      {
        key: 'qOverall',
        text: 'How do you rate the overall visual quality of these models?',
        left: 'very poor',
        right: 'excellent'
      },
      {
        key: 'q4',
        text: 'How authentic did you find the pictures you looked at?',
        left: 'not authentic at all',
        right: 'very authentic'
      },
      {
        key: 'q5',
        text: 'How detailed were you able to perceive the pictures?',
        left: 'not at all detailed',
        right: 'very detailed'
      },
      {
        key: 'q6',
        text: 'How strongly did you feel immersed in the scene of the pictures?',
        left: 'not at all',
        right: 'very much'
      }
    ];

    const makeQuestion = (q, index) => {
      const fs = document.createElement('fieldset');
      Object.assign(fs.style, {
        marginBottom: '18px',
        border: '1px solid #eef2f7',
        padding: '14px 12px',
        borderRadius: '10px',
        background: '#fafbfc'
      });
      const legend = document.createElement('legend');
      // Build legend with CAPS summary + smaller prompt
      const summaryMap = {
        qOverall: 'QUALITY',
        q4: 'AUTHENTICITY',
        q5: 'DETAILS',
        q6: 'IMMERSION'
      };
      const summaryText = summaryMap[q.key] || `Q${index + 1}`;
      legend.style.marginBottom = '10px';
      legend.style.color = '#2c3e50';
      legend.style.padding = '0';
      legend.style.border = '0';

      const summary = document.createElement('span');
      summary.textContent = `${index + 1}. ${summaryText}`;
      summary.style.display = 'block';
      summary.style.fontWeight = '700';
      summary.style.letterSpacing = '0.5px';
      summary.style.fontSize = '1.05rem';
      summary.style.color = '#1f2d3d';

      const prompt = document.createElement('span');
      prompt.textContent = q.text;
      prompt.style.display = 'block';
      prompt.style.marginTop = '2px';
      prompt.style.fontWeight = '500';
      prompt.style.fontSize = '0.9rem';
      prompt.style.color = '#6b7280';

      legend.appendChild(summary);
      legend.appendChild(prompt);
      fs.appendChild(legend);

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '12px';

      const left = document.createElement('span');
      left.textContent = q.left;
      left.style.whiteSpace = 'nowrap';
      left.style.fontSize = '13px';
      left.style.color = '#7f8c8d';
      left.style.minWidth = '110px';
      left.style.textAlign = 'right';

      const right = document.createElement('span');
      right.textContent = q.right;
      right.style.whiteSpace = 'nowrap';
      right.style.fontSize = '13px';
      right.style.color = '#7f8c8d';
      right.style.minWidth = '110px';
      right.style.textAlign = 'left';

      const scale = document.createElement('div');
      scale.style.display = 'flex';
      scale.style.gap = '16px';
      scale.style.alignItems = 'center';
      scale.style.justifyContent = 'center';
      scale.style.flex = '1';

      // Helper to update selection visuals across the scale and header
      const updateSelectionStyles = (selectedValue) => {
        const labels = scale.querySelectorAll('label');
        labels.forEach((l) => {
          const isSelected = l.dataset && l.dataset.value === String(selectedValue);
          l.style.boxShadow = isSelected
            ? 'inset 0 0 0 2px #3498db'
            : 'inset 0 0 0 1px #e6eef6';
          l.style.background = isSelected ? '#eaf5ff' : '#f8fafc';
          l.style.transform = isSelected ? 'translateY(-1px)' : 'none';
        });
        // Highlight group when selected
        try {
          fs.style.borderColor = '#3498db';
          summary.style.color = '#1f6fb2';
        } catch (_) {}
      };

      for (let i = 1; i <= 7; i++) {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.flexDirection = 'column';
        label.style.alignItems = 'center';
        label.style.justifyContent = 'center';
        label.style.fontSize = '12px';
        label.style.width = '64px';
        label.style.height = '64px';
        label.style.borderRadius = '10px';
        label.style.background = '#f8fafc';
        label.style.boxShadow = 'inset 0 0 0 1px #e6eef6';
        label.style.transition = 'all 0.15s ease';
        label.style.cursor = 'pointer';
        label.onmouseover = () => { label.style.boxShadow = 'inset 0 0 0 2px #3498db33'; };
        label.onmouseout = () => { label.style.boxShadow = 'inset 0 0 0 1px #e6eef6'; };
        label.dataset.value = String(i);
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = q.key;
        input.value = String(i);
        input.required = true;
        // Make the entire tile the hit target; keep input accessible but invisible
        input.style.position = 'absolute';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        try { input.style.accentColor = '#3498db'; } catch (_) {}
        input.addEventListener('change', () => updateSelectionStyles(i));
        label.appendChild(input);
        const small = document.createElement('span');
        small.textContent = String(i);
        small.style.color = '#34495e';
        small.style.marginTop = '4px';
        label.appendChild(small);
        scale.appendChild(label);
      }

      row.appendChild(left);
      row.appendChild(scale);
      row.appendChild(right);
      fs.appendChild(row);
      return fs;
    };

    questions.forEach((q, idx) => form.appendChild(makeQuestion(q, idx)));

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '12px';
    actions.style.marginTop = '16px';
    actions.style.justifyContent = 'flex-end';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.textContent = 'Submit';
    submitBtn.style.padding = '10px 16px';
    submitBtn.style.cursor = 'pointer';
    submitBtn.style.background = '#3498db';
    submitBtn.style.color = '#fff';
    submitBtn.style.border = 'none';
    submitBtn.style.borderRadius = '8px';
    submitBtn.style.boxShadow = '0 4px 12px rgba(52,152,219,0.35)';
    submitBtn.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease, opacity 0.2s ease';
    submitBtn.onmouseover = () => { submitBtn.style.boxShadow = '0 6px 16px rgba(52,152,219,0.45)'; };
    submitBtn.onmouseout = () => { submitBtn.style.boxShadow = '0 4px 12px rgba(52,152,219,0.35)'; };

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Close';
    cancelBtn.style.padding = '10px 16px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.background = '#95a5a6';
    cancelBtn.style.color = '#fff';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '8px';
    cancelBtn.style.boxShadow = '0 4px 12px rgba(149,165,166,0.35)';
    cancelBtn.onmouseover = () => { cancelBtn.style.boxShadow = '0 6px 16px rgba(149,165,166,0.45)'; };
    cancelBtn.onmouseout = () => { cancelBtn.style.boxShadow = '0 4px 12px rgba(149,165,166,0.35)'; };
    cancelBtn.addEventListener('click', () => {
      console.log('[Survey] Close clicked');
      this.hideSurveyOverlay();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(submitBtn);

    submitBtn.addEventListener('click', (e) => {
      console.log('[Survey] Submit clicked');
      try {
        // Validate required fields
        if (!form.checkValidity()) {
          console.log('[Survey] Form invalid, prompting user');
          form.reportValidity();
          return;
        }

        const data = new FormData(form);
        console.log('[Survey] Collecting responses');
        const results = questions.map((q) => ({
          id: q.key,
          text: q.text,
          leftLabel: q.left,
          rightLabel: q.right,
          value: Number(data.get(q.key))
        }));
        const payload = {
          timestamp: new Date().toISOString(),
          survey: results
        };
        // Attach optional context (e.g., folder, model) if provider is set
        try {
          if (typeof this.surveyMetadataProvider === 'function') {
            const context = this.surveyMetadataProvider();
            if (context && typeof context === 'object') {
              payload.context = context;
            }
          }
        } catch (_) {}
        console.log('[Survey] Payload ready (aggregated, no immediate download)');

        // Aggregate via external data collector (preferred)
        if (this.dataCollector && typeof this.dataCollector.addSurvey === 'function') {
          this.dataCollector.addSurvey(payload);
        } else {
          // Legacy fallback aggregation
          this.allSurveyResults.push(payload);
        }

        // Call the survey completed callback if set
        if (this.onSurveyCompleted) {
          console.log('[Survey] Calling survey completed callback');
          this.onSurveyCompleted();
        }

        // Clear form after successful submission
        this.clearSurveyForm();
        // Reset any selection visuals on tiles
        try {
          const labels = form.querySelectorAll('label');
          labels.forEach((l) => {
            l.style.boxShadow = 'inset 0 0 0 1px #e6eef6';
            l.style.background = '#f8fafc';
            l.style.transform = 'none';
          });
          const fieldsets = form.querySelectorAll('fieldset');
          fieldsets.forEach((f) => {
            f.style.borderColor = '#eef2f7';
          });
          const legendSummaries = form.querySelectorAll('legend span:first-child');
          legendSummaries.forEach((s) => {
            s.style.color = '#1f2d3d';
          });
        } catch (_) {}
        this.hideSurveyOverlay();
        // Do not show AttrakDiff here anymore; defer to end-of-experiment gate
        // Flow control handled when ending the XR session and completing study
      } catch (err) {
        console.error('[Survey] Error during submit handling', err);
      }
    });

    panel.appendChild(title);
    panel.appendChild(form);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    this.surveyOverlay = overlay;

    // Make the entire tile clickable (keyboard and pointer) for better VR usability
    // This ensures clicking anywhere on the label toggles the associated input
    try {
      overlay.addEventListener('click', (evt) => {
        const target = evt.target;
        if (!target) return;
        // If user clicked inside a rating tile, activate the embedded radio
        const label = target.closest ? target.closest('label') : null;
        if (label) {
          const input = label.querySelector('input[type="radio"]');
          if (input) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    } catch (_) {}
  }

  createAttrakDiffOverlay() {
    if (this.attrakDiffOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = 'attrakdiff-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.8)',
      color: '#111',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#fff',
      borderRadius: '8px',
      padding: '24px',
      maxWidth: '900px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      fontFamily: 'Arial, sans-serif'
    });

    const title = document.createElement('h2');
    title.textContent = 'AttrakDiff';
    title.style.marginTop = '0';
    title.style.color = '#2c3e50';
    title.style.fontSize = '1.6em';
    title.style.letterSpacing = '0.3px';

    const desc = document.createElement('p');
    desc.textContent = 'Below you see word pairs that represent opposite qualities. Please rate by choosing a point between them. Give your spontaneous impression. Always select an answer; there are no right or wrong answers—only your opinion.';
    desc.style.color = '#4a5568';
    desc.style.margin = '6px 0 16px 0';

    const form = document.createElement('form');
    form.id = 'attrakdiff-form';

    const pairs = [
      { key: 'ad1', left: 'simple', right: 'complicated' },
      { key: 'ad2', left: 'ugly', right: 'beautiful' },
      { key: 'ad3', left: 'practical', right: 'impractical' },
      { key: 'ad4', left: 'stylish', right: 'unstylish' },
      { key: 'ad5', left: 'predictable', right: 'unpredictable' },
      { key: 'ad6', left: 'inferior', right: 'valuable' },
      { key: 'ad7', left: 'unimaginative', right: 'creative' },
      { key: 'ad8', left: 'good', right: 'bad' },
      { key: 'ad9', left: 'confusing', right: 'clear' },
      { key: 'ad10', left: 'boring', right: 'captivating' }
    ];

    const makePairRow = (p, index) => {
      const fs = document.createElement('fieldset');
      Object.assign(fs.style, {
        marginBottom: '18px',
        border: '1px solid #eef2f7',
        padding: '14px 12px',
        borderRadius: '10px',
        background: '#fafbfc'
      });
      const legend = document.createElement('legend');
      legend.style.marginBottom = '10px';
      legend.style.color = '#2c3e50';
      legend.style.padding = '0';
      legend.style.border = '0';
      const summary = document.createElement('span');
      summary.textContent = `${index + 1}. ${p.left} – ${p.right}`;
      summary.style.display = 'block';
      summary.style.fontWeight = '700';
      summary.style.letterSpacing = '0.3px';
      summary.style.fontSize = '1.0rem';
      summary.style.color = '#1f2d3d';
      legend.appendChild(summary);
      fs.appendChild(legend);

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '12px';

      const left = document.createElement('span');
      left.textContent = p.left;
      left.style.whiteSpace = 'nowrap';
      left.style.fontSize = '13px';
      left.style.color = '#7f8c8d';
      left.style.minWidth = '110px';
      left.style.textAlign = 'right';

      const right = document.createElement('span');
      right.textContent = p.right;
      right.style.whiteSpace = 'nowrap';
      right.style.fontSize = '13px';
      right.style.color = '#7f8c8d';
      right.style.minWidth = '110px';
      right.style.textAlign = 'left';

      const scale = document.createElement('div');
      scale.style.display = 'flex';
      scale.style.gap = '16px';
      scale.style.alignItems = 'center';
      scale.style.justifyContent = 'center';
      scale.style.flex = '1';

      const updateSelectionStyles = (selectedValue) => {
        const labels = scale.querySelectorAll('label');
        labels.forEach((l) => {
          const isSelected = l.dataset && l.dataset.value === String(selectedValue);
          l.style.boxShadow = isSelected
            ? 'inset 0 0 0 2px #3498db'
            : 'inset 0 0 0 1px #e6eef6';
          l.style.background = isSelected ? '#eaf5ff' : '#f8fafc';
          l.style.transform = isSelected ? 'translateY(-1px)' : 'none';
        });
        try { fs.style.borderColor = '#3498db'; summary.style.color = '#1f6fb2'; } catch (_) {}
      };

      for (let i = 1; i <= 7; i++) {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.flexDirection = 'column';
        label.style.alignItems = 'center';
        label.style.justifyContent = 'center';
        label.style.fontSize = '12px';
        label.style.width = '64px';
        label.style.height = '64px';
        label.style.borderRadius = '10px';
        label.style.background = '#f8fafc';
        label.style.boxShadow = 'inset 0 0 0 1px #e6eef6';
        label.style.transition = 'all 0.15s ease';
        label.style.cursor = 'pointer';
        label.onmouseover = () => { label.style.boxShadow = 'inset 0 0 0 2px #3498db33'; };
        label.onmouseout = () => { label.style.boxShadow = 'inset 0 0 0 1px #e6eef6'; };
        label.dataset.value = String(i);
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = p.key;
        input.value = String(i);
        input.required = true;
        input.style.position = 'absolute';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        try { input.style.accentColor = '#3498db'; } catch (_) {}
        input.addEventListener('change', () => updateSelectionStyles(i));
        label.appendChild(input);
        const small = document.createElement('span');
        small.textContent = String(i);
        small.style.color = '#34495e';
        small.style.marginTop = '4px';
        label.appendChild(small);
        scale.appendChild(label);
      }

      row.appendChild(left);
      row.appendChild(scale);
      row.appendChild(right);
      fs.appendChild(row);
      return fs;
    };

    pairs.forEach((p, idx) => form.appendChild(makePairRow(p, idx)));

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '12px';
    actions.style.marginTop = '16px';
    actions.style.justifyContent = 'flex-end';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.textContent = 'Submit';
    submitBtn.style.padding = '10px 16px';
    submitBtn.style.cursor = 'pointer';
    submitBtn.style.background = '#3498db';
    submitBtn.style.color = '#fff';
    submitBtn.style.border = 'none';
    submitBtn.style.borderRadius = '8px';
    submitBtn.style.boxShadow = '0 4px 12px rgba(52,152,219,0.35)';
    submitBtn.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease, opacity 0.2s ease';
    submitBtn.onmouseover = () => { submitBtn.style.boxShadow = '0 6px 16px rgba(52,152,219,0.45)'; };
    submitBtn.onmouseout = () => { submitBtn.style.boxShadow = '0 4px 12px rgba(52,152,219,0.35)'; };

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Close';
    cancelBtn.style.padding = '10px 16px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.background = '#95a5a6';
    cancelBtn.style.color = '#fff';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '8px';
    cancelBtn.style.boxShadow = '0 4px 12px rgba(149,165,166,0.35)';
    cancelBtn.onmouseover = () => { cancelBtn.style.boxShadow = '0 6px 16px rgba(149,165,166,0.45)'; };
    cancelBtn.onmouseout = () => { cancelBtn.style.boxShadow = '0 4px 12px rgba(149,165,166,0.35)'; };
    cancelBtn.addEventListener('click', () => {
      console.log('[AttrakDiff] Close clicked');
      this.attrakDiffDone = true;
      // Render thank-you message within this overlay
      this.renderAttrakDiffThankYou(panel);
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(submitBtn);

    submitBtn.addEventListener('click', () => {
      console.log('[AttrakDiff] Submit clicked');
      try {
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        const data = new FormData(form);
        const results = pairs.map((p) => ({
          id: p.key,
          leftLabel: p.left,
          rightLabel: p.right,
          value: Number(data.get(p.key))
        }));
        const payload = {
          timestamp: new Date().toISOString(),
          attrakDiff: results
        };
        if (this.dataCollector && typeof this.dataCollector.addAttrakDiff === 'function') {
          this.dataCollector.addAttrakDiff(payload);
        } else {
          this.allSurveyResults.push(payload);
        }
        // Reset visuals
        try {
          const labels = form.querySelectorAll('label');
          labels.forEach((l) => {
            l.style.boxShadow = 'inset 0 0 0 1px #e6eef6';
            l.style.background = '#f8fafc';
            l.style.transform = 'none';
          });
          const fieldsets = form.querySelectorAll('fieldset');
          fieldsets.forEach((f) => {
            f.style.borderColor = '#eef2f7';
          });
          const legendSummaries = form.querySelectorAll('legend span:first-child');
          legendSummaries.forEach((s) => {
            s.style.color = '#1f2d3d';
          });
        } catch (_) {}
        this.attrakDiffDone = true;
        // Trigger final aggregated download now that all responses are collected
        try {
          if (this.dataCollector && typeof this.dataCollector.download === 'function') {
            this.dataCollector.download();
          } else if (typeof this.downloadAllSurveyResults === 'function') {
            // Fallback to legacy aggregator
            this.downloadAllSurveyResults();
          }
        } catch (_) {}
        // Render thank-you message within this overlay
        this.renderAttrakDiffThankYou(panel);
      } catch (e) {
        console.error('[AttrakDiff] Error during submit handling', e);
      }
    });

    panel.appendChild(title);
    panel.appendChild(desc);
    panel.appendChild(form);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    this.attrakDiffOverlay = overlay;

    // Make entire tiles clickable
    try {
      overlay.addEventListener('click', (evt) => {
        const target = evt.target;
        if (!target) return;
        const label = target.closest ? target.closest('label') : null;
        if (label) {
          const input = label.querySelector('input[type="radio"]');
          if (input) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    } catch (_) {}
  }

  renderAttrakDiffThankYou(container) {
    try {
      // Clear existing panel content
      while (container.firstChild) container.removeChild(container.firstChild);
      // Thank-you content
    const title = document.createElement('h1');
      title.textContent = 'Thank you for your participation!';
    title.style.marginTop = '0';
      title.style.color = '#27ae60';
      title.style.fontSize = '2.0em';
    title.style.fontWeight = 'bold';

    const message = document.createElement('p');
      message.textContent = 'Your feedback helps us improve our VR experience.';
      message.style.fontSize = '1.15em';
      message.style.margin = '16px 0';
      message.style.color = '#2c3e50';
    message.style.lineHeight = '1.4';

    const instruction = document.createElement('p');
      instruction.textContent = 'You have completed the study.';
      instruction.style.fontSize = '1.0em';
      instruction.style.color = '#6b7280';
    instruction.style.marginBottom = '20px';
    instruction.style.fontStyle = 'italic';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.padding = '10px 16px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.background = '#3498db';
      closeBtn.style.color = '#fff';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '8px';
      closeBtn.style.boxShadow = '0 4px 12px rgba(52,152,219,0.35)';
      closeBtn.onmouseover = () => { closeBtn.style.boxShadow = '0 6px 16px rgba(52,152,219,0.45)'; };
      closeBtn.onmouseout = () => { closeBtn.style.boxShadow = '0 4px 12px rgba(52,152,219,0.35)'; };
      closeBtn.addEventListener('click', () => {
        this.hideAttrakDiffOverlay();
      });

      container.appendChild(title);
      container.appendChild(message);
      container.appendChild(instruction);
      container.appendChild(closeBtn);
    } catch (e) {
      console.error('[AttrakDiff] Failed to render thank-you state', e);
    }
  }

  showAttrakDiffOverlay() {
    if (!this.attrakDiffOverlay) this.createAttrakDiffOverlay();
    // Clear previous selections
    try {
      const form = this.attrakDiffOverlay.querySelector('#attrakdiff-form');
      if (form) {
        const radios = form.querySelectorAll('input[type="radio"]');
        radios.forEach((r) => { r.checked = false; });
        const labels = form.querySelectorAll('label');
        labels.forEach((l) => {
          l.style.boxShadow = 'inset 0 0 0 1px #e6eef6';
          l.style.background = '#f8fafc';
          l.style.transform = 'none';
        });
        const fieldsets = form.querySelectorAll('fieldset');
        fieldsets.forEach((f) => { f.style.borderColor = '#eef2f7'; });
      }
    } catch (_) {}
    this.attrakDiffOverlay.style.display = 'flex';
    console.log('[AttrakDiff] Showing AttrakDiff overlay');
  }

  hideAttrakDiffOverlay() {
    if (this.attrakDiffOverlay) this.attrakDiffOverlay.style.display = 'none';
  }

  createPhase1FinishedOverlay() {
    if (this.phase1FinishedOverlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'phase1-finished-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.3)', // More transparent so XR button is visible
      color: '#fff',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '999', // Lower z-index so XR button can be clicked
      fontFamily: 'Arial, sans-serif',
      pointerEvents: 'none' // Allow clicks to pass through to XR button
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#2c3e50',
      borderRadius: '12px',
      padding: '30px',
      maxWidth: '500px',
      width: '80%',
      textAlign: 'center',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      border: '2px solid #3498db',
      pointerEvents: 'auto', // Enable clicks on the panel itself
      position: 'relative',
      marginRight: '200px', // Leave space for XR button on the right
      marginBottom: '100px' // Leave space for XR button at bottom
    });

    const title = document.createElement('h1');
    title.textContent = 'Phase 1 Finished';
    title.style.marginTop = '0';
    title.style.color = '#3498db';
    title.style.fontSize = '2em';
    title.style.fontWeight = 'bold';

    const message = document.createElement('p');
    message.textContent = 'Please Press Start XR to Start Phase 2';
    message.style.fontSize = '1.2em';
    message.style.margin = '15px 0';
    message.style.color = '#ecf0f1';
    message.style.lineHeight = '1.4';

    const instruction = document.createElement('p');
    instruction.textContent = 'Look for the "Start XR" button to continue with the next phase';
    instruction.style.fontSize = '1em';
    instruction.style.color = '#bdc3c7';
    instruction.style.marginBottom = '20px';
    instruction.style.fontStyle = 'italic';

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '15px';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.color = '#bdc3c7';
    closeButton.style.fontSize = '2em';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0';
    closeButton.style.width = '30px';
    closeButton.style.height = '30px';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.borderRadius = '50%';
    closeButton.style.transition = 'all 0.2s';

    closeButton.onmouseover = () => {
      closeButton.style.background = '#34495e';
      closeButton.style.color = '#ecf0f1';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = 'transparent';
      closeButton.style.color = '#bdc3c7';
    };
    closeButton.onclick = () => {
      this.hidePhase1FinishedOverlay();
    };

    panel.appendChild(closeButton);
    panel.appendChild(title);
    panel.appendChild(message);
    panel.appendChild(instruction);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    this.phase1FinishedOverlay = overlay;
  }

  // Thank-you is now shown inside AttrakDiff overlay; dedicated overlay removed

  showPhase1FinishedOverlay() {
    if (this.debugHideOverlays) return;
    if (!this.phase1FinishedOverlay) this.createPhase1FinishedOverlay();
    this.phase1FinishedOverlay.style.display = 'flex';
    console.log('[Phase 1] Showing completion message');

    // Add escape key listener to dismiss overlay
    this.escapeKeyHandler = (event) => {
      if (event.key === 'Escape' && this.phase1FinishedOverlay && this.phase1FinishedOverlay.style.display !== 'none') {
        this.hidePhase1FinishedOverlay();
      }
    };
    document.addEventListener('keydown', this.escapeKeyHandler);
  }

  hidePhase1FinishedOverlay() {
    if (this.phase1FinishedOverlay) {
      this.phase1FinishedOverlay.style.display = 'none';
      console.log('[Phase 1] Hiding completion message');

      // Remove escape key listener
      if (this.escapeKeyHandler) {
        document.removeEventListener('keydown', this.escapeKeyHandler);
        this.escapeKeyHandler = null;
      }
    }
  }

  showSurveyOverlay() {
    if (this.debugHideOverlays) return;
    if (!this.surveyOverlay) this.createSurveyOverlay();
    // Clear form inputs to prevent pre-filled answers from previous sessions
    this.clearSurveyForm();
    // Hide completion overlays if they're showing
    this.hidePhase1FinishedOverlay();
    this.hideAttrakDiffOverlay();
    this.surveyOverlay.style.display = 'flex';
    console.log('[Survey] Showing survey overlay with cleared form');
  }

  hideSurveyOverlay() {
    if (this.surveyOverlay) this.surveyOverlay.style.display = 'none';
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 3);
    this.scene.add(directionalLight);
  }

  toggleBackground() {
    this.isBackgroundVisible = !this.isBackgroundVisible;

    if (this.isBackgroundVisible) {
      this.backgroundSphere.material.opacity = 1.0;
      console.log("Background sphere visible");
    } else {
      this.backgroundSphere.material.opacity = 0.0;
      console.log("Background sphere hidden");
    }
  }

  updateBackgroundSpherePosition() {
    if (this.renderer.xr.isPresenting) {
      const xrCamera = this.renderer.xr.getCamera();
      this.backgroundSphere.position.copy(xrCamera.position);
    } else {
      this.backgroundSphere.position.copy(this.camera.position);
    }
  }

  setXRBlackBackgroundEnabled(enabled) {
    this.xrBlackBackgroundEnabled = !!enabled;
    if (this.isInXRSession && this.backgroundSphere && this.backgroundSphere.material) {
      // Respect colored background if enabled
      if (this.coloredBackgroundEnabled) {
        this.backgroundSphere.material.color.copy(this.coloredBackgroundColor);
        this.backgroundSphere.material.opacity = 1.0;
      } else {
        this.backgroundSphere.material.opacity = this.xrBlackBackgroundEnabled ? 1.0 : 0.0;
      }
    }
  }

  setColoredBackgroundEnabled(enabled, color) {
    this.coloredBackgroundEnabled = !!enabled;
    // Accept: THREE.Color, numeric hex, [r,g,b], or {r,g,b}; r,g,b can be 0-1 or 0-255
    const clamp01 = (v) => (v < 0 ? 0 : (v > 1 ? 1 : v));
    if (color && typeof color === 'object' && (color.isColor === true)) {
      this.coloredBackgroundColor.copy(color);
    } else if (typeof color === 'number' && isFinite(color)) {
      this.coloredBackgroundColor.setHex(color);
    } else if (typeof color === 'string') {
      // Accept css-style hex strings '#rrggbb' or '#rgb'
      try { this.coloredBackgroundColor.set(color); } catch (e) {}
    } else if (Array.isArray(color) && color.length === 3) {
      const r = Number(color[0]);
      const g = Number(color[1]);
      const b = Number(color[2]);
      const use255 = (r > 1 || g > 1 || b > 1);
      const scale = use255 ? 255 : 1;
      this.coloredBackgroundColor.setRGB(
        clamp01((isFinite(r) ? r : 0) / scale),
        clamp01((isFinite(g) ? g : 0) / scale),
        clamp01((isFinite(b) ? b : 0) / scale)
      );
    } else if (color && typeof color === 'object' && color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      const r = Number(color.r);
      const g = Number(color.g);
      const b = Number(color.b);
      const use255 = (r > 1 || g > 1 || b > 1);
      const scale = use255 ? 255 : 1;
      this.coloredBackgroundColor.setRGB(
        clamp01((isFinite(r) ? r : 0) / scale),
        clamp01((isFinite(g) ? g : 0) / scale),
        clamp01((isFinite(b) ? b : 0) / scale)
      );
    }
    if (this.backgroundSphere && this.backgroundSphere.material) {
      if (this.coloredBackgroundEnabled) {
        this.backgroundSphere.material.color.copy(this.coloredBackgroundColor);
        this.backgroundSphere.material.opacity = 1.0;
      } else {
        // If disabled, fall back to XR black background toggle state in XR, otherwise keep current visibility
        if (this.isInXRSession) {
          this.backgroundSphere.material.opacity = this.xrBlackBackgroundEnabled ? 1.0 : 0.0;
        }
      }
    }
  }

  setSurveyCompletedCallback(callback) {
    this.onSurveyCompleted = callback;
  }

  setSurveyMetadataProvider(provider) {
    this.surveyMetadataProvider = provider;
  }

  downloadAllSurveyResults() {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        count: this.allSurveyResults.length,
        submissions: this.allSurveyResults
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .replace('Z', 'Z');
      a.href = url;
      a.download = `survey-all-${ts}.json`;
      document.body.appendChild(a);
      console.log('[Survey] Initiating final download', a.download);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[Survey] Final download completed');
    } catch (e) {
      console.warn('[Survey] Failed to download aggregated results', e);
    }
  }

  clearSurveyForm() {
    const form = document.getElementById('survey-form');
    if (form) {
      // Clear all radio button selections
      const radioButtons = form.querySelectorAll('input[type="radio"]');
      radioButtons.forEach(radio => {
        radio.checked = false;
      });
      console.log('[Survey] Form cleared');
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.updateBackgroundSpherePosition();
    this.renderer.render(this.scene, this.camera);
  }
}
