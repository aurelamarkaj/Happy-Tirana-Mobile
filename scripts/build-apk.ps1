param([string]$KeystorePath = '', [string]$KeyAlias = 'happy-tirana', [ValidateSet('arm64-v8a','arm64-v8a,armeabi-v7a','arm64-v8a,x86_64','armeabi-v7a,arm64-v8a,x86,x86_64')][string]$Architectures = 'arm64-v8a,armeabi-v7a')
. (Join-Path $PSScriptRoot 'android-common.ps1')
& node (Join-Path $PSScriptRoot 'check-release-config.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Release configuration is incomplete. See docs/phase-f.md.' }
$keystore = if ($KeystorePath) { [System.IO.Path]::GetFullPath($KeystorePath) } else { Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'HappyTiranaCourier\signing\android-release.keystore' }
if ($keystore.StartsWith($MobileRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Release keystore must be stored outside happy-tirana-mobile.' }
if (-not (Test-Path -LiteralPath $keystore -PathType Leaf)) { throw 'Release keystore missing. Run npm.cmd run android:keystore first.' }
Set-MobileBuildEnvironment
$sdk = $env:ANDROID_HOME
foreach ($required in @('platforms/android-36/android.jar','build-tools/36.0.0/apksigner.bat','ndk/27.1.12297006/source.properties','cmake/3.30.5/bin/cmake.exe')) {
    if (-not (Test-Path -LiteralPath (Join-Path $sdk $required))) { throw "Missing Android SDK component: $required. See docs/phase-f.md." }
}
$env:NODE_ENV = 'production'
# Regenerate native configuration from the same .env files used by release bundling.
& node (Join-Path $PSScriptRoot 'expo-local.cjs') 'prebuild' '--platform' 'android' '--no-install'
if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
$wrapper = Get-MobilePath 'android/gradlew.bat'
$gradleFile = Get-MobilePath 'android/app/build.gradle'
if (-not (Get-Content -LiteralPath $gradleFile -Raw).Contains('// happy-tirana-local-release-v1')) { throw 'Release signing plugin missing. Run android:prebuild again.' }
$settings = Get-MobilePath 'android/local.properties'
('sdk.dir=' + $sdk.Replace('\','/')) | Set-Content -LiteralPath $settings -Encoding ASCII
$password = Read-Host 'Passwordi i keystore-it' -AsSecureString
$keyPassword = Read-Host 'Passwordi i key-t (Enter nese eshte i njejti)' -AsSecureString
try {
    $env:HAPPY_RELEASE_STORE_FILE = $keystore
    $env:HAPPY_RELEASE_KEY_ALIAS = $KeyAlias
    $env:HAPPY_RELEASE_STORE_PASSWORD = Convert-MobileSecret $password
    $env:HAPPY_RELEASE_KEY_PASSWORD = if ($keyPassword.Length) { Convert-MobileSecret $keyPassword } else { $env:HAPPY_RELEASE_STORE_PASSWORD }
    Push-Location (Get-MobilePath 'android')
    try { & $wrapper ':app:assembleRelease' '--no-daemon' '--no-configuration-cache' '--console=plain' "-PreactNativeArchitectures=$Architectures" '-Pkotlin.compiler.execution.strategy=in-process'; if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed. No APK was copied.' } }
    finally { Pop-Location }
    $apk = Get-MobilePath 'android/app/build/outputs/apk/release/app-release.apk'
    if (-not (Test-Path -LiteralPath $apk -PathType Leaf)) { throw 'Signed release APK was not produced.' }
    $certificate = Get-MobilePath '.cache/release-certificate.der'
    & (Join-Path $env:JAVA_HOME 'bin/keytool.exe') '-exportcert' '-keystore' $keystore '-alias' $KeyAlias '-storepass:env' 'HAPPY_RELEASE_STORE_PASSWORD' '-file' $certificate
    if ($LASTEXITCODE -ne 0) { throw 'Could not verify the keystore certificate.' }
    $expectedCertificate = (Get-FileHash -LiteralPath $certificate -Algorithm SHA256).Hash.ToLowerInvariant()
    $signature = & (Join-Path $sdk 'build-tools/36.0.0/apksigner.bat') 'verify' '--verbose' '--print-certs' $apk
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    if (-not (($signature -join "`n").ToLowerInvariant().Contains('certificate sha-256 digest: ' + $expectedCertificate))) { throw 'APK was signed with a different certificate.' }
    Write-Host ($signature -join "`n")
    $artifacts = Get-MobilePath 'artifacts'
    New-Item -ItemType Directory -Path $artifacts -Force | Out-Null
    $version = (Get-Content -LiteralPath (Join-Path $MobileRoot 'package.json') -Raw | ConvertFrom-Json).version
    $destination = Get-MobilePath "artifacts/happy-tirana-courier-$version.apk"
    Copy-Item -LiteralPath $apk -Destination $destination -Force
    Get-FileHash -LiteralPath $destination -Algorithm SHA256 | Format-List
    Write-Host "Verified signed APK: $destination"
} finally {
    $env:HAPPY_RELEASE_STORE_FILE = $null; $env:HAPPY_RELEASE_KEY_ALIAS = $null
    $env:HAPPY_RELEASE_STORE_PASSWORD = $null; $env:HAPPY_RELEASE_KEY_PASSWORD = $null
    $password.Dispose(); $keyPassword.Dispose()
}
