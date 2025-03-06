import { contextBridge, ipcRenderer } from 'electron'

// Clear any existing listeners to prevent duplicates
const clearExistingListeners = () => {
  const events = ['console-log', 'console-error', 'console-warn', 'console-info', 'new-file', 'preferences-changed']
  events.forEach(event => {
    ipcRenderer.removeAllListeners(event)
  })
}

// Clear listeners on load
clearExistingListeners()

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        // Send
        send: (channel, data) => {
          const validChannels = ['close-preferences']
          if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data)
          }
        },
        // Receive
        on: (channel, func) => {
          const validChannels = ['console-log', 'console-error', 'console-warn', 'console-info', 'new-file', 'preferences-changed']
          if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, func)
          }
        },
        // Remove listener
        removeListener: (channel, func) => {
          const validChannels = ['console-log', 'console-error', 'console-warn', 'console-info', 'new-file', 'preferences-changed']
          if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, func)
          }
        },
        // Remove all listeners
        removeAllListeners: (channel) => {
          const validChannels = ['console-log', 'console-error', 'console-warn', 'console-info', 'new-file', 'preferences-changed']
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
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
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
    executeCode: (code) => ipcRenderer.invoke('execute-code', code)
  }
  window.api = api
}
