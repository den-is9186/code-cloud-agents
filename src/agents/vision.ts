import { Agent, AgentRole } from './types';
import { llmClient } from '../llm/client';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';

type VisionTask = 'design_to_code' | 'bug_analysis' | 'ui_compare';

export class VisionAgent implements Agent<{
  image: string;
  task: VisionTask;
  context?: string;
}, {
  analysis: string;
  generatedCode?: string;
  suggestedFix?: string;
  confidence: number;
}> {
  role: AgentRole = 'vision';
  model = 'llama-4-scout-local'; // Läuft lokal, $0 Kosten
  status = 'idle' as const;

  async execute(input: {
    image: string;
    task: VisionTask;
    context?: string
  }): Promise<{
    analysis: string;
    generatedCode?: string;
    suggestedFix?: string;
    confidence: number;
  }> {
    const prompts: Record<VisionTask, string> = {
      design_to_code: 'Analysiere dieses Design und generiere React/TypeScript Code dafür.',
      bug_analysis: 'Analysiere diesen Screenshot und identifiziere UI-Bugs oder Probleme.',
      ui_compare: 'Vergleiche dieses UI mit der erwarteten Implementation.'
    };

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: `Du bist ein Vision Agent der Bilder analysiert.

Antworte NUR mit validem JSON:
{
  "analysis": "Beschreibung was du siehst",
  "generatedCode": "// Code falls design_to_code",
  "suggestedFix": "Fix-Vorschlag falls bug_analysis",
  "confidence": 0.85
}`
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `${prompts[input.task]}\n\nKontext: ${input.context || 'Keine'}` },
          { type: 'image_url', image_url: { url: input.image } }
        ] as any
      }
    ]);

    try {
      const VisionResponseSchema = z.object({
        analysis: z.string(),
        generatedCode: z.string().optional(),
        suggestedFix: z.string().optional(),
        confidence: z.number()
      });
      return safeJsonParse(response.content, VisionResponseSchema);
    } catch {
      return {
        analysis: response.content,
        confidence: 0.5
      };
    }
  }
}
