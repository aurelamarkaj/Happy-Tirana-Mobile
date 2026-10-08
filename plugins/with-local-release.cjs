const { withAppBuildGradle } = require('expo/config-plugins');
const marker = '// happy-tirana-local-release-v1';
const signing = `${marker}
// Credentials are passed only through the environment, never gradle.properties.
def happyTiranaStorePath = System.getenv('HAPPY_RELEASE_STORE_FILE')
def happyTiranaStorePassword = System.getenv('HAPPY_RELEASE_STORE_PASSWORD')
def happyTiranaKeyAlias = System.getenv('HAPPY_RELEASE_KEY_ALIAS')
def happyTiranaKeyPassword = System.getenv('HAPPY_RELEASE_KEY_PASSWORD')
def happyTiranaSigningReady = [happyTiranaStorePath, happyTiranaStorePassword, happyTiranaKeyAlias, happyTiranaKeyPassword].every { it != null && !it.isEmpty() }
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name.toLowerCase(java.util.Locale.ROOT).contains('release') }) {
        if (!happyTiranaSigningReady) throw new GradleException('Release signing missing. Run scripts/build-apk.ps1 with your keystore.')
        def signingFile = new File(happyTiranaStorePath).getCanonicalFile()
        if (!signingFile.isFile()) throw new GradleException('Release keystore file does not exist.')
        if (signingFile.toPath().startsWith(rootDir.getParentFile().getCanonicalFile().toPath())) throw new GradleException('Release keystore must be stored outside the mobile workspace.')
    }
}
`;
function injectReleaseSigning(contents) {
  if (contents.includes(marker)) return contents;
  const release = /release\s*\{\s*(?:(?:\/\/[^\r\n]*|\s)+)?signingConfig signingConfigs\.debug/;
  if (!contents.includes('android {') || !contents.includes('    signingConfigs {') || !release.test(contents)) throw new Error('Android signing template changed; review the generated build.gradle before proceeding.');
  return signing + '\n' + contents.replace('android {', `android {
    externalNativeBuild {
        cmake { version "3.30.5" }
    }`).replace('    signingConfigs {', `    signingConfigs {
        happyTiranaRelease {
            if (happyTiranaSigningReady) {
                storeFile new File(happyTiranaStorePath)
                storePassword happyTiranaStorePassword
                keyAlias happyTiranaKeyAlias
                keyPassword happyTiranaKeyPassword
            }
        }`).replace(release, match => match.replace('signingConfigs.debug', 'signingConfigs.happyTiranaRelease'));
}
module.exports = config => withAppBuildGradle(config, mod => {
  if (mod.modResults.language !== 'groovy') throw new Error('Local release signing requires a reviewed Groovy Android template.');
  mod.modResults.contents = injectReleaseSigning(mod.modResults.contents); return mod;
});
module.exports.injectReleaseSigning = injectReleaseSigning;
