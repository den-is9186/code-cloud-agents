# Code Review Guidelines

> **Purpose:** Ensure code quality, maintainability, and adherence to project standards through effective code reviews

---

## Overview

Code reviews are **mandatory** for all changes to `develop` and `main` branches. They serve to:
- Catch bugs before production
- Maintain code quality standards
- Share knowledge across the team
- Ensure contract compliance
- Validate security practices

**Rule:** No merge without approval.

---

## Code Review Process

### 1. Before Creating a PR

**Author Checklist:**

- [ ] All tests pass locally
- [ ] Code follows project conventions
- [ ] Contracts updated (if API/DB changes)
- [ ] `capabilities.yml` updated (if new feature)
- [ ] Documentation updated
- [ ] No `console.log()` or debug statements
- [ ] No TODOs without issue references
- [ ] Secrets not committed

### 2. Creating the Pull Request

**PR Title Format:**
```
type(scope): brief description

Examples:
feat(workflow): add task queue processing
fix(auth): resolve token expiration bug
docs(wiki): add monitoring guidelines
```

**PR Description Must Include:**
```markdown
## Changes
- What was changed
- Why it was changed

## Testing
- How to test the changes
- Which tests were added/modified

## Contracts
- [ ] No contract changes
- [ ] Contract changes documented in CONTRACTS/

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] capabilities.yml updated (if new feature)
```

### 3. Review Assignment

**Who Reviews:**
- At least 1 reviewer required
- 2 reviewers for `develop` → `main`
- Subject matter expert for specialized changes

**Review Timeline:**
- Standard PRs: Within 24 hours
- Hotfixes: Within 2 hours
- Breaking changes: Within 48 hours

### 4. Review Process

**Reviewer Actions:**

1. **Read the PR description** - Understand the context
2. **Check contracts** - Verify contract compliance
3. **Review code** - Apply guidelines (see below)
4. **Test locally** - Run tests and verify functionality
5. **Comment** - Provide constructive feedback
6. **Approve or Request Changes**

### 5. Addressing Feedback

**Author Actions:**

- Respond to all comments
- Make requested changes
- Mark conversations as resolved
- Request re-review after changes
- Don't take feedback personally—it's about the code, not you

### 6. Merging

**Merge Requirements:**

- [ ] All reviewers approved
- [ ] All conversations resolved
- [ ] CI/CD pipeline green
- [ ] No merge conflicts
- [ ] Contracts updated (if applicable)

**Merge Strategy:**

| Source → Target | Strategy | Command |
|-----------------|----------|---------|
| `feature/*` → `develop` | Squash | Squash and merge |
| `fix/*` → `develop` | Squash | Squash and merge |
| `develop` → `main` | Merge Commit | Create merge commit |
| `hotfix/*` → `main` | Merge Commit | Create merge commit |

---

## What to Look For

### 1. Functionality

#### ✅ Check:
- Does the code do what the PR says?
- Are edge cases handled?
- Are error conditions handled gracefully?
- Is the logic correct?

#### Questions to Ask:
- What happens if the input is null/empty/invalid?
- What happens if the API call fails?
- What happens under high load?

### 2. Code Quality

#### ✅ Check:
- Is the code readable?
- Are variable/function names clear?
- Is the code DRY (Don't Repeat Yourself)?
- Is complexity minimized?

#### Red Flags:
- ❌ Functions longer than 50 lines
- ❌ Nested conditionals deeper than 3 levels
- ❌ Copy-pasted code blocks
- ❌ Magic numbers without constants
- ❌ Unclear variable names (`data`, `tmp`, `x`)

#### Examples:

**❌ BAD:**
```javascript
function p(d) {
  if (d) {
    if (d.u) {
      if (d.u.n) {
        return d.u.n;
      }
    }
  }
  return null;
}
```

**✅ GOOD:**
```javascript
function getUsername(data) {
  return data?.user?.name ?? null;
}
```

### 3. Testing

#### ✅ Check:
- Are there tests for new functionality?
- Do tests cover edge cases?
- Are tests meaningful (not just for coverage)?
- Do test names describe what they test?

#### Test Coverage Requirements:
- New features: 90% coverage
- Bug fixes: Test that reproduces the bug
- Refactors: Existing tests still pass

#### Examples:

**❌ BAD:**
```javascript
test('test1', () => {
  expect(add(1, 2)).toBe(3);
});
```

**✅ GOOD:**
```javascript
test('add returns sum of two positive integers', () => {
  expect(add(1, 2)).toBe(3);
});

test('add handles negative numbers', () => {
  expect(add(-1, -2)).toBe(-3);
});

test('add returns null for non-numeric input', () => {
  expect(add('a', 'b')).toBeNull();
});
```

### 4. Security

#### ✅ Check:
- No secrets in code
- Input validation present
- SQL injection prevention (parameterized queries)
- XSS prevention (output sanitization)
- Authentication/authorization checked

#### Red Flags:
- ❌ API keys in code
- ❌ SQL string concatenation
- ❌ Unvalidated user input
- ❌ Unescaped HTML output
- ❌ Missing auth checks on endpoints

#### Examples:

**❌ BAD:**
```javascript
// SQL injection vulnerability
db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);

// XSS vulnerability
res.send(`<div>Hello ${req.query.name}</div>`);
```

**✅ GOOD:**
```javascript
// Parameterized query
db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);

// Escaped output
res.send(`<div>Hello ${escapeHtml(req.query.name)}</div>`);
```

### 5. Performance

#### ✅ Check:
- No unnecessary loops
- Database queries optimized
- Caching used where appropriate
- No N+1 query problems

#### Red Flags:
- ❌ Queries inside loops
- ❌ Loading entire dataset into memory
- ❌ Synchronous operations blocking async code
- ❌ Missing pagination for large datasets

### 6. Error Handling

#### ✅ Check:
- Try-catch blocks around risky operations
- Meaningful error messages
- Proper HTTP status codes
- Errors logged appropriately

#### Examples:

**❌ BAD:**
```javascript
app.post('/api/task', (req, res) => {
  const result = processTask(req.body);
  res.json(result);
});
```

**✅ GOOD:**
```javascript
app.post('/api/task', async (req, res) => {
  try {
    const result = await processTask(req.body);
    res.json(result);
  } catch (error) {
    logger.error({ error: error.message, taskId: req.body.id }, 'Task processing failed');
    res.status(500).json({ 
      error: 'Task processing failed',
      message: error.message 
    });
  }
});
```

### 7. Documentation

#### ✅ Check:
- Public APIs documented
- Complex logic has comments
- README updated if needed
- Breaking changes documented

#### When Comments Are Needed:
- ✅ "Why" not "what" (explain reasoning)
- ✅ Workarounds or hacks
- ✅ Complex algorithms
- ✅ Non-obvious business logic

#### When Comments Are NOT Needed:
- ❌ Self-explanatory code
- ❌ Restating what code does

### 8. Contract Compliance

#### ✅ Check:
- API changes reflected in `CONTRACTS/api_contract.md`
- Database changes reflected in `CONTRACTS/data_contract.md`
- No silent contract changes
- Contract version incremented if breaking change

#### Verification:

```bash
# Check for contract changes
git diff develop -- CONTRACTS/

# If code changes API/DB but contracts unchanged, request update
```

### 9. Capabilities Registry

#### ✅ Check:
- New features registered in `capabilities.yml`
- Test requirements defined
- Status updated appropriately
- Coverage targets met

---

## Review Checklist

Copy this into every PR review:

```markdown
## Code Review Checklist

### Functionality
- [ ] Code does what PR description says
- [ ] Edge cases handled
- [ ] Error conditions handled

### Quality
- [ ] Code is readable and maintainable
- [ ] No unnecessary complexity
- [ ] No code duplication

### Testing
- [ ] Tests added for new functionality
- [ ] Edge cases tested
- [ ] Tests are meaningful

### Security
- [ ] No secrets in code
- [ ] Input validation present
- [ ] SQL injection prevented
- [ ] Auth/authz checked

### Performance
- [ ] No obvious performance issues
- [ ] Queries optimized
- [ ] Caching used appropriately

### Documentation
- [ ] Public APIs documented
- [ ] Complex logic explained
- [ ] README updated if needed

### Contracts
- [ ] API contract updated (if applicable)
- [ ] Data contract updated (if applicable)
- [ ] capabilities.yml updated (if new feature)

### Standards
- [ ] Follows project conventions
- [ ] No console.log or debug statements
- [ ] No TODOs without issue references
```

---

## Comment Guidelines

### Be Constructive

**❌ BAD:**
```
This code is terrible.
```

**✅ GOOD:**
```
This function could be simplified by extracting the validation logic. 
Consider creating a separate `validateInput()` function for better readability.
```

### Be Specific

**❌ BAD:**
```
Please improve error handling.
```

**✅ GOOD:**
```
Add a try-catch block here to handle the case where the API call fails. 
Return a 500 status with a meaningful error message.
```

### Use Question Format

**Instead of:**
```
This is wrong.
```

**Try:**
```
Could this cause issues if the array is empty? Should we add a check?
```

### Acknowledge Good Code

```
Nice refactoring! This is much more readable.

Great test coverage on the edge cases!

This error handling is excellent.
```

### Use Conventional Comment Prefixes

| Prefix | Meaning |
|--------|---------|
| `nit:` | Minor issue, not blocking |
| `question:` | Seeking clarification |
| `suggestion:` | Optional improvement |
| `issue:` | Must be fixed |
| `blocker:` | Prevents merge |

**Examples:**
```
nit: Consider using const instead of let here since the value doesn't change.

question: What happens if userId is null?

suggestion: This could be simplified with optional chaining (data?.user?.name).

issue: This query is vulnerable to SQL injection. Use parameterized queries.

blocker: Tests are failing. Please fix before merging.
```

---

## Response Time Expectations

### For Reviewers
- Initial review: Within 24 hours
- Re-review after changes: Within 8 hours
- Hotfixes: Within 2 hours

### For Authors
- Respond to comments: Within 24 hours
- Address blocking issues: Immediately
- Request re-review: After all changes made

---

## Common Review Scenarios

### Scenario 1: Large PR (>500 lines)

**Reviewer:**
```
This PR is quite large. Can it be split into smaller, focused PRs?
For now, I'll focus on the critical path (auth changes) and review 
the rest in a follow-up.
```

**Best Practice:** Break large PRs into logical chunks.

### Scenario 2: Disagreement on Approach

**Don't:**
```
This approach is wrong. Do it my way.
```

**Do:**
```
I see you used approach A. I've typically seen approach B used for this pattern 
because [reason]. What was your reasoning for approach A?
```

### Scenario 3: Nitpicks

**Label them:**
```
nit: This could be more concise with destructuring:
const { name, email } = user;

Not blocking, just a suggestion.
```

### Scenario 4: Security Issue

**Clear and firm:**
```
blocker: This endpoint is missing authentication. All API endpoints 
must verify the JWT token. See src/middleware/auth.js for the pattern.
```

---

## Anti-Patterns to Avoid

### As a Reviewer

❌ **Rubber-stamping** - Approving without actually reviewing
❌ **Nitpicking only** - Focusing on style while missing logic bugs
❌ **Rewriting in comments** - Suggesting complete rewrites instead of targeted changes
❌ **Being vague** - "This doesn't look right" without specifics
❌ **Personal preferences** - "I don't like this" without technical reasoning

### As an Author

❌ **Defensive** - Taking feedback personally
❌ **Ignoring feedback** - Marking resolved without addressing
❌ **"WIP" PRs** - Opening PRs before code is ready
❌ **Large PRs** - Submitting 2000+ line changes
❌ **No description** - Empty PR description

---

## Advanced Review Techniques

### 1. Review in Passes

**First Pass:** High-level architecture and approach
**Second Pass:** Logic and correctness
**Third Pass:** Style and optimization

### 2. Check Out and Test

```bash
# Check out the PR branch
gh pr checkout 123

# Run tests
npm test

# Test manually
npm start
curl http://localhost:8080/api/endpoint
```

### 3. Compare with Contracts

```bash
# Show API contract
cat CONTRACTS/api_contract.md

# Show changes to API code
git diff develop -- src/api/

# Verify they match
```

### 4. Review Commit History

```bash
# See individual commits
git log develop..HEAD

# Review commit by commit
git show <commit-hash>
```

---

## Tools and Automation

### Static Analysis

- **ESLint** (JavaScript/TypeScript): Catches common errors
- **Pylint** (Python): Code quality checks
- **SonarQube**: Code quality and security

### Code Coverage

```bash
# JavaScript
npm run coverage

# Python
pytest --cov=src --cov-report=html
```

### Security Scanning

- **Dependabot**: Automated dependency updates
- **Snyk**: Vulnerability scanning
- **GitHub CodeQL**: Static security analysis

### Pre-commit Hooks

```bash
# Install pre-commit
npm install --save-dev husky lint-staged

# Configure in package.json
"lint-staged": {
  "*.js": ["eslint --fix", "git add"]
}
```

---

## Review Approval Criteria

### Approve When:
✅ All functionality works as described
✅ Tests pass and cover edge cases
✅ No security vulnerabilities
✅ Code is maintainable
✅ Documentation is updated
✅ Contracts are compliant
✅ Minor issues can be addressed in follow-up

### Request Changes When:
❌ Tests failing
❌ Security vulnerabilities present
❌ Missing critical functionality
❌ Contract violations
❌ No tests for new features
❌ Code is not maintainable

### Comment (Don't Block) When:
💬 Nitpicks and style preferences
💬 Optional optimizations
💬 Questions for clarification
💬 Suggestions for future improvements

---

## Post-Merge Responsibilities

### Author
- [ ] Monitor CI/CD after merge
- [ ] Watch for production errors
- [ ] Respond to issues within 24 hours
- [ ] Delete feature branch after merge

### Reviewer
- [ ] Available for follow-up questions
- [ ] Help debug if issues arise
- [ ] Share knowledge with team

---

## Related Documentation

- [ops/POLICY.md](../ops/POLICY.md) - Branch and merge policies
- [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) - Pre-deployment requirements
- [Capabilities Registry](./Capabilities-Registry.md) - Feature registration
- [MASTER_RUNBOOK.md](../MASTER_RUNBOOK.md) - Development workflow
