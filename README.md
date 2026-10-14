# CK-VATCalc

An offline-capable Philippine VAT-inclusive amount calculator, built as an installable static PWA (plain HTML, CSS, and JavaScript; no build step, no backend, no tracking).

**CALCULATION PREVIEW — NOT AN OFFICIAL BIR INVOICE.** CK-VATCalc is a calculation aid only. It does not produce a valid invoice or receipt, is not affiliated with or approved by the BIR, and does not decide whether a sale is VATable, exempt, or zero-rated.

## Look and feel

The header shows the Crispy King logo and the app name. Colors come from the logo (red, yellow, white). The app icon is the same logo; `icons/icon-512-maskable.png` has extra red padding so Android can crop it into circles or squares without cutting the lettering. A collapsible **How it works** section explains VAT in plain, kid-friendly words with a worked ₱350 example (net = total ÷ 1.12, VAT = net × 12%) and your own numbers. Animations are short and are switched off automatically when the phone's "reduce motion" setting is on.

## What it does

Enter one amount that already includes standard 12% VAT. The preview shows:

| Field | Value |
|---|---|
| TOTAL SALES (VAT INCLUSIVE) | the amount you entered |
| LESS: 12% VAT | gross × 12 / 112 |
| NET OF VAT/TOTAL | gross − VAT |
| TOTAL AMOUNT DUE | the amount you entered |

All other invoice-style fields stay as a dash (—) because they are not calculated.

Example: ₱1,120.00 → VAT ₱120.00, net ₱1,000.00.

### Input rules
- Use the English/Philippine format `1,234.56`. Commas must separate thousands. Formats like `1.234,56` are rejected, not guessed.
- Up to 2 decimal places. Negative values, letters, and malformed text are rejected with a message.
- Maximum: ₱999,999,999.99.
- A pasted leading ₱ sign is accepted.

### Rounding
Amounts are handled as whole centavos (integers). VAT is rounded half-up to the centavo, and net is gross minus VAT, so VAT + net always equals the entered amount exactly.

## Files

```
index.html            app page
styles.css            styles
vat.js                money parsing/calculation (pure functions)
app.js                UI + service worker registration + update prompt
service-worker.js     offline cache + update lifecycle (holds the version number)
manifest.webmanifest  install metadata
icons/                icon-192.png, icon-512.png, icon-512-maskable.png
tests/vat.test.js     optional developer test (node tests/vat.test.js); not needed to deploy
```

All paths are relative, so the app works at `https://USERNAME.github.io/REPOSITORY/` and not only at a domain root.

## Deploy to GitHub Pages

1. Create a GitHub repository (for example `CK-VATCalc`).
2. Upload all files, keeping the folder structure (`icons/` must stay a folder).
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select your branch (usually `main`) and the `/ (root)` folder, then Save.
5. Wait a minute or two for publishing.
6. Open `https://USERNAME.github.io/REPOSITORY/` (replace with your own username and repository name).
7. Try the calculator while online.
8. On Android, open the address in Chrome and use the menu (⋮) → **Install app** / **Add to Home screen**.
9. Offline test: open the app once online, then switch on airplane mode and reopen it.

Service workers and installation require HTTPS (GitHub Pages provides it). `localhost` is the only development exception.

## Publish an update

1. Edit your files.
2. In `service-worker.js`, change `VERSION` (for example `'1.0.8'` to `'1.0.9'`). **This is required**: it is what makes browsers notice a new release.
3. Commit and push to GitHub. Pages republishes after a short delay.

### How installed apps pick it up
- Chrome checks for a new service worker when the app is opened or revisited while online. It may not happen instantly, and a GitHub commit does not update every device immediately.
- The new files download in the background while the current version keeps working.
- When ready, a banner appears: **"A new version is available."** with an **Update now** button.
- Tapping it activates the new version and reloads the app once. If you had typed an amount, it is restored after the reload (kept only for that reload, then discarded).
- Without internet the app cannot discover or download an update; it keeps running the cached version. When you are online again, open or refresh it and the banner will appear.
- You never need to uninstall and reinstall for normal updates.

### Troubleshooting a stale version
1. Connect to the internet, fully close the app, and reopen it. Wait a few seconds for the banner.
2. Confirm you changed `VERSION` in `service-worker.js` and that GitHub Pages finished publishing.
3. In Chrome, open the site in a normal tab and reload. The footer shows the active version.
4. Last resort: Chrome → Settings → Site settings → this site → Clear data. CK-VATCalc stores no business data, so nothing is lost; then reopen online.

## Privacy
No accounts, analytics, ads, or network requests for calculating. Amounts never leave your device and no calculation history is stored.

## Not tested yet by the author
Real Android install through Chrome, a live GitHub Pages deployment, and real-device offline behavior need to be checked by you after deploying (steps above).
