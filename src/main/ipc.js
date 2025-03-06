import { ipcMain } from 'electron'
import { VM } from 'vm2'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

// Get the packages directory
const getPackagesPath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'packages')
}

// Ensure packages directory exists
const ensurePackagesDirectory = () => {
  console.log('Ensuring packages directory exists')
  const packagesPath = getPackagesPath()
  console.log('Packages path:', packagesPath)
  
  try {
    if (!fs.existsSync(packagesPath)) {
      console.log('Creating packages directory:', packagesPath)
      fs.mkdirSync(packagesPath, { recursive: true })
      
      // Create a package.json file if it doesn't exist
      const packageJsonPath = path.join(packagesPath, 'package.json')
      if (!fs.existsSync(packageJsonPath)) {
        console.log('Creating package.json file:', packageJsonPath)
        fs.writeFileSync(packageJsonPath, JSON.stringify({
          name: 'js-playground-packages',
          version: '1.0.0',
          description: 'Packages for JavaScript Playground',
          dependencies: {}
        }, null, 2))
      }
    } else {
      console.log('Packages directory already exists')
    }
    return packagesPath
  } catch (error) {
    console.error('Error ensuring packages directory:', error)
    throw error
  }
}

// Get installed packages
const getInstalledPackages = () => {
  console.log('Getting installed packages')
  const packagesPath = ensurePackagesDirectory()
  console.log('Packages directory:', packagesPath)
  const packageJsonPath = path.join(packagesPath, 'package.json')
  console.log('Package.json path:', packageJsonPath)
  
  try {
    if (fs.existsSync(packageJsonPath)) {
      console.log('package.json exists, reading file')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      console.log('Package.json content:', packageJson)
      return packageJson.dependencies || {}
    } else {
      console.log('package.json does not exist, creating it')
      // Create package.json if it doesn't exist
      const packageJson = {
        name: 'js-playground-packages',
        version: '1.0.0',
        description: 'Packages for JavaScript Playground',
        dependencies: {}
      }
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
      return {}
    }
  } catch (error) {
    console.error('Error reading package.json:', error)
    return {}
  }
}

// Default preferences
const defaultPreferences = {
  fontSize: 16,
  autocomplete: true,
  theme: 'dracula'
}

// Valid theme options
const validThemes = ['dracula', 'one-dark', 'material-ocean', 'vs-light']

// Load preferences from file
const loadPreferences = () => {
  const prefsPath = getUserDataPath()
  try {
    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, 'utf8')
      console.log('Loading preferences from file:', data)
      const prefs = JSON.parse(data)
      
      // Validate theme
      if (prefs.theme && !validThemes.includes(prefs.theme)) {
        console.warn(`Invalid theme: ${prefs.theme}, defaulting to dracula`)
        prefs.theme = 'dracula'
      }
      
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
    
    // Capture original console methods before creating the sandbox
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    
    // Keep track of the last message sent to avoid duplicates
    const lastMessages = {
      log: null,
      error: null,
      warn: null,
      info: null
    };
    
    try {
      // Create a sandbox with console methods
      const sandbox = {
        console: {
          log: (...args) => {
            const message = args.map(stringifyForConsole).join(' ');
            // Only send if this message is different from the last one
            if (message !== lastMessages.log) {
              lastMessages.log = message;
              originalConsoleLog('VM console.log:', ...args);
              mainWindow.webContents.send('console-log', args.map(stringifyForConsole));
            }
          },
          error: (...args) => {
            const message = args.map(stringifyForConsole).join(' ');
            if (message !== lastMessages.error) {
              lastMessages.error = message;
              originalConsoleLog('VM console.error:', ...args);
              mainWindow.webContents.send('console-error', args.map(stringifyForConsole));
            }
          },
          warn: (...args) => {
            const message = args.map(stringifyForConsole).join(' ');
            if (message !== lastMessages.warn) {
              lastMessages.warn = message;
              originalConsoleLog('VM console.warn:', ...args);
              mainWindow.webContents.send('console-warn', args.map(stringifyForConsole));
            }
          },
          info: (...args) => {
            const message = args.map(stringifyForConsole).join(' ');
            if (message !== lastMessages.info) {
              lastMessages.info = message;
              originalConsoleLog('VM console.info:', ...args);
              mainWindow.webContents.send('console-info', args.map(stringifyForConsole));
            }
          }
        },
        // Add require function to load installed packages
        require: (moduleName) => {
          try {
            const packagesPath = getPackagesPath();
            const modulePath = path.join(packagesPath, 'node_modules', moduleName);
            return require(modulePath);
          } catch (error) {
            throw new Error(`Failed to load module '${moduleName}': ${error.message}`);
          }
        }
      };

      // Create a new VM with the sandbox
      const vm = new VM({
        timeout: 5000,
        sandbox: sandbox,
        eval: false,
        wasm: false
      });

      // Execute the code
      const result = vm.run(code);
      originalConsoleLog('VM execution result:', result);

      return {
        success: true,
        result: makeSerializable(result)
      };
    } catch (error) {
      console.error('VM execution error:', error.message);
      return {
        success: false,
        error: error.message
      };
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

  // Get installed packages
  ipcMain.handle('get-packages', async () => {
    console.log('Received get-packages request')
    try {
      const packages = getInstalledPackages()
      console.log('Returning packages:', packages)
      return packages
    } catch (error) {
      console.error('Error in get-packages handler:', error)
      return {}
    }
  })

  // Install a package
  ipcMain.handle('install-package', async (_, packageName, version) => {
    try {
      const packagesPath = ensurePackagesDirectory()
      
      // Notify the renderer that installation has started
      mainWindow.webContents.send('package-install-status', {
        packageName,
        status: 'installing',
        message: `Installing ${packageName}${version ? `@${version}` : ''}...`
      })
      
      // Construct the package name with version if provided
      const packageToInstall = version ? `${packageName}@${version}` : packageName
      
      // Run npm install
      const { stdout, stderr } = await execAsync(`npm install ${packageToInstall}`, {
        cwd: packagesPath
      })
      
      console.log(`Package installation stdout: ${stdout}`)
      if (stderr) console.error(`Package installation stderr: ${stderr}`)
      
      // Read the updated package.json to get the installed version
      const packageJson = JSON.parse(fs.readFileSync(path.join(packagesPath, 'package.json'), 'utf8'))
      const installedVersion = packageJson.dependencies[packageName]
      
      // Notify the renderer that installation is complete
      mainWindow.webContents.send('package-install-status', {
        packageName,
        status: 'installed',
        version: installedVersion,
        message: `Successfully installed ${packageName}@${installedVersion}`
      })
      
      return {
        success: true,
        packageName,
        version: installedVersion
      }
    } catch (error) {
      console.error(`Error installing package ${packageName}:`, error)
      
      // Notify the renderer that installation failed
      mainWindow.webContents.send('package-install-status', {
        packageName,
        status: 'error',
        message: `Failed to install ${packageName}: ${error.message}`
      })
      
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Uninstall a package
  ipcMain.handle('uninstall-package', async (_, packageName) => {
    try {
      const packagesPath = ensurePackagesDirectory()
      
      // Notify the renderer that uninstallation has started
      mainWindow.webContents.send('package-install-status', {
        packageName,
        status: 'uninstalling',
        message: `Uninstalling ${packageName}...`
      })
      
      // Run npm uninstall
      const { stdout, stderr } = await execAsync(`npm uninstall ${packageName}`, {
        cwd: packagesPath
      })
      
      console.log(`Package uninstallation stdout: ${stdout}`)
      if (stderr) console.error(`Package uninstallation stderr: ${stderr}`)
      
      // Notify the renderer that uninstallation is complete
      mainWindow.webContents.send('package-install-status', {
        packageName,
        status: 'uninstalled',
        message: `Successfully uninstalled ${packageName}`
      })
      
      return {
        success: true,
        packageName
      }
    } catch (error) {
      console.error(`Error uninstalling package ${packageName}:`, error)
      
      // Notify the renderer that uninstallation failed
      mainWindow.webContents.send('package-install-status', {
        packageName,
        status: 'error',
        message: `Failed to uninstall ${packageName}: ${error.message}`
      })
      
      return {
        success: false,
        error: error.message
      }
    }
  })
} 