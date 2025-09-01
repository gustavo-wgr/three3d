export class DataCollector {
  constructor() {
    this.submissions = []; // per-model surveys
    this.attrakDiff = null; // final attrakdiff block
  }

  addSurvey(payload) {
    if (!payload) return;
    this.submissions.push(payload);
  }

  addAttrakDiff(payload) {
    if (!payload) return;
    this.attrakDiff = payload;
  }

  buildFinalPayload() {
    return {
      timestamp: new Date().toISOString(),
      count: this.submissions.length + (this.attrakDiff ? 1 : 0),
      submissions: this.submissions,
      attrakDiff: this.attrakDiff || undefined
    };
  }

  download() {
    try {
      const payload = this.buildFinalPayload();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', 'Z');
      a.href = url;
      a.download = `survey-all-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('[DataCollector] Failed to download results', e);
    }
  }
}


