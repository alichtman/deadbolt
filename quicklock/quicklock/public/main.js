const { app, BrowserWindow } = require("electron");

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({ width: 400, height: 600 });

  // win.loadFile("index.html");
  win.loadURL("http://localhost:3000/");
}

app.on("ready", createWindow);
