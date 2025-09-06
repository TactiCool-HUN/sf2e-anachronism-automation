export const transferVitality = async () => {
    if (!actor) return void ui.notifications.warn("No character assigned and no token selected.");
    if (!actor.system.resources.vitalityNetwork) return void ui.notifications.warn("Character has no Vitality Network.");
    if (actor.system.resources.vitalityNetwork.value === 0) return void ui.notifications.warn("Your Vitality Network is empty.")

    const current_network = actor.system.resources.vitalityNetwork.value;
    const level = actor.system.details.level.value;

    let max_heal = -1;
    if (level < 5) max_heal = 10;
    else if (level < 10) max_heal = 20;
    else if (level < 15) max_heal = 30;
    else if (level < 20) max_heal = 40;
    max_heal = Math.min(current_network, max_heal);

    const healing_field = new foundry.data.fields.NumberField({
        max: max_heal,
        min: 1,
        integer: true,
        label: "Healing",
        hint: `Possible heal: 1 - ${max_heal}\nVitaliy Network: ${current_network}`,
    })

    const response = await foundry.applications.api.DialogV2.input({
        window: {
            title: "Vitality Network Healing",
            icon: "fa-solid fa-notes-medical"
        },
        content: healing_field.toFormGroup({},{name: "healing", value: current_network}).outerHTML
    })
    if (!response) return;

    console.log(response.healing);
    await actor.updateResource('vitalityNetwork', current_network - response.healing);

    const DamageRoll = CONFIG.Dice.rolls.find(r => r.name === "DamageRoll");
    const roll = await (new DamageRoll(response.healing + "[healing]")).evaluate();
    await roll.toMessage({
        speaker: {actor}
    });
};