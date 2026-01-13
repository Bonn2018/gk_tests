# GK Tests - Build Signing Service Tests

Project for testing build signing service with support for different scenarios and environments.

## Project Structure

```
gk_tests/
├── tests/
│   ├── docker/              # Tests with Docker containers
│   ├── windows-gpg/         # Windows build signing tests via GPG
│   ├── api-hash-signing/    # Hash signing tests via API
│   └── api-encryption/      # Encryption/decryption tests via API
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

# Specific test
npm test -- tests/docker/docker-container.test.ts
```

## Type Checking

```bash
# Type check without compilation
npm run type-check

# Compile TypeScript
npm run build
```

## Test Examples

### Docker Containers

Tests in `tests/docker/` demonstrate how to start and use Docker containers inside Jest tests using `testcontainers`.

## Technologies

- **TypeScript** - code type safety
- **Jest** - testing framework
- **testcontainers** - Docker container management in tests
- **ts-jest** - TypeScript integration with Jest

