# Testing Guide for AI Impact Tracker

This guide walks you through testing the fixes for issues #13 and #14.

## Quick Start

```bash
# 1. Run automated tests first
node verify-fix.js
node test-refactoring.js

# 2. Then test in browser (see detailed steps below)
```

---

## Part 1: Automated Testing (5 minutes)

### Step 1.1: Test Issue #13 Fix

```bash
cd /Users/simonaszilinskas/ai-impact-tracker
node verify-fix.js
```

**Expected Output:**
```
======================================================================
VERIFICATION: Issue #13 - popup.js Energy Calculation Fix
======================================================================

Testing Community Estimates (EcoLogits methodology)
----------------------------------------------------------------------
Test 1: 10 tokens
  ❌ Old buggy:    0.0760 Wh
  ✅ Corrected:    0.4145 Wh
  📊 Error factor: 5.46x (446% underestimation in old version)
  🎯 Expected:     0.40 - 0.50 Wh
  ✅ PASS

[... more tests ...]

✅ ALL TESTS PASSED - Fix is correct!
```

✅ If you see "ALL TESTS PASSED", the calculation fix works!

### Step 1.2: Test Issue #14 Refactoring

```bash
node test-refactoring.js
```

**Expected Output:**
```
======================================================================
VERIFICATION: Issue #14 - Code Deduplication
======================================================================

✅ Successfully imported energy-calculator.js as ES6 module

[... tests run ...]

✅ ALL TESTS PASSED - Refactoring successful!
```

✅ If you see "ALL TESTS PASSED", the refactoring works!

---

## Part 2: Browser Testing (10-15 minutes)

### Step 2.1: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   ```
   Navigate to: chrome://extensions
   ```

2. **Enable Developer Mode**
   - Look for "Developer mode" toggle in top-right corner
   - Click to enable it

   ![Developer Mode Toggle](https://developer.chrome.com/static/docs/extensions/get-started/tutorial/hello-world/image/extensions-page-e0d64d89a6acf_1920.png)

3. **Load the Extension**
   - Click "Load unpacked" button (top-left)
   - Navigate to: `/Users/simonaszilinskas/ai-impact-tracker`
   - Click "Select" to load the extension

4. **Verify Loading**
   - ✅ Extension card appears with "AI Impact Tracker" title
   - ✅ Version shows "1.8"
   - ✅ No red error messages appear
   - ✅ Extension icon shows in Chrome toolbar

   **If you see errors:**
   - Click "Errors" button to see details
   - Take a screenshot
   - Check console for specific error messages

### Step 2.2: Test Content Script (content.js)

This tests that the shared module works in the content script context.

1. **Open ChatGPT**
   ```
   Navigate to: https://chatgpt.com
   ```

2. **Open DevTools**
   - Press `F12` (or `Cmd+Option+I` on Mac)
   - Click "Console" tab

3. **Check for Errors**
   - Look for red error messages
   - ✅ Should see: `"AI Impact notification added to page"`
   - ✅ Should see: `"Loaded X conversation logs"`
   - ❌ Should NOT see: `"Cannot find calculateEnergyAndEmissions"`
   - ❌ Should NOT see: `"import statement outside module"`

4. **Generate a ChatGPT Response**
   - Type any question: "Hello, how are you?"
   - Send message
   - Wait for ChatGPT to respond

5. **Verify Notification Appears**
   - ✅ Small notification widget appears at top of page
   - ✅ Shows "⚡️ X.XX Wh consumed today"
   - ✅ Can drag the notification to move it

   Example: "⚡️ 4.15 Wh consumed today"

6. **Check Console for Calculation Logs**
   - Should see: `"[Time] Updating energy notification: 4.15 Wh"`
   - Energy value should be reasonable:
     - Short response (~50 tokens): 2-3 Wh
     - Medium response (~100 tokens): 4-5 Wh
     - Long response (~500 tokens): 20-25 Wh

7. **Verify Calculation is Correct**
   - Generate another response
   - Note the energy value
   - It should be ~4 Wh per 100 tokens of response
   - Calculate: response_length_chars / 4 = tokens, tokens * 0.04 ≈ Wh

**✅ PASS Criteria for Content Script:**
- No errors in console
- Notification appears and shows energy
- Energy values are reasonable (not 0.76 Wh for 100 tokens)
- Notification is draggable

### Step 2.3: Test Popup (popup.js)

This tests that the shared module works as an ES6 module in the popup.

1. **Open Extension Popup**
   - Click the extension icon in Chrome toolbar
   - Popup window should open (400px wide)

2. **Check Initial View**
   - ✅ "Today" tab is active by default
   - ✅ Shows message count
   - ✅ Shows energy usage in Wh
   - ✅ Shows environmental equivalents:
     - 🎬 YouTube streaming time
     - 💧 Water consumption
     - 📱 Phone charges
     - 🛗 Elevator floors

3. **Check Browser Console**
   - Right-click inside popup
   - Click "Inspect"
   - New DevTools window opens
   - Click "Console" tab
   - ✅ Should see: `"Loaded X logs from storage"`
   - ✅ Should see: `"Calculating equivalents for X Wh"`
   - ❌ Should NOT see any red errors
   - ❌ Should NOT see: `"Failed to import module"`

4. **Test Lifetime Tab**
   - Click "Lifetime" tab
   - If email not entered: overlay appears asking for email
   - If email entered: shows lifetime statistics
   - ✅ Values should be larger than "Today" tab
   - ✅ No errors in console

5. **Verify Values Match Content Script**
   - Note the "Today" energy value in popup
   - Go back to ChatGPT tab
   - Look at notification widget value
   - ✅ Both should show same energy value (±0.01 Wh)

**✅ PASS Criteria for Popup:**
- Popup opens without errors
- Both tabs display correctly
- Console shows calculation logs (no errors)
- Energy values are reasonable
- Values match what content script shows

### Step 2.4: Test Estimation Method Switching

This is the critical test for issue #13 - verifying recalculation works correctly.

1. **Note Current Values**
   - Open extension popup
   - Note the "Today" energy value
   - Example: "42.50 Wh"

2. **Check Current Method**
   - Look at bottom of popup
   - Should see "Estimation method:" dropdown
   - Note current selection (probably "Community estimates")

3. **Switch to Altman Method**
   - Click dropdown
   - Select "Sam Altman's estimation"
   - Watch the values change

4. **Verify Recalculation**
   - Energy value should DROP by ~100x
   - Example: 42.50 Wh → ~0.40 Wh
   - All environmental equivalents should also drop
   - Check console for: `"Recalculated X logs with altman method"`
   - ✅ NO errors should appear

5. **Switch Back to Community Method**
   - Click dropdown again
   - Select "Community estimates (academic research)"
   - Watch values change back

6. **Verify Values Return**
   - Energy value should RETURN to original (±0.1 Wh)
   - Example: 0.40 Wh → 42.50 Wh
   - ✅ Should be approximately the same as step 1
   - Check console for: `"Recalculated X logs with community method"`

7. **Switch Multiple Times**
   - Switch back and forth 3-4 times
   - Each time:
     - ✅ Values should change smoothly
     - ✅ No errors in console
     - ✅ Values should be consistent
     - ❌ Should NOT freeze or crash

**✅ PASS Criteria for Method Switching:**
- Switching works without errors
- Community method: ~4 Wh per 100 tokens
- Altman method: ~0.04 Wh per 100 tokens (~100x lower)
- Values are consistent when switching back
- No console errors during recalculation

### Step 2.5: Test Module Loading (Advanced)

This verifies the shared module loaded correctly in both contexts.

1. **Check Content Script Module**
   - Go to ChatGPT tab
   - Open DevTools (F12)
   - Click "Sources" tab
   - Look for: `chatgpt.com` → `Content scripts` → `AI Impact Tracker`
   - ✅ Should see: `energy-calculator.js`
   - ✅ Should see: `content.js`

2. **Check Popup Module**
   - Open extension popup
   - Right-click → Inspect
   - Click "Sources" tab
   - Look for: `chrome-extension://...`
   - ✅ Should see: `energy-calculator.js`
   - ✅ Should see: `popup.js`
   - ✅ Should see: `popup.html`

3. **Set Breakpoint (Optional)**
   - In Sources tab, open `energy-calculator.js`
   - Find line: `function calculateEnergyAndEmissions(`
   - Click line number to set breakpoint (blue marker appears)
   - Generate a ChatGPT response
   - ✅ Debugger should pause at breakpoint
   - ✅ Can inspect variables in scope
   - Click "Resume" (▶️) to continue

**✅ PASS Criteria for Module Loading:**
- energy-calculator.js appears in Sources tab for both contexts
- No "module not found" errors
- Breakpoints work (optional test)

---

## Part 3: Regression Testing (5 minutes)

Make sure we didn't break anything existing.

### Test 3.1: Basic Features Still Work

1. **Storage Persistence**
   - Generate some ChatGPT responses
   - Close popup
   - Close ChatGPT tab
   - Reopen ChatGPT
   - Open popup
   - ✅ Energy values should be remembered

2. **Notification Position**
   - Drag notification to different position
   - Refresh ChatGPT page
   - ✅ Notification should appear at saved position

3. **Dark Mode (if ChatGPT is in dark mode)**
   - ✅ Notification should have dark background
   - ✅ Popup should adapt to dark theme

4. **Email Collection (Lifetime Tab)**
   - If not already entered, try entering email
   - ✅ Should save successfully
   - ✅ Lifetime tab should unlock

---

## Part 4: Performance Testing (Optional)

### Test 4.1: Large Conversation

1. **Generate Many Responses**
   - Have a longer conversation (10-20 exchanges)
   - Check that notification updates smoothly
   - ✅ No lag or freezing
   - ✅ Console doesn't flood with errors

2. **Check Memory Usage**
   - Open Chrome Task Manager: `Shift+Esc` (Windows) or from Menu
   - Find "Extension: AI Impact Tracker"
   - ✅ Memory should be reasonable (<50 MB)
   - ✅ CPU should be low when idle

---

## Troubleshooting

### Issue: Extension Won't Load

**Symptoms:**
- Red error message on chrome://extensions
- Extension card shows "Errors" button

**Solutions:**
1. Check manifest.json syntax: `python3 -m json.tool manifest.json`
2. Verify all files exist: `ls -la energy-calculator.js content.js popup.js`
3. Check file permissions: `chmod 644 *.js`
4. Click "Errors" button to see specific error
5. Check console for detailed error message

### Issue: "Cannot find calculateEnergyAndEmissions"

**Symptoms:**
- Error in content script console
- Notification doesn't appear

**Solutions:**
1. Check manifest.json loads energy-calculator.js BEFORE content.js
2. Verify energy-calculator.js exists
3. Check file has export statements
4. Reload extension: click ↻ on chrome://extensions

### Issue: Popup Shows Wrong Values

**Symptoms:**
- Values don't match notification
- Values seem too low (0.76 Wh for 100 tokens)

**Solutions:**
1. This means the old buggy code is still running
2. Hard reload extension: Remove → Re-add on chrome://extensions
3. Clear storage: DevTools → Application → Storage → Clear site data
4. Verify popup.js imports energy-calculator.js
5. Check popup.html has `type="module"` on script tag

### Issue: Module Import Error in Popup

**Symptoms:**
- Error: "Cannot use import statement outside a module"
- Popup blank or doesn't load

**Solutions:**
1. Check popup.html has: `<script type="module" src="popup.js">`
2. Verify energy-calculator.js has export statements
3. Hard reload extension

### Issue: Values Don't Change When Switching Methods

**Symptoms:**
- Clicking dropdown does nothing
- Values stay the same

**Solutions:**
1. Check browser console for errors
2. Verify popup.js uses calculateEnergyAndEmissions (not old function)
3. Check recalculateLogsInPopup() calls correct function
4. Clear extension storage and retry

---

## Expected Test Results Summary

| Test | Expected Result | Pass/Fail |
|------|----------------|-----------|
| verify-fix.js | All tests pass | ⬜ |
| test-refactoring.js | All tests pass | ⬜ |
| Extension loads | No errors | ⬜ |
| Content script works | Notification appears | ⬜ |
| Energy values correct | ~4 Wh per 100 tokens | ⬜ |
| Popup opens | No errors | ⬜ |
| Popup shows data | Displays correctly | ⬜ |
| Method switching | Values change correctly | ⬜ |
| Community → Altman | Values drop ~100x | ⬜ |
| Altman → Community | Values return | ⬜ |
| Storage persists | Data remembered | ⬜ |
| No console errors | Clean console | ⬜ |

---

## Success Criteria

✅ **Issue #13 Fixed** if:
- Energy values are ~4.15 Wh per 100 tokens (not 0.76 Wh)
- Method switching works correctly
- Recalculation produces correct values

✅ **Issue #14 Resolved** if:
- Both content script and popup work
- No "module not found" errors
- Calculations match between contexts

✅ **Ready for Production** if:
- All automated tests pass
- All browser tests pass
- No console errors
- Values are consistent
- Performance is good

---

## Quick Test Checklist

Use this for rapid testing:

```
□ Run verify-fix.js → All pass
□ Run test-refactoring.js → All pass
□ Load extension → No errors
□ Visit ChatGPT → Notification appears
□ Check energy value → ~4 Wh per 100 tokens
□ Open popup → Displays correctly
□ Switch methods → Values change
□ Check console → No errors
□ Refresh page → Still works
```

---

## Need Help?

If you encounter issues:

1. **Check Console First**: Most errors are logged there
2. **Verify File Changes**: Make sure all edits were applied
3. **Hard Reload**: Remove and re-add extension
4. **Check GitHub Issues**: See if it's a known issue
5. **Create Issue**: Include console errors and steps to reproduce

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Update version in manifest.json (1.8 → 1.9)
2. ✅ Update CHANGELOG.md
3. ✅ Commit changes to git
4. ✅ Create release on GitHub
5. ✅ Submit to Chrome Web Store

Good luck with testing! 🚀
