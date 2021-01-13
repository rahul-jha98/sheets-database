module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'google', 'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'require-jsdoc': ['error', {
      'require': {
        'FunctionDeclaration': false,
        'MethodDefinition': false,
        'ClassDeclaration': false,
        'ArrowFunctionExpression': false,
        'FunctionExpression': false,
      },
    }],
    'max-len': ['error', {
      'ignoreComments': true,
      'ignoreStrings': true,
      'code': 120,
    }],
    'valid-jsdoc': ['error', {
      'requireParamType': false,
      'requireReturn': false,
      'requireReturnType': false,
    }],
    'camelcase': ['off'],
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
};
