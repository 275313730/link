new Link({
    el: "app",
    data: {
        text: 'Hello World!',
    },
    methods: {
        test(e) {
            Animate.move(e, 0, 200, 3000, 16, () => {

                console.log(e.style.top)
            })
        },
    }
})

