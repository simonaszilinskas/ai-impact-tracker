# Issue #16: Replace Water Usage Metric with More Relatable Equivalent

## Problem

The current "Water consumption" metric is difficult for users to understand and relate to:

### Current Implementation
- Shows water in liters (e.g., "0.83 L")
- Based on data center WUE (Water Usage Effectiveness)
- Formula: `(energyWh / 1000) * 0.2 L/kWh`

### Why It's Problematic

1. **Not Intuitive**: Users don't have a mental model for data center water usage
2. **Abstract Metric**: Hard to understand what 0.83 L means in practice
3. **Regional Variation**: WUE varies significantly by data center location
4. **Indirect Connection**: Water is used for cooling, not directly by inference
5. **Less Relatable**: Unlike "YouTube streaming" or "phone charges", water usage is abstract

### User Feedback
Users are more likely to understand and remember metrics they can directly relate to in their daily lives.

## Proposed Solution

Replace the water usage metric with a more relatable environmental equivalent.

## Alternative Metrics to Consider

### Option 1: Light Bulb Hours ⭐ RECOMMENDED
**Metric**: Hours a 60W incandescent light bulb could run

**Calculation**:
```javascript
// 60W bulb = 0.06 kW
const lightBulbHours = energyWh / 60; // Hours
```

**Example Output**:
- 4.15 Wh → "~4 minutes of a 60W light bulb"
- 41.5 Wh → "~40 minutes of a 60W light bulb"
- 415 Wh → "~7 hours of a 60W light bulb"

**Pros**:
✅ Universally relatable (everyone uses light bulbs)
✅ Direct energy comparison (not indirect like water)
✅ Simple calculation
✅ Easy to visualize

**Cons**:
❌ May feel less "environmental" (light bulbs are declining with LEDs)

---

### Option 2: LED Bulb Hours
**Metric**: Hours a 10W LED bulb could run

**Calculation**:
```javascript
// 10W LED = 0.01 kW
const ledBulbHours = energyWh / 10; // Hours
```

**Example Output**:
- 4.15 Wh → "~25 minutes of an LED bulb"
- 41.5 Wh → "~4 hours of an LED bulb"
- 415 Wh → "~41 hours of an LED bulb"

**Pros**:
✅ More modern (LEDs are standard now)
✅ Shows even more impressive numbers
✅ Simple calculation

**Cons**:
❌ Some users may not know LED wattage

---

### Option 3: Laptop Charging Time
**Metric**: Minutes of laptop charging

**Calculation**:
```javascript
// Typical laptop charger: 45-65W, use 60W average
const laptopMinutes = (energyWh / 60) * 60; // Minutes
```

**Example Output**:
- 4.15 Wh → "~4 minutes of laptop charging"
- 41.5 Wh → "~40 minutes of laptop charging"

**Pros**:
✅ Highly relatable for tech users
✅ Direct energy comparison
✅ Relevant to the audience (people using AI)

**Cons**:
❌ Laptop power varies significantly

---

### Option 4: Microwave Usage Time
**Metric**: Seconds a microwave could run

**Calculation**:
```javascript
// Microwave: ~1000W = 1 kW
const microwaveSeconds = (energyWh / 1000) * 3600; // Seconds
```

**Example Output**:
- 4.15 Wh → "~15 seconds of microwave"
- 41.5 Wh → "~2.5 minutes of microwave"

**Pros**:
✅ Very relatable household appliance
✅ Everyone uses microwaves
✅ Easy to visualize

**Cons**:
❌ Less "tech-relevant"

---

### Option 5: Electric Kettle Boiling Time
**Metric**: Seconds an electric kettle runs

**Calculation**:
```javascript
// Electric kettle: ~1500W = 1.5 kW
const kettleSeconds = (energyWh / 1500) * 3600; // Seconds
```

**Example Output**:
- 4.15 Wh → "~10 seconds of electric kettle"
- 41.5 Wh → "~1.5 minutes of electric kettle"

**Pros**:
✅ Common household appliance
✅ Tangible comparison

**Cons**:
❌ Not used in all regions (less common in US)

---

### Option 6: Air Conditioning Runtime
**Metric**: Minutes of home AC unit

**Calculation**:
```javascript
// Small AC unit: ~1000W = 1 kW
const acMinutes = (energyWh / 1000) * 60; // Minutes
```

**Example Output**:
- 4.15 Wh → "~15 seconds of AC"
- 41.5 Wh → "~2.5 minutes of AC"

**Pros**:
✅ Highly energy-intensive, makes impact clear
✅ Climate-relevant comparison

**Cons**:
❌ Not everyone has AC
❌ Power varies significantly by unit size

---

### Option 7: Gaming Console Hours
**Metric**: Hours running a PlayStation/Xbox

**Calculation**:
```javascript
// Gaming console: ~100-200W, use 150W
const gamingMinutes = (energyWh / 150) * 60; // Minutes
```

**Example Output**:
- 4.15 Wh → "~1.7 minutes of gaming"
- 41.5 Wh → "~17 minutes of gaming"

**Pros**:
✅ Relevant to tech-savvy audience
✅ Relatable for younger users

**Cons**:
❌ Not universal
❌ Power varies by console

---

## Recommendation

**Option 1: Light Bulb Hours (60W incandescent)** ⭐

### Why This Works Best:

1. **Universal**: Everyone understands light bulbs
2. **Simple**: Direct energy-to-energy comparison
3. **Relatable**: Easy to visualize ("left a light on for X hours")
4. **Clear Scale**: Shows impact in understandable time units
5. **Educational**: Helps users understand energy consumption

### Implementation

**Replace in popup.js** (lines 419-434):

```javascript
// OLD: Water consumption calculation
const waterConsumptionLiters = Math.max(0, (validEnergyUsage / 1000) * 0.2);

// NEW: Light bulb hours calculation
const lightBulbMinutes = Math.max(0, (validEnergyUsage / 60) * 60);
// Convert to hours if > 60 minutes
const lightBulbHours = lightBulbMinutes / 60;
```

**Update UI labels**:
```html
<!-- OLD -->
<div class="equivalence-label">Water consumed</div>

<!-- NEW -->
<div class="equivalence-label">60W light bulb runtime</div>
```

**Update icon**:
```html
<!-- OLD -->
<div class="emoji">💧</div>

<!-- NEW -->
<div class="emoji">💡</div>
```

**Update display logic**:
```javascript
// Show in minutes if < 60, hours if >= 60
if (lightBulbHours < 1) {
  element.textContent = `${Math.round(lightBulbMinutes)} mins`;
} else if (lightBulbHours < 10) {
  element.textContent = `${lightBulbHours.toFixed(1)} hours`;
} else {
  element.textContent = `${Math.round(lightBulbHours)} hours`;
}
```

### Affected Files

- `popup.js` - Lines 419-434 (calculation function)
- `popup.js` - Lines 286-301 (today stats display)
- `popup.js` - Lines 364-378 (lifetime stats display)
- `popup.html` - Update label and emoji (2 places: today and lifetime tabs)
- `methodology.md` - Update equivalents section with new metric

### Testing

After implementation:
- 4.15 Wh should show "~4 minutes" or "0.1 hours"
- 41.5 Wh should show "~40 minutes" or "0.7 hours"
- 415 Wh should show "~7 hours"
- 4150 Wh should show "~69 hours" or "~3 days"

## Benefits

✅ **More Intuitive**: Everyone understands light bulbs
✅ **Direct Comparison**: Energy-to-energy (not energy-to-water)
✅ **Better UX**: Users can actually relate to the metric
✅ **Educational**: Shows real-world energy equivalence
✅ **Simpler Code**: No WUE calculations needed
✅ **No Regional Variance**: Universal metric

## Priority

**Low-Medium** - Improves UX but not critical

## Labels

- enhancement
- UX improvement
- metrics

## Alternative

If you prefer a different metric from the list above, that works too! The key is to choose something:
1. Universally relatable
2. Easy to visualize
3. Direct energy comparison
4. Simple to calculate

---

**To create this issue on GitHub:**
1. Go to https://github.com/simonaszilinskas/ai-impact-tracker/issues/new
2. Copy the title: "Replace water usage metric with more relatable equivalent"
3. Copy the content above into the issue body
4. Add labels: enhancement, UX improvement, metrics
5. Click "Submit new issue"
