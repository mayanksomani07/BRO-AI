# Social Data Tracker — Xcode Setup Guide

## Step 1: Create the Xcode Project

1. Open Xcode → **File > New > Project**
2. Choose **iOS > App**
3. Set:
   - **Product Name**: `SocialDataTracker`
   - **Bundle ID**: `com.broai.socialdatatracker`
   - **Interface**: SwiftUI
   - **Language**: Swift
   - **Minimum Deployment**: iOS 16.0

## Step 2: Add the Source Files

Delete the default `ContentView.swift`. Then drag all folders from this directory into your Xcode project:

```
SocialDataTracker/
├── SocialDataTrackerApp.swift
├── AppDetection/
│   ├── SocialApp.swift
│   └── AppDetector.swift
├── DataCollection/
│   ├── InterfaceSnapshot.swift
│   ├── NetworkSampler.swift
│   ├── DataUsageStore.swift
│   └── BackgroundRefreshScheduler.swift
├── SelfReport/
│   ├── SelfReportEntry.swift
│   └── SelfReportStore.swift
├── Charts/
│   ├── ChartCard.swift
│   ├── TodaySummaryCard.swift
│   ├── DataUsageView.swift
│   ├── AppsView.swift
│   ├── LogUsageSheet.swift
│   └── ReportsView.swift
└── Shared/
    ├── RootView.swift
    ├── MainTabView.swift
    ├── OnboardingView.swift
    ├── SettingsView.swift
    ├── SandboxDisclaimerSheet.swift (inside SettingsView.swift)
    └── CSVExporter.swift
```

## Step 3: Replace Info.plist content

Open `Info.plist` in Xcode (as Source Code) and paste the contents from `SocialDataTracker/Info.plist` in this repo. The key entries are:

- `LSApplicationQueriesSchemes` — 20 social app URL schemes
- `BGTaskSchedulerPermittedIdentifiers` — background refresh task ID
- `UIBackgroundModes` — fetch + processing

## Step 4: Add Swift Charts (already built-in)

Swift Charts is built into iOS 16+ — **no SPM packages needed**.

Just make sure your Deployment Target is **iOS 16.0 or higher**.

## Step 5: Build & Run

Select an **iPhone simulator** (iOS 16+) or real device. Hit ▶ Run.

## What the App Does

| Tab | Feature |
|-----|---------|
| **Usage** | Today's WiFi + Cellular summary card, 7/14/30-day bar chart, trend line, WiFi/Cell split donut |
| **Apps** | Detects 20 social apps installed on your device, category donut chart, per-app usage log |
| **Reports** | 7/30/90-day timeline with stacked WiFi+Cellular area chart, per-app bar chart, CSV export |
| **Settings** | Toggle background refresh, clear data, view privacy disclaimer |

## Important: iOS Sandbox Limitation

iOS does NOT expose per-app data usage to third-party apps via any public API. The per-app rows in **Settings > Cellular** are stored in a sandboxed system database.

This app works around it by:
1. **Detecting** installed apps via `UIApplication.canOpenURL`
2. **Tracking device-level** WiFi/Cellular counters via `getifaddrs` (same data source as iOS Settings > Wi-Fi usage)
3. **Self-report** layer: you manually log how long you used each app + data estimate

This is the maximum possible without a jailbreak, MDM profile, or Apple's restricted `FamilyControls` entitlement.

## Tested On
- Xcode 15+
- iOS 16.0 Simulator
- iOS 17.0 Simulator
