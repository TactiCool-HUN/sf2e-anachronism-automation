# Origins
As I started running an ME: Andromeda inspired Starfinder 2e campaign I found some things are missing that I could easily automate, so I made a little collection for it.

# What does it do?
**Mystic**
- Mystic automatically recharges the proper amount of vitality network points in encounter mode at the start of their turn.
- Adds a macro for the Transfer Vitality action.

**Environmental Protection**
- Players can toggle their environmental protection on/off using a macro, there is also a macro to reset the duration.
  - Note! This is technically not coded RAI, as it is counting protection timer in about 6 second accuracy, while technically if you turn on environmental protection you expend at minimum 1 full day of charge from it.
  - Also, this does not (yet) handle armor change, when you change your armor please use the reset macro to reset the duration you have.
- Automatically detect Exposed armors
  - Including the rule that all Pathfinder armor are Exposed (technically all non-starfinder armor is marked as Exposed, this can be turned off).
  - Also detects if an armor has a subitem that includes "environmental protection" in its name.
- Optional rule to make environmental protection actually fully airtight (just adds immunity to olfactory tbh, but this is how I run it so the option is there).

**Envoy: Get 'Em!**
- A macro that automatically applies the effect of Get 'Em! to all allied token on the scene.
- - Dedication is handled correctly.
- - Initial strike is now automatic, no longer needed to click a button to activate/deactivate it!

# Settings
## Mystic Network Recharge
[GM] Toggles whether mystic recharges their vitality network points on the start of their encounter turns automatically.

## Full Environmental Protection
[GM] Toggles a homerule that makes environmental protection grant immunity to olfactory (smell-based things).

## Check Publication
[GM] If turned on, the module decides whether an armor has environmental protection available partially based on whether it is a Starfinder publication or not.

# Contribution
If you have suggestions for settings or features please let me know by opening an issue with the suggestion tag!

# You can support me on Ko-Fi!
Not at all required, but I'm always happy to have a bit more spending money, uni life is though >.<

https://ko-fi.com/tacticool

# Install
The module can be found on Foundry's built-in module search, or installed directly through this manifest URL: https://github.com/TactiCool-HUN/sf2e-anachronism-automation/releases/latest/download/module.json
