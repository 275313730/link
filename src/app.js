const link = require('../modules/link.js')

new link({
    el: "app",
    data: {
        text: {
            page1: [1, 2, 3],
            page2: "b",
            page3: "c",
            page4: "d"
        },
        isRed: true
    },
    computed: {
        name() {
            return this.data.text.page2 + 'a'
        }
    },
    methods: {
        change(index) {
            this.data.text.page1[index] = Math.round(Math.random() * 10)
        },
        isBg() {
            return 'bgColor'
        },
        test() {
            this.data.text.page2 = "c"
            console.log(this.data.text.page2)
        }
    }
})

