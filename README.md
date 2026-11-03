# Step Pet

A free step counter where a pet hatches, grows and evolves from your walking. The adult form depends on *when* you walk, and the look (colour, pattern, eyes, ears, size, markings) comes from a random seed plus your own walking data, so every pet is unique.

```
app/      React Native (Expo SDK 58, expo-router) – Android first, iOS ready
backend/  Node + Express + MongoDB (Mongoose)
```

## How data is stored

| Where | What | Why |
| --- | --- | --- |
| Phone health store (Health Connect / HealthKit) | Raw steps | Owned by the OS; the app only reads hourly step totals |
| App SQLite cache (`steppet.db`) | Last 7 days of hourly steps, last sync result, pending surprises | Opens instantly, works offline |
| MongoDB | `users`, `stepdays`, `pets`, `items`, `goldendays`, `groups`, `treats` | Source of truth, survives a lost phone |

Sync flow: health store → SQLite → `POST /steps/sync` (last 7 days) → server closes finished days, checks golden steps, recomputes the pet → app caches the result and schedules notifications.

The nightly job (00:05 in `APP_TIMEZONE`) closes yesterday for every user: goal met or not, streak, mood, streak rewards (7, 14 and 30 days). Each sync also catches up any days the job missed.

Game rules (thresholds, hourly cap, evolution window) are in `backend/src/config.ts`.

## Run the backend

Needs MongoDB running locally (`brew services start mongodb-community`) or a MongoDB Atlas URL.

```bash
cd backend
cp .env.example .env   # set MONGO_URL and a long random JWT_SECRET
npm install
npm run dev            # http://localhost:4000
npm test               # needs a MongoDB at TEST_MONGO_URL (default mongodb://127.0.0.1:27018/steppet_test)
```

## Run the app

Health Connect and HealthKit need a development build (not Expo Go).

```bash
cd app
npm install
echo "EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:4000" > .env   # for a real phone
npx expo run:android   # needs Android Studio + SDK, phone or emulator with Health Connect
npx expo run:ios       # needs Xcode + CocoaPods
```

Without `.env`, the app talks to `10.0.2.2:4000` on the Android emulator and `localhost:4000` on the iOS simulator.

Cloud builds instead of local SDKs: `npx eas-cli@latest build --profile development --platform android`.

Dev-only: open `/pet-gallery` to see sample pets in every stage, form and mood.

## Features by phase

- **Phase 1 (MVP):** step sync, mystery egg, growth stages, evolution by walking time, mood, home screen and goal.
- **Phase 2:** golden steps, shareable pet card, campus groups and weekly leaderboard (hourly cap 2,500), streaks, 7 pm nudge.
- **Phase 3:** pet collection and new eggs, visiting friends' pets, treats.
