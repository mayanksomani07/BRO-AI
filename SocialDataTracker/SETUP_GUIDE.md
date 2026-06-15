# Beginner Setup Guide — Social Data Tracker

Hey bro 👋 — this is the **complete step-by-step** for everything **you** must do
in Xcode and on your iPhone to make the app actually work. The code is done; the
remaining steps are configuration that only you can do because they involve your
Apple Developer account and your physical iPhone.

> **Time required:** ~30 minutes for the Xcode parts. Apple's entitlement approval (Step 5) takes days/weeks.

---

## ⚠️ Before you start — what won't work

- ❌ **iOS Simulator:** App detection (`canOpenURL`) and Screen Time API both silently fail in the simulator. You **must** use a real iPhone.
- ❌ **Free Apple ID:** You need a paid **Apple Developer Program** membership ($99/year) to ship this app or to use Family Controls in production. For local testing on your own iPhone, a free account works for ~7-day provisioning, but Family Controls entitlement still needs the paid program.

---

## Step 1 — Open the project in Xcode

1. Open `Xcode`.
2. `File → Open…` → select `/Users/msomani/Desktop/BRO-AI/SocialDataTracker/SocialDataTracker.xcodeproj`.
3. In the left sidebar (Project Navigator), click the **blue project icon** at the top (`SocialDataTracker`).
4. In the editor, select the **SocialDataTracker target** under "TARGETS".

You'll spend most of the next steps in this target screen.

---

## Step 2 — Fix the Info.plist build setting (so installed apps are detected)

This is why WhatsApp / X / LinkedIn / YouTube currently show "Not found".

### 2A. Check which Info.plist Xcode is using

1. With the **SocialDataTracker target** selected, click the **Build Settings** tab.
2. In the search box at the top of Build Settings, type: `info.plist`.
3. Look at two settings:
   - `Generate Info.plist File` → if this says **Yes**, Xcode is **ignoring** the file on disk and creating its own at build time. This is the bug.
   - `Info.plist File` → should be `SocialDataTracker/Info.plist`.

### 2B. Fix it (Option A — recommended)

1. Set `Generate Info.plist File` → **No**.
2. Set `Info.plist File` → `SocialDataTracker/Info.plist` (already correct in this repo).
3. **Clean build folder:** `Product → Clean Build Folder` (⇧⌘K).
4. Build & Run.

### 2B-alt (Option B — if Option A breaks the build)

If you'd rather keep `Generate Info.plist File = Yes`, you must add the URL schemes via the UI instead:

1. Click the **Info** tab on the target.
2. Hover over any row → click the `+` button.
3. Add a new key: `LSApplicationQueriesSchemes` (type: Array).
4. Expand it and add each scheme as a String item: `whatsapp`, `instagram`, `tg`, `fb`, `fbauth2`, `twitter`, `x-twitter`, `snapchat`, `snssdk1233`, `snssdk1180`, `youtube`, `vnd.youtube`, `linkedin`, `reddit`, `pinterest`, `discord`, `barcelona`, `bereal`, `sgnl`, `viber`, `weixin`, `wechat`, `tumblr`, `clubhouse`, `mastodon`.

> Do **either** A or B, not both.

---

## Step 3 — Enable the Family Controls capability (for Screen Time)

This unlocks the real per-app time data.

1. With the **SocialDataTracker target** selected, click the **Signing & Capabilities** tab.
2. Click the **+ Capability** button at the top-left of that tab.
3. In the search box, type **Family Controls** → double-click it.
4. You should now see a "Family Controls" section in the capabilities list.
5. Make sure **Automatically manage signing** is checked, and your **Team** is selected (your Apple ID).

> If you don't see Family Controls in the picker: your Apple Developer membership status doesn't allow it yet. Continue to Step 5 to request the entitlement.

---

## Step 4 — (Optional but recommended) Set up an App Group

This is what lets the Screen Time monitor extension share data back to the main app. Without it, the code falls back to standard `UserDefaults` and per-app minutes won't be visible from the extension. **Skip this step on your first run if you want; come back when you actually add the DeviceActivityMonitor extension.**

1. **Signing & Capabilities** tab → **+ Capability** → **App Groups**.
2. Click the `+` under the App Groups list.
3. Enter ID: `group.com.broai.socialdatatracker` (must match the `appGroupID` in [ScreenTimeManager.swift](SocialDataTracker/AppDetection/ScreenTimeManager.swift)).
4. Make sure the new group's checkbox is ticked.

---

## Step 5 — Request the Family Controls Distribution entitlement (REQUIRED for App Store)

Without this, the app builds for your own device but **cannot ship** to the App Store.

1. Go to: https://developer.apple.com/contact/request/family-controls-distribution
2. Sign in with your Apple Developer account.
3. Fill out the form. They will ask:
   - What your app does
   - Why you need Family Controls
   - Who your users are
4. Submit. Apple reviews this **manually** — expect days to a few weeks.
5. While you wait, you can still build & run on **your own iPhone** for development (Xcode handles dev entitlements automatically).

---

## Step 6 — Run on your real iPhone

1. Plug your iPhone into your Mac with a USB cable.
2. **Trust** the Mac on your iPhone if prompted.
3. In Xcode, at the top, click the destination dropdown (next to the play button) → select your iPhone.
4. First-time only on your iPhone:
   - `Settings → General → VPN & Device Management → [Your Apple ID] → Trust`.
5. Hit **▶ Run** in Xcode (⌘R).

The app will install and launch.

---

## Step 7 — Inside the app, grant Screen Time access

1. Open the **Apps** tab.
2. You'll see an orange/pink banner: **"Get REAL per-app usage data"**. Tap it.
3. Tap **Grant Screen Time Access**.
4. iOS will show a system prompt — tap **Continue**, then **Allow**.
5. Tap **Choose Apps to Track** → Apple's picker opens.
6. Select WhatsApp, Instagram, X, YouTube, LinkedIn — whatever you want.
7. Tap **Done**.

Real per-app minutes will start populating within a few minutes of you using those apps.

---

## Step 8 — Verify it's working

- Go to the **Apps** tab. The numbers next to each app should now reflect your actual time spent (after you've used the app while monitoring is active).
- Go to **Settings tab → Debug App Detection**. Each scheme should show ✓ for installed apps.
- If WhatsApp etc. still show "Not found" → re-check **Step 2** (Info.plist).
- If Screen Time banner still shows → re-check **Step 3** (Family Controls capability).

---

## Common errors & fixes

| Error in Xcode | What it means | Fix |
|---|---|---|
| `No such module 'FamilyControls'` | iOS deployment target too low | Set target to iOS 16.0+ in Build Settings |
| `Cannot find 'AuthorizationCenter' in scope` | Family Controls capability missing | Repeat Step 3 |
| `Authorization failed` at runtime | Capability + entitlement mismatch | Repeat Step 3, ensure Team is set |
| Apps still show "Not found" | Info.plist not applied | Repeat Step 2 |
| Black screen / crash on launch | Old build cached | `Product → Clean Build Folder` (⇧⌘K), rebuild |

---

## What's still NOT possible (be aware)

- **Real-time per-app *data* (MB) usage:** Apple does not expose this to any third-party app. The MB numbers are estimates derived from minutes × average bitrate. Only **time** is real.
- **Background continuous tracking:** The DeviceActivityMonitor extension (not yet added in this repo) is what powers true real-time tracking. Right now the app reads minutes when you open it. To get true real-time, you'll need to add a `DeviceActivityMonitor` target — let me know when you want to do that and I'll guide you.

---

## Quick summary checklist

- [ ] Step 2: Info.plist build setting fixed
- [ ] Step 3: Family Controls capability added
- [ ] Step 4: App Group added (optional for now)
- [ ] Step 5: Apple distribution entitlement requested (only needed before App Store submission)
- [ ] Step 6: App running on a real iPhone
- [ ] Step 7: Screen Time access granted in-app
- [ ] Step 8: Verified detection + minutes are real

Once Steps 2 + 3 + 6 + 7 are done, you'll see your installed apps **and** real Screen Time minutes in the Apps tab. 🎉
