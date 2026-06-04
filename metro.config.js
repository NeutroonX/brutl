const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// expo-media-library's package.json exports field points to TypeScript source
// which Metro can't compile. Redirect it to the pre-built JS output only.
const _resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-media-library') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/expo-media-library/build/index.js'),
      type: 'sourceFile',
    };
  }
  if (_resolveRequest) return _resolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
