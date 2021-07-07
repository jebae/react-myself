import { renderDOM, createElement } from "./lib/fiber.js";
import App from "./App.js";

renderDOM(createElement(App, {}), document.getElementById("root"));