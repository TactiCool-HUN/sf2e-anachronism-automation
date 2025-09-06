console.log('sf2e-anachronism-automation | Init begin');

Hooks.on('init', () => {
    game.settings.register('sf2e-anachronism-automation', 'mystic-network-recharge', {
        name: 'Mystic Network Recharge',
        hint: 'ON: Mystic automatically recharges hit points into their Vitality Network at the start of their turns.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
});

Hooks.on("ready", () => {
    if (game.settings.get('sf2e-anachronism-automation', 'mystic-network-recharge')) {
        Hooks.on("pf2e.startTurn", async (combatant) => {
            const actor = combatant.actor;
            if (actor.class?.name === 'Mystic') {
                const current_network = actor.system.resources.vitalityNetwork.value;
                const max_network = actor.system.resources.vitalityNetwork.max;
                const spell_prof = actor.system.proficiencies.spellcasting.rank;
                let recharge;
                if (spell_prof < 3) {
                    recharge = 4;
                } else if (spell_prof < 5) {
                    recharge = 6;
                } else {
                    recharge = 8;
                }
                await actor.updateResource('vitalityNetwork', Math.min(current_network + recharge, max_network));
            }
        });
    }
});