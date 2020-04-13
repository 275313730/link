Link.$store = { X: 0, O: 0 }
new Link({
    el: 'app',
    router: {
        alive: true,
        routes: [{
            path: 'game',
            title: 'Game',
            component: Game
        }, {
            path: 'score',
            title: 'Score',
            component: Score
        }]
    }
})