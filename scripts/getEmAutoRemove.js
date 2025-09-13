console.log('sf2e-anachronism-automation | Init file: getEmAutoRemove.js');

Hooks.on("createChatMessage", async (message) => {
    const ctx = message.flags?.pf2e?.context;
    if (!ctx) return;

    if (ctx.type !== "damage-roll") return;
    if (!ctx.options?.includes("action:strike")) return;

    const actor = game.actors.get(message.speaker.actor);
    if (!actor) return;

    const effect = actor.items.find(
        (i) => i.type === "effect" && i.slug === "get-em-lead-by-example"
    );
    if (!effect) return;

    await effect.delete();
});

console.log('sf2e-anachronism-automation | Init successful: getEmAutoRemove.js');