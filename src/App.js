new Link({
    el: 'app',
    router: {
        alive: true,
        routes: [
            {
                path: 'home',
                component: Home
            },
            {
                path: 'img',
                component: Img
            }]
    }
})