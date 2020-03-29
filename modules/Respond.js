const Bind = require('../modules/Bind.js')

class Respond {
    //通知分发
    static notify(link, key) {
        link.bindings.forEach(binding => {
            if (binding.template.match(key)) {
                if (binding.type == 'link' || binding.type == 'mustache') {
                    this.viewDataChange(link, binding)
                } else if (binding.type == 'class') {
                    this.viewClassChange(link, binding)
                } else if (binding.type == 'style') {
                    this.viewStyleChange(link, binding)
                } else if (binding.type == 'node') {
                    this.viewNodeChange(link, binding)
                }
            }
        })
    }

    //改变页面节点
    static viewNodeChange(link, e) {
        let value = link.__proto__.dataGet(link.data, e.template.split('.'))
        while (value.length > e.attr.length) {
            let newNode = e.attr.nodeTemplate.cloneNode()
            newNode.innerHTML = e.attr.nodeTemplate.innerHTML
            e.node.parentNode.insertBefore(newNode, e.node.nextSibling)
            e.node = newNode
            e.node.innerHTML = e.node.innerHTML.replace(`{{${e.attr.subType}}}`, `{{${e.template}.${e.attr.length}}}`)
            if (e.attr.index) {
                e.node.setAttribute('index', e.attr.length)
            }
            e.attr.length++
            for (let i = 0; i < link.bindings.length; i++) {
                const binding = link.bindings[i];
                if (binding.type == "node") {
                    link.bindings.splice(i, 1)
                    i--
                }
            }
            new Bind(link, e.node.parentNode)
            Bind.bindingSet(e, link)
        }
        while (value.length < e.attr.length) {
            for (let i = 0; i < link.bindings.length; i++) {
                const binding = link.bindings[i];
                if (binding.node == e.node) {
                    link.bindings.splice(i, 1)
                    i--
                }
            }
            let prevNode = e.node.previousSibling
            let thisNode = e.node
            thisNode.parentNode.removeChild(thisNode)
            e.node = prevNode
            e.attr.length--
            Bind.bindingSet(e, link)
        }
    }

    //改变页面数据
    static viewDataChange(link, e) {
        let mustaches = e.template.match(/\{\{(.+?)\}\}/g)
        let text = e.template

        mustaches.forEach(mustache => {
            let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+')
            let value = link.__proto__.dataTypesGet(link, dataTypes)
            if (mustache === value) { return }
            text = text.replace(mustache, value)
        })

        if (e.node.nodeType === 3) {
            e.node.data = text
        } else if (e.node.nodeType === 1) {
            if (e.node.nodeName === 'INPUT') {
                e.node.value = text
            } else {
                e.node.innerText = text
            }
        }
    }

    //改变页面class
    static viewClassChange(link, e) {
        let node = e.node
        let classArr = e.template.split(',')
        let className = e.class

        classArr.forEach(cs => {
            let boolean = false
            let thisClassName = ""

            //判断是否为对象表达式
            let matches = cs.split(':')
            if (matches.length === 1) {
                //判断是否为函数
                let fn = cs.match(/(.*)\(.*\)/)
                if (fn) {
                    thisClassName = link[fn[1]](fn[2])
                } else {
                    thisClassName = link.__proto__.dataGet(link.data, cs.split('.'))
                }
                if (thisClassName) {
                    boolean = true
                }
            } else {
                thisClassName = matches[0].trim()
                let dataType = matches[1].trim()
                let fn = dataType.match(/(.*)\(.*\)/)
                if (fn) {
                    boolean = link[fn[1]](fn[2])
                } else {
                    boolean = link.__proto__.dataGet(link.data, dataType.split('.'))
                }
            }

            //修改className
            if (boolean) {
                className += ` ${thisClassName}`
            }

        })
        node.className = className
    }

    //改变页面style
    static viewStyleChange(link, e) {
        let node = e.node
        let styleArr = e.template.split(';')
        
        styleArr.forEach(style => {
            if (style == null || style == undefined || style == "") { return }

            let matches = style.split(':')
            let styleName = matches[0].trim()
            let dataType = matches[1]

            if (dataType.match(/\(.*\)/) != null) {
                let method = dataType.match(/(.*)\(.*\)/)
                node.style[styleName] = link[method[1]](method[2])
            } else {
                node.style[styleName] = link.__proto__.dataGet(link.data, dataType.split('.'))
            }
        })
    }
}

module.exports = Respond