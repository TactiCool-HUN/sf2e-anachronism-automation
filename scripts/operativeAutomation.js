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
        // Store hits during the turn
        let currentCombatantHits = {};

        Hooks.on("pf2e.startTurn", (_) => {
            currentCombatantHits = {}; // reset each turn
        });

        Hooks.on("createChatMessage", (message) => {
            const combat = game.combat;
            if (!combat?.started) return;

            const currentCombatant = combat.combatant;
            if (!currentCombatant) return;

            // Check the message belongs to the current combatant's token
            if (message.speaker.token !== currentCombatant.tokenId) return;

            // PF2e stores attack roll context in flags
            const context = message.flags?.pf2e?.context;
            if (context?.type !== "attack-roll") return;

            const outcome = context.outcome; // "success" | "criticalSuccess" | "failure" | "criticalFailure"

            if (outcome === "success" || outcome === "criticalSuccess") {
                const target = message.flags.pf2e.context.target.token;
                const hitValue = outcome === "criticalSuccess" ? 2 : 1;
                currentCombatantHits[target] = (currentCombatantHits[target] ?? 0) + hitValue;
            }
        });

        Hooks.on("pf2e.endTurn", async (combatant) => {
            const actor = combatant.actor;
            if (!actor) return;

            const alliance = actor.alliance;

            const scene = combatant.token?.parent ?? game.scenes.active;
            if (!scene) return;

            const allyTokens = scene.tokens.filter(t => {
                if (!t.actor) return false;
                if (t.id === combatant.tokenId) return false;
                return t.actor.alliance === alliance;
            });

            for (const token of allyTokens) {
                const actor = token.actor;
                if (actor.class.name === "Operative") {
                    if (actorHasFeat(actor, "Kill Steal")) {
                        let killStealReady = false;
                        for (const [_, hits] of Object.entries(currentCombatantHits)) {
                            if (hits >= 2) killStealReady = true;
                        }
                        if (killStealReady) {
                            const ownerIds = game.users
                                .filter(u => actor.testUserPermission(u, "OWNER"))
                                .map(u => u.id);

                            ChatMessage.create({
                                content: "You may be able to use your Kill Steal reaction!",
                                whisper: ownerIds,
                            });
                        }
                    }
                }
            }
        });
    }
});


console.log('sf2e-anachronism-automation | Init successful: operativeAutomation.js');