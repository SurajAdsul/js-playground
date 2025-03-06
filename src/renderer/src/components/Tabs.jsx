import { useState } from 'react'
import './Tabs.css'

function Tabs({ tabs, activeTab, onTabChange, onTabClose, onNewTab }) {
  return (
    <div className="tabs-container">
      <div className="tabs">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-title">{tab.title || `Tab ${index + 1}`}</span>
            {tabs.length > 1 && (
              <button
                className="close-tab"
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.id)
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button className="new-tab" onClick={onNewTab}>
          +
        </button>
      </div>
    </div>
  )
}

export default Tabs
