# ZabaSearch Helper

A Chrome extension that automates the extraction of names from various search platforms and searches for contact information on ZabaSearch. This tool streamlines the process of finding email addresses and contact details for lead generation and research purposes.

## Features

### Name Extraction
- **Google Search**: Extract names from Google search results based on a first name query
- **ContactOut**: Extract names from ContactOut dashboard search results (supports pagination)
- **FastPeopleSearch**: Extract names from FastPeopleSearch results

### Bark.com Integration
- Extract project details from Bark.com seller dashboard
- Automatically populate search fields with client information (name, email, city, state)
- Copy project content to clipboard with keyboard shortcut

### ZabaSearch Processing
- Automatically search ZabaSearch for each extracted name
- Filter email addresses based on customizable email patterns
- Display matched results in an organized interface

### User Experience
- Side panel interface for easy access
- Persistent storage of form inputs
- Real-time status updates during processing
- Keyboard shortcuts for quick actions

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager
- Google Chrome browser

### Build Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd zabasearch-helper
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from the project directory

## Usage

### Opening the Side Panel

- Click the extension icon in the Chrome toolbar, or
- Use the keyboard shortcut: `Ctrl+Shift+Y` (Windows/Linux) or `Command+Shift+Y` (Mac)

### Extracting Names

1. **From Google Search**:
   - Navigate to a Google search results page
   - Enter a first name in the "First Name" field
   - Click the "Google" button to extract names from the current search results

2. **From ContactOut**:
   - Navigate to ContactOut dashboard search page
   - Enter a first name in the "First Name" field
   - Click the "CO" button to extract names (automatically handles pagination)

3. **From FastPeopleSearch**:
   - Navigate to a FastPeopleSearch results page
   - Enter a first name in the "First Name" field
   - Click the "FPS" button to extract names

### Using Bark.com Data

1. Navigate to a Bark.com seller dashboard page
2. Click "Apply Data from Bark" in the side panel
3. The extension will automatically populate:
   - First Name (from client name)
   - Email Pattern (from client email)
   - City and State (from project location)

### Copying Bark Content

- While on a Bark.com dashboard page, use the keyboard shortcut: `Ctrl+Shift+F` (Windows/Linux) or `Command+Shift+F` (Mac)
- This copies the project title and details to your clipboard

### Searching and Processing

1. Fill in the required fields:
   - **First Name**: The first name to search for
   - **Email Pattern**: Pattern to filter emails (e.g., `@example.com` or `john.*@company.com`)
   - **City**: Target city for the search
   - **State**: Select the state from the dropdown

2. Extract names using one of the extraction methods (Google, ContactOut, or FastPeopleSearch)

3. Review the extracted names in the "Extracted Names" textarea

4. Click "Search & Process" to:
   - Search ZabaSearch for each name
   - Filter results based on the email pattern
   - Display matched results

## Project Structure

```
zabasearch-helper/
├── dist/                    # Built extension files (generated)
├── public/                  # Static assets
│   ├── manifest.json        # Extension manifest
│   └── icon.png            # Extension icon
├── src/
│   ├── background/         # Background service worker
│   │   └── background.js   # Handles messages and tab management
│   ├── content/            # Content scripts
│   │   └── content.js      # Extracts data from web pages
│   └── sidebar/            # Side panel UI
│       ├── sidebar.html    # Side panel HTML
│       ├── sidebar.js     # Side panel logic
│       └── sidebar.css    # Side panel styles
├── package.json            # Project dependencies
├── vite.config.js         # Vite build configuration
└── README.md              # This file
```

## Development

### Development Mode

For development with hot reload:
```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview

```bash
npm run preview
```

## Keyboard Shortcuts

- `Ctrl+Shift+Y` / `Command+Shift+Y`: Open/close side panel
- `Ctrl+Shift+F` / `Command+Shift+F`: Copy Bark dashboard content to clipboard

## Permissions

This extension requires the following permissions:

- **activeTab**: Access to the current active tab
- **sidePanel**: Display the side panel interface
- **scripting**: Execute scripts on web pages
- **storage**: Save user preferences locally

### Host Permissions

The extension can access the following domains:
- `https://contactout.com/*`
- `https://www.fastpeoplesearch.com/*`
- `https://www.zabasearch.com/*`
- `https://www.bark.com/*`

## Supported Websites

- **Google Search**: `https://www.google.com/search*`
- **ContactOut**: `https://contactout.com/dashboard/search*`
- **FastPeopleSearch**: `https://www.fastpeoplesearch.com/name*`
- **Bark.com**: `https://www.bark.com/sellers/dashboard/*`
- **ZabaSearch**: `https://www.zabasearch.com/*`

## Notes

- The extension automatically saves your form inputs (first name, email pattern, city, state) for convenience
- Processing multiple names includes a small delay between requests to avoid overwhelming servers
- Email pattern matching supports wildcards (use `*` for any characters)
- State names are automatically normalized and formatted for URL compatibility

## License

This project is private and not licensed for public use.

