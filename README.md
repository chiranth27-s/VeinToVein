# VeinToVein — Frontend Student Project

A responsive blood donation network prototype built with HTML, CSS and vanilla JavaScript.

## Run the project
1. Extract `VeinToVein.zip`.
2. Open the `VeinToVein` folder in VS Code.
3. Open `index.html` in a browser (or use the Live Server extension).

## Files
- `index.html` — page structure and modal forms
- `style.css` — responsive dashboard styling
- `script.js` — sample data, navigation, filtering, forms, localStorage and browser notification permission

## Features
- Overview dashboard and community statistics
- Search/filter sample donors by blood group, area and availability
- Urgent blood request listing and create-request form
- Editable donor profile and demo donation history
- Browser notification permission request
- Responsive layout for desktop, tablet and mobile
- Data stored locally in the browser using localStorage

## Important limitations
This is a frontend-only educational prototype. It does not connect to hospitals, verify donor identity or medical eligibility, send real push notifications, or securely store health data. The donor directory and request data are fictional sample data. `localStorage` is not secure storage. Do not enter real patient or donor sensitive information.

For a real deployment, add a backend, authentication, role-based access for hospitals, encrypted data storage, consent-based contact sharing, audit logs, verified hospital onboarding, and a trusted push notification service. Eligibility must be determined by qualified blood-bank medical staff, not by this website.
