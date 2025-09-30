# Quick Scan - Expo Snack Version

This is a simplified, Snack-compatible version of the Quick Scan document scanner app.

## 🚀 How to Import to Expo Snack

### Option 1: Manual Upload
1. Go to https://snack.expo.dev
2. Click "Import" → "Upload files"
3. Upload these files:
   - `App.js`
   - `package-snack.json` (rename to `package.json`)
   - `app.json.snack` (rename to `app.json`)
   - All files in the `components/` folder

### Option 2: GitHub Import
1. Create a new repository with just the Snack-compatible files
2. Go to https://snack.expo.dev
3. Click "Import" → "Import from GitHub"
4. Enter the repository URL

## 📁 Required Files for Snack

```
/
├── App.js                          # Main entry point
├── package.json                    # Use package-snack.json
├── app.json                        # Use app.json.snack
└── components/
    ├── CameraScreen.js             # Camera and capture
    ├── EditScreen.js               # Image editing with crop/rotate
    └── DocumentsScreen.js          # Document list
```

## ⚙️ Key Features

- ✅ Camera with document detection frame
- ✅ Image capture
- ✅ Crop with draggable handles
- ✅ 90° rotation
- ✅ Multi-page document support
- ✅ Document list view
- ✅ Simple navigation (no Expo Router needed)

## 🔧 Differences from Full Version

**Removed for Snack compatibility:**
- TypeScript (converted to JavaScript)
- Expo Router (using simple state-based navigation)
- Complex folder structure (flattened to simple structure)
- Zustand state management (using local React state)
- Debug console
- Brightness/contrast sliders
- Advanced features

**Simplified:**
- All code in JavaScript (.js files)
- Flat component structure
- Dependencies compatible with Snack
- No build configuration needed

## 🎯 Testing in Snack

1. **Camera Permission**: The app will request camera permission on first launch
2. **Take Photo**: Tap the white circular button to capture
3. **Edit**: Drag the blue corner handles to crop, tap rotate button
4. **Save**: Tap "Save" to apply edits
5. **View Docs**: Tap "Documents" button to see saved documents

## 📱 Running on Device

For best results, use the Expo Go app on a physical device:
1. Install Expo Go from App Store/Play Store
2. Scan the QR code from Snack
3. Grant camera permissions when prompted

## ⚠️ Known Limitations in Snack

- Camera only works on physical devices (not in web preview)
- Some image manipulation features may be slower
- File storage is temporary (clears on app restart)
- Limited to Snack's dependency versions

## 🔄 Migrating Back to Full Version

To get the full-featured version with TypeScript, Expo Router, and all features:
```bash
git clone https://github.com/rod-andara/zenscan-app
cd zenscan-app
npm install
npm start
```

## 📦 Dependencies

- expo: ~52.0.0
- expo-camera: ~16.0.0
- expo-image-manipulator: ~13.0.0
- react-native: 0.76.5

All dependencies are Snack-compatible and will be auto-installed.
