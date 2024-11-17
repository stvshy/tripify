const { getDefaultConfig } = require('@expo/metro-config');

module.exports = async () => {
  const config = await getDefaultConfig(__dirname);

  config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };

  config.resolver = {
    ...config.resolver,
    assetExts: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ttf'],
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'svg'],
  };

  return config;
};
