module.exports = {
  extends: [require.resolve('./index.js')],
  plugins: ['react-native'],
  rules: {
    'react-native/no-unused-styles': 'error',
    'react-native/no-inline-styles': 'warn'
  }
};
