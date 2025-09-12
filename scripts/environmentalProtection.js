console.log('sf2e-anachronism-automation | Init file: environmentalProtection.js');

Hooks.on('init', () => {
    game.settings.register('sf2e-anachronism-automation', 'environmental-protection-plus', {
        name: 'Full Environmental Protection',
        hint: 'It\'s a homebrew rule I use where Environmental Protection actually protects from all airborne agents, including smells. (the correct version will be applied the next time protection is turned ON)',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        requiresReload: false
    });

    game.settings.register('sf2e-anachronism-automation', 'check-publication', {
        name: 'Check Armor Publication',
        hint: 'Checks the armor\'s publication. If it doesn\'t have "starfinder" or "sf" in it, it\'ll treat the armor as Exposed for the case of Environmental Protection.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    })
});

Hooks.on("deleteItem", async (item, options, userId) => {
    if (item.system.slug !== "environmental-protection-on") {
        return;
    }

    await item.parent.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", item.remainingDuration.remaining);
});

console.log('sf2e-anachronism-automation | Init successful: environmentalProtection.js');