module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  parserOptions: {
    parser: 'babel-eslint'
  },
  extends: ['plugin:prettier/recommended'],
  // 校验 .vue 文件
  plugins: ['vue']
}
