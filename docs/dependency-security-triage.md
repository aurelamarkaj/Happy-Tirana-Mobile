# Dependency security triage — 5 tetor 2026

## Rezultati

`npm audit --omit=dev` u reduktua nga 30 gjetje (20 high, 10 moderate) në 20 high,
0 moderate dhe 0 critical. Override-et kompatibël kaluan typecheck, 76 teste, Expo check,
Android release build, signature verification dhe clean-install smoke test.

Dy advisory janë shkaqet rrënjë të 20 hyrjeve të mbetura; hyrjet e tjera janë vetëm
propagim i severity nëpër dependency graph:

1. `braces` / GHSA-vfj7-8cjw-p6xm — stack exhaustion nga glob patterns të ndërtuara nga
   input sulmues. Vjen vetëm përmes `micromatch` → Metro/Expo CLI.
2. `node-forge` / GHSA-86w9-cpqp-85rv — verifikim RSA PKCS#1 v1.5. Vjen vetëm përmes
   `@expo/code-signing-certificates` → Expo CLI.

Registry nuk ofron version të rregulluar për asnjë nga dy paketat në datën e auditit:
`braces` latest është 3.0.3 dhe `node-forge` latest është 1.4.0; të dy ranges shënohen
si vulnerable. Sugjerimi automatik `npm audit fix --force` kërkon downgrade të Expo në
44 dhe React Native në 0.72, që është incompatible dhe nuk pranohet.

## Reachability dhe risk acceptance

- Paketat përdoren nga Metro/Expo CLI gjatë build-it lokal; nuk importohen nga kodi i app-it.
- Release APK u inspektua: bundle-i `assets/index.android.bundle` nuk përmban
  `node-forge`, `braces`, `micromatch`, `metro-file-map` ose `@expo/cli`.
- Expo Updates është disabled në release, prandaj aplikacioni nuk verifikon update bundles
  të pakontrolluara me këtë zinxhir në runtime.
- Build-i merr source dhe konfigurim vetëm nga workspace i kontrolluar; nuk pranon glob
  patterns nga përdoruesit ose rrjeti.
- Dependency install duhet të vazhdojë me `npm ci` dhe lockfile-in e review-uar në CI.

Për këtë version, risku i dy advisory-ve pranohet si **build-time / not runtime reachable**
dhe nuk klasifikohet si bllokues i APK-së. Ky pranim skadon sapo registry publikon versione
të rregulluara ose kur Expo/React Native nxjerr një patch kompatibël; atëherë dependency
tree duhet përditësuar dhe auditi/regresioni duhet përsëritur.

## Mitigimet e aplikuara

- `query-string` u ngrit në 9.5.1 dhe `uuid` në 11.1.1 përmes npm overrides.
- Të 10 gjetjet moderate u eliminuan.
- Nuk u përdorën downgrade-et e pasigurta/incompatible të sugjeruara nga npm.
- APK release u rindërtua dhe nënshkrimi u verifikua pas ndryshimit të lockfile-it.

