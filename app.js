Link.$store = { X: 0, O: 0 }

new Link({
    el: 'app',
    router: {
        alive: true,
        routes: [{
            path: 'game',
            component: game
        }, {
            path: 'score',
            component: score
        }]
    }
})