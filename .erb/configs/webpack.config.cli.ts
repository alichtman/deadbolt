/**
 * Webpack config for CLI build
 */

import path from 'path';
import webpack from 'webpack';
import { merge } from 'webpack-merge';
import TerserPlugin from 'terser-webpack-plugin';
import baseConfig from './webpack.config.base';
import webpackPaths from './webpack.paths';

const configuration: webpack.Configuration = {
  devtool: 'source-map',

  mode: 'production',

  target: 'node',

  entry: path.join(webpackPaths.srcPath, 'cli/index.ts'),

  output: {
    path: path.join(webpackPaths.rootPath, 'dist'),
    filename: 'deadbolt-cli.js',
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
      banner: '#!/usr/bin/env node',
      raw: true,
    }),

    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
    }),
  ],

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
