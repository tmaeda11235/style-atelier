# Clinerules

## Memory Bank & Context
1. `projectbrief.md`
   - Foundation document that shapes all other files
   - Created at project start if it doesn't exist
   - Defines core requirements and goals
   - Source of truth for project scope
2. `productContext.md`
   - Why this project exists
   - Problems it solves
   - How it should work
   - User experience goals
3. `systemPatterns.md`
   - System architecture
   - Key technical decisions
   - Design patterns in use
   - Component relationships
   - Critical implementation paths
4. `techContext.md`
   - Technologies used
   - Development setup
   - Technical constraints
   - Dependencies
   - Tool usage patterns

## Style
- **Documentation Style**: Prioritize **conciseness** over detail or comprehensiveness. Avoid verbose explanations.

## Task Management & Workflow

### Case 1: When an Issue Number is Provided (New Task)
When the user instructs to start working on a specific Issue number:

1.  **Reset Environment**:
    - Stash current changes: `git stash`
    - Switch to main: `git checkout main`
    - Pull latest changes: `git pull`
2.  **Check Issue**:
    - View issue details: `gh issue view <issue_number>`
3.  **Create Branch**:
    - Create a new branch: `git checkout -b feature/<issue_number>-<short-description>`
4.  **Plan**:
    - Post the work plan to the Issue: `gh issue comment <issue_number> --body "Work Plan: ..."`
5.  **Execute**:
    - Implement based on the plan.
6.  **Commit Progress**:
    - Upon completing each small task, commit changes.
    - **Progress Tracking**: Describe the progress explicitly in the commit message.
    - Repeat steps 5 and 6 until all tasks are complete.
7.  **Pull Request**:
    - Create a PR linked with issue and request review: `gh pr create`
8.  **Review**:
    - Check for feedback and address any review comments.

### Case 2: When No Issue Number is Provided (Continuing Task)
When starting a session without a specific Issue number:

1.  **Identify Context**:
    - Get current branch name: `git branch --show-current`
    - Extract Issue number from branch name (e.g., `feature/123-desc` -> `#123`).
2.  **Check Issue**:
    - View issue details to understand the goal: `gh issue view <issue_number>`
3.  **Check Progress**:
    - specific: Read recent commit messages to understand current progress: `git log -n 5`
4.  **Resume Work**:
    - Continue with the next steps based on the issue and commit history.