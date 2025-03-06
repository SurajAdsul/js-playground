import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { dracula } from '@uiw/codemirror-theme-dracula'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useRef, useState } from 'react'
import SplitPane from 'split-pane-react'
import 'split-pane-react/esm/themes/default.css'
import PackageManager from './components/PackageManager'
import ErrorBoundary from './components/ErrorBoundary'
import { materialOcean } from './themes/materialOcean'
import { vsLight } from './themes/vsLight'
import Preferences from './Preferences'
import Tabs from './components/Tabs'
import './App.css'

const defaultCode = `// Write your JavaScript code here
console.log('Hello, World!');

// Try some math
const result = 10 + 20;
console.log('10 + 20 =', result);

// Or use some ES6 features
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled numbers:', doubled);

// You can also use npm packages
// Example (after installing lodash):
// const _ = require('lodash');
// console.log(_.chunk([1, 2, 3, 4], 2));`

// Define themes
const themes = {
  'one-dark': {
    name: 'One Dark',
    editor: oneDark,
  },
  'dracula': {
    name: 'Dracula',
    editor: dracula,
  },
  'material-ocean': {
    name: 'Material Ocean',
    editor: materialOcean,
  },
  'vs-light': {
    name: 'Visual Studio Light',
    editor: vsLight,
  }
}

function App() {
  const [tabs, setTabs] = useState([
    { id: 1, title: 'Tab 1', code: defaultCode }
  ])
  const [activeTab, setActiveTab] = useState(1)
  const [logs, setLogs] = useState([])
  const [currentTheme, setCurrentTheme] = useState('dracula')
  const consoleRef = useRef(null)
  const [sizes, setSizes] = useState([50, 50])
  const listenersSetupRef = useRef(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const logsRef = useRef([])
  const [preferences, setPreferences] = useState({
    fontSize: 16,
    autocomplete: true,
    theme: 'dracula'
  })
  const [showPackageManager, setShowPackageManager] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)

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
  }, [])

  // Set up console listeners
  useEffect(() => {
    // Remove any existing listeners to prevent duplicates
    window.electron.ipcRenderer.removeAllListeners('console-log')
    window.electron.ipcRenderer.removeAllListeners('console-error')
    window.electron.ipcRenderer.removeAllListeners('console-warn')
    window.electron.ipcRenderer.removeAllListeners('console-info')
    
    const logListener = (_, args) => {
      setLogs(prevLogs => [...prevLogs, { type: 'log', content: args[0] }])
    }
    
    const errorListener = (_, args) => {
      setLogs(prevLogs => [...prevLogs, { type: 'error', content: args[0] }])
    }
    
    const warnListener = (_, args) => {
      setLogs(prevLogs => [...prevLogs, { type: 'warn', content: args[0] }])
    }
    
    const infoListener = (_, args) => {
      setLogs(prevLogs => [...prevLogs, { type: 'info', content: args[0] }])
    }
    
    window.electron.ipcRenderer.on('console-log', logListener)
    window.electron.ipcRenderer.on('console-error', errorListener)
    window.electron.ipcRenderer.on('console-warn', warnListener)
    window.electron.ipcRenderer.on('console-info', infoListener)
    
    return () => {
      window.electron.ipcRenderer.removeListener('console-log', logListener)
      window.electron.ipcRenderer.removeListener('console-error', errorListener)
      window.electron.ipcRenderer.removeListener('console-warn', warnListener)
      window.electron.ipcRenderer.removeListener('console-info', infoListener)
    }
  }, [])

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])

  const handleEditorChange = (value) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTab ? { ...tab, code: value } : tab
      )
    )
  }

  const handleNewTab = () => {
    const newId = Math.max(...tabs.map(tab => tab.id)) + 1
    setTabs(prevTabs => [...prevTabs, { id: newId, title: `Tab ${newId}`, code: "" }])
    setActiveTab(newId)
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
  }

  const handleTabClose = (tabId) => {
    if (tabs.length > 1) {
      setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId))
      if (activeTab === tabId) {
        const remainingTabs = tabs.filter(tab => tab.id !== tabId)
        setActiveTab(remainingTabs[0].id)
      }
    }
  }

  const executeCode = async () => {
    try {
      setIsExecuting(true)
      // Clear logs before execution
      setLogs([])
      
      // Get the code from the active tab
      const activeTabCode = tabs.find(tab => tab.id === activeTab)?.code || ''
      
      // Execute the code
      const result = await window.electron.executeCode(activeTabCode)
      
      // Handle the result
      if (result.success) {
        if (result.result !== undefined) {
          setLogs(prev => [...prev, { type: 'result', content: result.result }])
        }
      } else {
        setLogs(prev => [...prev, { type: 'error', content: result.error }])
      }
    } catch (error) {
      setLogs(prev => [...prev, { type: 'error', content: error.message }])
    } finally {
      setIsExecuting(false)
    }
  }

  const togglePackageManager = () => {
    setShowPackageManager(prev => !prev)
  }

  const openPreferences = () => {
    setShowPreferences(true)
  }

  const closePreferences = () => {
    setShowPreferences(false)
  }

  const savePreferences = (newPreferences) => {
    setPreferences(newPreferences)
    setCurrentTheme(newPreferences.theme)
    window.electron.preferences.save(newPreferences)
  }

  const getEditorExtensions = () => {
    return [javascript()]
  }

  return (
    <div className={`app-container theme-${currentTheme}`}>
      <div className="header">
        <div className="title">JavaScript Playground</div>
        <div className="actions">
          <button className="button" onClick={executeCode} disabled={isExecuting}>
            {isExecuting ? 'Running...' : 'Run Code'}
          </button>
          <button className="button" onClick={togglePackageManager}>
            Packages
          </button>
          <button className="button" onClick={openPreferences}>
            Preferences
          </button>
        </div>
      </div>
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />
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
              value={tabs.find(tab => tab.id === activeTab)?.code || ''}
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
                {log.type === 'error' && <span className="log-type">Error: </span>}
                {log.type === 'warn' && <span className="log-type">Warning: </span>}
                {log.type === 'info' && <span className="log-type">Info: </span>}
                {log.type === 'result' && <span className="log-type">Result: </span>}
                <span className="log-content">{log.content}</span>
              </div>
            ))}
          </div>
        </SplitPane>
      </div>
      
      {showPackageManager && (
        <ErrorBoundary>
          <PackageManager 
            onClose={togglePackageManager} 
            currentTheme={currentTheme} 
          />
        </ErrorBoundary>
      )}
      
      {showPreferences && (
        <ErrorBoundary>
          <div className="modal-overlay">
            <Preferences 
              initialPreferences={preferences}
              currentTheme={currentTheme}
              onClose={closePreferences}
              onSave={savePreferences}
            />
          </div>
        </ErrorBoundary>
      )}
    </div>
  )
}

export default App 