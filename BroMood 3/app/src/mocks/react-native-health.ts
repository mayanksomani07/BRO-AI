/**
 * Mock for react-native-health
 * HealthKit only works on physical iPhone with a full native build.
 * For Expo Go testing, this mock returns empty data silently.
 */

export const AppleHealthKit = {
  initHealthKit: (_permissions: unknown, callback: (err: null, result: boolean) => void) => {
    callback(null, false); // HealthKit not available in Expo Go
  },
  getSleepSamples: (_options: unknown, callback: (err: string | null, results: unknown[]) => void) => {
    callback(null, []); // Return empty — mood engine will use neutral score
  },
};

export default AppleHealthKit;
