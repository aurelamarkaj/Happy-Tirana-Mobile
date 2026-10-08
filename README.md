# Happy Tirana Courier — Mobile

Projekt i pavarur Expo / React Native / TypeScript për Android dhe më pas iOS.
Projekti origjinal përdoret vetëm si referencë dhe nuk ndryshohet.

## Faza A

Implementuar: formë e vetme login-i në faqen kryesore, rol i përcaktuar nga API-ja, fonti Manrope,
logoja ekzistuese, navigim për secilin rol, ruajtje SecureStore, rikthim i sesionit,
logout dhe kthim te hyrja pas 401 ose skadimit të tokenit 12-orësh.

Faza B: dashboard motorristi, online/offline, oferta prano/refuzo, dërgesa aktive,
harta native, PICKED_UP/DELIVERED, telefon/Google Maps dhe fitimet.
Faza C: lista live e porosive të biznesit, porosi e re me Google Maps preview dhe quote,
validime Zod, kontroll orari dhe histori me cursor pagination nga API-ja; derisa endpoint-et
production të deploy-ohen, UI shfaq fallback-un ekzistues 24/8 me një njoftim të qartë.
Faza D: GPS live kur motorristi është online ose me porosi aktive, leje foreground/background,
task native dhe njoftim i vazhdueshëm Android.
Faza E: pritja e push njoftimeve, rifreskim listash dhe kontrata mobile për Expo push token / device PUT.
Regjistrimi push është aktiv dhe Expo/FCM janë konfiguruar, por endpoint-i production
`PUT /riders/me/devices` aktualisht kthen `401 RIDER_AUTH_REQUIRED` me rider token valid.
Faza F: prebuild Android, signing release, skripte keystore/doctor/APK dhe udhëzime build-i lokal.
APK release e nënshkruar është prodhuar në Mac te `artifacts/happy-tirana-courier-0.1.0.apk`.
API-ja reale `https://delivery.instant.al/api` është konfiguruar në `.env` dhe login/dashboard/
Socket.IO janë verifikuar për RIDER dhe BUSINESS; kredencialet nuk ruhen në projekt.

## Nisja në PowerShell

```powershell
Set-Location 'C:\Users\Admin\Documents\happy-tirana-mobile'
npm.cmd ci
Copy-Item -LiteralPath '.env.example' -Destination '.env'
# Plotëso URL-të HTTPS në .env; API dhe reset për secilin rol.
# Mos e përsërit Copy-Item nëse ke plotësuar .env.
$env:EXPO_NO_TELEMETRY='1'
npm.cmd start
```

Pa EXPO_PUBLIC_API_BASE_URL, UI hapet por login-i jep mesazh konfigurimi.
Harrova fjalëkalimin hap shfletuesin pasi të plotësohet URL-ja përkatëse.
Pas ndryshimit të .env, rindiz Metro me `npm.cmd start -- --clear`.
Variablat EXPO_PUBLIC janë konfigurim publik dhe nuk duhet të përmbajnë sekrete.

Cache i npm ruhet brenda `.cache/npm`. Mos instaloni paketa globalisht për këtë projekt.
Komandat Expo përdorin scripts/expo-local.cjs për të mbajtur settings dhe cache/temp
brenda projektit; kjo shmang shkrimin në folderin global .expo.
Tokeni nuk ruhet në .env, localStorage, cookies apo Query cache. Nuk ka lidhje me DB.

## Build lokal në këtë Mac

Ky workspace përfshin edhe rrjedhën macOS për APK release. Ajo përdor JDK 17 dhe Android
SDK-në lokale, krijon një keystore production me password të rastësishëm dhe prodhon APK-në
e nënshkruar pa EAS Build:

```bash
npm run android:keystore:mac
npm run android:apk:mac
```

Keystore-i ruhet jashtë projektit te `~/Library/Application Support/HappyTiranaCourier/signing/`
dhe password-i në macOS Keychain. Ruaje keystore-in në një backup të sigurt e të ndarë:
i njëjti çelës kërkohet për çdo update të ardhshëm Android.
APK-ja finale gjendet te `artifacts/happy-tirana-courier-0.1.0.apk`.

## Preview në kompjuter

```powershell
npm.cmd start -- --web --port 8081
```

Preview web tregon formularin e përbashkët me logon pa dekorimet anësore. Login-i real web është i çaktivizuar;
SecureStore dhe autentikimi përdoren vetëm në Android/iOS. Nuk shtohet ruajtje tokeni
në shfletues. Ky preview nuk zëvendëson verifikimin në pajisje.

Login-i nuk ka butona demo; hyrja reale dhe tokenët SecureStore përdoren vetëm në native.

## Verifikimi

```powershell
npm.cmd run typecheck
npm.cmd test
$env:EXPO_NO_TELEMETRY='1'
npm.cmd run export:android
```

`export:android` verifikon bundling JavaScript dhe assets; nuk gjeneron APK.
Build-i native, keystore dhe Gradle dokumentohen në [fazën F](docs/phase-f.md).
URL-të dhe kredencialet reale duhen për verifikimin e login-it në pajisje.

## Kërkesa ende të hapura

- Klienti i historisë përdor cursor pagination me faqe nga 20, por production ende kthen
  404 për endpoint-et. Dashboard-i kufizon biznesin në 24 dhe motoristin në 8 si fallback.
- GPS në background / ekran të kyçur është implementuar në D dhe kërkon verifikim në pajisje
  me build native dhe API reale. Android përdor foreground service dhe njoftim të vazhdueshëm;
  tracking ndalet pas force-stop nga përdoruesi.
- PUT /riders/me/devices përgjigjet 401 në production edhe me rider Bearer token valid.
  Expo projectId, FCM Android dhe feature flag janë konfiguruar; backend auth/upsert dhe
  dërgimi end-to-end duhet të korrigjohen/deploy-ohen.
- Package/bundle ID i APK-së: al.happytirana.courier, versionCode 1.

Kontratat e sakta që duhen shtuar në backend janë te [docs/backend-required.md](docs/backend-required.md).

Shih [kontratat dhe burimet](docs/contracts.md) dhe [verifikimin e fazës A](docs/phase-a.md).
Faza B dhe kontrollet në pajisje dokumentohen në [docs/phase-b.md](docs/phase-b.md).
Faza C dhe kufijtë e historisë dokumentohen në [docs/phase-c.md](docs/phase-c.md).
GPS, lejet dhe verifikimi në pajisje dokumentohen në [docs/phase-d.md](docs/phase-d.md).
Push dhe aktivizimi pas konfirmimit të kontratës dokumentohen në [docs/phase-e.md](docs/phase-e.md).
APK lokal, mjetet brenda projektit dhe instalimi dokumentohen në [docs/phase-f.md](docs/phase-f.md).
