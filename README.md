# Rabbitwave Vlogger

Electron app to record presentation videos and vlogs. 

How to use:

1. Configure your input devices.
2. Import assets: videos, images, audio you want to show.
3. Arrange assets in the list.
4. Configure your assets (how to show them, how long, etc.)
5. Make notes for your presentation.
6. Save your asset list and configuration into JSON if you feel so.
7. Start recording. Talk to the camera and do your ego hour.
8. Single click any asset for a preview. Double click to superimpose over the video.
9. When done, stop recording and save your shit.

I'll explain the name later. Proper docs coming up later. This was made for my own use, I like it, nobody cares your whining. I may implement it further later.

# Known bugs

- Add friendly error message for when an asset list can't be loaded
- Stop button is buggy.
- There's no exit confirmation now.
- Superimpose a video without recording and pause it. Start recording. Start video. Stop video. Error, and the audio track doesn't switch.

# Future plans

- Show asset in asset configuration panel
- Create a better asset list, with details about each asset
- Implement asset folders
- Configuration panel for asset import defaults (saved with configuration)
- Transition effects such as fade, etc
- Simple image animations
- Optional pointer to explain and mark images
- Intro animation and superimposed watermarks (corner logo)
- Direct streaming and automatic uploading
- Allow remote guests

## Code quality

- No, I will not use React
- Fuck your unit tests
- Maybe I should use JQuery tho
- Or Bootstrap or something
- Yeah, maybe Vue