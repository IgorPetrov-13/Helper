## Для инициализациии проекта React + TS используем инструкцию 

https://github.com/Elbrus-Bootcamp/vite-react-ts


Коротко:
npx degit Elbrus-Bootcamp/vite-react-ts my-app   - в папке my-app

npx degit Elbrus-Bootcamp/vite-react-ts .   - в текущей папке

cd my-app

npm i



## Не забываем менять конфиг VITE


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000/',
        changeOrigin: true,
      },
    },
  },
 
})
