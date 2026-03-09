/**
 * Global type declarations for React Native / Expo environment
 * Fixes: "Cannot find name 'process'" TypeScript error
 * Fixes: "Cannot find name 'Buffer'" TypeScript error
 */

declare const process: {
  env: {
    EXPO_PUBLIC_BACKEND_URL?: string;
    EXPO_PUBLIC_APP_SECRET?: string;
    NODE_ENV: 'development' | 'production' | 'test';
    [key: string]: string | undefined;
  };
};
