import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { requestNotificationPermission } from "./lib/useNotifications";

if (!window.location.hash) {
  window.location.hash = "#/";
}

requestNotificationPermission();

createRoot(document.getElementById("root")!).render(<App />);
