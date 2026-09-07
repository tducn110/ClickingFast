import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

import { SettingsProvider } from "./app/lib/SettingsContext";
import i18n from "./i18n";

const updateDocumentTitle = (language: string) => {
  document.title = language === "en" ? "Peanut Tribe — Mini Game" : "Bộ Lạc Đậu Phộng — Mini Game";
};

updateDocumentTitle(i18n.resolvedLanguage ?? "en");
i18n.on("languageChanged", updateDocumentTitle);

createRoot(document.getElementById("root")!).render(
  <SettingsProvider>
    <App />
  </SettingsProvider>
);
