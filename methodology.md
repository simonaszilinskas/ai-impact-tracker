# AI Impact Tracker methodology

This page tries to outline the methodology used by the AI Impact Tracker extension to calculate energy consumption of LLM interactions, along with real-world equivalents for better context.

## How energy consumption of LLMs is calculated

### Core methodology

The AI Impact Tracker uses the [EcoLogits](https://ecologits.ai/latest/) methodology developed by GenAI Impact, a non-profit focused on measuring the environmental impact of generative AI systems. The calculations focus on inference-time energy consumption, which represents the energy used when interacting with an LLM.

Key components of the calculation :
* **Token-based estimation**: Energy consumption is calculated per output token, using character count as a proxy (roughly 4 characters = 1 token for English text)
* **Model architecture consideration**: Special handling for Mixture of Experts (MoE) models, which only activate a subset of parameters during inference
* **Data center overhead**: Inclusion of Power Usage Effectiveness (PUE) to account for cooling and infrastructure costs

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
* Primary energy consumers:
  * Content delivery networks (CDNs)
  * Data centers
  * Network infrastructure

**Source**: Based on multiple peer-reviewed studies showing streaming infrastructure consumes approximately 15 Wh per hour of streaming.

### Toasts toasted

**Energy estimate**: ~30-33 Wh per slice of toast

**Methodology**:
* Based on a standard 1000W toaster
* Average toasting time of 2 minutes (1/30 hour)
* Calculation: 1000W × (2/60)h = ~33 Wh

This is one of the most consistent metrics as toaster power consumption and toasting times are relatively standardized.

### Phones charged

**Energy estimate**: ~10-15 Wh per full charge

**Methodology**:
* Based on typical smartphone battery capacity: 3000-4000 mAh
* Standard battery voltage: 3.7V
* Calculation: 3500mAh × 3.7V = ~13 Wh (plus ~15% charging inefficiency)

**Note**: Modern smartphones vary in battery capacity, but this provides a reasonable average for comparison purposes.

### High-Speed Rail Traveled

**Energy estimate**: ~20-30 Wh per passenger-kilometer

**Methodology**:
* Based on TGV (French high-speed train) 
* Assumes typical passenger load (70-80% of capacity)
* Considers regenerative braking and electric propulsion efficiency

## Limitations and caveats
* The calculations represent estimates based on research found and may not reflect actual measurements from OpenAI's infrastructure
* Energy consumption varies based on model version and specific implementation details not publicly available
* Network transmission energy may vary significantly based on user location and infrastructure

# Conclusion

The AI Impact Tracker provides estimates of LLM energy consumption and tries to contextualise them through familiar equivalents. Exact energy measurements would require direct data from model providers.

Contributions to improve these calculations are welcome. If you have suggestions, corrections, or additional data sources that could enhance the accuracy of the estimates, please open an issue or submit a pull request.
