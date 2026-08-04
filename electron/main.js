const { app, BrowserWindow } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Pelú',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // Straight to the Spanish entry, not `out/index.html`. That root file is now
    // a locale-picking redirect stub, and its client-side `replace('/es')` does
    // not resolve over `file://` — it would leave the window blank.
    // `trailingSlash` is off, so the export writes `es.html`, not `es/index.html`.
    mainWindow.loadFile(path.join(__dirname, '../out/es.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
