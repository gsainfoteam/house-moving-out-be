// webpack.config.js
const nodeExternals = require('webpack-node-externals');
const fs = require('node:fs');

const modules = fs.readdirSync('./node_modules');
const packages = modules
  .filter((module) => fs.existsSync(`./node_modules/${module}/package.json`))
  .map((module) => {
    return JSON.parse(
      fs.readFileSync(`./node_modules/${module}/package.json`, 'utf8'),
    );
  });
const allowlist = packages
  .filter((packageJson) => packageJson.type === 'module')
  .map((packageJson) => packageJson.name)
  .map((name) => new RegExp(`^${name}`));

module.exports = function (options) {
  return {
    ...options,
    entry: options.entry,
    externals: [nodeExternals({ allowlist })],
    resolve: {
      ...options.resolve,
      // 중요: .js 확장자로 호출하더라도 .ts 파일을 먼저 찾도록 매핑
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
  };
};
