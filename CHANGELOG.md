# Changelog

All notable changes to the AI Impact Tracker extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1] - 2025-10-17

### Changed
- **Replaced water consumption metric with light bulb runtime** (Issue #16)
  - Changed from abstract "water evaporated" to relatable "60W bulb runtime"
  - Updated emoji from 💧 to 💡
  - New metric shows runtime in seconds/minutes/hours based on value
  - Benefits: More intuitive, direct energy comparison, no regional variance
  - Formula: `lightBulbMinutes = (energyWh / 60) * 60`

### Updated
- Updated manifest description to reflect new metrics
- Updated methodology.md with light bulb runtime explanation
- Updated TESTING.md to reflect new metric expectations

## [2.0] - 2025-10-17

### Removed
- **Removed email collection feature** (Issue #15)
  - Removed email input overlay and all related code
  - Simplified lifetime stats display
  - No more data collection or storage of personal information

### Changed
- Improved privacy by removing all user data collection

## [1.9] - 2025-10-17

### Fixed
- **Fixed critical energy calculation bug** (Issue #13)
  - Corrected popup.js calculation that was underestimating by 5.46x
  - Energy values now correctly show ~4.15 Wh per 100 tokens (was 0.76 Wh)
  - Recalculation when switching estimation methods now works properly

### Improved
- **Eliminated code duplication** (Issue #14)
  - Created shared `energy-calculator.js` module
  - Both content script and popup now use same calculation logic
  - Ensures consistency across all components
  - Easier to maintain and update

### Added
- Comprehensive testing documentation in TESTING.md
- Verification scripts for calculation accuracy

## [1.8] - 2025-10-15

### Added
- Initial release with basic energy tracking
- Support for ChatGPT (chatgpt.com)
- Dual estimation methods (Community estimates vs Sam Altman's estimation)
- Environmental equivalents:
  - YouTube streaming time
  - Water consumption (replaced in v2.1)
  - Phone charges
  - Elevator travel
- Daily and lifetime statistics tracking
- Draggable notification widget
- Dark mode support
