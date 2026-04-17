# MedPod Field Mobile (Android + iPhone)

Cross-platform React Native app (Expo) with:
- Driver Console
- Paramedic Console

## 1) Install

```bash
cd mobile/medpod-field
npm install
```

## 2) Configure API Base URL

The app reads:

- `EXPO_PUBLIC_MEDPOD_API_BASE`

Example:

```bash
export EXPO_PUBLIC_MEDPOD_API_BASE="http://YOUR-LAN-IP:8001/api/v1"
```

Use your machine LAN IP for real device testing (not localhost).

## 3) Run

```bash
npm run start
```

Then choose:
- `i` for iPhone simulator (macOS + Xcode)
- `a` for Android emulator
- or scan QR in Expo Go on physical devices

## Notes

- Driver screen supports trip status flow and maps/phone actions.
- Paramedic screen supports quick actions, vitals, medication, prenotify, and PCR section updates.

## Release Builds (Android + iPhone)

1. Install and login to EAS:

```bash
npm install -g eas-cli
eas login
```

2. Initialize EAS project link (first time only):

```bash
eas init
```

3. Open [app.json](app.json) and replace both placeholders:

- `REPLACE_WITH_EAS_PROJECT_ID` in `expo.updates.url`
- `REPLACE_WITH_EAS_PROJECT_ID` in `expo.extra.eas.projectId`

4. Build for store distribution:

```bash
npm run eas:build:android
npm run eas:build:ios
```

5. Submit to stores:

```bash
npm run eas:submit:android
npm run eas:submit:ios
```

Build profiles are defined in [eas.json](eas.json):
- `development`: dev client build
- `preview`: internal QA build (APK on Android)
- `production`: Play Store AAB + App Store release build
