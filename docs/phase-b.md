# Faza B — Motorristi pa GPS

## Implementuar

- Dashboard dhe metrics nga GET /riders/:id/dashboard.
- Online/offline POST /riders/:id/availability me isOnline (pa lat/lng në B).
- Oferta me countdown nga offerExpiresAt; prano/refuzo pa retry automatik.
- Kontroll paraprak online, orar, debit, maxActiveOrders dhe skadim oferte.
  API mbetet autoriteti për pranimin dhe konfliktet.
- Zgjedhje ndërmjet dërgesave aktive, PICKED_UP dhe DELIVERED sipas statusit real.
- react-native-maps me marker pickup/dropoff dhe polyline nga GET /public/routes.
- Telefon biznesi/klienti dhe Google Maps sipas pickup/dropoff.
- Fitime sot/javë, transport, debit, gjendja e tërheqjes dhe 8 porositë e fundit.
- Socket.IO rider.join(token, ack), refresh në reconnect/evente dhe çdo 15s në foreground.
- Socket-i mbyllet në background/logout. GPS në background vjen në D.
- Kërkesat private me 401 e mbyllin sesionin; query-t anulohen në logout.
- Login i vetëm në faqen kryesore dhe SVG origjinal pa cepat dekorativë.

## Komandat

```powershell
Set-Location 'C:\Users\Admin\Documents\happy-tirana-mobile'
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run expo:check
npm.cmd run export:android
npm.cmd start -- --web --port 8081
```

Plotëso EXPO_PUBLIC_API_BASE_URL dhe URL-të e reset-it në .env kur të jepen.
Socket përdor origin HTTPS të API-së dhe path /socket.io; ndrysho
EXPO_PUBLIC_SOCKET_PATH vetëm nëse proxy e publikon në një path tjetër.

Për hartat në APK Android, plotëso EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY (Maps SDK
for Android, i kufizuar te package al.happytirana.courier dhe SHA-1 i signing).
Nuk përdoret çelësi sekret i serverit. Plugin-i i maps e vendos key-n gjatë prebuild.
iOS përdor provider-in standard Apple Maps në këtë fazë.
Build-i APK dhe signing dokumentohen në F.

## Verifikimi real në pajisje

1. Hyr me motorrist/biznes pa zgjedhur rol; API përcakton grupin e navigimit.
2. Rikthe app-in dhe kontrollo ruajtjen e sesionit.
3. Dashboard: offline/online, orari i mbyllur, debit block dhe metrics.
4. Prano/refuzo ofertën; test skadimi, kapaciteti dhe konflikt kur pranohet nga tjetër.
5. Dy porosi aktive: zgjedhja dhe harta/telefoni për porosinë përkatëse.
6. ACCEPTED → PICKED_UP → DELIVERED, duke kontrolluar rifreskimin dhe fitimet.
7. Ndërprit internetin; mos riprovo statusin pa rifreskuar të dhënat.
8. Kontrollo eventet live, reconnect dhe 401 (rikthim te login).

Pa URL/key/kredenciale/pajisje, këto janë ende të paverifikuara.
Historia e plotë mbetet e bllokuar nga mungesa e endpoint-it të pagination;
nuk shfaqet një “Më shumë” që do të pretendonte se ka të dhëna të tjera.

## Rezultatet — 2 tetor 2026

- TypeScript kaloi pas instalimit të pastër nga lockfile.
- 22/22 teste kaluan (sesioni, klienti HTTPS, përcaktimi i rolit dhe workflow motorristi).
- Expo dependency check: të gjitha paketat të përputhshme.
- Android export: kaloi me 3470 module dhe bundle Hermes në dist/.
- Web preview: login-i dhe logoja e pastër u verifikuan vizualisht.
- API reale, socket-i real, Google Maps native dhe veprimet në pajisje mbeten të paverifikuara.
