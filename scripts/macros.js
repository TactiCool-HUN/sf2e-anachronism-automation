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


async function resetEnvironmentalProtection() {
    const actor = getActor();
    const armorList = getArmorList(actor, false);

    for (let armor of armorList) {
        await resetSingleEnvironmentalProtection(armor);
    }

    if (await getProtectionState(actor)) {
        const effect = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-on")[0];
        await effect.update({
            system: {
                start: {
                    value: game.time.worldTime
                }
            }
        });
    }

    await updateProtectionDisplay(actor.uuid);
}


async function toggleEnvironmentalProtection() {
    const actor = getActor();
    const state = await getProtectionState(actor);

    if (state === true) {
        if (getWornArmor(actor)) {
            let effect = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-on");
            if (effect.length > 0) {
                await effect[0].delete();
            } else {
                await setProtectionState(actor, false);
            }
        } else {
            ui.notifications.warn("No equipped armor!");
        }
    } else {
        if (getWornArmor(actor)) {
            await setProtectionState(actor, true);
        } else {
            ui.notifications.warn("No equipped armor!");
        }
    }
}


async function transferVitality() {
    const actor = getActor();
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
    const actor = getActor();
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