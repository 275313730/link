const router = {
    alive: true,
    routes: [{
        path: 'game',
        component: game
    }, {
        path: 'score',
        component: score
    }]
}

Link.$store = { X: 0, O: 0 }

new Link({
    el: 'app',
    data() {
        return {
            str: 'Tic-Tac-Toe'
        }
    },
    router
})