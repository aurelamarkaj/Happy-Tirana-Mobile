import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const { injectReleaseSigning } = createRequire(import.meta.url)('../plugins/with-local-release.cjs') as { injectReleaseSigning: (value: string) => string };
const template = `apply plugin: "com.android.application"
android {
    signingConfigs {
        debug { storeFile file('debug.keystore') }
    }
    buildTypes {
        debug { signingConfig signingConfigs.debug }
        release {
            // Template's unsafe default.
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}`;
describe('Persistent Android release signing', () => {
  it('replaces the debug signer only for release while retaining debug builds', () => {
    const result = injectReleaseSigning(template);
    expect(result).toMatch(/release\s*\{[^}]*signingConfig signingConfigs.happyTiranaRelease/);
    expect(result).toContain('debug { signingConfig signingConfigs.debug }');
    expect(result).not.toMatch(/release\s*\{[^}]*signingConfig signingConfigs.debug/);
    expect(result).toContain('cmake { version "3.30.5" }');
  });
  it('is idempotent and fails closed when the Expo signing template changes', () => {
    const result = injectReleaseSigning(template); expect(injectReleaseSigning(result)).toBe(result);
    expect(() => injectReleaseSigning('android { buildTypes { release { } } }')).toThrow('template changed');
  });
  it('gets credentials from environment and requires the keystore outside the workspace', () => {
    const result = injectReleaseSigning(template);
    expect(result).toContain("System.getenv('HAPPY_RELEASE_STORE_PASSWORD')");
    expect(result).toContain('if (!happyTiranaSigningReady) throw new GradleException');
    expect(result).toContain("throw new GradleException('Release keystore file does not exist.')");
    expect(result).toContain("throw new GradleException('Release keystore must be stored outside the mobile workspace.')");
    expect(result).not.toContain('storePassword \'android\'');
  });
});
