console.log('sf2e-anachronism-automation | Init file: batteryRecharge.js');


Hooks.on('init', () => {
    game.settings.register('sf2e-anachronism-automation', 'battery-recharge-button', {
        name: 'Battery Recharge Button',
        hint: 'ON (personal): Shows a button in the inventory to recharge all batteries.',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });
});


Hooks.on("renderCharacterSheetPF2e", (app, html, data) => {
    if (getSetting('battery-recharge-button')) return;

    const el = html instanceof HTMLElement ? html : html[0];
    if (el.querySelector("#my-inventory-btn")) return;

    const currency = el.querySelector(".coinage .currency");
    if (!currency) return;

    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "my-inventory-btn";
    btn.title = "Recharge Batteries";
    btn.innerHTML = `<i class="fa-solid fa-plug-circle-bolt"></i>`;
    btn.setAttribute("data-tooltip", "Recharge Batteries");

    btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const actor = app.actor;
        const batteries = actor.items.filter(i =>
            i.type === "ammo" &&
            i.system.baseItem === "battery"
        );

        if (!batteries.length) {
            ui.notifications.info("No batteries found in inventory! (if you think this is an error please submit a report)");
            return;
        }

        await Promise.all(
            batteries.map(b => b.update({ "system.uses.value": b.system.uses.max }))
        );
    });

    li.appendChild(btn);
    currency.appendChild(li);
});


console.log('sf2e-anachronism-automation | Init successful: batteryRecharge.js');