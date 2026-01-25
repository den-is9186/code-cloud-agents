# Data Contract - Code Cloud Agents

> **Contract-First:** Diese Datei definiert ALLE Datenstrukturen.
> Änderungen hier MÜSSEN vor Code-Implementierung dokumentiert werden.

**Version:** 1.0.0
**Letzte Änderung:** 2026-01-25

---

## Database

**Typ:** SQLite (MVP) / PostgreSQL (Production)
**Migrations:** TBD (Prisma/Knex/Raw SQL)

---

## Tables (Phase 2)

### builds

Speichert Build-History

```sql
CREATE TABLE builds (
  id VARCHAR(36) PRIMARY KEY,
  task TEXT NOT NULL,
  status VARCHAR(20) NOT NULL, -- queued, running, completed, failed
  priority VARCHAR(20) DEFAULT 'normal',

  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  result_summary TEXT,
  error_message TEXT,

  metadata JSON -- Additional data
);

CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_builds_created_at ON builds(created_at);
```

---

### commits

Tracking von generierten Commits

```sql
CREATE TABLE commits (
  id VARCHAR(36) PRIMARY KEY,
  build_id VARCHAR(36) REFERENCES builds(id),

  commit_hash VARCHAR(40) NOT NULL,
  commit_message TEXT NOT NULL,
  files_changed INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commits_build_id ON commits(build_id);
```

---

### agents (Future - Multi-Agent System)

```sql
CREATE TABLE agents (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- Coach, Architect, Developer, QA
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'idle',

  config JSON,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Data Retention

- **builds:** 90 Tage (dann archivieren)
- **commits:** 365 Tage
- **logs:** 30 Tage

---

## Backups

- **Frequency:** Täglich (Production)
- **Retention:** 7 Tage

---

## Enums

### build_status
- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

### build_priority
- `low`
- `normal`
- `high`
- `urgent`

### agent_type
- `coach`
- `architect`
- `developer`
- `qa`
- `reviewer`
