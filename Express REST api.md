# Создание REST api Express

### 1. Установка express и пакетов

Ставим все необходимое

```
npm i bcrypt // хэширование паролей
npm i express // сам express
npm i cookie-parser // middleware для получения cookie
npm i pg // поддрежка postgres
npm i pg-hstore // поддрежка postgres
npm i sequelize
npm i jsonwebtoken // для работы с jwt токена (авторизация/регистрация)
npm i dotenv // для использование env


Девдепенденсисы:

npm i sequelize-cli -D
npm i nodemon -D // перезапуск сервера после изменений
npm i morgan -D // логирование запросов


```

### 2. Создаем базу данных, миграции, сиды (если не ставили)

### 3. Создаем файл, в котором будем стартовать наше express приложение

Пример  базового  шаблона приложения тут - https://expressjs.com/ru/starter/hello-world.html

```js
// ./app.js
require("dotenv").config();
const express = require("express");
const app = express(); // Создаем экземпляр приложения
const PORT = process.env.PORT ?? 3000;
const serverConfig = require("./config/serverConfig");

// Импортируем роуты из отдельных файлов
const apiRoute = require("./routes/api.routes");

// Конфигурация
serverConfig(app);

// Маршрутизация
app.use("/api", apiRoute);


// Прослушивания порта
app.listen(PORT, () => console.log(`Server started at ${PORT} port`));

```

Запускаем приложение командой `node app.js`

Можно сразу добавить строчку в `package.json` для запуска с `nodemon`

```json
 "scripts": {
    "dev": "nodemon app.js",
    "dbr": "npx sequelize db:drop && npx sequelize db:create && npx sequelize db:migrate && npx sequelize db:seed:all"
    ///......
  },
```

Тогда запускаем проект командой `npm run dev`

Переходим в браузере по адресу `localhost:3000/` или используем thunder/postman для проверки работы.

### 4. Добавляем необходимые конфигурации в `app.js`

Подробнее про middleware - https://expressjs.com/ru/guide/using-middleware.html

```

//server/config/serverConfig.js

const express = require("express");
const removeHTTPHeader = require("../middleware/removeHTTPHeader");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const serverConfig = (app) => {
  app.use(express.urlencoded({ extended: true })); // для чтения из POST запросов req.body
  app.use(express.json()); // для чтения json из body
  app.use(express.static(path.join(__dirname, "public"))); // чтение папки static
  app.use(removeHTTPHeader); //удаление заголовка
  app.use(cookieParser()); // чтение кук
  app.use(morgan("dev")); // Логирование запросов на сервере
};

module.exports = serverConfig;

```

### 5. Выстраиваем архитектуру проекта

Создаем примерно следующую структуру.

```
app/
----/db  - все файлы для базы данных
----/public - статичные файлы (картинки, стили)
--------/css
--------/img
--------/js
----/routes
--------/api - папка для хранения роутов API
------------/auth.routes.js
------------/categories.routes.js
------------/todos.routes.js
--------index.api.routes.js - "входной файл", что бы удобно собрать
----app.js
```

### 6. Роутинг

Дока - https://expressjs.com/ru/guide/routing.html (искать "express.Router")

Информация (API) о методах .Router() - https://expressjs.com/ru/4x/api.html#router

Создаем главный роут в файле `./app/routes/index.api.routes.js`

```js
// ./routes/index.api.routes.js

const apiRoute = require("express").Router();
const roadsRoute = require("./api/roads.routes.js")
const userRoute = require("./api/user.routes.js")


apiRoute.use("/roads", roadsRoute);
apiRoute.use("/user", userRoute);

module.exports = apiRoute;

```

Импортируем его в наше приложение `app.js` **строго после всех middleware**!

```js
// ./app.js

// тут middleware
// ......

app.use("/api", indexRoute);
```

Создаем наши endpoint's, к примеру файл `./app/routes/apitodos.routes.js`

Подробнее про объект запросов и ответов сервера тут https://expressjs.com/ru/guide/routing.html

А здесь доступные методы (API) - https://expressjs.com/ru/4x/api.html#req и https://expressjs.com/ru/4x/api.html#res

```js
//server/routes/api/roads.routes.js
const roadsRoute = require('express').Router();
const { Road } = require('../../db/models');
const verifyAccessToken = require('../../middleware/verifyAccessToken');

roadsRoute.get('/', async (req, res) => {
  try {
    const roads = await Road.findAll({ order: [['id', 'ASC']] });
    res.status(200).json({ message: 'success', roads });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

roadsRoute.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const road = await Road.findOne({ where: { id } });
    res.status(200).json({ message: 'success', road });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

roadsRoute.post('/', verifyAccessToken, async (req, res) => {
  const { title, description, mapLink, length, city, userId } = req.body;
  try {
    if (title && description && mapLink && length && city && userId) {
      const newRoad = Road.create({
        title,
        description,
        city,
        length,
        mapLink,
        userId,
      });
      res.status(201).json({ message: 'success', newRoad });
    } else {
      res.status(400).json({ message: 'write correct information' });
    }
  } catch (error) {
    res.status(500).json(error.message);
  }
});

roadsRoute.delete('/:roadId', verifyAccessToken, async (req, res) => {
  const { roadId } = req.params;
  try {
    const deletedRoad = Road.destroy({ where: { id: roadId } });
    if (deletedRoad === 0) {
      return res.status(404).json({ message: 'Road not found' });
    } else {
      res.status(200).json({ message: 'success' });
    }
  } catch (error) {
    res.status(500).json(error.message);
  }
});

roadsRoute.put('/:roadId', verifyAccessToken, async (req, res) => {
  const { roadId } = req.params;
  try {
    const road = await Road.findOne({ where: { id: roadId } });
    if (!road) {
      return res.status(404).json({ message: 'Road not found' });
    } else {
      const updateRoad = await Road.update(req.body, { where: { id: roadId } });
      res.status(200).json({ message: 'success', updateRoad });
    }
  } catch (error) {
    res.status(500).json(error.message);
  }
});

module.exports = roadsRoute;

```

Тогда полный адрес для запросов будет вида localhost:3000/api/roads

Далее - ЛОГА-РЕГА:
https://github.com/IgorPetrov-13/Helper/blob/main/%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%B8%20%D0%B8%D0%B4%D0%B5%D0%BD%D1%82%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%86%D0%B8%D1%8F.md





СПРАВОЧНАЯ ИНФОРМАЦИЯ:




### 6. Статика

Документация (API) - https://expressjs.com/ru/4x/api.html#express.static

Добавляем папку "public" а качестве статики в app.js


```js
// ./app.js

//......
 
app.use(express.json()); // для чтения json из body
//........
app.use(express.static(path.join(__dirname, 'public')));
//...........
```

app.use(express.static(path.join(__dirname, 'public'))) указывает Express обслуживать все файлы из директории public. Любой запрос к серверу за файлами в этой директории будет обслужен непосредственно.

Теперь, когда вы запускаете сервер и открываете http://localhost:3000 в браузере, Express будет обслуживать статические файлы из директории public. Например, CSS-файл будет доступен по адресу http://localhost:3000/css/styles.css.


### 7. Методы HTTP запросов:

#### Основные
[`GET`](https://developer.mozilla.org/ru/docs/Web/HTTP/Methods/GET) Метод `GET` запрашивает представление ресурса. Запросы с использованием этого метода могут только извлекать данные.

[`POST`](https://developer.mozilla.org/ru/docs/Web/HTTP/Methods/POST) `POST` используется для отправки сущностей к определённому ресурсу. Часто вызывает изменение состояния или какие-то побочные эффекты на сервере.

[`PUT`](https://developer.mozilla.org/ru/docs/Web/HTTP/Methods/PUT) `PUT` заменяет все текущие представления ресурса данными запроса.

[`DELETE`](https://developer.mozilla.org/ru/docs/Web/HTTP/Methods/DELETE) `DELETE` удаляет указанный ресурс.

####  Неосновные
[`HEAD`](https://developer.mozilla.org/ru/docs/Web/HTTP/Methods/HEAD) `HEAD` запрашивает ресурс так же, как и метод GET, но без тела ответа.

[`CONNECT`](https://developer.mozilla.org/ru/docs/Web/HTTP/Methods/CONNECT) `CONNECT` устанавливает "туннель" к серверу, определённому по ресурсу.

[`OPTIONS`](https://developer.mozilla.org/ru/docs/Web/HTTP/Methods/OPTIONS) `OPTIONS` используется для описания параметров соединения с ресурсом.

[`TRACE`](https://developer.mozilla.org/ru/docs/Web/HTTP/Methods/TRACE) `TRACE` выполняет вызов возвращаемого тестового сообщения с ресурса.

[`PATCH`](https://developer.mozilla.org/ru/docs/Web/HTTP/Methods/PATCH) `PATCH` используется для частичного изменения ресурса.

### 8. Ответы сервера: https://developer.mozilla.org/ru/docs/Web/HTTP/Status
