import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App.jsx';

try {
  const html = renderToString(createElement(App));
  console.log("RENDER SUCCESS", html.substring(0, 100));
} catch (e) {
  console.error("RENDER ERROR:", e);
}
