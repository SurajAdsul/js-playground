import { ipcMain } from 'electron'
import { VM } from 'vm2'

// Helper function to make objects serializable
function makeSerializable(obj) {
  if (obj === undefined) return { type: 'undefined' }
  if (obj === null) return { type: 'null', value: null }
  
  const type = typeof obj
  
  if (type === 'function') return { type: 'function', value: obj.toString() }
  if (type === 'symbol') return { type: 'symbol', value: obj.toString() }
  if (type === 'bigint') return { type: 'bigint', value: obj.toString() }
  
  if (type !== 'object') return { type, value: obj }
  
  if (Array.isArray(obj)) {
    return { 
      type: 'array', 
      value: obj.map(makeSerializable)
    }
  }
  
  if (obj instanceof Date) {
    return { type: 'date', value: obj.toISOString() }
  }
  
  if (obj instanceof Error) {
    return { 
      type: 'error', 
      value: {
        name: obj.name,
        message: obj.message,
        stack: obj.stack
      }
    }
  }
  
  // For regular objects
  const result = { type: 'object', value: {} }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      try {
        result.value[key] = makeSerializable(obj[key])
      } catch (e) {
        result.value[key] = { type: 'error', value: 'Unserializable value' }
      }
    }
  }
  
  return result
}

export function setupIpcHandlers() {
  // Handle code execution
  ipcMain.handle('execute-code', async (event, code) => {
    console.log('Executing code:', code)
    try {
      const vm = new VM({
        timeout: 5000,
        sandbox: {
          console: {
            log: (...args) => {
              console.log('Console log from VM:', ...args)
              const serializedArgs = args.map(arg => {
                try {
                  return typeof arg === 'string' ? arg : JSON.stringify(makeSerializable(arg))
                } catch (e) {
                  return String(arg)
                }
              })
              event.sender.send('console-log', serializedArgs)
            },
            error: (...args) => {
              console.error('Console error from VM:', ...args)
              const serializedArgs = args.map(arg => {
                try {
                  return typeof arg === 'string' ? arg : JSON.stringify(makeSerializable(arg))
                } catch (e) {
                  return String(arg)
                }
              })
              event.sender.send('console-error', serializedArgs)
            },
            warn: (...args) => {
              console.warn('Console warn from VM:', ...args)
              const serializedArgs = args.map(arg => {
                try {
                  return typeof arg === 'string' ? arg : JSON.stringify(makeSerializable(arg))
                } catch (e) {
                  return String(arg)
                }
              })
              event.sender.send('console-warn', serializedArgs)
            },
            info: (...args) => {
              console.info('Console info from VM:', ...args)
              const serializedArgs = args.map(arg => {
                try {
                  return typeof arg === 'string' ? arg : JSON.stringify(makeSerializable(arg))
                } catch (e) {
                  return String(arg)
                }
              })
              event.sender.send('console-info', serializedArgs)
            }
          }
        }
      })

      const result = await vm.run(code)
      console.log('Execution result:', result)
      
      // Make sure the result is serializable
      const serializedResult = makeSerializable(result)
      return { success: true, result: serializedResult }
    } catch (error) {
      console.error('Execution error:', error.message)
      return { success: false, error: error.message }
    }
  })
} 