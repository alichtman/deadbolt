/**
 * Webpack config for CLI build
 */

import path from 'path';
import webpack from 'webpack';
import { merge } from 'webpack-merge';
import TerserPlugin from 'terser-webpack-plugin';
import baseConfig from './webpack.config.base';
import webpackPaths from './webpack.paths';
import { version } from '../../package.json';

const configuration: webpack.Configuration = {
  devtool: 'source-map',

  mode: 'production',

  target: 'node',

  entry: path.join(webpackPaths.srcPath, 'cli/index.ts'),

  output: {
    path: path.join(webpackPaths.rootPath, 'dist'),
    filename: 'deadbolt-cli.js',
  },

  resolve: {
    modules: [
      'node_modules',
      path.join(webpackPaths.rootPath, 'release/app/node_modules'),
    ],
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
      }),
    ],
  },

  plugins: [
    new webpack.BannerPlugin({
      banner: `#!/usr/bin/env node
// Add release/app/node_modules to module search paths for native dependencies
const fs = require('fs');
const path = require('path');

const candidateModuleDirs = [
  path.join(__dirname, '../release/app/node_modules'),
  path.join(process.cwd(), 'release/app/node_modules'),
];

for (const dir of candidateModuleDirs) {
  if (fs.existsSync(dir) && !module.paths.includes(dir)) {
    module.paths.push(dir);
  }
}
`,
      raw: true,
    }),

    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
    }),

    new webpack.DefinePlugin({
      __APP_VERSION__: JSON.stringify(version),
    }),
  ],

  externals: {
    '@node-rs/argon2': 'commonjs @node-rs/argon2',
  },

  /**
   * Disables webpack processing of __dirname and __filename.
   * If you run the bundle in node.js it falls back to these values of node.js.
   * https://github.com/webpack/webpack/issues/2010
   */
  node: {
    __dirname: false,
    __filename: false,
  },
};

export default merge(baseConfig, configuration);
