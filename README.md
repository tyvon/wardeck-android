# War Deck - Cordova Edition

A military-themed lane-based tower defense strategy game built with HTML5 Canvas and Apache Cordova.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Cordova CLI: `npm install -g cordova`
- For Android: Android Studio with Android SDK
- For iOS: Xcode (macOS only)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Building the App

### Prepare platforms
```bash
cordova prepare
```

### Android

1. Add Android platform:
   ```bash
   cordova platform add android
   ```

2. Build APK:
   ```bash
   npm run build-android
   ```

3. Run on device/emulator:
   ```bash
   npm run run-android
   ```

### iOS

1. Add iOS platform:
   ```bash
   cordova platform add ios
   ```

2. Run Webpack bundle:
   ```bash
   npm run bundle
   ```

3. Build for iOS:
   ```bash
   npm run build-ios
   ```

4. Run on device/simulator:
   ```bash
   npm run run-ios
   ```

## Development

### Local Testing
To test in a browser:
```bash
cordova serve
```
Then open http://localhost:8000 in your browser.

### Project Structure
```
WarDeckCordova/
├── config.xml          # Cordova configuration
├── package.json        # NPM dependencies
├── www/               # Game source files
│   ├── index.html     # Main HTML file
│   ├── styles.css     # Game styles
│   ├── js/            # JavaScript modules
│   ├── images/        # Game graphics
│   ├── music/         # Background music
│   └── sounds/        # Sound effects
├── platforms/         # Platform-specific builds (generated)
├── plugins/           # Cordova plugins (generated)
└── hooks/            # Build hooks
```

## Features

- **10 Different Unit Types**: Infantry, tanks, artillery, and static defenses
- **Campaign Mode**: 5 missions with multiple levels each
- **Quick Game Mode**: Standard, Survival, and Destruction variants
- **Strategic Gameplay**: Capture bonus tiles for advantages
- **Cross-Platform**: Works on Android and iOS devices

## Troubleshooting

### Android Build Issues
- Ensure Android SDK is properly installed
- Check that ANDROID_HOME environment variable is set
- Run `cordova requirements android` to verify setup

### iOS Build Issues
- Xcode must be installed (macOS only)
- You may need to open the project in Xcode and configure signing

### Performance Issues
- The game is optimized for devices with at least 2GB RAM
- Close other apps for better performance
- The game runs in landscape mode only

## License

MIT License - see LICENSE file for details
