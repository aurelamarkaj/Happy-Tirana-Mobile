Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$MobileRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
function Get-MobilePath([string]$RelativePath) {
    if ([System.IO.Path]::IsPathRooted($RelativePath)) { throw 'Use a path relative to happy-tirana-mobile.' }
    $resolved = [System.IO.Path]::GetFullPath((Join-Path $MobileRoot $RelativePath))
    if (-not $resolved.StartsWith($MobileRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Path must stay inside happy-tirana-mobile.' }
    # Refuse symlinks/junctions so cache, SDK or credential paths cannot redirect writes.
    $checked = $resolved
    while ($checked -and $checked -ne $MobileRoot) {
        if (Test-Path -LiteralPath $checked) {
            if ((Get-Item -LiteralPath $checked -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Build paths may not be symlinks or junctions.' }
        }
        $checked = [System.IO.Path]::GetDirectoryName($checked)
    }
    return $resolved
}
function Get-MobileJavaRoot {
    $localJava = Get-MobilePath '.tools/jdk'
    if (Test-Path -LiteralPath (Join-Path $localJava 'bin/java.exe')) { return $localJava }
    if ($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin/java.exe'))) { return [System.IO.Path]::GetFullPath($env:JAVA_HOME) }
    throw 'JDK missing. Extract JDK 17 to .tools/jdk or set JAVA_HOME to an existing JDK.'
}
function Set-MobileBuildEnvironment {
    $env:JAVA_HOME = Get-MobileJavaRoot
    $env:ANDROID_HOME = Get-MobilePath '.tools/android-sdk'
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    $folders = @{
        GRADLE_USER_HOME = '.cache/gradle'; ANDROID_USER_HOME = '.cache/android-user';
        ANDROID_EMULATOR_HOME = '.cache/android-user'; ANDROID_AVD_HOME = '.cache/android-user/avd';
        TEMP = '.cache/tmp'; TMP = '.cache/tmp'; TMPDIR = '.cache/tmp';
        __UNSAFE_EXPO_HOME_DIRECTORY = '.cache/expo-home'
    }
    foreach ($entry in $folders.GetEnumerator()) {
        $folder = Get-MobilePath $entry.Value
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        [System.Environment]::SetEnvironmentVariable($entry.Key, $folder, 'Process')
    }
    $javaHome = Get-MobilePath '.cache/java-home'
    New-Item -ItemType Directory -Path $javaHome -Force | Out-Null
    # Preserve actual HOME/CODEX_HOME; only the child JVM's user.home is redirected.
    $env:JAVA_TOOL_OPTIONS = '-Duser.home="' + $javaHome + '" -Djava.io.tmpdir="' + $env:TEMP + '"'
    $env:EXPO_NO_TELEMETRY = '1'
    $env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:PATH
}
function Convert-MobileSecret([System.Security.SecureString]$Secret) {
    $pointer = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
    try { return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
