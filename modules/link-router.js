"use strict";
class Router {
    constructor(options) {
        this.el = options.el;
        this.mode = options.mode;
        this.routes = options.routes;
        this.absolutePath = window.location.pathname;
        this.data = null
        this.link = null
        this.node = null;
        this.bindEvents();
        this.pushHistory('home');
    }
    bindEvents() {
        window.addEventListener('popstate', () => { this.pushHistory(window.location.hash); });
        let links = document.getElementsByTagName('router-link');
        links.forEach(link => {
            link.addEventListener('click', () => this.pushHistory(links[i].getAttribute('to')));
        })
    }
    pushHistory(path) {
        if (this.isInitialize && `#${path}` === window.history.state.path) {
            return;
        }
        this.routes.forEach(route => {
            if (route.path === path) {
                this.data = route
                window.history.replaceState(route.template, route.path, `#${route.path}`);
            }
        });
        this.update();
    }
    update() {
        if (!this.link) {
            let view = document.getElementsByTagName('router-view')[0];
            view.outerHTML = window.history.state;
        }
        else {
            this.node.outerHTML = window.history.state;
        }
        this.link = new Link(this.data.component)
        let nodes = document.getElementsByTagName('div');
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === this.data.path) {
                this.node = nodes[i];
                break;
            }
        }
    }
}
