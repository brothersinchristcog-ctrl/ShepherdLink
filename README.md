# ShepherdLink - Pastors Association Mobile Application

One Fold, One Shepherd. Core Rule: One pastor belongs to one association.

## Running on Mobile (Android & iOS)

### 1. Start Metro Dev Server
```bash
npm start
```
* **Android Device**: Open the **Expo Go** app on your Android phone and scan the terminal QR code.
* **iOS Device**: Open the Camera app on your iPhone and scan the terminal QR code to open in **Expo Go**.

### 2. Run on Emulators / Simulators
```bash
# Android Emulator
npm run android

# iOS Simulator (macOS)
npm run ios
```

## Splash Screen & Branding
* **Native Splash & Icon**: Configured in `app.json` via `expo-splash-screen` using `./assets/splash-icon.png` (ShepherdLink brand logo).
* **In-App Animated Splash**: Implemented in `src/components/SplashScreenView.tsx` with smooth fade-in and scale transitions on app launch.

## Firebase Setup
* The app runs in offline/mock mode by default so you can test immediately without credentials.
* When your Firebase project is ready, copy `.env.example` to `.env` and fill in your Firebase project keys.
