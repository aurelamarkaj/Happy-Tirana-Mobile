# Faza A — skeleti, navigimi, login dhe token

## Çfarë përmban

- Expo Router me route guards sipas sesionit dhe rolit.
- Zgjedhje roli dhe formë React Hook Form + Zod sipas API-së përkatëse.
- Login me fetch HTTPS dhe credentials: omit; Bearer vetëm për kërkesa private.
- SecureStore për sesionin minimal; nuk ruhet fjalëkalimi.
- Rikthim i sesionit para navigimit dhe heqje e të dhënave të korruptuara/skaduara.
- Timeout 12s; invalid credentials, suspended dhe inactive me mesazhe të qarta.
- Mbyllje sesioni në 401; përgjigjet e vjetra nuk mund të mbyllin sesionin e ri.
- Cache i Query pastrohet në login/logout; mutations nuk riprovohen automatikisht.
- Kontroll skadimi çdo 15s dhe kur app-i kthehet në foreground.
- Reset hap URL-në HTTPS të rolit në shfletues; pa URL shfaq konfigurimin e munguar.
- Font Manrope i paketuar lokalisht dhe logo nga website-i.

## Kontroll në pajisje pasi të plotësohet .env

1. Hape pa sesion: shfaqet zgjedhja e rolit.
2. Për të dy rolet: email i pavlefshëm / password i shkurtër refuzohet lokalisht.
3. Kredenciale të gabuara: shfaqet gabimi dhe mbetet login-i.
4. Kredenciale të sakta: hapen tab-et vetëm për atë rol.
5. Mbyll/rifillo app-in: rikthehet sesioni nga SecureStore.
6. Dil dhe hyr me rolin tjetër: sesioni i mëparshëm nuk ekspozohet.
7. Harrova fjalëkalimin: hapet faqja web për rolin përkatës.
8. Deep link drejt grupit tjetër: route guard ndalon aksesin.

401, race mes sesioneve dhe persistence failure mbulohen në tests/auth.test.ts.
Në A nuk ka ende kërkesa private të ekranit; trajtimi real i 401 nga dashboard-i
verifikohet në B/C me API-n reale. Nuk përdoren kredenciale demo apo auth i simuluar në UI.

## Kufijtë e verifikimit

Typecheck/test/export nuk provojnë SecureStore native në pajisje, pamjen vizuale,
ose lidhjen reale me API-n. Pa URL/kredenciale këto kontrolle mbeten për pajisjen.
Kjo fazë nuk përfshin ekranet funksionale B/C, GPS, push ose APK release.

## Rezultatet e verifikimit — 2 tetor 2026

- Expo 57.0.26 nga npm dist-tag latest (jo next/canary).
- `npm.cmd run typecheck`: kaloi me TypeScript 6.0.x të rekomanduar nga SDK.
- `npm.cmd test`: 12/12 teste kaluan.
- `npm.cmd run expo:check`: Dependencies are up to date.
- `npm.cmd run export:android`: kaloi, 3399 module, bundle Hermes në dist/.
- `node scripts/expo-local.cjs config --type public`: konfigurimi u lexua me sukses.
- Hash SHA256 i JPEG të kopjuar përputhet me origjinalin.
- Login real dhe pamje në pajisje: ende të paverifikuara; mungojnë URL-të dhe pajisja.
