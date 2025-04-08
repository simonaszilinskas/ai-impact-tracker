# AI impact tracker 🌱

A browser extension (for now only Chrome) that estimates the environmental impact of your AI interactions.

![screely-1744124117056](https://github.com/user-attachments/assets/b62fb835-b76c-4093-910b-6e840abe692f)

## How it works

This extension tracks messages the user sends to ChatGPT, tries to estimate the number of output tokens by the models based on the character size of it's response, then, using a methodology inspired by [Ecologits](https://ecologits.ai/), it calculates the energy footprint. For that, it relies on a few assumptions : 
- It supposes that you use GPT 4o on ChatGPT
- It estimates that GPT 4o is a Mixture of Experts (MoE) type of model with ~440B total parameters and ~55B active parameters per inference (the number of active parameters is probably larger, but let's give GPT 4o the benefit of the doubt)

Note: The equivalence coefficients are currently placeholders. More research will be done to base them in verified data.

## Current status

- Works exclusively with ChatGPT for now, with plans to support more AI platforms
- First version will soon be published on the Chrome Web Store
- Actively seeking contributions from the community

## To install it 
1. Clone the project locally
2. Go to Chrome -> Extensions -> Developer mode
3. Load the project folder as an unpacked extension

## Roadmap

Check out the ideas on the roadmap :
[AI Impact Tracker Roadmap](https://github.com/users/simonaszilinskas/projects/1)

Feel free to implement some of them - contributions are welcome! Feel free to submit issues, feature requests, or pull requests.

## Contact

The project is mainly being vibe coded by Simon :
- Simon Žilinskas - [simon@tortue.studio](mailto:simon@tortue.studio)
- LinkedIn: [https://www.linkedin.com/in/simonaszilinskas/](https://www.linkedin.com/in/simonaszilinskas/)

