---
title: Personal Assistant Client
emoji: ⚡️
colorFrom: red
colorTo: yellow
sdk: static
pinned: false
app_file: dist/index.html
app_build_command: npm run build
---

# Personal Assistant Client

This is the client interface for the Personal Assistant application.

## Connecting to the Hugging Face Space Server

The client is configured to connect to the Hugging Face Space server by default:

```
https://huggingface.co/spaces/Cripple-Lee/Personal-Assistant-Server
```

### Environment Configuration

The API endpoint can be configured using the `VITE_API_BASE` environment variable. To use a different endpoint:

1. Create a `.env` file in the client directory
2. Add the following line with your desired endpoint:
   ```
   VITE_API_BASE=https://your-custom-endpoint.com
   ```

### Running the Client

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

The client will automatically connect to the Hugging Face Space server.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
