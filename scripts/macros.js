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
            return true;
        }
    }

    if (armor.system.traits.value.includes("exposed")) {
        return false;
    }

    if (game.settings.get('sf2e-anachronism-automation', 'check-publication')) {
        const publication = armor.system.publication.title.toLowerCase();
        if (!publication.includes("starfinder") && !publication.includes("sf")) {
            return false;
        }
    }

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

    const is_main_class = actor.class.name === "Envoy";
    const has_really_get_em = actor.itemTypes.feat.some(f => f.slug === "really-get-em");
    let is_lead_by_example;
    let lead_by_description = "You have not been <i>Lead by Example</i>, how shameful...";

    if (is_main_class || has_really_get_em) {
        is_lead_by_example = await foundry.applications.api.DialogV2.confirm({
            window: {title: "Effect: Get 'Em!"},
            content: "Lead By Example?",
            rejectClose: false,
            modal: true
        });
        if (is_lead_by_example === null) return;
    } else {
        is_lead_by_example = false;
    }

    const actorAlliance = actor.system.details.alliance;

    const ally_tokens = canvas.tokens.placeables.filter(t => {
        const alliance = t.actor.system.details.alliance;
        return alliance === actorAlliance;
    });

    const rules = [
        {
            key: "TokenMark",
            slug: "get-em",
            uuid: target_uuid,
        },
        {
            key: "FlatModifier",
            selector: "attack-roll",
            value: 1,
            type: "status",
            predicate: [
                "target:mark:get-em"
            ],
            slug: "get-em"
        }
    ];

    if (is_lead_by_example && is_main_class) {
        lead_by_description = "<br><br><b>Lead by Example</b> The origin gains a status bonus to their initial Strike against the marked target equal to their Charisma modifier. You gain a status bonus to damage on subsequent Strikes made against the enemy until the start of your next turn.";
        rules.push(
            {
                key: "FlatModifier",
                selector: "strike-damage",
                value: "1+floor(@item.origin.level / 5)",
                predicate: [
                    "target:mark:get-em"
                ],
                type: "status",
                slug: "get-em-lead-by-example",
                hideIfDisabled: true
            }
        )

        await actor.createEmbeddedDocuments("Item", [{
            name: "Get 'Em! Lead By Example!",
            type: "effect",
            img: "modules/sf2e-anachronism/art/icons/abilities/orange-finger-beam.webp",
            system: {
                tokenIcon: {
                    show: false
                },
                duration: {
                    unit: "rounds",
                    value: 1,
                    expiry: "turn-start"
                },
                slug: "get-em-lead-by-example",
                description: {
                    value: "Granted by @UUID[Compendium.sf2e-anachronism.actions.Item.cmCtfURzpbzkxWsy]{Get 'Em!}<br><br>Adds the charisma modifier to the initial roll."
                },
                rules: [
                    {
                        key: "FlatModifier",
                        selector: [
                            "strike-damage"
                        ],
                        type: "status",
                        value: "@actor.abilities.cha.mod"
                    }
                ]
            }
        }]);
    } else if (is_lead_by_example && has_really_get_em) {
        lead_by_description = "<br><br><b>Lead by Example</b> You gain a +2 status bonus on damage rolls of Strikes made against the enemy until the start of your next turn.";
        rules.push(
            {
                key: "FlatModifier",
                selector: "strike-damage",
                value: "2",
                predicate: [
                    "target:mark:get-em"
                ],
                type: "status",
                slug: "get-em-lead-by-example",
                hideIfDisabled: true
            }
        )
    }

    const effectGetEm = {
        name: "Get 'Em!",
        type: "effect",
        img: "modules/sf2e-anachronism/art/icons/abilities/orange-finger-beam.webp",
        system: {
            context: {
                origin: {
                    actor: "Actor." + actor.id
                }
            },
            tokenIcon: {
                show: true
            },
            duration: {
                unit: "rounds",
                value: 1,
                expiry: "turn-start"
            },
            slug: "get-em",
            description: {
                value: "Granted by @UUID[Compendium.sf2e-anachronism.actions.Item.cmCtfURzpbzkxWsy]{Get 'Em!}<br><br>You gain a +1 status bonus to attacks against the marked target." + lead_by_description
            },
            rules: rules
        }
    };

    for (token of ally_tokens) {
        await token.actor.createEmbeddedDocuments("Item", [effectGetEm]);
    }
}


console.log('sf2e-anachronism-automation | Init successful: macros.js');