import { contextBridge, ipcRenderer } from 'electron'

// Clear any existing listeners to prevent duplicates
const clearExistingListeners = () => {
  const events = ['console-log', 'console-error', 'console-warn', 'console-info', 'new-file', 'preferences-changed', 'package-install-status']
  events.forEach(event => {
    ipcRenderer.removeAllListeners(event)
  })
}

// Clear listeners on load
clearExistingListeners()

// Log the available channels for debugging
console.log('Setting up preload script')

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    console.log('Context isolation is enabled, exposing APIs via contextBridge')
    
    // Define the electron API object
    const electronAPI = {
      ipcRenderer: {
        // Send
        send: (channel, data) => {
          const validChannels = ['close-preferences', 'open-preferences']
          // Also allow any channel that starts with 'console-'
          if (validChannels.includes(channel) || channel.startsWith('console-')) {
            ipcRenderer.send(channel, data)
          }
        },
        // Receive
        on: (channel, func) => {
          const validChannels = ['console-log', 'console-error', 'console-warn', 'console-info', 'new-file', 'preferences-changed', 'package-install-status']
          if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, func)
          }
        },
        // Remove listener
        removeListener: (channel, func) => {
          const validChannels = ['console-log', 'console-error', 'console-warn', 'console-info', 'new-file', 'preferences-changed', 'package-install-status']
          if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, func)
          }
        },
        // Remove all listeners
        removeAllListeners: (channel) => {
          const validChannels = ['console-log', 'console-error', 'console-warn', 'console-info', 'new-file', 'preferences-changed', 'package-install-status']
          if (validChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel)
          }
        }
      },
      // Execute code
      executeCode: (code) => ipcRenderer.invoke('execute-code', code),
      // Preferences API
      preferences: {
        get: () => ipcRenderer.invoke('get-preferences'),
        save: (preferences) => ipcRenderer.invoke('save-preferences', preferences),
        reset: () => ipcRenderer.invoke('reset-preferences')
      },
      // Package management API
      packages: {
        get: () => ipcRenderer.invoke('get-packages'),
        install: (packageName, version) => ipcRenderer.invoke('install-package', packageName, version),
        uninstall: (packageName) => ipcRenderer.invoke('uninstall-package', packageName)
      }
    }
    
    // Expose the API to the renderer process
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    
    console.log('APIs exposed successfully:', Object.keys(electronAPI))
  } catch (error) {
    console.error('Error in preload script:', error)
  }
} else {
  console.log('Context isolation is disabled, adding APIs directly to window')
  
  window.electron = {
    ipcRenderer: {
      on: (channel, func) => {
        ipcRenderer.on(channel, func)
      },
      once: (channel, func) => {
        ipcRenderer.once(channel, func)
      },
      removeListener: (channel, func) => {
        ipcRenderer.removeListener(channel, func)
      },
      removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel)
      },
      send: (channel, ...args) => {
        ipcRenderer.send(channel, ...args)
      },
      invoke: (channel, ...args) => {
        return ipcRenderer.invoke(channel, ...args)
      }
    },
    executeCode: (code) => ipcRenderer.invoke('execute-code', code),
    preferences: {
      get: () => ipcRenderer.invoke('get-preferences'),
      save: (preferences) => ipcRenderer.invoke('save-preferences', preferences),
      reset: () => ipcRenderer.invoke('reset-preferences')
    },
    packages: {
      get: () => ipcRenderer.invoke('get-packages'),
      install: (packageName, version) => ipcRenderer.invoke('install-package', packageName, version),
      uninstall: (packageName) => ipcRenderer.invoke('uninstall-package', packageName)
    }
  }
  window.api = api
  
  console.log('APIs added directly to window:', Object.keys(window.electron))
}
