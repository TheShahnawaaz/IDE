import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../contexts/ThemeContext";
import {
  PlayIcon,
  DocumentPlusIcon,
  FolderOpenIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  CodeBracketIcon,
  Bars3Icon,
  PlusCircleIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  BeakerIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import Editor from "@monaco-editor/react";
import FileExplorer from "./FileExplorer";

// Import Prism core (using Monaco instead)
// Removing CSS imports that were causing issues

const IDETab = ({ topic }) => {
  const { theme } = useContext(ThemeContext);
  const [judgeLanguages, setJudgeLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(
    theme === "dark" ? "vs-dark" : "light"
  );

  // File explorer state
  const [workspace, setWorkspace] = useState(() => {
    const savedWorkspace = localStorage.getItem("ide_workspace");
    if (savedWorkspace) {
      try {
        return JSON.parse(savedWorkspace);
      } catch (e) {
        console.error("Failed to parse saved workspace", e);
      }
    }
    // Default workspace structure
    return {
      id: "root",
      name: "Workspace",
      type: "folder",
      children: [
        {
          id: "archive",
          name: "Archive",
          type: "folder",
          children: [],
        },
        {
          id: "file1",
          name: "main.cpp",
          type: "file",
          content: `#include <bits/stdc++.h>

using namespace std;

int main() {
    // Your code here
    cout << "Hello, World!" << endl;
    
    // Input example
    // int n;
    // cin >> n;
    
    // Vector example
    // vector<int> numbers(n);
    // for(int i = 0; i < n; i++) {
    //     cin >> numbers[i];
    // }
    
    return 0;
}`,
        },
        {
          id: "readme",
          name: "README.md",
          type: "file",
          content:
            "# Welcome to Web IDE\n\n## Getting Started\n\nThis is your personal coding workspace. Here are some quick tips to help you get started:\n\n### File Management\n- Create new files using the + button in the toolbar\n- Organize your work in folders via right-click menu\n- Use the Archive folder for files you want to keep but aren't actively working on\n\n### Writing & Running Code\n- Write your code in the editor\n- Select a language from the dropdown menu\n- Run your code with the ▶ button or press F5\n- View results in the console output panel\n\n### Test Cases\n- Create test cases with inputs and expected outputs\n- Run individual test cases with the Run button\n- Run all test cases to verify your solution works for all scenarios\n\nFor more detailed information, check out the Help section or refer to our documentation.\n\nEnjoy coding!",
        },
      ],
    };
  });

  // Multiple files state with localStorage persistence
  const [files, setFiles] = useState(() => {
    const savedFiles = localStorage.getItem("ide_files");
    if (savedFiles) {
      try {
        return JSON.parse(savedFiles);
      } catch (e) {
        console.error("Failed to parse saved files", e);
      }
    }
    // Default state if nothing in localStorage
    return [
      {
        id: "file1",
        name: "main.cpp",
        content: `#include <bits/stdc++.h>

using namespace std;

int main() {
    // Your code here
    cout << "Hello, World!" << endl;
    
    // Input example
    // int n;
    // cin >> n;
    
    // Vector example
    // vector<int> numbers(n);
    // for(int i = 0; i < n; i++) {
    //     cin >> numbers[i];
    // }
    
    return 0;
}`,
        language: "cpp",
        languageId: null,
      },
    ];
  });

  const [activeFileId, setActiveFileId] = useState(() => {
    const savedActiveFileId = localStorage.getItem("ide_active_file_id");
    return savedActiveFileId || "file1";
  });

  // Add split editor state
  const [isSplitView, setIsSplitView] = useState(() => {
    const savedSplitView = localStorage.getItem("ide_split_view");
    return savedSplitView ? JSON.parse(savedSplitView) : false;
  });

  const [secondaryFileId, setSecondaryFileId] = useState(() => {
    const savedSecondaryFileId = localStorage.getItem("ide_secondary_file_id");
    return savedSecondaryFileId || null;
  });

  const [splitRatio, setSplitRatio] = useState(() => {
    const savedSplitRatio = localStorage.getItem("ide_split_ratio");
    return savedSplitRatio ? parseFloat(savedSplitRatio) : 0.5;
  });

  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const splitterDragStartX = useRef(0);
  const splitterDragStartRatio = useRef(0.5);

  // Refs for the editors
  const primaryEditorRef = useRef(null);
  const secondaryEditorRef = useRef(null);
  const primaryMonacoRef = useRef(null);
  const secondaryMonacoRef = useRef(null);

  const [input, setInput] = useState(() => {
    const savedInput = localStorage.getItem("ide_input");
    return savedInput || "";
  });

  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const savedActiveTab = localStorage.getItem("ide_active_tab");
    return savedActiveTab || "console";
  });
  const [editingFile, setEditingFile] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [isExplorerVisible, setIsExplorerVisible] = useState(() => {
    const savedValue = localStorage.getItem("ide_explorer_visible");
    return savedValue !== null ? JSON.parse(savedValue) : true;
  });

  const fileNameInputRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Get active file
  const activeFile = files.find((file) => file.id === activeFileId) || files[0];
  const secondaryFile = secondaryFileId
    ? files.find((file) => file.id === secondaryFileId)
    : null;

  // Judge0 API settings - use environment variables
  const api_url =
    process.env.REACT_APP_JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
  const headers = {
    "Content-Type": "application/json",
    "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
    "x-rapidapi-key": process.env.REACT_APP_RAPIDAPI_KEY || "YOUR_RAPIDAPI_KEY",
  };

  // Monaco editor themes
  const editorThemes = [
    { label: "Light", value: "light" },
    { label: "Dark", value: "vs-dark" },
    { label: "High Contrast", value: "hc-black" },
  ];

  // Map Judge0 language ID to Monaco language ID
  const languageMap = {
    // C and C++
    c: "c",
    cpp: "cpp",
    // Java
    java: "java",
    // Python
    python: "python",
    // JavaScript
    javascript: "javascript",
    // C#
    csharp: "csharp",
    // Go
    go: "go",
    // Ruby
    ruby: "ruby",
    // Rust
    rust: "rust",
    // PHP
    php: "php",
    // Default
    default: "plaintext",
  };

  // Add state for resizable panels
  const [explorerWidth, setExplorerWidth] = useState(() => {
    const savedWidth = localStorage.getItem("ide_explorer_width");
    return savedWidth ? parseInt(savedWidth) : 240;
  });

  const [outputHeight, setOutputHeight] = useState(() => {
    const savedHeight = localStorage.getItem("ide_output_height");
    return savedHeight ? parseInt(savedHeight) : 192; // 12rem = 192px
  });

  // Refs for tracking dragging
  const explorerDragRef = useRef(null);
  const outputDragRef = useRef(null);
  const isDraggingExplorer = useRef(false);
  const isDraggingOutput = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragStartWidth = useRef(0);
  const dragStartHeight = useRef(0);

  // Test cases for competitive programming
  const [testCases, setTestCases] = useState(() => {
    const savedTestCases = localStorage.getItem("ide_test_cases");
    if (savedTestCases) {
      try {
        return JSON.parse(savedTestCases);
      } catch (e) {
        console.error("Failed to parse saved test cases", e);
      }
    }
    // Default empty array
    return [];
  });

  const [testCaseResults, setTestCaseResults] = useState([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [newTestCaseInput, setNewTestCaseInput] = useState("");
  const [newTestCaseOutput, setNewTestCaseOutput] = useState("");
  const [editingTestCaseId, setEditingTestCaseId] = useState(null);
  const [testSummary, setTestSummary] = useState({
    total: 0,
    passed: 0,
    failed: 0,
  });

  // Track expanded test cases
  const [expandedTestCases, setExpandedTestCases] = useState({});

  // Add state for the inner tab selection
  const [testCaseInnerTab, setTestCaseInnerTab] = useState("inputs");

  // Add the layout toggle state right after other state definitions
  const [isHorizontalLayout, setIsHorizontalLayout] = useState(() => {
    const savedLayout = localStorage.getItem("ide_console_layout");
    return savedLayout !== null ? JSON.parse(savedLayout) : false;
  });

  // Toggle test case expansion
  const toggleTestCaseExpansion = (testCaseId) => {
    setExpandedTestCases((prev) => ({
      ...prev,
      [testCaseId]: !prev[testCaseId],
    }));
  };

  // Function to handle editor mounting - update to support primary and secondary editors
  const handleEditorDidMount = (editor, monaco, isSecondary = false) => {
    if (isSecondary) {
      secondaryEditorRef.current = editor;
      secondaryMonacoRef.current = monaco;
    } else {
      primaryEditorRef.current = editor;
      primaryMonacoRef.current = monaco;
      editorRef.current = editor; // For backward compatibility
      monacoRef.current = monaco; // For backward compatibility
    }

    // Set editor options
    editor.updateOptions({
      fontSize: 20,
      fontFamily: "Consolas, 'Courier New', monospace",
      lineNumbers: "on",
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      // Add VS Code features
      formatOnPaste: true,
      formatOnType: true,
      autoIndent: "full",
      tabSize: 4,
      bracketPairColorization: {
        enabled: true,
      },
      renderWhitespace: "selection",
      folding: true,
      foldingHighlight: true,
      foldingStrategy: "auto",
      showFoldingControls: "always",
      wordWrap: "on",
      wordWrapColumn: 80,
      wordWrapMinified: true,
      wrappingIndent: "indent",
      matchBrackets: "always",
      cursorBlinking: "smooth",
    });

    // Register language formatting providers
    registerFormatters(monaco);

    // Register keyboard command for formatting
    editor.addAction({
      id: "format-document-custom",
      label: "Format Document",
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      ],
      run: () => formatCodeForEditor(editor, monaco),
    });
  };

  // Register formatters for different languages
  const registerFormatters = (monaco) => {
    // Languages that support formatting
    const languages = [
      "javascript",
      "typescript",
      "json",
      "css",
      "html",
      "cpp",
      "c",
      "csharp",
      "java",
      "python",
    ];

    languages.forEach((language) => {
      monaco.languages.registerDocumentFormattingEditProvider(language, {
        provideDocumentFormattingEdits: function (model) {
          // Basic indentation-based formatting
          return [
            {
              range: model.getFullModelRange(),
              text: prettifyCode(model.getValue(), language),
            },
          ];
        },
      });
    });
  };

  // Basic code prettify function
  const prettifyCode = (code, language) => {
    try {
      // Very basic formatting: normalize indentation
      let lines = code.split("\n");
      let indentLevel = 0;
      let formattedLines = [];

      const indentChar = "    "; // 4 spaces

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Handle bracket indentation
        if (line.match(/^[})\]]/)) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        if (line.length > 0) {
          formattedLines.push(indentChar.repeat(indentLevel) + line);
        } else {
          formattedLines.push("");
        }

        // Increase indent for next line
        if (line.match(/[{([]$/)) {
          indentLevel++;
        }
      }

      return formattedLines.join("\n");
    } catch (e) {
      console.error("Error prettifying code:", e);
      return code; // Return unchanged if error
    }
  };

  // Update formatCode to handle multiple editors
  const formatCodeForEditor = (editor, monaco) => {
    try {
      if (editor) {
        // Try the built-in format action first
        const formatAction = editor.getAction("editor.action.formatDocument");

        if (formatAction) {
          formatAction
            .run()
            .then(() => {
              setStatus("Code formatted");
            })
            .catch((err) => {
              console.log("Falling back to custom formatter", err);
              // If built-in formatter fails, use our basic formatter
              if (monaco && editor) {
                const model = editor.getModel();
                if (model) {
                  const language =
                    getFileLanguage(editor.getModel().uri.path) || "cpp";
                  const formatted = prettifyCode(model.getValue(), language);
                  model.setValue(formatted);
                  setStatus("Code formatted (basic formatting)");
                }
              }
            });
        } else {
          // Use our basic formatter if built-in isn't available
          if (monaco && editor) {
            const model = editor.getModel();
            if (model) {
              const language =
                getFileLanguage(editor.getModel().uri.path) || "cpp";
              const formatted = prettifyCode(model.getValue(), language);
              model.setValue(formatted);
              setStatus("Code formatted (basic formatting)");
            }
          }
        }
      }
    } catch (error) {
      console.error("Format error:", error);
      setStatus("Error formatting code: " + error.message);
    }
  };

  // Format code function - update to handle both editors
  const formatCode = () => {
    if (isSplitView) {
      if (document.activeElement.closest(".primary-editor")) {
        formatCodeForEditor(primaryEditorRef.current, primaryMonacoRef.current);
      } else if (document.activeElement.closest(".secondary-editor")) {
        formatCodeForEditor(
          secondaryEditorRef.current,
          secondaryMonacoRef.current
        );
      } else {
        // Default to primary editor if focus can't be determined
        formatCodeForEditor(primaryEditorRef.current, primaryMonacoRef.current);
      }
    } else {
      formatCodeForEditor(primaryEditorRef.current, primaryMonacoRef.current);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Ctrl+N: New file
    if (e.ctrlKey && e.key === "n") {
      e.preventDefault();
      newFile();
    }
    // Ctrl+O: Open file
    else if (e.ctrlKey && e.key === "o") {
      e.preventDefault();
      openFile();
    }
    // Ctrl+S: Save file
    else if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      saveFile();
    }
    // F5: Run code
    else if (e.key === "F5") {
      e.preventDefault();
      runCode();
    }
    // Ctrl+W: Close current tab
    else if (e.ctrlKey && e.key === "w") {
      e.preventDefault();
      closeFile(activeFileId);
    }
    // Shift+Alt+F: Format code
    else if (e.shiftKey && e.altKey && e.key === "f") {
      e.preventDefault();
      formatCode();
    }
    // Ctrl+B: Toggle sidebar
    else if (e.ctrlKey && e.key === "b") {
      e.preventDefault();
      toggleExplorer();
    }
  };

  // Toggle file explorer
  const toggleExplorer = () => {
    const newValue = !isExplorerVisible;
    setIsExplorerVisible(newValue);
    localStorage.setItem("ide_explorer_visible", JSON.stringify(newValue));
  };

  // Load languages on component mount
  useEffect(() => {
    // Setup keyboard shortcuts
    window.addEventListener("keydown", handleKeyDown);
    loadLanguages();

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeFileId]);

  // Set selected language when active file changes
  useEffect(() => {
    const currentFile = files.find((file) => file.id === activeFileId);
    if (currentFile && currentFile.languageId) {
      const fileLanguage = judgeLanguages.find(
        (lang) => lang.id === currentFile.languageId
      );
      if (fileLanguage) {
        setSelectedLanguage(fileLanguage);
      }
    }
  }, [activeFileId, files, judgeLanguages]);

  // Update theme when app theme changes
  useEffect(() => {
    setSelectedTheme(theme === "dark" ? "vs-dark" : "light");
  }, [theme]);

  // Save files to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("ide_files", JSON.stringify(files));
  }, [files]);

  // Save workspace to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("ide_workspace", JSON.stringify(workspace));
  }, [workspace]);

  // Save activeFileId to localStorage
  useEffect(() => {
    localStorage.setItem("ide_active_file_id", activeFileId);
  }, [activeFileId]);

  // Save input to localStorage
  useEffect(() => {
    localStorage.setItem("ide_input", input);
  }, [input]);

  // Save activeTab to localStorage
  useEffect(() => {
    localStorage.setItem("ide_active_tab", activeTab);
  }, [activeTab]);

  // Save secondaryFileId and splitView state to localStorage
  useEffect(() => {
    localStorage.setItem("ide_secondary_file_id", secondaryFileId || "");
  }, [secondaryFileId]);

  useEffect(() => {
    localStorage.setItem("ide_split_view", JSON.stringify(isSplitView));
  }, [isSplitView]);

  useEffect(() => {
    localStorage.setItem("ide_split_ratio", splitRatio.toString());
  }, [splitRatio]);

  // Get Monaco language ID based on selected language
  const getMonacoLanguage = () => {
    if (!selectedLanguage) return "plaintext";

    const name = selectedLanguage.name.toLowerCase();

    if (name.includes("c++")) return "cpp";
    if (name.includes("c ")) return "c";
    if (name.includes("java ")) return "java";
    if (name.includes("python")) return "python";
    if (name.includes("javascript")) return "javascript";
    if (name.includes("c#")) return "csharp";
    if (name.includes("go")) return "go";
    if (name.includes("ruby")) return "ruby";
    if (name.includes("rust")) return "rust";
    if (name.includes("php")) return "php";

    return "plaintext";
  };

  // Get file language from file name
  const getFileLanguage = (fileName) => {
    // Check if the filename has an extension
    if (!fileName.includes(".")) {
      return "cpp"; // Default to C++ when no extension is present
    }

    const ext = fileName.split(".").pop().toLowerCase();

    const extensionMap = {
      py: "python",
      c: "c",
      cpp: "cpp",
      h: "cpp",
      hpp: "cpp",
      java: "java",
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      rb: "ruby",
      cs: "csharp",
      go: "go",
      rs: "rust",
      php: "php",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      txt: "plaintext",
    };

    // If extension exists in map, use it, otherwise default to cpp instead of plaintext
    return extensionMap[ext] || "cpp";
  };

  // Load languages from Judge0 API
  const loadLanguages = async () => {
    try {
      setStatus("Loading languages...");
      const response = await axios.get(`${api_url}/languages`, { headers });

      if (response.status === 200) {
        // Sort languages by name
        const sortedLanguages = response.data.sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        setJudgeLanguages(sortedLanguages);

        // Get saved language ID from localStorage
        const savedLanguageId = localStorage.getItem(
          "ide_selected_language_id"
        );

        console.log(savedLanguageId);

        if (savedLanguageId) {
          const savedLanguage = sortedLanguages.find(
            (lang) => lang.id === parseInt(savedLanguageId)
          );
          if (savedLanguage) {
            setSelectedLanguage(savedLanguage);
            setStatus("Languages loaded successfully");
            return;
          }
        }

        // Get default language ID from environment variables or use C++
        const defaultLanguageId = process.env.REACT_APP_DEFAULT_LANGUAGE_ID
          ? parseInt(process.env.REACT_APP_DEFAULT_LANGUAGE_ID)
          : null;

        // Set default language to specified ID or C++ (GCC 14.1.0)
        let defaultLanguage;

        if (defaultLanguageId) {
          defaultLanguage = sortedLanguages.find(
            (lang) => lang.id === defaultLanguageId
          );
        }

        if (!defaultLanguage) {
          // First try to find C++ (GCC 14.1.0) specifically
          defaultLanguage = sortedLanguages.find((lang) =>
            lang.name.includes("C++ (GCC 14.1.0)")
          );

          // If not found, try any C++ GCC version
          if (!defaultLanguage) {
            defaultLanguage = sortedLanguages.find((lang) =>
              lang.name.includes("C++ (GCC")
            );
          }
        }

        if (defaultLanguage) {
          setSelectedLanguage(defaultLanguage);
          localStorage.setItem("ide_selected_language_id", defaultLanguage.id);
        } else if (sortedLanguages.length > 0) {
          setSelectedLanguage(sortedLanguages[0]);
          localStorage.setItem(
            "ide_selected_language_id",
            sortedLanguages[0].id
          );
        }

        setStatus("Languages loaded successfully");
      }
    } catch (error) {
      console.error("Error loading languages:", error);
      setStatus("Error loading languages. Using offline mode.");

      // Create some default languages if we can't connect to Judge0
      const defaultLanguages = [
        { id: 54, name: "C++ (GCC 14.1.0)", language: "cpp" },
        { id: 50, name: "C (GCC 14.1.0)", language: "c" },
        { id: 62, name: "Java (OpenJDK 17.0.3)", language: "java" },
        { id: 71, name: "Python (3.10.4)", language: "python" },
        {
          id: 63,
          name: "JavaScript (Node.js 18.2.0)",
          language: "javascript",
        },
      ];
      setJudgeLanguages(defaultLanguages);

      // Use environment variable for default language ID or fallback to C++
      const defaultLanguageId = process.env.REACT_APP_DEFAULT_LANGUAGE_ID
        ? parseInt(process.env.REACT_APP_DEFAULT_LANGUAGE_ID)
        : 54; // Default to C++

      const defaultLanguage =
        defaultLanguages.find((lang) => lang.id === defaultLanguageId) ||
        defaultLanguages[0];

      setSelectedLanguage(defaultLanguage);
    }
  };

  // Handle language change
  const handleLanguageChange = (e) => {
    const langId = parseInt(e.target.value);
    const language = judgeLanguages.find((lang) => lang.id === langId);
    setSelectedLanguage(language);

    // Store the selected language ID in localStorage
    localStorage.setItem("ide_selected_language_id", langId);

    // Update the file's languageId and monaco language
    updateFileLanguage(activeFileId, getMonacoLanguage(), langId);
  };

  // Update a file's language
  const updateFileLanguage = (fileId, monacoLanguage, languageId) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId
          ? {
              ...file,
              language: monacoLanguage,
              languageId: languageId,
            }
          : file
      )
    );
  };

  // Handle theme change
  const handleThemeChange = (e) => {
    setSelectedTheme(e.target.value);
    localStorage.setItem("ide_theme", e.target.value);
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Handle code change
  const handleCodeChange = (value) => {
    updateFileContent(activeFileId, value);
  };

  // Update file content
  const updateFileContent = (fileId, content) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, content } : file
      )
    );

    // Also update the content in the workspace
    updateWorkspaceFileContent(fileId, content);
  };

  // Update file content in workspace
  const updateWorkspaceFileContent = (fileId, content) => {
    const updateFileInFolder = (folder) => {
      if (!folder.children) return folder;

      const updatedChildren = folder.children.map((item) => {
        if (item.type === "file" && item.id === fileId) {
          return { ...item, content };
        } else if (item.type === "folder") {
          return updateFileInFolder(item);
        }
        return item;
      });

      return { ...folder, children: updatedChildren };
    };

    setWorkspace(updateFileInFolder(workspace));
  };

  // Create a new file
  const newFile = (parentFolderId = "root") => {
    const fileId = `file${Date.now()}`;
    const defaultExt = getDefaultExtension();
    const fileName = `untitled.${defaultExt}`;
    const newFileContent = getDefaultContent(defaultExt);

    // Create file in the open files array
    const newFile = {
      id: fileId,
      name: fileName,
      content: newFileContent,
      language: getFileLanguage(fileName),
      languageId: selectedLanguage?.id || null,
    };

    setFiles((prevFiles) => [...prevFiles, newFile]);
    setActiveFileId(fileId);

    // Add file to workspace
    addFileToWorkspace(parentFolderId, fileId, fileName, newFileContent);

    setStatus(`Created new file: ${fileName}`);
  };

  // Add file to workspace
  const addFileToWorkspace = (
    parentFolderId,
    fileId,
    fileName,
    content = ""
  ) => {
    const addToFolder = (folder) => {
      if (folder.id === parentFolderId) {
        return {
          ...folder,
          children: [
            ...(folder.children || []),
            {
              id: fileId,
              name: fileName,
              type: "file",
              content: content,
            },
          ],
        };
      }

      if (!folder.children) return folder;

      return {
        ...folder,
        children: folder.children.map((child) => {
          if (child.type === "folder") {
            return addToFolder(child);
          }
          return child;
        }),
      };
    };

    setWorkspace(addToFolder(workspace));
  };

  // Create a new folder
  const createFolder = (parentFolderId) => {
    const folderId = `folder${Date.now()}`;
    const folderName = "New Folder";

    const addToFolder = (folder) => {
      if (folder.id === parentFolderId) {
        return {
          ...folder,
          children: [
            ...(folder.children || []),
            {
              id: folderId,
              name: folderName,
              type: "folder",
              children: [],
            },
          ],
        };
      }

      if (!folder.children) return folder;

      return {
        ...folder,
        children: folder.children.map((child) => {
          if (child.type === "folder") {
            return addToFolder(child);
          }
          return child;
        }),
      };
    };

    setWorkspace(addToFolder(workspace));
    setStatus(`Created new folder: ${folderName}`);
  };

  // Open a file from disk - update to handle split view
  const openFile = (targetEditor = null) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      ".py,.c,.cpp,.h,.hpp,.java,.js,.jsx,.ts,.tsx,.rb,.cs,.go,.rs,.php,.html,.css,.json,.md,.txt";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileId = `file${Date.now()}`;
        const fileContent = event.target.result;
        const monacoLanguage = getFileLanguage(file.name);

        // Find the corresponding Judge0 language
        const ext = file.name.split(".").pop().toLowerCase();
        const langName = getLanguageNameFromExtension(ext);
        let languageId = null;

        if (langName) {
          const matchingLang = judgeLanguages.find((lang) =>
            lang.name.includes(langName)
          );
          if (matchingLang) {
            languageId = matchingLang.id;
          }
        }

        // Create file in the open files array
        const newFile = {
          id: fileId,
          name: file.name,
          content: fileContent,
          language: monacoLanguage,
          languageId: languageId || selectedLanguage?.id,
        };

        setFiles((prevFiles) => [...prevFiles, newFile]);

        // Set file to the appropriate editor based on targetEditor
        if (targetEditor === "secondary") {
          setSecondaryFileId(fileId);
          if (!isSplitView) {
            setIsSplitView(true);
          }
        } else {
          setActiveFileId(fileId);
        }

        // Add file to workspace root
        addFileToWorkspace("root", fileId, file.name, fileContent);

        setStatus(`Opened: ${file.name}`);
      };

      reader.readAsText(file);
    };

    input.click();
  };

  // Get language name from file extension
  const getLanguageNameFromExtension = (extension) => {
    // Default to C++ if no extension
    if (!extension) {
      return "C++";
    }

    const extensionMap = {
      py: "Python",
      c: "C",
      cpp: "C++",
      h: "C++",
      hpp: "C++",
      java: "Java",
      js: "JavaScript",
      rb: "Ruby",
      cs: "C#",
      go: "Go",
      rs: "Rust",
      php: "PHP",
    };

    return extensionMap[extension] || "C++";
  };

  // Get default file extension based on selected language
  const getDefaultExtension = () => {
    if (!selectedLanguage) return "cpp";

    const name = selectedLanguage.name.toLowerCase();
    if (name.includes("python")) return "py";
    if (name.includes("c++")) return "cpp";
    if (name.includes("c ")) return "c";
    if (name.includes("java")) return "java";
    if (name.includes("javascript")) return "js";
    if (name.includes("ruby")) return "rb";
    if (name.includes("c#")) return "cs";
    if (name.includes("go")) return "go";
    if (name.includes("rust")) return "rs";
    if (name.includes("php")) return "php";

    return "cpp";
  };

  // Get default content for a new file based on extension
  const getDefaultContent = (extension) => {
    switch (extension) {
      case "cpp":
        return `#include <bits/stdc++.h>

using namespace std;

int main() {
    // Your code here
    cout << "Hello, World!" << endl;
    
    return 0;
}`;
      case "c":
        return `#include <stdio.h>

int main() {
    // Your code here
    printf("Hello, World!\\n");
    
    return 0;
}`;
      case "py":
        return `# Your Python code here

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()`;
      case "java":
        return `public class Main {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, World!");
    }
}`;
      case "js":
        return `// Your JavaScript code here

function main() {
    console.log("Hello, World!");
}

main();`;
      default:
        return "";
    }
  };

  // Close a file
  const closeFile = (fileId) => {
    // Don't close if it's the last file
    if (files.length <= 1) {
      setStatus("Cannot close the last tab");
      return;
    }

    const fileToClose = files.find((file) => file.id === fileId);

    if (fileToClose && fileToClose.content.trim() !== "") {
      if (
        !window.confirm(
          `Do you want to save changes to ${fileToClose.name} before closing?`
        )
      ) {
        // User chose not to save, just close
        removeFile(fileId);
        return;
      }
      // User chose to save before closing
      saveFile(fileId);
    }

    removeFile(fileId);
  };

  // Remove a file from the files array
  const removeFile = (fileId) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));

    // If we're closing the active file, activate another one
    if (fileId === activeFileId) {
      const remainingFiles = files.filter((file) => file.id !== fileId);
      if (remainingFiles.length > 0) {
        setActiveFileId(remainingFiles[0].id);
      }
    }
  };

  // Select a file from the file explorer
  const handleFileSelect = (file) => {
    // Check if the file is already open
    const isFileOpen = files.some((f) => f.id === file.id);

    if (!isFileOpen) {
      // Add the file to the open files
      const newFile = {
        id: file.id,
        name: file.name,
        content: file.content || "",
        language: getFileLanguage(file.name),
        languageId: selectedLanguage?.id || null,
      };
      setFiles((prevFiles) => [...prevFiles, newFile]);
    }

    // Set it as the active file
    setActiveFileId(file.id);
  };

  // Save file to disk
  const saveFile = (fileId = activeFileId) => {
    const fileToSave = files.find((file) => file.id === fileId);

    if (!fileToSave || !fileToSave.content.trim()) {
      setStatus("Nothing to save");
      return;
    }

    const blob = new Blob([fileToSave.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileToSave.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus(`Saved: ${fileToSave.name}`);
  };

  // Rename an item (file or folder)
  const handleRenameItem = (itemId, newName) => {
    // Rename in workspace
    const renameInWorkspace = (folder) => {
      if (!folder.children) return folder;

      const updatedChildren = folder.children.map((item) => {
        if (item.id === itemId) {
          return { ...item, name: newName };
        } else if (item.type === "folder") {
          return renameInWorkspace(item);
        }
        return item;
      });

      return { ...folder, children: updatedChildren };
    };

    setWorkspace(renameInWorkspace(workspace));

    // If it's a file that's open, rename it in the files array too
    setFiles((prevFiles) =>
      prevFiles.map((file) => {
        if (file.id === itemId) {
          // Update language when extension changes
          const newLanguage = getFileLanguage(newName);
          return {
            ...file,
            name: newName,
            language: newLanguage,
          };
        }
        return file;
      })
    );

    setStatus(`Renamed to: ${newName}`);
  };

  // Delete an item (file or folder)
  const handleDeleteItem = (itemId) => {
    // Remove from open files if it's open
    const fileToRemove = files.find((file) => file.id === itemId);
    if (fileToRemove) {
      closeFile(itemId);
    }

    // Remove from workspace
    const removeFromWorkspace = (folder) => {
      if (!folder.children) return folder;

      // Filter out the item to delete
      const filteredChildren = folder.children.filter(
        (item) => item.id !== itemId
      );

      // Process remaining children recursively
      const updatedChildren = filteredChildren.map((item) => {
        if (item.type === "folder") {
          return removeFromWorkspace(item);
        }
        return item;
      });

      return { ...folder, children: updatedChildren };
    };

    setWorkspace(removeFromWorkspace(workspace));
    setStatus(`Deleted item`);
  };

  // Move an item (file or folder) to a new parent folder
  const moveItem = (itemId, targetFolderId) => {
    // First, find the item to move and its parent folder
    let itemToMove = null;
    let sourceParentFolderId = null;

    const findItem = (folder, parentId = null) => {
      if (!folder.children) return false;

      // Check if the item is directly in this folder
      const found = folder.children.find((item) => item.id === itemId);
      if (found) {
        itemToMove = found;
        sourceParentFolderId = parentId || folder.id;
        return true;
      }

      // Look in subfolders
      for (const child of folder.children) {
        if (child.type === "folder") {
          if (findItem(child, child.id)) return true;
        }
      }

      return false;
    };

    findItem(workspace);

    // If item or target folder is not found, or trying to move to itself, abort
    if (!itemToMove || itemId === targetFolderId) {
      setStatus("Cannot move: Invalid operation");
      return false;
    }

    // Check if target is actually a folder
    const isTargetValidFolder = (folder) => {
      if (folder.id === targetFolderId) return true;

      if (!folder.children) return false;

      for (const child of folder.children) {
        if (child.type === "folder" && isTargetValidFolder(child)) {
          return true;
        }
      }

      return false;
    };

    if (!isTargetValidFolder(workspace)) {
      setStatus("Cannot move: Target is not a folder");
      return false;
    }

    // Check if target is a subfolder of the item being moved (to prevent circular references)
    if (itemToMove.type === "folder") {
      const isSubfolder = (folder, potentialParentId) => {
        if (folder.id === potentialParentId) return true;

        if (!folder.children) return false;

        for (const child of folder.children) {
          if (
            child.type === "folder" &&
            isSubfolder(child, potentialParentId)
          ) {
            return true;
          }
        }

        return false;
      };

      if (isSubfolder(itemToMove, targetFolderId)) {
        setStatus("Cannot move: Cannot move a folder to its subfolder");
        return false;
      }
    }

    // Remove the item from its current parent
    const removeItemFromParent = (folder) => {
      if (!folder.children) return folder;

      if (folder.id === sourceParentFolderId) {
        return {
          ...folder,
          children: folder.children.filter((item) => item.id !== itemId),
        };
      }

      return {
        ...folder,
        children: folder.children.map((child) => {
          if (child.type === "folder") {
            return removeItemFromParent(child);
          }
          return child;
        }),
      };
    };

    // Add the item to the target folder
    const addItemToTarget = (folder) => {
      if (folder.id === targetFolderId) {
        return {
          ...folder,
          children: [...(folder.children || []), itemToMove],
        };
      }

      if (!folder.children) return folder;

      return {
        ...folder,
        children: folder.children.map((child) => {
          if (child.type === "folder") {
            return addItemToTarget(child);
          }
          return child;
        }),
      };
    };

    // Apply the changes
    const updatedWorkspace = addItemToTarget(removeItemFromParent(workspace));
    setWorkspace(updatedWorkspace);
    setStatus(
      `Moved ${itemToMove.name} to ${
        targetFolderId === "root" ? "Workspace" : "folder"
      }`
    );
    return true;
  };

  // Run code
  const runCode = async () => {
    if (!selectedLanguage) {
      setStatus("Please select a language");
      return;
    }

    if (!activeFile || !activeFile.content.trim()) {
      setStatus("No code to run");
      return;
    }

    setIsRunning(true);
    setOutput("Running code...");
    setStatus("Submitting code for execution...");
    setActiveTab("console");

    try {
      // Prepare the submission with base64 encoding
      const data = {
        language_id: selectedLanguage.id,
        source_code: btoa(activeFile.content),
        stdin: input ? btoa(input) : "",
        base64_encoded: true,
      };

      // Submit the code
      const response = await axios.post(
        `${api_url}/submissions?base64_encoded=true&fields=*`,
        data,
        { headers }
      );

      if (!response.data.token) {
        throw new Error("No token received");
      }

      const token = response.data.token;

      // Poll for results
      await pollSubmission(token);
    } catch (error) {
      console.error("Execution error:", error);
      setOutput(`Error: ${error.message || "Failed to execute code"}`);
      setStatus("Execution failed");
      setIsRunning(false);
    }
  };

  // Poll submission status
  const pollSubmission = async (token) => {
    try {
      const response = await axios.get(
        `${api_url}/submissions/${token}?base64_encoded=true&fields=*`,
        { headers }
      );

      const submission = response.data;
      const statusId = submission.status?.id;

      // If still processing, poll again
      if (statusId === 1 || statusId === 2) {
        setTimeout(() => pollSubmission(token), 1500);
        return;
      }

      processResult(submission);
    } catch (error) {
      console.error("Error polling submission:", error);
      setOutput(`Error polling submission: ${error.message}`);
      setStatus("Execution failed");
      setIsRunning(false);
    }
  };

  // Process execution result
  const processResult = (submission) => {
    const status = submission.status || {};
    const statusId = status.id;
    const statusDescription = status.description || "Unknown status";

    // Decode outputs - handle empty values
    let stdout = "";
    let stderr = "";
    let compileOutput = "";
    let message = "";

    try {
      if (submission.stdout) {
        stdout = atob(submission.stdout);
      }
    } catch (e) {
      stdout = submission.stdout || "";
    }

    try {
      if (submission.stderr) {
        stderr = atob(submission.stderr);
      }
    } catch (e) {
      stderr = submission.stderr || "";
    }

    try {
      if (submission.compile_output) {
        compileOutput = atob(submission.compile_output);
      }
    } catch (e) {
      compileOutput = submission.compile_output || "";
    }

    try {
      if (submission.message) {
        message = atob(submission.message);
      }
    } catch (e) {
      message = submission.message || "";
    }

    let result = `Status: ${statusDescription}\n\n`;

    if (compileOutput) {
      result += `Compilation output:\n${compileOutput}\n\n`;
    }

    if (stdout) {
      result += `Standard output:\n${stdout}\n\n`;
    }

    if (stderr) {
      result += `Standard error:\n${stderr}\n\n`;
    }

    if (message) {
      result += `Message: ${message}\n\n`;
    }

    // Add time and memory info
    if (submission.time) {
      result += `Execution time: ${submission.time} seconds\n`;
    }

    if (submission.memory) {
      result += `Memory used: ${submission.memory} KB\n`;
    }

    setOutput(result);

    if (statusId === 3) {
      setStatus("Execution completed successfully");
    } else {
      setStatus(`Execution completed with status: ${statusDescription}`);
    }

    setIsRunning(false);
  };

  // Tab click handler
  const handleTabClick = (fileId) => {
    setActiveFileId(fileId);
  };

  // Start rename of tab
  const startTabRename = (fileId, name, e) => {
    e.stopPropagation();
    setEditingFile(fileId);
    setEditingName(name);
  };

  // Effect to focus the input when editing starts
  useEffect(() => {
    if (editingFile && fileNameInputRef.current) {
      fileNameInputRef.current.focus();

      // Select the name without the extension
      const fileName = fileNameInputRef.current.value;
      const dotIndex = fileName.lastIndexOf(".");

      if (dotIndex > 0) {
        // Set selection range to select everything before the dot
        setTimeout(() => {
          fileNameInputRef.current.setSelectionRange(0, dotIndex);
        }, 0);
      } else {
        // If no extension, select all text
        fileNameInputRef.current.select();
      }
    }
  }, [editingFile]);

  // Add a function to force cpp language for files without extensions
  const ensureCorrectSyntaxHighlighting = () => {
    // Check if the active file has no extension and update its language
    if (
      activeFile &&
      !activeFile.name.includes(".") &&
      activeFile.language !== "cpp"
    ) {
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === activeFile.id ? { ...file, language: "cpp" } : file
        )
      );
    }
  };

  // Call this function whenever activeFileId changes
  useEffect(() => {
    // After the activeFile is updated, ensure it has the correct syntax highlighting
    ensureCorrectSyntaxHighlighting();
  }, [activeFileId, activeFile?.name]);

  // Add handlers for resizable panels
  const handleExplorerDragStart = (e) => {
    isDraggingExplorer.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = explorerWidth;
    document.addEventListener("mousemove", handleExplorerDragMove);
    document.addEventListener("mouseup", handleExplorerDragEnd);
    // Add class to prevent text selection during drag
    document.body.classList.add("resize-x");
  };

  const handleExplorerDragMove = (e) => {
    if (isDraggingExplorer.current) {
      const deltaX = e.clientX - dragStartX.current;
      const newWidth = Math.max(
        100,
        Math.min(500, dragStartWidth.current + deltaX)
      );
      setExplorerWidth(newWidth);
    }
  };

  const handleExplorerDragEnd = () => {
    isDraggingExplorer.current = false;
    document.removeEventListener("mousemove", handleExplorerDragMove);
    document.removeEventListener("mouseup", handleExplorerDragEnd);
    // Save to localStorage
    localStorage.setItem("ide_explorer_width", explorerWidth.toString());
    // Remove class
    document.body.classList.remove("resize-x");
  };

  const handleOutputDragStart = (e) => {
    isDraggingOutput.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = outputHeight;
    document.addEventListener("mousemove", handleOutputDragMove);
    document.addEventListener("mouseup", handleOutputDragEnd);
    // Add class to prevent text selection during drag
    document.body.classList.add("resize-y");
  };

  const handleOutputDragMove = (e) => {
    if (isDraggingOutput.current) {
      const deltaY = dragStartY.current - e.clientY;
      // Allow resizing up to 80% of the screen height
      const maxHeight = window.innerHeight * 0.8;
      const newHeight = Math.max(
        100,
        Math.min(maxHeight, dragStartHeight.current + deltaY)
      );
      setOutputHeight(newHeight);
    }
  };

  const handleOutputDragEnd = () => {
    isDraggingOutput.current = false;
    document.removeEventListener("mousemove", handleOutputDragMove);
    document.removeEventListener("mouseup", handleOutputDragEnd);
    // Save to localStorage
    localStorage.setItem("ide_output_height", outputHeight.toString());
    // Remove class
    document.body.classList.remove("resize-y");
  };

  // Add test case
  const addTestCase = () => {
    if (!newTestCaseInput.trim()) {
      setStatus("Test case input cannot be empty");
      return;
    }

    const newTestCase = {
      id: `tc_${Date.now()}`,
      input: newTestCaseInput,
      expectedOutput: newTestCaseOutput,
    };

    setTestCases((prevTestCases) => [...prevTestCases, newTestCase]);
    setNewTestCaseInput("");
    setNewTestCaseOutput("");
    setStatus("Test case added");
  };

  // Edit test case
  const startEditTestCase = (testCase) => {
    setEditingTestCaseId(testCase.id);
    setNewTestCaseInput(testCase.input);
    setNewTestCaseOutput(testCase.expectedOutput);
  };

  // Save edited test case
  const saveEditTestCase = () => {
    if (!newTestCaseInput.trim()) {
      setStatus("Test case input cannot be empty");
      return;
    }

    setTestCases((prevTestCases) =>
      prevTestCases.map((tc) =>
        tc.id === editingTestCaseId
          ? {
              ...tc,
              input: newTestCaseInput,
              expectedOutput: newTestCaseOutput,
            }
          : tc
      )
    );

    setEditingTestCaseId(null);
    setNewTestCaseInput("");
    setNewTestCaseOutput("");
    setStatus("Test case updated");
  };

  // Delete test case
  const deleteTestCase = (id) => {
    setTestCases((prevTestCases) => prevTestCases.filter((tc) => tc.id !== id));
    setStatus("Test case deleted");
  };

  // Run single test case
  const runTestCase = async (testCase) => {
    if (!selectedLanguage) {
      setStatus("Please select a language");
      return null;
    }

    if (!activeFile || !activeFile.content.trim()) {
      setStatus("No code to run");
      return null;
    }

    try {
      // Prepare the submission with base64 encoding
      const data = {
        language_id: selectedLanguage.id,
        source_code: btoa(activeFile.content),
        stdin: testCase.input ? btoa(testCase.input) : "",
        base64_encoded: true,
      };

      // Submit the code
      const response = await axios.post(
        `${api_url}/submissions?base64_encoded=true&fields=*`,
        data,
        { headers }
      );

      if (!response.data.token) {
        throw new Error("No token received");
      }

      const token = response.data.token;

      // Get result
      const result = await getSubmissionResult(token);
      return result;
    } catch (error) {
      console.error("Test case execution error:", error);
      return {
        error: true,
        message: error.message || "Failed to execute code",
      };
    }
  };

  // Get submission result (for test cases)
  const getSubmissionResult = async (token) => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(
          `${api_url}/submissions/${token}?base64_encoded=true&fields=*`,
          { headers }
        );

        const submission = response.data;
        const statusId = submission.status?.id;

        // If still processing, wait and try again
        if (statusId === 1 || statusId === 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          attempts++;
          continue;
        }

        // Process and return the result
        return processTestCaseResult(submission);
      } catch (error) {
        console.error("Error polling submission:", error);
        return {
          error: true,
          message: error.message || "Failed to get submission result",
        };
      }
    }

    return {
      error: true,
      message: "Timed out waiting for result",
    };
  };

  // Process test case result
  const processTestCaseResult = (submission) => {
    const status = submission.status || {};
    const statusId = status.id;
    const statusDescription = status.description || "Unknown status";

    // Decode outputs - handle empty values
    let stdout = "";
    let stderr = "";
    let compileOutput = "";
    let message = "";

    try {
      if (submission.stdout) {
        stdout = atob(submission.stdout);
      }
    } catch (e) {
      stdout = submission.stdout || "";
    }

    try {
      if (submission.stderr) {
        stderr = atob(submission.stderr);
      }
    } catch (e) {
      stderr = submission.stderr || "";
    }

    try {
      if (submission.compile_output) {
        compileOutput = atob(submission.compile_output);
      }
    } catch (e) {
      compileOutput = submission.compile_output || "";
    }

    try {
      if (submission.message) {
        message = atob(submission.message);
      }
    } catch (e) {
      message = submission.message || "";
    }

    const executionTime = submission.time || 0;
    const memoryUsed = submission.memory || 0;

    return {
      status: statusId,
      statusDescription,
      stdout,
      stderr,
      compileOutput,
      message,
      executionTime,
      memoryUsed,
      // "Accepted" status means the code compiled and ran without errors
      success: statusId === 3, // Status 3 is "Accepted" in Judge0
    };
  };

  // Run all test cases
  const runAllTestCases = async () => {
    if (testCases.length === 0) {
      setStatus("No test cases to run");
      return;
    }

    setIsRunningTests(true);
    setTestCaseResults([]);
    // Reset expanded state but preserve defaults for failed tests
    const initialExpandedState = {};

    setActiveTab("testcases");
    setTestCaseInnerTab("results"); // Switch to results tab
    setStatus("Running test cases...");

    const results = [];
    let passedCount = 0;
    const newExpandedState = {};

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      // Update status to show progress
      setStatus(`Running test case ${i + 1}/${testCases.length}...`);

      const result = await runTestCase(testCase);

      // Check if the test case passed - compilation success ≠ test case success
      let passed = false;

      // Only check output if compilation was successful
      if (result && result.success) {
        // Clean up expected and actual output for comparison (trim whitespace and normalize line endings)
        const expectedOutput = testCase.expectedOutput
          .trim()
          .replace(/\r\n/g, "\n")
          .replace(/\s+/g, " ");

        const actualOutput = result.stdout
          .trim()
          .replace(/\r\n/g, "\n")
          .replace(/\s+/g, " ");

        passed = expectedOutput === actualOutput;
        if (passed) passedCount++;
      }

      // Auto-expand failed test cases - ALWAYS expand failed cases
      if (!passed) {
        newExpandedState[testCase.id] = true;
      }

      results.push({
        testCaseId: testCase.id,
        passed,
        ...result,
        // Add additional data for better details
        compilationSucceeded: result ? result.success : false,
        expectedOutput: testCase.expectedOutput,
      });

      // Update results as they come in
      setTestCaseResults((prevResults) => [...prevResults, results[i]]);
    }

    // Set test summary
    setTestSummary({
      total: testCases.length,
      passed: passedCount,
      failed: testCases.length - passedCount,
    });

    // Update expanded state - important to set this AFTER results are shown
    setExpandedTestCases(newExpandedState);

    setIsRunningTests(false);
    setStatus(
      `Test run complete. ${passedCount}/${testCases.length} cases passed.`
    );

    // Force scroll to the results section
    setTimeout(() => {
      const resultsElement = document.querySelector(".test-results-container");
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Save test cases to localStorage
  useEffect(() => {
    localStorage.setItem("ide_test_cases", JSON.stringify(testCases));
  }, [testCases]);

  // Run single test case and display results
  const runSingleTestCase = async (testCase, index) => {
    if (!selectedLanguage) {
      setStatus("Please select a language");
      return;
    }

    if (!activeFile || !activeFile.content.trim()) {
      setStatus("No code to run");
      return;
    }

    setIsRunningTests(true);
    setActiveTab("testcases");
    setTestCaseInnerTab("results");
    setStatus(`Running test case ${index + 1}...`);

    // Clear previous results but preserve expanded states
    const currentExpanded = { ...expandedTestCases };
    setTestCaseResults([]);

    const result = await runTestCase(testCase);

    // Check if the test case passed
    let passed = false;

    // Only check output if compilation was successful
    if (result && result.success) {
      // Clean up expected and actual output for comparison
      const expectedOutput = testCase.expectedOutput
        .trim()
        .replace(/\r\n/g, "\n")
        .replace(/\s+/g, " ");

      const actualOutput = result.stdout
        .trim()
        .replace(/\r\n/g, "\n")
        .replace(/\s+/g, " ");

      passed = expectedOutput === actualOutput;
    }

    // Auto-expand this test case
    currentExpanded[testCase.id] = true;
    setExpandedTestCases(currentExpanded);

    const testResult = {
      testCaseId: testCase.id,
      passed,
      ...result,
      compilationSucceeded: result ? result.success : false,
      expectedOutput: testCase.expectedOutput,
    };

    setTestCaseResults([testResult]);

    // Set test summary for just this case
    setTestSummary({
      total: 1,
      passed: passed ? 1 : 0,
      failed: passed ? 0 : 1,
    });

    setIsRunningTests(false);
    setStatus(
      `Test case ${index + 1} run complete. ${passed ? "Passed ✓" : "Failed ✗"}`
    );

    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.querySelector(".test-results-container");
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Clear output
  const clearOutput = () => {
    setOutput("");
    setStatus("Output cleared");
  };

  // Clear input
  const clearInput = () => {
    setInput("");
    setStatus("Input cleared");
  };

  // Add a toggle layout function after clearInput function
  const toggleLayout = () => {
    setIsHorizontalLayout((prev) => !prev);
    setStatus(
      isHorizontalLayout
        ? "Console layout: Vertical"
        : "Console layout: Horizontal"
    );
  };

  // Save layout preference to localStorage
  useEffect(() => {
    localStorage.setItem(
      "ide_console_layout",
      JSON.stringify(isHorizontalLayout)
    );
  }, [isHorizontalLayout]);

  // Start splitter drag
  const handleSplitterDragStart = (e) => {
    setIsDraggingSplitter(true);
    splitterDragStartX.current = e.clientX;
    splitterDragStartRatio.current = splitRatio;

    // Add event listeners to the document
    document.addEventListener("mousemove", handleSplitterDragMove);
    document.addEventListener("mouseup", handleSplitterDragEnd);

    // Add classes for styling during drag
    document.body.classList.add("resize-x");
    document
      .querySelector(".editor-container")
      ?.classList.add("editor-splitter-active");

    // Prevent default to avoid text selection
    e.preventDefault();
  };

  // Handle splitter drag move
  const handleSplitterDragMove = (e) => {
    if (isDraggingSplitter) {
      const editorContainer = document.querySelector(".editor-container");
      if (!editorContainer) return;

      const containerWidth = editorContainer.clientWidth;
      const deltaX = e.clientX - splitterDragStartX.current;
      const deltaRatio = deltaX / containerWidth;

      // Limit the ratio to prevent editors from becoming too small
      const newRatio = Math.min(
        0.8,
        Math.max(0.2, splitterDragStartRatio.current + deltaRatio)
      );
      setSplitRatio(newRatio);

      // Force immediate update
      const primaryContainer = document.querySelector(
        ".primary-editor-container"
      );
      if (primaryContainer) {
        primaryContainer.style.width = `${newRatio * 100}%`;
      }

      // Prevent text selection during drag
      e.preventDefault();
    }
  };

  // End splitter drag
  const handleSplitterDragEnd = () => {
    setIsDraggingSplitter(false);

    // Remove event listeners
    document.removeEventListener("mousemove", handleSplitterDragMove);
    document.removeEventListener("mouseup", handleSplitterDragEnd);

    // Remove style classes
    document.body.classList.remove("resize-x");
    document
      .querySelector(".editor-container")
      ?.classList.remove("editor-splitter-active");
  };

  // Handle file drag start for the tab
  const handleTabDragStart = (e, fileId) => {
    e.dataTransfer.setData("fileId", fileId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle file drag over for the editor area
  const handleEditorDragOver = (e, isSecondary) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Add visual feedback
    const element = isSecondary
      ? document.querySelector(".secondary-editor-container")
      : document.querySelector(".primary-editor-container");

    if (element) {
      element.classList.add("drag-over");
    }
  };

  // Handle file drag leave for the editor area
  const handleEditorDragLeave = (e, isSecondary) => {
    e.preventDefault();

    // Remove visual feedback
    const element = isSecondary
      ? document.querySelector(".secondary-editor-container")
      : document.querySelector(".primary-editor-container");

    if (element) {
      element.classList.remove("drag-over");
    }
  };

  // Handle file drop for the editor area
  const handleEditorDrop = (e, isSecondary) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData("fileId");

    // Remove visual feedback
    const element = isSecondary
      ? document.querySelector(".secondary-editor-container")
      : document.querySelector(".primary-editor-container");

    if (element) {
      element.classList.remove("drag-over");
    }

    // If we're dropping to a different editor, set the file accordingly
    if (isSecondary) {
      setSecondaryFileId(fileId);

      // Ensure split view is enabled
      if (!isSplitView) {
        setIsSplitView(true);
      }
    } else {
      setActiveFileId(fileId);
    }
  };

  // Toggle split view without resizing
  const toggleSplitView = () => {
    // If we're turning on split view and there's no secondary file,
    // select a different file than the active one
    if (!isSplitView && !secondaryFileId) {
      const otherFiles = files.filter((file) => file.id !== activeFileId);
      if (otherFiles.length > 0) {
        setSecondaryFileId(otherFiles[0].id);
      } else {
        // If there's only one file, create a new one for the second pane
        const fileId = `file${Date.now()}`;
        const defaultExt = getDefaultExtension();
        const fileName = `untitled.${defaultExt}`;
        const newFileContent = getDefaultContent(defaultExt);

        // Create file in the open files array
        const newFile = {
          id: fileId,
          name: fileName,
          content: newFileContent,
          language: getFileLanguage(fileName),
          languageId: selectedLanguage?.id || null,
        };

        setFiles((prevFiles) => [...prevFiles, newFile]);
        setSecondaryFileId(fileId);

        // Add file to workspace
        addFileToWorkspace("root", fileId, fileName, newFileContent);
      }
    }

    setIsSplitView(!isSplitView);
  };

  // Handle code change in split view
  const handleCodeChangePrimary = (value) => {
    updateFileContent(activeFileId, value);
  };

  const handleCodeChangeSecondary = (value) => {
    if (secondaryFileId) {
      updateFileContent(secondaryFileId, value);
    }
  };

  // Add CSS for resize operations
  useEffect(() => {
    // Add CSS for cursor styles during resizing
    const style = document.createElement("style");
    style.innerHTML = `
      body.resize-x {
        cursor: col-resize !important;
        user-select: none !important;
      }
      body.resize-x * {
        cursor: col-resize !important;
        user-select: none !important;
      }
      .drag-over {
        box-shadow: inset 0 0 0 2px #3b82f6 !important;
        background-color: rgba(59, 130, 246, 0.1) !important;
      }
      .primary-editor-container, .secondary-editor-container {
        transition: width 0.05s ease;
      }
      .editor-splitter-active .primary-editor-container,
      .editor-splitter-active .secondary-editor-container {
        transition: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Control Panel */}
      <div className="bg-white dark:bg-gray-800 p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          {/* Language Selection */}
          <div className="flex items-center">
            <label className="hidden sm:block text-gray-700 dark:text-gray-300 mr-2">
              Language:
            </label>
            <select
              value={selectedLanguage?.id || ""}
              onChange={handleLanguageChange}
              className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {judgeLanguages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Selection */}
          <div className="flex items-center">
            <label className="hidden sm:block text-gray-700 dark:text-gray-300 mr-2">
              Theme:
            </label>
            <select
              value={selectedTheme}
              onChange={handleThemeChange}
              className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {editorThemes.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>

          {/* File Operations */}
          <div className="flex items-center gap-2 ml-auto">
            {/* <button
              onClick={() => newFile("root")}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
              title="New File (Ctrl+N)"
            >
              <DocumentPlusIcon className="h-5 w-5" />
            </button> */}
            <button
              onClick={() => openFile()}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
              title="Open File (Ctrl+O)"
            >
              <FolderOpenIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => saveFile(activeFileId)}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
              title="Save File (Ctrl+S)"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
            </button>
            <button
              onClick={formatCode}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
              title="Format Code (Shift+Alt+F)"
            >
              <CodeBracketIcon className="h-5 w-5" />
            </button>
            <button
              onClick={toggleExplorer}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
              title="Toggle Explorer (Ctrl+B)"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <button
              onClick={toggleSplitView}
              className={`p-2 rounded transition-colors flex items-center ${
                isSplitView
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              title={isSplitView ? "Merge Editors" : "Split Editor"}
            >
              {/* Replace plus icon with split view icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            </button>
            <button
              onClick={runAllTestCases}
              className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600 transition-colors flex items-center"
              title="Run Test Cases"
              disabled={isRunningTests}
            >
              <BeakerIcon className="h-5 w-5" />
            </button>
            <button
              onClick={runCode}
              className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors flex items-center"
              title="Run Code (F5)"
              disabled={isRunning}
            >
              <PlayIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer with resizable handle */}
        {isExplorerVisible && (
          <>
            <div
              className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg overflow-y-auto flex-shrink-0"
              style={{ width: `${explorerWidth}px` }}
            >
              <FileExplorer
                workspace={workspace}
                onFileSelect={handleFileSelect}
                onCreateFile={newFile}
                onCreateFolder={createFolder}
                onRenameItem={handleRenameItem}
                onDeleteItem={handleDeleteItem}
                onMoveItem={moveItem}
                activeFileId={activeFileId}
              />
            </div>
            {/* Resizable handle */}
            <div
              ref={explorerDragRef}
              onMouseDown={handleExplorerDragStart}
              className="w-1 bg-gray-300 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-700 cursor-col-resize transition-colors"
            ></div>
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* File Tabs */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto">
            <div className="flex">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center px-4 py-2 border-r border-gray-200 dark:border-gray-700 ${
                    activeFileId === file.id || secondaryFileId === file.id
                      ? "bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  } ${
                    activeFileId === file.id ? "border-b-2 border-blue-500" : ""
                  } 
                    ${
                      secondaryFileId === file.id
                        ? "border-b-2 border-purple-500"
                        : ""
                    }`}
                  draggable="true"
                  onDragStart={(e) => handleTabDragStart(e, file.id)}
                >
                  {editingFile === file.id ? (
                    <input
                      ref={fileNameInputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => {
                        if (editingName.trim()) {
                          handleRenameItem(file.id, editingName);
                        }
                        setEditingFile(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editingName.trim()) {
                            handleRenameItem(file.id, editingName);
                          }
                          setEditingFile(null);
                        } else if (e.key === "Escape") {
                          setEditingFile(null);
                        }
                      }}
                      className="bg-transparent border-b border-blue-500 outline-none px-1 w-32 min-w-0"
                      autoFocus
                    />
                  ) : (
                    <button
                      className="font-medium mr-2 focus:outline-none truncate max-w-xs"
                      onClick={() => {
                        // If the file is already in the secondary editor, let's keep it open
                        if (isSplitView && secondaryFileId === file.id) {
                          // Swap the files between editors
                          const tempFileId = activeFileId;
                          setActiveFileId(secondaryFileId);
                          setSecondaryFileId(tempFileId);
                        } else {
                          // Regular behavior - set as primary file
                          handleTabClick(file.id);
                        }
                      }}
                      onDoubleClick={(e) =>
                        startTabRename(file.id, file.name, e)
                      }
                    >
                      {file.name}
                    </button>
                  )}
                  <button
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                    onClick={() => closeFile(file.id)}
                    title="Close Tab (Ctrl+W)"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Monaco Code Editors - Split or Single View */}
          <div className="flex-1 overflow-hidden editor-container">
            {isSplitView ? (
              <div className="flex h-full">
                {/* Primary Editor */}
                <div
                  className="primary-editor-container h-full border-r border-gray-300 dark:border-gray-600"
                  style={{ width: "50%" }}
                  onDragOver={(e) => handleEditorDragOver(e, false)}
                  onDragLeave={(e) => handleEditorDragLeave(e, false)}
                  onDrop={(e) => handleEditorDrop(e, false)}
                >
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 flex items-center px-2 text-xs">
                    <span className="font-medium">{activeFile?.name}</span>
                  </div>
                  <div className="h-[calc(100%-1.5rem)] primary-editor">
                    <Editor
                      height="100%"
                      width="100%"
                      language={
                        activeFile
                          ? activeFile.name.includes(".")
                            ? activeFile.language
                            : "cpp"
                          : "cpp"
                      }
                      theme={selectedTheme}
                      value={activeFile ? activeFile.content : ""}
                      onChange={handleCodeChangePrimary}
                      onMount={(editor, monaco) =>
                        handleEditorDidMount(editor, monaco, false)
                      }
                      options={{
                        readOnly: false,
                        minimap: { enabled: true },
                        fontSize: 20,
                        fontFamily: "Consolas, 'Courier New', monospace",
                      }}
                    />
                  </div>
                </div>

                {/* Splitter - static divider */}
                <div className="w-2 bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>

                {/* Secondary Editor */}
                <div
                  className="secondary-editor-container h-full"
                  style={{ width: "50%" }}
                  onDragOver={(e) => handleEditorDragOver(e, true)}
                  onDragLeave={(e) => handleEditorDragLeave(e, true)}
                  onDrop={(e) => handleEditorDrop(e, true)}
                >
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 flex items-center justify-between px-2 text-xs">
                    <span className="font-medium">
                      {secondaryFile?.name || "No file"}
                    </span>
                    {!secondaryFile && (
                      <button
                        onClick={() => openFile("secondary")}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        Open a file
                      </button>
                    )}
                  </div>
                  <div className="h-[calc(100%-1.5rem)] secondary-editor">
                    {secondaryFile && (
                      <Editor
                        height="100%"
                        width="100%"
                        language={
                          secondaryFile
                            ? secondaryFile.name.includes(".")
                              ? secondaryFile.language
                              : "cpp"
                            : "cpp"
                        }
                        theme={selectedTheme}
                        value={secondaryFile ? secondaryFile.content : ""}
                        onChange={handleCodeChangeSecondary}
                        onMount={(editor, monaco) =>
                          handleEditorDidMount(editor, monaco, true)
                        }
                        options={{
                          readOnly: false,
                          minimap: { enabled: true },
                          fontSize: 20,
                          fontFamily: "Consolas, 'Courier New', monospace",
                        }}
                      />
                    )}
                    {!secondaryFile && (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <p>Drag a file here to open it</p>
                          <p>or</p>
                          <button
                            onClick={() => openFile("secondary")}
                            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
                          >
                            Open a file
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full">
                <Editor
                  height="100%"
                  width="100%"
                  language={
                    activeFile
                      ? activeFile.name.includes(".")
                        ? activeFile.language
                        : "cpp"
                      : "cpp"
                  }
                  theme={selectedTheme}
                  value={activeFile ? activeFile.content : ""}
                  onChange={handleCodeChange}
                  onMount={handleEditorDidMount}
                  options={{
                    readOnly: false,
                    minimap: { enabled: true },
                    fontSize: 20,
                    fontFamily: "Consolas, 'Courier New', monospace",
                  }}
                />
              </div>
            )}
          </div>

          {/* Resizable handle for output panel */}
          <div
            ref={outputDragRef}
            onMouseDown={handleOutputDragStart}
            className="h-1 bg-gray-300 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-700 cursor-row-resize transition-colors"
          ></div>

          {/* Tabs for Console and Test Cases */}
          <div
            className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
            style={{ height: `${outputHeight}px` }}
          >
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`px-4 py-2 font-medium ${
                  activeTab === "console"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-700 dark:text-gray-300"
                }`}
                onClick={() => setActiveTab("console")}
              >
                Console
              </button>
              <button
                className={`px-4 py-2 font-medium ${
                  activeTab === "testcases"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-700 dark:text-gray-300"
                }`}
                onClick={() => setActiveTab("testcases")}
              >
                Test Cases
              </button>
            </div>

            <div className="p-2 h-[calc(100%-40px)] overflow-auto">
              {activeTab === "console" ? (
                <div className="flex flex-col h-full">
                  <div
                    className={`${
                      isHorizontalLayout ? "flex flex-row" : "flex flex-col"
                    } h-full gap-2`}
                  >
                    {/* Input Box (Now First) */}
                    <div
                      className={`${
                        isHorizontalLayout ? "flex-1" : "flex-[2]"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Input:
                        </label>
                        <div className="flex space-x-2">
                          <button
                            onClick={toggleLayout}
                            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
                            title={
                              isHorizontalLayout
                                ? "Switch to vertical layout"
                                : "Switch to horizontal layout"
                            }
                          >
                            {isHorizontalLayout ? (
                              <span className="flex items-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                  />
                                </svg>
                                Vertical
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 8h16m0 0l-4-4m4 4l-4 4m-8 4H4m0 0l4 4m-4-4l4-4"
                                  />
                                </svg>
                                Horizontal
                              </span>
                            )}
                          </button>
                          <button
                            onClick={clearInput}
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            title="Clear input"
                          >
                            Clear
                          </button>
                          <button
                            onClick={runCode}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center"
                            title="Run Code (F5)"
                            disabled={isRunning}
                          >
                            <PlayIcon className="h-4 w-4 mr-1" />
                            Run
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Enter input for your program here..."
                        className="w-full h-[calc(100%-30px)] resize-none font-mono text-sm border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      ></textarea>
                    </div>

                    {/* Output Box (Now Second) */}
                    <div
                      className={`${
                        isHorizontalLayout ? "flex-1" : "flex-[3]"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Output:
                        </label>
                        <button
                          onClick={clearOutput}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          title="Clear output"
                        >
                          Clear
                        </button>
                      </div>
                      <textarea
                        value={output}
                        readOnly
                        className="w-full h-[calc(100%-30px)] resize-none font-mono text-sm border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      ></textarea>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Test Cases Panel - Tabs for Inputs and Results */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2">
                    <button
                      className={`px-3 py-1 font-medium ${
                        testCaseInnerTab === "inputs"
                          ? "text-blue-500 border-b-2 border-blue-500"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                      onClick={() => setTestCaseInnerTab("inputs")}
                    >
                      Inputs
                    </button>
                    <button
                      className={`px-3 py-1 font-medium ${
                        testCaseInnerTab === "results" &&
                        testCaseResults.length > 0
                          ? "text-blue-500 border-b-2 border-blue-500"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                      onClick={() => {
                        if (testCaseResults.length > 0) {
                          setTestCaseInnerTab("results");
                        } else {
                          setStatus(
                            "No test results available yet. Run tests first."
                          );
                        }
                      }}
                    >
                      Results{" "}
                      {testCaseResults.length > 0 &&
                        `(${testSummary.passed}/${testSummary.total})`}
                    </button>
                  </div>

                  <div className="flex flex-col h-full overflow-y-auto">
                    {/* Display inputs or results based on the inner tab selection */}
                    {testCaseInnerTab === "inputs" ? (
                      <>
                        {/* Add/Edit Test Case Form */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md mb-4">
                          <h3 className="text-lg font-medium mb-2">
                            {editingTestCaseId
                              ? "Edit Test Case"
                              : "Add Test Case"}
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Input:
                              </label>
                              <textarea
                                value={newTestCaseInput}
                                onChange={(e) =>
                                  setNewTestCaseInput(e.target.value)
                                }
                                placeholder="Enter test input..."
                                className="w-full h-20 resize-none font-mono text-sm border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                              ></textarea>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Expected Output:
                              </label>
                              <textarea
                                value={newTestCaseOutput}
                                onChange={(e) =>
                                  setNewTestCaseOutput(e.target.value)
                                }
                                placeholder="Enter expected output..."
                                className="w-full h-20 resize-none font-mono text-sm border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                              ></textarea>
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            {editingTestCaseId ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingTestCaseId(null);
                                    setNewTestCaseInput("");
                                    setNewTestCaseOutput("");
                                  }}
                                  className="mr-2 px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={saveEditTestCase}
                                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                  Save Changes
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={addTestCase}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                              >
                                <PlusCircleIcon className="h-4 w-4 mr-1" />
                                Add Test Case
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Test Cases List */}
                        {testCases.length > 0 && (
                          <div className="mt-4">
                            <h3 className="text-lg font-medium mb-2">
                              My Test Cases
                            </h3>
                            <div className="space-y-2 overflow-auto max-h-40">
                              {testCases.map((testCase, index) => (
                                <div
                                  key={testCase.id}
                                  className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md flex justify-between items-center"
                                >
                                  <div className="flex-1 overflow-hidden">
                                    <div className="font-medium">
                                      Test Case {index + 1}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 overflow-hidden overflow-ellipsis whitespace-nowrap">
                                      Input: {testCase.input.substring(0, 40)}
                                      {testCase.input.length > 40 ? "..." : ""}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() =>
                                        runSingleTestCase(testCase, index)
                                      }
                                      disabled={isRunningTests}
                                      className="p-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 rounded"
                                      title="Run this test case"
                                    >
                                      <PlayIcon className="h-4 w-4" />
                                      <span className="text-xs">Run</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        startEditTestCase(testCase)
                                      }
                                      className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() =>
                                        deleteTestCase(testCase.id)
                                      }
                                      className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {!isRunningTests && (
                              <button
                                onClick={runAllTestCases}
                                className="mt-2 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center"
                              >
                                <ArrowPathIcon className="h-4 w-4 mr-1" />
                                Run All Test Cases
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : testCaseResults.length > 0 ? (
                      <div className="flex flex-col h-full overflow-y-auto test-results-container">
                        {/* Test Case Summary */}
                        <div className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                          <h3 className="text-lg font-medium mb-2">
                            Test Summary
                          </h3>
                          <div className="flex space-x-6">
                            <div className="flex items-center">
                              <span className="mr-2">Total:</span>
                              <span className="font-medium">
                                {testSummary.total}
                              </span>
                            </div>
                            <div className="flex items-center text-green-600">
                              <CheckCircleIcon className="h-5 w-5 mr-1" />
                              <span className="font-medium">
                                {testSummary.passed}
                              </span>
                            </div>
                            <div className="flex items-center text-red-600">
                              <XCircleIcon className="h-5 w-5 mr-1" />
                              <span className="font-medium">
                                {testSummary.failed}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            {testSummary.passed === testSummary.total ? (
                              <span className="text-green-600">
                                All test cases passed successfully!
                              </span>
                            ) : (
                              <span className="text-red-600">
                                {testSummary.failed} test case
                                {testSummary.failed !== 1 ? "s" : ""} failed.
                                Check the detailed results below.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Test Case Results */}
                        <div className="mb-4 test-case-results">
                          <h3 className="text-lg font-medium mb-2 bg-white dark:bg-gray-800 py-1">
                            Test Results
                          </h3>
                          <div className="space-y-3">
                            {testCaseResults.map((result, index) => {
                              const testCase = testCases.find(
                                (tc) => tc.id === result.testCaseId
                              );
                              // Force expand all test cases initially when results are displayed
                              const isExpanded =
                                expandedTestCases[result.testCaseId] !==
                                undefined
                                  ? expandedTestCases[result.testCaseId]
                                  : !result.passed; // Auto-expand failed test cases

                              // For better output comparison
                              const expectedOutput =
                                testCase?.expectedOutput?.trim() || "";
                              const actualOutput = result.stdout?.trim() || "";

                              // Function to highlight differences
                              const renderDiff = () => {
                                if (
                                  !result.compilationSucceeded ||
                                  !expectedOutput ||
                                  !actualOutput
                                ) {
                                  return null;
                                }

                                if (expectedOutput === actualOutput) {
                                  return (
                                    <div className="text-green-600 text-xs">
                                      Outputs match exactly
                                    </div>
                                  );
                                }

                                return (
                                  <div className="col-span-2 mt-2">
                                    <div className="text-sm font-medium mb-1 text-amber-600">
                                      Output Difference:
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded overflow-auto max-h-24 text-xs border border-amber-200">
                                      <p>Expected and actual outputs differ:</p>
                                      <ul className="list-disc pl-4 mt-1">
                                        {expectedOutput.length !==
                                          actualOutput.length && (
                                          <li>
                                            Length: Expected{" "}
                                            {expectedOutput.length} chars, got{" "}
                                            {actualOutput.length} chars
                                          </li>
                                        )}
                                        {expectedOutput.split("\n").length !==
                                          actualOutput.split("\n").length && (
                                          <li>
                                            Line count: Expected{" "}
                                            {expectedOutput.split("\n").length}{" "}
                                            lines, got{" "}
                                            {actualOutput.split("\n").length}{" "}
                                            lines
                                          </li>
                                        )}
                                        {/\s/.test(expectedOutput) !==
                                          /\s/.test(actualOutput) && (
                                          <li>
                                            Whitespace differences detected
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                );
                              };

                              return (
                                <div
                                  key={result.testCaseId}
                                  className={`p-3 rounded-md ${
                                    result.passed
                                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900"
                                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900"
                                  }`}
                                >
                                  <div
                                    className="flex justify-between items-center mb-2 cursor-pointer"
                                    onClick={() =>
                                      toggleTestCaseExpansion(result.testCaseId)
                                    }
                                  >
                                    <div className="flex items-center">
                                      <span className="font-medium mr-2">
                                        Test Case {index + 1}
                                      </span>
                                      {result.passed ? (
                                        <span className="text-green-600 flex items-center">
                                          <CheckCircleIcon className="h-5 w-5 mr-1" />
                                          Passed
                                        </span>
                                      ) : (
                                        <span className="text-red-600 flex items-center">
                                          <XCircleIcon className="h-5 w-5 mr-1" />
                                          Failed
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center">
                                      <div className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                                        {result.executionTime}s,{" "}
                                        {result.memoryUsed} KB
                                      </div>
                                      {isExpanded ? (
                                        <ChevronUpIcon className="h-5 w-5" />
                                      ) : (
                                        <ChevronDownIcon className="h-5 w-5" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Collapsible Details */}
                                  {isExpanded && (
                                    <>
                                      {/* Compilation Status */}
                                      <div className="mb-2">
                                        <span className="text-sm">
                                          Compilation:{" "}
                                          {result.compilationSucceeded ? (
                                            <span className="text-green-600">
                                              Successful
                                            </span>
                                          ) : (
                                            <span className="text-red-600">
                                              Failed
                                            </span>
                                          )}
                                        </span>
                                        <span className="ml-4 text-sm">
                                          Judge0 Status:{" "}
                                          <span
                                            className={
                                              result.status === 3
                                                ? "text-green-600"
                                                : "text-amber-600"
                                            }
                                          >
                                            {result.statusDescription}
                                          </span>
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div>
                                          <div className="text-sm font-medium mb-1">
                                            Input:
                                          </div>
                                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-24">
                                            {testCase?.input || ""}
                                          </pre>
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium mb-1">
                                            Expected Output:
                                          </div>
                                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-24">
                                            {testCase?.expectedOutput || ""}
                                          </pre>
                                        </div>
                                        <div className="col-span-2">
                                          <div className="text-sm font-medium mb-1">
                                            Actual Output:
                                          </div>
                                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-24">
                                            {result.stdout ||
                                              (result.error
                                                ? result.message
                                                : "")}
                                          </pre>
                                        </div>

                                        {!result.passed && (
                                          <div className="col-span-2">
                                            <div className="text-sm font-medium mb-1 text-red-600">
                                              Reason for Test Failure:
                                            </div>
                                            <div className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto max-h-24">
                                              {!result.compilationSucceeded
                                                ? "Compilation failed"
                                                : "Actual output doesn't match expected output"}
                                            </div>
                                          </div>
                                        )}

                                        {!result.passed &&
                                          result.compilationSucceeded &&
                                          renderDiff()}

                                        {(result.stderr ||
                                          result.compileOutput) && (
                                          <div className="col-span-2">
                                            <div className="text-sm font-medium mb-1 text-red-600">
                                              Error:
                                            </div>
                                            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-24 text-red-600">
                                              {result.compileOutput ||
                                                result.stderr}
                                            </pre>
                                          </div>
                                        )}

                                        {result.message && (
                                          <div className="col-span-2">
                                            <div className="text-sm font-medium mb-1 text-amber-600">
                                              System Message:
                                            </div>
                                            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-24 text-amber-600">
                                              {result.message}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Buttons to switch to inputs or run tests again */}
                        <div className="flex justify-between mb-4 mt-auto">
                          <button
                            onClick={() => setTestCaseInnerTab("inputs")}
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
                          >
                            Back to Inputs
                          </button>
                          <button
                            onClick={runAllTestCases}
                            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center"
                            disabled={isRunningTests}
                          >
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Run Tests Again
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-full text-gray-500">
                        No test results yet. Run tests to see results here.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300 text-sm">
            {status}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDETab;
