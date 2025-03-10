import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { dracula } from '@uiw/codemirror-theme-dracula'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useRef, useState, useMemo } from 'react'
import SplitPane from 'split-pane-react'
import 'split-pane-react/esm/themes/default.css'
import PackageManager from './components/PackageManager'
import ErrorBoundary from './components/ErrorBoundary'
import { materialOcean } from './themes/materialOcean'
import { vsLight } from './themes/vsLight'
import Preferences from './Preferences'

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

// Helper function to parse serialized data
function parseSerializedData(data) {
  try {
    console.log('parseSerializedData input:', data); // Debug log
    const parsed = JSON.parse(data);
    console.log('parseSerializedData parsed:', parsed); // Debug log
    
    if (parsed.type === 'undefined') {
      return 'undefined';
    }
    
    if (parsed.type === 'null') {
      return 'null';
    }
    
    if (parsed.type === 'boolean') {
      return parsed.value.toString();
    }
    
    if (parsed.type === 'string' || parsed.type === 'number') {
      return parsed.value;
    }
    
    if (parsed.type === 'function' || parsed.type === 'symbol' || parsed.type === 'bigint') {
      return parsed.value;
    }
    
    if (parsed.type === 'array') {
      return `[${parsed.value.map(item => parseSerializedData(JSON.stringify(item))).join(', ')}]`;
    }
    
    if (parsed.type === 'object') {
      const entries = Object.entries(parsed.value).map(([key, value]) => {
        return `${key}: ${parseSerializedData(JSON.stringify(value))}`;
      });
      return `{${entries.join(', ')}}`;
    }
    
    return JSON.stringify(parsed);
  } catch (e) {
    console.error('parseSerializedData error:', e); // Debug log
    return data;
  }
}

function App() {
  const [code, setCode] = useState(defaultCode)
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
    
    // Handle preference changes from other windows
    const handlePreferenceChange = (_, updatedPrefs) => {
      console.log('Preferences changed:', updatedPrefs)
      setPreferences(updatedPrefs)
      
      // Apply theme
      if (updatedPrefs.theme && themes[updatedPrefs.theme]) {
        console.log('Setting theme to:', updatedPrefs.theme)
        setCurrentTheme(updatedPrefs.theme)
      }
    }
    
    window.electron.ipcRenderer.on('preferences-changed', handlePreferenceChange)
    
    return () => {
      window.electron.ipcRenderer.removeListener('preferences-changed', handlePreferenceChange)
    }
  }, [])
  
  // Set up console listeners
  useEffect(() => {
    // Remove any existing listeners to prevent duplicates
    window.electron.ipcRenderer.removeAllListeners('console-log');
    window.electron.ipcRenderer.removeAllListeners('console-error');
    window.electron.ipcRenderer.removeAllListeners('console-warn');
    window.electron.ipcRenderer.removeAllListeners('console-info');
    
    const logListener = (_, args) => {
      // Use a functional update to ensure we're working with the latest state
      setLogs(prevLogs => {
        // Only add the log if it's not a duplicate of the last log
        const lastLog = prevLogs[prevLogs.length - 1];
        if (lastLog && lastLog.type === 'log' && lastLog.content === args.join(' ')) {
          return prevLogs; // Skip duplicate
        }
        return [...prevLogs, { type: 'log', content: args.join(' ') }];
      });
    };
    
    const errorListener = (_, args) => {
      setLogs(prevLogs => {
        const lastLog = prevLogs[prevLogs.length - 1];
        if (lastLog && lastLog.type === 'error' && lastLog.content === args.join(' ')) {
          return prevLogs;
        }
        return [...prevLogs, { type: 'error', content: args.join(' ') }];
      });
    };
    
    const warnListener = (_, args) => {
      setLogs(prevLogs => {
        const lastLog = prevLogs[prevLogs.length - 1];
        if (lastLog && lastLog.type === 'warn' && lastLog.content === args.join(' ')) {
          return prevLogs;
        }
        return [...prevLogs, { type: 'warn', content: args.join(' ') }];
      });
    };
    
    const infoListener = (_, args) => {
      setLogs(prevLogs => {
        const lastLog = prevLogs[prevLogs.length - 1];
        if (lastLog && lastLog.type === 'info' && lastLog.content === args.join(' ')) {
          return prevLogs;
        }
        return [...prevLogs, { type: 'info', content: args.join(' ') }];
      });
    };
    
    window.electron.ipcRenderer.on('console-log', logListener);
    window.electron.ipcRenderer.on('console-error', errorListener);
    window.electron.ipcRenderer.on('console-warn', warnListener);
    window.electron.ipcRenderer.on('console-info', infoListener);
    
    listenersSetupRef.current = true;
    
    return () => {
      window.electron.ipcRenderer.removeListener('console-log', logListener);
      window.electron.ipcRenderer.removeListener('console-error', errorListener);
      window.electron.ipcRenderer.removeListener('console-warn', warnListener);
      window.electron.ipcRenderer.removeListener('console-info', infoListener);
      
      listenersSetupRef.current = false;
    };
  }, []);
  
  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])

  const handleEditorChange = (value) => {
    setCode(value)
  }

  const executeCode = async () => {
    try {
      // Clear logs and add initial message
      setLogs([]);
      
      // Execute the code
      const result = await window.electron.executeCode(code);
      console.log('Execution result:', result); // Debug log
      
      // Handle the result
      if (!result.success) {
        setLogs(prev => [...prev, { type: 'error', content: result.error }]);
      } else if (result.result !== undefined && result.result.type !== 'undefined') {
        // Only display the result if it exists and is not undefined
        console.log('Raw result:', result.result); // Debug log
        const serializedData = JSON.stringify(result.result);
        console.log('Serialized data:', serializedData); // Debug log
        const serializedResult = parseSerializedData(serializedData);
        console.log('Parsed result:', serializedResult); // Debug log
        setLogs(prev => [...prev, { type: 'result', content: String(serializedResult) }]);
      }
    } catch (error) {
      console.error('Execution error:', error); // Debug log
      setLogs(prev => [...prev, { type: 'error', content: error.message }]);
    }
  };

  const toggleTheme = () => {
    // Toggle between dracula and vs-light
    const newTheme = currentTheme === 'vs-light' ? 'dracula' : 'vs-light'
    
    setCurrentTheme(newTheme)
    
    // Update preferences
    const updatedPreferences = {
      ...preferences,
      theme: newTheme
    }
    
    setPreferences(updatedPreferences)
    window.electron.preferences.save(updatedPreferences)
  }
  
  const openPreferences = () => {
    console.log('Opening preferences modal');
    setShowPreferences(true);
  }

  const closePreferences = () => {
    console.log('Closing preferences modal');
    setShowPreferences(false);
  }

  const savePreferences = (newPreferences) => {
    console.log('Saving preferences:', newPreferences);
    setPreferences(newPreferences);
    setCurrentTheme(newPreferences.theme);
    window.electron.preferences.save(newPreferences)
      .then(() => {
        console.log('Preferences saved successfully');
      })
      .catch(error => {
        console.error('Error saving preferences:', error);
      });
  }

  const getEditorExtensions = () => {
    const extensions = [javascript()]
    return extensions
  }

  const togglePackageManager = () => {
    setShowPackageManager(prev => !prev)
  }

  // Keep logsRef in sync with logs state
  useEffect(() => {
    logsRef.current = logs
  }, [logs])
  
  // Expose current theme to window object for IPC communication
  useEffect(() => {
    window.getCurrentTheme = () => currentTheme;
    return () => {
      delete window.getCurrentTheme;
    };
  }, [currentTheme]);

  // Listen for open-preferences-from-menu event
  useEffect(() => {
    const handleOpenPreferencesFromMenu = () => {
      console.log('Received open-preferences-from-menu event');
      setShowPreferences(true);
    };
    
    window.electron.ipcRenderer.on('open-preferences-from-menu', handleOpenPreferencesFromMenu);
    
    return () => {
      window.electron.ipcRenderer.removeListener('open-preferences-from-menu', handleOpenPreferencesFromMenu);
    };
  }, []);

  // Listen for open-preferences-in-app event
  useEffect(() => {
    const handleOpenPreferences = () => {
      console.log('Received open-preferences-in-app event');
      setShowPreferences(true);
    };
    
    window.electron.ipcRenderer.on('open-preferences-in-app', handleOpenPreferences);
    
    return () => {
      window.electron.ipcRenderer.removeListener('open-preferences-in-app', handleOpenPreferences);
    };
  }, []);

  // Set up the clear-console listener

  return (
    <div className={`app-container theme-${currentTheme}`}>
      <div className="header">
        <div className="title">JavaScript Playground</div>
        <div className="actions">
          {/* <button className="theme-button" onClick={toggleTheme}>
            {currentTheme === 'dracula' || currentTheme === 'material-ocean' || currentTheme === 'one-dark' ? '☀️' : '🌙'}
          </button> */}
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
