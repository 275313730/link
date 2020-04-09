Link.component({
    name: 'test',
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