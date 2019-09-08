# act-overlay-kyaputen
A light weight Boss Mods overlay that will load in the encounter script (if supported) and give reminders to the player on mechanics and how to execute them in a timely manner.

# Dependencies

- Advanced Combat Tracker
- OverlayPlugin

# Installation Instructions

The easiest way to install and get up and running quickly is outlined below.

## Required Files

- Advanced Combat Tracker, [latest version](https://advancedcombattracker.com/includes/page-download.php?id=56)
- OverlayPlugin, [latest version](https://github.com/ngld/OverlayPlugin/releases/latest)

## Steps

1. Follow the [guide](https://gist.github.com/TomRichter/e044a3dff5c50024cf514ffb20a201a9#ffxiv-act-installation-instructions) by [TomRichter](https://github.com/TomRichter),  to install the latest version of `ACT`.

2. Install `OverlayPlugin` after `ACT` is installed.

3. That's it!

# Setup

We will setup a WebSocket Server to serve our data to Kyaputen using `OverlayPlugin` and then add the overlay page to it.

1. OverlayPlugin WSServer

   Once your `ACT` is started up again, go to `Plugins` > `OverlayPlugin WSServer`, and fill out the following information:

   | Field | Value |
   | --- | --- |
   | **IP Address** | `[::1]` *or* `127.0.0.1` |
   | **Port** | `10501` *or* Any unused port |

   When that is done, hit `Start` and ensure the Status says *Running*.

2. OverlayPlugin.dll
  1. To add the overlay, first we will click on `New`.
  2. Name it `Kyaputen` and make sure it's of type `Mini Parse`.
  3. Add to `URL`: `https://fourcourtjester.github.io/act-overlay-kyaputen/?HOST_PORT=ws://{IP Address}:{Port}/`

     Change the values in curly braces to the values you put into the WSServer, example `https://fourcourtjester.github.io/act-overlay-kyaputen/?HOST_PORT=ws://[::1]:10501/`
  4. Change the `Max. framerate` to 60.

# Inspiration

- DBM, BigWigs, Cactbot, and all the other Boss Mod type overlays out there
- FFXIV CanisMinor ACT <https://github.com/canisminor1990/ffxiv-cmskin/blob/master/en_README.md>
- FFLogs <http://www.fflogs.com>
