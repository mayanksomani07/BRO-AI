# CRITICAL: Why Apps Show "Not Installed" — Fix This First

## The #1 reason canOpenURL() always returns false

`UIApplication.canOpenURL()` **silently returns false** for ANY scheme not listed in
`LSApplicationQueriesSchemes` in your **Xcode target's Info.plist**.

The file at `SocialDataTracker/Info.plist` in this repo is the source of truth,
but you must verify Xcode is actually using it.

---

## Step-by-step fix in Xcode

### 1. Open the Target Info.plist in Xcode

In Xcode, click your **project** (blue icon) → select **SocialDataTracker target** →
click the **Info** tab at the top.

OR: In the Project Navigator, find `Info.plist` under the SocialDataTracker folder,
right-click → **Open As → Source Code**.

### 2. Verify / paste these entries

The following keys MUST be present. If they're not there, add them:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>whatsapp</string>
    <string>instagram</string>
    <string>tg</string>
    <string>fb</string>
    <string>fbauth2</string>
    <string>twitter</string>
    <string>x-twitter</string>
    <string>snapchat</string>
    <string>snssdk1233</string>
    <string>snssdk1180</string>
    <string>youtube</string>
    <string>vnd.youtube</string>
    <string>linkedin</string>
    <string>reddit</string>
    <string>pinterest</string>
    <string>discord</string>
    <string>barcelona</string>
    <string>bereal</string>
    <string>sgnl</string>
    <string>viber</string>
    <string>weixin</string>
    <string>wechat</string>
    <string>tumblr</string>
    <string>clubhouse</string>
    <string>mastodon</string>
</array>
```

### 3. MUST RUN ON REAL DEVICE

`canOpenURL` **always returns false on the iOS Simulator** for third-party apps.
You MUST run on a physical iPhone to detect installed apps.

Connect your iPhone → select it as the run target → Build & Run.

### 4. Use Debug Detection screen to verify

After running on device:
- Go to **Settings tab** → **Debug App Detection**
- It shows every scheme result with ✓ / ✗
- If WhatsApp shows ✗ even though it's installed → LSApplicationQueriesSchemes is wrong
- If WhatsApp shows ✓ → detection is working

---

## Summary checklist

- [ ] Running on a REAL iPhone (not simulator)
- [ ] `LSApplicationQueriesSchemes` has all schemes listed above
- [ ] App has been fully rebuilt and reinstalled after adding schemes (Clean Build → Cmd+Shift+K)
- [ ] Tapped the ↻ refresh button on the Apps tab after first launch
