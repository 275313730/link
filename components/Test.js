Link.component({
    name: 'test',
    template: test,
    data() {
        return {
            content: 'Component-test'
        }
    },
    methods: {
        click() {
            this.content = 'keep-Alive'
        }
    }
}) 