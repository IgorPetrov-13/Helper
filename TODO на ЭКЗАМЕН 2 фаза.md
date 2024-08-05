# CОЗДАНИЕ ПРОЕКТА С НУЛЯ


### 1 Создаем в проекте папку server
### 2 Инициализируем проект 
```npm init -y```

### 3 Создаем gitignore
```npx gitignore node```

### 4 Устанавливаем sequelize
```npm i sequelize pg pg-hstore
npm i sequelize-cli -D```

### 5 создаём файл .sequelizerc, копируем в него следующее:
```
    const path = require('path');
	 
    module.exports = {
        'config': path.resolve('db', 'config', 'database.json'),
        'models-path': path.resolve('db', 'models'),
        'seeders-path': path.resolve('db', 'seeders'),
        'migrations-path': path.resolve('db', 'migrations'),
    };
```

проинициализируем 
```npx sequelize init```

если делаем удаленную ДБ
https://github.com/IgorPetrov-13/Helper/blob/main/DB%20Remoute.md

###6 Настраиваем окружение, если это не удаленная БД

```
{
  "development": {
    "username": "petrov_igor_rf",
    "password": "123",
    "database": "Iproject",
    "host": "127.0.0.1",
    "dialect": "postgres"
  },
```
создаем базу данных 
```npx sequelize db:create```

### 7 Создаем модели и миграции (модель в единственном числе)
```
npx sequelize-cli model:generate --name User --attributes login:string,email:string,password:string
npx sequelize-cli model:generate --name Car --attributes model:string,description:string,userId:integer
```
### 8 Для удобства прописываем быстрые команды в package.json
```
"scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "nodemon app.js",
    "dbr": "npx sequelize db:drop && npx sequelize db:create && npx sequelize db:migrate && npx sequelize db:seed:all",
    "dbc": "npx sequelize db:create",
    "dbm": "npx sequelize db:migrate:undo:all && npx sequelize db:migrate",
    "dbs": "npx sequelize db:seed:all"
  },
```

### 9 СВЯЗИ: Работаем с моделями

машины связаны с пользователями так: this.belongsTo(models.User, { foreignKey: 'userId' });
пользователи связаны с машинами так: this.hasMany(models.Car, { foreignKey: 'userId' });

### 10 Работаем с сидами

создаем каркас сида пользователей (npx sequelize-cli seed:generate --name UsersSeed)
 создаем каркас сида машин (npx sequelize-cli seed:generate --name CarsSeed)

заполняем данными - см файлы в папке seeders
накатываем сиды (npx sequelize db:seed:all) - накатит все сиды

накатить отдельный сид (если нужно) (npx sequelize db:seed --seed 20240304182116-StudentsSeed.js)

Выносим сиды в скрипт ("seed": "npx sequelize db:seed:all")

## Создание REST api Express

https://github.com/IgorPetrov-13/Helper/blob/main/Express%20REST%20api.md
