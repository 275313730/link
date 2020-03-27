function fullPage(el, speed, interval) {
    let top = 0
    let pages = 0
    let scrollingSpeed = speed || 3.0
    let scrollingInterVal = interval || 0
    let scrolling = false
    bindEvents()

    //绑定鼠标滚轮事件
    function bindEvents() {
        document.addEventListener('DOMMouseScroll', () => scrollFunc(event), false);
        let fullPage = document.getElementById(el)
        fullPage.childNodes.forEach(node => {
            if (node.nodeType === 1) {
                pages++
            }
        })
    }

    //执行滚动条滚动事件
    function scrollFunc(e) {
        if (scrolling) return
        let speed
        if (e.detail > 0 && top < document.body.clientHeight * (pages - 1)) {
            speed = scrollingSpeed
        } else if (e.detail < 0 && top >= 0) {
            speed = -scrollingSpeed
        } else {
            return
        }
        scrolling = true
        let moveHeight = 0
        let interval = setInterval(() => {
            moveHeight += speed
            top += speed
            window.scrollTo(0, top);
            if (Math.abs(moveHeight) >= document.body.clientHeight || top >= document.body.clientHeight * (pages - 1) || top <= 0) {
                scrolling = false
                clearInterval(interval)
            }
        }, scrollingInterVal)
    }
}

module.exports = fullPage
