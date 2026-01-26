# SECURITY

## Threat Model (Minimum)
- Command Injection (Shell/Git)
- Path Traversal (File Tools)
- JSON Injection / Parsing Crashes
- Secrets Leakage

---

## Required Fixes
- **SEC-002:** Keine `exec("git ...")` Strings. Nur `execFile` mit Args.
- **SEC-001:** `validatePath()` für file_read/file_write/file_patch/file_delete/directory_list.
- **BUG-001:** Zod Schemas + `safeJsonParse` für Agent JSON Outputs.

---

## Secrets
- Niemals API Keys in Dateien commiten.
- Nur Env Vars oder Secret Stores.

---

## CI/CD Hardening (Empfohlen)
- Keine direkten Pushes auf `main` durch Automationen ohne Tests.
- Build/Test Gate vor Merge.
