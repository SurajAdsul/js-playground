import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Preferences from './Preferences'
import './assets/css/styles.css'

// Simple routing based on hash
function Router() {
  const [route, setRoute] = React.useState(window.location.hash || '')

  React.useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Render component based on route
  if (route === '#/preferences') {
    return <Preferences />
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
)
