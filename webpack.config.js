// webpack.config.js
const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    entry: options.entry,
    externals: [nodeExternals({
      allowlist: [/^file-type/],
    })],
    resolve: {
      ...options.resolve,
      // 중요: .js 확장자로 호출하더라도 .ts 파일을 먼저 찾도록 매핑
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
  };
};