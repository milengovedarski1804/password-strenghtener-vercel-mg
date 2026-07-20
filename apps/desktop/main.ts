import { app, BrowserWindow } from "electron";
import path from "node:path";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 900,
    height: 800,
    minWidth: 480,
    minHeight: 600,
    title: "Explainable Password Strength Checker",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Зарежда build-натата статична web версия, копирана локално в
  // web-dist/ (виж scripts/copy-web-dist.js), за да може electron-builder
  // да я включи в пакетирания .exe. HIBP частта просто ще фейлва грациозно
  // офлайн — останалата логика работи изцяло локално в рендерера.
  win.loadFile(path.join(__dirname, "..", "web-dist", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
