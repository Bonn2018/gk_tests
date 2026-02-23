# GK Tests - Build Signing Service Tests

Project for testing build signing service with support for different scenarios and environments.

## Quick start

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Get an access token (e.g. via GoodKey OIDC / portal).
3. Prepare the test environment (creates keys and self-signed certs via API, writes `env/.env.dev`):
   ```bash
   npm run prepare_env -- -t YOUR_TOKEN
   ```
4. Run tests:
   ```bash
   npm test
   ```

The `prepare_env` script picks the first provider that supports both a popular signing and encryption algorithm, creates a signing key and an encryption key, creates self-signed certificates for both, and merges the resulting IDs and tokens into `env/.env.dev`. Existing variables in `.env.dev` are preserved.

## Project Structure

```
gk_tests/
├── tests/
├── utils/                   # Helper utilities
└── fixtures/                # Test files (builds, etc.)
```

## Installation

```bash
npm install
```

## Running Tests

```bash
# All tests
npm test

# Tests in watch mode
npm run test:watch

# Tests with coverage
npm run test:coverage

```

## Type Checking

```bash
# Type check without compilation
npm run type-check

# Compile TypeScript
npm run build
```

## Technologies

- **TypeScript** - code type safety
- **Jest** - testing framework
- **testcontainers** - Docker container management in tests
- **ts-jest** - TypeScript integration with Jest

