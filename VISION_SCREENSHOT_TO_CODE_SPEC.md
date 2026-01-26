# 📸 VISION: SCREENSHOT → CODE

**Datum:** 2026-01-26
**Feature:** Screenshot Upload → Automatische Code-Generierung
**Preset:** V (Vision) + IQ erweitert
**Status:** Geplant

---

## 🎯 WAS IST SCREENSHOT → CODE?

User lädt Screenshot hoch (z.B. Figma Design, Wireframe, UI Mockup) → AI analysiert das Bild und generiert automatisch den passenden Code (React, Flutter, HTML/CSS, etc.).

### Beispiele:
```
Screenshot: [Login Screen mit Email, Password, Button]
    ↓ AI Vision Agent
Code Output:
    - React Component (JSX + CSS)
    - Flutter Widget (Dart)
    - HTML + Tailwind CSS
```

---

## 📋 FEATURES

### 1. Screenshot Upload
- **Formats:** PNG, JPG, WebP, PDF
- **Max Size:** 10MB
- **Storage:** Temporär (wird nach Analyse gelöscht)

### 2. Vision Analysis
- **Modelle:**
  - Qwen3 Omni (Preset V) - $15/build
  - Llama 4 Scout Local (Preset IQ/LOCAL) - kostenlos
- **Erkennt:**
  - UI Layout (Columns, Rows, Grid)
  - Komponenten (Buttons, Inputs, Cards, etc.)
  - Farben (Hex Codes)
  - Fonts (Font Family, Size, Weight)
  - Spacing (Padding, Margin)
  - Icons (Font Awesome, Material Icons)

### 3. Code Generation
- **Output Formats:**
  - React (JSX + CSS/Tailwind)
  - Flutter (Dart)
  - HTML + CSS
  - Vue.js
  - Svelte
- **Features:**
  - Responsive Design
  - Accessibility (ARIA)
  - Best Practices (Semantic HTML)

---

## 🏗️ ARCHITECTURE

### Workflow:
```
USER uploads screenshot
    ↓
POST /api/teams/:id/vision-tasks
    ↓
Redis: vision_task:{id} { screenshot_url, status: 'analyzing' }
    ↓
Vision Agent startet (Qwen3 Omni / Scout Local)
    ↓ Analyse:
    ├─ Layout Detection (Grid, Flex, Columns)
    ├─ Component Detection (Button, Input, Card)
    ├─ Color Extraction (Background, Text, Accent)
    ├─ Typography (Font Family, Size, Weight)
    └─ Spacing (Padding, Margin, Gap)
    ↓
Code Agent (Code Generator)
    ↓ Generiert:
    ├─ Component File (MyComponent.tsx)
    ├─ CSS File (MyComponent.css / Tailwind)
    ├─ Story File (MyComponent.stories.tsx) - optional
    └─ Test File (MyComponent.test.tsx)
    ↓
POST to Team Repo (PR / Commit)
    ↓
GET /api/teams/:id/vision-tasks/:taskId
    → { status: 'completed', files: [...] }
```

---

## 🛠️ IMPLEMENTATION

### 1. API Endpoints

#### Upload Screenshot
```typescript
// POST /api/teams/:id/vision-tasks
// Body: multipart/form-data

interface UploadRequest {
  screenshot: File;
  target_format: 'react' | 'flutter' | 'html' | 'vue' | 'svelte';
  framework?: 'tailwind' | 'css' | 'styled-components';
}

interface UploadResponse {
  data: {
    task_id: string;
    status: 'analyzing';
    estimated_time: string; // "2-3 minutes"
  };
}

router.post('/teams/:teamId/vision-tasks', upload.single('screenshot'), async (req, res) => {
  const { target_format, framework } = req.body;
  const screenshot = req.file;

  // 1. Upload to S3/Cloudinary (temporär)
  const screenshotUrl = await uploadScreenshot(screenshot);

  // 2. Create Vision Task
  const taskId = generateId();
  await redis.hset(`vision_task:${taskId}`, {
    team_id: teamId,
    screenshot_url: screenshotUrl,
    target_format,
    framework,
    status: 'analyzing',
    created_at: Date.now()
  });

  // 3. Start Vision Agent (async)
  startVisionAgent(taskId, screenshotUrl, target_format, framework);

  res.json({
    data: {
      task_id: taskId,
      status: 'analyzing',
      estimated_time: '2-3 minutes'
    }
  });
});
```

#### Get Vision Task Status
```typescript
// GET /api/teams/:id/vision-tasks/:taskId

interface VisionTaskResponse {
  data: {
    task_id: string;
    status: 'analyzing' | 'generating' | 'completed' | 'failed';
    progress: number; // 0-100
    result?: {
      files: {
        path: string;
        content: string;
        language: string;
      }[];
      preview_url?: string;
    };
    error?: string;
  };
}

router.get('/teams/:teamId/vision-tasks/:taskId', async (req, res) => {
  const task = await redis.hgetall(`vision_task:${taskId}`);

  if (!task) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vision task not found' } });
  }

  res.json({ data: task });
});
```

#### WebSocket für Live Updates
```typescript
// WS /ws/vision-tasks/:taskId

wss.on('connection', (ws, req) => {
  const taskId = extractTaskId(req.url);

  // Subscribe zu Redis Pub/Sub
  const subscriber = redis.duplicate();
  subscriber.subscribe(`vision_task:${taskId}:updates`);

  subscriber.on('message', (channel, message) => {
    ws.send(JSON.stringify(JSON.parse(message)));
  });

  ws.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
  });
});
```

---

### 2. Vision Agent

```typescript
// src/agents/vision.ts

export class VisionAgent extends BaseAgent {
  async analyzeScreenshot(screenshotUrl: string): Promise<VisionAnalysis> {
    const model = this.getModel(); // qwen3-omni oder llama-4-scout-local

    const prompt = `
Analyze this screenshot and extract:
1. Layout structure (grid, flex, columns)
2. Components (buttons, inputs, cards, etc.)
3. Colors (background, text, accents) as HEX codes
4. Typography (font family, sizes, weights)
5. Spacing (padding, margin, gaps in px)
6. Icons (if any, describe or identify library)

Return as JSON:
{
  "layout": { "type": "grid", "columns": 2, "gap": "16px" },
  "components": [
    { "type": "button", "text": "Login", "variant": "primary", "position": { "x": 100, "y": 200 } }
  ],
  "colors": {
    "background": "#FFFFFF",
    "text": "#000000",
    "primary": "#3B82F6"
  },
  "typography": {
    "heading": { "family": "Inter", "size": "24px", "weight": 700 },
    "body": { "family": "Inter", "size": "16px", "weight": 400 }
  },
  "spacing": {
    "padding": "16px",
    "margin": "24px"
  }
}
`;

    const response = await this.llmClient.chatWithImage(model, screenshotUrl, prompt);
    return JSON.parse(response);
  }
}
```

---

### 3. Code Generator Agent

```typescript
// src/agents/code-generator.ts

export class CodeGeneratorAgent extends BaseAgent {
  async generateCode(
    analysis: VisionAnalysis,
    targetFormat: 'react' | 'flutter' | 'html',
    framework?: 'tailwind' | 'css'
  ): Promise<GeneratedCode> {
    const model = this.getModel(); // deepseek-v3.2 oder iquest-coder

    const prompt = this.buildPrompt(analysis, targetFormat, framework);

    const response = await this.llmClient.chat(model, [
      { role: 'system', content: 'You are an expert frontend developer.' },
      { role: 'user', content: prompt }
    ]);

    return this.parseGeneratedCode(response, targetFormat);
  }

  private buildPrompt(analysis: VisionAnalysis, targetFormat: string, framework?: string): string {
    if (targetFormat === 'react') {
      return `
Generate a React component based on this UI analysis:

${JSON.stringify(analysis, null, 2)}

Requirements:
- Use TypeScript
- ${framework === 'tailwind' ? 'Use Tailwind CSS classes' : 'Use CSS modules'}
- Follow React best practices
- Make it responsive
- Add ARIA labels for accessibility

Output:
1. Component file (MyComponent.tsx)
2. ${framework === 'tailwind' ? 'No CSS file needed' : 'CSS file (MyComponent.module.css)'}
3. TypeScript types
`;
    } else if (targetFormat === 'flutter') {
      return `
Generate a Flutter widget based on this UI analysis:

${JSON.stringify(analysis, null, 2)}

Requirements:
- Use StatelessWidget
- Follow Flutter best practices
- Make it responsive
- Use const constructors where possible

Output:
1. Widget file (my_component.dart)
`;
    }
    // ... HTML, Vue, Svelte
  }

  private parseGeneratedCode(response: string, targetFormat: string): GeneratedCode {
    // Extract code blocks from LLM response
    const files: { path: string; content: string; language: string }[] = [];

    // Regex to find code blocks
    const codeBlockRegex = /```(\w+)\n([\s\S]+?)\n```/g;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1];
      const content = match[2];

      // Determine file path based on language
      let path = '';
      if (language === 'typescript' || language === 'tsx') {
        path = 'MyComponent.tsx';
      } else if (language === 'css') {
        path = 'MyComponent.module.css';
      } else if (language === 'dart') {
        path = 'my_component.dart';
      }

      files.push({ path, content, language });
    }

    return { files };
  }
}
```

---

### 4. LLM Client erweitern (Vision Support)

```typescript
// src/llm/client.ts

export class LLMClient {
  async chatWithImage(
    model: string,
    imageUrl: string,
    prompt: string
  ): Promise<string> {
    const modelInfo = MODELS[model];

    if (!modelInfo.supports_vision) {
      throw new Error(`Model ${model} does not support vision`);
    }

    switch (modelInfo.provider) {
      case 'qwen':
        return this.chatQwenVision(model, imageUrl, prompt);
      case 'local':
        return this.chatLocalVision(model, imageUrl, prompt);
      default:
        throw new Error(`Vision not supported for provider: ${modelInfo.provider}`);
    }
  }

  private async chatQwenVision(model: string, imageUrl: string, prompt: string): Promise<string> {
    // Qwen3 Omni via OpenRouter oder Direct API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen-3-omni',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async chatLocalVision(model: string, imageUrl: string, prompt: string): Promise<string> {
    // Llama 4 Scout Local (Ollama mit Vision)
    const endpoint = process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434';

    // Download image als Base64
    const imageBase64 = await this.downloadImageAsBase64(imageUrl);

    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-4-scout',
        prompt,
        images: [imageBase64]
      })
    });

    const data = await response.json();
    return data.response;
  }

  private async downloadImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}
```

---

## 🎨 UI COMPONENTS

### 1. Screenshot Upload Component

```tsx
// frontend/components/ScreenshotUpload.tsx

import { useState } from 'react';

interface ScreenshotUploadProps {
  teamId: string;
  onUploadComplete: (taskId: string) => void;
}

export function ScreenshotUpload({ teamId, onUploadComplete }: ScreenshotUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<'react' | 'flutter' | 'html'>('react');
  const [framework, setFramework] = useState<'tailwind' | 'css'>('tailwind');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('screenshot', file);
    formData.append('target_format', targetFormat);
    formData.append('framework', framework);

    const response = await fetch(`/api/teams/${teamId}/vision-tasks`, {
      method: 'POST',
      body: formData
    });

    const { data } = await response.json();
    onUploadComplete(data.task_id);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="screenshot-upload"
        />
        <label htmlFor="screenshot-upload" className="cursor-pointer">
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-64 mx-auto" />
          ) : (
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, WebP up to 10MB</p>
            </div>
          )}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Format
          </label>
          <select
            value={targetFormat}
            onChange={(e) => setTargetFormat(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="react">React</option>
            <option value="flutter">Flutter</option>
            <option value="html">HTML</option>
            <option value="vue">Vue.js</option>
            <option value="svelte">Svelte</option>
          </select>
        </div>

        {targetFormat === 'react' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSS Framework
            </label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="tailwind">Tailwind CSS</option>
              <option value="css">CSS Modules</option>
              <option value="styled">Styled Components</option>
            </select>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Generate Code
      </button>
    </div>
  );
}
```

### 2. Vision Task Progress Component

```tsx
// frontend/components/VisionTaskProgress.tsx

import { useEffect, useState } from 'react';

interface VisionTask {
  task_id: string;
  status: 'analyzing' | 'generating' | 'completed' | 'failed';
  progress: number;
  result?: {
    files: { path: string; content: string; language: string }[];
  };
  error?: string;
}

export function VisionTaskProgress({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<VisionTask | null>(null);

  useEffect(() => {
    // WebSocket für Live Updates
    const ws = new WebSocket(`ws://localhost:3000/ws/vision-tasks/${taskId}`);

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setTask(update);
    };

    // Initial Fetch
    fetch(`/api/teams/current/vision-tasks/${taskId}`)
      .then((res) => res.json())
      .then(({ data }) => setTask(data));

    return () => ws.close();
  }, [taskId]);

  if (!task) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {task.status === 'analyzing' && '🔍 Analyzing Screenshot...'}
          {task.status === 'generating' && '⚙️ Generating Code...'}
          {task.status === 'completed' && '✅ Code Generated!'}
          {task.status === 'failed' && '❌ Failed'}
        </h3>
        <span className="text-sm text-gray-600">{task.progress}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${task.progress}%` }}
        />
      </div>

      {task.status === 'completed' && task.result && (
        <div className="space-y-2">
          <h4 className="font-semibold">Generated Files:</h4>
          {task.result.files.map((file, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm">{file.path}</span>
                <button className="text-blue-600 hover:underline text-sm">
                  Copy
                </button>
              </div>
              <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
                <code className={`language-${file.language}`}>
                  {file.content}
                </code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {task.status === 'failed' && task.error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-800">
          {task.error}
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 TESTING

### Unit Tests
```typescript
// tests/agents/vision.test.ts

describe('VisionAgent', () => {
  it('should analyze screenshot and extract layout', async () => {
    const agent = new VisionAgent('qwen3-omni');
    const analysis = await agent.analyzeScreenshot('https://example.com/screenshot.png');

    expect(analysis.layout).toBeDefined();
    expect(analysis.components).toHaveLength(3);
    expect(analysis.colors.background).toBe('#FFFFFF');
  });
});
```

### Integration Tests
```typescript
// tests/api/vision-tasks.test.ts

describe('POST /api/teams/:id/vision-tasks', () => {
  it('should upload screenshot and create vision task', async () => {
    const response = await request(app)
      .post('/api/teams/team_123/vision-tasks')
      .attach('screenshot', 'tests/fixtures/login-screen.png')
      .field('target_format', 'react')
      .field('framework', 'tailwind');

    expect(response.status).toBe(200);
    expect(response.body.data.task_id).toBeDefined();
    expect(response.body.data.status).toBe('analyzing');
  });
});
```

---

## 📊 PRESET INTEGRATION

### Preset V (Vision)
```yaml
V:
  name: "Vision + Code"
  agents:
    vision:
      model: qwen3-omni
      role: "Analysiert Screenshots"
    code:
      model: deepseek-v3.2
      role: "Generiert Code basierend auf Vision"
  estimated_cost_per_build: 15
  quality_score: 72
```

### Preset IQ (mit Vision)
```yaml
IQ:
  agents:
    vision:
      model: llama-4-scout-local
      role: "Analysiert Screenshots (LOKAL)"
    code:
      model: iquest-coder-v1-40b-loop
      role: "Generiert Code (IQuest Loop)"
  estimated_cost_per_build: 10
```

---

## 🚀 ROLLOUT PLAN

### Phase 1: MVP (5h)
- ✅ Screenshot Upload API
- ✅ Vision Agent (nur Analyse)
- ✅ Simple UI (Upload + Preview)

### Phase 2: Code Generation (3h)
- ✅ Code Generator Agent
- ✅ React Output
- ✅ Tailwind Support

### Phase 3: Multi-Format (2h)
- ✅ Flutter Output
- ✅ HTML Output
- ✅ Vue/Svelte (optional)

### Phase 4: Polish (2h)
- ✅ WebSocket Live Updates
- ✅ Code Preview
- ✅ Download Files

**Total: ~12h**

---

## ✅ ERFOLGSKRITERIEN

- [ ] User kann Screenshot hochladen
- [ ] Vision Agent analysiert Layout korrekt
- [ ] Code Generator erstellt validen Code
- [ ] React + Tailwind funktioniert
- [ ] Flutter Output kompiliert
- [ ] Live Progress Updates im UI
- [ ] Generated Code ist downloadbar

---

**Bereit zum Start?**

