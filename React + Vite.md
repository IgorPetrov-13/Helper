### Создать папку my-app с настроенным dev-окружением:
```npm create vite@latest my-app```
или

### Наполнить текущую папку ./ настроенным dev-окружением: 
```npm create vite@latest . ```

### Эта команда создаст новый React-проект с TypeScript в текущей директории

```npm create vite@latest . --template react-ts```

## Изменить vite.config файл!!!!

```import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

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
```
