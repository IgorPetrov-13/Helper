## 1. Создаем store используя функцию configureStore из '@reduxjs/toolkit'

```
  export const store = configureStore({
    reducer: {},
  });
```

## 2. Типизируем кастомные хуки useAppSelector и useAppDispatch

```
type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
```

## 3. Создаем кастомные хуки
```
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
```
## 4. Используем обертку Provider из react-redux для передачи store
```
<Provider store={store}>
      <Navbar  />
      <AppRoutes  />
</Provider>
```
