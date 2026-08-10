import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'よみあと',
    description:
      '後で読みたいページを集め、読んだら一言を残せるローカル保存の読書ログ',
    permissions: ['activeTab'],
    optional_permissions: ['tabs'],
    action: {
      default_title: 'よみあと',
    },
  },
});
