# Capabilities Registry

> **Purpose:** Central registry for all feature capabilities with strict test requirements

---

## Overview

The `capabilities.yml` file serves as the **single source of truth** for all feature capabilities in the Code Cloud Agents project. Every feature must be registered here before implementation, with clearly defined test requirements.

**Location:** `/capabilities.yml`

**Philosophy:** No feature exists without being registered. No registration exists without test requirements.

---

## Registry Structure

```yaml
version: "1.0"
project: "code-cloud-agents"

capabilities:
  - id: "unique-feature-id"
    name: "Human Readable Feature Name"
    description: "What this feature does"
    status: "planned|in-progress|active|deprecated"
    tests_required:
      - type: "unit|integration|e2e"
        description: "What must be tested"

coverage:
  minimum: 80
  targets:
    unit: 90
    integration: 70
```

---

## Field Definitions

### Capability Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique kebab-case identifier (e.g., `auto-build-workflow`) |
| `name` | Yes | Human-readable name for the feature |
| `description` | Yes | Brief explanation of what the feature does |
| `status` | Yes | Current state: `planned`, `in-progress`, `active`, `deprecated` |
| `tests_required` | Yes | Array of test requirements (minimum 1) |

### Test Requirement Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Test type: `unit`, `integration`, `e2e`, `validation` |
| `description` | Yes | What aspect must be tested |

---

## Status Definitions

### `planned`
- Feature is designed but not yet implemented
- Tests are defined but not written
- Cannot be used in production

### `in-progress`
- Implementation has started
- Tests are being written/completed
- Not ready for production

### `active`
- Feature is fully implemented
- All required tests pass
- Ready for production use

### `deprecated`
- Feature is being phased out
- Tests remain but feature is not recommended
- Will be removed in future version

---

## How to Register a New Feature

### Step 1: Define the Feature

Before writing ANY code, add the feature to `capabilities.yml`:

```yaml
capabilities:
  - id: "my-new-feature"
    name: "My New Feature"
    description: "What this feature accomplishes"
    status: "planned"
    tests_required:
      - type: "unit"
        description: "Core logic functions correctly"
      - type: "integration"
        description: "Integrates with external systems"
```

### Step 2: Define Test Requirements

Every feature must have **at least one test requirement**. Consider:

- **Unit tests**: Test isolated functions and logic
- **Integration tests**: Test interactions with other components
- **E2E tests**: Test full user workflows (for user-facing features)
- **Validation tests**: Test input validation and error handling

### Step 3: Update Status During Development

```yaml
# When you start coding:
status: "in-progress"

# When all tests pass:
status: "active"
```

### Step 4: Implement Tests

For each test requirement:

1. Create test file in `/tests/`
2. Write test that validates the requirement
3. Ensure test passes
4. Reference the capability ID in test comments

---

## Test Requirements Best Practices

### Minimum Requirements

Every feature must have:
- ✅ At least 1 unit test
- ✅ At least 1 integration test (if feature interacts with external systems)
- ✅ Input validation test (if feature accepts user input)

### Example: Well-Defined Test Requirements

```yaml
- id: "user-authentication"
  name: "User Authentication"
  description: "JWT-based user authentication system"
  status: "active"
  tests_required:
    - type: "unit"
      description: "Token generation creates valid JWT"
    - type: "unit"
      description: "Token validation correctly verifies signatures"
    - type: "unit"
      description: "Expired tokens are rejected"
    - type: "integration"
      description: "Login endpoint returns token on valid credentials"
    - type: "integration"
      description: "Protected routes reject invalid tokens"
    - type: "validation"
      description: "Malformed credentials are rejected with 400"
```

---

## Coverage Requirements

### Global Minimums

```yaml
coverage:
  minimum: 80      # Overall code coverage
  targets:
    unit: 90       # Unit test coverage target
    integration: 70 # Integration test coverage target
```

### Enforcement

- CI fails if coverage drops below minimum
- PRs cannot be merged without meeting coverage targets
- Use `npm run coverage` or `pytest --cov` to check coverage

---

## Integration with Development Workflow

### Before Implementation

1. ✅ Feature registered in `capabilities.yml`
2. ✅ Test requirements defined
3. ✅ Status set to `planned`

### During Implementation

1. ✅ Status updated to `in-progress`
2. ✅ Tests written for each requirement
3. ✅ Tests passing locally

### Before Merge to `develop`

1. ✅ All test requirements satisfied
2. ✅ Status updated to `active`
3. ✅ Coverage targets met
4. ✅ Code review approved

---

## Example: Complete Feature Registration

```yaml
- id: "auto-build-workflow"
  name: "Auto Build Workflow"
  description: "GitHub Actions workflow for autonomous code generation with Aider"
  status: "active"
  tests_required:
    - type: "integration"
      description: "Workflow triggers successfully on schedule"
    - type: "integration"
      description: "Aider executes tasks from queue"
    - type: "integration"
      description: "Generated code is committed and pushed"
    - type: "integration"
      description: "Queue is updated after task processing"
    - type: "validation"
      description: "Empty tasks are skipped gracefully"
    - type: "unit"
      description: "API key is loaded securely from secrets"
```

---

## Common Pitfalls

### ❌ Registering Without Tests
```yaml
# BAD: No tests defined
- id: "some-feature"
  name: "Some Feature"
  tests_required: []
```

### ✅ Always Define Tests
```yaml
# GOOD: At least one test
- id: "some-feature"
  name: "Some Feature"
  tests_required:
    - type: "unit"
      description: "Feature works correctly"
```

### ❌ Vague Test Descriptions
```yaml
# BAD: Not specific
- type: "unit"
  description: "Tests the function"
```

### ✅ Specific Test Descriptions
```yaml
# GOOD: Clear and specific
- type: "unit"
  description: "Function returns correct sum for positive integers"
```

---

## Deprecating Features

When a feature is no longer recommended:

```yaml
- id: "old-feature"
  name: "Old Feature (Deprecated)"
  description: "Legacy feature, use new-feature instead"
  status: "deprecated"
  tests_required:
    # Keep tests to ensure backward compatibility
    - type: "unit"
      description: "Legacy behavior still works"
```

---

## Checking Registry Compliance

### Manual Check
```bash
# Verify all features have required fields
cat capabilities.yml

# Check test coverage
npm run coverage
# or
pytest --cov
```

### CI/CD Enforcement

The CI pipeline automatically:
- ✅ Validates `capabilities.yml` structure
- ✅ Ensures all features have test requirements
- ✅ Checks that coverage targets are met
- ✅ Fails if any `active` feature lacks passing tests

---

## Summary

**Rules:**
1. Register feature BEFORE coding
2. Define test requirements BEFORE coding
3. Update status as you progress
4. All tests must pass before `active` status
5. Never skip test requirements
6. Coverage targets are mandatory

**Remember:** The registry is not just documentation—it's a contract between you and the quality standards of this project.

---

## Related Documentation

- [MASTER_RUNBOOK.md](../MASTER_RUNBOOK.md) - Step-by-step development process
- [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) - Pre-deployment requirements
- [Code Review Guidelines](./Code-Review-Guidelines.md) - Review process
