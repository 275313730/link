const home = {
    el: "home",
    data: {
        text: [1, 2],
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
    data: {
        text: [1, 2],
    },
    methods: {
        test() {
            this.text.push(3)
        },
    }
}

new Router({
    el: 'app',
    mode: 'history',
    routes: [{
        path: 'home',
        component: home,
        template: `<div id='home'>
                <div class="text red bgColor" @click="test(this)">{{text}}</div>
        </div>`
    }, {
        path: 'foo',
        component: foo,
        template: `<div id='foo'>
                <div class="text red bgColor" @for="number in text" @click="test()">{{number}}</div>
            </div>`
    }]
})
