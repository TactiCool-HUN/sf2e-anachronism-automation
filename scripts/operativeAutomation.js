console.log('sf2e-anachronism-automation | Init file: operativeAutomation.js');

Hooks.on('init', () => {
    game.settings.register('sf2e-anachronism-automation', 'operative-kill-steal-reminder', {
        name: 'Operative Kill Steal Reminder',
        hint: 'ON (personal): If you are the owner of an Operative PC who has the Kill Steal feat, when someone passes turn you get a reminder IF Kill Steal can proc.',
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    });
});

Hooks.on("ready", () => {
    if (getSetting('operative-kill-steal-reminder')) {
        Hooks.on("pf2e.endTurn", async (combatant) => {
            // CODE!
        });
    }
});


console.log('sf2e-anachronism-automation | Init successful: operativeAutomation.js');