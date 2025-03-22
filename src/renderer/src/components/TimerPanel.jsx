import React, { useState } from 'react'
import './TimerPanel.css'

const TimerPanel = ({ timerSeconds, isTimerRunning, onToggleTimer, onResetTimer }) => {
  const [isMinimized, setIsMinimized] = useState(false)

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (isMinimized) {
    return (
      <div className="timer-panel minimized" onClick={() => setIsMinimized(false)}>
        <span className="timer-icon">⏱️</span>
      </div>
    )
  }

  return (
    <div className="timer-panel">
      <div className="timer-controls">
        <span className="timer-display">{formatTime(timerSeconds)}</span>
        <button 
          className={`timer-button ${isTimerRunning ? 'active' : ''}`}
          onClick={onToggleTimer}
        >
          {isTimerRunning ? 'Stop' : 'Start'}
        </button>
        <button 
          className="timer-button"
          onClick={onResetTimer}
        >
          Reset
        </button>
        <button 
          className="timer-button minimize"
          onClick={() => setIsMinimized(true)}
        >
          −
        </button>
      </div>
    </div>
  )
}

export default TimerPanel 