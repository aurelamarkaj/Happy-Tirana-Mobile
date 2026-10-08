# Faza F — APK lokal për Android

Janë përgatitur prebuild Android, signing që ruhet pas rigjenerimit të projektit native,
skriptet PowerShell/macOS për keystore/build/verifikim dhe ikona nga logoja ekzistuese.
Më 2 tetor 2026 u prodhua dhe u verifikua APK release në Mac te
`artifacts/happy-tirana-courier-0.1.0.apk`.
URL-ja reale HTTPS e API-së është verifikuar dhe vendosur në `.env`.
Nuk u instalua asnjë mjet jashtë `happy-tirana-mobile`.

## 1. Mjetet, vetëm brenda projektit

Hap PowerShell në projekt:

```powershell
Set-Location 'C:\Users\Admin\Documents\happy-tirana-mobile'
```

Shkarko ZIP-in Windows x64 të [Temurin JDK 17](https://adoptium.net/temurin/releases/?version=17&os=windows&arch=x64)
dhe [Android SDK Command-line Tools për Windows](https://developer.android.com/studio#command-tools).
Ruaj shkarkimet dhe nxirr përmbajtjen vetëm brenda këtij projekti. Struktura duhet të jetë:

```text
.tools/
  jdk/bin/java.exe
  jdk/bin/keytool.exe
  android-sdk/cmdline-tools/latest/bin/sdkmanager.bat
  android-sdk/cmdline-tools/latest/lib/...
```

Mos krijo një nivel shtesë `jdk/jdk-17...` ose `latest/cmdline-tools`.
Skripti pranon edhe një JDK ekzistues përmes JAVA_HOME, por SDK-ja dhe cache-t e këtij
projekti qëndrojnë gjithmonë këtu. Nuk nevojitet Android Studio ose EAS Build.

```powershell
. .\scripts\android-common.ps1
Set-MobileBuildEnvironment
& '.\.tools\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat' "--sdk_root=$env:ANDROID_HOME" --licenses
& '.\.tools\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat' "--sdk_root=$env:ANDROID_HOME" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.30.5'
```

Lexo dhe prano vetë licencat që kërkon SDK-ja. Kontrollo suksesin e secilës komandë.
SDK/NDK zënë disa GB dhe build-i i parë shkarkon Gradle/dependencies nga interneti.
[Dokumentimi i sdkmanager](https://developer.android.com/tools/sdkmanager) shpjegon instalimin e paketave dhe licencave.

Versionet vijnë nga projekti i instaluar, jo nga shembuj të vjetër:

| Mjeti | Versioni / burimi lokal |
| --- | --- |
| JDK | 17, sipas [udhëzimit React Native](https://reactnative.dev/docs/set-up-your-environment) |
| Gradle | 9.3.1, `android/gradle/wrapper/gradle-wrapper.properties` |
| Android Gradle Plugin | 8.12.0, `node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml` |
| Android platform / build tools | 36 / 36.0.0, `node_modules/react-native/gradle/libs.versions.toml` |
| NDK | 27.1.12297006, i njëjti catalog React Native |
| CMake | 3.30.5, `node_modules/react-native/ReactAndroid/build.gradle.kts`; pin në plugin-in lokal |
| Android minimal | API 24, catalog React Native |

Pas ndryshimit të Expo/React Native, rishiko këto versione para build-it.

## 2. Konfigurimi real

Plotëso `.env` ekzistues me `EXPO_PUBLIC_API_BASE_URL` që është HTTPS dhe URL-të reale të
reset-it. Mos kopjo përsëri `.env.example` mbi konfigurimin aktual. Google Maps Android key
është vendosur; nuk është kredencial për login ose push. Mos vendos token përdoruesi në `.env`.

Package Android aktual është `al.happytirana.courier`, versioni `0.1.0`, versionCode `1`
në `app.config.ts`. Rishiko identitetin para shpërndarjes së APK-së së parë, sepse përditësimet
duhet të përdorin të njëjtin package dhe certifikatë. Për përditësime rrit versionCode dhe
mbaj `version` në app.config.ts/package.json në përputhje.

Push registration është aktiv, Expo projectId dhe FCM janë konfiguruar. Production
`PUT /riders/me/devices` duhet të korrigjojë `RIDER_AUTH_REQUIRED` para release-it.

```powershell
npm.cmd run android:prebuild
```

Prebuild gjeneron `android/` nga app.config.ts dhe plugins.
Ndryshimet native të qëndrueshme bëhen në config/plugin, sepse rigjenerimi mund ta zëvendësojë
folderin Android. Signing-i dhe CMake ruhen nga `plugins/with-local-release.cjs`.
Ky proces ndjek [Expo Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/).

## 3. Keystore release

```powershell
npm.cmd run android:keystore
```

Skripti krijon keystore jashtë projektit te LocalAppData me alias `happy-tirana`, RSA 2048,
PKCS12 dhe vlefshmëri 10 000 ditë. Kërkon password me konfirmim dhe të dhënat e certifikatës
në terminal. Nuk mbishkruan një keystore ekzistues. Password-i përdoret përmes environment-it
të procesit, nuk shfaqet dhe nuk shkruhet në skedar ose argument command-line.
Password-i i key-t është i njëjti me password-in e keystore-it të krijuar nga ky skript.

Keystore-i është jashtë workspace-it. `.env`,
`.tools/`, `.cache/`, `android/` dhe `artifacts/` përjashtohen nga Git.
Ruaj keystore/password-in në secret storage; pa të njëjtin çelës nuk mund të instalosh një
update mbi app-in ekzistues. Në macOS password-i ruhet në Keychain dhe keystore-i te
`~/Library/Application Support/HappyTiranaCourier/signing/`.

```powershell
npm.cmd run android:doctor
```

Doctor raporton mjetet, wrapper-in dhe keystore-in; del me kod 1 nëse mungon një kërkesë.
Ai nuk garanton që kompilimi native do të kalojë dhe nuk teston lidhjen me API-në.

## 4. APK release, pa Play Store

```powershell
npm.cmd run android:apk
```

Build-i kontrollon konfigurimin HTTPS/Maps, mjetet dhe keystore-in, rigjeneron Android,
pastaj kërkon password-in e keystore-it. Te password-i i key-t shtyp Enter nëse është i njëjti.
Komanda Gradle që përdoret është:

```text
gradlew.bat :app:assembleRelease --no-daemon --no-configuration-cache --console=plain -PreactNativeArchitectures=arm64-v8a,armeabi-v7a -Pkotlin.compiler.execution.strategy=in-process
```

Mos e ekzekuto direkt pa environment-in/signing që përgatit skripti.
Plugin-i refuzon një release pa kredenciale dhe nuk përdor debug keystore për release.
Password-et pastrohen nga environment-i i skriptit në fund.
Cache/temp/JVM user.home/Gradle user home drejtohen te `.cache/` brenda projektit;
Android SDK qëndron te `.tools/android-sdk` dhe `android/local.properties` ka vetëm sdk.dir.

Pas një build-i të suksesshëm, skripti përdor
[apksigner verify](https://developer.android.com/tools/apksigner), krahason SHA-256 të
certifikatës së APK-së me certifikatën e keystore-it dhe kopjon APK-në e verifikuar te:

```text
artifacts/happy-tirana-courier-0.1.0.apk
```

Ky është destinacioni i pritshëm, jo një APK që ekziston tashmë.
Origjinali është `android/app/build/outputs/apk/release/app-release.apk`.
Skripti shfaq fingerprint-et publike të certifikatës dhe hash-in SHA-256 të APK-së.
Përdor package-in dhe fingerprint-in SHA-1 release për kufizimin Android të Google Maps key.
Build-i përmban bundle JavaScript; telefoni nuk ka nevojë për Metro.
Rrjedha bazohet në [Expo local production builds](https://docs.expo.dev/guides/local-app-production/)
dhe [React Native Android signing](https://reactnative.dev/docs/signed-apk-android), me task-un APK `assembleRelease`.

Për vetëm telefonat ARM64, opsionalisht:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1 -Architectures arm64-v8a
```

## 5. Instalimi dhe prova në telefon

Aktivizo USB debugging dhe autorizo kompjuterin nga telefoni. Nga PowerShell:

```powershell
. .\scripts\android-common.ps1
Set-MobileBuildEnvironment
& '.\.tools\android-sdk\platform-tools\adb.exe' devices
# Kur lista ka vetëm telefonin e zgjedhur me status device:
& '.\.tools\android-sdk\platform-tools\adb.exe' install -r '.\artifacts\happy-tirana-courier-0.1.0.apk'
```

Me disa pajisje përdor `adb -s SERIAL install -r ...` me serialin e telefonit tënd.
Nëse certifikata ndryshon, mos çinstalo automatikisht app-in: çinstalimi fshin të dhënat.
Për update përdor keystore-in origjinal.

Verifiko login për të dy rolet, 401/skadimin, porositë/quote/historinë, Google Maps,
ofertat dhe GPS foreground/background me ekran të kyçur sipas fazave B–E.
Hape APK-në pa Metro. Push real mbetet i çaktivizuar. Nevojiten llogari/API reale për këto prova.
iOS mbetet fazë e mëvonshme dhe kërkon macOS/Xcode për build native.

## Verifikimi i kryer në fazën F

- Android prebuild i suksesshëm; signing plugin, ikona dhe lejet native të gjeneruara.
- TypeScript dhe 76 teste të suksesshme, përfshirë pagination dhe signing/template guard.
- Android JS/Hermes export i suksesshëm; ky nuk është kompilim Gradle.
- Signing plugin refuzon keystore brenda workspace-it.
- Doctor zbulon saktë mjetet/keystore-in që mungojnë; release config kontrollon URL-në HTTPS dhe Maps key.
- Gradle release build, apksigner dhe clean install në emulator janë ekzekutuar me sukses.

Faza F nuk ndryshon kontrata ose skedarë të API-së ekzistuese; burimet e kontratave të
fazave të aplikacionit mbeten te [contracts.md](contracts.md).

## Verifikimi me serverin real — 2 tetor 2026

API base URL: `https://delivery.instant.al/api`; Socket.IO përdor origin-in
`https://delivery.instant.al` dhe path-in `/socket.io`.
Kërkesat e dashboard-eve të portaleve web konfirmuan këtë adresë me HTTP 200.
Me kredencialet e dhëna nga përdoruesi u verifikuan login dhe dashboard për RIDER/BUSINESS
(HTTP 200), si dhe ACK pozitiv për `rider.join` / `business.join`.
Nuk u krijuan ose ndryshuan porosi, status motoristi, GPS ose të dhëna admin.
Password-et dhe tokenët nuk u ruajtën në skedarë.

Linket e reset-it u morën nga formularët realë të login-it dhe u vendosën në `.env`:
`https://delivery.instant.al/rider/forgot-password` dhe
`https://delivery.instant.al/business/forgot-password`.
Ky kontroll verifikon API-në; prova e app-it Android në telefon mbetet e hapur.
