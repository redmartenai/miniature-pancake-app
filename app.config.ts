import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One codebase, two store apps:
 *   - EduFlow (default): parents, students, teachers and staff. No location permissions at all.
 *   - EduFlow Driver (APP_VARIANT=driver): bus crew. Shares the bus location during trips using a
 *     user-started foreground service, so it never needs Android background-location permission.
 * Both apps serve every school; each school's branding loads after sign-in (white-label).
 */
const variant = process.env.APP_VARIANT === 'driver' ? 'driver' : 'main';
const isDriver = variant === 'driver';

const LOCATION_PERMISSIONS = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
];

// Google Maps keys for native maps (Android needs one for release builds; iOS uses Apple Maps without one).
const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDriver ? 'EduFlow Driver' : 'EduFlow',
  slug: isDriver ? 'eduflow-driver' : 'eduflow',
  scheme: isDriver ? 'eduflow-driver' : 'eduflow',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: isDriver ? 'app.eduflow.driver' : 'app.eduflow',
    supportsTablet: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: isDriver ? 'app.eduflow.driver' : 'app.eduflow',
    adaptiveIcon: {
      backgroundColor: '#2E5D4E',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    blockedPermissions: isDriver ? ['android.permission.ACCESS_BACKGROUND_LOCATION'] : LOCATION_PERMISSIONS,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
    name: 'EduFlow',
    shortName: 'EduFlow',
    themeColor: '#2E5D4E',
    backgroundColor: '#F8F5EF',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F8F5EF',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
        dark: { backgroundColor: '#161310', image: './assets/images/splash-icon-dark.png' },
      },
    ],
    'expo-secure-store',
    'expo-localization',
    'expo-font',
    ['expo-notifications', { color: '#2E5D4E' }],
    ['react-native-maps', { androidGoogleMapsApiKey, iosGoogleMapsApiKey }],
    isDriver
      ? [
          'expo-location',
          {
            locationWhenInUsePermission:
              'EduFlow Driver shares the bus location with families only while a trip is running.',
            isAndroidForegroundServiceEnabled: true,
            isAndroidBackgroundLocationEnabled: false,
            isIosBackgroundLocationEnabled: true,
          },
        ]
      : [
          'expo-image-picker',
          {
            photosPermission: 'Choose photos of homework to send to the teacher.',
            cameraPermission: 'Take photos of homework to send to the teacher.',
          },
        ],
  ],
  extra: {
    variant,
    ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
  },
  experiments: { typedRoutes: false, reactCompiler: true },
});
