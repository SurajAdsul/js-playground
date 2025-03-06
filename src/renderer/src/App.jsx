import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { dracula } from '@uiw/codemirror-theme-dracula'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useRef, useState, useMemo } from 'react'
import SplitPane from 'split-pane-react'
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

// Define themes
const themes = {
  'one-dark': {
    name: 'One Dark',
    editor: oneDark,
  },
  'dracula': {
    name: 'Dracula',
    editor: dracula,
  }
}

// Helper function to parse serialized data
function parseSerializedData(data) {
  try {
    const parsed = JSON.parse(data)
    
    if (parsed.type === 'undefined') {
      return 'undefined'
    }
    
    if (parsed.type === 'null') {
      return 'null'
    }
    
    if (parsed.type === 'string' || parsed.type === 'number' || parsed.type === 'boolean') {
      return parsed.value
    }
    
    if (parsed.type === 'function' || parsed.type === 'symbol' || parsed.type === 'bigint') {
      return parsed.value
    }
    
    if (parsed.type === 'array') {
      return `[${parsed.value.map(item => parseSerializedData(JSON.stringify(item))).join(', ')}]`
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
  const [logs, setLogs] = useState([])
  const [currentTheme, setCurrentTheme] = useState('dracula')
  const consoleRef = useRef(null)
  const [sizes, setSizes] = useState([50, 50])
  const listenersSetupRef = useRef(false)
  const [preferences, setPreferences] = useState({
    fontSize: 16,
    autocomplete: true,
    theme: 'dracula'
  })

  // Load preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await window.electron.preferences.get()
        console.log('Loaded preferences:', prefs)
        
        // Apply preferences
        setPreferences(prefs)
        
        // Apply theme
        if (prefs.theme && themes[prefs.theme]) {
          console.log('Setting theme to:', prefs.theme)
          setCurrentTheme(prefs.theme)
        } else {
          console.log('Invalid theme in preferences, using default')
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      }
    }

    loadPreferences()

    // Listen for preference changes
    const handlePreferenceChange = (_, updatedPrefs) => {
      console.log('Received preference change event with data:', updatedPrefs)
      if (updatedPrefs) {
        // If we received preferences with the event, use them directly
        setPreferences(updatedPrefs)
        
        // Apply theme
        if (updatedPrefs.theme && themes[updatedPrefs.theme]) {
          setCurrentTheme(updatedPrefs.theme)
        }
      } else {
        // Otherwise reload preferences from main process
        loadPreferences()
      }
    }

    window.electron.ipcRenderer.on('preferences-changed', handlePreferenceChange)

    return () => {
      window.electron.ipcRenderer.removeListener('preferences-changed', handlePreferenceChange)
    }
  }, [])

  useEffect(() => {
    // Only set up listeners once
    if (listenersSetupRef.current) return
    listenersSetupRef.current = true

    // Set up console output listeners
    const logListener = (_, args) => {
      console.log('Received console log:', args)
      setLogs(prev => [...prev, { type: 'log', content: Array.isArray(args) ? args.join(' ') : args }])
    }
    
    const errorListener = (_, args) => {
      console.log('Received console error:', args)
      setLogs(prev => [...prev, { type: 'error', content: Array.isArray(args) ? args.join(' ') : args }])
    }
    
    const warnListener = (_, args) => {
      console.log('Received console warn:', args)
      setLogs(prev => [...prev, { type: 'warn', content: Array.isArray(args) ? args.join(' ') : args }])
    }
    
    const infoListener = (_, args) => {
      console.log('Received console info:', args)
      setLogs(prev => [...prev, { type: 'info', content: Array.isArray(args) ? args.join(' ') : args }])
    }

    // Set up IPC listeners directly
    window.electron.ipcRenderer.on('console-log', logListener)
    window.electron.ipcRenderer.on('console-error', errorListener)
    window.electron.ipcRenderer.on('console-warn', warnListener)
    window.electron.ipcRenderer.on('console-info', infoListener)

    // Listen for new file events
    window.electron.ipcRenderer.on('new-file', () => {
      setCode(defaultCode)
      setLogs([])
    })

    return () => {
      // Clean up listeners
      window.electron.ipcRenderer.removeListener('console-log', logListener)
      window.electron.ipcRenderer.removeListener('console-error', errorListener)
      window.electron.ipcRenderer.removeListener('console-warn', warnListener)
      window.electron.ipcRenderer.removeListener('console-info', infoListener)
      window.electron.ipcRenderer.removeListener('new-file', () => {})
    }
  }, [])

  // Scroll to bottom of console when logs change
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])

  const handleEditorChange = (value) => {
    setCode(value)
  }

  const executeCode = async () => {
    console.log('Executing code:', code.substring(0, 100) + (code.length > 100 ? '...' : ''))
    setLogs([])
    try {
      const result = await window.electron.executeCode(code)
      console.log('Execution result:', result)
      
      if (!result.success) {
        setLogs(prev => [...prev, { type: 'error', content: result.error }])
      } else if (result.result && result.result.type !== 'undefined') {
        let formattedResult
        try {
          formattedResult = parseSerializedData(JSON.stringify(result.result))
        } catch (e) {
          console.error('Error parsing result:', e)
          formattedResult = String(result.result.value || result.result)
        }
        setLogs(prev => [...prev, { type: 'success', content: formattedResult }])
      }
    } catch (error) {
      console.error('Error executing code:', error)
      setLogs(prev => [...prev, { type: 'error', content: error.message || 'Unknown error occurred' }])
    }
  }

  // Toggle theme and update preferences
  const toggleTheme = () => {
    const newTheme = currentTheme === 'one-dark' ? 'dracula' : 'one-dark'
    console.log('Toggling theme to:', newTheme)
    
    // Update local state
    setCurrentTheme(newTheme)
    
    // Update preferences
    const newPreferences = { ...preferences, theme: newTheme }
    setPreferences(newPreferences)
    
    // Save to main process
    console.log('Saving updated preferences after theme toggle:', newPreferences)
    window.electron.preferences.save(newPreferences)
      .then(result => console.log('Save result:', result))
      .catch(err => console.error('Error saving preferences:', err))
  }

  // Get editor extensions based on preferences
  const getEditorExtensions = () => {
    const extensions = [javascript({ jsx: true })]
    
    // Add more extensions based on preferences
    if (preferences.autocomplete) {
      console.log('Autocomplete is enabled')
    } else {
      console.log('Autocomplete is disabled')
    }
    
    return extensions
  }

  return (
    <div className={`app-container theme-${currentTheme}`}>
      <div className="header">
        <div className="title">JavaScript Playground</div>
        <div className="actions">
          <button className="theme-button" onClick={toggleTheme}>
            {currentTheme === 'dracula' ? '☀️' : '🌙'}
          </button>
          <button className="button" onClick={executeCode}>
            Run Code
          </button>
        </div>
      </div>
      <div className="main-content">
        <SplitPane
          split="vertical"
          sizes={sizes}
          onChange={setSizes}
          resizerSize={5}
          minSize={200}
          defaultSizes={[50, 50]}
          sashRender={(index, active) => (
            <div className={`sash-custom ${active ? 'active' : ''}`} />
          )}
        >
          <div className="editor-container">
            <CodeMirror
              value={code}
              height="100%"
              extensions={getEditorExtensions()}
              onChange={handleEditorChange}
              theme={themes[currentTheme].editor}
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
                autocompletion: preferences.autocomplete,
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
              style={{ 
                fontSize: `${preferences.fontSize}px`,
                fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace"
              }}
            />
          </div>
          <div className="console-container" ref={consoleRef}>
            {logs.map((log, index) => (
              <div key={index} className={`log-item log-${log.type}`}>
                {log.content}
              </div>
            ))}
          </div>
        </SplitPane>
      </div>
    </div>
  )
}

export default App
