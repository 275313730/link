const game = {
    el: 'game',
    data() {
        return {
            arr: [],
            isX: true,
            caling: false,
            winner: null,
            jugdeArr: [[1, 4, 7], [2, 5, 8], [3, 6, 9], [1, 2, 3], [4, 5, 6], [7, 8, 9], [1, 5, 9], [3, 5, 7]],
            history: []
        }
    },
    mounted() {
        this.init()
    },
    methods: {
        init() {
            for (let i = 0; i < 9; i++) {
                this.arr[i] = ''
            }
        },
        print(index) {
            if (this.caling) { return }
            if (this.winner) {
                return alert(`${this.winner} is win!`)
            }
            if (this.arr[index] === '') {
                this.arr[index] = this.isX ? 'X' : 'O'
                this.isX = !this.isX
                this.history.push(Object.assign([], this.arr))
                this.cal()
            }
        },
        cal() {
            this.caling = true
            for (const indexArr of this.jugdeArr) {
                let val1 = this.arr[indexArr[0] - 1],
                    val2 = this.arr[indexArr[1] - 1],
                    val3 = this.arr[indexArr[2] - 1]
                if (val1 !== '' && val1 === val2 && val2 === val3) {
                    this.winner = val1
                    Link.$store[this.winner]++
                    alert(`${this.winner} is win!`)
                    break
                }
            }
            this.caling = false
        },
        reset() {
            this.winner = null
            this.isX = true
            for (const key in this.arr) {
                this.arr[key] = ''
            }
            this.history.splice(0, this.history.length)
        },
        undo() {
            if (this.history.length === 0) {
                return
            }
            this.history.pop()
            if (this.history.length > 0) {
                this.arr = Object.assign([], this.history[this.history.length - 1])
                this.isX = !this.isX
            } else {
                this.init()
                this.isX = true
            }
            this.winner = null
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
    updated() {
        this.X = Link.$store.X
        this.O = Link.$store.O
    }
}
