// Inspect native permissions without printing public config (contains the Maps key).
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync(process.execPath, [path.join(__dirname, 'expo-local.cjs'), 'config', '--type', 'introspect', '--json'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (result.status !== 0) { console.error('Native config inspection failed. No config values were printed.'); process.exit(1); }
let config;
try { config = JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))); }
catch { console.error('Could not parse native config.'); process.exit(1); }
const mods = config._internal?.modResults;
const permissions = mods?.android?.manifest?.manifest?.['uses-permission']?.map(permission => permission.$?.['android:name']) ?? [];
const required = ['android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_BACKGROUND_LOCATION', 'android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_LOCATION'];
const ios = mods?.ios?.infoPlist;
const resultFlags = { androidLocationPermissions: required.every(permission => permissions.includes(permission)), iosBackgroundLocation: ios?.UIBackgroundModes?.includes('location') === true, iosLocationDescriptions: !!ios?.NSLocationWhenInUseUsageDescription && !!ios?.NSLocationAlwaysAndWhenInUseUsageDescription,
  androidNotificationPermission: permissions.includes('android.permission.POST_NOTIFICATIONS'),
  iosPushEntitlement: !!mods?.ios?.entitlements?.['aps-environment'],
};
console.log(JSON.stringify(resultFlags, null, 2));
if (Object.values(resultFlags).some(value => !value)) process.exit(1);
