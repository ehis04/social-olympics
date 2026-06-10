module.exports = {
  extends: [
    require.resolve('./index.js'),
    'next/core-web-vitals'
  ],
  rules: {
    '@next/next/no-html-link-for-pages': 'error'
  }
};
