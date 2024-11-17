<<<<<<< HEAD
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    // Dodanie dodatkowych opcji, jeśli potrzebujesz
  };
  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
  };

  return config;
})();
=======
const { getDefaultConfig } = require('@expo/metro-config');

module.exports = async () => {
  const config = await getDefaultConfig(__dirname);

  config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };
  
  config.resolver = {
    ...config.resolver,
    assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...config.resolver.sourceExts, 'svg'],
  };

  return config;
};
>>>>>>> 54ebf18823b8da1af0e20c99ca4027a189683d80
