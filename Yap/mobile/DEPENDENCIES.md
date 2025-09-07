## Required Dependencies

To use the full functionality of the Yap mobile app, please install these required dependencies:

```bash
# Install expo-image-picker for image upload functionality
npx expo install expo-image-picker

# Install react-native-webview for map functionality  
npx expo install react-native-webview

# Install secure-store for authentication
npx expo install expo-secure-store
```

After installing these dependencies, restart your development server:

```bash
npx expo start
```

## Features that require these dependencies:

- **expo-image-picker**: Needed for uploading images in posts and events
- **react-native-webview**: Required for interactive maps in waypoints and event location selection
- **expo-secure-store**: Used for secure authentication token storage

Without these packages, the app will show helpful error messages explaining what needs to be installed.
