#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
SIGNING_DIR="${HAPPY_RELEASE_CREDENTIALS_DIR:-${HOME}/Library/Application Support/HappyTiranaCourier/signing}"
KEYSTORE="${HAPPY_RELEASE_STORE_FILE:-$SIGNING_DIR/android-release.keystore}"
KEYCHAIN_SERVICE="${HAPPY_RELEASE_KEYCHAIN_SERVICE:-HappyTiranaCourier.Release}"
KEYCHAIN_ACCOUNT="${HAPPY_RELEASE_KEYCHAIN_ACCOUNT:-happy-tirana}"
ALIAS="happy-tirana"
JAVA_HOME_17="${JAVA_HOME_17:-/Users/user/Library/Java/JavaVirtualMachines/ms-17.0.19/Contents/Home}"

if [[ -e "$KEYSTORE" ]]; then
  echo "Release keystore already exists; refusing to overwrite it." >&2
  exit 1
fi
if [[ ! -x "$JAVA_HOME_17/bin/keytool" ]]; then
  echo "JDK 17 keytool not found. Set JAVA_HOME_17 to a JDK 17 installation." >&2
  exit 1
fi

mkdir -p "$SIGNING_DIR"
chmod 700 "$SIGNING_DIR"
umask 077
PASSWORD="$(openssl rand -base64 36 | tr -d '\n')"
export HAPPY_RELEASE_STORE_PASSWORD="$PASSWORD"
trap 'unset HAPPY_RELEASE_STORE_PASSWORD PASSWORD' EXIT

"$JAVA_HOME_17/bin/keytool" -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass:env HAPPY_RELEASE_STORE_PASSWORD \
  -keypass:env HAPPY_RELEASE_STORE_PASSWORD \
  -dname "CN=Happy Tirana Courier, OU=Mobile, O=Happy Tirana, L=Tirana, ST=Tirana, C=AL"

security add-generic-password -U -a "$KEYCHAIN_ACCOUNT" -s "$KEYCHAIN_SERVICE" -w "$PASSWORD" >/dev/null
chmod 600 "$KEYSTORE"
echo "Release keystore created at $KEYSTORE"
echo "Password stored in macOS Keychain service $KEYCHAIN_SERVICE. Back up the keystore securely and separately."
