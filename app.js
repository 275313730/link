const home = {
    el: "home",
    template: 'home',
    data: {
        text: [1, 2],
    },
    mounted() {
        this.text[0] = 3
    },
    methods: {
        test(node) {
            Animate.transfrom({
                node: node,
                time: 2000,
                top: 200,
                opacity: 0
            }, () => {
                node.style.display = 'none'
            })
        },
    }
}

const foo = {
    el: "foo",
    template: 'foo',
    data: {
        text: [1, 2],
    },
    mounted() {
        this.test()
    },
    updated() {
        console.log(new Date().toLocaleDateString())
    },
    beforeDestroy() {
        console.log('ready to leave foo')
    },
    destroyed() {
        console.log('leave')
    },
    methods: {
        test() {
            this.text.push(this.text.length + 1)
        },
    }
}

new Router({
    el: 'app',
    routes: [{
        path: 'home',
        component: home,
    }, {
        path: 'foo',
        component: foo,
    }]
})
