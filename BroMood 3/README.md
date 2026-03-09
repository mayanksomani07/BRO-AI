# 🧠 BroMood — Production iOS App

> A real-time, production-ready emotional support app for Indian youth. Feels like a trusted best friend — passively detects your emotional state and nudges you at the right moment.

---

## 📱 What It Does

BroMood passively tracks your emotional state using **5 digital biomarkers** collected legally on iOS, then reaches out with the right message at the right time.

| Signal | How | Privacy |
|---|---|---|
| Typing speed & patterns | Custom keyboard extension | Metadata only — never text |
| Social media usage | Self-report + session tracking | On-device |
| Sleep & circadian rhythm | Apple HealthKit | Optional, on-device |
| Social withdrawal | Keyboard session counts | Aggregated only |
| Journal sentiment | Gemini NLP | Text sent to API, stateless |

---

## 🏗️ Architecture

```
BroMood/
├── app/                    # React Native (Expo) iOS app
│   ├── src/
│   │   ├── screens/        # 9 screens (Home, Chat, Journal, Tasks, Settings, ...)
│   │   ├── engine/         # MoodEngine, KeystrokeAnalyzer, TriggerEngine, ...
│   │   ├── store/          # Zustand stores (mood, user, chat)
│   │   ├── components/     # MoodRing, MoodChart, EmergencyButton, ...
│   │   ├── api/            # Gemini API client
│   │   ├── db/             # SQLite schema + queries
│   │   └── i18n/           # 8 language translations
│   ├── App.tsx
│   ├── app.json            # Expo config with iOS entitlements
│   └── eas.json            # EAS Build config
│
├── keyboard-extension/     # Native Swift keyboard extension
│   ├── KeyboardViewController.swift
│   ├── KeystrokeLogger.swift
│   └── SharedDataManager.swift
│
└── backend/                # Node.js + Express API
    ├── src/
    │   ├── routes/         # /chat, /sentiment, /sync
    │   └── middleware/     # auth
    └── .env.example
```

---

## ⚙️ Tech Stack

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo SDK 51 |
| Language | TypeScript |
| Navigation | React Navigation v6 |
| State | Zustand |
| Local DB | expo-sqlite (encrypted) |
| Cloud DB | Supabase PostgreSQL (optional) |
| AI | Google Gemini 2.0 Flash |
| Notifications | Expo Notifications + FCM |
| Keyboard | Native Swift (UIInputViewController) |
| Charts | Victory Native |
| Animations | React Native Reanimated 3 |
| i18n | i18next (8 languages) |

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Xcode 15+ (for iOS builds)
- A physical iPhone or iOS Simulator

### 1. Clone and install

```bash
git clone <repo-url>
cd BroMood/app
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
# Fill in EXPO_PUBLIC_BACKEND_URL and EXPO_PUBLIC_APP_SECRET
```

### 3. Start the development server

```bash
npx expo start --ios
```

---

## 🏃 Backend Setup

```bash
cd BroMood/backend
npm install
cp .env.example .env
# Fill in: GEMINI_API_KEY, APP_SECRET, SUPABASE_URL (optional), SUPABASE_KEY (optional)

# Development
npm run dev

# Production (Replit / Railway / Render)
npm run build
npm start
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/chat` | Bro_AI chat (Gemini proxy) |
| `POST` | `/api/sentiment` | Journal/text sentiment analysis |
| `POST` | `/api/sync/mood` | Cloud backup mood trends |
| `DELETE` | `/api/sync/user/:id` | Delete all user cloud data |

All `/api/*` routes require `X-App-Secret` header.

---

## 📲 iOS Keyboard Extension Setup

The custom keyboard is the most critical feature. Here's how to set it up in Xcode:

### Step 1 — Add the extension target
1. Open project in Xcode
2. File → New → Target → Custom Keyboard Extension
3. Name it `BroMoodKeyboard`
4. Set bundle ID: `com.bromood.app.keyboard`

### Step 2 — Configure App Group
1. In main app target → Signing & Capabilities → `+` → App Groups
2. Add: `group.com.bromood.shared`
3. Do the same for `BroMoodKeyboard` target
4. This allows data sharing between keyboard and main app

### Step 3 — Configure keyboard Info.plist
Ensure `RequestsOpenAccess = YES` (already set in the included Info.plist)
This is required for writing to shared App Group storage.

### Step 4 — Copy Swift files
Copy all files from `keyboard-extension/` into the `BroMoodKeyboard` Xcode target.

### Step 5 — User enables keyboard
Guide users to: **Settings → General → Keyboard → Keyboards → Add New Keyboard → BroMood**
Then: **Allow Full Access → Enable** (required for App Group data sharing)

> ⚠️ **Privacy**: The keyboard only captures typing *speed*, *pause counts*, and *backspace rates* — **never the actual characters typed**. This is clearly disclosed during onboarding.

---

## 🏗️ EAS Build (App Store)

```bash
# Development build (runs on device)
eas build --platform ios --profile development

# TestFlight (beta)
eas build --platform ios --profile preview

# App Store
eas build --platform ios --profile production
eas submit --platform ios
```

### Required Apple entitlements
These are already configured in `app.json`:
- `com.apple.security.application-groups` — keyboard data sharing
- `com.apple.developer.healthkit` — sleep data
- `com.apple.developer.family-controls` — screen time API (requires Apple approval)

---

## 🌐 Supported Languages

| Code | Language |
|---|---|
| `hinglish` | Hinglish (Hindi + English) |
| `hindi` | हिंदी |
| `english` | English |
| `bengali` | বাংলা |
| `kannada` | ಕನ್ನಡ |
| `tamil` | தமிழ் |
| `marathi` | मराठी |
| `telugu` | తెలుగు |

---

## 🤖 Bro_AI Chat Modes

| Mode | Behaviour |
|---|---|
| 😤 Vent | Only listens and validates. Zero advice. |
| 💡 Advice | Gives exactly 1 concrete suggestion. |
| 👂 Listen | Asks 1 open-ended follow-up question. |

**Safety escalation**: If crisis language is detected (self-harm, suicide), Bro_AI immediately provides iCall helpline (9152987821) and sets an urgency flag that shows the emergency screen.

---

## 🚨 Emergency System

Three escalation levels:

1. **Floating FAB** — Red call button always visible on every screen
2. **In-app banner** — Appears when `mood_score < 2` or urgency detected
3. **Full-screen modal** — One-tap calling to 5 Indian helplines (iCall, Vandrevala, NIMHANS, Tele MANAS, Snehi)

---

## 🔒 Privacy Architecture

```
On-device only:
  ✅ All mood calculations
  ✅ Keystroke metadata (App Group, never leaves device)
  ✅ Journal entries (SQLite, AES-256 encrypted)
  ✅ Chat history (SQLite)

Sent to API (stateless, no logging):
  ⚡ Journal/chat text → Gemini (for sentiment analysis only)

Cloud (opt-in only):
  ☁️  Anonymised mood_score trends → Supabase
```

---

## 🎮 Gamification

| XP Range | Level |
|---|---|
| 0–100 | Naya Bro 🌱 |
| 101–300 | Seekhta Bro 📚 |
| 301–600 | Resilient Bro 💪 |
| 601–1000 | Bro of Steel 🦾 |
| 1000+ | Legend 🏆 |

Tasks are **mood-adaptive** — if your score is below 3, only ultra-easy 2-minute tasks are shown. Above 7, stretch challenges unlock.

---

## ⚠️ Disclaimer

> BroMood is not a medical device. It is a peer-support companion, not a clinical tool. For mental health emergencies, call **iCall: 9152987821** (free, Mon–Sat 8am–10pm) or **Vandrevala Foundation: 18602662345** (24/7).

---

## 📋 Complete Deliverable Checklist

- [x] React Native (Expo) iOS app
- [x] Custom iOS Keyboard Extension (Swift) with App Group bridge
- [x] MoodEngine.ts with all 5 signals
- [x] TriggerEngine with 1/day spam prevention
- [x] Context-aware notifications in 8 languages
- [x] Bro_AI chatbot (Vent / Advice / Listen modes) + safety escalation
- [x] Journal with Gemini NLP sentiment analysis
- [x] Gamified task system (XP + levels + mood-adaptive)
- [x] Emergency screen with 5 Indian helplines (one-tap calling)
- [x] Therapist directory with specialty + mode filters
- [x] Music & breathing exercises section
- [x] Daily motivation cards (swipeable)
- [x] i18next with 8 languages
- [x] On-device SQLite storage
- [x] Privacy controls (view / export / delete all data)
- [x] Node.js backend with Gemini API proxy
- [x] EAS build configuration
- [x] Supabase schema for optional cloud sync
