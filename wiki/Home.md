# Code Cloud Agents Wiki

Willkommen zur offiziellen Dokumentation des **Code Cloud Agents** Projekts!

## 🎯 Über das Projekt

Code Cloud Agents ist ein autonomes AI-gestütztes Code-Generation-System, das auf GitHub Actions läuft und mit Aider AI + Claude Sonnet 4 Software basierend auf natürlichsprachlichen Aufgaben erstellt.

## 📚 Dokumentations-Übersicht

### Einstieg
- **[Getting Started](Getting-Started.md)** - Schnelleinstieg und erste Schritte
- **[Quickstart Tutorial](Quickstart-Tutorial.md)** - Ihr erstes Projekt in 5 Minuten

### Architektur & Konzepte
- **[Architecture Overview](Architecture-Overview.md)** - System-Architektur und Komponenten
- **[Multi-Agent System](Multi-Agent-System.md)** - Verständnis des Multi-Agent-Ansatzes
- **[Tool Calling vs Agentic AI](Tool-Calling-And-Agentic.md)** - Konzepte und Unterschiede
- **[Contracts System](Contracts-System.md)** - Contract-First Development

### API & Integration
- **[API Reference](API-Reference.md)** - Vollständige API-Dokumentation
- **[Agent State Management](Agent-State-Management.md)** - Agent State API
- **[Task Queue Management](Task-Queue-Management.md)** - Task Queue API
- **[File Operations](File-Operations.md)** - File Operations API

### Entwicklung
- **[Development Guide](Development-Guide.md)** - Entwicklungs-Workflow
- **[Master Runbook](Master-Runbook.md)** - Step-by-Step Anleitung
- **[Testing Guide](Testing-Guide.md)** - Testing-Strategien
- **[Capabilities Registry](Capabilities-Registry.md)** - Feature-Registrierung

### Workflows & CI/CD
- **[GitHub Actions Workflows](GitHub-Actions-Workflows.md)** - Workflow-Konfiguration
- **[Auto-Build System](Auto-Build-System.md)** - Automatische Builds
- **[Task Queue Processing](Task-Queue-Processing.md)** - Queue-Processing

### Deployment & Operations
- **[Deployment Guide](Deployment-Guide.md)** - Deployment-Strategien
- **[Production Checklist](Production-Checklist.md)** - Go-Live Anforderungen
- **[Monitoring & Logging](Monitoring-And-Logging.md)** - Überwachung
- **[Troubleshooting](Troubleshooting.md)** - Problemlösungen

### Best Practices & Policies
- **[Operational Policy](Operational-Policy.md)** - Branch-Strategie, Merge-Rules
- **[Security Best Practices](Security-Best-Practices.md)** - Security Guidelines
- **[Code Review Guidelines](Code-Review-Guidelines.md)** - Review-Prozess
- **[Contributing Guide](Contributing-Guide.md)** - Beiträge zum Projekt

### Referenz
- **[Configuration Reference](Configuration-Reference.md)** - Alle Konfigurationsoptionen
- **[Environment Variables](Environment-Variables.md)** - ENV-Variablen
- **[Error Codes Reference](Error-Codes-Reference.md)** - API Error Codes
- **[FAQ](FAQ.md)** - Häufig gestellte Fragen

## 🚀 Schnellstart

```bash
# 1. Repository klonen
git clone git@github.com:den-is9186/code-cloud-agents.git
cd code-cloud-agents

# 2. Dependencies installieren
npm install

# 3. Environment konfigurieren
cp .env.example .env
# ENV-Variablen anpassen

# 4. Entwicklungsserver starten
npm run dev

# 5. Tests ausführen
npm test
```

## 📖 Wichtige Konzepte

### Contract-First Development
Alle API- und Datenbankänderungen müssen **ZUERST** in den Contracts (`CONTRACTS/*.md`) dokumentiert werden, bevor Code implementiert wird.

### Multi-Agent System
Das System nutzt verschiedene spezialisierte Agents:
- **Supervisor** - Planung und Koordination
- **Architect** - System-Design
- **Coach** - Task-Management
- **Code Agent** - Implementation
- **Review Agent** - Code-Review
- **Test Agent** - Testing
- **Docs Agent** - Dokumentation

📊 **[Quality Index (QII)](Multi-Agent-System.md#quality-comparison-qii)** - Vergleich der Qualitätskennzahlen verschiedener Agent-Presets

### Agentic AI vs Tool Calling
- **Tool Calling**: Agents rufen externe Funktionen auf
- **Agentic**: Agents planen selbstständig, delegieren und korrigieren

## 🏗️ Projekt-Struktur

```
code-cloud-agents/
├── .github/workflows/    # GitHub Actions Workflows
├── src/                  # Source Code
│   ├── index.js         # Express Server
│   └── agents/          # Agent Implementierungen
├── tests/               # Test Files
├── CONTRACTS/           # API & Data Contracts
├── ops/                 # Operational Policies
├── docs/                # Zusätzliche Dokumentation
├── wiki/                # Wiki-Dokumentation
├── config/              # Konfigurationsdateien
├── MASTER_RUNBOOK.md    # Development Workflow
├── PROJECT_STATE.md     # Projekt-Status
├── PRODUCTION_CHECKLIST.md
└── capabilities.yml     # Feature Registry
```

## 🔧 Tech Stack

| Component | Technology | Status |
|-----------|-----------|--------|
| **CI/CD** | GitHub Actions | ✅ Active |
| **AI Engine** | Aider + Claude Sonnet 4 | ✅ Active |
| **Backend** | Node.js + Express | ✅ Active |
| **State Store** | Redis | ✅ Active |
| **Version Control** | Git/GitHub | ✅ Active |
| **Testing** | Jest | ✅ Active |

## 💡 Nächste Schritte

1. Lies die **[Getting Started](Getting-Started.md)** Anleitung
2. Verstehe die **[Architecture Overview](Architecture-Overview.md)**
3. Befolge den **[Master Runbook](Master-Runbook.md)** für Entwicklung
4. Prüfe die **[Production Checklist](Production-Checklist.md)** vor Deployment

## 🤝 Beitragen

Interessiert daran, zum Projekt beizutragen? Lies unsere **[Contributing Guide](Contributing-Guide.md)** für Details zum Entwicklungsprozess, Code-Standards und wie du Pull Requests einreichst.

## 📄 Lizenz

MIT License - siehe LICENSE Datei für Details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/den-is9186/code-cloud-agents/issues)
- **Discussions**: [GitHub Discussions](https://github.com/den-is9186/code-cloud-agents/discussions)
- **Wiki**: Diese Dokumentation

## 📝 Projekt-Status

**Current Phase**: Setup & Foundation  
**Status**: 🟡 In Progress  
**Version**: 1.0.0

Siehe **[PROJECT_STATE.md](../PROJECT_STATE.md)** für detaillierte Status-Updates.

---

**Zuletzt aktualisiert**: 2025-01-25
