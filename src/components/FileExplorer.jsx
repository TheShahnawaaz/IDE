import React, { useState, useContext, useRef } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import {
  FolderIcon,
  DocumentIcon,
  FolderPlusIcon,
  DocumentPlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const FileExplorer = ({
  workspace,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem,
  onMoveItem,
  activeFileId,
}) => {
  const { theme } = useContext(ThemeContext);
  const [expandedFolders, setExpandedFolders] = useState(() => {
    const savedExpandedFolders = localStorage.getItem("ide_expanded_folders");
    return savedExpandedFolders ? JSON.parse(savedExpandedFolders) : ["root"];
  });
  const [contextMenu, setContextMenu] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingName, setEditingName] = useState("");

  // Drag and drop states
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const nameInputRef = useRef(null);

  // Save expanded folders to localStorage
  const saveExpandedFolders = (folders) => {
    localStorage.setItem("ide_expanded_folders", JSON.stringify(folders));
    setExpandedFolders(folders);
  };

  // Toggle folder expansion
  const toggleFolder = (folderId) => {
    if (expandedFolders.includes(folderId)) {
      saveExpandedFolders(expandedFolders.filter((id) => id !== folderId));
    } else {
      saveExpandedFolders([...expandedFolders, folderId]);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: item,
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Start editing an item name
  const startEditingItem = (item) => {
    setEditingItem(item);
    setEditingName(item.name);
    closeContextMenu();
    // Focus will be handled by useEffect
  };

  // Handle rename completion
  const completeRename = () => {
    if (editingName.trim() && editingItem) {
      onRenameItem(editingItem.id, editingName);
    }
    setEditingItem(null);
  };

  // Handle key press during rename
  const handleRenameKeyDown = (e) => {
    if (e.key === "Enter") {
      completeRename();
    } else if (e.key === "Escape") {
      setEditingItem(null);
    }
  };

  // Delete an item
  const deleteItem = (item) => {
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      onDeleteItem(item.id);
    }
    closeContextMenu();
  };

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    // Prevent drag during editing
    if (editingItem) {
      e.preventDefault();
      return;
    }

    // Set data for drag operation
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";

    // Use a custom drag image instead of default
    const dragImage = document.createElement("div");
    dragImage.className = "drag-image";

    // Apply theme-aware styling with fixed width
    const isDarkMode = theme === "dark";
    const bgColor = isDarkMode ? "#1e293b" : "white";
    const textColor = isDarkMode ? "#e2e8f0" : "#374151";
    const borderColor = isDarkMode ? "#475569" : "#d1d5db";

    dragImage.innerHTML = `
      <div style="
        padding: 5px; 
        background: ${bgColor}; 
        color: ${textColor};
        border: 1px solid ${borderColor}; 
        border-radius: 3px; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        width: auto;
        max-width: 180px;
        display: inline-flex;
        align-items: center;
        font-size: 12px;
      ">
        <span style="margin-right: 5px;">${
          item.type === "folder" ? "📁" : "📄"
        }</span>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${
          item.name
        }</span>
      </div>
    `;

    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 15, 15);

    // Clean up the drag image element after drag starts
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    setDraggedItem(item);
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();

    // Only allow dropping onto folders
    if (item.type === "folder") {
      e.dataTransfer.dropEffect = "move";
      setDropTarget(item);
      setIsDraggingOver(true);

      // Auto-expand folder after hovering for a bit
      if (!expandedFolders.includes(item.id)) {
        // Check if we're still hovering over the same folder
        if (dropTarget && dropTarget.id === item.id) {
          // Only expand after a delay to prevent accidental expansion
          clearTimeout(window.expandFolderTimeout);
          window.expandFolderTimeout = setTimeout(() => {
            if (dropTarget && dropTarget.id === item.id) {
              saveExpandedFolders([...expandedFolders, item.id]);
            }
          }, 800);
        }
      }
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
    clearTimeout(window.expandFolderTimeout);
  };

  const handleDrop = (e, targetFolder) => {
    e.preventDefault();

    setIsDraggingOver(false);
    setDropTarget(null);

    const itemId = e.dataTransfer.getData("text/plain");

    // Check valid move scenarios
    // 1. Can't drop onto itself
    if (itemId === targetFolder.id) return;

    // 2. Find the parent folder of the dragged item
    let parentFound = false;
    const findParent = (folder) => {
      if (!folder.children) return false;

      if (folder.children.some((item) => item.id === itemId)) {
        parentFound = folder.id;
        return true;
      }

      for (const child of folder.children) {
        if (child.type === "folder") {
          if (findParent(child)) return true;
        }
      }

      return false;
    };

    findParent(workspace);

    // 3. Can't drop into current parent (no-op)
    if (parentFound === targetFolder.id) return;

    // Perform the move
    onMoveItem(itemId, targetFolder.id);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
    setIsDraggingOver(false);
    clearTimeout(window.expandFolderTimeout);
  };

  // Render a file item
  const renderFile = (file) => {
    const isActive = file.id === activeFileId;
    const isEditing = editingItem && editingItem.id === file.id;
    const isDragging = draggedItem && draggedItem.id === file.id;

    return (
      <div
        key={file.id}
        className={`flex items-center px-2 py-1 cursor-pointer ${
          isActive
            ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
            : isDragging
            ? "opacity-50"
            : "hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        onClick={() => onFileSelect(file)}
        onContextMenu={(e) => handleContextMenu(e, file)}
        onDoubleClick={() => startEditingItem(file)}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStart(e, file)}
        onDragEnd={handleDragEnd}
      >
        <DocumentIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
        {isEditing ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={completeRename}
            onKeyDown={handleRenameKeyDown}
            className="w-full bg-white dark:bg-gray-800 border border-blue-500 px-1 outline-none"
            autoFocus
          />
        ) : (
          <span className="text-sm truncate">{file.name}</span>
        )}
      </div>
    );
  };

  // Render a folder item and its children
  const renderFolder = (folder, level = 0) => {
    const isExpanded = expandedFolders.includes(folder.id);
    const isEditing = editingItem && editingItem.id === folder.id;
    const isDragging = draggedItem && draggedItem.id === folder.id;
    const isDropTarget = dropTarget && dropTarget.id === folder.id;
    const paddingLeft = level * 8;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center px-2 py-1 cursor-pointer ${
            isDragging
              ? "opacity-50"
              : isDropTarget && isDraggingOver
              ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder)}
          onDoubleClick={() => startEditingItem(folder)}
          style={{ paddingLeft: `${paddingLeft}px` }}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, folder)}
          onDragOver={(e) => handleDragOver(e, folder)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder)}
          onDragEnd={handleDragEnd}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
          <FolderIcon
            className={`h-4 w-4 ${
              isDropTarget && isDraggingOver
                ? "text-blue-500 dark:text-blue-400"
                : "text-yellow-500 dark:text-yellow-400"
            } mx-1`}
          />
          {isEditing ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={completeRename}
              onKeyDown={handleRenameKeyDown}
              className="w-full bg-white dark:bg-gray-800 border border-blue-500 px-1 outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate">{folder.name}</span>
          )}
        </div>
        {isExpanded && folder.children && (
          <div className="ml-4">
            {folder.children
              .filter((child) => child.type === "folder")
              .map((childFolder) => renderFolder(childFolder, level + 1))}
            {folder.children
              .filter((child) => child.type === "file")
              .map((childFile) => renderFile(childFile))}
          </div>
        )}
      </div>
    );
  };

  // Render context menu
  const renderContextMenu = () => {
    if (!contextMenu) return null;

    const { x, y, item } = contextMenu;
    const isFolder = item.type === "folder";

    return (
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 shadow-md rounded border border-gray-200 dark:border-gray-700 py-1"
        style={{ left: x, top: y }}
      >
        {isFolder && (
          <>
            <button
              className="w-full text-left px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              onClick={() => {
                onCreateFile(item.id);
                closeContextMenu();
              }}
            >
              New File
            </button>
            <button
              className="w-full text-left px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              onClick={() => {
                onCreateFolder(item.id);
                closeContextMenu();
              }}
            >
              New Folder
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          </>
        )}
        <button
          className="w-full text-left px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
          onClick={() => startEditingItem(item)}
        >
          Rename
        </button>
        <button
          className="w-full text-left px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 text-sm"
          onClick={() => deleteItem(item)}
        >
          Delete
        </button>
      </div>
    );
  };

  // Effect to handle clicks outside context menu
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu]);

  // Effect to focus on input when editing starts
  React.useEffect(() => {
    if (editingItem && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editingItem]);

  return (
    <div className="p-2 select-none">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-300">
          EXPLORER
        </h2>
        <div className="flex space-x-1">
          <button
            onClick={() => onCreateFile("root")}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="New File"
          >
            <DocumentPlusIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => onCreateFolder("root")}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="New Folder"
          >
            <FolderPlusIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="mt-2 text-gray-700 dark:text-gray-300">
        {renderFolder(workspace)}
      </div>

      {renderContextMenu()}

      {/* Instructions for drag and drop */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 px-2 border-t border-gray-200 dark:border-gray-700 pt-2">
        <p>Drag and drop files or folders to move them</p>
      </div>
    </div>
  );
};

export default FileExplorer;
