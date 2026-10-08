// Keep CLI settings, Metro cache and temporary files inside this workspace.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temporary = path.join(root, '.cache', 'tmp');
const expoHome = path.join(root, '.cache', 'expo-home');
fs.mkdirSync(temporary, { recursive: true });
fs.mkdirSync(expoHome, { recursive: true });
const cli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, TEMP: temporary, TMP: temporary, TMPDIR: temporary,
    __UNSAFE_EXPO_HOME_DIRECTORY: expoHome, EXPO_NO_TELEMETRY: '1' },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
