console.log('sf2e-anachronism-automation | Init file: macros.js');

Hooks.once("ready", () => {
    const mod = game.modules.get("sf2e-anachronism-automation");
    if (mod) {
        mod.macros = mod.macros || {};
        mod.macros.transferVitality = transferVitality;
        mod.macros.toggleEnvironmentalProtection = toggleEnvironmentalProtection;
        mod.macros.resetEnvironmentalProtection = resetEnvironmentalProtection;
        mod.macros.getEm = getEm;
    }
});


function armorHasProtection(armor) {
    for (let subitem of armor.system.subitems) {
        if (subitem.name.toLowerCase().includes("environmental protection")) {
            console.log("prot: subitem (on)");
            return true;
        }
    }

    if (armor.system.traits.value.includes("exposed")) {
        console.log("prot: exposed (off)");
        return false;
    }

    if (game.settings.get('sf2e-anachronism-automation', 'check-publication')) {
        const publication = armor.system.publication.title.toLowerCase();
        console.log(publication);
        if (!publication.includes("starfinder") && !publication.includes("sf")) {
            console.log("prot: old (off)");
            return false;
        }
    }

    console.log("prot: default (on)")
    return true;
}


async function resetEnvironmentalProtection() {
    let actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
    if (!actor) return void ui.notifications.warn("No character assigned and no token selected.");

    const armorList = actor.items.filter(i =>
        i.type === "armor" && i.system.equipped.inSlot
    );

    if (armorList.length === 0) return void ui.notifications.warn("Character has no armor equipped!");

    if (armorHasProtection(armorList[0])) {
        const armor_level = Math.max(1, armorList[0].system.level.value);
        await actor.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", armor_level * 24 * 60 * 60);
    } else {
        await actor.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", 0);
    }
}


async function toggleEnvironmentalProtection() {
    let actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
    if (!actor) return void ui.notifications.warn("No character assigned and no token selected.");

    const armorList = actor.items.filter(i =>
        i.type === "armor" && i.system.equipped.inSlot
    );

    if (armorList.length === 0) return void ui.notifications.warn("Character has no armor!");

    const armor = armorList[0];

    const existingEffectOn = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-on");
    const existingEffectOff = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-off");

    let remaining = actor.getFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
    if (remaining === undefined) {
        await resetEnvironmentalProtection();
        remaining = actor.getFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
    }

    let duration;
    let image;
    let state;
    let description;
    let rules;

    if (existingEffectOn.length !== 0) {
        for (let effect of existingEffectOn) {
            await effect.delete();
        }

        let remaining_readable;

        if (remaining >= 60 * 60 * 24 * 7 * 2) { // more than one week
            remaining_readable = Math.floor(remaining / 60 / 60 / 24 / 7) + " weeks remaining.";
        } else if (remaining >= 60 * 60 * 24 * 2) { // more than one day
            remaining_readable = Math.floor(remaining / 60 / 60 / 24) + " days remaining.";
        } else if (remaining >= 60 * 60 * 2) { // more than one hour
            remaining_readable = Math.floor(remaining / 60 / 60) + " hours remaining.";
        } else if (remaining >= 60 * 2) { // more than one minute
            remaining_readable = Math.floor(remaining / 60) + " minutes remaining.";
        } else {
            remaining_readable = remaining + " seconds remaining.";
        }

        state = "OFF";
        image = armor.img;
        description = "Your armor's Environmental Protection is OFF.<br>It has " + remaining_readable + "<br><br>Sourced from: @UUID[" + armor.sourceId + "]";
        duration = {
            unit: "unlimited"
        }
        rules = [];
    } else {
        if (remaining === 0) return void ui.notifications.warn("Your armor has ran out of duration for it's Environmental Protection OR it is Exposed.");

        state = "ON";
        image = armor.img;
        description = "Your armor's Environmental Protection is currently working.<br><br>Sourced from: @UUID[" + armor.sourceId + "]";
        duration = {
            unit: "rounds",
            value: Math.floor(remaining / 6)
        }
        if (game.settings.get('sf2e-anachronism-automation', 'environmental-protection-plus')) {
            rules = [
                {
                    key: "Immunity",
                    type: "olfactory"
                }
            ];
        } else {
            rules = [];
        }

        if (existingEffectOff) {
            for (let effect of existingEffectOff) {
                await effect.delete();
            }
        }
    }

    const environmental_protection_effect = {
        name: "Environmental Protection " + state,
        type: "effect",
        img: image,
        system: {
            tokenIcon: {
                show: true
            },
            duration: duration,
            start: {
                value: game.time.worldTime
            },
            slug: "environmental-protection-" + state.toLowerCase(),
            description: {
                value: description
            },
            rules: rules
        }
    };

    await actor.createEmbeddedDocuments("Item", [environmental_protection_effect]);
}


async function transferVitality() {
    const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
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
}


async function getEm() {
    const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
    if (!actor) return ui.notifications.warn("You have no set actor, select the actor using the ability.");
    const targets = game.user.targets;
    if (targets.size === 0) return ui.notifications.warn("No target selected!");
    if (targets.size > 1) return ui.notifications.warn("Only select one target!");
    const target_uuid = targets.values().next().value.document.uuid;


    const response = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Effect: Get 'Em!" },
        content: "Lead By Example?",
        rejectClose: false,
        modal: true
    });
    if (response === null) return;

    const actorAlliance = actor.system.details.alliance;

    const ally_tokens = canvas.tokens.placeables.filter(t => {
        const alliance = t.actor.system.details.alliance;
        return alliance === actorAlliance;
    });

    const effectGetEm = await fromUuid("Compendium.sf2e-anachronism.feat-effects.Item.ey2zSEnprAGgvrij");
    effectGetEm.system.rules[0] = {
        key: "TokenMark",
        slug: "get-em",
        uuid: target_uuid,
    }
    effectGetEm.origin = actor;
    if (response) {
        effectGetEm.system.rules[1] = {
            "adjustName": false,
            "choices": [
                {
                    "label": "PF2E.UI.RuleElements.ChoiceSet.YesLabel",
                    "value": "lead-by-example",
                    "predicate": [
                        {
                            "or": [
                                {
                                    "not": "parent:origin:item"
                                },
                                "parent:origin:item:tag:envoy-class",
                                "parent:origin:item:tag:really-get-em"
                            ]
                        }
                    ]
                },
                {
                    "label": "PF2E.UI.RuleElements.ChoiceSet.NoLabel",
                    "value": "not-lead-by-example"
                }
            ],
            "rollOption": "get-em",
            "key": "ChoiceSet",
            "flag": "effectGetEm",
            "selection": "lead-by-example"
        }
    } else {
        effectGetEm.system.rules[1] = {
            "adjustName": false,
            "choices": [
            {
                "label": "PF2E.UI.RuleElements.ChoiceSet.YesLabel",
                "value": "lead-by-example",
                "predicate": [
                    {
                        "or": [
                            {
                                "not": "parent:origin:item"
                            },
                            "parent:origin:item:tag:envoy-class",
                            "parent:origin:item:tag:really-get-em"
                        ]
                    }
                ]
            },
            {
                "label": "PF2E.UI.RuleElements.ChoiceSet.NoLabel",
                "value": "not-lead-by-example"
            }
        ],
            "rollOption": "get-em",
            "key": "ChoiceSet",
            "flag": "effectGetEm",
            "selection": "not-lead-by-example"
        }
    }

    for (token of ally_tokens) {
        await token.actor.createEmbeddedDocuments("Item", [effectGetEm]);
    }
}


console.log('sf2e-anachronism-automation | Init successful: macros.js');