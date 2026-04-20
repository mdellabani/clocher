const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch all packages
config.watchFolders = [monorepoRoot];

// Resolve modules from both mobile and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// pnpm uses symlinks — Metro needs to follow them
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// pnpm can create multiple symlink paths to the same package; Metro caches
// each distinct path as a separate module. For the React runtime (hooks
// check instance identity), that causes "Invalid hook call" at launch.
// Pin react, react-dom, react-native, and react-native-web to the single
// canonical copy under apps/mobile/node_modules.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-native-web": path.resolve(projectRoot, "node_modules/react-native-web"),
};

module.exports = config;
