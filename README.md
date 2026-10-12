# AgendApp

A responsive personal address book built with JavaScript, CSS and Vite. Manage contacts, search your directory and create CSV backups. The interface supports English and Italian, with dark mode enabled by default.

## Contents

- [Repository Structure](#repository-structure)
- [Tech stack](#tech-stack)
- [Features](#features)
- [Screenshots](#screenshots)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Contact validation](#contact-validation)
- [CSV import and export](#csv-import-and-export)
- [Storage and backups](#storage-and-backups)
- [Tests and build](#tests-and-build)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Repository Structure

```text
AgendApp/
|-- docs/screenshots/
|   |-- contacts-desktop.png
|   |-- contact-validation.png
|   |-- csv-import-preview.png
|   |-- csv-import-result.png
|   `-- contacts-mobile.png
|-- examples/
|   `-- agenda-2026-10-12.csv
|-- public/favicon.svg
|-- src/
|   |-- contacts.js
|   |-- translations.js
|   |-- main.js
|   `-- styles.css
|-- tests/contacts.test.js
|-- .gitignore
|-- index.html
|-- LICENSE
|-- package-lock.json
|-- package.json
|-- README.md
`-- vite.config.js
```

## Tech stack

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=000000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS](https://img.shields.io/badge/CSS-663399?style=for-the-badge&logo=css&logoColor=FFFFFF)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=FFFFFF)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFFFFF)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-417E38?style=for-the-badge&logo=nodedotjs&logoColor=FFFFFF)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=FFFFFF)](https://www.npmjs.com/)

- **JavaScript:** application logic, contact validation and CSV handling.
- **HTML and CSS:** interface structure, themes and responsive layout.
- **Vite:** development server and production build.
- **Node.js and npm:** development tools, dependency management and automated tests.
- **Browser localStorage:** local storage for contacts and preferences.
- **SVG:** reusable interface icons.

## Features

- Create, edit and delete contacts, with confirmation before deletion.
- Search across contact fields without case or accent sensitivity.
- Favorites, country filters and sorting by last name or city.
- English and Italian interface, with saved language and theme preferences.
- Shared contact validation for creation, editing and CSV import.
- CSV import preview with duplicate detection and optional updates.
- Export the currently displayed contacts to CSV.
- Synchronize contacts across tabs of the same browser.

## Screenshots

### Contacts view

<img src="docs/screenshots/contact-view.png" alt="Contact view with fictional contacts" width="1000" />

### Contact validation

Invalid email and short phone messages appear inside the form while preserving the entered values.

<img src="docs/screenshots/contact-validation.png" alt="Contact form showing email and phone validation errors" width="600" />

### CSV import preview

<img src="docs/screenshots/csv-import-preview.png" alt="CSV import preview with valid, duplicate and invalid contacts" width="600" />

### Mobile directory

<img src="docs/screenshots/contact-mobile.png" alt="Contact directory on a mobile viewport" width="390" />

## Requirements

- Node.js 22.12 or later and npm.
- A modern browser such as Chrome, Firefox, Edge or Safari.

## Installation

Open a terminal in the project directory, where `package.json` is located. From Development:

```powershell
npm install
npm run dev
```

Open the local address printed by Vite. Keep the terminal running while using the app and press `Ctrl+C` to stop it. Do not open `index.html` directly.

## Usage

The first launch uses English and dark mode. Existing saved language preferences take precedence. Use the language button to switch between `EN` and `IT`, and the sun/moon button to change the theme.

Select **New contact** to add a contact. Use the row actions to edit, delete or view contact details, and the star button to manage favorites. Search or filter the directory to narrow the displayed contacts; `Ctrl+K` / `Cmd+K` focuses the search field.

## Contact validation

First and last names are required. Email and phone are optional, but filled fields must pass the same checks when creating, editing or importing contacts:

- **Email:** a valid email format.
- **Phone:** 10–15 total digits, including any international prefix, with an optional leading `+`, spaces, parentheses and hyphens. Formatting characters do not count toward the digit total.
- **Field length:** up to 254 characters for regular fields and 2,000 for notes.

Errors appear inside the contact form without clearing the entered values. These checks validate formatting, not whether an email address or phone number exists.

Manual entry detects possible duplicates by email, normalized phone number or first and last names. You can explicitly choose **Save anyway** for a valid contact.

## CSV import and export

### Import

Select **Import CSV** and choose a UTF-8 `.csv` file up to 5 MB, using `;` or `,` as its separator. Start with the [sample exported CSV](examples/agenda-2026-10-12.csv) to see the supported format.

Headers must match the English or Italian export field names. First and last name columns are required; other supported columns are optional. Unknown or repeated columns, malformed quoting, inconsistent column counts and invalid UTF-8 cause the entire file to be rejected. Files without a `.csv` extension are also rejected.

The preview shows new contacts, duplicates and invalid rows. Expand the excluded-row details to see the row numbers and reasons. Invalid contacts are skipped while valid new contacts can still be imported.

Duplicates are skipped by default, including repeats within the file. To update existing contacts, explicitly select **Update existing contacts** before confirming. Updates replace the supplied contact data, including empty values and omitted optional fields, while preserving IDs and favorites. Matches involving multiple existing contacts and further rows targeting the same contact remain excluded.

After confirmation, the result reports new contacts imported, contacts updated, duplicates skipped and invalid rows. A file containing only duplicates imports no new contacts unless you choose to update existing records. An empty catalog file also reports that no contacts were imported.

### Export

Select **Export CSV** to download the currently displayed contacts, respecting the active search, country filter and favorites view. Headers follow the selected interface language.

Exports use UTF-8, semicolon separators and quoted fields. Values that could be interpreted as spreadsheet formulas are protected with a leading apostrophe; the importer removes this protection when reading an exported file. Contact IDs and favorite flags are not included in CSV exports.

## Storage and backups

Contacts are stored in browser `localStorage` under `agenda.contacts.v1`. Language and theme use `agenda.language.v1` and `agenda.theme.v1`.

The app has no backend or database. Contacts are not sent to a server and do not synchronize across devices. Clearing site data can delete your contacts, so export CSV backups regularly. The app displays a warning if browser storage is unavailable.

Duplicate detection can produce false positives for people sharing the same name, and differently formatted international phone numbers may not match automatically.

## Tests and build

| Command           | Purpose                               |
| ----------------- | ------------------------------------- |
| `npm install`     | Install dependencies.                 |
| `npm run dev`     | Start the development server.         |
| `npm test`        | Run the automated Node.js tests.      |
| `npm run build`   | Generate production files in `dist/`. |
| `npm run preview` | Preview the generated build locally.  |

```sh
npm test
npm run build
npm run preview
```

## Troubleshooting

| Problem                        | Check                                                                |
| ------------------------------ | -------------------------------------------------------------------- |
| npm cannot find `package.json` | Run commands from the project directory.                             |
| `vite` is not recognized       | Complete `npm install` before starting the app.                      |
| A contact cannot be saved      | Check the validation messages inside the form.                       |
| A CSV is rejected              | Check the extension, encoding, size, headers and structure.          |
| No new contacts are imported   | Review the duplicate and invalid-row counts.                         |
| The interface remains Italian  | Switch to `EN`; the browser retains an existing language preference. |

## License

See [LICENSE](LICENSE) for the project's MIT license.
