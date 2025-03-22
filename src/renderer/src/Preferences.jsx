import { useState, useEffect } from 'react'
import './assets/css/preferences.css'

function Preferences({ initialPreferences, currentTheme, onClose, onSave }) {
  const [preferences, setPreferences] = useState(initialPreferences || {
    fontSize: 16,
    autocomplete: true,
    theme: 'dracula',
    showTimer: true
  })
  const [isSaved, setIsSaved] = useState(false)

  // Log component mount for debugging
  useEffect(() => {
    console.log('Preferences component mounted as modal');
    console.log('Initial preferences:', initialPreferences);
    console.log('Current theme:', currentTheme);
    
    return () => {
      console.log('Preferences component unmounted');
    };
  }, [initialPreferences, currentTheme]);

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

  // Save preferences
  const savePreferences = async () => {
    try {
      console.log('Saving preferences:', preferences)
      setIsSaved(true)
      
      // Call the onSave callback
      if (onSave) {
        onSave(preferences)
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  // Save preferences and close
  const saveAndClosePreferences = async () => {
    try {
      await savePreferences()
      
      // Call the onClose callback
      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  // Reset preferences to default
  const resetPreferences = async () => {
    try {
      const defaultPrefs = {
        fontSize: 16,
        autocomplete: true,
        theme: 'dracula',
        showTimer: true
      }
      
      setPreferences(defaultPrefs)
      setIsSaved(true)
      
      // Call the onSave callback with default preferences
      if (onSave) {
        onSave(defaultPrefs)
      }
    } catch (error) {
      console.error('Error resetting preferences:', error)
    }
  }

  return (
    <div className={`preferences-container theme-${currentTheme}`}>
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
        
        <div className="preference-item">
          <label htmlFor="showTimer">
            <input
              type="checkbox"
              id="showTimer"
              name="showTimer"
              checked={preferences.showTimer}
              onChange={handleChange}
            />
            Show Timer Panel
          </label>
        </div>
      </div>
      
      <div className="preference-actions">
        {isSaved && <span className="save-message">Preferences saved!</span>}
        <button onClick={resetPreferences} className="reset-button">Reset to Default</button>
        <button onClick={saveAndClosePreferences} className="save-button">Save & Close</button>
        <button onClick={onClose} className="cancel-button">Cancel</button>
      </div>
    </div>
  )
}

export default Preferences 