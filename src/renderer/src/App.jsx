import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import SplitPane from 'split-pane-react'
import { MantineProvider, Box, Button, Text } from '@mantine/core'
import 'split-pane-react/esm/themes/default.css'

const defaultCode = `// Write your JavaScript code here
console.log('Hello, World!');

// Try some math
const result = 10 + 20;
console.log('10 + 20 =', result);

// Or use some ES6 features
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled numbers:', doubled);`

// Helper function to parse serialized data
function parseSerializedData(data) {
  if (typeof data !== 'string' || !data.startsWith('{')) {
    return data
  }
  
  try {
    const parsed = JSON.parse(data)
    
    if (parsed.type === 'undefined') return 'undefined'
    if (parsed.type === 'null') return 'null'
    if (parsed.type === 'function') return parsed.value
    if (parsed.type === 'symbol') return parsed.value
    if (parsed.type === 'bigint') return parsed.value
    if (parsed.type === 'string' || parsed.type === 'number' || parsed.type === 'boolean') {
      return parsed.value
    }
    
    if (parsed.type === 'array') {
      return `[${parsed.value.map(parseSerializedData).join(', ')}]`
    }
    
    if (parsed.type === 'date') {
      return new Date(parsed.value).toString()
    }
    
    if (parsed.type === 'error') {
      return `${parsed.value.name}: ${parsed.value.message}`
    }
    
    if (parsed.type === 'object') {
      const entries = Object.entries(parsed.value).map(([key, value]) => {
        return `${key}: ${parseSerializedData(JSON.stringify(value))}`
      })
      return `{${entries.join(', ')}}`
    }
    
    return JSON.stringify(parsed)
  } catch (e) {
    return data
  }
}

function App() {
  const [code, setCode] = useState(defaultCode)
  const [output, setOutput] = useState([])
  const [sizes, setSizes] = useState([60, 40])
  const listenersSetupRef = useRef(false)

  useEffect(() => {
    // Only set up listeners once
    if (listenersSetupRef.current) return
    listenersSetupRef.current = true

    // Set up console output listeners
    const logListener = (_, args) => {
      setOutput(prev => [...prev, { type: 'log', content: args.join(' ') }])
    }
    
    const errorListener = (_, args) => {
      setOutput(prev => [...prev, { type: 'error', content: args.join(' ') }])
    }
    
    const warnListener = (_, args) => {
      setOutput(prev => [...prev, { type: 'warn', content: args.join(' ') }])
    }
    
    const infoListener = (_, args) => {
      setOutput(prev => [...prev, { type: 'info', content: args.join(' ') }])
    }

    // Set up IPC listeners directly
    window.electron.ipcRenderer.on('console-log', logListener)
    window.electron.ipcRenderer.on('console-error', errorListener)
    window.electron.ipcRenderer.on('console-warn', warnListener)
    window.electron.ipcRenderer.on('console-info', infoListener)

    return () => {
      // Clean up listeners
      window.electron.ipcRenderer.removeListener('console-log', logListener)
      window.electron.ipcRenderer.removeListener('console-error', errorListener)
      window.electron.ipcRenderer.removeListener('console-warn', warnListener)
      window.electron.ipcRenderer.removeListener('console-info', infoListener)
    }
  }, [])

  const handleEditorChange = (value) => {
    setCode(value)
  }

  const executeCode = async () => {
    setOutput([])
    try {
      const result = await window.electron.executeCode(code)
      if (!result.success) {
        setOutput(prev => [...prev, { type: 'error', content: result.error }])
      } else if (result.result && result.result.type !== 'undefined') {
        let formattedResult
        try {
          formattedResult = JSON.stringify(result.result.value, null, 2)
        } catch (e) {
          formattedResult = String(result.result.value)
        }
        setOutput(prev => [...prev, { type: 'success', content: formattedResult }])
      }
    } catch (error) {
      setOutput(prev => [...prev, { type: 'error', content: error.message }])
    }
  }

  return (
    <div className="app-container">
      <div className="header">
        <div className="title">JS Playground</div>
        <button onClick={executeCode} className="button">
          Run Code
        </button>
      </div>
      <div className="main-content">
        <div className="editor-container">
          <CodeMirror
            value={code}
            height="100%"
            width="100%"
            theme={oneDark}
            extensions={[javascript({ jsx: true })]}
            onChange={handleEditorChange}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              foldGutter: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              searchKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true
            }}
          />
        </div>
        <div className="console-container">
          {output.map((item, index) => (
            <div 
              key={index}
              className={`log-item log-${item.type}`}
            >
              {item.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
