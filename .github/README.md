# GitHub Actions with Claude Code

This repository is configured with Claude Code GitHub Actions for intelligent automation and code assistance.

## Available Workflows

### 1. Claude Code Action (`claude-code.yml`)
**Triggers:** PR comments, issue comments, PR creation/updates
**Purpose:** Interactive code assistant that responds to @claude mentions

**Usage:**
- Comment `@claude` in any PR or issue to get help
- Ask questions like:
  - `@claude explain this function`
  - `@claude fix the linting errors`
  - `@claude add tests for this component`
  - `@claude review this code for security issues`

### 2. Security Review (`claude-security-review.yml`)
**Triggers:** Pull request creation and updates
**Purpose:** Automated security analysis of code changes

**Features:**
- Analyzes all changed files for security vulnerabilities
- Provides detailed security recommendations
- Integrates with GitHub security alerts

### 3. CI/CD with Claude (`ci-cd.yml`)
**Triggers:** Push to main/develop, pull requests
**Purpose:** Automated testing with Claude assistance on failures

**Features:**
- Frontend: Node.js build, lint, type checking
- Backend: Python tests with pytest
- Claude automatically analyzes failures and suggests fixes

### 4. Code Quality Review (`code-quality.yml`)
**Triggers:** Weekly schedule (Mondays 9 AM) or manual dispatch
**Purpose:** Comprehensive code quality analysis

**Features:**
- Weekly automated code reviews
- Dependency security audits
- Performance and maintainability analysis
- Automated issue creation for improvements

## Setup Requirements

### Required Secrets
Add these secrets to your repository settings:

1. **ANTHROPIC_API_KEY** - Your Anthropic API key for Claude access
   - Get from: https://console.anthropic.com/
   - Settings → Secrets and variables → Actions → New repository secret

### Quick Setup with Claude Code CLI
The easiest way to set up these actions is through Claude Code:

```bash
# Install GitHub app integration
claude /install-github-app
```

This command will:
- Guide you through GitHub app installation
- Set up required repository secrets
- Configure permissions automatically

## Usage Examples

### Interactive Code Assistance
```
@claude can you explain how the authentication flow works in this codebase?
```

```
@claude there are TypeScript errors in the dashboard component, can you fix them?
```

```
@claude add comprehensive tests for the user management API
```

### Manual Code Quality Review
Go to Actions → Code Quality with Claude → Run workflow
- Select focus area: security, performance, maintainability, or overall

### Security Review
Automatically runs on all pull requests, but you can also trigger manually:
```
@claude please do a security review of these changes
```

## Features

### 🎯 Intelligent Mode Detection
Claude automatically detects the appropriate execution mode based on context

### 🤖 Interactive Code Assistant
- Answer questions about code and architecture
- Explain complex functions and patterns
- Provide implementation guidance

### 🔍 Automated Code Review
- Analyze PR changes for improvements
- Suggest best practices and optimizations
- Identify potential bugs and issues

### ✨ Code Implementation
- Fix simple bugs and linting errors
- Implement new features from descriptions
- Refactor code for better maintainability

### 🛡️ Security Analysis
- Identify security vulnerabilities
- Suggest security best practices
- Automated dependency auditing

### 📊 Quality Monitoring
- Weekly code quality assessments
- Technical debt identification
- Performance optimization suggestions

## Best Practices

1. **Be Specific**: Provide clear, specific requests to Claude
2. **Context Matters**: Reference specific files, functions, or lines when possible
3. **Review Suggestions**: Always review Claude's suggestions before applying
4. **Iterative Feedback**: Ask follow-up questions for clarification
5. **Security First**: Use security reviews for sensitive code changes

## Troubleshooting

### Common Issues

**Action not triggering:**
- Ensure ANTHROPIC_API_KEY secret is set
- Check that GitHub App has required permissions
- Verify workflow file syntax is correct

**API rate limits:**
- Claude Code has built-in rate limiting
- For high-volume repositories, consider reducing trigger frequency

**Permission errors:**
- Ensure the GitHub App has write permissions to contents and pull requests
- Repository admin rights required for initial setup

### Getting Help

1. Check the Actions tab for detailed error logs
2. Use `@claude debug the GitHub Actions error` in issues
3. Review the Claude Code documentation: https://docs.anthropic.com/claude-code

## Integration with Development Workflow

These actions are designed to integrate seamlessly with your existing development process:

- **Pre-commit**: Security reviews catch issues early
- **During development**: Interactive assistance for complex problems
- **Code review**: Automated suggestions improve PR quality
- **Maintenance**: Weekly quality reviews prevent technical debt

The goal is to enhance developer productivity while maintaining high code quality and security standards.