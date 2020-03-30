new Link({
    el: "app",
    data: {
        text: 'Hello World!',
    },
    methods: {
        test(e) {
            Animate.move({
                node: e,
                left: 0,
                top: 100,
                position: 'absolute',
                time: 2000,
                interval: 16
            }, () => {
                console.log(e.style.top)
            })
        },
    }
})

