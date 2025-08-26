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
    const sessionInit = {
      requiredFeatures: ["hand-tracking"],
    };
    document.body.appendChild(XRButton.createButton(this.renderer, sessionInit));

    // Setup XR event listeners
    this.setupXREvents();

    // Prepare survey overlay (hidden by default)
    this.createSurveyOverlay();

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.0, 0);
    this.controls.update();

    // Lighting
    this.setupLighting();

    // Window resize handler
    window.addEventListener("resize", this.onWindowResize.bind(this), false);
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

      // Show post-experience survey
      this.showSurveyOverlay();
    });
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
    title.textContent = 'Your Experience Feedback';
    title.style.marginTop = '0';

    const desc = document.createElement('p');
    desc.textContent = 'Please rate the following on a 7-point scale:';

    const form = document.createElement('form');
    form.id = 'survey-form';

    const questions = [
      {
        key: 'q1',
        text: 'How do you perceive the colours of the pictures?',
        left: 'very unnatural',
        right: 'very natural'
      },
      {
        key: 'q2',
        text: 'How would you rate the image quality?',
        left: 'low',
        right: 'high'
      },
      {
        key: 'q3',
        text: 'Did the pictures have a nostalgic or picturesque effect on you?',
        left: 'not at all',
        right: 'very much'
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
      },
      {
        key: 'q7',
        text: 'How strongly do you feel connected to the scene depicted in the picture?',
        left: 'not at all connected',
        right: 'very strongly connected'
      },
      {
        key: 'q8',
        text: 'How strong were the emotions that the picture triggered in you?',
        left: 'no emotions',
        right: 'very strong emotions'
      }
    ];

    const makeQuestion = (q, index) => {
      const fs = document.createElement('fieldset');
      Object.assign(fs.style, { marginBottom: '16px', border: 'none', padding: '0' });
      const legend = document.createElement('legend');
      legend.textContent = `Q${index + 1}. ${q.text}`;
      legend.style.fontWeight = '600';
      legend.style.marginBottom = '8px';
      fs.appendChild(legend);

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';

      const left = document.createElement('span');
      left.textContent = q.left;
      left.style.whiteSpace = 'nowrap';
      left.style.fontSize = '12px';

      const right = document.createElement('span');
      right.textContent = q.right;
      right.style.whiteSpace = 'nowrap';
      right.style.fontSize = '12px';

      const scale = document.createElement('div');
      scale.style.display = 'flex';
      scale.style.gap = '12px';
      scale.style.alignItems = 'center';
      scale.style.justifyContent = 'center';
      scale.style.flex = '1';

      for (let i = 1; i <= 7; i++) {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.flexDirection = 'column';
        label.style.alignItems = 'center';
        label.style.fontSize = '12px';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = q.key;
        input.value = String(i);
        input.required = true;
        label.appendChild(input);
        const small = document.createElement('span');
        small.textContent = String(i);
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
    actions.style.marginTop = '12px';
    actions.style.justifyContent = 'flex-end';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.textContent = 'Submit';
    submitBtn.style.padding = '8px 14px';
    submitBtn.style.cursor = 'pointer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Close';
    cancelBtn.style.padding = '8px 14px';
    cancelBtn.style.cursor = 'pointer';
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
        console.log('[Survey] Payload ready', payload);

        // Trigger JSON download
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
        a.download = `survey-${ts}.json`;
        document.body.appendChild(a);
        console.log('[Survey] Initiating download', a.download);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('[Survey] Download completed');

        // Call the survey completed callback if set
        if (this.onSurveyCompleted) {
          console.log('[Survey] Calling survey completed callback');
          this.onSurveyCompleted();
        }

        // Clear form after successful submission
        this.clearSurveyForm();
        this.hideSurveyOverlay();
      } catch (err) {
        console.error('[Survey] Error during submit handling', err);
      }
    });

    panel.appendChild(title);
    panel.appendChild(desc);
    panel.appendChild(form);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    this.surveyOverlay = overlay;
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

  createThankYouOverlay() {
    if (this.thankYouOverlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'thank-you-overlay';
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
      zIndex: '999',
      fontFamily: 'Arial, sans-serif',
      pointerEvents: 'none'
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#2c3e50',
      borderRadius: '12px',
      padding: '40px',
      maxWidth: '600px',
      width: '80%',
      textAlign: 'center',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      border: '2px solid #27ae60',
      pointerEvents: 'auto',
      position: 'relative',
      marginRight: '200px',
      marginBottom: '100px'
    });

    const title = document.createElement('h1');
    title.textContent = 'Thank you for your participation!';
    title.style.marginTop = '0';
    title.style.color = '#27ae60';
    title.style.fontSize = '2.2em';
    title.style.fontWeight = 'bold';

    const message = document.createElement('p');
    message.textContent = 'Your feedback helps us improve our VR experience.';
    message.style.fontSize = '1.2em';
    message.style.margin = '20px 0';
    message.style.color = '#ecf0f1';
    message.style.lineHeight = '1.4';

    const instruction = document.createElement('p');
    instruction.textContent = 'You have completed both phases of the study.';
    instruction.style.fontSize = '1.1em';
    instruction.style.color = '#bdc3c7';
    instruction.style.marginBottom = '30px';
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
      this.hideThankYouOverlay();
    };

    panel.appendChild(closeButton);
    panel.appendChild(title);
    panel.appendChild(message);
    panel.appendChild(instruction);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    this.thankYouOverlay = overlay;
  }

  showThankYouOverlay() {
    if (!this.thankYouOverlay) this.createThankYouOverlay();
    this.thankYouOverlay.style.display = 'flex';
    console.log('[Study] Showing thank you message');

    // Add escape key listener to dismiss overlay
    this.thankYouEscapeKeyHandler = (event) => {
      if (event.key === 'Escape' && this.thankYouOverlay && this.thankYouOverlay.style.display !== 'none') {
        this.hideThankYouOverlay();
      }
    };
    document.addEventListener('keydown', this.thankYouEscapeKeyHandler);
  }

  hideThankYouOverlay() {
    if (this.thankYouOverlay) {
      this.thankYouOverlay.style.display = 'none';
      console.log('[Study] Hiding thank you message');

      // Remove escape key listener
      if (this.thankYouEscapeKeyHandler) {
        document.removeEventListener('keydown', this.thankYouEscapeKeyHandler);
        this.thankYouEscapeKeyHandler = null;
      }
    }
  }

  showPhase1FinishedOverlay() {
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
    if (!this.surveyOverlay) this.createSurveyOverlay();
    // Clear form inputs to prevent pre-filled answers from previous sessions
    this.clearSurveyForm();
    // Hide completion overlays if they're showing
    this.hidePhase1FinishedOverlay();
    this.hideThankYouOverlay();
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
