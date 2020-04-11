Link.component({
    template: 'test',
    data() {
        return {
            test: 'Component-test'
        }
    },
    methods: {
        click() {
            this.test = 'keep-Alive'
        }
    }
}) 