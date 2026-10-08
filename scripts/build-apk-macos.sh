#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
SDK_ROOT="${ANDROID_SDK_ROOT:-/Users/user/Library/Android/sdk}"
JAVA_HOME_17="${JAVA_HOME_17:-/Users/user/Library/Java/JavaVirtualMachines/ms-17.0.19/Contents/Home}"
SIGNING_DIR="${HAPPY_RELEASE_CREDENTIALS_DIR:-${HOME}/Library/Application Support/HappyTiranaCourier/signing}"
KEYSTORE="${HAPPY_RELEASE_STORE_FILE:-$SIGNING_DIR/android-release.keystore}"
KEYCHAIN_SERVICE="${HAPPY_RELEASE_KEYCHAIN_SERVICE:-HappyTiranaCourier.Release}"
KEYCHAIN_ACCOUNT="${HAPPY_RELEASE_KEYCHAIN_ACCOUNT:-happy-tirana}"
ALIAS="happy-tirana"
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
DESTINATION="$ROOT/artifacts/happy-tirana-courier-0.1.0.apk"

for required in \
  "$JAVA_HOME_17/bin/java" \
  "$JAVA_HOME_17/bin/keytool" \
  "$SDK_ROOT/platforms/android-36/android.jar" \
  "$SDK_ROOT/build-tools/36.0.0/apksigner" \
  "$SDK_ROOT/ndk/27.1.12297006/source.properties" \
  "$SDK_ROOT/cmake/3.30.5/bin/cmake" \
  "$KEYSTORE"; do
  if [[ ! -e "$required" ]]; then
    echo "Missing build requirement: $required" >&2
    exit 1
  fi
done

if [[ -z "${HAPPY_RELEASE_STORE_PASSWORD:-}" ]]; then
  if ! HAPPY_RELEASE_STORE_PASSWORD="$(security find-generic-password -w -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" 2>/dev/null)"; then
    echo "Release password missing from macOS Keychain. Run npm run android:keystore:mac or set HAPPY_RELEASE_STORE_PASSWORD for this process." >&2
    exit 1
  fi
fi

cd "$ROOT"
node scripts/check-release-config.cjs
export JAVA_HOME="$JAVA_HOME_17"
export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export NODE_ENV=production
export EXPO_NO_TELEMETRY=1
export GRADLE_USER_HOME="$ROOT/.cache/gradle"
export ANDROID_USER_HOME="$ROOT/.cache/android-user"
export HAPPY_RELEASE_STORE_FILE="$KEYSTORE"
export HAPPY_RELEASE_KEY_ALIAS="$ALIAS"
export HAPPY_RELEASE_STORE_PASSWORD
export HAPPY_RELEASE_KEY_PASSWORD="$HAPPY_RELEASE_STORE_PASSWORD"
trap 'unset HAPPY_RELEASE_STORE_FILE HAPPY_RELEASE_KEY_ALIAS HAPPY_RELEASE_STORE_PASSWORD HAPPY_RELEASE_KEY_PASSWORD' EXIT

mkdir -p "$GRADLE_USER_HOME" "$ANDROID_USER_HOME" "$ROOT/.cache/tmp" "$ROOT/artifacts"
if [[ "${HAPPY_SKIP_ANDROID_PREBUILD:-0}" != "1" ]]; then
  node scripts/expo-local.cjs prebuild --platform android --no-install
elif [[ ! -x "$ROOT/android/gradlew" ]]; then
  echo "Cannot skip prebuild because the generated Android project is missing." >&2
  exit 1
fi
printf 'sdk.dir=%s\n' "$SDK_ROOT" > "$ROOT/android/local.properties"
# Expo's generated 512 MiB metaspace is insufficient for the SDK 57 release graph.
# Keep this macOS build override local to the generated/ignored Android directory.
perl -0pi -e 's/^org\.gradle\.jvmargs=.*$/org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1536m/m' "$ROOT/android/gradle.properties"
chmod +x "$ROOT/android/gradlew"

(
  cd "$ROOT/android"
  ./gradlew :app:assembleRelease \
    --no-daemon \
    --no-configuration-cache \
    --console=plain \
    --max-workers=2 \
    -PreactNativeArchitectures=arm64-v8a,armeabi-v7a \
    -Pkotlin.compiler.execution.strategy=in-process
)

"$SDK_ROOT/build-tools/36.0.0/apksigner" verify --verbose --print-certs "$APK"
cp -f "$APK" "$DESTINATION"
shasum -a 256 "$DESTINATION"
echo "Verified signed APK: $DESTINATION"
