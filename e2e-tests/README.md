# OrthoCare AI - E2E Testing Suites

This directory contains the end-to-end automated testing suites for the **OrthoCare AI** application. 

It is divided into two separate directories:
1. **Web Testing Suite (Selenium):** Automates browser testing on the local Vite dev server.
2. **Mobile Testing Suite (Appium):** Automates device/emulator testing on the Capacitor Android hybrid app.

Both suites automatically record and log each step's execution time, result status (`PASS`/`FAIL`), and errors, and output a styled Excel report analyzing the results.

---

## 📁 Directory Structure
```text
e2e-tests/
├── web/
│   └── test_web.py          # Selenium Web E2E Test Suite
├── mobile/
│   └── test_mobile.py       # Appium Mobile E2E Test Suite
├── reports/
│   ├── web_test_report.xlsx  # Generated Excel Report (Web)
│   └── mobile_test_report.xlsx # Generated Excel Report (Mobile)
├── requirements.txt         # Python library dependencies
└── README.md                # Setup & execution guide
```

---

## ⚙️ Prerequisites & Installation

### 1. Python Libraries Setup
Install the required testing libraries:
```bash
pip install -r e2e-tests/requirements.txt
```

### 2. Web Testing Setup (Selenium)
* Ensure you have the **Google Chrome** browser installed.
* Make sure your local Vite dev server is running before executing:
  ```bash
  npm run dev
  ```
  *(Default base URL configured in tests: `http://localhost:5173`)*

### 3. Mobile Testing Setup (Appium & Android)
* Ensure you have **Android Studio** installed with an active **Android Virtual Device (AVD)** emulator running.
* Install Node.js Appium globally:
  ```bash
  npm install -g appium
  ```
* Install the **UiAutomator2** driver for Android automation:
  ```bash
  appium driver install uiautomator2
  ```
* Run the Appium server in a separate terminal:
  ```bash
  appium
  ```
  *(By default, this hosts the server at `http://localhost:4723`)*

---

## 🚀 Running the Tests

### 1. Web Selenium E2E Tests
To test the web application end-to-end and generate the Excel analysis report, run:
```bash
python e2e-tests/web/test_web.py
```

### 2. Mobile Appium E2E Tests
To test the mobile app running on your Android emulator and generate the Excel analysis report, run:
```bash
python e2e-tests/mobile/test_mobile.py
```

---

## 📊 Reports Format

The reports are saved in the `e2e-tests/reports/` folder as `.xlsx` worksheets. They are formatted with a clinical blue aesthetic and auto-scaled columns:

| Column Header | Description |
| :--- | :--- |
| **Test ID** | Unique step ID (e.g. `WEB-001`, `MOB-003`) |
| **Test Name** | The overall module/user flow being tested (e.g., Login, Scan Match) |
| **Test Step** | The specific action being performed |
| **Status** | Colored status marker: **PASS** (green) or **FAIL** (red) |
| **Response Time (s)** | How long that specific operation took (in seconds) |
| **Details / Errors** | Text description of the result or traceback details if failed |
| **Timestamp** | Local execution timestamp |
