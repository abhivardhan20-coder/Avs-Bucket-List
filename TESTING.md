# Testing Guide

This project relies on robust testing to maintain code quality. We use `vitest` for our testing framework.

## Testing Strategy
- **Unit Tests**: Focus on individual functions or isolated classes. Use these extensively for utility functions and core business logic.
- **Integration Tests**: Focus on how different modules work together. For the backend, this involves testing Express endpoints alongside the Drizzle ORM to verify database interactions. For the frontend, test interactions between React components and context providers.
- **E2E Tests**: (Future) We plan to implement end-to-end testing with Playwright to simulate real user interactions in the browser.

## Running Tests
Run the entire test suite from the root of the repository:
```bash
pnpm test
```
To run tests for a specific workspace (e.g., api-server):
```bash
pnpm --filter @workspace/api-server test
```

## Writing New Tests
- Place your tests in the `__tests__` directory or adjacent to the file being tested (e.g., `AuthService.test.ts`).
- Mock external services (like the actual PostgreSQL database or Redis connection) using Vitest's mocking capabilities when writing unit tests to ensure they are fast and deterministic.
- Aim for clear descriptions in your `describe` and `it` blocks so test failures clearly articulate what went wrong.
