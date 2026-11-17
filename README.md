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
| App SQLite cache (`steppet.db`) | Last 7 days of hourly steps, last sync result | Opens instantly, works offline |
| MongoDB | `users`, `sessions`, `stepdays`, `pets`, `items`, `questclaims`, `monstersettings`, `metas` | Source of truth, survives a lost phone |

Sync flow: health store (+ the phone's step sensor for today while the app is open) → SQLite → `POST /steps/sync` (last 7 days) → server merges each hour atomically keeping the higher count, closes finished days, recomputes the pet → app caches the result and schedules notifications.

### Accounts, devices and live updates

- **Usernames** are unique (`a-z 0-9 _`, 3-20). Sign-up asks for username, email and password; sign-in takes either the username or the email. `GET /auth/username?u=` checks a name while it is typed.
- **Sessions**: every sign-in creates a session for that device. Several phones can be signed in at once; `POST /auth/logout` ends only that phone's session, and its token stops working immediately (also for background syncs). Resetting the password ends every session.
- **Many devices at once**: hourly steps are merged inside MongoDB with `$max`, closing a day is a compare-and-set on `lastClosedDay`, rewards have unique indexes, so parallel syncs from two phones never double count or lose steps.
- **Live**: while the app is open it counts with the phone's step sensor and syncs every 45 s. Screens long-poll the server (`GET /steps/state?wait=<rev>`, `GET /leagues?wait=<rev>`): the request is held until something changes (another device synced, someone in your league walked) or 25 s pass, so Today and the league table update by themselves.
- **Forgot password**: `POST /auth/forgot` emails a 6-digit code (valid 30 minutes, 5 tries), `POST /auth/reset` sets the new password. No mail provider is wired up yet: outside production the code is printed in the backend log. Add one in `backend/src/lib/mailer.ts` before launch.
- Sign-in, sign-up and reset are rate limited (10 tries a minute per address). Production refuses to start without a `JWT_SECRET` of 32+ characters.

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
                       # e.g. TEST_MONGO_URL=mongodb://127.0.0.1:27017/steppet_test npm test
```

### Admin and demo accounts

```bash
npm run seed           # creates or resets the admin and demo accounts
```

`npm run seed` creates two accounts you can log in with. Their emails and passwords are the `SEED_ADMIN_*` and `SEED_DEMO_*` values in `backend/.env`.

- **Admin**: a plain account with the admin role. It only sees the Admin screens, has no pet or steps, and is left out of walker stats, the user list and leagues.
- **Demo walker**: about 75 days of walks and an adult Mochi. Good for showing the app.

Running it again resets only these two accounts (and removes the fake helper walkers that older versions of the script added). Set your own passwords in `.env` before seeding a shared server.

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

## Screens

Paper & Ink design: warm paper, typewriter text, one terracotta accent; colour belongs to the 19 monsters (`app/src/components/Monster.tsx`).

- **Getting in:** welcome, create account (live username check), sign in (username or email), forgot password (emailed code), onboarding (daily goal, step access, name your egg).
- **Walker tabs:** today (pet, the step capsule on its goal rail, hourly rhythm, quests, a night-lamp look after 9 pm), path (last 7 days, growth path, 30-day totals), league (weekly table by username, updates live), closet (wear up to three earned items), guide (every monster, unlocked or not).
- **Me:** profile, daily goal, reminders, sounds, pets you raised, sign out, delete account.
- **Admin:** overview, walkers (search, filters), review flags (7 x 24 hour grid, clear or hide), monsters (on/off, unlock thresholds).

Groups, friend visits, treats-to-friends and golden steps were removed in the redesign.
