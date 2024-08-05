1 Создаем в проекте папку server
2 Инициализируем проект 
npm init -y

3 Создаем gitignore
npx gitignore node

4 Устанавливаем sequelize
npm i sequelize pg pg-hstore
npm i sequelize-cli -D


5 создаём файл .sequelizerc, копируем в него следующее:
```
    const path = require('path');
	 
    module.exports = {
        'config': path.resolve('db', 'config', 'database.json'),
        'models-path': path.resolve('db', 'models'),
        'seeders-path': path.resolve('db', 'seeders'),
        'migrations-path': path.resolve('db', 'migrations'),
    };
```
