# 🎓 EngCurses 🐒🚑

**EngCurses** — это фронтенд-приложение для изучения английского языка через видеокурсы. Проект ориентирован на минимализм и фокус на обучении: центральное место занимает видеоплеер, а вспомогательные функции (профиль, настройки, авторизация) логично распределены по краям экрана.

<img width="1439" height="569" alt="концепция главной страницы" src="https://github.com/user-attachments/assets/2177b534-614c-4de6-b08e-6acb864a3cf0" />

---

## 🎯 Концепция

Основная идея — сделать обучение сфокусированным и избавленным от лишних отвлекающих факторов.

**Структура главной страницы:**

- **Центр:** Видеоплеер (основной процесс обучения).
- **Слева:** Профиль пользователя и настройки.
- **Справа:** Потоки авторизации и регистрации.
- **Сверху:** Навигационная панель.

---

## 🛠 Стек технологий и инструменты

| Инструмент       | Назначение        | Описание                                               |
| :--------------- | :---------------- | :----------------------------------------------------- |
| **React**        | UI Библиотека     | Создание интерфейса на основе компонентов.             |
| **Tailwind CSS** | Стилизация        | Utility-first подход для быстрой и адаптивной верстки. |
| **React Router** | Роутинг           | Навигация между страницами без перезагрузки.           |
| **Vite**         | Сборщик           | Инструмент для сверхбыстрой разработки и сборки.       |
| **npm**          | Пакетный менеджер | Стандартный менеджер пакетов Node.js.                  |

---

## 🚀 Быстрый старт

### 1. Установка Node.js

Нужен установленный **Node.js** (в комплекте идёт **npm**): https://nodejs.org/

### 2. Установка зависимостей и Tailwind CSS

Клонируйте репозиторий и установите все необходимые пакеты, включая инструменты для стилизации:

```bash
# Клонирование репозитория
git clone [https://github.com/ваш-логин/eng_curses.git](https://github.com/ваш-логин/eng_curses.git)
cd eng_curses

# Установка базовых зависимостей
npm install

# Установка Tailwind CSS, PostCSS и Autoprefixer
npm install -D tailwindcss postcss autoprefixer

# Инициализация конфигурационных файлов Tailwind
npx tailwindcss init -p
```

### 3. Настройка конфигурации

Настройка путей (tailwind.config.js)
Добавьте пути ко всем вашим компонентам в файл конфигурации:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Подключение директив (src/index.css)
Добавьте эти строки в ваш основной CSS файл:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Запуск проЭкта

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5173
📁 Структура проекта

```Plaintext
src/
├── components/      # Общие компоненты (Кнопки, Инпуты, Плеер)
├── pages/           # Страницы (Main, Profile, Auth)
├── router/          # Конфигурация React Router
├── assets/          # Медиафайлы, иконки, изображения
├── index.css        # Глобальные стили (Tailwind)
├── App.jsx          # Корневой компонент
└── main.jsx         # Точка входа
```

### 🧩 Текущий статус и планы

# Помолимся

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

> > > > > > > master
