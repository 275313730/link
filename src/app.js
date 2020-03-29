const Link = require('../modules/Link.js')

new Link({
    el: "app",
    data: {
        text: {
            number: [1, 2, 3],
        },
        isRed: true,
        isBg: true
    },
    methods: {
        test(index) {
            let number = this.data.text.number[index]
            this.data.text.number.push(number)
            if (this.data.text.number.length > 5) {
                this.data.isBg = false
            } else {
                this.data.isBg = true
            }
        },
        pop() {
            this.data.text.number.pop()
            if (this.data.text.number.length > 5) {
                this.data.isBg = false
            } else {
                this.data.isBg = true
            }
        }
    }
})

