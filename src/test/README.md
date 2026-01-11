---
noteId: "1e9960f0eef211f0a8d7c97a07437227"
tags: []

---

# Testing

This project uses [Vitest](https://vitest.dev/) for unit and component testing, and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for testing React components.

## Running Tests

To run the tests, use the following command:

```bash
npm test
```

To run the tests in UI mode, use:

```bash
npm run test:ui
```

## End-to-End (E2E) Testing Recommendation

For E2E testing of this Chrome Extension, we recommend using **[Plasmo BDD](https://docs.plasmo.com/testing/bdd)**.

Plasmo BDD is a testing framework specifically designed for Plasmo extensions. It uses a Behavior-Driven Development (BDD) approach, which makes tests easy to read and write for both developers and non-developers. Since this project is built with Plasmo, using Plasmo BDD will provide the best integration and the most straightforward setup.