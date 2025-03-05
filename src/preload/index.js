import { contextBridge, ipcRenderer } from 'electron'

// Clear any existing listeners to prevent duplicates
ipcRenderer.removeAllListeners('console-log')
ipcRenderer.removeAllListeners('console-error')
ipcRenderer.removeAllListeners('console-warn')
ipcRenderer.removeAllListeners('console-info')

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
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
