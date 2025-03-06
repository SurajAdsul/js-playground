import { ipcMain } from 'electron'
import { VM } from 'vm2'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

// Helper function to make objects serializable
function makeSerializable(obj) {
  if (obj === null || obj === undefined) {
    return { type: typeof obj, value: obj }
  }

  if (typeof obj === 'function') {
    return { type: 'function', value: obj.toString() }
  }

  if (typeof obj !== 'object') {
    return { type: typeof obj, value: obj }
  }

  if (Array.isArray(obj)) {
    return { type: 'array', value: obj.map(makeSerializable) }
  }

  const result = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      try {
        result[key] = makeSerializable(obj[key])
      } catch (e) {
        result[key] = { type: 'error', value: e.message }
      }
    }
  }
  return { type: 'object', value: result }
}

// Helper function to stringify objects for console output
function stringifyForConsole(obj) {
  if (obj === null || obj === undefined) {
    return String(obj)
  }

  if (typeof obj !== 'object') {
    return String(obj)
  }

  try {
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return String(obj)
  }
}

// Get the user data directory for storing preferences
const getUserDataPath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'preferences.json')
}

// Default preferences
const defaultPreferences = {
  fontSize: 16,
  autocomplete: true,
  theme: 'dracula'
}

// Load preferences from file
const loadPreferences = () => {
  const prefsPath = getUserDataPath()
  try {
    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, 'utf8')
      console.log('Loading preferences from file:', data)
      const prefs = JSON.parse(data)
      return prefs
    }
  } catch (error) {
    console.error('Error loading preferences:', error)
  }
  console.log('Using default preferences:', defaultPreferences)
  return { ...defaultPreferences }
}

// Save preferences to file
const savePreferences = (preferences, mainWindow) => {
  const prefsPath = getUserDataPath()
  try {
    console.log('Saving preferences to file:', preferences)
    fs.writeFileSync(prefsPath, JSON.stringify(preferences, null, 2), 'utf8')
    
    // Notify renderer that preferences have changed
    if (mainWindow) {
      console.log('Notifying renderer of preference change')
      mainWindow.webContents.send('preferences-changed', preferences)
    }
    
    return true
  } catch (error) {
    console.error('Error saving preferences:', error)
    return false
  }
}

export function setupIpcHandlers(mainWindow) {
  // Execute JavaScript code
  ipcMain.handle('execute-code', async (_, code) => {
    console.log('Main process received code execution request:', code.substring(0, 100) + (code.length > 100 ? '...' : ''))
    try {
      // Create a sandbox with console methods
      const sandbox = {
        console: {
          log: (...args) => {
            originalConsoleLog('VM console.log:', ...args)
            mainWindow.webContents.send('console-log', args.map(stringifyForConsole))
          },
          error: (...args) => {
            originalConsoleLog('VM console.error:', ...args)
            mainWindow.webContents.send('console-error', args.map(stringifyForConsole))
          },
          warn: (...args) => {
            originalConsoleLog('VM console.warn:', ...args)
            mainWindow.webContents.send('console-warn', args.map(stringifyForConsole))
          },
          info: (...args) => {
            originalConsoleLog('VM console.info:', ...args)
            mainWindow.webContents.send('console-info', args.map(stringifyForConsole))
          }
        }
      }

      // Capture original console methods
      const originalConsoleLog = console.log
      const originalConsoleError = console.error
      const originalConsoleWarn = console.warn
      const originalConsoleInfo = console.info

      const vm = new VM({
        timeout: 5000,
        sandbox: sandbox,
        eval: false,
        wasm: false
      })

      // Execute the code
      const result = vm.run(code)
      originalConsoleLog('VM execution result:', result)

      return {
        success: true,
        result: makeSerializable(result)
      }
    } catch (error) {
      console.error('VM execution error:', error.message)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Get preferences
  ipcMain.handle('get-preferences', async () => {
    const prefs = loadPreferences()
    console.log('Sending preferences to renderer:', prefs)
    return prefs
  })

  // Save preferences
  ipcMain.handle('save-preferences', async (_, preferences) => {
    console.log('Received save preferences request:', preferences)
    return savePreferences(preferences, mainWindow)
  })

  // Reset preferences to default
  ipcMain.handle('reset-preferences', async () => {
    console.log('Resetting preferences to default')
    return savePreferences({ ...defaultPreferences }, mainWindow)
  })
} 