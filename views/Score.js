const Score = {
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
