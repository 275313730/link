const game = {
    el: "game",
    data() {
        return {
            arr: [],
            isX: true,
            winner: null,
            jugdeArr: [[1, 4, 7], [2, 5, 8], [3, 6, 9], [1, 2, 3], [4, 5, 6], [7, 8, 9], [1, 5, 9], [3, 5, 7]]
        }
    },
    mounted() {
        for (let i = 0; i < 9; i++) {
            this.arr.push('')
        }
    },
    methods: {
        print(index) {
            if (this.winner) {
                alert(`${this.winner} is win!`)
                return
            }
            if (this.arr[index] === '') {
                this.arr[index] = this.isX ? 'X' : 'O'
                this.isX = !this.isX
                this.cal()
            }
        },
        cal() {
            for (const indexArr of this.jugdeArr) {
                let val1 = this.arr[indexArr[0] - 1],
                    val2 = this.arr[indexArr[1] - 1],
                    val3 = this.arr[indexArr[2] - 1]
                if (val1 !== '' && val1 === val2 && val2 === val3) {
                    this.winner = val1
                    app.data.history.push(`${this.winner} is win!`)
                    alert(`${this.winner} is win!`)
                    return
                }
            }
        },
        reset() {
            this.winner = null
            this.isX = true
            for (const key in this.arr) {
                this.arr[key] = ''
            }
        }
    }
}

const history = {
    el: "history",
    data() {
        return {
            text: [],
        }
    },
    mounted() {
        app.data.history.forEach(value => {
            this.text.push(value)
        });
    }
}

const router = {
    routes: [{
        path: 'game',
        component: game,
    }, {
        path: 'history',
        component: history,
    }]
}

const app = new Link({
    el: 'app',
    data() {
        return {
            str: 'Tic-Tac-Toe',
            history: []
        }
    },
    router
})


