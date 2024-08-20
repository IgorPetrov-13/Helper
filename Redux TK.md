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

export type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
```

## 3. Создаем кастомные хуки
```
client/src/app/providers/store/store.ts

// Хук селектора для вытаскивания данных из store
export const useAppSelector = useSelector.withTypes<RootState>();

// Хук диспатча что бы положить данные в store
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

roadSlice возвращает объект, который так же содержащий следующие свойства:

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
## 7. Добавляем в extraReducer

```
client/src/entities/road/model/roadSlice.ts

extraReducers: (builder) => {
      builder.addCase(loadAllRoads.fulfilled, (state, action) => {
      state.roads = action.payload.roads;
    });
    builder.addCase(addRoad.fulfilled, (state, action) => {
      state.roads = [...state.roads, action.payload.newRoad];
    });
    builder.addCase(deleteRoad.fulfilled, (state, action) => {
      state.roads = state.roads.filter((el) => el.id !== action.meta.arg)
      return state
    });
    builder.addCase(updateRoad.fulfilled, (state, action) => {
      state.roads = state.roads.map((road) =>
        road.id === action.payload.updatedRoad.id ? action.payload.updatedRoad : road,
      );
    });
  }
```
## 8. Добавляем наш слайс в store

```
client/src/app/providers/store/store.ts

export const store = configureStore({
  reducer: {
    roads: roadSlice.reducer
  },
});
```

## 9. Используем кастомный хук useAppDispatch для загрузки данных с сервера

```

function App(): JSX.Element {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(loadAllRoads());
  }, []);

  return (
    <Provider store={store}>
      <Navbar user={user} />
      <AppRoutes user={user} setUser={setUser} />
    </Provider>
  );
}

export default App;
```

## 10. Используем кастомный хук useAppSelector для извлечения данных из хранилища

Получаем массив roads для дальнейшего использования в компонентах

```
const roads = useAppSelector((store) => store.roads.roads);
```







