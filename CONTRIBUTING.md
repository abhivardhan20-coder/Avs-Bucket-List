# Contributing to AV's Bucket List

We welcome contributions! Please follow these guidelines to help maintain code quality and ensure a smooth review process.

## Code Style & Linting
- **Formatting**: We use Prettier to enforce consistent code formatting.
- **Linting**: We use ESLint to catch syntax and style issues.
- **Enforcement**: Run `pnpm run lint` locally before submitting a Pull Request.

## Branching & Commit Messages
- **Branching**: Create feature branches off of `main` (e.g., `feature/add-login-ui` or `fix/cors-header`).
- **Commits**: Use Conventional Commits formatting (e.g., `feat: added movie search endpoint`, `fix: resolved crashing worker`). This helps automate changelog generation and semantic versioning.

## Development Workflow
1. Fork the repo and create your branch from main.
2. Run `pnpm install` at the root.
3. Set up the required environment variables locally by copying `.env.example` to `.env` in the root, as well as in `artifacts/api-server` and `artifacts/bucket-list` directories.
4. Verify tests pass with `pnpm test`.

## Pull Request Guidelines
- Ensure your code follows the existing style conventions via Prettier/ESLint.
- Write or update tests for any new functionality.
- Verify the bundle size is not bloated with unused dependencies using `px depcheck`.
- Run `pnpm typecheck` before pushing.
- Address any feedback from code reviewers. Once approved, a maintainer will merge your PR.

## Code of Conduct
We are committed to providing a welcoming and inspiring community for all.
By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and considerate of others.
- Refrain from using discriminatory, harassing, or derogatory language.
- Provide constructive feedback and accept it gracefully.
- Focus on what is best for the community and the project.

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team.

Thank you for your contributions!
