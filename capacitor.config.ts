import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration — wraps the TenetBid web app into a native
 * Android (and iOS) app shell.
 *
 * Build a real APK two ways:
 * 1. GitHub Actions (recommended): push to main → .github/workflows/android-build.yml
 *    produces a signed APK artifact automatically. No local tooling needed.
 * 2. Locally: install Android Studio + JDK 17, then:
 *      npm run build && npx cap sync android && npx cap open android
 *    and build from Android Studio (Build > Build APK(s)).
 */
const config: CapacitorConfig = {
  appId: 'com.tenetbid.app',
  appName: 'TenetBid',
  // The production URL — the app shell loads the live site so the APK always
  // serves the latest version without store updates (like a TWA).
  // For a fully-bundled offline build, run `npm run build` and set webDir.
  server: {
    url: 'https://tenetbid.com',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
