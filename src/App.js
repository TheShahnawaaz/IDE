import React, { useContext } from 'react';
import { ThemeProvider, ThemeContext } from './contexts/ThemeContext';
import IDETab from './components/IDETab';
import ThemeToggle from './components/ThemeToggle';
import './App.css';

// Create a component for the content to access theme context
function AppContent() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  // Get the app name from environment variables or use a default
  const appName = process.env.REACT_APP_APP_NAME || "Code Playground";
  
  return (
    <div className="App dark:bg-gray-900 min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4">
        <div className="max-w-[1150px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src={isDark ? "/images/logo-web-dark.png" : "/images/logo-web.png"}
              alt="CodeIDE Logo" 
              className="h-8 w-auto"
            />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{appName}</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto p-4 max-w-[1200px] flex-grow">
        <IDETab topic="general" />
      </main>
      <footer className="bg-gray-800 dark:bg-gray-900 py-4 border-t border-gray-700">
        <div className="container mx-auto text-center">
          <p className="text-gray-300">Made with <span className="text-red-500">❤️</span> by <span className="text-orange-400 font-medium">Shahnawaz</span></p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App; 