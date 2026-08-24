import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { bootstrapGoogleH5Ads } from "./integrations/ads/googleH5Ads";
import "./styles/index.css";

import { SettingsProvider } from "./app/lib/SettingsContext";

void bootstrapGoogleH5Ads();
createRoot(document.getElementById("root")!).render(
  <SettingsProvider>
    <App />
  </SettingsProvider>
);
