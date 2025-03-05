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

// Helper function to stringify objects for console output
function stringifyForConsole(arg) {
  if (arg === undefined) return 'undefined'
  if (arg === null) return 'null'
  
  const type = typeof arg
  
  if (type === 'string') return arg
  if (type === 'function') return arg.toString()
  if (type === 'symbol') return arg.toString()
  if (type === 'bigint') return arg.toString()
  
  if (type !== 'object') return String(arg)
  
  if (Array.isArray(arg)) {
    return `[${arg.map(stringifyForConsole).join(', ')}]`
  }
  
  if (arg instanceof Date) {
    return arg.toISOString()
  }
  
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`
  }
  
  // For regular objects
  try {
    return JSON.stringify(arg, null, 2)
  } catch (e) {
    return '[Object]'
  }
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
              const stringifiedArgs = args.map(stringifyForConsole)
              event.sender.send('console-log', stringifiedArgs)
            },
            error: (...args) => {
              console.error('Console error from VM:', ...args)
              const stringifiedArgs = args.map(stringifyForConsole)
              event.sender.send('console-error', stringifiedArgs)
            },
            warn: (...args) => {
              console.warn('Console warn from VM:', ...args)
              const stringifiedArgs = args.map(stringifyForConsole)
              event.sender.send('console-warn', stringifiedArgs)
            },
            info: (...args) => {
              console.info('Console info from VM:', ...args)
              const stringifiedArgs = args.map(stringifyForConsole)
              event.sender.send('console-info', stringifiedArgs)
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