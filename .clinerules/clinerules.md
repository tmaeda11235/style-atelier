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
5. **Memory Bank Synchronization & ADR Pattern**
   - When introducing any new features, library dependencies, or architectural adjustments, you MUST update the Memory Bank (`systemPatterns.md`, `techContext.md`).
   - Major structural decisions must be documented using the Architecture Decision Record (ADR) pattern in the Memory Bank.
   - Always ensure that the documentation in the Memory Bank matches the actual implementation.

6. **Layer Boundaries & File Size Rules**
   - **No direct database queries inside UI components**: Files in `src/components/` must not import `src/lib/db.ts` directly. Always use hooks or services.
   - **Maintain test mock purity**: Do not place business logic or simulate database state transition logic in test mocks (e.g. `tests/mocks/db.ts`).
   - **File and Function Limits**: Keep components under 300 lines (excluding blank lines and comments) and functions under 50 lines. Refactor when limits are exceeded.
   - **Atomic Design Principles (Hooks and Molecules Separation)**: When implementing UI components, always separate business logic and side effects into custom hooks. Molecules must remain pure presentation components without business logic or raw state mutation handlers.
   - **ESLint Whitelist Guardrail**: Do not expand the ESLint exception lists (`eslint.config.mjs` overrides). The CI pipeline blocks PRs adding new exception files. If you refactor legacy files to satisfy ESLint rules, run `node scratch/auto-sync-eslint.js` to automatically clean up and synchronize the exception list.

## Style

- **Documentation Style**: Prioritize **conciseness** over detail or comprehensiveness. Avoid verbose explanations.

- **Permission Guidelines**: Approval is not required for changes that can be reverted via Git. Additionally, you are free to execute npm and gh commands at your discretion.

- **Pull Request Requirements**: Pull requests must include unit tests alongside the implementation code.

## Task Management & Workflow

### 0. Worktree Usage (Critical Rule)

**When updating code or documentation, ALWAYS create a new `git worktree` and perform the work inside the worktree.**

- **Do not** modify files directly in the main repository checkout (`style-atelier`).
- Create worktrees in `../worktrees/<branch-name>` or a similar dedicated directory.
- **Cleanup**: When the task is finished (e.g., PR merged), be sure to delete the worktree using `git worktree remove`.

### 0.1 Wait Commands & Anti-Polling (Critical Rule)

**NEVER use loop polling (`manage_task(status)`) to check the status of long-running CI or background commands.**
- Instead of manually checking if CI has finished, you MUST run blocking commands natively in the background using `run_command` and wait for the system to wake you up.
- To wait for CI tests to finish on a Pull Request, use:
  ```bash
  gh pr checks <PR_NUMBER> --watch
  ```
  This command will block until CI completes and seamlessly notify you without wasting tokens.

### Case 1: When an Issue Number is Provided (New Task)

When the user instructs to start working on a specific Issue number:

1.  **Reset Environment**:
    - Stash current changes: `git stash`
    - Switch to main: `git checkout main`
    - Pull latest changes: `git pull`
2.  **Check Issue**:
    - View issue details: `gh issue view <issue_number>`
3.  **Create Worktree & Branch**:
    - Create a new branch and worktree in the `../worktrees/` directory:
      ```bash
      git worktree add -b feature/<issue-number>-<short-desc> ../worktrees/<issue-number>-<short-desc> main
      ```
    - Move into the worktree directory and install dependencies to activate Husky hooks:
      ```bash
      cd ../worktrees/<issue-number>-<short-desc>
      npm ci
      ```
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
9.  **Cleanup Worktree**:
    - Once the work is complete and the PR is merged, remove the worktree:
      `git worktree remove ../worktrees/<issue_number>-<short-description>`

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
