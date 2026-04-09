const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the entire workspace
config.watchFolders = [monorepoRoot];

// Ensure all packages resolve from the monorepo root node_modules
// This prevents duplicate React instances in the bundle
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force single copies of react and react-native
config.resolver.extraNodeModules = {
  'react': path.resolve(monorepoRoot, 'node_modules/react'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
  'react-dom': path.resolve(monorepoRoot, 'node_modules/react-dom'),
};

module.exports = config;
