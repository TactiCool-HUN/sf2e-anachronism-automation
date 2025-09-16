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

    game.settings.register('sf2e-anachronism-automation', 'visible-protection-icon', {
        name: 'Visible Protection Icon',
        hint: 'Makes Environmental Protection icon visible on the token (it\'ll still apply an effect visible on the top right / sheet).',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    })
});


// | | | | | HOOKS | | | | |


Hooks.on("deleteItem", async (item, options, userId) => {
    if (item.system.slug === "environmental-protection-on") {
        const armorWorn = getWornArmor(item.parent);
        if (armorWorn) {
            await armorWorn.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", Math.max(0, item.remainingDuration.remaining));
        }

        await setProtectionState(item.parent, false);
    } else if (item.type === "armor") {
        if (await getProtectionState(item.parent)) {
            await item.parent.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-on")[0].delete();
        } else {
            await updateProtectionDisplay(item.parent.uuid);
        }
    }
});


Hooks.on("updateItem", async (item, update) => {
    if (item.type === "armor") {
        if (update.system?.equipped?.inSlot === true) {
            await updateProtectionDisplay(item.parent.uuid);
        } else if (update.system?.equipped?.inSlot === false) {
            if (await getProtectionState(item.parent)) {
                const effect = item.parent.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-on")[0];
                await item.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", Math.max(0, effect.remainingDuration.remaining));
                await effect.delete();
            } else {
                await updateProtectionDisplay(item.parent.uuid);
            }
        } else if (update.system?.subitems) {
            await resetSingleEnvironmentalProtection(item);
            if (await getRemainingTime(item) === 0) {
                let effect = item.parent.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-on");
                if (effect.length > 0) {
                    await effect[0].delete();
                } else {
                    await setProtectionState(item.parent, false);
                }
            } else {
                await updateProtectionDisplay(item.parent.uuid);
            }
        }
    }
});


Hooks.on("createItem", async (item, options, userId) => {
    if (item.type === "armor") {
        await updateProtectionDisplay(item.parent.uuid);
    }
});


// | | | | | FUNCTIONS | | | | |


function getWornArmor(actor) {
    let armorWorn = actor.items.filter(i =>
        i.type === "armor" && i.system.equipped.inSlot
    );
    return armorWorn[0];
}

function getArmorList(actor, excludeWorn = true) {
    if (excludeWorn) {
        return actor.items.filter(i =>
            i.type === "armor" && !i.system.equipped.inSlot
        );
    } else {
        return actor.items.filter(i =>
            i.type === "armor"
        );
    }
}


function armorHasProtection(armor) {
    if (armor.system.subitems.length > 0) {
        for (let subitem of armor.system.subitems) {
            if (subitem.name.toLowerCase().includes("environmental protection")) {
                return true;
            }
        }
    }

    if (armor.system.traits.value.includes("exposed")) {
        return false;
    }

    if (getSetting('check-publication')) {
        const publication = armor.system.publication.title.toLowerCase();
        if (!publication.includes("starfinder") && !publication.includes("sf")) {
            return false;
        }
    }

    return true;
}


async function getRemainingTime(armor) {
    let remaining = armor.getFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
    const actor = armor.parent
    if (remaining === undefined) {
        remaining = actor.getFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
        if (remaining === undefined) {
            await resetSingleEnvironmentalProtection(armor);
            remaining = armor.getFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
        } else {
            console.log("sf2e-anachronism-automation | Legacy flag found, unsetting it.")
            actor.unsetFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
        }
    }
    return remaining;
}


async function resetSingleEnvironmentalProtection(armor) {
    let duration = 0;
    if (armorHasProtection(armor)) {
        duration = Math.max(1, armor.system.level.value) * 24 * 60 * 60;
    }
    await armor.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", duration);
}


async function getProtectionState(actor) {
    let status = await actor.getFlag("sf2e-anachronism-automation", "environmentalProtectionStatus");
    if (status === null) {
        await setProtectionState(actor, false);
        status = false;
    }
    return status;
}


async function setProtectionState(actor, setTo) {
    if (setTo && await getRemainingTime(getWornArmor(actor)) === 0) {
        ui.notifications.warn("Armor has no charge!");
    } else {
        await actor.setFlag("sf2e-anachronism-automation", "environmentalProtectionStatus", setTo);
        for (let armor of getArmorList(actor, true)) {
            if (!armorHasProtection(armor)) {
                await resetSingleEnvironmentalProtection(armor);
            }
        }
        await updateProtectionDisplay(actor.uuid);
    }
}


async function updateProtectionDisplay(actorUuid) {
    let actor = await fromUuid(actorUuid);
    if (!actor) return void console.log('sf2e-anachronism-automation | actor not found from UUID');

    for (let armor of getArmorList(actor, false)) {
        if (!armorHasProtection(armor)) {
            await resetSingleEnvironmentalProtection(armor);
        }
    }
    actor = await fromUuid(actor.uuid);

    const existingEffectOn = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-on");
    const existingEffectOff = actor.items.filter(i => i.type === "effect" && i.slug === "environmental-protection-off");
    let existingEffect;

    let state;
    let image;
    let duration;
    let description = "";
    let rules = [];

    const armorList = getArmorList(actor);
    const armorWorn = getWornArmor(actor);

    if (await getProtectionState(actor)) {
        if (armorWorn.length === 0) return void ui.notifications.warn("Character has no worn armor!");
        state = "ON";

        for (let effect of existingEffectOff) {
            effect.delete();
        }

        if (existingEffectOn.length !== 0) {
            existingEffect = existingEffectOn[0];
        }

        description = "Worn armor:<br>- @UUID[" + armorWorn.uuid + "]: Active!";
        if (armorList.length !== 0) {
            description += "<br>Your non-equipped armor charges are:";
            for (let armor of armorList) {
                description += "<br>- @UUID[" + armor.uuid + "]: " + readableTime(await getRemainingTime(armor));
            }
        }

        image = "modules/sf2e-anachronism/art/icons/abilities/blue-event-horizon.webp";

        let remaining = await getRemainingTime(armorWorn);
        if (remaining === 0) return void ui.notifications.warn("Your armor has run out of duration for its Environmental Protection OR it is Exposed.");
        duration = {
            unit: "rounds",
            value: Math.floor(remaining / 6)
        }

        if (getSetting('environmental-protection-plus')) {
            rules.push({
                key: "Immunity",
                type: "olfactory"
            });
        }
    } else {
        state = "OFF";

        for (let effect of existingEffectOn) {
            effect.delete();
        }

        if (existingEffectOff.length !== 0) {
            existingEffect = existingEffectOff[0];
        }

        if (armorWorn) {
            description = "Worn armor:<br>- @UUID[" + armorWorn.uuid + "]: " + readableTime(await getRemainingTime(armorWorn));
        }
        if (armorWorn && armorList.length !== 0) {
            description += "<br>";
        }
        if (armorList.length !== 0) {
            description += "Your non-equipped armor charges are:";
            for (let armor of armorList) {
                description += "<br>- @UUID[" + armor.uuid + "]: " + readableTime(await getRemainingTime(armor));
            }
        }

        image = "modules/sf2e-anachronism-automation/artwork/environmental_protection_off.png";
        duration = {
            unit: "unlimited"
        }
    }

    if (description === "") {
        description = "No armor in inventory.";
    }

    if (existingEffect === undefined) {
        const environmental_protection_effect = {
            name: "Environmental Protection " + state,
            type: "effect",
            img: image,
            system: {
                tokenIcon: {
                    show: getSetting("visible-protection-icon")
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
    } else {
        existingEffect.update({
            name: "Environmental Protection " + state,
            type: "effect",
            img: image,
            system: {
                tokenIcon: {
                    show: getSetting("visible-protection-icon")
                },
                duration: duration,
                slug: "environmental-protection-" + state.toLowerCase(),
                description: {
                    value: description
                },
                rules: rules
            }
        })
    }
}


console.log('sf2e-anachronism-automation | Init successful: environmentalProtection.js');