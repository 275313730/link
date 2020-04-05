"use strict";
class Router {
    constructor(options) {
        this.root = document.getElementById(options.el)
        this.routes = options.routes
        this.data = null
        this.link = null
        this.node = null
        this.init()
        this.pushHistory(this.routes[0].path)
    }
    init() {
        this.routes.forEach(route => {
            let template = document.getElementsByName(route.component.el)[0]
            route.template = template.innerHTML
            template.parentNode.removeChild(template)
        })
        window.addEventListener('popstate', () => this.pushHistory(window.location.hash.slice(1)));
        let links = this.root.getElementsByTagName('router-link');
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
        if (!this.link) {
            let view = this.root.getElementsByTagName('router-view')[0];
            view.outerHTML = window.history.state;
        }
        else {
            this.node.outerHTML = window.history.state;
        }
        if (this.link) { this.link.destroy() }
        this.link = null
        this.link = new Link(this.data.component)
        this.root.childNodes.forEach(child => {
            if (child.nodeType === 1 && child.getAttribute('Id') === this.data.path) {
                this.node = child
            }
        })
    }
}
