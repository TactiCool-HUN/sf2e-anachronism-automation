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
        const actor = item.parent
        let armorWorn = getWornArmor(actor)
        if (armorWorn.length === 0) return void ui.notifications.warn("Unexpected Error: no equipped armor detected! Remaining time could not be recorded. Remaining time: " + Math.max(0, item.remainingDuration.remaining));

        await armorWorn.setFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining", Math.max(0, item.remainingDuration.remaining));
        await applyEnvironmentalProtection("off", actor);
    } else if (item.type === "armor") {
        // armor deleted
    }
});

/*
Hooks.on("updateItem", async (item, update) => {
    if (item.type === "armor") {
        if (item.system.equipped?.inSlot === true && update.system.equipped?.inSlot === false) {
            console.log("unequip?")
        } else if (item.system.equipped?.inSlot === false && update.system.equipped?.inSlot === true) {
            console.log("equip?")
        }
    }
    console.log(item); // pre
    console.log(update); // change
});
*/

// | | | | | FUNCTIONS | | | | |


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
    if (remaining === undefined) {
        remaining = getActor().getFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
        if (remaining === undefined) {
            await resetSingleEnvironmentalProtection(armor);
            remaining = armor.getFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
        } else {
            console.log("sf2e-anachronism-automation | Legacy flag found, unsetting it.")
            getActor().unsetFlag("sf2e-anachronism-automation", "environmentalProtectionRemaining");
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


async function applyEnvironmentalProtection(state, actor) {
    let image;
    let duration;
    let description;
    const rules = [];

    let armorList = getArmorList(actor);
    let armorWorn = getWornArmor(actor);

    if (state === true || state.toLowerCase() === "on") {
        let remaining;
        description = "Worn armor:<br>- @UUID[" + armorWorn.uuid + "]: Active!";
        if (armorList.length !== 0) {
            description += "<br>Your non-equipped armor charges are:";
            for (let armor of armorList) {
                description += "<br>- @UUID[" + armor.uuid + "]: " + readableTime(await getRemainingTime(armor));
            }
        }
        remaining = await getRemainingTime(armorWorn);

        if (remaining === 0) return void ui.notifications.warn("Your armor has run out of duration for its Environmental Protection OR it is Exposed.");

        state = "ON";
        image = "modules/sf2e-anachronism/art/icons/abilities/blue-event-horizon.webp";
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
    } else if (state === false || state.toLowerCase() === "off") {
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

        state = "OFF";
        image = "modules/sf2e-anachronism-automation/artwork/environmental_protection_off.png";
        duration = {
            unit: "unlimited"
        }
    } else {
        console.log("sf2e-anachronism-automation | wrong state given to applyEnvironmentalProtection");
        return;
    }

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
}


console.log('sf2e-anachronism-automation | Init successful: environmentalProtection.js');