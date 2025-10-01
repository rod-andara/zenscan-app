# ZenScan Build 16 - Frame Processors Disabled

## ✅ Successfully Submitted to TestFlight

### **Build Information**
- **Build Number**: 16
- **Version**: 1.0.8
- **Bundle ID**: com.zenscan.app
- **App Store Connect ID**: 6753142099
- **Build Date**: October 1, 2025, 12:56:52
- **Submission ID**: 9cdaa23c-0b3f-482e-8dbd-7a9ba7119e0c

### **Build URLs**
- **Build Details**: https://expo.dev/accounts/rod_andara/projects/zenscan/builds/db6e608e-7b46-4163-b61f-84f02e670639
- **IPA Download**: https://expo.dev/artifacts/eas/t6zWmwSejcxQEjsXosPJdz.ipa
- **Submission**: https://expo.dev/accounts/rod_andara/projects/zenscan/submissions/9cdaa23c-0b3f-482e-8dbd-7a9ba7119e0c
- **App Store Connect**: https://appstoreconnect.apple.com/apps/6753142099/testflight/ios

---

## 🚨 Critical Issue Fixed: Frame Processor Production Crash

### **Build 15 Issue (SIGABRT on Thread 7 & 12)**
```
Exception Type:  EXC_CRASH (SIGABRT)
Terminating Process: ZenScan [97770]
Triggered by Thread: 7

Thread 7 Crashed:
libdispatch.dylib _dispatch_client_callout
React 0x104200000 + 3192136

Thread 12:
RNWorklet::DispatchQueue::dispatch_thread_handler()
```

### **Root Cause**
**Frame processors do not work reliably in iOS production builds.**

While frame processors work perfectly in development (Xcode, Expo Go, development builds), they consistently crash in TestFlight and App Store production builds with:

1. **SIGABRT in React dispatch queues** (Thread 7)
2. **RNWorklet::DispatchQueue failures** (Thread 12)
3. **Swift runtime errors** in production optimization
4. **libdispatch.dylib crashes**

This is a known issue documented in Vision Camera GitHub issues:
- Issue #2047: iOS App Crash while using Frame Processor in production
- Issue #635: TestFlight build crashing on starting camera
- Common pattern: Works in dev, crashes in TestFlight/production

---

## 🔧 The Fix

### **1. Disabled Frame Processors at Build Level**

**app.json:**
```json
{
  "plugins": [
    [
      "react-native-vision-camera",
      {
        "enableFrameProcessors": false  // ← Added this
      }
    ]
  ]
}
```

This sets `$VCEnableFrameProcessors = false` in the iOS Podfile, preventing frame processor code from being compiled into the binary.

### **2. Replaced Camera Component**

**Removed (camera-with-frameprocessor.tsx - backed up):**
- `useFrameProcessor` hook
- Real-time document detection worklet
- `DocumentDetectionOverlay` component
- Reanimated shared values
- Auto-capture logic
- Haptic feedback on detection
- Animated polygon overlay
- Stability detection

**New Simplified Component (camera.tsx):**
```tsx
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
// NO useFrameProcessor import
// NO Reanimated imports
// NO worklet code

<Camera
  ref={cameraRef}
  device={device}
  isActive={true}
  photo={true}
  enableZoomGesture={true}
  enableLocation={false}
  // NO frameProcessor prop
/>
```

### **3. What Still Works**

✅ **Core Camera Functionality:**
- Vision Camera photo capture
- Flash modes: off → auto → on with indicators
- Camera flip (front/back)
- Scan mode selection (Document, Receipt, Card, Board, Photo)
- Permission handling with system settings link
- Photo capture and navigation to edit screen

---

## ❌ Features Temporarily Removed

These features relied on frame processors and are removed in Build 16:

1. **Real-time document detection** - Can't detect edges in real-time
2. **Animated polygon overlay** - No detection means no overlay
3. **Auto-capture toggle** - Can't detect stability without frame processor
4. **Haptic feedback on detection** - No detection to trigger feedback
5. **Status text updates** - "Position document" vs "✓ Document ready"

---

## 🔮 Next Steps: Post-Capture Detection

Once Build 16 confirms the crash is fixed, implement document detection AFTER photo capture instead of real-time:

### **Phase 3: Post-Capture Document Detection**

**1. Capture photo normally** (already working ✅)

**2. Process in edit screen:**
```tsx
// In edit screen, after photo is loaded
useEffect(() => {
  async function detectEdges() {
    // Use native Vision framework (iOS) or OpenCV (Android)
    const edges = await detectDocumentEdges(photoUri);
    setDetectedCorners(edges);
  }
  detectEdges();
}, [photoUri]);
```

**3. Show detected corners:**
- Display crop handles at detected corners
- User can adjust if needed
- Apply perspective correction
- Continue to rest of edit flow

**Benefits:**
- ✅ No frame processors needed
- ✅ Works in production builds
- ✅ More accurate detection (can use slower algorithms)
- ✅ User can verify/adjust before saving

**Drawbacks:**
- ❌ No real-time feedback
- ❌ Must capture first, then crop
- ❌ Extra step for user

---

## 📊 Build Comparison

| Feature | Build 15 | Build 16 |
|---------|----------|----------|
| **Frame Processors** | ✅ Enabled | ❌ Disabled |
| **Real-time Detection** | ✅ Yes | ❌ No |
| **Animated Overlay** | ✅ Yes | ❌ No |
| **Auto-capture** | ✅ Yes | ❌ No |
| **Basic Camera** | ✅ Yes | ✅ Yes |
| **Photo Capture** | ✅ Yes | ✅ Yes |
| **Flash Control** | ✅ Yes | ✅ Yes |
| **TestFlight Crash** | ❌ CRASHES | ✅ **Should Work** |

---

## 🧪 Testing Instructions

### **Critical Test: App Launch**
- [ ] App installs from TestFlight
- [ ] App launches without crash
- [ ] Camera screen loads
- [ ] **No SIGABRT crashes**
- [ ] App runs for 2+ minutes without crash

### **Camera Functionality**
- [ ] Camera preview displays
- [ ] Flash toggle works (off → auto → on)
- [ ] Camera flip works (back → front)
- [ ] Scan mode selector works
- [ ] Capture button works
- [ ] Photo captures successfully
- [ ] Navigates to edit screen

### **What You WON'T See (Expected)**
- ❌ No real-time polygon overlay
- ❌ No auto-capture toggle
- ❌ No "Document ready" status
- ❌ No haptic feedback
- ⚠️ Static hint text: "Position document in view and tap capture"

### **Success Criteria**
✅ App launches without crash
✅ Camera works for continuous use (5+ minutes)
✅ Can capture multiple photos
✅ Edit screen works
✅ No crashes in crash logs

---

## 📝 Technical Changes

### **Files Modified**

**app.json:**
```diff
  "plugins": [
    [
      "react-native-vision-camera",
      {
        "cameraPermissionText": "ZenScan needs camera access...",
        "enableCodeScanner": false,
        "enableMicrophonePermission": false,
        "enableLocation": false,
+       "enableFrameProcessors": false
      }
    ]
  ]
```

**src/app/(tabs)/camera.tsx:**
- Completely replaced with simplified version
- Removed all frame processor code
- Removed all Reanimated code
- Removed DocumentDetectionOverlay import
- Removed worklet functions
- Kept all basic camera controls

**src/app/(tabs)/camera-with-frameprocessor.tsx:**
- Created backup of frame processor version
- Can be restored later if needed
- Contains all real-time detection code

### **Dependencies (No Changes)**
All dependencies remain the same:
- react-native-vision-camera@4.7.2
- react-native-reanimated@4.1.2
- react-native-worklets@0.5.1
- react-native-worklets-core@1.6.2

**Why?** These packages are still used by other parts of the app (edit screen uses Reanimated for animations). We just disabled frame processors specifically.

---

## 🎯 Expected Outcome

**Build 16 should:**
1. ✅ Launch successfully on TestFlight
2. ✅ Camera screen loads without crash
3. ✅ Can capture photos
4. ✅ Basic functionality works
5. ✅ No SIGABRT crashes
6. ✅ Stable for continuous use

**What changes for users:**
- No more real-time detection overlay
- Must manually position document
- Tap capture button manually
- Can still crop in edit screen (manual corners)

**This is a working baseline to build from.**

---

## 📋 Commits

```
314e14c - fix: Disable frame processors to resolve production crashes
```

**Repository**: https://github.com/rod-andara/zenscan-app

---

## 🔄 Migration Path

### **Immediate (Build 16)**
- ✅ Fix crashes by disabling frame processors
- ✅ Get app working in production
- ✅ Maintain core photo capture functionality

### **Short-term (Build 17+)**
- Implement post-capture edge detection
- Use native Vision framework (iOS)
- Use OpenCV or MLKit (Android)
- Show crop handles in edit screen
- User can adjust before saving

### **Long-term (Future)**
If frame processors become stable in production:
- Could re-enable for real-time detection
- Keep post-capture as fallback
- Test thoroughly in TestFlight first

---

## 📚 Research References

### **Vision Camera GitHub Issues**

**Issue #2047: iOS App Crash while using Frame Processor in production**
- Works in Xcode, crashes in TestFlight
- SIGABRT in libdispatch
- Fixed in newer versions (but still unreliable)

**Issue #635: TestFlight build crashing**
- Camera crashes on TestFlight
- Swift runtime failures
- "unexpectedly found nil while implicitly unwrapping"

**Common Pattern:**
- ✅ Development builds: Work perfectly
- ❌ TestFlight/Production: Crash consistently
- Cause: Frame processor optimization issues

### **Solution from Community**
Set `$VCEnableFrameProcessors = false` in Podfile (or via plugin config)

---

## ✅ Summary

**Build 16 disables frame processors to fix production crashes.**

**What was removed:**
- Real-time document detection
- Animated polygon overlay
- Auto-capture
- Haptic feedback

**What still works:**
- Basic camera with Vision Camera
- Photo capture
- Flash controls
- Camera flip
- Scan modes
- Edit screen (manual cropping)

**Next steps:**
1. Wait for Apple processing (~5-10 min)
2. Test on TestFlight - should not crash
3. Implement post-capture detection
4. Release stable version

---

**Submission Date**: October 1, 2025, 12:56:52
**Status**: ✅ Submitted Successfully
**Expected**: Should launch without crashes
**Next Update**: After TestFlight testing confirms fix
