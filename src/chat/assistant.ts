import { llmClient } from '../llm/client';
// DEPRECATED: run() function commented out during agent refactor
// import { run, RunConfig } from '../index';
import { TaskAnalysis, TeamSuggestion } from '../agents/types';

const PRESET_INFO = {
  A: { name: 'Budget', cost: 8, quality: 71, description: 'Günstig, gut für einfache Tasks' },
  B: { name: 'Optimal', cost: 25, quality: 79, description: 'Beste Balance Preis/Leistung' },
  C: { name: 'Premium', cost: 130, quality: 92, description: 'Höchste Qualität, teuer' },
  D: { name: 'Smart', cost: 45, quality: 88, description: 'Claude für Code, DeepSeek für Rest' },
  LOCAL: { name: 'Local', cost: 6, quality: 85, description: 'Scout lokal für Docs/Vision' },
  V: { name: 'Vision', cost: 15, quality: 82, description: 'Mit Screenshot-Analyse' },
};

export class ChatAssistant {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private pendingSuggestion: TeamSuggestion | null = null;

  // Hybrid model selection
  private defaultModel = 'llama-4-scout-local'; // Free
  private complexModel = 'deepseek-r1'; // For complex planning

  // Maximum number of messages to keep in history to prevent memory leak
  private readonly MAX_HISTORY_LENGTH = 50;

  private addToHistory(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({ role, content });
    this.pruneHistory();
  }

  async process(message: string): Promise<string> {
    this.addToHistory('user', message);

    // Detect message type
    const messageType = this.detectMessageType(message);

    let response: string;

    switch (messageType) {
      case 'execute':
        response = await this.handleExecute();
        break;
      case 'adjust':
        response = await this.handleAdjust(message);
        break;
      case 'question':
        response = await this.handleQuestion(message);
        break;
      case 'task':
        response = await this.handleTask(message);
        break;
      default:
        response = await this.handleGeneral();
    }

    this.addToHistory('assistant', response);
    return response;
  }

  private pruneHistory(): void {
    if (this.conversationHistory.length > this.MAX_HISTORY_LENGTH) {
      // Keep only the most recent messages up to MAX_HISTORY_LENGTH
      // Since we don't have system messages in this history, just slice
      this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY_LENGTH);
    }
  }

  private detectMessageType(
    message: string
  ): 'execute' | 'adjust' | 'question' | 'task' | 'general' {
    const lower = message.toLowerCase();

    if (
      lower.includes('starten') ||
      lower.includes('ausführen') ||
      lower.includes('ja, ') ||
      lower.includes('start')
    ) {
      return 'execute';
    }
    if (
      lower.includes('günstiger') ||
      lower.includes('billiger') ||
      lower.includes('besser') ||
      lower.includes('ändern')
    ) {
      return 'adjust';
    }
    if (
      lower.includes('was ist') ||
      lower.includes('wie ') ||
      lower.includes('welche') ||
      lower.includes('erkläre') ||
      message.endsWith('?')
    ) {
      return 'question';
    }
    if (
      lower.includes('refactor') ||
      lower.includes('erstelle') ||
      lower.includes('füge') ||
      lower.includes('add') ||
      lower.includes('create') ||
      lower.includes('build')
    ) {
      return 'task';
    }
    return 'general';
  }

  private detectComplexity(message: string): 'low' | 'medium' | 'high' {
    const lower = message.toLowerCase();

    const highIndicators = [
      'refactor',
      'migration',
      'architektur',
      'mehrere',
      'repos',
      'monorepo',
      'komplette',
      'gesamte',
    ];
    const lowIndicators = ['was', 'wie', 'welche', 'erkläre', 'hilfe', 'kosten', 'einfach'];

    if (highIndicators.some((i) => lower.includes(i))) return 'high';
    if (lowIndicators.some((i) => lower.includes(i))) return 'low';
    return 'medium';
  }

  private async handleTask(message: string): Promise<string> {
    const complexity = this.detectComplexity(message);
    const model = complexity === 'high' ? this.complexModel : this.defaultModel;

    // Analyze task
    const analysis = await this.analyzeTask(message, model);

    // Generate team suggestion
    const suggestion = this.suggestTeam(analysis);
    this.pendingSuggestion = suggestion;

    return this.formatSuggestion(analysis, suggestion);
  }

  private async analyzeTask(message: string, model: string): Promise<TaskAnalysis> {
    const response = await llmClient.chat(model, [
      {
        role: 'system',
        content: `Analysiere diese Aufgabe. Antworte NUR mit JSON:
{
  "taskType": "refactor" | "feature" | "fix" | "docs" | "test",
  "complexity": "low" | "medium" | "high",
  "repos": ["repo1"],
  "estimatedTokens": 50000,
  "estimatedCost": 0.50,
  "estimatedTimeSeconds": 120,
  "description": "Kurze Beschreibung"
}`,
      },
      { role: 'user', content: message },
    ]);

    try {
      const match = response.content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {}

    return {
      taskType: 'feature',
      complexity: 'medium',
      repos: ['.'],
      estimatedTokens: 50000,
      estimatedCost: 0.5,
      estimatedTimeSeconds: 120,
      description: message,
    };
  }

  private suggestTeam(analysis: TaskAnalysis): TeamSuggestion {
    let preset: string;

    if (analysis.complexity === 'high') {
      preset = 'D'; // Smart - Claude for Code
    } else if (analysis.complexity === 'low') {
      preset = 'A'; // Budget
    } else {
      preset = 'LOCAL'; // Best balance
    }

    const info = PRESET_INFO[preset as keyof typeof PRESET_INFO];

    return {
      preset,
      agents: [
        { role: 'supervisor', model: 'deepseek-r1', reason: 'Orchestrierung' },
        { role: 'architect', model: 'deepseek-r1', reason: 'Planung' },
        {
          role: 'code',
          model: preset === 'D' ? 'claude-sonnet-4' : 'deepseek-v3',
          reason: 'Implementierung',
        },
        { role: 'review', model: 'deepseek-r1', reason: 'Code-Prüfung' },
        { role: 'test', model: 'deepseek-v3', reason: 'Tests' },
        { role: 'docs', model: 'scout-local', reason: 'Dokumentation (kostenlos)' },
      ],
      totalCost: info.cost * (analysis.estimatedTokens / 100000),
      estimatedTime: `${Math.ceil(analysis.estimatedTimeSeconds / 60)} Min`,
      canOptimize: preset !== 'A',
      optimizationTip: preset !== 'A' ? 'Sage "günstiger" für Budget-Version' : undefined,
    };
  }

  private formatSuggestion(analysis: TaskAnalysis, suggestion: TeamSuggestion): string {
    const info = PRESET_INFO[suggestion.preset as keyof typeof PRESET_INFO];

    return `
📋 **Verstanden: ${analysis.description}**

Komplexität: ${analysis.complexity.toUpperCase()}
Geschätzte Zeit: ${suggestion.estimatedTime}

🤖 **Team-Vorschlag (${info.name}):**
${suggestion.agents.map((a) => `  • ${a.role}: ${a.model} - ${a.reason}`).join('\n')}

💰 **Geschätzte Kosten:** $${suggestion.totalCost.toFixed(2)}

${suggestion.optimizationTip ? `💡 Tipp: ${suggestion.optimizationTip}\n` : ''}
**Was möchtest du tun?**
• "Starten" - Team ausführen
• "Günstiger" - Budget-Version
• "Besser" - Premium-Version
• Oder stelle eine Frage`;
  }

  // DEPRECATED: Commented out during agent refactor
  // Will be re-implemented after agent refactor is complete
  private async handleExecute(): Promise<string> {
    return `⚠️ Execute-Funktion vorübergehend deaktiviert während Agent-Refactoring.

Bitte verwende stattdessen die API:
- POST /api/builds/start
- GET /api/builds/:buildId

Oder warte bis das Refactoring abgeschlossen ist.`;

    /*
    if (!this.pendingSuggestion) {
      return 'Ich habe noch keinen Task zum Ausführen. Beschreibe zuerst was du bauen möchtest.';
    }

    const suggestion = this.pendingSuggestion;
    this.pendingSuggestion = null;

    try {
      const result = await run({
        task: this.conversationHistory.find((m) => m.role === 'user')?.content || 'Unknown task',
        projectPath: '.',
        preset: suggestion.preset as RunConfig['preset'],
      });

      if (result.success) {
        return `
✅ **Build erfolgreich!**

📁 ${result.filesChanged.length} Dateien geändert
🧪 ${result.testsWritten.length} Tests geschrieben
📝 ${result.docsUpdated.length} Docs aktualisiert
💰 Kosten: $${result.totalCost.toFixed(4)}
⏱️ Dauer: ${(result.duration / 1000).toFixed(1)}s

Kann ich noch etwas für dich tun?`;
      } else {
        return `
❌ **Build fehlgeschlagen**

Fehler: ${result.errors?.join(', ') || 'Unbekannt'}

Möchtest du es nochmal versuchen oder den Task anpassen?`;
      }
    } catch (error: any) {
      return `❌ Fehler beim Ausführen: ${error.message}`;
    }
    */
  }

  private async handleAdjust(message: string): Promise<string> {
    if (!this.pendingSuggestion) {
      return 'Ich habe noch keinen Vorschlag zum Anpassen. Beschreibe zuerst deinen Task.';
    }

    const lower = message.toLowerCase();
    let newPreset = this.pendingSuggestion.preset;

    if (lower.includes('günstiger') || lower.includes('billiger') || lower.includes('budget')) {
      newPreset = 'A';
    } else if (
      lower.includes('besser') ||
      lower.includes('premium') ||
      lower.includes('qualität')
    ) {
      newPreset = 'C';
    } else if (lower.includes('smart') || lower.includes('claude')) {
      newPreset = 'D';
    }

    const info = PRESET_INFO[newPreset as keyof typeof PRESET_INFO];

    this.pendingSuggestion = {
      ...this.pendingSuggestion,
      preset: newPreset,
      totalCost: info.cost * 0.5, // Rough estimate
    };

    return `
⚙️ **Angepasst auf ${info.name}**

${info.description}
💰 Neue geschätzte Kosten: ~$${this.pendingSuggestion.totalCost.toFixed(2)}

Sage "Starten" zum Ausführen oder frage weiter.`;
  }

  private async handleQuestion(message: string): Promise<string> {
    const complexity = this.detectComplexity(message);
    const model = complexity === 'high' ? this.complexModel : this.defaultModel;

    const response = await llmClient.chat(model, [
      {
        role: 'system',
        content: `Du bist der Assistent für "Code Cloud Agents", ein Multi-Agent System.

Verfügbare Presets:
${Object.entries(PRESET_INFO)
  .map(
    ([k, v]) => `- ${k} (${v.name}): $${v.cost}/Build, Qualität ${v.quality}/100 - ${v.description}`
  )
  .join('\n')}

Modelle:
- DeepSeek R1: Beste Reasoning, $0.55/$2.19 per Mt
- DeepSeek V3: Beste Coding, $0.30/$0.90 per Mt
- Claude Sonnet 4: Premium, $3/$15 per Mt
- Scout Local: Kostenlos, für Docs/Vision

Beantworte Fragen kurz und hilfreich.`,
      },
      { role: 'user', content: message },
    ]);

    return response.content;
  }

  private async handleGeneral(): Promise<string> {
    return `
👋 Hallo! Ich bin dein Code Cloud Agents Assistent.

**Was ich kann:**
• Tasks analysieren und Team vorschlagen
• Kosten/Zeit schätzen
• Code generieren, testen, dokumentieren

**Beispiele:**
• "Füge einen /health Endpoint hinzu"
• "Refactore das Auth-Modul"
• "Was kostet Preset C?"
• "Welches Modell für Tests?"

Was möchtest du bauen?`;
  }

  reset(): void {
    this.conversationHistory = [];
    this.pendingSuggestion = null;
  }
}

export default ChatAssistant;
