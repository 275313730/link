"use strict";
class Router {
    constructor(options) {
        this.root = document.getElementById(options.el)
        this.node = this.root.getElementsByTagName('router-view')[0]
        this.routes = options.routes
        this.link = null
        this.alive = options.alive || false
        this.aliveData = []
        this.init()
    }

    init() {
        this.bindEvents()
        this.getTemplate()
        this.alive && this.setAliveData()
        this.pushHistory(this.routes[0].path)
    }

    //监听路由事件
    bindEvents() {
        //监听地址栏输入事件
        window.addEventListener('popstate', () => this.pushHistory(window.location.hash.slice(1)));
        //监听元素点击事件
        const links = this.root.getElementsByTagName('router-link');
        for (const link of links) {
            link.addEventListener('click', () => this.pushHistory(link.getAttribute('to')));
        }
    }

    //载入模板
    getTemplate() {
        this.routes.forEach(route => {
            route.template = document.getElementById(route.component.el).innerHTML
        })
    }

    //设置aliveData初始数据
    setAliveData() {
        this.routes.forEach(route => {
            this.aliveData.push({ name: route.component.el, $data: {} })
        })
    }

    //地址跳转
    pushHistory(path) {
        if (this.link && path == this.link.el) {
            return
        }
        if (this.link != null && this.alive === true) {
            this.aliveData.forEach(data => {
                if (data.name === this.link.el) {
                    this.keepAlive(data, this.link)
                }
            })
        }
        for (const route of this.routes) {
            if (route.path === path) {
                window.history.replaceState(route.template, route.path, `#${route.path}`);
                this.replaceHTML(route.template)
                this.setLink(route.component, path)
                document.title = route.title || route.path
                return
            }
        }
    }

    //替换页面内容
    replaceHTML(template) {
        let prev = this.node.previousSibling
        this.node.outerHTML = template
        this.node = prev.nextElementSibling
    }

    //设置Link
    setLink(component, path) {
        if (this.link != null && this.alive === false) { this.link.destroy() }
        if (component.alive === true) {
            for (const data of this.aliveData) {
                let newCpn = Object.assign({}, component)
                newCpn.node = this.node
                //用JSON.parse和JSON.stringify来进行深度遍历，防止router里的数据被污染
                newCpn.aliveData = JSON.parse(JSON.stringify(data))
                if (data.name === path) {
                    this.link = new Link(newCpn)
                    return
                }
            }
        }
        this.link = new Link(Object.assign(component, { node: this.node }))
        if (this.alive) {
            component.alive = true
        }
    }

    //保持组件数据
    keepAlive(data, link) {
        this.dataCopy(data.$data, link.$data)
        if (link.$data.$children) {
            data.$children = []
            link.$data.$children.forEach((child, index) => {
                data.$children.push({ name: link.name, $data: {} })
                this.keepAlive(data.$children[index], child)
            });
        }
    }

    dataCopy(targetData, currData) {
        for (const key in currData) {
            if (key === '$parent' || key === '$children' || currData[key] instanceof Function) {
                continue
            }
            targetData[key] = currData[key]
            if (typeof (currData[key]) === 'object') {
                this.dataCopy(targetData[key], currData[key])
            }
        }
    }
}
