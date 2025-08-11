module.exports = {
  webpack: {
    alias: {
      'roughjs/bin/rough': require.resolve('roughjs/bin/rough.js'),
      'roughjs/bin/generator': require.resolve('roughjs/bin/generator.js'),
      'roughjs/bin/math': require.resolve('roughjs/bin/math.js'),
    },
  },
};
