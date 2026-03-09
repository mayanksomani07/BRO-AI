# 📱 BroMood — Complete Free Testing Guide (Baby Steps)

> Run BroMood on your real iPhone **for free** in about 30 minutes.  
> No Apple Developer account. No paid tools. Just your iPhone + your laptop.

---

## 🧠 How This Works (Simple Version)

```
Your iPhone                Your Laptop/Mac
     |                           |
 Expo Go App   ←── WiFi ──→  BroMood Code (running)
     |                           |
     |                    Backend Server
     |                    (also on your laptop)
     |                           |
     └──────── Internet ─────────┘
                                 |
                          Gemini AI (FREE)
```

- **Expo Go** = a free app on your iPhone that runs React Native apps without any setup
- **Your laptop** = runs the code and the backend server
- **Same WiFi** = the phone and laptop must be on the same internet network

---

## ✅ What You Need Before Starting

| Thing | Free? | Notes |
|---|---|---|
| A Mac or Windows PC | ✅ | You already have one |
| An iPhone | ✅ | Any iPhone running iOS 16+ |
| Node.js installed | ✅ | We'll install it |
| Expo Go app | ✅ | Free from App Store |
| Google account | ✅ | For free Gemini API key |
| WiFi | ✅ | Phone + laptop on same network |

---

## 🛑 What WON'T Work in Free Testing (and That's OK)

| Feature | Status | Why |
|---|---|---|
| Custom Keyboard Extension | ❌ Skipped | Needs paid Apple account |
| Apple HealthKit sleep data | ❌ Skipped | Needs full native build |
| Push notifications | ⚠️ Limited | Works but delivery varies |
| Everything else | ✅ Works | All screens, AI chat, journal, tasks... |

The core app — Home, Bro_AI Chat, Journal, Tasks, Emergency, Music, Therapist — **all work perfectly**.

---

# 🚀 STEP-BY-STEP GUIDE

---

## PART 1 — Install Tools on Your Computer

### Step 1 — Install Node.js

Node.js is what runs JavaScript code on your computer.

**On Mac:**
1. Open your browser, go to: **https://nodejs.org**
2. Click the big green button that says **"LTS"** (Long Term Support)
3. Download the `.pkg` file and double-click it to install
4. Click "Continue" through all the steps, agree to the license

**On Windows:**
1. Go to: **https://nodejs.org**
2. Click **"LTS"** and download the `.msi` file
3. Double-click and install — click "Next" through everything

**Verify it worked:**
Open Terminal (Mac) or Command Prompt (Windows) and type:
```
node --version
```
You should see something like: `v20.11.0` ✅

---

### Step 2 — Install Expo CLI

In the same Terminal/Command Prompt, type this and press Enter:
```
npm install -g expo-cli
```
Wait for it to finish (1-2 minutes). You'll see text scrolling.

**Verify:**
```
expo --version
```
Should show a version number ✅

---

### Step 3 — Install the Expo Go App on Your iPhone

1. On your iPhone, open the **App Store**
2. Search for: **"Expo Go"**
3. It's made by **Expo** — the icon is a white circle with lines
4. Download it (it's free)
5. Create a free Expo account when it asks (or skip — you don't need to log in)

---

## PART 2 — Get Your Free AI Key

### Step 4 — Get a FREE Gemini API Key

The AI chat feature needs this. It's completely free.

1. Go to: **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API key"**
4. Click **"Create API key in new project"**
5. A key will appear — it looks like: `AIzaSyXXXXXXXXXXXXXXXXX`
6. **Copy this key** — you'll need it in a few minutes

> ✅ Google gives you **1 million free tokens per day**. For personal testing, you'll never hit this limit.

---

## PART 3 — Set Up the Code

### Step 5 — Find Your Computer's IP Address

Your phone needs to know where your laptop is on the WiFi.

**On Mac:**
1. Click the Apple menu (🍎) → System Settings
2. Click **"Network"** → Click **"Wi-Fi"** → Click **"Details"** on your connected network
3. Look for **"IP Address"** — it looks like `192.168.1.X`

**On Windows:**
1. Press `Windows key + R`, type `cmd`, press Enter
2. Type `ipconfig` and press Enter
3. Look for **"IPv4 Address"** — it looks like `192.168.1.X`

**Write down your IP address** — you'll need it in the next step.

---

### Step 6 — Open the Project Folder

1. Extract the `BroMood_iOS_App.zip` file you downloaded
2. You'll see a folder called `BroMood` with these inside:
   ```
   BroMood/
   ├── app/          ← The iPhone app code
   ├── backend/      ← The AI server code
   └── README.md
   ```

---

### Step 7 — Configure the App (1 file to edit)

1. Inside the `BroMood/app/` folder, find the file called **`.env`**  
   *(Note: files starting with `.` may be hidden — see tip below)*

   > **Tip — How to see hidden files:**  
   > Mac: Press `Cmd + Shift + .` in Finder  
   > Windows: In File Explorer → View → Show → Hidden items ✅

2. Open `.env` with any text editor (Notepad on Windows, TextEdit on Mac)

3. You'll see this:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3000
   EXPO_PUBLIC_APP_SECRET=bromood-local-test-2024
   ```

4. **Change `192.168.1.100`** to YOUR computer's IP address from Step 5  
   Example: If your IP is `192.168.0.55`, change it to:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.0.55:3000
   ```

5. Save the file.

---

### Step 8 — Configure the Backend (1 file to edit)

1. Inside `BroMood/backend/`, find the file called **`.env`**

2. Open it with a text editor. You'll see:
   ```
   GEMINI_API_KEY=paste_your_free_gemini_key_here
   APP_SECRET=bromood-local-test-2024
   ```

3. **Replace `paste_your_free_gemini_key_here`** with the key you copied in Step 4  
   Example:
   ```
   GEMINI_API_KEY=AIzaSyABCDEFGHIJKLMNOP12345
   ```

4. Save the file.

---

## PART 4 — Start Everything

Now we'll start two things: the backend server AND the app.

### Step 9 — Start the Backend Server

**Open a new Terminal window** and run these commands one by one:

```bash
# 1. Go into the backend folder
cd BroMood/backend

# 2. Install the backend's packages (only needed once)
npm install

# 3. Start the server
npm run dev
```

**You should see:**
```
🚀 BroMood backend running on port 3000
   Gemini key: ✅ set
   Supabase:   ⚠️  not set (sync disabled)
```

If you see this — **the backend is running!** ✅  
**Leave this Terminal window open.** Don't close it.

> ❌ **If you see an error about `ts-node-dev` not found:**
> Run: `npm install -g ts-node-dev` then try `npm run dev` again

---

### Step 10 — Start the App

**Open a SECOND Terminal window** (keep the first one open!) and run:

```bash
# 1. Go into the app folder
cd BroMood/app

# 2. Install the app's packages (only needed once — takes 2-5 minutes)
npm install

# 3. Clear cache and start
npx expo start --clear
```

**You should see something like this:**
```
Starting Metro Bundler

› Metro waiting on exp://192.168.1.X:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

QR Code: (a QR code appears here)

› Press i │ open iOS simulator
› Press a │ open Android
› Press w │ open web
```

**Leave this Terminal window open too.** You'll see a big QR code on screen. ✅

---

## PART 5 — Open on Your iPhone

### Step 11 — Scan the QR Code

1. Make sure your iPhone is on the **same WiFi** as your laptop
2. Open your iPhone's **Camera app** (the normal camera)
3. Point it at the QR code in the Terminal
4. A notification/banner will appear at the top — **tap it**
5. It will open in **Expo Go** automatically

**Wait 30-60 seconds** while it loads for the first time. You'll see:
- "Bundling..." progress bar
- Then the BroMood app opens! 🎉

---

### Step 12 — Test the App

Once the app opens, you'll see the **Language Select** onboarding screen.

Here's what to test:

**Onboarding:**
- Select a language
- Read and agree to privacy consent
- Set your baseline (social media usage, sleep time)

**Home Screen:**
- You'll see a Mood Ring showing your score
- Tap "Bro_AI se baat kar" to open the chat

**Bro_AI Chat:**
- Select a mode (Vent / Advice / Listen)
- Type any message in Hindi, Hinglish, or English
- The AI will respond in your language ✨

**Journal:**
- Tap the + button, write anything
- After saving, AI will analyze the mood of your entry

**Emergency Screen:**
- Tap the red floating button
- All helplines are listed

**Tasks:**
- See mood-adaptive daily tasks
- Mark one as done to earn XP

---

## 🔧 Troubleshooting

### Problem: "Network Error" when chatting with AI

**Cause:** App can't reach your backend server.

**Fix:**
1. Check the backend Terminal — is it still showing "running"?
2. Double-check your IP address in `app/.env`
3. Make sure phone and laptop are on the same WiFi
4. Try typing: `http://YOUR_IP:3000/health` in your iPhone's Safari browser — you should see `{"status":"ok"}`

---

### Problem: "QR code not working" or app won't open

**Fix:**
1. Make sure you're on the same WiFi as your laptop
2. In Terminal, press `c` to clear, then `r` to restart
3. Try pressing `e` in Terminal to send the link to your email instead

---

### Problem: `npm install` fails with errors

**Fix:**
```bash
# Delete the existing modules and reinstall fresh
rm -rf node_modules
npm cache clean --force
npm install
```

---

### Problem: App crashes immediately on open

**Fix — clear Expo cache:**
```bash
npx expo start --clear
```

---

### Problem: "Metro bundler not found" or similar

**Fix:**
```bash
npm install -g @expo/metro-runtime
npx expo start --clear
```

---

## 🔄 Daily Testing Workflow

After the first setup, every time you want to test:

**Terminal 1 (backend):**
```bash
cd BroMood/backend
npm run dev
```

**Terminal 2 (app):**
```bash
cd BroMood/app
npx expo start
```

Scan QR code → done. Takes 30 seconds.

---

## 💰 Cost Summary

| Service | Cost | Notes |
|---|---|---|
| Expo Go app | FREE | Personal testing only |
| Gemini API | FREE | 1M tokens/day free tier |
| Backend (local) | FREE | Runs on your laptop |
| Supabase | FREE | Not needed for testing |
| Apple Developer account | FREE | Not needed for Expo Go |
| **TOTAL** | **₹0** | 🎉 |

---

## 📝 What's Different in Testing vs Production

| Feature | Testing (Expo Go) | Production (App Store) |
|---|---|---|
| Core app UI | ✅ Works | ✅ Works |
| Bro_AI Chat | ✅ Works | ✅ Works |
| Journal + AI sentiment | ✅ Works | ✅ Works |
| Tasks + XP | ✅ Works | ✅ Works |
| Emergency screen | ✅ Works | ✅ Works |
| Music + Therapist | ✅ Works | ✅ Works |
| Custom keyboard | ❌ Not available | ✅ Works |
| HealthKit sleep data | ❌ Not available | ✅ Works |
| Push notifications | ⚠️ Partial | ✅ Full |
| App icon + name | Shows "Expo Go" | Shows "BroMood" |

---

## 🎯 Summary — 12 Steps Total

```
Install Node.js          → Step 1
Install Expo CLI         → Step 2
Install Expo Go (iPhone) → Step 3
Get free Gemini key      → Step 4
Find your IP address     → Step 5
Extract project folder   → Step 6
Edit app/.env            → Step 7
Edit backend/.env        → Step 8
Start backend server     → Step 9
Start the app            → Step 10
Scan QR on iPhone        → Step 11
Test everything          → Step 12
```

**Time needed:** ~30 minutes first time, ~30 seconds after that.
