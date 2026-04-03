const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withNodeEnv(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('NODE_ENV')) {
      config.modResults.contents = config.modResults.contents.replace(
        'project.ext.react = [',
        'project.ext.react = [\n    nodeExecutableAndArgs: ["node", "--max-old-space-size=4096"],\n    extraPackagerArgs: ["--reset-cache"],\n'
      );
      // Add NODE_ENV to the environment for the bundle task
      config.modResults.contents += `
tasks.configureEach { task ->
    if (task.name.contains("createBundle") || task.name.contains("JsAndAssets")) {
        task.environment("NODE_ENV", "production")
    }
}
`;
    }
    return config;
  });
};
