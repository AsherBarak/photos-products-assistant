---
name: tdd-python
description: "Enforces Test-Driven Development (TDD) for Python/FastAPI. Use when creating or modifying backend logic to ensure code is verified by tests before implementation."
---

# TDD Python (FastAPI)

Follow the **Red-Green-Refactor** cycle for every backend change.

## 1. Red: Write the Test
- Create or update a test file in the `tests/` directory (e.g., `tests/test_main.py`).
- Use `pytest` and `httpx.AsyncClient` for FastAPI endpoint testing.
- **Run the test** and confirm it fails as expected.

## 2. Green: Implement Minimum Code
- Write the minimum amount of code in the server-side files to make the test pass.
- **Run the test** and confirm it passes.

## 3. Refactor
- Clean up the code, improve naming, or remove duplication.
- **Run the test** again to ensure no regressions.

## Tools
- **Test Runner:** `pytest`
- **FastAPI Client:** `from httpx import AsyncClient`
- **Coverage:** `pytest --cov=server`
