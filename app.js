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

new Link({
    el: 'app',
    data() {
        return {
            str: 'Tic-Tac-Toe'
        }
    },
    router
})