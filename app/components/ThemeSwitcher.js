"use client";

import { useEffect, useState } from 'react';

export default function ThemeSwitcher({currentTheme, setCurrentTheme, themeGroups}) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

 
  
  useEffect(() => {
    // Get the current theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    
    // Apply theme directly to HTML element
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    setMounted(true);
    
    // Close dropdown when clicking outside
    function handleClickOutside(event) {
      if (!event.target.closest('.theme-dropdown')) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Theme change handler with direct application
  const changeTheme = (theme) => {
    console.log("Changing theme to:", theme);
    
    // Apply theme directly to HTML element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Store in localStorage
    localStorage.setItem('theme', theme);
    
    // Update state
    setCurrentTheme(theme);
    setIsOpen(false);
    
    // Add a notification message
    showThemeNotification(theme);
  };
  
  // Show temporary notification when theme changes
  const showThemeNotification = (theme) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-success text-success-content px-4 py-2 rounded shadow-lg z-50 animate-fadeIn';
    notification.textContent = `Theme changed to ${theme}`;
    
    // Append to body
    document.body.appendChild(notification);
    
    // Remove after 2 seconds
    setTimeout(() => {
      notification.classList.add('animate-fadeOut');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 2000);
  };
  
  if (!mounted) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 theme-dropdown">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="btn btn-circle btn-primary"
        aria-label="Change theme"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
        </svg>
      </button>
      
      {isOpen && (
        <div className="card bg-base-200 absolute bottom-14 right-0 w-64 shadow-xl">
          <div className="card-body p-2">
            <div className="text-sm font-bold px-2 py-1">Current Theme: {currentTheme}</div>
            <div className="max-h-96 overflow-y-auto p-1">
              {Object.entries(themeGroups).map(([groupName, themes]) => (
                <div key={groupName} className="mb-2">
                  <div className="text-xs opacity-70 px-2 mb-1">{groupName}</div>
                  {themes.map(theme => (
                    <button
                      key={theme}
                      className={`flex w-full items-center px-2 py-1 rounded hover:bg-base-300 ${
                        currentTheme === theme ? "bg-base-300 border border-primary" : ""
                      }`}
                      onClick={() => changeTheme(theme)}
                    >
                      <div className="flex gap-2 items-center">
                        <div className="flex gap-1">
                          <div data-theme={theme} className="border border-base-content/20 rounded-full p-1 w-6 h-6 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-primary"></div>
                          </div>
                        </div>
                        <span className="text-sm">{theme}</span>
                        {currentTheme === theme && (
                          <span className="ml-auto text-primary">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}