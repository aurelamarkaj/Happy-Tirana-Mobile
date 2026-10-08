# Faza C — Biznes

Login-i u rikthye në formularin e vetëm email/password. Demo, kredencialet shembull,
transporti i simuluar dhe flag-u demo u hoqën. Autentikimi native përcakton rolin nga API-ja.

## Ekranet dhe kontratat

| Ekrani | Kërkesa |
|---|---|
| Porositë / Historia | GET /businesses/:id/dashboard |
| Porosi e re / orari | GET /businesses/order-window |
| Preview vendndodhje | POST /businesses/:id/orders/location, googleMapsUrl |
| Quote | POST /businesses/:id/orders/quote, googleMapsUrl dhe koordinatat/adresa e preview-t |
| Krijim | POST /businesses/:id/orders, fushat e validuara dhe koordinatat/adresa e quote-it |

Burimet origjinale janë vetëm të lexuara:

- [DTO dhe endpoint-et](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/business-portal/lib/api.ts>)
- [Rrugët dhe historia LIMIT 24](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/api/src/server.ts:3018>)
- [Preview dhe quote](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/api/src/server.ts:3075>)
- [Validimet Zod](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/api/src/business-orders.ts:8>)
- [Validimi Google Maps](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/api/src/maps-location.ts:1>)
- [Formulari dhe design i website-it](</C:/Users/Admin/Documents/Happy Tirana/Happy-Tirana-Courier/apps/business-portal/app/page.tsx>)

DTO-t kopjohen pa logjikën browser të ruajtjes së sesionit. Schema server ruan kufijtë,
telefonin, vlerën me shenjë dhe minutat 0–180; shtohen vetëm mesazhe shqip dhe konvertimi
i fushave string të formularit. Çmimi merret nga API-ja dhe rillogaritet nga serveri gjatë krijimit.
Nuk shtohet menaxhim produktesh ose vendim REFUSE që serveri nuk e pranon.

Socket business.join(token, ack), eventet order.created / order.offered / order.accepted /
order.status_changed rifreskojnë cache. Në foreground ka polling 15s; orari përdor edhe
nextCheckInSeconds. Në background socket-i shkëputet. 401 mbyll sesionin.

Preview dhe quote pastrohen kur ndryshon linku; revision refuzon përgjigje të vjetra,
edhe në ndryshim A → B → A. Krijimi kontrollon sërish orarin. Mutacionet nuk riprovohen
automatikisht; pas gabimit rifreskohet lista sepse serveri mund ta ketë kryer veprimin.
Timeout për resolver/quote/krijim është 30s, pasi resolver server mund të presë 20s.

Historia shfaq DELIVERED/CANCELLED nga dashboard-i në grupe 8, me “Më shumë” vetëm
kur ka të tjera të ngarkuara. Nuk është historia e plotë: mungon endpoint pagination;
API-ja ekzistuese nuk ndryshohet. Harta e preview-t është native, pa GPS.

## Komandat dhe kontrolli në pajisje

```powershell
Set-Location 'C:\Users\Admin\Documents\happy-tirana-mobile'
npm.cmd run typecheck
npm.cmd test
npm.cmd run expo:check
npm.cmd run export:android
npm.cmd start
```

Testet kontrollojnë validimet, përgjigjet e vjetra, rrugët/payload-et dhe izolimin e rolit.
Më 2026-10-02 kaluan typecheck, 31 teste (9 për biznesin), expo install --check dhe
export Android. Preview localhost:8081 u rifreskua dhe u verifikua login-i pa demo.
Bundling nuk provon lidhjen reale ose rendering në pajisje. URL-ja HTTPS dhe kredencialet
reale nevojiten për verifikimin fund më fund: login biznesi, Maps link brenda/jashtë zonës,
preview → quote → create, numra negativë, orar i mbyllur, dy klikime, timeout, evente live,
401 dhe histori me 8/Më shumë. Mos riprovo krijim pas timeout pa kontrolluar listën.

Faza D (GPS) dhe E (push) presin miratimin pas C.
