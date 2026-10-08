param([string]$KeystorePath = '', [string]$KeyAlias = 'happy-tirana')
. (Join-Path $PSScriptRoot 'android-common.ps1')
$keystore = if ($KeystorePath) { [System.IO.Path]::GetFullPath($KeystorePath) } else { Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'HappyTiranaCourier\signing\android-release.keystore' }
if ($keystore.StartsWith($MobileRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Release keystore must be stored outside happy-tirana-mobile.' }
if (Test-Path -LiteralPath $keystore) { throw 'Keystore already exists. It will not be overwritten.' }
Set-MobileBuildEnvironment
New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($keystore)) -Force | Out-Null
$password = Read-Host 'Passwordi i keystore-it (minimum 6 karaktere)' -AsSecureString
$confirmation = Read-Host 'Perserite passwordin' -AsSecureString
try {
    $plainPassword = Convert-MobileSecret $password
    if ($plainPassword.Length -lt 6 -or $plainPassword -cne (Convert-MobileSecret $confirmation)) { throw 'Passwords must match and contain at least 6 characters.' }
    $env:HAPPY_RELEASE_STORE_PASSWORD = $plainPassword
    # The password is read by keytool from the environment, never a command argument.
    & (Join-Path $env:JAVA_HOME 'bin/keytool.exe') '-genkeypair' '-v' '-storetype' 'PKCS12' '-keystore' $keystore '-alias' $KeyAlias '-keyalg' 'RSA' '-keysize' '2048' '-validity' '10000' '-storepass:env' 'HAPPY_RELEASE_STORE_PASSWORD' '-keypass:env' 'HAPPY_RELEASE_STORE_PASSWORD'
    if ($LASTEXITCODE -ne 0) { throw 'Keytool did not create the keystore.' }
    Write-Host 'Keystore created. Keep its password and a recoverable backup before distributing an APK.'
} finally {
    $env:HAPPY_RELEASE_STORE_PASSWORD = $null; $plainPassword = $null
    $password.Dispose(); $confirmation.Dispose()
}
