import { useState, useEffect } from 'react'
import './PackageManager.css'

function PackageManager({ onClose }) {
  const [packages, setPackages] = useState({})
  const [newPackage, setNewPackage] = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusMessages, setStatusMessages] = useState([])
  const [isInstalling, setIsInstalling] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(true)

  // Check if the packages API is available
  useEffect(() => {
    const checkApiAvailability = () => {
      const isAvailable = !!(window.electron && window.electron.packages && typeof window.electron.packages.get === 'function')
      console.log('Packages API available:', isAvailable)
      setApiAvailable(isAvailable)
      
      if (!isAvailable) {
        setError('Package management API is not available. Please restart the application.')
        setLoading(false)
      }
    }
    
    checkApiAvailability()
    // Don't return anything from this useEffect
  }, [])

  // Load installed packages on component mount
  useEffect(() => {
    if (!apiAvailable) return

    const loadPackages = async () => {
      try {
        setLoading(true)
        console.log('Window electron object:', window.electron)
        console.log('Packages API:', window.electron?.packages)
        
        if (!window.electron || !window.electron.packages) {
          throw new Error('Packages API not available')
        }
        
        try {
          const installedPackages = await window.electron.packages.get()
          console.log('Installed packages:', installedPackages)
          setPackages(installedPackages || {})
          setError(null)
        } catch (apiError) {
          console.error('Error calling packages.get():', apiError)
          setError('Failed to load packages: ' + apiError.message)
          setPackages({})
        }
      } catch (err) {
        console.error('Error loading packages:', err)
        setError('Failed to load packages: ' + err.message)
        setPackages({})
      } finally {
        setLoading(false)
      }
    }

    loadPackages()

    // Listen for package installation status updates
    const handlePackageStatus = (_, status) => {
      setStatusMessages(prev => [...prev, status.message])
      
      if (status.status === 'installed' || status.status === 'uninstalled' || status.status === 'error') {
        // Refresh package list after installation/uninstallation
        if (status.status === 'installed' || status.status === 'uninstalled') {
          loadPackages()
        }
        
        // Reset installing state
        setIsInstalling(false)
      }
    }

    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on('package-install-status', handlePackageStatus)
      
      return () => {
        window.electron.ipcRenderer.removeListener('package-install-status', handlePackageStatus)
      }
    }
  }, [apiAvailable])

  const handleInstall = async (e) => {
    e.preventDefault()
    
    if (!apiAvailable) {
      setError('Package management API is not available')
      return
    }
    
    if (!newPackage.trim()) {
      setError('Please enter a package name')
      return
    }
    
    try {
      setError(null)
      setIsInstalling(true)
      
      // Clear previous status messages
      setStatusMessages([])
      
      await window.electron.packages.install(newPackage.trim(), newVersion.trim() || undefined)
      
      // Reset form
      setNewPackage('')
      setNewVersion('')
    } catch (err) {
      setError('Failed to install package: ' + err.message)
      setIsInstalling(false)
    }
  }

  const handleUninstall = async (packageName) => {
    if (!apiAvailable) {
      setError('Package management API is not available')
      return
    }
    
    if (!confirm(`Are you sure you want to uninstall ${packageName}?`)) {
      return
    }
    
    try {
      setError(null)
      setIsInstalling(true)
      
      // Clear previous status messages
      setStatusMessages([])
      
      await window.electron.packages.uninstall(packageName)
    } catch (err) {
      setError('Failed to uninstall package: ' + err.message)
      setIsInstalling(false)
    }
  }

  return (
    <div className="package-manager">
      <div className="package-manager-header">
        <h2>Package Manager</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="package-manager-content">
        <form onSubmit={handleInstall} className="package-form">
          <div className="form-row">
            <input
              type="text"
              placeholder="Package name (e.g., lodash)"
              value={newPackage}
              onChange={(e) => setNewPackage(e.target.value)}
              disabled={isInstalling}
            />
            <input
              type="text"
              placeholder="Version (optional)"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              disabled={isInstalling}
            />
            <button type="submit" disabled={isInstalling || !newPackage.trim()}>
              {isInstalling ? 'Installing...' : 'Install'}
            </button>
          </div>
        </form>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="status-messages">
          {statusMessages.map((message, index) => (
            <div key={index} className="status-message">{message}</div>
          ))}
        </div>
        
        <h3>Installed Packages</h3>
        {loading ? (
          <div className="loading">Loading packages...</div>
        ) : Object.keys(packages).length === 0 ? (
          <div className="no-packages">No packages installed</div>
        ) : (
          <table className="packages-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(packages).map(([name, version]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{version}</td>
                  <td>
                    <button 
                      onClick={() => handleUninstall(name)}
                      disabled={isInstalling}
                      className="uninstall-button"
                    >
                      Uninstall
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        <div className="usage-info">
          <h3>How to Use Packages</h3>
          <pre>
            {`// Example: Using a package in your code
const _ = require('lodash');
console.log(_.chunk([1, 2, 3, 4], 2));`}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default PackageManager 