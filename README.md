# AAI Brilliant Clone

Interactive learning app scaffold built with **Vite**, **React**, and **Firebase** (Auth + Firestore).

## Tech stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Firebase](https://firebase.google.com/) Auth and Firestore
- Firebase Emulator Suite for local development

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables and fill in your Firebase project config:

   ```bash
   cp .env.example .env
   ```

   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/), then add a web app and paste the config values into `.env`.

3. Run the frontend:

   ```bash
   npm run dev
   ```

## Local development with emulators

For offline local development without a live Firebase project:

1. Set `VITE_USE_FIREBASE_EMULATORS=true` in `.env`
2. Start emulators and the app together:

   ```bash
   npm run dev:local
   ```

   Emulator UI: http://localhost:4000

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run dev:local` | Start Firebase emulators + Vite |
| `npm run emulators` | Start Firebase emulators only |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |

## Firebase setup

1. Enable **Authentication** (Email/Password or your preferred providers).
2. Create a **Firestore** database.
3. Deploy security rules when ready:

   ```bash
   npx firebase deploy --only firestore:rules
   ```
