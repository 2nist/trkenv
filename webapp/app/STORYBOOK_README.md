# TRK Studio Storybook

## ✅ **Current Status: WORKING**

Storybook is successfully running at `http://localhost:6006` with:
- ✅ Clean white header with TRK Studio branding
- ✅ Hidden navigation buttons (Library, Playhead, Design, Record, Editor)
- ✅ DYMO font styling throughout the interface
- ✅ Customizable sidebar with GUI components
- ✅ Editable routing - users can add/remove components

## Overview

This Storybook instance serves as the central hub for all GUI components and pages in TRK Studio. The sidebar is fully customizable and uses the DYMO font for a consistent, professional look.

## Features

- ✅ Clean white header with TRK Studio branding
- ✅ Hidden navigation buttons (Library, Playhead, Design, Record, Editor)
- ✅ DYMO font styling throughout the interface
- ✅ Customizable sidebar with all GUI components
- ✅ Editable routing - users can add/remove components

## Current Components in Sidebar

- **Lab Menu** - Main navigation for lab modules
- **LRC Attach Button** - Button for attaching LRC files
- **Song Search** - Search component for finding songs
- **Welcome Page** - Sample page demonstrating the system

## Adding Components to Sidebar

### Method 1: Create Story Files

Create new `.stories.tsx` files in `src/stories/`:

```typescript
// src/stories/MyComponent.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import MyComponent from '../components/MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'GUI Components/My Component',
  component: MyComponent,
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    // your props here
  },
};
```

### Method 2: Edit Existing Stories

Modify `src/stories/GUI.stories.tsx` to add new components:

```typescript
// Add to imports
import MyNewComponent from '../components/MyNewComponent';

// Add new story
export const MyNewComponentStory: Story = {
  name: 'My New Component',
  render: () => <MyNewComponent />,
  parameters: {
    docs: {
      description: {
        story: 'Description of my new component.',
      },
    },
  },
};
```

## Removing Components from Sidebar

### Method 1: Comment Out Stories

In the story files, comment out or remove the story exports:

```typescript
// export const ComponentToRemove: Story = { ... }; // Commented out
```

### Method 2: Delete Story Files

Remove the `.stories.tsx` files from `src/stories/` directory.

## Customizing the Sidebar

### Font Styling

All sidebar items use the DYMO font. The styling is controlled by CSS in `.storybook/main.ts`.

### Layout

The sidebar automatically organizes components by their story titles. Use forward slashes in titles for grouping:

```typescript
title: 'GUI Components/Forms/Input Field'  // Creates nested structure
```

## Running Storybook

```bash
npm run storybook
```

The Storybook will be available at `http://localhost:6006`

## Adding New Pages

To add new pages to the sidebar:

1. Create a page component in the `pages/` directory
2. Create a story in `src/stories/` with `.stories.tsx` extension
3. Import and export the story
4. The page will automatically appear in the sidebar

## Technical Details

- **Framework**: Storybook v9.1.6 with Next.js integration
- **Font**: DYMO font for consistent branding
- **Styling**: Custom CSS injected via `managerHead` in main.ts
- **Navigation**: Top navigation buttons are hidden while keeping the header
- **Sidebar**: Fully customizable with DYMO font styling

This setup provides a clean, professional interface for component development while maintaining full customization capabilities.