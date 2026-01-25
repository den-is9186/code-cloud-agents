# Getting Started

Willkommen! Diese Anleitung führt dich durch die ersten Schritte mit Code Cloud Agents.

## 📋 Voraussetzungen

Bevor du beginnst, stelle sicher, dass du folgendes installiert hast:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git** >= 2.30.0
- **Redis** >= 6.0 (für lokale Entwicklung)
- **Python** >= 3.11 (für Aider AI)

### System Requirements

| Component | Minimum | Empfohlen |
|-----------|---------|-----------|
| RAM | 4 GB | 8 GB |
| CPU | 2 Cores | 4 Cores |
| Disk Space | 2 GB | 5 GB |
| OS | Linux, macOS, Windows (WSL) | Ubuntu 22.04+ |

## 🚀 Installation

### 1. Repository klonen

```bash
git clone git@github.com:den-is9186/code-cloud-agents.git
cd code-cloud-agents
```

Oder mit HTTPS:

```bash
git clone https://github.com/den-is9186/code-cloud-agents.git
cd code-cloud-agents
```

### 2. Dependencies installieren

```bash
npm install
```

Dies installiert alle benötigten Node.js Packages:
- express
- ioredis
- jest (dev)
- supertest (dev)

### 3. Redis Setup

#### Option A: Docker (Empfohlen)

```bash
docker run -d \
  --name code-cloud-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### Option B: Lokale Installation

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

#### Redis Verbindung testen

```bash
redis-cli ping
# Erwartete Ausgabe: PONG
```

### 4. Environment Configuration

Erstelle eine `.env` Datei von der Vorlage:

```bash
cp .env.example .env
```

Bearbeite `.env` und füge deine Konfiguration hinzu:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# GitHub Configuration (optional für lokale Entwicklung)
GITHUB_TOKEN=ghp_your_token_here

# Anthropic API (für AI Features)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> **⚠️ Wichtig**: Committe niemals deine `.env` Datei! Sie enthält sensible Daten.

### 5. Aider AI installieren (optional)

Wenn du AI-Features nutzen möchtest:

```bash
pip install aider-chat
aider --version
```

## ▶️ Server starten

### Development Mode

```bash
npm run dev
```

Der Server startet auf `http://localhost:3000` mit Auto-Reload.

### Production Mode

```bash
npm start
```

### Server-Status prüfen

```bash
curl http://localhost:3000/health
```

Erwartete Antwort:
```json
{
  "status": "healthy",
  "redis": "connected"
}
```

## ✅ Verifizierung

### 1. Health Check

```bash
curl http://localhost:3000/health
```

### 2. API Test

```bash
# Task Queue abrufen
curl http://localhost:3000/api/v1/supervisor/queue

# Agent States listen
curl http://localhost:3000/api/v1/agent/states
```

### 3. Tests ausführen

```bash
# Alle Tests
npm test

# Nur Unit Tests
npm run test:unit

# Nur Integration Tests
npm run test:integration

# Mit Coverage
npm run test:coverage
```

Alle Tests sollten grün sein ✅

## 📚 Nächste Schritte

Jetzt bist du bereit loszulegen! Hier sind einige empfohlene nächste Schritte:

1. **[Architecture Overview](Architecture-Overview.md)** - Verstehe die System-Architektur
2. **[API Reference](API-Reference.md)** - Lerne die API kennen
3. **[Development Guide](Development-Guide.md)** - Beginne mit der Entwicklung
4. **[Master Runbook](Master-Runbook.md)** - Befolge den Development Workflow

## 🎯 Dein erstes Feature

Möchtest du direkt loslegen? Hier ist ein einfaches Beispiel:

### Eine neue Task zur Queue hinzufügen

```bash
# Via API
curl -X POST http://localhost:3000/api/v1/supervisor/queue \
  -H "Content-Type: application/json" \
  -d '{"task": "Create a simple calculator function"}'

# Response
{
  "task": "Create a simple calculator function",
  "position": 0,
  "total": 1
}
```

### Queue überprüfen

```bash
curl http://localhost:3000/api/v1/supervisor/queue

# Response
{
  "tasks": [
    {
      "index": 0,
      "task": "Create a simple calculator function",
      "taskId": "queue:0:...",
      "state": null
    }
  ],
  "total": 1
}
```

## 🔧 Troubleshooting

### Redis Connection Failed

**Problem**: Server kann keine Verbindung zu Redis herstellen

**Lösung**:
```bash
# Prüfe ob Redis läuft
redis-cli ping

# Wenn nicht, starte Redis
# Docker:
docker start code-cloud-redis

# Systemd:
sudo systemctl start redis-server
```

### Port bereits in Verwendung

**Problem**: Port 3000 ist bereits belegt

**Lösung**:
```bash
# Ändere Port in .env
PORT=3001

# Oder finde den Prozess
lsof -i :3000
kill -9 <PID>
```

### Tests schlagen fehl

**Problem**: Jest Tests schlagen fehl

**Lösung**:
```bash
# Prüfe Node Version
node --version  # Sollte >= 18.0.0 sein

# Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install

# Redis muss laufen
redis-cli ping
```

## 📖 Weitere Ressourcen

- **[Configuration Reference](Configuration-Reference.md)** - Alle Konfigurationsoptionen
- **[Environment Variables](Environment-Variables.md)** - ENV-Variablen Referenz
- **[FAQ](FAQ.md)** - Häufig gestellte Fragen
- **[Troubleshooting](Troubleshooting.md)** - Detaillierte Problemlösungen

## 🤝 Hilfe bekommen

Hast du Probleme? Hier sind einige Optionen:

1. Prüfe die **[Troubleshooting](Troubleshooting.md)** Seite
2. Durchsuche die **[FAQ](FAQ.md)**
3. Öffne ein [GitHub Issue](https://github.com/den-is9186/code-cloud-agents/issues)
4. Starte eine [GitHub Discussion](https://github.com/den-is9186/code-cloud-agents/discussions)

---

**Nächstes**: [Architecture Overview](Architecture-Overview.md) →
