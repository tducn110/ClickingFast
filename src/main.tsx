
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

import { SettingsProvider } from "./app/lib/SettingsContext";
import { AuthProvider } from "./app/lib/AuthContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </AuthProvider>
);