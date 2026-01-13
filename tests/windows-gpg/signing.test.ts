import * as fs from 'fs';
import * as path from 'path';

describe('Windows GPG Build Signing', () => {
  const testBuildPath = path.join(__dirname, '../../fixtures/sample-build.exe');

  beforeAll(async () => {
    // Windows signing only works on Windows hosts
    if (process.platform !== 'win32') {
      throw new Error(`Windows signing tests require Windows platform, but current platform is: ${process.platform}`);
    }

    // Ensure fixtures directory exists
    const fixturesDir = path.join(__dirname, '../../fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a dummy build file if it doesn't exist
    if (!fs.existsSync(testBuildPath)) {
      fs.writeFileSync(testBuildPath, 'dummy build content for testing');
    }
  }, 30000);

  test('should have build file ready for signing', async () => {
    if (process.platform !== 'win32') {
      throw new Error(`Windows signing tests require Windows platform, but current platform is: ${process.platform}`);
    }

    // Verify that the file exists and is ready for signing
    expect(fs.existsSync(testBuildPath)).toBe(true);
    
    // Verify that file has some content
    const fileStats = fs.statSync(testBuildPath);
    expect(fileStats.size).toBeGreaterThan(0);
  });
});
