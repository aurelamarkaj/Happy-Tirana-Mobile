# Faza D — GPS live

Implementuar me expo-location ~57.0.20 dhe expo-task-manager ~57.0.21, versionet që
rekomandon SDK 57. Task Manager nevojitet për ekzekutimin kur UI nuk është aktive.

## Burimet read-only

- [Tracking dhe treguesit e website-it](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/rider-app/components/rider-gps.tsx>)
- [sendRiderLocation](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/rider-app/lib/api.ts:225>)
- [Schema dhe endpoint-i](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/api/src/server.ts:3999>)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Task Manager](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [Router custom entry](https://docs.expo.dev/router/installation/#setup-entry-point)

## Sjellja dhe vendimet

- Tracking vetëm për RIDER kur isOnline ose ka ACCEPTED/PICKED_UP. Business nuk merr
  leje GPS dhe nuk nis tracking. Kur motorristi kalon offline, GPS vazhdon nëse ka porosi aktive.
- POST /riders/me/location merr riderId nga sesioni, orderId null si website-i dhe
  lat/lng/accuracy/speed/heading. Unknown/negative sensor speed/heading hiqen; saktësia e
  panjohur nuk shpiket. Schema ruan kufijtë e serverit. Nuk lidhet direkt me DB.
- Një sender i vetëm për foreground dhe background, minimum 5s ndërmjet tentativave;
  kërkesat nuk mbivendosen. Policy rifreskohet nga serveri pas 15s kur vijnë matje.
  UI/socket/dashboard mund ta rifreskojnë më herët. Serveri mbetet autoritativ me 403.
- Matjet më të vjetra se 30s ose të pavlefshme nuk dërgohen. Në batch OS përdoret vetëm
  matja më e fundit. Pas humbjes së internetit nuk grumbullohet histori për riprovim.
- Logout, 401, skadimi dhe ndërrimi i rolit ndalin tracking dhe kërkesat në fluturim.
  Një përgjigje e vonuar nuk mund të ringjallë tracking ose të përditësojë sesionin tjetër.
- Entry index.ts regjistron task-un në module scope përpara Router-it. UI dhe task-u
  ndajnë një hydration SecureStore. Nuk ruhet token i dytë ose histori GPS në disk.
- Tokeni i login-it të ri përdor AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY në iOS që të
  lexohet nga task-u pas kyçjes së ekranit, pasi pajisja është zhbllokuar për herë të parë.
  Për sesione të ruajtura nga versioni i mëparshëm, dil dhe hyr sërish për këtë konfigurim.
- Lejet kërkohen nga butonat GPS kur tracking nevojitet. Për background shfaqet
  shpjegimi përpara hapjes së cilësimeve në Android 11+. Në refuzim përdoret vetëm
  foreground dhe matjet ndalen kur aplikacioni kalon në background.
- Android përdor foreground service me njoftim të vazhdueshëm. iOS merr Always dhe
  UIBackgroundModes location. Task-u nuk niset nga background; niset kur aplikacioni
  është aktiv dhe lejet janë dhënë. Në kthim nga cilësimet kontrollohen sërish lejet.
- Dashboard dhe Dërgesa tregojnë GPS live/i përafërt, saktësinë dhe dërgimin e fundit.
  Harta e dërgesës shfaq marker-in e pozicionit aktual. Preview web nuk merr/dërgon GPS.

## Komandat

```powershell
Set-Location 'C:\Users\Admin\Documents\happy-tirana-mobile'
# Paketat janë tashmë në package.json/package-lock.json.
node scripts/expo-local.cjs install expo-location expo-task-manager
npm.cmd run typecheck
npm.cmd test
npm.cmd run expo:check
node scripts/verify-location-config.cjs
npm.cmd run export:android
npm.cmd start -- --clear
```

verify-location-config.cjs përdor config introspect pa gjeneruar projekt native dhe printon
vetëm rezultatin e lejeve, jo konfigurimin publik që përmban Maps key. Lejet e plugin-it
kërkojnë build native të ri. Prebuild/Gradle/keystore dhe APK lokal trajtohen në fazën F.

## Verifikimi dhe kufijtë

Typecheck dhe 50 teste kaluan më 2026-10-02, përfshirë 19 teste për GPS. Introspection
konfirmoi ACCESS_FINE/COARSE/BACKGROUND_LOCATION, FOREGROUND_SERVICE dhe
FOREGROUND_SERVICE_LOCATION në Android, si dhe background mode dhe përshkrimet e iOS.
Export-i përfundimtar Android kaloi me index.ts dhe 3492 module, me bytecode Hermes në dist.
Ai verifikon JavaScript/assets; nuk konfirmon ekzekutimin native ose GPS real.

Testimi në pajisje pret URL-në HTTPS, kredencialet reale dhe build native. Expo Go nuk
verifikon këtë background task. Tracking ndalet pas force-stop; kufizimet e baterisë të
prodhuesit mund ta ndërpresin. Rihapja e app-it kontrollon sesionin, lejet dhe dashboard-in.

Kontrollo në Android fizik: online → leje foreground → matje te admini; refuzim leje;
background permission → Home/ekran i kyçur për 2–5 minuta → timestamp te admini;
offline pa porosi → ndalim; offline me porosi aktive → vazhdim; dorëzim i porosisë së fundit
kur offline → ndalim; logout/401 → ndalim dhe heqje njoftimi; internet off/on → vetëm
matje të reja; GPS i fikur; leje të revokuara në Settings; force-stop dhe rihapje.
Për iOS përsërit kontrollet me Always dhe ekran të kyçur kur të ketë build iOS.

Faza E (push me flag) pret miratimin pas D.
