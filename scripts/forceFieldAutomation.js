console.log('sf2e-anachronism-automation | Init file: forceFieldAutomation.js');

Hooks.on('init', () => {
    game.settings.register('sf2e-anachronism-automation', 'force-field-hp', {
        name: 'Force Field Damage Trigger',
        hint: 'While turned on the original "Effect: Force Field" effect\'s badge value will be used as a shield value that comes before HP and temp HP.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
    game.settings.register('sf2e-anachronism-automation', 'force-field-regen', {
        name: 'Force Field Auto Regen',
        hint: 'While turned on Force Field will attempt to recognize what type of force field got applied and regenerates itself at the start of turn accordingly. (Will probably break as soon as official stuff gets changed.)',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
    game.settings.register('sf2e-anachronism-automation', 'force-field-critical', {
        name: 'Force Field Critical Hit Reminder',
        hint: 'While turned on when you get hit by a critical hit you get a reminder to roll the flat check to negate it.',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
});


Hooks.on('ready', () => {
    if (getSetting('force-field-critical')) {
        Hooks.on('createChatMessage', async (message) => {
            const systemId = game.system.id;
            let flags;
            if (systemId === "pf2e") {
                flags = message.flags?.pf2e;
            } else {
                flags = message.flags?.sf2e;
            }

            console.log(flags);
            if (flags?.context?.type !== 'attack-roll') return;
            if (flags?.context?.outcome !== 'criticalSuccess') return;

            const targetUUID = flags.context?.target?.token;
            if (!targetUUID) return;

            const tokenDoc = await fromUuid(targetUUID);
            const regen = tokenDoc?.actor?.getFlag('sf2e-anachronism-automation', 'force-field-regen');

            if (!regen) return;
            let dc;
            if (regen === 0) {
                return;
            } else if (regen === 2) {
                return;
            } else if (regen === 3) {
                dc = 20
            } else if (regen === 4) {
                dc = 19
            } else if (regen === 5) {
                dc = 18
            } else if (regen === 6) {
                dc = 17
            } else if (regen === 7) {
                dc = 16
            } else if (regen === 8) {
                dc = 15
            }

            const ownerIds = game.users
                .filter(u => tokenDoc.testUserPermission(u, 'OWNER'))
                .map(u => u.id);

            ChatMessage.create({
                content: 'Your Force Field might negate the crit! Flat check: @Check[flat|dc:' + dc + ']',
                whisper: ownerIds,
            });
        });
    }
    if (getSetting('force-field-hp')) {
        Hooks.on('preUpdateActor', (actor, changes, options, userId) => {
            const newHpValue = changes?.system?.attributes?.hp?.value;
            if (newHpValue === undefined) return;

            const currentHp = actor.system.attributes.hp.value;
            const rawDamage = currentHp - newHpValue;
            if (rawDamage <= 0) return;

            const effect = actor.items.find(
                (item) => item.type === 'effect' && item.slug === 'effect-force-field'
            );
            if (!effect) return;

            const badgeValue = effect.system.badge?.value ?? 0;
            const myDamage = Math.max(rawDamage - badgeValue, 0);

            changes.system.attributes.hp.value = currentHp - myDamage;
            effect.update({ "system.badge.value": badgeValue - rawDamage });
        });
    }
    if (getSetting('force-field-regen')) {
        Hooks.on('pf2e.startTurn', async (combatant) => {
            console.log('startturn');
            const actor = combatant.actor;

            const effect = actor.items.find(
                (item) => item.type === 'effect' && item.slug === 'effect-force-field'
            );
            if (!effect) return;

            const regen = actor.getFlag('sf2e-anachronism-automation', 'force-field-regen');
            let badgeValue = effect.system.badge?.value ?? 0;

            if (!regen) return;
            if (regen === 0) {
                return;
            } else if (regen === 2) {
                badgeValue = Math.min(badgeValue + regen, 6);
            } else if (regen === 3) {
                badgeValue = Math.min(badgeValue + regen, 14);
            } else if (regen === 4) {
                badgeValue = Math.min(badgeValue + regen, 20);
            } else if (regen === 5) {
                badgeValue = Math.min(badgeValue + regen, 26);
            } else if (regen === 6) {
                badgeValue = Math.min(badgeValue + regen, 32);
            } else if (regen === 7) {
                badgeValue = Math.min(badgeValue + regen, 37);
            } else if (regen === 8) {
                badgeValue = Math.min(badgeValue + regen, 42);
            }

            effect.update({ "system.badge.value": badgeValue });
        });
        Hooks.on('createItem', async (item, options, userId) => {
            console.log('create');
            if (item.type === 'effect' && item.slug === 'effect-force-field') {
                const badgeValue = item.system.badge?.value ?? 0;
                console.log('force');

                if (badgeValue === 6) {
                    item.parent.setFlag('sf2e-anachronism-automation', 'force-field-regen', 2);
                } else if (badgeValue === 14) {
                    item.parent.setFlag('sf2e-anachronism-automation', 'force-field-regen', 3);
                } else if (badgeValue === 20) {
                    item.parent.setFlag('sf2e-anachronism-automation', 'force-field-regen', 4);
                } else if (badgeValue === 26) {
                    item.parent.setFlag('sf2e-anachronism-automation', 'force-field-regen', 5);
                } else if (badgeValue === 32) {
                    item.parent.setFlag('sf2e-anachronism-automation', 'force-field-regen', 6);
                } else if (badgeValue === 37) {
                    item.parent.setFlag('sf2e-anachronism-automation', 'force-field-regen', 7);
                } else if (badgeValue === 42) {
                    item.parent.setFlag('sf2e-anachronism-automation', 'force-field-regen', 8);
                }
            }
        });
        Hooks.on('deleteItem', async (item, options, userId) => {
            if (item.type === 'effect' && item.slug === 'effect-force-field') {
                item.parent.setFlag('sf2e-anachronism-automation', 'force-field-regen', 0);
            }
        });
    }
});


console.log('sf2e-anachronism-automation | Init successful: forceFieldAutomation.js');