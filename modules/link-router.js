"use strict";
class Router {
    constructor(options) {
        this.root = document.getElementById(options.el)
        this.routes = Object.create(options.routes)
        this.data = null
        this.link = null
        this.node = null
        this.init()
    }

    init() {
        this.getTemplate()
        this.bindEvents()
        this.pushHistory(this.routes[0].path)
    }

    getTemplate() {
        this.routes.forEach(route => {
            const template = document.getElementById(route.component.el)
            route.template = template.innerHTML
            template.parentNode.removeChild(template)
        })
    }

    bindEvents() {
        window.addEventListener('popstate', () => this.pushHistory(window.location.hash.slice(1)));
        const links = this.root.getElementsByTagName('router-link');
        for (const link of links) {
            link.addEventListener('click', () => this.pushHistory(link.getAttribute('to')));
        }
    }

    pushHistory(path) {
        this.routes.forEach(route => {
            if (route.path === path) {
                this.data = route
                window.history.replaceState(route.template, route.path, `#${route.path}`);
            }
        });
        if (this.link == null) {
            let view = this.root.getElementsByTagName('router-view')[0];
            view.outerHTML = window.history.state;
        }
        else {
            this.node.outerHTML = window.history.state;
        }
        if (this.link != null) { this.link.destroy() }
        this.link = new Link(this.data.component)
        this.root.childNodes.forEach(child => {
            if (child.nodeType === 1 && child.getAttribute('Id') === this.data.path) {
                this.node = child
            }
        })
    }
}
