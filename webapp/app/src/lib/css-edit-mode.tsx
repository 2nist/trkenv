"use client";
import React from 'react';

// The in-app CSS editor has been removed. This file remains as a no-op stub to avoid import errors.

export const CssEditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const useCssEdit = () => {
  return undefined as unknown as {
    enabled: boolean;
    toggle: () => void;
  };
};
