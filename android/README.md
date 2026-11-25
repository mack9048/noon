# Noon Learn for Android (Google Play)

The app is the website (https://www.noonlearn.com) shown full screen as a Trusted Web Activity. Nothing else is inside it,
so every website update reaches the app at once. Package: `com.noonlearn.app`.

## Build the file for Google Play (AAB)
1. Install JDK 17+, Android SDK (platform 36, build-tools 36) and Gradle 8.14+. Set `ANDROID_HOME`.
2. Create `android/keystore.properties` (never commit it, `.gitignore` already skips it):
   ```
   storeFile=/full/path/noon-upload-key.jks
   storePassword=...
   keyAlias=noon-upload
   keyPassword=...
   ```
3. `cd android && gradle bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`
4. For each new upload to Play, raise `versionCode` in `app/build.gradle`.

## The app opens in full screen only when the website proves it owns the app
`https://<host>/.well-known/assetlinks.json` must list the app's package and the SHA-256 fingerprints of
(a) the upload key and (b) the "App signing key certificate" shown in Play Console → Test and release → App integrity.
The file lives in `app/public/well-known/assetlinks.json` and is served at `/.well-known/assetlinks.json` by the rewrite in `app/vercel.json`.
The host must serve it with status 200 and `application/json`.
