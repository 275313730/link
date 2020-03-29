class Animate {
    static move(node, x, y, time, interval, callback) {
        interval = interval < 10 ? 10 : interval
        let count = 0
        let _x = x / (time / interval)
        let _y = y / (time / interval)
        let left = node.style.left.replace('px', '')
        if (left !== "") {
            left = Number(left)
        } else {
            left = 0
        }
        let top = node.style.top.replace('px', '')
        if (top !== "") {
            top = Number(top)
        } else {
            top = 0
        }
        let timer = setInterval(() => {
            count++
            node.style.left = left + (_x * count) + 'px'
            node.style.top = top + (_y * count) + 'px'
            if (interval * count >= time) {
                clearInterval(timer)
                if (callback) {
                    callback()
                }
            }
        }, interval)
    }
}
