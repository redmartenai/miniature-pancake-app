# EduFlow apps (Android, iOS, web)

One Expo codebase builds two apps:

| App | Command | Who uses it |
|---|---|---|
| EduFlow | `npx expo start` | Parents, students, teachers, staff (also runs on the web: press `w`) |
| EduFlow Driver | `npm run start:driver` | Bus drivers and attendants |

`APP_VARIANT=driver` switches the app name, bundle ID and permissions (see [app.config.ts](app.config.ts)). The main app has no location permissions. The driver app shares location through a foreground service that the driver starts.

Start the backend first. Setup, demo accounts, store builds and the live-tracking walkthrough are in the [main README](../README.md).

```bash
npm install
npx expo start          # scan the QR code with Expo Go (same Wi-Fi as this computer)
npm run typecheck       # TypeScript
npx expo export --platform web   # static web app in dist/
```

Where things live:

- `src/app/`: screens (file-based routes)
- `src/features/`:
  - `tracking`: live map, ETA and stop timeline
  - `driver`: GPS queue and foreground service
  - chat, family and other feature modules
- `src/ui/`: shared components
- `src/theme/`: colours, fonts, per-school branding
- `src/i18n/`: English and Hindi
- `src/api/`: typed API client

On the web, `BusMap.web.tsx` uses Leaflet. On phones, `BusMap.tsx` uses native maps (Google Maps on Android, Apple Maps on iOS).
