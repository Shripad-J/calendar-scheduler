# Calendar Scheduler

A responsive calendar scheduling application built with React, providing an interactive interface for creating and managing events across weekly and monthly views.

## Features

* 🔐 **Authentication**

  * Login using DummyJSON authentication API
  * Protected calendar access
  * Logout and session handling
  * Access-token refresh handling

* 📅 **Calendar**

  * Week and Month views
  * Previous, Next and Today navigation
  * Date and timezone selection
  * URL-based calendar state

* 📝 **Event Management**

  * Create events by dragging across calendar time slots
  * Create, edit and delete events
  * 15-minute time-slot snapping
  * Move events using drag and drop
  * Resize events
  * All-day events
  * Event descriptions
  * Reminders

* 🔁 **Recurring Events**

  * Daily, weekly and monthly recurrence
  * Recurrence by count or end date
  * Edit individual occurrences or recurring series

* 👥 **Attendees**

  * Searchable attendee selection
  * Multiple attendees
  * Basic attendee availability / overlap warning

* ↩️ **History**

  * Undo and Redo
  * Keyboard shortcuts:

    * `Ctrl + Z` — Undo
    * `Ctrl + Shift + Z` — Redo

* 💾 **Persistence**

  * Events persisted using LocalStorage
  * Versioned storage schema
  * Corrupted storage recovery

* 🌐 **API Integration**

  * Axios-based API services
  * DummyJSON API integration
  * Centralized Axios configuration
  * Authentication token handling

## Tech Stack

| Technology   | Usage                             |
| ------------ | --------------------------------- |
| React        | Frontend UI                       |
| JavaScript   | Application logic                 |
| Tailwind CSS | Styling                           |
| Axios        | API communication                 |
| Vite         | Development and build tooling     |
| DummyJSON    | Authentication and event/user API |
| LocalStorage | Client-side persistence           |

## Project Structure

```text
src/
├── components/
│   ├── Calendar.jsx
│   ├── EventDetails.jsx
│   └── EventForm.jsx
│
├── context/
│   └── CalendarContext.jsx
│
├── hooks/
│   ├── useDragInteraction.js
│   └── useHistory.js
│
├── services/
│   ├── authService.js
│   ├── axiosInstance.js
│   ├── calendarService.js
│   ├── storageService.js
│   ├── syncService.js
│   └── userService.js
│
├── utils/
│   ├── recurrenceUtils.js
│   ├── timezoneUtils.js
│   └── urlState.js
│
├── App.jsx
├── Login.jsx
├── App.css
├── index.css
└── main.jsx
```

## Getting Started

### Prerequisites

* Node.js
* npm

### Installation

Clone the repository:

```bash
git clone https://github.com/Shripad-J/calendar-scheduler.git
```

Navigate to the project:

```bash
cd calendar-scheduler
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal.

## Production Build

Create a production build with:

```bash
npm run build
```

The production files are generated in the `dist` directory.

## Authentication

The application uses the DummyJSON authentication API.

Use valid DummyJSON test credentials on the login page.

## API

The application uses the following DummyJSON resources:

* Authentication
* Users
* Todos

API base URL:

```text
https://dummyjson.com
```

## Notes

* Calendar events are managed on the client side and persisted locally.
* API interactions are organized into dedicated service files.
* Calendar dates and times are handled using native JavaScript `Date` and `Intl` APIs.

## Author

**Shripad Joshi**

GitHub: https://github.com/Shripad-J

Repository: https://github.com/Shripad-J/calendar-scheduler
