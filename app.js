const history = {
    el: "history",
    data() {
        return {
            history: []
        }
    },
    mounted() {
        this.history = this.parent.history
    },
    methods: {
        jump(index) {
            if (Number(index) === this.history.length - 1) {
                return
            }
            this.parent.arr = Object.assign([], this.history[index])
            index = Number(index) + 1
            this.parent.history.splice(index, this.history.length - index)
            if (index % 2 === 1) {
                this.parent.isX = false
            } else {
                this.parent.isX = true
            }
            this.parent.winner = null
        }
    }
}

const game = {
    el: "game",
    components: [history],
    data() {
        return {
            arr: ['', '', '', '', '', '', '', '', ''],
            isX: true,
            winner: null,
            jugdeArr: [[1, 4, 7], [2, 5, 8], [3, 6, 9], [1, 2, 3], [4, 5, 6], [7, 8, 9], [1, 5, 9], [3, 5, 7]],
            history: []
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
                this.history.push(Object.assign([], this.arr))
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
                    app.data.score[this.winner]++
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
            this.history.splice(0, this.history.length)
        }
    }
}

const score = {
    el: "score",
    data() {
        return {
            X: 0,
            O: 0
        }
    },
    mounted() {
        this.X = app.data.score.X
        this.O = app.data.score.O
    }
}

const router = {
    routes: [{
        path: 'game',
        component: game,
    }, {
        path: 'score',
        component: score,
    }]
}

const app = new Link({
    el: 'app',
    data() {
        return {
            str: 'Tic-Tac-Toe',
            score: { X: 0, O: 0 }
        }
    },
    router
})


