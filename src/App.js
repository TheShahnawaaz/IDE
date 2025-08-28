import React, { useContext, useState, useRef } from 'react';
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
  
  // Resizable main container width (persisted)
  const [mainWidth, setMainWidth] = useState(() => {
    const saved = localStorage.getItem("ide_main_width");
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const defaultWidth = Math.min(1400, viewportWidth - 32);
    return saved ? parseInt(saved, 10) : defaultWidth;
  });
  const isDraggingMain = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleMainDragStart = (e) => {
    isDraggingMain.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = mainWidth;
    document.addEventListener("mousemove", handleMainDragMove);
    document.addEventListener("mouseup", handleMainDragEnd);
    document.body.classList.add("resize-x");
  };

  const handleMainDragMove = (e) => {
    if (!isDraggingMain.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const viewportWidth = window.innerWidth;
    const maxWidth = viewportWidth; // allow up to full viewport width
    const minWidth = 800; // minimum comfortable width
    const newWidth = Math.max(minWidth, Math.min(maxWidth, dragStartWidth.current + deltaX));
    setMainWidth(newWidth);
  };

  const handleMainDragEnd = () => {
    isDraggingMain.current = false;
    document.removeEventListener("mousemove", handleMainDragMove);
    document.removeEventListener("mouseup", handleMainDragEnd);
    localStorage.setItem("ide_main_width", mainWidth.toString());
    document.body.classList.remove("resize-x");
  };

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
      <main className="flex-grow flex justify-center">
        <div
          className="p-4 w-full max-w-none"
          style={{ width: `${mainWidth}px` }}
        >
          <IDETab topic="general" />
        </div>
        <div
          onMouseDown={handleMainDragStart}
          className="w-1 bg-gray-300 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-700 cursor-col-resize transition-colors"
          title="Drag to resize main area"
        />
      </main>
      <footer className="bg-gray-800 dark:bg-gray-900 py-4 border-t border-gray-700">
        <div className="container mx-auto text-center">
          <p className="text-gray-300">
            Made with <span className="text-red-500">❤️</span> by{' '}
            <a
              href="https://github.com/TheShahnawaaz/"
              className="text-orange-400 font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              Shahnawaz
            </a>
          </p>
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