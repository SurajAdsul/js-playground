import { useState, useEffect } from 'react'
import './assets/css/preferences.css'

function Preferences() {
  const [preferences, setPreferences] = useState({
    fontSize: 16,
    autocomplete: true,
    theme: 'dracula'
  })
  const [isSaved, setIsSaved] = useState(false)

  // Load preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await window.electron.preferences.get()
        console.log('Preferences component loaded prefs:', prefs)
        setPreferences(prefs)
      } catch (error) {
        console.error('Error loading preferences:', error)
      }
    }

    loadPreferences()
  }, [])

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    
    console.log(`Changing ${name} to:`, newValue)
    
    setPreferences(prev => ({
      ...prev,
      [name]: newValue
    }))
    
    setIsSaved(false)
  }

  // Handle number input changes
  const handleNumberChange = (e) => {
    const { name, value } = e.target
    const numValue = parseInt(value, 10)
    
    console.log(`Changing ${name} to:`, numValue)
    
    setPreferences(prev => ({
      ...prev,
      [name]: numValue
    }))
    
    setIsSaved(false)
  }

  // Save preferences and close window
  const savePreferences = async () => {
    try {
      console.log('Saving preferences:', preferences)
      const result = await window.electron.preferences.save(preferences)
      console.log('Save result:', result)
      setIsSaved(true)
      
      // Close the preferences window
      window.electron.ipcRenderer.send('close-preferences')
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  // Save preferences and close window
  const saveAndClosePreferences = async () => {
    try {
      console.log('Saving and closing with preferences:', preferences)
      await window.electron.preferences.save(preferences)
      window.electron.ipcRenderer.send('close-preferences')
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  // Reset preferences to default
  const resetPreferences = async () => {
    try {
      await window.electron.preferences.reset()
      const prefs = await window.electron.preferences.get()
      console.log('Reset to default preferences:', prefs)
      setPreferences(prefs)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (error) {
      console.error('Error resetting preferences:', error)
    }
  }

  return (
    <div className="preferences-container">
      <h2>Preferences</h2>
      
      <div className="preference-section">
        <h3>Editor</h3>
        
        <div className="preference-item">
          <label htmlFor="fontSize">Font Size:</label>
          <input
            type="number"
            id="fontSize"
            name="fontSize"
            min="10"
            max="30"
            value={preferences.fontSize}
            onChange={handleNumberChange}
          />
        </div>
        
        <div className="preference-item">
          <label htmlFor="autocomplete">
            <input
              type="checkbox"
              id="autocomplete"
              name="autocomplete"
              checked={preferences.autocomplete}
              onChange={handleChange}
            />
            Enable Autocomplete
          </label>
        </div>
        
        <div className="preference-item">
          <label htmlFor="theme">Theme:</label>
          <select
            id="theme"
            name="theme"
            value={preferences.theme}
            onChange={handleChange}
          >
            <option value="dracula">Dracula</option>
            <option value="one-dark">One Dark</option>
            <option value="material-ocean">Material Ocean</option>
            <option value="vs-light">Visual Studio Light</option>
          </select>
        </div>
      </div>
      
      <div className="preference-actions">
        {isSaved && <span className="save-message">Preferences saved!</span>}
        <button onClick={resetPreferences} className="reset-button">Reset to Default</button>
        <button onClick={saveAndClosePreferences} className="save-button">Save & Close</button>
      </div>
    </div>
  )
}

export default Preferences 