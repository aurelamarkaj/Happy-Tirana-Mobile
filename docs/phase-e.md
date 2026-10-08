# Faza E — Pritja e push njoftimeve

Implementuar me expo-notifications ~57.0.21 (SDK 57). Expo Constants ekzistonte tashmë.
Nuk u ndryshua API-ja, projekti origjinal ose databaza.

## Sjellja

- Handler-i native regjistrohet përpara Router-it dhe tregon njoftim në foreground vetëm
  kur ka sesion të vlefshëm. Tingulli dhe badge nuk imponohen nga aplikacioni.
- Listener-at marrin njoftimin dhe rifreskojnë dashboard-in e rolit të autentikuar. Prekja
  hap vetëm Dashboard për RIDER ose Porositë për BUSINESS. Nuk merret URL/rol nga data.
- Njoftimi nuk pranon/refuzon ofertë, nuk krijon porosi dhe nuk ndryshon status.
- Prekja në cold start konsumohet një herë. Njoftimet pas logout/ndërrimit të sesionit
  nuk hapin ekranin e llogarisë së vjetër. Subscription-et hiqen kur ndryshon sesioni.
- Regjistrimi është vetëm për RIDER, për endpoint-in e kërkuar /riders/me/devices.
  Business ka pritjen dhe rifreskimin, por nuk shpiket endpoint regjistrimi për të.
- Android krijon channel orders me rëndësi HIGH, përpara kërkesës së lejes. Plugin-i
  përdor këtë channel si default. POST_NOTIFICATIONS dhe APNs entitlement u konfirmuan.
- Leja kërkohet vetëm nga butoni “Lejo njoftimet”; retry pas kthimit në foreground dhe
  pas rotation nuk hap dialog lejeje. Refuzimi i përhershëm ofron hapjen e Settings.
- getExpoPushTokenAsync përdor Expo projectId të konfiguruar. Pas rotation të tokenit
  native, merr tokenin Expo sërish duke kaluar devicePushToken, pa callback rekursiv.
- Regjistrimi deduplikohet për tokenin e login-it dhe Expo push token. PUT në fluturim
  anulohet në logout; përgjigjet e vjetra nuk regjistrojnë sesionin e ri. Tokeni push nuk
  ruhet në disk, në Query cache ose në log. Expo token acquisition ka afat 20s; të
  dhënat që kthehen vonë pas timeout/ndërrimit të sesionit nuk dërgohen.
- Preview web nuk kërkon leje, token ose push dhe nuk importon modulet native të push-it.

## Endpoint-i i munguar dhe flag-u

Burimi read-only: [apps/api/src/server.ts](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/api/src/server.ts>).
Në server nuk ka PUT /riders/me/devices; as [rider API client](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/rider-app/lib/api.ts>)
nuk përcakton fushat e tij. Outbox notifications i website-it nuk është Expo Push Service.

EXPO_PUBLIC_ENABLE_PUSH_REGISTRATION=true është konfigurimi aktual. Regjistrimi bëhet
vetëm për RIDER dhe përdor `{ expoPushToken, platform }`, duke pritur `{ ok: true }`.
Route-i production përgjigjet si endpoint i mbrojtur me `RIDER_AUTH_REQUIRED` pa token.

Kodi PUT është në src/api/devices.ts dhe përdor client-in HTTPS Bearer ekzistues.
src/push/device-contract.ts përmban adapter-in e kontratës së kërkuar. Backend-i duhet
të implementojë të njëjtin payload/response sipas `docs/backend-required.md`.

## Çfarë duhet për aktivizim real

1. Deploy i PUT me kontratën e dokumentuar dhe vendimi për çregjistrimin në logout në
   pajisje që ndahet mes llogarive; klienti nuk shpik DELETE ose fushë enabled.
2. Expo projectId real është lidhur me `@aurelamarkaj/happy-tirana-mobile` dhe vendosur
   te `extra.eas.projectId`.
3. Firebase Spark `happy-tirana-courier`, `google-services.json` për package-in
   `al.happytirana.courier` dhe FCM V1 service account në Expo EAS janë konfiguruar.
   Expo Push Service kërkon edhe kredencialet për dërgim; ato nuk vendosen në .env publik.
4. Build native dhe dërgues push. API-ja aktuale nuk dërgon Expo push. Expo Notifications
   mbështet build lokal pa EAS Build dhe pa publikim në Play Store; prebuild/Gradle mbeten në F.
5. Pas deploy-it të route-it dhe konfigurimit të kredencialeve, vendos flag-un true dhe
   rindiz Metro/rindërto app-in sipas konfigurimit native.

## Komandat dhe verifikimi

```powershell
Set-Location 'C:\Users\Admin\Documents\happy-tirana-mobile'
# Paketa është tashmë e instaluar dhe në package-lock.
node scripts/expo-local.cjs install expo-notifications
npm.cmd run typecheck
npm.cmd test
npm.cmd run expo:check
node scripts/verify-location-config.cjs
npm.cmd run export:android
npm.cmd start -- --clear
```

Më 2026-10-02 kaluan TypeScript dhe 70 teste, përfshirë 20 për push: flag/kontratë,
role/expiry, leje, projectId, deduplikim, rotation, logout gjatë kërkesave dhe navigation.
Config introspect konfirmoi lejen e njoftimeve Android dhe entitlement të iOS, bashkë
me lejet GPS. Export-i Android me Hermes kaloi. Ai kontrollon bundling; nuk është provë e push-it real.

Testimi fund më fund mbetet në pritje të të dhënave më lart. Në build native kontrollo:
leje/refuzim, njoftim foreground dhe background, tap nga app i mbyllur, login/401/logout,
rotation, internet off/on, flag false pa token/PUT dhe payload me URL që duhet injoruar.
Expo Go Android nuk mbështet remote push; testimi kërkon build native të instaluar.

Referenca zyrtare: [Notifications SDK](https://docs.expo.dev/versions/latest/sdk/notifications/),
[Expo push setup dhe build lokal](https://docs.expo.dev/push-notifications/push-notifications-setup/).

Faza F — udhëzimet APK lokal, Gradle dhe keystore — pret miratimin pas E.
