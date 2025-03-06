import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/css/styles.css'

// Render the App component directly without routing
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
