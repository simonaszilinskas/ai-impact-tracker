<div align="center">

# AI impact tracker 🌱

A browser extension (for now only Chrome) that estimates the environmental impact of your AI interactions.

<div style="margin: 20px 0;">
  <a href="https://chromewebstore.google.com/detail/ai-impact-tracker/lbeceglchgnhaaidddcdgapnacdjofpf?authuser=1&hl=fr&pli=1" style="display: inline-block; background-color: #4285F4; color: white; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-weight: 500; transition: background-color 0.3s;">
    <span style="display: flex; align-items: center; gap: 8px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
      Add to Chrome
    </span>
  </a>
</div>


<img src="https://github.com/user-attachments/assets/370b8f74-5eba-46f5-a22d-549ad0dd26a7" width="600px" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
</div>

## Features

- **Real-time Energy Tracking**: Monitors your ChatGPT conversations and calculates energy consumption
- **EcoLogits v0.9.x Methodology**: Energy estimates based on academic research (EcoLogits methodology)
- **Relatable Equivalents**: Understand your impact through everyday comparisons:
  - 📺 YouTube streaming time
  - 💡 60W light bulb runtime
  - 📱 Phone charges
  - 🛗 Elevator travel
- **Daily & Lifetime Stats**: Track both your daily usage and cumulative impact
- **Privacy-Focused**: No data collection, all tracking happens locally

## How it works
This extension tracks messages the user sends to ChatGPT, tries to catch the number of output tokens by the models based on the character size of it's response, then it calculates the energy footprint. More on the methodology: https://github.com/simonaszilinskas/ai-impact-tracker/blob/main/methodology.md

## Current status
- Works exclusively with ChatGPT for now, with plans to support more AI platforms
- First version will soon be published on the Chrome Web Store
- Open to contributions

Here is the roadmap: [AI Impact Tracker Roadmap](https://github.com/users/simonaszilinskas/projects/1)

Feel free to implement some of the ideas or to suggest new ones - contributions are welcome! Feel free to submit issues, feature requests, or pull requests.

## Contact
The project is mainly being vibe coded by:

[simon@tortue.studio](mailto:simon@tortue.studio)  
[https://www.linkedin.com/in/simonaszilinskas/](https://www.linkedin.com/in/simonaszilinskas/)

Feel free to reach out !
