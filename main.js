const {app, ipcMain, BrowserWindow, dialog} = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')
const valuesSeedDataPath = path.join(__dirname, "data", "values.txt")
const {seedDB} = require('./js/database-init.js')
const prefModule = require('./js/prefs.js')
const utils = require('./js/utils.js')
const trash = require('trash')
const autoUpdater = require('./auto-updater')
const remoteMain = require('@electron/remote/main')

// Detect dev mode - app.isPackaged is available only after app is ready in some versions
// Fallback to checking if we're in an asar archive
let isDev = true
try {
  isDev = !require.main.filename.includes('app.asar')
} catch (e) {
  isDev = true
}

let welcomeWindow
let loadingStatusWindow
let mainWindow

// Default webPreferences for security
const defaultWebPreferences = {
  nodeIntegration: true,
  contextIsolation: false,
  enableRemoteModule: false
}

function createWelcomeWindow () {
  welcomeWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: defaultWebPreferences
  })
  remoteMain.enable(welcomeWindow.webContents)
  welcomeWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'welcome-window.html'),
    title: "Characterizer",
    protocol: 'file:',
    slashes: true
  }))

  welcomeWindow.on('closed', () => {
    mainWindow = null
  })

  if (!isDev) {
    autoUpdater.init()
  }
}

app.on('ready', () => {
  remoteMain.initialize()
  createWelcomeWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('open-project', (e, arg)=>{
  showMainWindow(arg)
  addToRecentDocs(arg)
})

ipcMain.on('browse-for-project', (e, arg)=> {
  browseForProject()
})

async function browseForProject() {
  const properties = {
    title: "Open Script",
    filters: [
      {
        name: 'Database File',
        extensions: ['sqlite']
      }
    ],
    properties: ['openFile']
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(properties)
  if (!canceled && filePaths.length > 0) {
    showMainWindow(filePaths[0])
    addToRecentDocs(filePaths[0])
  }
}

ipcMain.on('new-project', (e, arg)=> {
  createNewProject()
})

ipcMain.on('log', (event, opt) => {
  !loadingStatusWindow.isDestroyed() && loadingStatusWindow.webContents.send('log', opt)
})

ipcMain.on('workspace-ready', event => {
  mainWindow && mainWindow.show()
  !loadingStatusWindow.isDestroyed() && loadingStatusWindow.hide()
})


async function createNewProject() {
  const properties = {
    title: "New Project",
    buttonLabel: "Create",
  }

  const { canceled, filePath } = await dialog.showSaveDialog(properties)

  if (canceled || !filePath) {
    return
  }

  async function openWindow() {
    fs.mkdirSync(filePath)
    const projectName = path.basename(filePath)
    const dbFileName = path.join(filePath, projectName + '.sqlite')
    showMainWindow(dbFileName)
    addToRecentDocs(dbFileName)
  }

  if (fs.existsSync(filePath)) {
    if (fs.lstatSync(filePath).isDirectory()) {
      console.log('\ttrash existing folder', filePath)
      try {
        await trash(filePath)
        await openWindow()
      } catch (err) {
        console.error(err)
      }
    } else {
      await dialog.showMessageBox({
        message: "Could not overwrite file " + path.basename(filePath) + ". Only folders can be overwritten."
      })
      return
    }
  } else {
    await openWindow()
  }
}

function showMainWindow(dbFile) {
  const basename = path.basename(dbFile)
  if (!loadingStatusWindow) {
    loadingStatusWindow = new BrowserWindow({
      width: 450,
      height: 150,
      backgroundColor: '#333333',
      show: false,
      frame: false,
      resizable: false,
      webPreferences: defaultWebPreferences
    })
    remoteMain.enable(loadingStatusWindow.webContents)
  }

  loadingStatusWindow.loadURL(`file://${__dirname}/loading-status.html?name=${basename}`)
  loadingStatusWindow.once('ready-to-show', () => {
    loadingStatusWindow.show()
  })

  try {
    // Use better-sqlite3 with knex
    const knex = require('knex')({
      client: 'better-sqlite3',
      connection: {
        filename: dbFile
      },
      useNullAsDefault: true
    })
    global.knex = knex

    const migrationsPath = path.join(__dirname, 'migrations')

    console.log('Starting migrations from:', migrationsPath)
    knex.migrate.latest({directory: migrationsPath})
      .then(() => {
        console.log('Migrations completed, seeding DB...')
        return seedDB(knex, {valuesSeedDataPath})
      })
      .then(() => {
        console.log('Seeding completed, creating main window...')
        if (mainWindow) {
          mainWindow.close()
        }
        mainWindow = new BrowserWindow({
          width: 800,
          height: 600,
          show: false,
          title: basename,
          webPreferences: defaultWebPreferences
        })
        remoteMain.enable(mainWindow.webContents)
        mainWindow.loadURL(url.format({
          pathname: path.join(__dirname, 'main-window.html'),
          protocol: 'file:',
          slashes: true
        }))
        mainWindow.on('closed', () => {
          mainWindow = null
        })
        // Open DevTools for debugging
        mainWindow.webContents.openDevTools()
      })
      .catch(error => {
        console.error('Database error:', error)
        // The loading status window doesn't receive the message unless it's delayed a little
        setTimeout(() => {
          loadingStatusWindow.webContents.send('log', { type: "progress", message: error.toString()})
        }, 500)
      })
  } catch (error) {
    setTimeout(() => {
      loadingStatusWindow.webContents.send('log', { type: "progress", message: error.toString()})
    }, 500)
  }
}

const addToRecentDocs = (filename, metadata = {}) => {
  const prefs = prefModule.getPrefs('add to recent')

  let recentDocuments
  if (!prefs.recentDocuments) {
    recentDocuments = []
  } else {
    recentDocuments = JSON.parse(JSON.stringify(prefs.recentDocuments))
  }

  let currPos = 0

  for (const document of recentDocuments) {
    if (document.filename === filename) {
      recentDocuments.splice(currPos, 1)
      break
    }
    currPos++
  }

  const recentDocument = metadata

  if (!recentDocument.title) {
    let title = filename.split(path.sep)
    title = title[title.length - 1]
    title = title.split('.')
    title.splice(-1, 1)
    title = title.join('.')
    recentDocument.title = title
  }

  recentDocument.filename = filename
  recentDocument.time = Date.now()
  recentDocuments.unshift(recentDocument)
  // save
  prefModule.set('recentDocuments', recentDocuments)

  if (welcomeWindow) {
    welcomeWindow.webContents.send('update-recent-documents')
  }
}
