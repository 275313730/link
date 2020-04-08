"use strict";
class Router {
    constructor(options) {
        this.root = document.getElementById(options.el)
        this.routes = options.routes
        this.link = null
        this.node = null
        this.alive = options.alive || false
        this.init()
    }

    init() {
        this.getTemplate()
        this.bindEvents()
        this.pushHistory(this.routes[0].path)
    }

    //获取template并移除节点
    getTemplate() {
        this.routes.forEach(route => {
            const template = document.getElementById(route.component.el)
            route.template = template.innerHTML
            template.parentNode.removeChild(template)
        })
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

    //地址跳转
    pushHistory(path) {
        this.routes.forEach(route => {
            this.keepAlive(route)
        });
        this.routes.forEach(route => {
            if (route.path === path) {
                window.history.replaceState(route.template, route.path, `#${route.path}`);
                this.linkChange(route.component)
            }
        });
    }

    //保持组件数据
    keepAlive(route) {
        if (this.link != null && this.alive === true && route.path === this.link.el) {
            let data = JSON.parse(JSON.stringify(this.link.$data))
            route.component.data = function () {
                return data
            }
            route.component.alive = true
            if (this.link.$children) {
                this.componentsAlive(this.link.$children, route.component.components)
            }
        }
    }

    //保持子组件数据
    componentsAlive(children, components) {
        children.forEach((child, index) => {
            let data = JSON.parse(JSON.stringify(child.$data))
            components[index].data = function () {
                return data
            }
            components[index].alive = true
            if (child.$children) {
                this.componentsAlive(child.$children, components[index].components)
            }
        })
    }

    //跳转时改变link实例和页面内容
    linkChange(component) {
        if (this.link == null) {
            this.node = this.root.getElementsByTagName('router-view')[0]
        }
        let prev = this.node.previousSibling
        this.node.outerHTML = window.history.state;
        this.node = prev.nextElementSibling
        if (this.node.getAttribute('Id') === null) {
            this.node.setAttribute('Id', component.el)
        }
        if (this.link != null && this.alive === false) { this.link.destroy() }
        this.link = new Link(component)
    }
}
