"use client";
import React from "react";
import { useCommandBus } from "@/lib/commandBus";

interface ToolbarProps {
  className?: string;
}

export function CommandToolbar({ className = "" }: ToolbarProps) {
  const { canUndo, canRedo, undo, redo, commands, currentIndex, clear } = useCommandBus();

  const lastCommand = currentIndex >= 0 ? commands[currentIndex] : null;
  const nextCommand = currentIndex < commands.length - 1 ? commands[currentIndex + 1] : null;

  return (
    <div className={`flex items-center gap-2 p-2 bg-gray-50 border-b ${className}`}>
      {/* Undo/Redo Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
            canUndo
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          title={lastCommand ? `Undo: ${lastCommand.description}` : "Nothing to undo"}
        >
          <UndoIcon />
          Undo
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
            canRedo
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          title={nextCommand ? `Redo: ${nextCommand.description}` : "Nothing to redo"}
        >
          <RedoIcon />
          Redo
        </button>
      </div>

      {/* Command History Info */}
      <div className="text-xs text-gray-500 px-2 border-l">
        {commands.length > 0 ? (
          <span>
            {currentIndex + 1} / {commands.length} commands
          </span>
        ) : (
          <span>No commands</span>
        )}
      </div>

      {/* Last Command Display */}
      {lastCommand && (
        <div className="text-xs text-gray-600 px-2 border-l">
          <span className="font-medium">Last:</span> {lastCommand.description}
        </div>
      )}

      {/* Clear History */}
      {commands.length > 0 && (
        <button
          onClick={clear}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border-l ml-auto"
          title="Clear command history"
        >
          Clear History
        </button>
      )}
    </div>
  );
}

// Simple icon components
function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
    </svg>
  );
}
