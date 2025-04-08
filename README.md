# AI Impact Tracker 🌱

A Chrome extension that measures the environmental impact of your AI interactions with ChatGPT. Visualize your energy usage and see its real-world equivalents.

![AI Impact Tracker](icons/icon.svg)

## Features

- Track messages sent to ChatGPT
- Calculate energy usage based on message frequency
- View statistics for today and lifetime usage
- Visualize your impact with easy-to-understand equivalents
- Daily and hourly charts to track your usage patterns

## How It Works

This extension estimates energy consumption based on the methodology developed by [Ecologits](https://github.com/ecocode-org/ecologits), which calculates the energy footprint of large language models:

- For large Mixture of Experts (MoE) models with ~440B total parameters and ~55B active parameters per inference
- Energy usage is calculated based on number of queries and estimated power consumption
- Environmental equivalents translate watt-hours into relatable metrics

Note: The equivalence coefficients are currently placeholders. More research will be conducted to base them in verified data.

## Current Status

- Works exclusively with ChatGPT for now, with plans to support more AI platforms
- First version will soon be published on the Chrome Web Store
- Actively seeking contributions from the community

## Roadmap

Check out our project roadmap and upcoming features:
[AI Impact Tracker Roadmap](https://github.com/users/simonaszilinskas/projects/1)

## Contributing

Contributions are welcome! Feel free to submit issues, feature requests, or pull requests.

## Contact

- Simon Ašilinskas - [simon@tortue.studio](mailto:simon@tortue.studio)
- LinkedIn: [https://www.linkedin.com/in/simonaszilinskas/](https://www.linkedin.com/in/simonaszilinskas/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

✨ Vibe coded by Simon