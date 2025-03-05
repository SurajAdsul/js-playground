import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        send: (channel, ...args) => ipcRenderer.send(channel, ...args)
      },
      executeCode: (code) => ipcRenderer.invoke('execute-code', code),
      onConsoleLog: (callback) => {
        ipcRenderer.on('console-log', (_, args) => callback(args))
        return () => ipcRenderer.removeListener('console-log', callback)
      },
      onConsoleError: (callback) => {
        ipcRenderer.on('console-error', (_, args) => callback(args))
        return () => ipcRenderer.removeListener('console-error', callback)
      },
      onConsoleWarn: (callback) => {
        ipcRenderer.on('console-warn', (_, args) => callback(args))
        return () => ipcRenderer.removeListener('console-warn', callback)
      },
      onConsoleInfo: (callback) => {
        ipcRenderer.on('console-info', (_, args) => callback(args))
        return () => ipcRenderer.removeListener('console-info', callback)
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = {
    ipcRenderer: {
      send: (channel, ...args) => ipcRenderer.send(channel, ...args)
    },
    executeCode: (code) => ipcRenderer.invoke('execute-code', code),
    onConsoleLog: (callback) => {
      ipcRenderer.on('console-log', (_, args) => callback(args))
      return () => ipcRenderer.removeListener('console-log', callback)
    },
    onConsoleError: (callback) => {
      ipcRenderer.on('console-error', (_, args) => callback(args))
      return () => ipcRenderer.removeListener('console-error', callback)
    },
    onConsoleWarn: (callback) => {
      ipcRenderer.on('console-warn', (_, args) => callback(args))
      return () => ipcRenderer.removeListener('console-warn', callback)
    },
    onConsoleInfo: (callback) => {
      ipcRenderer.on('console-info', (_, args) => callback(args))
      return () => ipcRenderer.removeListener('console-info', callback)
    }
  }
  window.api = api
}
