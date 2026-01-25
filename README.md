# Code Cloud Agents

Autonomous AI Code Generation System powered by Aider + Claude Sonnet 4

---

## Overview

This project implements an autonomous code generation system that runs on GitHub Actions, using Aider AI to build software based on natural language tasks.

## Features

- **Autonomous Builds**: Schedule or trigger builds via GitHub Actions
- **AI-Powered**: Uses Claude Sonnet 4 via Aider for code generation
- **Contract-First**: API and data contracts defined before implementation
- **Production-Ready**: Full security, testing, and deployment checklist

## Quick Start

```bash
# Clone
git clone git@github.com:den-is9186/code-cloud-agents.git
cd code-cloud-agents

# Install dependencies (TBD)
npm install

# Run tests (TBD)
npm test
```

## Project Structure

```
.github/workflows/  # GitHub Actions workflows
src/               # Source code
tests/             # Test files
CONTRACTS/         # API and data contracts
ops/               # Operational policies
docs/              # Documentation
eval/              # Evaluation and scorecards
```

## Documentation

- [Project State](PROJECT_STATE.md) - Current status and roadmap
- [Master Runbook](MASTER_RUNBOOK.md) - Development workflow
- [Production Checklist](PRODUCTION_CHECKLIST.md) - Go-live requirements
- [Capabilities](capabilities.yml) - Feature registry with tests

## License

MIT
