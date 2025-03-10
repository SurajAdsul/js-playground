import { ipcMain } from 'electron'
import { VM } from 'vm2'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import https from 'https'
import http from 'http'

const execAsync = promisify(exec)

// Helper function to find npm executable
const findNpmExecutable = async () => {
  // Try to use npm from the PATH first
  try {
    // Use different commands based on the platform
    const command = process.platform === 'win32' ? 'where npm' : 'which npm'
    const { stdout } = await execAsync(command)
    if (stdout && stdout.trim()) {
      return stdout.trim()
    }
  } catch (error) {
    console.log(`Could not find npm in PATH using platform-specific command: ${error.message}`)
  }

  // Fallback paths based on common npm locations and platform
  let possiblePaths = []
  
  if (process.platform === 'darwin') {
    // macOS paths
    possiblePaths = [
      '/usr/local/bin/npm',
      '/usr/bin/npm',
      '/opt/homebrew/bin/npm',
      path.join(process.env.HOME || '', '.nvm/versions/node/*/bin/npm'),
      path.join(process.env.HOME || '', '.npm/bin/npm')
    ]
  } else if (process.platform === 'win32') {
    // Windows paths
    possiblePaths = [
      path.join(process.env.APPDATA || '', 'npm/npm.cmd'),
      path.join(process.env.ProgramFiles || '', 'nodejs/npm.cmd'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'nodejs/npm.cmd')
    ]
  } else {
    // Linux paths
    possiblePaths = [
      '/usr/local/bin/npm',
      '/usr/bin/npm',
      path.join(process.env.HOME || '', '.nvm/versions/node/*/bin/npm'),
      path.join(process.env.HOME || '', '.npm/bin/npm')
    ]
  }

  for (const npmPath of possiblePaths) {
    try {
      // Handle glob patterns for nvm-style paths
      if (npmPath.includes('*')) {
        // For simplicity, we'll just check if the parent directory exists
        const parentDir = npmPath.substring(0, npmPath.indexOf('*') - 1)
        if (fs.existsSync(parentDir)) {
          // Try to find the latest version
          try {
            const { stdout } = await execAsync(`find ${parentDir} -name npm -type f | sort -r | head -1`)
            if (stdout && stdout.trim()) {
              return stdout.trim()
            }
          } catch (e) {
            console.log(`Error finding npm in ${parentDir}:`, e.message)
          }
        }
      } else if (fs.existsSync(npmPath)) {
        return npmPath
      }
    } catch (error) {
      // Ignore errors and try next path
    }
  }

  // If we can't find npm, we'll use a bundled npm package
  return null
}

// Helper function to find node executable
const findNodeExecutable = async () => {
  // Try to use node from the PATH first
  try {
    const command = process.platform === 'win32' ? 'where node' : 'which node'
    const { stdout } = await execAsync(command)
    if (stdout && stdout.trim()) {
      return stdout.trim()
    }
  } catch (error) {
    console.log(`Could not find node in PATH: ${error.message}`)
  }

  // Fallback paths based on common node locations
  const possiblePaths = process.platform === 'darwin' ? [
    '/usr/local/bin/node',
    '/usr/bin/node',
    '/opt/homebrew/bin/node',
    process.execPath // Use Electron's bundled Node.js as last resort
  ] : process.platform === 'win32' ? [
    path.join(process.env.ProgramFiles || '', 'nodejs/node.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'nodejs/node.exe')
  ] : [
    '/usr/local/bin/node',
    '/usr/bin/node'
  ]

  for (const nodePath of possiblePaths) {
    if (fs.existsSync(nodePath)) {
      return nodePath
    }
  }

  // If we can't find node, return Electron's bundled Node.js
  return process.execPath
}

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

// Install a package
const installPackage = async (packagesPath, packageName, version) => {
  const packageToInstall = version ? `${packageName}@${version}` : packageName
  
  console.log('Creating package.json if it doesn\'t exist')
  const packageJsonPath = path.join(packagesPath, 'package.json')
  
  // Read or create package.json
  let packageJson
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  } catch (e) {
    packageJson = {
      name: 'js-playground-packages',
      version: '1.0.0',
      description: 'Packages for JavaScript Playground',
      dependencies: {}
    }
  }
  
  // Update package.json with the new dependency
  packageJson.dependencies = packageJson.dependencies || {}
  packageJson.dependencies[packageName] = version || 'latest'
  
  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  console.log(`Updated package.json with ${packageName}@${version || 'latest'}`)
  
  // Create node_modules directory if it doesn't exist
  const nodeModulesPath = path.join(packagesPath, 'node_modules')
  if (!fs.existsSync(nodeModulesPath)) {
    fs.mkdirSync(nodeModulesPath, { recursive: true })
  }

  // Try to find npm and node executables
  const [npmPath, nodePath] = await Promise.all([
    findNpmExecutable(),
    findNodeExecutable()
  ])
  
  if (!npmPath) {
    throw new Error('Could not find npm executable')
  }

  if (!nodePath) {
    throw new Error('Could not find node executable')
  }

  // Use npm to install the package with explicit node path
  console.log(`Using npm from: ${npmPath} with node from: ${nodePath}`)
  try {
    // Set NODE_PATH environment variable
    const env = {
      ...process.env,
      NODE: nodePath,
      PATH: `${path.dirname(nodePath)}${path.delimiter}${process.env.PATH}`
    }

    const { stdout, stderr } = await execAsync(`"${npmPath}" install ${packageToInstall}`, {
      cwd: packagesPath,
      env
    })
    console.log('Package installation stdout:', stdout)
    if (stderr) console.error('Package installation stderr:', stderr)
    return { stdout, stderr }
  } catch (error) {
    console.error(`Error installing package:`, error)
    throw error
  }
}

// Uninstall a package
const uninstallPackage = async (packagesPath, packageName) => {
  // Try to find npm executable
  const npmPath = await findNpmExecutable()
  
  if (npmPath) {
    // Use the found npm executable
    console.log(`Using npm from: ${npmPath}`)
    try {
      const { stdout, stderr } = await execAsync(`"${npmPath}" uninstall ${packageName}`, {
        cwd: packagesPath
      })
      return { stdout, stderr }
    } catch (error) {
      console.error(`Error using npm at ${npmPath}:`, error)
      // Fall through to the fallback method
    }
  }
  
  // Fallback to using a programmatic approach
  console.log('Using programmatic npm uninstallation')
  
  // Instead of creating a script file and executing it with node,
  // we'll directly implement the uninstallation logic
  try {
    console.log('Reading package.json')
    const packageJsonPath = path.join(packagesPath, 'package.json')
    
    // Read package.json
    let packageJson
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      
      // Remove the dependency from package.json
      if (packageJson.dependencies && packageJson.dependencies[packageName]) {
        delete packageJson.dependencies[packageName]
        
        // Write updated package.json
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
        console.log(`Removed ${packageName} from package.json`)
      }
    } catch (e) {
      console.error('Error updating package.json:', e.message)
    }
    
    // Try to remove the module directory
    const modulePath = path.join(packagesPath, 'node_modules', packageName)
    if (fs.existsSync(modulePath)) {
      try {
        // Use the appropriate method to delete the directory based on platform
        if (process.platform === 'win32') {
          // On Windows, use a recursive directory deletion function
          const deleteFolderRecursive = function(dirPath) {
            if (fs.existsSync(dirPath)) {
              fs.readdirSync(dirPath).forEach((file) => {
                const curPath = path.join(dirPath, file)
                if (fs.lstatSync(curPath).isDirectory()) {
                  // Recursive call
                  deleteFolderRecursive(curPath)
                } else {
                  // Delete file
                  fs.unlinkSync(curPath)
                }
              })
              fs.rmdirSync(dirPath)
            }
          }
          deleteFolderRecursive(modulePath)
        } else {
          // On Unix-like systems, try using child_process
          try {
            const childProcess = require('child_process')
            childProcess.execSync(`rm -rf "${modulePath}"`, { stdio: 'inherit' })
          } catch (rmError) {
            console.error('Error removing module directory with child_process:', rmError.message)
            // Fallback to a recursive deletion function
            const deleteFolderRecursive = function(dirPath) {
              if (fs.existsSync(dirPath)) {
                fs.readdirSync(dirPath).forEach((file) => {
                  const curPath = path.join(dirPath, file)
                  if (fs.lstatSync(curPath).isDirectory()) {
                    // Recursive call
                    deleteFolderRecursive(curPath)
                  } else {
                    // Delete file
                    fs.unlinkSync(curPath)
                  }
                })
                fs.rmdirSync(dirPath)
              }
            }
            deleteFolderRecursive(modulePath)
          }
        }
        console.log(`Removed module directory: ${modulePath}`)
      } catch (rmError) {
        console.error('Error removing module directory:', rmError.message)
      }
    }
    
    // Try one more approach - use the built-in require('child_process') directly
    try {
      console.log('Attempting to use child_process directly')
      const childProcess = require('child_process')
      childProcess.execSync(`npm uninstall ${packageName}`, {
        cwd: packagesPath,
        stdio: 'inherit'
      })
      console.log('Successfully uninstalled using child_process')
    } catch (childProcessError) {
      console.error('child_process approach failed:', childProcessError.message)
      // Continue with the manual approach
    }
    
    return {
      stdout: `Removed ${packageName}. Please restart the application for the changes to take effect.`,
      stderr: ''
    }
  } catch (error) {
    console.error('Error in programmatic uninstallation:', error)
    throw error
  }
}

// Helper function to make HTTP/HTTPS requests
const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          data,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
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
        // Add fs module
        fs: fs,
        // Add require function to load installed packages
        require: (moduleName) => {
          try {
            const packagesPath = getPackagesPath();
            const modulePath = path.join(packagesPath, 'node_modules', moduleName);
            
            // Check if the module exists
            if (!fs.existsSync(modulePath)) {
              throw new Error(`Module '${moduleName}' not found. Please install it first.`);
            }
            
            // Try to load the module
            const loadedModule = require(modulePath);
            
            // Verify the module was loaded properly
            if (!loadedModule) {
              throw new Error(`Failed to load module '${moduleName}': Module is empty`);
            }
            
            return loadedModule;
          } catch (error) {
            console.error(`Error loading module '${moduleName}':`, error);
            throw new Error(`Failed to load module '${moduleName}': ${error.message}`);
          }
        },
        // Add bridge function for fetch requests
        __bridge_fetch: async (url, options = {}) => {
          try {
            const response = await makeRequest(url, options);
            return response;
          } catch (error) {
            throw new Error(`Fetch error: ${error.message}`);
          }
        }
      };

      // Create a new VM with the sandbox
      const vm = new VM({
        timeout: 5000,
        sandbox: sandbox,
        eval: false,
        wasm: false,
        sourceExtensions: ['js', 'mjs'],
        compiler: 'javascript'
      });

      // Transform ES module code to CommonJS
      const transformedCode = code.replace(/import\s+(\{[^}]+\}|\*\s+as\s+[^;]+|[^;]+)\s+from\s+['"][^'"]+['"]/g, (match) => {
        return match.replace('import', 'const').replace('from', '= require');
      });

      // Execute the transformed code
      const result = vm.run(transformedCode);
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
      
      // Install the package using our enhanced installation function
      const { stdout, stderr } = await installPackage(packagesPath, packageName, version)
      
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
      
      // Uninstall the package using our enhanced uninstallation function
      const { stdout, stderr } = await uninstallPackage(packagesPath, packageName)
      
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

  // Handle fetch requests
  ipcMain.handle('fetch-request', async (event, { url, options }) => {
    try {
      const response = await makeRequest(url, options);
      return response;
    } catch (error) {
      throw new Error(`Fetch error: ${error.message}`);
    }
  });
} 