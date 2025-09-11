console.log('sf2e-anachronism-automation | Init file: environmental-protection.js');

Hooks.on('init', () => {
    game.settings.register('sf2e-anachronism-automation', 'environmental-protection', {
        name: 'Environmental Protection Tracker',
        hint: '',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
});

console.log('sf2e-anachronism-automation | Init successful: environmental-protection.js');