# AI Impact Tracker methodology

This page tries to outline the methodology used by the AI Impact Tracker extension to calculate energy consumption of LLM interactions, along with real-world equivalents for better context.

## Features

- **Real-time Tracking**: Monitors your conversations with ChatGPT and calculates energy consumption based on token usage.
- **Daily & Total Usage**: Tracks both your daily usage and your cumulative impact over time.
- **EcoLogits v0.9.x Methodology**: Energy estimates based on the EcoLogits methodology (academic research + info leaks + latency and pricing info)
- **Movable Interface**: The overlay notification can be dragged and positioned anywhere on the screen for convenience.
- **Persistence**: Your preferred overlay position is remembered between sessions.

## How energy consumption of LLMs is calculated

The AI Impact Tracker uses the EcoLogits v0.9.x methodology to estimate ChatGPT's energy consumption.

### Core methodology

The calculations focus on inference-time energy consumption, which represents the energy used when interacting with an LLM.

Key components:
* **Token-based estimation**: Energy consumption is calculated per output token, using character count as a proxy (roughly 4 characters = 1 token)
* **Real-time calculation**: Energy consumption is calculated as conversations happen based on per-token estimates
* **Batch amortization**: Server overhead is amortized across concurrent requests (batch size 64)

### Energy consumption formula

The energy consumption uses the EcoLogits v0.9.x methodology with an exponential GPU energy model fitted from ML.ENERGY Leaderboard data (H100, vLLM, batch ≤512):

```
gpuEnergyPerToken = (α·exp(β·B)·P_active + γ) / 1000   [kWh/token]
serverEnergy = (latency/3600) × P_server × (numGPUs/installed) × (1/B)   [kWh]
totalEnergy = PUE × (serverEnergy + numGPUs × gpuEnergy) × 1000   [Wh]
```

Where:
* **α** = 1.167e-6, **β** = -0.0112, **γ** = 4.053e-5 (GPU energy model coefficients)
* **B** = 64 (batch size — concurrent requests per GPU)
* **P_active** = 60 billion active parameters
* **PUE** = 1.2 (Power Usage Effectiveness for data center overhead)
* **P_server** = 1.2 kW (server power excluding GPUs)
* **Emission factor** = 0.38355 kgCO2eq/kWh (USA electricity mix)

### Assumptions for ChatGPT (GPT-5)

* **Total parameters**: 300 billion parameters
* **Active parameters**: 60 billion (average, range: 30-90B)
* **Activation ratio**: 20% (Mixture of Experts architecture)
* **Quantization**: 16-bit precision
* **Data center PUE**: 1.2
* **GPU configuration**: 8× NVIDIA H100 80GB per server, 16 GPUs required (power-of-2 rounding)

## Calculating real-world equivalences

To provide context for the energy consumed by AI interactions, the tool converts Wh measurements to everyday activities.

### YouTube video streaming

**Energy estimate**: ~0.25 Wh per minute of standard definition streaming

**Methodology**:
* Focused on network and data center energy (excluding device energy)
* Assumes standard video quality (480p)
* Formula: `movieMinutes = energyUsageWh / 0.25`
* Primary energy consumers:
  * Content delivery networks (CDNs)
  * Data centers
  * Network infrastructure

**Source**: Based on multiple peer-reviewed studies showing streaming infrastructure consumes approximately 15 Wh per hour of streaming.

### Light bulb runtime

**Energy estimate**: 60W incandescent light bulb runtime

**Methodology**:
* Based on a standard 60W incandescent light bulb
* Provides a direct energy-to-energy comparison that's universally relatable
* Formula: `lightBulbMinutes = (energyUsageWh / 60) * 60`
* 60W bulb = 0.06 kW, so runtime in minutes equals energy in Wh

**Why this metric**:
* **Universal**: Everyone understands how long a light bulb runs
* **Direct comparison**: Energy-to-energy (not indirect like water consumption)
* **Easy to visualize**: People can relate to "leaving a light on for X hours"
* **Simple calculation**: No regional variations or complex conversion factors

**Display format**:
* < 1 minute: Shows in seconds (e.g., "15 secs")
* 1-59 minutes: Shows in minutes (e.g., "42 mins")
* 60+ minutes: Shows in hours (e.g., "4.2 hours" or "15 hours")

**Example conversions**:
* 4.15 Wh → ~4 minutes of a 60W light bulb
* 41.5 Wh → ~42 minutes of a 60W light bulb
* 415 Wh → ~7 hours of a 60W light bulb

### Phones charged

**Energy estimate**: ~13.5 Wh per full charge

**Methodology**:
* Based on typical smartphone battery capacity: 3000-4000 mAh
* Standard battery voltage: 3.7V
* Calculation: 3500mAh × 3.7V = ~13 Wh (plus charging inefficiency)
* Formula: `phoneCharges = energyUsageWh / 13.5`

**Note**: Modern smartphones vary in battery capacity, but this provides a reasonable average for comparison purposes.

### Elevator rides

**Energy estimate**: ≈ 6.25 Wh per person per floor

**Methodology**:
1. **Active energy per 100 runs** (post-modernization, VFAC PM drive): assumed 5 kWh (5,000 Wh)  
2. **Average load per run**: 2 people  
3. **Average floors served per run**: 4 floors  
4. **Total person-floors in 100 runs**: 100 runs × 2 people/run × 4 floors/run = 800 person-floors  
5. **Energy per person-floor**: 5,000 Wh ÷ 800 person-floors = 6.25 Wh/person-floor
6. **Formula**: `elevatorFloors = energyUsageWh / 6.25`

**Source data**:
Derived from "active energy per 100 runs" benchmarks for VFAC PM-driven elevators (April 2017 Elevator World article - https://elevatorworld.com/article/lift-energy-consumption-comparative-reporting/)

## ChatGPT-Scale Perspective

The extension provides a scale perspective to help visualize what your personal AI usage would mean if all ChatGPT users consumed the same amount.

### Methodology

The scale comparison calculates hypothetical total electricity consumption across all ChatGPT users based on your daily average usage:

```
dailyAverage = totalLifetimeEnergy / numberOfDaysTracked
annualConsumption = dailyAverage × chatGptWAU × 365 days
```

Where:
* **chatGptWAU** = 900 million weekly active users (2025 estimate)
* **numberOfDaysTracked** = Days between your first and last tracked conversation
* **annualConsumption** = Result in TWh (Terawatt-hours) per year

### Geographic Comparisons

The calculated consumption is then compared against the annual electricity consumption of real geographic entities:

**Reference data includes**:
* **Cities**: Boston (12.3 TWh/year), Paris (16 TWh/year), London (40 TWh/year), Tokyo (48 TWh/year)
* **Small nations**: Malta (2.3 TWh/year), Luxembourg (6.4 TWh/year), Iceland (19.6 TWh/year)
* **Medium countries**: Singapore (55 TWh/year), Portugal (50 TWh/year), Austria (72 TWh/year)
* **Large countries**: Germany (510 TWh/year), Japan (939 TWh/year), India (1,600 TWh/year), United States (4,065 TWh/year), China (8,539 TWh/year)
* **Continents**: Africa (870 TWh/year), Europe (3,400 TWh/year), Asia (13,500 TWh/year)

**Comparison algorithm**:
* Uses logarithmic distance to find the best match across orders of magnitude
* Provides clear, readable comparisons:
  * When higher: "2.5× more than Malta"
  * When similar: "about the same as Singapore"
  * When lower: "88% of Europe" or "about half of Thailand"
* Uses friendly phrases for common ratios (half, one-third, one-quarter)
* Automatically selects the most appropriate entity for context

**Data sources**:
* International Energy Agency (IEA) - 2023-2024 electricity consumption data
* Enerdata - World Energy Statistics 2024
* Our World in Data - Electricity consumption by country
* U.S. Energy Information Administration (EIA) - City-level consumption
* Municipal energy reports for international cities

### Display Format

The scale message appears in the "Lifetime" tab and follows this format:

> "You consume **X Wh** per day on average. If all 900M ChatGPT users consumed as much per day, in a year it would represent **Y TWh** — **Z×** more/less than **[Entity]**'s annual electricity consumption (**W TWh**)."

**Examples**:
> "You consume **42.5 Wh** per day on average. If all 900M ChatGPT users consumed as much per day, in a year it would represent **14.0 TWh** — **about the same as Denver**'s annual electricity consumption (13.1 TWh)."

> "You consume **200 Wh** per day on average. If all 900M ChatGPT users consumed as much per day, in a year it would represent **65.7 TWh** — **1.1× more than Switzerland**'s annual electricity consumption (58.0 TWh)."

> "You consume **1000 Wh** per day on average. If all 900M ChatGPT users consumed as much per day, in a year it would represent **328.5 TWh** — **1.1× more than United Kingdom**'s annual electricity consumption (305.0 TWh)."

### Why This Matters

The ChatGPT-scale perspective helps answer the question: *"What if all ChatGPT users used AI like I do?"*

* **Contextualizes individual impact**: Your personal usage might seem small, but scaled to 900M users it becomes significant
* **Encourages mindful usage**: Understanding potential collective impact can inform more conscious AI interaction patterns
* **Provides tangible comparisons**: Comparing to countries/cities makes abstract TWh numbers relatable
* **Grounded in real adoption**: Uses actual estimated ChatGPT user count rather than world population

**Important notes**:
* This is a hypothetical calculation for perspective, not a prediction
* Based on estimated 900M weekly active ChatGPT users (2025)
* Actual collective consumption depends on many factors (usage frequency, model used, efficiency improvements, etc.)
* The comparison assumes uniform distribution of usage, which is not realistic but useful for illustration

# Conclusion

The AI Impact Tracker provides energy consumption estimates based on the EcoLogits v0.9.x academic methodology. All estimates are contextualized through familiar equivalents to help users understand the real-world impact of their AI interactions.

**Important Note**: These are estimates based on available information. Exact energy measurements would require direct data from model providers, which is currently not publicly available.

Contributions to improve these calculations are welcome. If you have suggestions, corrections, or additional data sources that could enhance the accuracy of the estimates, please open an issue or submit a pull request.

