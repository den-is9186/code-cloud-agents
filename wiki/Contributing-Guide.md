# Contributing Guide

Welcome to the Code Cloud Agents project! 🎉 We're excited that you're interested in contributing. This guide will help you get started and ensure your contributions align with our project standards.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)
- [Contract-First Development](#contract-first-development)
- [Code Review Expectations](#code-review-expectations)
- [Issue Reporting Guidelines](#issue-reporting-guidelines)
- [Communication Channels](#communication-channels)
- [Security](#security)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. By participating in this project, you agree to:

- **Be respectful** and considerate in all interactions
- **Be collaborative** and open to feedback
- **Be inclusive** and welcoming to newcomers
- **Focus on what's best** for the community and project
- **Show empathy** towards other community members

Any unacceptable behavior should be reported to the project maintainers.

---

## Ways to Contribute

There are many ways to contribute to this project:

### 🐛 Report Bugs
Found a bug? Please [open an issue](#issue-reporting-guidelines) with detailed information about the problem.

### 💡 Suggest Features
Have an idea for improvement? We'd love to hear it! Open an issue with the `enhancement` label.

### 📝 Improve Documentation
Documentation improvements are always welcome, whether it's fixing typos, clarifying instructions, or adding examples.

### 💻 Write Code
Want to fix a bug or implement a feature? Follow our [development workflow](#development-workflow).

### 🧪 Write Tests
Help us improve test coverage by adding unit, integration, or end-to-end tests.

### 💬 Participate in Discussions
Join discussions on issues and pull requests to share your insights and help guide the project.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Git** installed on your machine
- **Node.js** (v16 or higher) and **npm** installed
- A **GitHub account**
- Familiarity with JavaScript/TypeScript (depending on what you're contributing to)

### Fork and Clone

1. **Fork the repository** by clicking the "Fork" button on GitHub

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/code-cloud-agents.git
   cd code-cloud-agents
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/code-cloud-agents.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Copy the environment template**:
   ```bash
   cp .env.example .env
   ```
   Fill in any required values in `.env`

6. **Verify setup** by running tests:
   ```bash
   npm test
   ```

---

## Development Workflow

### Before You Start

1. **Read the key documents**:
   - `MASTER_RUNBOOK.md` - Development process
   - `ops/POLICY.md` - Project policies
   - `PROJECT_STATE.md` - Current project status
   - `CONTRACTS/` - API and data contracts

2. **Check existing issues** to see if your idea is already being discussed

3. **Create or comment on an issue** to discuss your proposed changes

### Branch Strategy

We use the following branch structure:

| Branch | Purpose | Merge Strategy |
|--------|---------|----------------|
| `main` | Production-ready code | Merge commit from `develop` |
| `develop` | Integration branch | Squash merge from feature branches |
| `feature/*` | New features | Squash to `develop` |
| `fix/*` | Bug fixes | Squash to `develop` |
| `hotfix/*` | Critical production fixes | Direct to `main` + `develop` |

### Workflow Steps

1. **Sync with upstream**:
   ```bash
   git checkout develop
   git fetch upstream
   git merge upstream/develop
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** following our standards

4. **Test your changes**:
   ```bash
   npm test
   npm run lint
   ```

5. **Commit your changes** (see [Commit Message Format](#commit-message-format))

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** (see [Pull Request Process](#pull-request-process))

---

## Branch Naming Conventions

Use descriptive branch names that follow these patterns:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/add-auto-build-workflow` |
| Bug Fix | `fix/description` | `fix/rate-limiting-error` |
| Hotfix | `hotfix/description` | `hotfix/security-patch` |
| Documentation | `docs/description` | `docs/update-contributing-guide` |
| Testing | `test/description` | `test/add-integration-tests` |
| Refactor | `refactor/description` | `refactor/simplify-error-handling` |

**Guidelines**:
- Use lowercase with hyphens
- Be descriptive but concise
- Include issue number if applicable: `feature/123-add-logging`

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): message

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **test**: Adding or updating tests
- **refactor**: Code refactoring (no functional changes)
- **chore**: Maintenance tasks (dependencies, config, etc.)
- **perf**: Performance improvements
- **style**: Code style changes (formatting, semicolons, etc.)
- **ci**: CI/CD changes

### Examples

```bash
feat(workflow): add auto-build with aider

fix(auth): resolve token expiration issue

docs(readme): update installation instructions

test(api): add integration tests for health endpoint

refactor(logging): migrate to structured logging with pino
```

### Guidelines

- Use present tense: "add feature" not "added feature"
- Use imperative mood: "fix bug" not "fixes bug"
- Keep the first line under 72 characters
- Reference issues in the footer: `Closes #123`
- Add breaking changes in the footer: `BREAKING CHANGE: description`

---

## Pull Request Process

### Before Opening a PR

- [ ] Tests pass locally (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is well-documented
- [ ] Commits follow our format
- [ ] Branch is up-to-date with `develop`

### Opening a Pull Request

1. **Navigate to the original repository** and click "New Pull Request"

2. **Set the base branch**:
   - For features/fixes: `develop`
   - For hotfixes: `main`

3. **Write a clear title** following commit message format:
   ```
   feat(workflow): add auto-build with aider
   ```

4. **Fill out the PR template** including:
   - **Description**: What changes were made and why
   - **Related Issues**: Link to related issues (`Closes #123`)
   - **Type of Change**: Bug fix, new feature, breaking change, etc.
   - **Testing**: How you tested the changes
   - **Checklist**: Complete all applicable items

5. **Request reviewers** if you have specific people in mind

6. **Add labels** to categorize your PR

### PR Requirements

#### For All PRs:
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated as needed
- [ ] Documentation updated as needed
- [ ] No merge conflicts with base branch
- [ ] All CI checks pass

#### For Feature PRs:
- [ ] Feature registered in `capabilities.yml`
- [ ] Contracts updated if API/DB changes (see [Contract-First Development](#contract-first-development))
- [ ] Code coverage ≥ 80%

#### For Production Merges (develop → main):
- [ ] **PRODUCTION_CHECKLIST.md** fully completed
- [ ] All security checks passed
- [ ] API documentation updated
- [ ] Smoke tests completed

### After Opening

- **Respond to feedback** promptly and professionally
- **Push updates** to the same branch to update the PR
- **Resolve conversations** once addressed
- **Squash commits** if requested before merge

---

## Testing Requirements

All code changes must include appropriate tests. We maintain a minimum **80% code coverage** across the project.

### Test Types

| Type | When to Use | Location |
|------|-------------|----------|
| **Unit Tests** | Individual functions/components | `tests/unit/` |
| **Integration Tests** | API endpoints, database interactions | `tests/integration/` |
| **End-to-End Tests** | Complete user workflows | `tests/e2e/` |

### Writing Tests

1. **Register tests in `capabilities.yml`** for new features

2. **Follow existing patterns** in the test directory

3. **Write meaningful test descriptions**:
   ```javascript
   describe('Health Check Endpoint', () => {
     it('should return 200 status with ok message', async () => {
       // Test implementation
     });
   });
   ```

4. **Test edge cases and error conditions**:
   - Invalid inputs
   - Missing parameters
   - Rate limiting
   - Error responses

5. **Use test fixtures** for consistent test data

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/unit/health.test.js

# Run with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration
```

### Test Coverage Requirements

- **Overall**: ≥ 80%
- **Unit Tests**: ≥ 90%
- **Integration Tests**: ≥ 70%

View coverage report after running tests in `coverage/` directory.

---

## Documentation Requirements

Good documentation is crucial for maintainability and onboarding.

### What to Document

1. **Code Comments**:
   - Complex logic or algorithms
   - Non-obvious decisions or workarounds
   - Public APIs and function parameters
   - Avoid obvious comments ("increment counter" for `i++`)

2. **README Updates**:
   - New features or configuration options
   - Setup instructions for new dependencies
   - Usage examples

3. **API Documentation**:
   - OpenAPI/Swagger specs for all endpoints
   - Request/response schemas
   - Error responses
   - Authentication requirements

4. **Contract Documentation**:
   - Update `CONTRACTS/api_contract.md` for API changes
   - Update `CONTRACTS/data_contract.md` for database changes

5. **Changelog**:
   - Add entry for user-facing changes
   - Follow semantic versioning

### Documentation Style

- **Be clear and concise**
- **Use examples** where helpful
- **Keep it up-to-date** with code changes
- **Follow existing patterns** in the docs
- **Use proper markdown formatting**

---

## Contract-First Development

**Critical Rule**: All API and database changes must follow the contract-first approach.

### The Process

1. **FIRST**: Update the contract in `CONTRACTS/`
   - `api_contract.md` for API endpoints
   - `data_contract.md` for database schema

2. **THEN**: Implement the code changes

3. **NEVER**: Change contracts silently without documentation

### Why?

- Ensures frontend and backend stay in sync
- Prevents breaking changes
- Serves as living documentation
- Required for CI/CD to pass

### Example Workflow

For adding a new API endpoint:

```markdown
1. Update CONTRACTS/api_contract.md:
   - Add endpoint definition
   - Document request/response format
   - Specify error codes

2. Implement backend code matching contract

3. Update frontend to use new endpoint

4. Update tests

5. Update OpenAPI/Swagger spec
```

---

## Code Review Expectations

Code reviews are a collaborative learning experience. Here's what to expect:

### As a Contributor

- **Expect feedback** - It's how we all improve
- **Don't take it personally** - Reviews focus on code, not people
- **Ask questions** if feedback is unclear
- **Respond promptly** to review comments
- **Make requested changes** or discuss alternatives
- **Mark conversations resolved** after addressing them

### What Reviewers Look For

1. **Correctness**:
   - Does the code work as intended?
   - Are edge cases handled?
   - Are there potential bugs?

2. **Testing**:
   - Are tests comprehensive?
   - Do tests actually validate the feature?
   - Is coverage maintained?

3. **Code Quality**:
   - Is the code readable and maintainable?
   - Does it follow project conventions?
   - Are there simpler approaches?

4. **Security**:
   - Are inputs validated?
   - Are there security vulnerabilities?
   - Are secrets properly handled?

5. **Documentation**:
   - Is the code properly documented?
   - Are contracts updated?
   - Is the API documentation current?

### Review Timelines

- **Small PRs** (< 200 lines): 1-2 business days
- **Medium PRs** (200-500 lines): 2-3 business days
- **Large PRs** (> 500 lines): 3-5 business days (consider breaking it up!)

### Getting Faster Reviews

- Keep PRs small and focused
- Write clear descriptions
- Add helpful code comments
- Ensure all checks pass before requesting review
- Respond quickly to feedback

---

## Issue Reporting Guidelines

Found a bug or have a feature request? Here's how to report it effectively.

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** - Is it already covered?
3. **Try the latest version** - Is the issue already fixed?

### Bug Reports

Use the bug report template and include:

**Required Information**:
- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**:
  - OS and version
  - Node.js version
  - Project version
  - Relevant dependencies

**Helpful Additions**:
- Screenshots or videos
- Error messages and stack traces
- Logs (remove sensitive information!)
- Minimal reproducible example

**Example**:
```markdown
## Bug Description
Health check endpoint returns 500 error when database is disconnected

## Steps to Reproduce
1. Start the application
2. Stop the database service
3. Call GET /health

## Expected Behavior
Should return 503 with graceful error message

## Actual Behavior
Returns 500 with stack trace exposed

## Environment
- OS: Ubuntu 22.04
- Node.js: v18.16.0
- Project version: 1.2.3
```

### Feature Requests

Use the feature request template and include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: Your suggested approach
- **Alternatives Considered**: Other solutions you've thought about
- **Additional Context**: Examples, mockups, or references
- **Priority**: Nice-to-have, should-have, or must-have (your opinion)

### Questions and Discussions

For general questions or discussions:
- Use GitHub Discussions (if enabled)
- Tag appropriately
- Be specific about what you need help with

---

## Communication Channels

### GitHub Issues
- **Bug reports**: Use for reproducible bugs
- **Feature requests**: Use for new feature proposals
- **Questions**: Use for specific technical questions

### GitHub Discussions
- General questions and help
- Community discussions
- Show and tell
- Ideas and brainstorming

### Pull Request Comments
- Code-specific discussions
- Implementation details
- Review feedback

### Communication Guidelines

- **Be respectful** and professional
- **Be specific** - Vague questions get vague answers
- **Be patient** - Maintainers are often volunteers
- **Search first** - Your question may already be answered
- **Follow up** - Update issues if you find a solution

---

## Security

Security is a top priority for this project.

### Reporting Security Vulnerabilities

**DO NOT** create public issues for security vulnerabilities.

Instead:
1. Email the maintainers directly (see SECURITY.md)
2. Include detailed description of the vulnerability
3. Include steps to reproduce if possible
4. Allow time for a fix before public disclosure

### Security Best Practices

When contributing, follow these guidelines:

#### Secrets Management
- **Never commit** secrets, API keys, or credentials
- Use environment variables for sensitive data
- Keep `.env` files in `.gitignore`
- Use `.env.example` for documentation

#### Input Validation
- **Always validate** user inputs
- Use type checking and schema validation
- Implement length limits
- Sanitize where necessary

#### Dependencies
- Keep dependencies up-to-date
- Review dependency security advisories
- Use `npm audit` regularly
- Avoid packages with known vulnerabilities

#### API Security
- Implement rate limiting
- Configure CORS properly
- Use HTTPS in production
- Never expose stack traces in production

---

## Checklist for First-Time Contributors

Ready to make your first contribution? Here's a quick checklist:

- [ ] Read this Contributing Guide
- [ ] Read the README.md
- [ ] Fork and clone the repository
- [ ] Install dependencies and verify setup
- [ ] Find a "good first issue" or create an issue for your idea
- [ ] Create a feature branch
- [ ] Make your changes
- [ ] Write tests
- [ ] Run tests and linting
- [ ] Commit with proper message format
- [ ] Push to your fork
- [ ] Open a pull request
- [ ] Respond to review feedback
- [ ] Celebrate your contribution! 🎉

---

## Additional Resources

### Key Documents
- [Master Runbook](../MASTER_RUNBOOK.md) - Development process overview
- [Production Checklist](../PRODUCTION_CHECKLIST.md) - Pre-deployment requirements
- [Project State](../PROJECT_STATE.md) - Current project status
- [API Contract](../CONTRACTS/api_contract.md) - API specifications
- [Data Contract](../CONTRACTS/data_contract.md) - Database schemas
- [Capabilities Registry](../capabilities.yml) - Feature registry

### External Resources
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

---

## Questions?

If you have questions that aren't covered in this guide:

1. Check the [documentation](../README.md)
2. Search [existing issues](../../issues)
3. Ask in [GitHub Discussions](../../discussions)
4. Create a new issue with the "question" label

---

## Recognition

We value all contributions! Contributors will be:
- Listed in our README
- Mentioned in release notes
- Part of our growing community

Thank you for contributing to Code Cloud Agents! Your efforts help make this project better for everyone. 🚀

---

*Last updated: [Current Date]*
*Version: 1.0*
