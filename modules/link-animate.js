class Animate {
    static move(options, callback) {
        if (Animate.moving) { return }
        Animate.moving = true
        let node = options.node,
            translateX = options.left,
            translateY = options.top,
            position = options.position,
            time = options.time,
            interval = options.interval
        if (interval == null || interval == undefined) {
            interval = Animate.defaultInterval
        }
        if (interval < 16 && interval > 0) {
            interval = 16
        }
        let left = node.offsetLeft,
            top = node.offsetTop
        if (position == 'absolute') {
            translateX -= left
            translateY -= top
        }
        if (interval === 0) {
            setTimeout(() => {
                node.style.left = left + translateX + 'px'
                node.style.top = top + translateY + 'px'
                if (callback) {
                    callback()
                }
                Animate.moving = false
            }, time);
        } else {
            let count = 0,
                perX = translateX / (time / interval),
                perY = translateY / (time / interval)
            let timer = setInterval(() => {
                if (interval * count >= time) {
                    clearInterval(timer)
                    if (callback) {
                        callback()
                    }
                    Animate.moving = false
                    return
                }
                count++
                node.style.left = left + (perX * count) + 'px'
                node.style.top = top + (perY * count) + 'px'
            }, interval)
        }
    }
}

Animate.defaultInterval = 16
Animate.moving = false