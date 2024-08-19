## 0. Не забываем устанавливать

```npm i redux react-redux @reduxjs/toolkit```

## 1. Создаем store используя функцию configureStore из '@reduxjs/toolkit'

```
client/src/app/providers/store/store.ts

  export const store = configureStore({
    reducer: {},
  });
```

## 2. Типизируем кастомные хуки useAppSelector и useAppDispatch

```
client/src/app/providers/store/store.ts

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
```

## 3. Создаем кастомные хуки
```
client/src/app/providers/store/store.ts

export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
```
## 4. Используем обертку Provider из react-redux для передачи store
```
App.tsx

<Provider store={store}>
      <Navbar  />
      <AppRoutes  />
</Provider>
```
## 5. Создаем слайсы в entities

используем функцию ```createSlice``` из ```"@reduxjs/toolkit"```
```
client/src/entities/road/model/roadSlice.ts

import { createSlice } from '@reduxjs/toolkit';
import type { TypeRoads } from '../types/roadTypes';

export type TypeInitialState = {
  roads: TypeRoads;
};

export const initialState: TypeInitialState = {
  roads: [],
};

console.log("createSlice из слайса", createSlice);


const roadSlice = createSlice({
  name: 'road',
  initialState,
  // синхронный редьюсер
  reducers: {
      
  },
  // асинхронный редьюсер
  extraReducers(builder) {
      
  },
});

export default roadSlice.reducer;


```

#### Что возвращает roadSlice
*что бы понять, почему мы используем roadSlice.reducer

roadSlice возвращает объект, содержащий следующие свойства:

```
reducer: Это функция редьюсера, которая обрабатывает изменения состояния. Она отвечает за обновление состояния в Redux хранилище на основе действий.

actions: Это объект, содержащий действия, сгенерированные на основе редьюсеров, определённых в reducers. Даже если у вас нет синхронных редьюсеров, будет создан пустой объект действий.
```


#### Подробнее
Когда вы экспортируете roadSlice.reducer, вы получаете доступ к функции редьюсера, которую можно использовать в вашем корневом редьюсере. 
Таким образом, roadSlice предоставляет всё необходимое для управления состоянием, а roadSlice.reducer — это конкретная функция, которая отвечает за обновление этого состояния.



## 6. Создаем Thunk (санки)

```
client/src/entities/road/model/roadSlice.ts

export const loadAllRoads = createAsyncThunk ('load/allRoads',  () => RoadApi.getAllRoads())
````










