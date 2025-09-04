module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './',
            '@assets': './assets',
            '@app': './app',
            '@components': './components',
            '@contexts': './contexts',
            '@hooks': './hooks',
            '@lib': './lib',
            '@constants': './constants',
            '@src': './src'
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};