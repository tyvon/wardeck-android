const path = require('path');

module.exports = {
  mode: 'production',
  entry: './www/js/main.js',
  output: {
    filename: 'game.bundle.js',
    path: path.resolve(__dirname, 'www/dist'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  // Important: Don't split chunks for Cordova
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  }
};