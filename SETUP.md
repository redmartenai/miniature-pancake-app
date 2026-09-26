# EduFlow app: running it

This is the Expo app: parent, student, staff and driver apps on phones, plus the principal's web console (`/console`) and the EduFlow team's platform admin (`/platform`) on the web. It needs the Django API from `legendary-waffle-skl` running first. That repo's `SETUP.md` has the full guide, including Supabase and the backend environment.

```bash
npm install
cp .env.example .env            # set EXPO_PUBLIC_API_URL to http://<your Wi-Fi IP>:8010/api/v1
npx expo start --clear --port 8130
```

- **Web:** press `w`, or open http://localhost:8130.
- **Phone:** scan the QR code with Expo Go on the same Wi-Fi. The API must run with `runserver 0.0.0.0:8010`.
- **Driver app:** `npm run start:driver`.
- **Typecheck:** `npx tsc --noEmit -p .`

`EXPO_PUBLIC_*` values are baked in when the app bundles, and Metro may miss file changes on some drives. After changing `.env` or the code, restart with `--clear`.
