# Issue #15: Remove Email Collection Feature

## Problem

The extension currently collects user emails to unlock the "Lifetime" statistics tab. This creates several issues:

### Privacy Concerns
- Adds friction to user experience with email gate
- Requires maintaining privacy policy and GDPR compliance
- Stores user data in Supabase (external dependency)
- Users may be hesitant to share email for a simple tracker

### Maintenance Burden
- Requires Supabase infrastructure
- Need to maintain privacy policy documentation
- Need to handle data deletion requests
- Additional complexity in codebase

### User Experience
- Creates artificial barrier to viewing lifetime stats
- Email collection feels invasive for a privacy-focused tool
- Inconsistent with the extension's transparency mission

## Proposed Solution

**Remove email collection entirely and make lifetime stats freely accessible.**

### Changes Required

1. **Remove UI Components**
   - Delete email collection overlay from popup.html
   - Remove email input form
   - Remove marketing consent checkbox
   - Remove "Unlock Lifetime Stats" messaging

2. **Remove Backend Code**
   - Remove Supabase integration from popup.js
   - Remove `sendEmailToBackend()` function
   - Remove `saveUserEmail()` function
   - Remove `getUserEmail()` function
   - Remove `checkUserEmailAndUpdateUI()` function

3. **Simplify UI Logic**
   - Remove `showEmailOverlay()` / `hideEmailOverlay()` functions
   - Remove email validation logic
   - Remove conditional rendering of lifetime tab
   - Make lifetime stats always visible

4. **Update Documentation**
   - Remove email collection from privacy-policy.md
   - Simplify privacy policy (no data collection)
   - Update README if it mentions email collection

5. **Clean Storage**
   - Remove email storage keys from Chrome storage
   - Clean up user data on update (optional migration)

### Benefits

✅ **Improved Privacy**: No user data collection at all
✅ **Better UX**: Immediate access to all features
✅ **Simpler Codebase**: Remove ~150 lines of code
✅ **No External Dependencies**: Remove Supabase dependency
✅ **Lower Maintenance**: No privacy policy to maintain
✅ **More Trust**: Users trust extensions that don't collect data

### Implementation Steps

1. Remove email overlay HTML from popup.html (~30 lines)
2. Remove email-related functions from popup.js (~100 lines)
3. Remove email checks from tab switching logic
4. Update privacy-policy.md to reflect no data collection
5. Test that lifetime tab works without email
6. Update version and changelog

### Affected Files

- `popup.html` - Remove email collection UI
- `popup.js` - Remove email logic (~100-150 lines)
- `popup.css` (in popup.html) - Remove email overlay styles
- `privacy-policy.md` - Simplify to "no data collection"
- `README.md` - Update if mentions email
- `manifest.json` - Can remove host_permissions for Supabase (if only used for email)

### Code Locations

**popup.html**:
- Email overlay div (~lines 520-580)
- Email input form
- Marketing consent checkbox

**popup.js**:
- Lines 474-501: `setupEmailForm()`
- Lines 506-541: `showEmailOverlay()`, `hideEmailOverlay()`, `checkUserEmailAndUpdateUI()`
- Lines 546-548: `isValidEmail()`
- Lines 554-568: `saveUserEmail()`
- Lines 573-584: `getUserEmail()`
- Lines 589-620: `sendEmailToBackend()`

### Migration Notes

Consider adding a one-time migration to clean up stored emails:
```javascript
// One-time cleanup on extension update
chrome.storage.local.remove([
  'userEmail',
  'emailConsent',
  'emailConsentDate',
  'marketingConsent',
  'marketingConsentDate'
]);
```

### Alternative: Keep Email as Optional

If we want to keep a mailing list for updates:
- Make email collection optional (not required for lifetime stats)
- Add separate "Get updates" section with opt-in
- Still simplify the current implementation

However, **full removal is recommended** for maximum privacy and simplicity.

## Priority

**Medium** - Not urgent but improves privacy and UX significantly

## Labels

- enhancement
- privacy
- UX improvement
- code cleanup

## Related

- privacy-policy.md documentation
- Issue #14 (code simplification)

---

**To create this issue on GitHub:**
1. Go to https://github.com/simonaszilinskas/ai-impact-tracker/issues/new
2. Copy the title: "Remove email collection feature"
3. Copy the content above into the issue body
4. Add labels: enhancement, privacy, UX improvement
5. Click "Submit new issue"
