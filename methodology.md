# AI Impact Tracker methodology

This page tries to outline the methodology used by the AI Impact Tracker extension to calculate energy consumption of LLM interactions, along with real-world equivalents for better context.

## How energy consumption of LLMs is calculated

### Core methodology

The calculations focus on inference-time energy consumption, which represents the energy used when interacting with an LLM.

Key components of the calculation:
* **Token-based estimation**: Energy consumption is calculated per output token, using character count as a proxy (roughly 4 characters = 1 token for English text)
* **Model architecture consideration**: Special handling for Mixture of Experts (MoE) models, which only activate a subset of parameters during inference
* **Data center overhead**: Inclusion of Power Usage Effectiveness (PUE) to account for cooling and infrastructure costs

### Energy consumption formula

The energy consumption per token is calculated using the following formula:

```
energyPerToken = ENERGY_ALPHA * activeParamsBillions + ENERGY_BETA
```

Where:
* **ENERGY_ALPHA** = 8.91e-5 Wh/token/B-params (Energy coefficient for model parameters)
* **ENERGY_BETA** = 1.43e-3 Wh/token (Base energy per token)
* **activeParamsBillions** = Number of active parameters in billions

This formula is derived from academic research on LLM energy consumption, scaling with both the number of active parameters and the total tokens processed.

### Assumptions for ChatGPT (GPT 4o)

* **Total parameters**: 440 billion parameters
* **Active parameters**: ~55 billion (12.5% activation ratio)
* **Quantization**: 4-bit precision 
* **Data center PUE**: 1.2 
* **GPU configuration**: Estimated 8 GPUs per server, 80GB memory per GPU

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

The AI Impact Tracker provides estimates of LLM energy consumption and tries to contextualise them through familiar equivalents. Exact energy measurements would require direct data from model providers.

Contributions to improve these calculations are welcome. If you have suggestions, corrections, or additional data sources that could enhance the accuracy of the estimates, please open an issue or submit a pull request.

