param([string]$KeystorePath = '')
. (Join-Path $PSScriptRoot 'android-common.ps1')
$jdk = $null
try { $jdk = Get-MobileJavaRoot } catch { Write-Host $_.Exception.Message }
$sdk = Get-MobilePath '.tools/android-sdk'
$checks = [ordered]@{
    JDK = [bool]$jdk
    Keytool = [bool]($jdk -and (Test-Path -LiteralPath (Join-Path $jdk 'bin/keytool.exe')))
    AndroidPlatform36 = Test-Path -LiteralPath (Join-Path $sdk 'platforms/android-36/android.jar')
    BuildTools36 = Test-Path -LiteralPath (Join-Path $sdk 'build-tools/36.0.0/apksigner.bat')
    NDK = Test-Path -LiteralPath (Join-Path $sdk 'ndk/27.1.12297006/source.properties')
    CMake = Test-Path -LiteralPath (Join-Path $sdk 'cmake/3.30.5/bin/cmake.exe')
    PlatformTools = Test-Path -LiteralPath (Join-Path $sdk 'platform-tools/adb.exe')
    GradleWrapper = Test-Path -LiteralPath (Join-Path $MobileRoot 'android/gradlew.bat')
    ReleaseKeystore = Test-Path -LiteralPath $(if ($KeystorePath) { [System.IO.Path]::GetFullPath($KeystorePath) } else { Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'HappyTiranaCourier\signing\android-release.keystore' })
}
$checks.GetEnumerator() | ForEach-Object { Write-Host ('{0}: {1}' -f $_.Key, $_.Value) }
if ($jdk) { & (Join-Path $jdk 'bin/java.exe') '-version'; if ($LASTEXITCODE -ne 0) { exit 1 } }
if ($checks.Values -contains $false) { exit 1 }
