"use strict";
class Animate {
    static transfrom(options, callback) {
        if (Animate.queue.indexOf(options.node) > -1) { return }
        Animate.queue.push(options.node)
        options.interval = this.prototype.intervalSet(options.interval)
        let status = this.prototype.executeAnimate(options)
        let timer = setInterval(() => {
            let isDone = true
            for (const key in status) {
                if (status[key] !== true) {
                    isDone = false
                    return
                }
            }
            if (isDone) {
                clearInterval(timer)
                Animate.queue.splice(Animate.queue.indexOf(options.node), 1)
                if (callback) {
                    callback()
                }
            }
        })
    }

    intervalSet(interval) {
        interval = typeof (interval) === 'number' ? interval : Animate.defaultInterval
        if (interval < 16 && interval > 0) {
            interval = 16
        } else if (interval < 0) {
            interval = 0
        }
        return interval
    }

    executeAnimate(options) {
        let status = {}
        if (options.hasOwnProperty('left') || options.hasOwnProperty('top')) {
            status.move = false
            this.move(options, () => {
                status.move = true
            })
        }
        if (options.hasOwnProperty('opacity')) {
            status.opacity = false
            this.opacityTransform(options, () => {
                status.opacity = true
            })
        }
        return status
    }

    move(options, callback) {
        let node = options.node,
            position = options.position,
            translateX = options.left,
            translateY = options.top,
            left = Number(node.style.left.replace('px', '')) || 0,
            top = Number(node.style.top.replace('px', '')) || 0,
            time = options.time,
            interval = options.interval,
            times = time / interval
        if (position == 'absolute') {
            translateX -= left
            translateY -= top
        }
        if (interval === 0) {
            setTimeout(() => {
                node.style.left = left + translateX + 'px'
                node.style.top = top + translateY + 'px'
                callback()
            }, time);
        } else {
            let count = 0,
                perX = translateX / times,
                perY = translateY / times
            let timer = setInterval(() => {
                if (interval * count >= time) {
                    clearInterval(timer)
                    callback()
                    return
                }
                count++
                node.style.left = left + (perX * count) + 'px'
                node.style.top = top + (perY * count) + 'px'
            }, interval)
        }
    }

    opacityTransform(options, callback) {
        let node = options.node,
            opacity = options.opacity,
            thisOpacity = node.style.opacity || 1,
            time = options.time,
            interval = options.interval,
            times = time / interval,
            count = 0,
            perO = (thisOpacity - opacity) / times
        let timer = setInterval(() => {
            if (interval * count >= time) {
                clearInterval(timer)
                callback()
                return
            }
            count++
            node.style.opacity = thisOpacity - (perO * count)
        }, interval)

    }
}

Animate.defaultInterval = 16
Animate.queue = []