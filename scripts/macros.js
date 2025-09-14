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
    if (armor.system.subitems.size > 0) {
        for (let subitem of armor.system.subitems) {
            if (subitem.name.toLowerCase().includes("environmental protection")) {
                return true;
            }
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


async function resetSingleEnvironmentalProtection(armor, actor) {
    if (armor.type !== "armor") {
        actor = armor;
        armor = actor.items.filter(i =>
            i.type === "armor" && i.system.equipped.inSlot
        )[0];
    }

    let duration = 0;
    if (armorHasProtection(armor)) {
        duration = Math.max(1, armor.system.level.value) * 24 * 60 * 60;
    }

    if (game.settings.get('sf2e-anachronism-automation', 'duration-per-armor')) {
        await armor.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", duration);
    } else {
        await actor.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", duration);
    }
}


async function resetEnvironmentalProtection() {
    const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
    if (!actor) return void ui.notifications.warn("No character assigned and no token selected.");
    const existingEffectOn = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-on");
    const existingEffectOff = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-off");

    if (game.settings.get('sf2e-anachronism-automation', 'duration-per-armor')) {
        const armorList = actor.items.filter(i =>
            i.type === "armor"
        );
        if (armorList.length === 0) return void ui.notifications.warn("Character has no armor!");

        for (let armor of armorList) {
            await resetSingleEnvironmentalProtection(armor);
        }

        if (existingEffectOn.length === 1) {
            let effect = existingEffectOn[0];

            // edit the on effect
        } else if (existingEffectOff.length === 1) {
            let effect = existingEffectOff[0];
            //edit the off effect
        }
    } else {
        const armorList = actor.items.filter(i =>
            i.type === "armor" && i.system.equipped.inSlot
        );
        if (armorList.length === 0) return void ui.notifications.warn("Character has no armor equipped!");

        await resetSingleEnvironmentalProtection(armorList[0], actor);
    }
}

async function getRemainingTime(flagWearer) {
    let remaining = flagWearer.getFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
    if (remaining === undefined) {
        await resetSingleEnvironmentalProtection(flagWearer);
        remaining = flagWearer.getFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
    }
    return remaining
}

function readableTime(seconds) {
    const days = Math.floor(seconds / (24 * 3600));
    seconds %= 24 * 3600;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(" ");
}


async function toggleEnvironmentalProtection() {
    const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
    if (!actor) return void ui.notifications.warn("No character assigned and no token selected.");

    const isPerArmor = game.settings.get('sf2e-anachronism-automation', 'duration-per-armor')

    const existingEffectOn = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-on");
    const existingEffectOff = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-off");

    let armorWorn = actor.items.filter(i =>
        i.type === "armor" && i.system.equipped.inSlot
    );
    if (armorWorn.length === 0) return void ui.notifications.warn("Character has no worn armor!");
    armorWorn = armorWorn[0];

    let armorList;

    if (isPerArmor) {
        armorList = actor.items.filter(i =>
            i.type === "armor" && !i.system.equipped.inSlot
        );
    }

    let duration;
    let image;
    let state;
    let description;
    let rules = [];

    if (existingEffectOn.length !== 0) { // on -> off
        let remainingDuration;
        for (let effect of existingEffectOn) {
            remainingDuration = effect.remainingDuration.remaining;
            await effect.delete();
        }

        if (isPerArmor) {
            description = "You are not under Environmental Protection.<br>Worn armor's (@UUID[" + armorWorn.sourceId + "]) remaining duration: " + readableTime(remainingDuration);
            if (armorList.length !== 0) {
                description += "<br>Your other armors are:";
                for (let armor of armorList) {
                    description += "<br>- @UUID[" + armor.sourceId + "]: " + readableTime(await getRemainingTime(armor));
                }
            }
        } else {
            description = "You are not under Environmental Protection.<br>It has " + readableTime(await getRemainingTime(actor)) + " duration remaining.<br><br>Last triggered from: @UUID[" + armorWorn.sourceId + "]";
        }

        state = "OFF";
        image = armorWorn.img;
        duration = {
            unit: "unlimited"
        }
    } else { // off -> on
        let remaining;
        if (isPerArmor) {
            description = "Your armor's (@UUID[" + armorWorn.sourceId + "]) Environmental Protection is currently working.";
            if (armorList.length !== 0) {
                description += "<br>Your other armors are:";
                for (let armor of armorList) {
                    description += "<br>- @UUID[" + armor.sourceId + "]: " + readableTime(await getRemainingTime(armor));
                }
            }
            remaining = await getRemainingTime(armorWorn);
        } else {
            description = "Your armor's Environmental Protection is currently working.<br><br>Triggered from: @UUID[" + armorWorn.sourceId + "]";
            remaining = await getRemainingTime(actor);
        }

        if (remaining === 0) return void ui.notifications.warn("Your armor has run out of duration for its Environmental Protection OR it is Exposed.");

        state = "ON";
        image = armorWorn.img;
        duration = {
            unit: "rounds",
            value: Math.floor(remaining / 6)
        }
        if (game.settings.get('sf2e-anachronism-automation', 'environmental-protection-plus')) {
            rules.push({
                key: "Immunity",
                type: "olfactory"
            });
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