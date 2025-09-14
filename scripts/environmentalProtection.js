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
    });

    game.settings.register('sf2e-anachronism-automation', 'duration-per-armor', {
        name: 'Environmental Protection per Armor',
        hint: 'The environmental protection will be tracked per armor piece instead of on the player character, this adds more realism but might introduce nuisance.<br>Warning! It won\'t remember how much was left on the character/armor when you toggle this option.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });
});

Hooks.on("deleteItem", async (item, options, userId) => {
    if (item.system.slug !== "environmental-protection-on") {
        return;
    }

    const actor = item.parent

    if (game.settings.get('sf2e-anachronism-automation', 'duration-per-armor')) {
        let armorWorn = actor.items.filter(i =>
            i.type === "armor" && i.system.equipped.inSlot
        );
        if (armorWorn.length === 0) return void ui.notifications.warn("Unexpected Error: no equipped armor detected! Remaining time could not be recorded. Remaining time: " + item.remainingDuration.remaining);

        await armorWorn[0].setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", item.remainingDuration.remaining);
    } else {
        await actor.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", item.remainingDuration.remaining);
    }
});

console.log('sf2e-anachronism-automation | Init successful: environmentalProtection.js');