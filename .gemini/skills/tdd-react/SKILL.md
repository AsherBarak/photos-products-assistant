---
name: tdd-react
description: "Enforces Test-Driven Development (TDD) for React (TypeScript). Use when building components, hooks, or state management to ensure behavioral correctness before implementation."
---

# TDD React (Vitest + React Testing Library)

Follow the **Red-Green-Refactor** cycle for every frontend change.

## 1. Red: Write the Test
- Create a test file alongside the component (e.g., `Component.test.tsx`).
- Use `render`, `screen`, and `user-event` from `@testing-library/react`.
- **Run the test** with `npm run test` or `npx vitest` and confirm it fails.

## 2. Green: Implement Minimum UI
- Write the minimum amount of React/TypeScript code to make the test pass.
- **Run the test** and confirm it passes.

## 3. Refactor
- Improve styling, split large components, or optimize state logic.
- **Run the test** again to ensure no regressions.

## Tools
- **Test Runner:** `vitest`
- **Testing Library:** `@testing-library/react`, `@testing-library/jest-dom`
- **User Interaction:** `@testing-library/user-event`
