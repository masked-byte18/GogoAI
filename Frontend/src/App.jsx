import { useState, useEffect } from 'react'
import './App.css'
import './styles/theme-dark.css'
import './styles/theme-light.css'
import AppRoutes from './AppRoutes'

function App() {
  // Check localStorage first, otherwise fallback to system theme
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme to HTML tag and save to storage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Listen to system theme changes (if user hasn't toggled manually recently/overridden)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      // Only swap if we want system to strictly override when it changes
      // If we don't want system to override user's explicitly clicked button,
      // we could remove this. But since you want it to act on system theme,
      // this ensures if they flip their OS settings, the site flips too!
      setTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <button 
        className="theme-toggle-fixed" 
        onClick={toggleTheme}
        aria-label="Toggle Theme"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <AppRoutes/>
    </>
  )
}

export default App
