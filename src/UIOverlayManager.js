export class UIOverlayManager {
  constructor(sceneSetup) {
    this.scene = sceneSetup;
    this.listeners = {
      surveySubmit: [],
      attrakDiffSubmit: []
    };
    // Wire SceneSetup callbacks to events
    if (this.scene && typeof this.scene.setSurveyCompletedCallback === 'function') {
      this.scene.setSurveyCompletedCallback(() => {
        // Handled separately in main via survey overlay submit handler
        // We keep this for backwards compatibility if needed.
      });
    }
  }

  on(event, handler) {
    if (this.listeners[event]) this.listeners[event].push(handler);
  }

  emit(event, payload) {
    const arr = this.listeners[event] || [];
    arr.forEach((fn) => {
      try { fn(payload); } catch (_) {}
    });
  }

  // Survey overlay API
  showSurvey(contextProvider) {
    if (!this.scene) return;
    // Hook into survey submit by temporarily wrapping onSurveyCompleted
    const prev = this.scene.onSurveyCompleted;
    this.scene.setSurveyCompletedCallback(() => {
      this.emit('surveySubmit');
      // restore
      this.scene.setSurveyCompletedCallback(prev);
    });
    this.scene.showSurveyOverlay();
  }

  hideSurvey() {
    this.scene && this.scene.hideSurveyOverlay && this.scene.hideSurveyOverlay();
  }

  // AttrakDiff overlay API
  showAttrakDiff() {
    this.scene && this.scene.showAttrakDiffOverlay && this.scene.showAttrakDiffOverlay();
  }

  hideAttrakDiff() {
    this.scene && this.scene.hideAttrakDiffOverlay && this.scene.hideAttrakDiffOverlay();
  }

  // Back-compat helpers
  hidePhase1() {
    this.scene && this.scene.hidePhase1FinishedOverlay && this.scene.hidePhase1FinishedOverlay();
  }
}


