# Kontratat backend që mungojnë në production

Kontrolluar kundrejt `https://delivery.instant.al/api` më 2 tetor 2026 me llogaritë demo.
Login-et dhe dashboard-et kthejnë 200, por endpoint-et më poshtë nuk janë të implementuara.
Aplikacioni nuk simulon histori të plotë nga listat e kufizuara 24/8.

## Historia me cursor pagination

Backend-i duhet të shtojë:

- `GET /businesses/:businessId/orders?cursor=<opaque>&limit=20&status=DELIVERED,CANCELLED`
- `GET /riders/:riderId/orders?cursor=<opaque>&limit=20&status=DELIVERED,CANCELLED`

Përgjigjja e përbashkët:

```json
{
  "items": [],
  "nextCursor": null
}
```

`cursor` duhet të jetë opak dhe renditja stabile (`createdAt DESC, id DESC`). Serveri duhet
të verifikojë që tokeni ka akses vetëm te biznesi/motoristi përkatës. `limit` maksimum 50.
DTO-t e `items` janë `BusinessOrder` dhe `RiderOrder` ekzistuese.

## Regjistrimi i pajisjes për push

`PUT /riders/me/devices`, me Bearer token të motoristit:

```json
{
  "expoPushToken": "ExpoPushToken[...]",
  "platform": "android"
}
```

`platform` pranon `android | ios`; përgjigjja është `{ "ok": true }`. Backend-i duhet të
bëjë upsert idempotent, ta lidhë tokenin me rider-in e autentikuar dhe të mos pranojë një
riderId nga body. Për pajisje të ndara duhet edhe kontratë çregjistrimi në logout.

Ky payload/response është implementuar në klient, por flag-u mbetet false derisa route-i,
Expo projectId dhe kredencialet FCM të jenë reale.

### Teksti i njoftimit për porosi të re

Kur krijohet një porosi dhe backend-i e dërgon te Expo Push Service, payload-i duhet të
përdorë emrin real të biznesit (jo tekstin literal `[emri i biznesit]`):

```json
{
  "title": "Porosi e re",
  "body": "Ke një porosi të re nga <businessName>. Hape aplikacionin për detajet.",
  "sound": "default",
  "priority": "high",
  "channelId": "orders",
  "data": {
    "event": "ORDER_CREATED",
    "businessName": "<businessName>"
  }
}
```

Shembull: `Ke një porosi të re nga Happy Demo Business. Hape aplikacionin për detajet.`
