# Referencat read-only

Rrënja e projektit origjinal: `C:\Users\Admin\Documents\Happy Tirana\Happy-Tirana-Courier`.

## Login dhe sesioni

- apps/rider-app/lib/api.ts — POST /riders/auth/login, përgjigjja `{ rider }`.
- apps/business-portal/lib/api.ts — POST /businesses/auth/login, përgjigjja `{ business }`.
- apps/api/src/server.ts:2476 — login biznesi, email trim/email, password min 6.
- apps/api/src/server.ts:2525 — login motorristi, email trim/email, password min 4.
- apps/api/src/server.ts:370, :687 — id dhe name të llogarisë; ID profili/biznesi,
  jo userId. Klienti ruan vetëm id, name, token dhe rolin e zgjedhur.
- apps/api/src/server.ts:592 — token opak id.expiry.signature[.version], expiry 12h.
  Nuk është JWT; nuk shtohet refresh endpoint.
- apps/api/src/server.ts:656 — rider.join dhe business.join marrin token si string + ack.

Faza A përdor vetëm dy endpoint-et e login-it. Client-i qendror për kërkesat e
autentikuara pastron sesionin dhe cache në 401. Realtime shtohet në fazat B/C.

## Design dhe logo

- apps/rider-app/app/globals.css dhe apps/business-portal/app/globals.css:
  Manrope; body/input 14/22; title 24/32; CTA 15/22; tab 12/16;
  override final light: #fff, #18212b, #536170, #e2e5e9, #f8f9fa; orange #ff5500.
- apps/rider-app/app/login/page.tsx dhe apps/business-portal/app/login/page.tsx:
  formular email/password, ikona Mail/Lock/Shield/Store, mesazhe suspended/inactive,
  buton Hyr dhe lidhje /forgot-password. Host-et HTTPS priten nga përdoruesi.
- apps/rider-app/public/happy-logo.jpeg dhe happy-logo.svg kopjohen në assets të ri.
  Pas kërkesës për heqjen e dekorimeve anësore, shfaqet SVG origjinal i pastër me SvgXml.

## Fazat e mëvonshme

- packages/shared-types/src/index.ts: statuset dhe eventet.
- apps/rider-app/lib/navigation.ts: destinacion pickup para PICKED_UP, dropoff më pas.
- apps/rider-app/components/rider-gps.tsx: GPS kur online ose me porosi aktive;
  interval minimal dërgimi 5s dhe mesazh GPS i vjetër pas 30s.
- apps/api/src/server.ts:3999: POST /riders/me/location dhe kufijtë e fushave.
- apps/api/src/business-orders.ts:8–33: schema quote/order, vlera negative e lejuar.
- apps/api/src/maps-location.ts:1–9: isGoogleMapsUrl, lexim i autorizuar nga përdoruesi.
- apps/api/src/server.ts:1227 dhe :3018: kufijtë 8/24 të historisë ekzistuese.
- apps/api/src/server.ts:3271: vendimi i biznesit lejon vetëm CONFIRM.

API origjinale, konfigurimi i saj dhe databaza nuk ndryshohen.

## Login i përbashkët dhe faza B

Faqja kryesore tani është login-i. Authenticate provon /riders/auth/login dhe vetëm
në INVALID_RIDER_LOGIN provon /businesses/auth/login. Në 403, timeout, 5xx ose response
të pavlefshme ndalet. Role merret nga endpoint-i që autentikon kredencialet.
Për password 4–5 karaktere, business login nuk provohet (serveri kërkon min 6).
Nëse ekzistojnë dy llogari me të njëjtat kredenciale në të dy rolet, duhet kontratë
login-i unike në API për ta zgjidhur pa përparësi; aktualisht rider login provohet i pari.

Faza B përdor rrugët e dokumentuara në apps/rider-app/lib/api.ts dhe server.ts:
dashboard :2567; availability :2578; accept :3613; reject :3830; status :3860;
routes :2428. server.ts:656 konfirmon rider.join(token, ack).
Design/tekstet e B referohen rider-app/app/page.tsx, app/delivery/page.tsx dhe
app/earnings/page.tsx, me përshtatje native. Nuk lexohet/shkruhet databaza.

## Faza C

DTO-t BusinessDashboard/BusinessOrder/BusinessOrderQuote nga business-portal/lib/api.ts
kopjohen në src/contracts/business.ts. Validimet quote/order nga business-orders.ts:8–33
dhe maps-location.ts:1–9 kopjohen në src/contracts/business-order.ts.
Rrugët dhe eventet: server.ts:665 business.join; :106 order-window; dashboard :2954
(LIMIT 24 në :3018); location :3075; quote :3087; krijim porosie :3121 dhe rruga :3260.
Formulari dhe lista ndjekin business-portal/app/page.tsx dhe globals.css, përshtatur native.
Detajet e implementimit, komandat dhe verifikimi janë në phase-c.md.

## Faza D — GPS

- rider-app/components/rider-gps.tsx: tracking kur online ose me porosi aktive,
  interval minimal 5s, sinjal i vjetër pas 30s dhe mesazhe të gjendjes së GPS-it.
- rider-app/lib/api.ts:225–245: sendRiderLocation, POST /riders/me/location me riderId,
  orderId null dhe lat/lng/accuracy/speed/heading.
- api/src/server.ts:3999–4055: kufijtë Zod, kontrolli autoritativ online/porosi aktive,
  403 GPS_ALLOWED_ONLY_WHEN_ONLINE_OR_ACTIVE_ORDER dhe përgjigjja 201 { ok: true }.

Rider ID merret nga sesioni, jo nga formulari. Përputhet me website-in që dërgon
orderId null; nuk hamendësohet cilës prej disa porosive aktive i përket matja.
Background shtohet native me expo-task-manager dhe expo-location. API-ja nuk ndryshohet.

## Faza E — Push

Kërkimi i rrugëve në apps/api/src/server.ts konfirmoi që PUT /riders/me/devices nuk është
i implementuar. apps/rider-app/lib/api.ts dhe business-portal/lib/api.ts nuk kanë kontratë
Expo device/push. Tabela notifications dhe outbox-i në server.ts nuk janë kontratë për
regjistrimin e tokenit Expo. Nuk kopjohen ose shpiken fushat e këtij endpoint-i.

src/push/device-contract.ts mban adapter null; EXPO_PUBLIC_ENABLE_PUSH_REGISTRATION
mbetet false. src/api/devices.ts ka kodin PUT me Bearer dhe adapter për body/përgjigje,
por refuzon dërgimin pa flag dhe kontratë të konfirmuar. Pritja native përdor SDK-në Expo,
ndërsa njoftimi thjesht rifreskon endpoint-et ekzistuese të dashboard-it të rolit aktual.
Nuk supozohet schema e payload-it push; nuk përdoren URL, role ose veprime nga payload-i.
