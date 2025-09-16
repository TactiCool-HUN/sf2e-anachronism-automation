console.log('sf2e-anachronism-automation | Init file: utils.js');

function getActor(id) {
    let actor;
    if (!id) {
        actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
        if (!actor) return void ui.notifications.warn("No character assigned and no token selected.");
    } else {
        actor = game.actors.get(id);
        if (!actor) return void console.log("sf2e-anachronism-automation | getActor() did not find id given.)");
    }
    return actor;
}


function getSetting(settingName) {
    if (!settingName) {
        console.log("sf2e-anachronism-automation | no settingName given to getSetting()");
        return;
    }
    return game.settings.get('sf2e-anachronism-automation', settingName);
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

    const full = parts.join(" ");
    if (full === "0s") {
        return "no charge"
    } else {
        return full;
    }
}


function getWornArmor(actor) {
    let armorWorn = actor.items.filter(i =>
        i.type === "armor" && i.system.equipped.inSlot
    );
    if (armorWorn.length === 0) return void ui.notifications.warn("Character has no worn armor!");
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

console.log('sf2e-anachronism-automation | Init successful: utils.js');