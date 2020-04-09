Link.component({
    name: 'test',
    template: 'test',
    data() {
        return {
            test: 'test'
        }
    },
    methods: {
        click() {
            this.test = 'keep-Alive'
        }
    }
}) 