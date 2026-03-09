module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            // Redirect native-only modules to in-memory mocks for Expo Go testing
            'expo-sqlite': './src/mocks/expo-sqlite',
            'react-native-health': './src/mocks/react-native-health',
          },
        },
      ],
      // Must be last
      'react-native-reanimated/plugin',
    ],
  };
};