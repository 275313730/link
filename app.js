const router = {
    routes: [{
        path: 'game',
        component: game,
    }, {
        path: 'score',
        component: score,
    }]
}

new Link({
    el: 'app',
    components: { game },
    data() {
        return {
            str: 'Tic-Tac-Toe'
        }
    },
})