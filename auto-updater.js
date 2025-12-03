// REFERENCE
// https://github.com/iffy/electron-updater-example/blob/master/main.js
// https://github.com/wulkano/kap/blob/b326a5a398affb3652650ddc70d3a95724e755db/app/src/main/auto-updater.js

const { BrowserWindow, dialog, app } = require('electron')

const init = () => {
  // Lazy load electron-updater to avoid accessing app before it's ready
  const { autoUpdater } = require('electron-updater')

  autoUpdater.on('update-available', async (ev) => {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      message: `An update is available to version ${ev.version}. Update now? There will be a short delay while we download the update and install it for you.`,
      buttons: ['Later', 'Download and Install Now']
    })

    if (response === 1) {
      let win = new BrowserWindow({
        width: 600,
        height: 720,
        show: false,
        center: true,
        resizable: false,
        backgroundColor: '#E5E5E5',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          devTools: true
        }
      })

      win.on('closed', () => {
        win = null
      })

      win.loadURL(`file://${__dirname}/update.html`)

      win.once('ready-to-show', () => {
        win.webContents.send('release-notes', ev.releaseNotes)
        win.show()
      })

      autoUpdater.on('download-progress', (progressObj) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('progress', progressObj)
        }
      })

      autoUpdater.on('update-downloaded', async () => {
        await dialog.showMessageBox({ message: 'Update downloaded; will install in 5 seconds' })
        // Wait 5 seconds, then quit and install
        setTimeout(() => {
          autoUpdater.quitAndInstall()
        }, 5000)
      })

      // fail gracelessly if we can't update properly
      autoUpdater.on('error', async () => {
        await dialog.showMessageBox({ message: 'Update failed. Quitting.' })
        if (win && !win.isDestroyed()) {
          win.close()
        }
        app.quit()
      })

      // Download and Install
      autoUpdater.downloadUpdate()
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err)
  })

  autoUpdater.autoDownload = false
  autoUpdater.checkForUpdates()
}

exports.init = init
