
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  import { SettingsProvider } from "./app/lib/SettingsContext";

  createRoot(document.getElementById("root")!).render(
    <SettingsProvider>
      <App />
    </SettingsProvider>
  );
  