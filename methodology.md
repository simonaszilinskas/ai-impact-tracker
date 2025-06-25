# AI Impact Tracker methodology

This page tries to outline the methodology used by the AI Impact Tracker extension to calculate energy consumption of LLM interactions, along with real-world equivalents for better context.

## Features

- **Real-time Tracking**: Monitors your conversations with ChatGPT and calculates energy consumption based on token usage.
- **Daily & Total Usage**: Tracks both your daily usage and your cumulative impact over time.
- **Dual Estimation Methods**: Choose between community estimates (academic research) and Sam Altman's estimation for different perspectives on energy consumption.
- **Movable Interface**: The overlay notification can be dragged and positioned anywhere on the screen for convenience.
- **Persistence**: Your preferred overlay position and estimation method are remembered between sessions.

## How energy consumption of LLMs is calculated

The AI Impact Tracker offers two different estimation methods, each providing a different perspective on ChatGPT's energy consumption:

### Estimation Methods

#### 1. Community Estimates (Default)
Based on academic research and the EcoLogits methodology, modeling ChatGPT as a large Mixture of Experts (MoE) model.

#### 2. Sam Altman's Estimation  
Based on OpenAI CEO Sam Altman's blog post statement that ChatGPT consumes approximately 0.34 Wh per query.

### Core methodology

The calculations focus on inference-time energy consumption, which represents the energy used when interacting with an LLM.

Key components shared by both methods:
* **Token-based estimation**: Energy consumption is calculated per output token, using character count as a proxy (roughly 4 characters = 1 token for English text)
* **Per-query scaling**: Sam Altman's estimation is scaled from per-query to per-token based on average output length (781 tokens)
* **Real-time calculation**: Both methods calculate energy consumption as conversations happen

### Energy consumption formulas

#### Community Estimates Formula

The energy consumption per token is calculated using the EcoLogits methodology:

```
energyPerToken = ENERGY_ALPHA * activeParamsBillions + ENERGY_BETA
totalEnergy = outputTokens * energyPerToken * PUE
```

Where:
* **ENERGY_ALPHA** = 8.91e-5 Wh/token/B-params (Energy coefficient for model parameters)
* **ENERGY_BETA** = 1.43e-3 Wh/token (Base energy per token)
* **activeParamsBillions** = 55 billion (12.5% of 440B total parameters)
* **PUE** = 1.2 (Power Usage Effectiveness for data center overhead)

This formula is derived from academic research on LLM energy consumption, scaling with both the number of active parameters and the total tokens processed.

#### Sam Altman's Estimation Formula

Based on the stated 0.34 Wh per query, scaled to per-token usage:

```
energyPerToken = 0.34 Wh / 781 tokens ≈ 0.000435 Wh/token
totalEnergy = outputTokens * energyPerToken
```

Where:
* **0.34 Wh** = Energy per query as stated by Sam Altman
* **781 tokens** = Average output length used for scaling
* **outputTokens** = Actual tokens in the assistant's response

#### Comparison of Methods

The two estimation methods produce significantly different results:
* **Community estimates**: ~0.09 Wh per token (based on computational modeling)
* **Sam Altman's estimation**: ~0.0004 Wh per token (scaled from industry statement)
* **Difference**: Community estimates are approximately **14.5x higher** than Sam Altman's estimation

This difference reflects the ongoing debate in the research community about actual AI energy consumption, with academic models typically showing higher energy usage than industry statements.

### Assumptions for ChatGPT (GPT 4o) - Community Estimates

* **Total parameters**: 440 billion parameters
* **Active parameters**: ~55 billion (12.5% activation ratio)
* **Quantization**: 4-bit precision 
* **Data center PUE**: 1.2 
* **GPU configuration**: Estimated 8 GPUs per server, 80GB memory per GPU

### Sources and References

#### Academic Research (Community Estimates)
* **EcoLogits methodology**: Derived from academic research on LLM energy consumption patterns
* **Mixture of Experts modeling**: Based on published research about MoE architectures and their energy characteristics
* **Parameter scaling**: Uses established relationships between model size and energy consumption

#### Industry Data (Sam Altman's Estimation)
* **Source**: Sam Altman's public statement regarding ChatGPT energy consumption
* **Context**: Industry perspective on actual operational energy usage
* **Scaling**: Adapted from per-query to per-token based on typical response lengths

#### Switching Between Methods

Users can toggle between estimation methods using the dropdown in the extension popup:
* **Default**: Community estimates (more conservative, research-based)
* **Alternative**: Sam Altman's estimation (industry perspective, significantly lower)
* **Real-time switching**: All historical data is recalculated when switching methods
* **Persistence**: Your choice is saved and remembered across browser sessions

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

### Water consumption

**Energy estimate**: ~0.2 L water per kWh of energy

**Methodology**:
* Based on Water Usage Effectiveness (WUE) metrics from cloud data centers
* Formula: `waterConsumptionLiters = (energyUsageWh / 1000) * 0.2`
* Uses Microsoft Azure's reported average WUE of 0.2 L/kWh

**Sources**:
* Microsoft Sustainability Report (2023) - https://www.microsoft.com/sustainability
* Patterson et al. (2021) - "Carbon Emissions and Large Neural Network Training" - https://arxiv.org/abs/2104.10350
* Xu et al. (2023) - "Making AI Less 'Thirsty'" - https://arxiv.org/abs/2304.03271

**Limitations**:
* Regional variability in WUE based on data center location and cooling methods
* Excludes embodied water used in chip manufacturing
* Based on annualized averages rather than task-specific measurements

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
Derived from “active energy per 100 runs” benchmarks for VFAC PM-driven elevators (April 2017 Elevator World article - https://elevatorworld.com/article/lift-energy-consumption-comparative-reporting/)

# Conclusion

The AI Impact Tracker provides two different perspectives on LLM energy consumption, reflecting the ongoing debate between academic research and industry statements. By offering both community estimates (research-based) and Sam Altman's estimation (industry-based), users can understand the range of possible energy impacts and make informed decisions about their AI usage.

The significant difference between the two methods (14.5x) highlights the uncertainty in current AI energy consumption estimates and the need for more transparency from AI providers regarding their actual energy usage.

All estimates are contextualised through familiar equivalents to help users understand the real-world impact of their AI interactions.

**Important Note**: These are estimates based on available information. Exact energy measurements would require direct data from model providers, which is currently not publicly available.

Contributions to improve these calculations are welcome. If you have suggestions, corrections, or additional data sources that could enhance the accuracy of the estimates, please open an issue or submit a pull request.

