class Bind {
    constructor(link, node) {
        this.link = link
        this.fn = link.__proto__
        this.node = node
        this.data = link.data
        this.bindings = link.bindings
        this.nodeTraversal(this.node)
    }

    events = ["@click", "@dblclick", "@mouseover", "@mouseleave", "@mouseenter", "@mouseup", "@mousedown", "@mousemove", "@mouseout", "@keydown", "@keyup", "@keypress", "@select", "@change", "@focus", "@submit", "@input", "@copy", "@cut", "@paste", "@drag", "@drop", "@dragover", "@dragend", "@dragstart", "@dragleave", "@dragenter"]

    //在绑定语法时调用，收集包含语法的节点，用于做数据和页面的对接 
    static bindingSet(options, link) {
        link.bindings = link.bindings || []
        let exist = false
        link.bindings.forEach(binding => {
            if (binding.node == options.node && binding.template == options.template) {
                exist = true
            }
        })

        if (!exist) {
            link.bindings.linkpush(options)
        }
    }


    //node遍历
    nodeTraversal(node) {
        let childNodes = node.childNodes
        for (let child of childNodes) {
            if (child.nodeType === 1) {
                if (child.getAttribute('@for')) {
                    this.forBind(child)
                }
                if (child.getAttribute('link')) {
                    this.linkBind(child)
                }
                if (child.getAttribute('@class')) {
                    this.classBind(child)
                }
                if (child.getAttribute('@style')) {
                    this.styleBind(child)
                }
                let eventArr = []
                this.events.forEach(event => {
                    if (child.getAttribute(event)) {
                        eventArr.linkpush(event)
                    }
                })
                if (eventArr.length > 0) {
                    this.eventsBind(child, eventArr)
                }

                if (child.childNodes) { this.nodeTraversal(child) }
            } else if (child.nodeType === 3) {
                this.mustacheBind(child)
            }
        }
    }

    //绑定@for语法
    forBind(node) {
        //获取@for内容
        let attr = node.getAttribute('@for')
        //获取左右侧内容(通过in分割)
        let matches = attr.match(/(.+)in(.+)/)
        let subType = matches[1].match(/\((.+)\)/),
            dataType = matches[2].trim(),
            keyArr = dataType.split('.'),
            index = false
        //判断左侧内容是否包含多个参数
        if (subType) {
            subType = subType[1].split(',')[0].trim()
            index = true
        } else {
            subType = matches[1].trim()
        }
        let data = this.fn.dataGet(this.data, keyArr)
        node.removeAttribute('@for')
        let newNode = node.cloneNode()
        newNode.innerHTML = node.innerHTML
        let thisNode = node
        for (let i = 0; i < data.length - 1; i++) {
            let newNode = thisNode.cloneNode()
            newNode.innerHTML = thisNode.innerHTML
            thisNode.innerHTML = thisNode.innerHTML.replace(`{{${subType}}}`, `{{${dataType}.${i}}}`)
            if (index) {
                thisNode.setAttribute('index', i)
            }
            thisNode.parentNode.insertBefore(newNode, thisNode.nextSibling)
            thisNode = newNode
        }
        thisNode.innerHTML = thisNode.innerHTML.replace(`{{${subType}}}`, `{{${dataType}.${data.length - 1}}}`)
        if (index) {
            thisNode.setAttribute('index', data.length - 1)
        }
        Bind.bindingSet({ node: thisNode, template: dataType, attr: { subType: subType, index: index, length: data.length, nodeTemplate: newNode }, type: "node" }, this.link)
    }

    //绑定mustache语法
    mustacheBind(node) {
        const mustaches = this.link.app.innerText.match(/(\{\{.+?\}\})/g)
        mustaches.forEach(mustache => {
            let data = node.data.replace(/[\r\n]/g, "").trim()
            if (data == "") { return }
            if (data.indexOf(mustache) !== -1 || data.match(mustache) !== null) {
                let dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split('+')
                dataTypes.forEach((dataType, index) => {
                    let typeArr = dataTypes[index].split('.')
                    typeArr.forEach((dataType, index) => {
                        if (dataType.match(/(.*)\[(\d+)\]/)) {
                            let matches = dataType.match(/(.*)\[(\d+)\]/)
                            typeArr.splice(index, 1, matches[1], matches[2])
                        }
                    })
                    typeArr = typeArr.join('.')
                    data = data.replace(dataTypes[index], typeArr)
                })
                Bind.bindingSet({ node: node, template: data, type: 'mustache' }, this.link)
            }
        });
    }

    //绑定link语法
    linkBind(node) {
        let attr = node.getAttribute('@link')
        let dataTypes = attr.split('+')
        let value = null

        if (dataTypes.length === 1) {
            value = this.fn.dataGet(this.data, dataTypes[0].split('.'))
        } else {
            dataTypes.forEach(dataType => {
                if (value === null) {
                    value = this.fn.dataGet(this.link.data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                } else {
                    value += this.fn.dataGet(this.link.data, dataType.split('.')) || (isNaN(Number(dataType)) ? dataType : Number(dataType))
                }
            })
        }
        if (!value) {
            throw new Error(`${attr} is not defined`)
        }
        if (node.tagName === 'INPUT') {
            node.value = value
            node.addEventListener('input', () => {
                let _value = isNaN(Number(node.value)) ? node.value : Number(node.value)
                this.fn.dataSet(this.link.data, attr.split('.'), _value)
            })
        } else {
            node.innerText = value
        }
        Bind.bindingSet({ node: node, template: `{{${attr}}}`, type: 'link' }, this.link)
    }

    //绑定@class语法
    classBind(node) {
        let attr = node.getAttribute('@class')
        let thisClass = node.getAttribute('class')
        Bind.bindingSet({ node: node, template: attr, class: thisClass, type: 'class' }, this.link)
        node.removeAttribute('@class')
    }

    //绑定@style语法
    styleBind(node) {
        let attr = node.getAttribute('@style')
        let template = (node.getAttribute('style') || "") + attr
        Bind.bindingSet({ node: node, template: template, type: 'style' }, this.link)
        node.removeAttribute('@style')
    }

    //绑定events语法
    eventsBind(node, eventArr) {
        let link = this.link
        eventArr.forEach(event => {
            let method = node.getAttribute(event)
            let matches = method.match(/(.+)\((.*)\)/)
            if (matches === null) { return }

            let fn = matches[1]
            let args = matches[2]
            event = event.slice(1)

            if (args.match(/event/)) {
                node.addEventListener(event, function (args) {
                    link[fn](args)
                })
            } else if (args.match(/this/)) {
                node.addEventListener(event, function (args) {
                    link[fn](args.target)
                })
            } else if (args.match(/index/) && node.getAttribute('index')) {
                node.addEventListener(event, function () {
                    let index = node.getAttribute('index')
                    link[fn](index)
                })
            } else {
                node.addEventListener(event, function () {
                    link[fn](args)
                })
            }

            node.removeAttribute(`@${event}`)
        })
    }

}

module.exports = Bind