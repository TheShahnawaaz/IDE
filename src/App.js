import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import IDETab from './components/IDETab';
import ThemeToggle from './components/ThemeToggle';
import './App.css';

function App() {
  // Get the app name from environment variables or use a default
  const appName = process.env.REACT_APP_APP_NAME || "Code Playground";
  
  return (
    <ThemeProvider>
      <div className="App dark:bg-gray-900 min-h-screen flex flex-col">
        <header className="bg-white dark:bg-gray-800 shadow-md p-4">
          <div className="max-w-[1150px] mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{appName}</h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto p-4 max-w-[1200px] flex-grow">
          <IDETab topic="general" />
        </main>
        <footer className="bg-gray-800 dark:bg-gray-900 py-4 border-t border-gray-700">
          <div className="container mx-auto text-center">
            <p className="text-gray-300">Made with <span className="text-red-500">❤️</span> by <a href="https://www.instagram.com/theshahnawaaz/" target="_blank" rel="noopener noreferrer" className="text-orange-400 font-medium hover:text-orange-300">Shahnawaz</a></p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App; 