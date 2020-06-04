(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() :
        typeof define === "function" && define.amd ? define(factory) :
            (global = global || self, global.Link = factory());
}(this, function () {
    "use strict";

    /**
     * 数组方法改写
     */
    var arrayProto = Array.prototype;
    var arrayMethods = Object.create(arrayProto);
    var methodsList = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"];

    methodsList.forEach(method => {
        var original = arrayMethods[method];
        Array.prototype[method] = function (...args) {
            // 用数组原方法处理
            var result = original.apply(this, args);

            // 重新响应化数据
            if (this.__ob__ && (method === "push" || method === "unshift" || method === "splice")) {
                this.__ob__.dataTravel(this, this.__ob__.keyString);
            }

            // 判读是否$data中的数据
            this.__ob__ && this.__ob__.notify(this.__ob__.keyString);

            // 返回值
            return result;
        }
    })

    /**
     * Link Module
     */
    function Link(options) {
        checkOptions(options);
        setBasic.call(this, options);
        setLifeCycle.call(this, options);
        setRouter.call(this, options);
        init.call(this);
    }

    // 检查传入参数
    function checkOptions(options) {
        if (options.el == null) {
            if (options.template == null) {
                throw new Error(`Property "el" or "template" is not defined`);
            }
        } else if (document.getElementById(options.el) == null) {
            throw new Error(`Can not find element "${options.el}"`);
        }
    }

    // 设置基础数据
    function setBasic(options) {
        // 基础参数
        this.el = options.el || null;
        this.node = options.node || document.getElementById(options.el);
        this.template = options.template || null;

        // 数据
        this.data = options.data || null;
        this.methods = Object.freeze(options.methods) || null;

        this.views = []

        // 父组件
        this.$parent = options.parent || null;
    }

    // 生命周期函数
    function setLifeCycle(options) {
        this.mounted = Object.freeze(options.mounted) || null;
        this.updated = Object.freeze(options.updated) || null;
        this.beforeDestroy = Object.freeze(options.beforeDestroy) || null;
        this.destroyed = Object.freeze(options.destroyed) || null;
    }

    // 路由
    function setRouter(options) {
        this.router = options.router || null;
        this.alive = options.alive || false;
        this.aliveData = options.aliveData || null;
    }

    // 初始化
    function init() {
        // 如果存在aliveData，则将替换data
        this.aliveData && dataReplace.call(this);

        // 初始化$data
        this.$data = this.data ? this.data() : {};

        // 获取父组件传入的props
        this.$parent && propsGet.call(this);

        // 给父组件设置ref
        this.$parent && refsSet.call(this);

        // 遍历$data并定义get和set
        dataTravel.call(this, this.$data);

        // 将methods中的函数加入$data
        this.methods && methodsExpose.call(this);

        // 判断alive来决定是否执行mounted函数
        !this.alive && this.mounted && this.mounted.call(this.$data);

        // 替换组件标签为模板内容
        this.template && replaceCpnHTML.call(this);

        // 遍历组件节点并进行view绑定
        nodeTravel.call(this, this.node, this.node);

        // 创建子组件实例
        this.$children && createCpns.call(this);

        // 传入parent和children组件
        this.$data.$parent = this.$parent;
        this.$data.$children = this.$children;

        // 传入router
        if (this.router) {
            this.router.el = this.el;
            Link.$router = new Router(this.router);
        }

        // 传入destroy函数
        this.$destroy = destroy.bind(this);

        // 刷新页面
        this.$data && notify.call(this);

        // 刷新页面后调用一次updated
        this.updated && this.updated.call(this.$data);
    }

    // 销毁
    function destroy() {
        // 销毁前
        this.beforeDestroy && this.beforeDestroy.call(this.$data);

        // 销毁views和$data
        this.views = null;
        this.$data = null;

        // 销毁后
        this.destroyed && this.destroyed.call(this.$data);
    }

    /**
     * Data Module
     */

    // 获取父组件传值
    function propsGet() {
        for (var attr of this.node.attributes) {
            if (attr.name.indexOf("~") > -1) {
                this.$data.props = this.$data.props || {};
                this.$data.props[attr.name.slice(1)] = dataGet(this.$parent, attr.value);
            }
        }
    }

    // 获取子组件引用值
    function refsSet() {
        for (var attr of this.node.attributes) {
            if (attr.name === "ref") {
                this.$parent.$refs = this.$parent.$refs || {};
                this.$parent.$refs[attr.value] = this.$data;
            }
        }
    }

    // 将data替换为aliveData
    function dataReplace() {
        this.data = function () {
            return this.aliveData.$data;
        }
    }

    // 将methods暴露到$data中
    function methodsExpose() {
        for (var key in this.methods) {
            var value = this.methods[key];
            this.$data[key] = value;
        }
    }

    function isNullString(value) {
        return value === "";
    }

    // 遍历data
    function dataTravel(data, keyString = "") {
        for (var key in data) {
            if (key === "__ob__") { continue; };
            if (key !== "props") {
                defineReactive.call(this, data, key, data[key], keyString);
            }
            // 给数组添加通知和遍历方法
            if (data[key] instanceof Array) {
                data[key].__ob__ = {
                    keyString: isNullString(keyString) ? key : keyString + "." + key,
                    notify: notify.bind(this),
                    dataTravel: dataTravel.bind(this)
                };
            }
            if (data[key] instanceof Object) {
                if (isNullString(keyString)) {
                    dataTravel.call(this, data[key], key);
                } else {
                    dataTravel.call(this, data[key], keyString + "." + key);
                }
            }
        }
    }

    // 定义data的setter和getter
    function defineReactive(data, key, value, keyString) {
        var vm = this;
        keyString = isNullString(keyString) ? key : keyString + "." + key;

        Object.defineProperty(data, key, {
            get() {
                return value;
            },
            set(newValue) {
                if (value === newValue) { return };
                value = newValue;
                if (newValue instanceof Object) {
                    dataTravel.call(vm, newValue);
                }
                notify.call(vm, keyString);
            },
            enumerable: typeof (data) === "object" ? true : false,
            configurable: true,
        });
    }

    // 获取data的值
    function dataGet(data, keyString) {
        var keyArr = keyString.split(".");
        for (var keyString of keyArr) {
            data = data[keyString];
            if (data === undefined) {
                return undefined;
            }
        }
        return data;
    }

    /*
     * View Module
     */

    // 替换组件标签内容
    function replaceCpnHTML() {
        var newNode = document.createElement("div");
        this.node.parentNode.insertBefore(newNode, this.node);
        newNode.outerHTML = this.template;
        this.node = this.node.previousElementSibling;
        this.node.parentNode.removeChild(this.node.nextElementSibling);
    }

    // 在绑定语法时调用，收集包含语法的节点，用于做数据和页面的对接 
    function viewAdd(options) {
        // 判断节点是否存在
        for (var view of this.views) {
            if (view.node === options.node && view.type === options.type) {
                return;
            }
        }
        this.views.push(options);
    }

    // node遍历
    function nodeTravel(node, belong) {
        // 匹配语法
        if (node.nodeType === 1) {
            // 判断是否子组件
            if (Link.components && isCpnNode.call(this, node)) {
                return;
            }

            var hasEachAttr = node.getAttribute("each")

            // 属性匹配
            attrMatch.call(this, node, belong);

            // 事件匹配
            eventMatch.call(this, node, belong);

            // 遍历子节点
            if (node.childNodes != null && !hasEachAttr) {
                for (var child of node.childNodes) {
                    nodeTravel.call(this, child, belong);
                }
            }

            // 移除node上的临时属性
            node.removeAttribute("index");
            node.removeAttribute("subType");
            node.removeAttribute("dataType");
        } else if (node.nodeType === 3) {
            // mustache语法绑定
            mustacheBind.call(this, node, belong);
        }
    }

    // 匹配标签属性
    function attrMatch(node, belong) {
        // 先执行each语法修改页面节点
        if (node.getAttribute("each")) {
            // 判断是否为根节点
            if (node === this.node) {
                throw new Error(`Can not use "each" in the root element`);
            }
            eachBind.call(this, node, belong);
            return;
        }

        // 遍历节点属性
        for (var attr of node.attributes) {
            switch (attr.name) {
                case "link":
                    linkBind.call(this, node, attr.value, belong);
                    break;
                case "$class":
                    classBind.call(this, node, attr.value, belong);
                    break;
                case "$style":
                    styleBind.call(this, node, attr.value, belong);
                    break;
                default:
                    attr.name.indexOf("$") > -1 && attrBind.call(this, node, attr.name, attr.value, belong);
            }
        }
    }

    // 匹配事件语法
    function eventMatch(node) {
        for (var attr of node.attributes) {
            if (attr.name.indexOf("@") > -1) {
                eventBind.call(this, node, attr.name);
                node.removeAttribute(attr.name);
            }
        }
    }

    // 绑定each语法
    function eachBind(node, belong) {
        // 获取语法内容
        var attr = node.getAttribute("each");
        var matches = attr.match(/(.+)of(.+)/);
        var subType = matches[1].trim();
        var dataType = matches[2].trim();
        node.removeAttribute("each");

        // 复制一个新的节点
        var newNode = node.cloneNode(true);

        // 替换HTML的mustache
        var innerHTML = node.innerHTML;
        while (innerHTML != innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`)) {
            innerHTML = innerHTML.replace(`{{${subType}}}`, `{{${dataType}.0}}`);
        }
        node.innerHTML = innerHTML;

        // 设置临时属性
        node.setAttribute("index", 0);
        node.setAttribute("dataType", dataType);
        node.setAttribute("subType", subType);

        // 添加到视图中
        viewAdd.call(this, {
            node: node,
            template: dataType,
            props: {
                subType: subType,
                length: 1,
                nodeTemplate: newNode
            },
            type: "each",
            belong
        });

        nodeTravel.call(this, node, node)
    }

    // 绑定mustache语法
    function mustacheBind(node, belong) {
        var template = node.data;
        var mustaches = template.match(/\{\{(.+?)\}\}/g);
        if (mustaches == null) { return };

        // 遍历mustaches
        mustaches.forEach(mustache => {
            mustache = mustache.replace("{{", "").replace("}}", "");
            template = template.replace(mustache, replaceVarName.call(this, node, mustache, "mustache"));
        });

        // 添加到视图中
        viewAdd.call(this, {
            node,
            template,
            type: "mustache",
            belong
        });
    }

    // 绑定link语法
    function linkBind(node, value, belong) {
        var template = replaceVarName.call(this, node, value);

        // input双向绑定
        if (node.tagName === "INPUT") {
            var data = this.$data;

            // 监听input事件
            node.addEventListener("input", () => {
                var keyArr = template.split(".");
                for (var key in keyArr) {
                    if (key === keyArr.length - 1) {
                        data[key] = node.value;
                    } else {
                        data = data[key];
                    }
                }
            });
        }

        // 添加到视图中
        viewAdd.call(this, {
            node,
            template: `{{${template}}}`,
            type: "link",
            belong
        });

        // 移除节点属性
        node.removeAttribute("link");
    }

    // 绑定$class语法
    function classBind(node, value, belong) {
        // 添加到视图中
        viewAdd.call(this, {
            node,
            template: this.replaceVarName(node, value),
            props: {
                class: node.getAttribute("class")
            },
            type: "class",
            belong
        });

        // 移除节点属性
        node.removeAttribute("$class");
    }

    // 绑定$style语法
    function styleBind(node, value, belong) {
        // 添加到视图中
        viewAdd.call(this, {
            node,
            template: (node.getAttribute("style") || "") + this.replaceVarName(node, value),
            type: "style",
            belong
        });

        // 移除节点属性
        node.removeAttribute("$style");
    }

    // 绑定其他属性
    function attrBind(node, name, value, belong) {
        // 添加到视图中
        viewAdd.call(this, {
            node,
            template: replaceVarName.call(this, node, value),
            type: name.slice(1),
            belong
        });

        // 移除节点属性
        node.removeAttribute(name);
    }

    // 替换节点属性的变量名
    function replaceVarName(node, value, type) {
        // 如果值为null返回null
        if (value == null) { return null };

        // 如果存在变量则返回获取的值
        if (dataGet(this.$data, value) !== undefined) { return value };

        // 如果是mustache语法将节点改变为父节点(因为mustache语法是在textnode上)
        if (type === "mustache") {
            node = node.parentNode;
        }

        // 向上寻找each语法添加的临时属性
        while (node !== this.node) {
            var subType = node.getAttribute("subType")
            var dataType = node.getAttribute("dataType")
            var index = node.getAttribute("index")

            if (subType && value.indexOf(subType) > -1) {
                // 替换变量名
                value = value.replace(subType, dataType + "." + index)

                // 替换后存在变量则返回值，不存在则继续往上查找(多层each)
                if (dataGet(this.$data, value) !== undefined) {
                    return value
                }
            }

            node = node.parentNode
        }

        throw new Error(`Can not find data "${value}"`)
    }

    // 绑定event语法
    function eventBind(node, attr) {
        var data = this.$data;
        var matches = node.getAttribute(attr).match(/(.+)\((.*)\)/);
        var [_, fn, args] = matches;

        // 判断是否存在方法
        if (!data[fn]) {
            throw new Error(`"${fn}" is not defined`);
        }

        // 去除前缀@
        attr = attr.slice(1);

        // 分隔传参
        var argArr = args.split(",");

        // 判断是否传入index
        if (argArr.indexOf("index") > -1) {
            argArr[argArr.indexOf("index")] = getIndex.call(this, node);
        }

        // 监听事件
        node.addEventListener(attr, function () {
            // 判断是否传入this
            if (argArr.indexOf("this") > -1) {
                argArr[argArr.indexOf("this")] = this;
            }

            // 判断是否传入event
            if (argArr.indexOf("event") > -1) {
                argArr[argArr.indexOf("event")] = event;
            }

            // 执行方法
            data[fn](...argArr);
        });
    }

    // 获取索引
    function getIndex(node) {
        // 向上寻找each语法添加的index
        while (node != this.node) {
            if (node.getAttribute("index")) {
                return node.getAttribute("index");
            }
            node = node.parentNode;
        }

        throw new Error(`Can not use "index" without "each" grammer`);
    }

    /*
     * Respond Module
     */

    // 通知分发
    function notify(keyString) {
        if (this.views == null) { return };

        for (var view of this.views) {
            // 存在键名但没有匹配键名的模板时返回
            if (keyString != null && view.template.match(keyString) == null) { return };

            // 根据视图类型渲染
            switch (view.type) {
                case "each":
                    if (eachRender.call(this, view) && keyString) { return };
                    break;
                case "class":
                    classRender.call(this, view);
                    break;
                case "style":
                    styleRender.call(this, view);
                    break;
                case "link":
                    textRender.call(this, view);
                    break;
                case "mustache":
                    textRender.call(this, view);
                    break;
                default:
                    attrRender.call(this, view);
            }

            // 视图改变后触发updated钩子函数
            this.updated && this.updated.call(this.$data);
        }
    }

    // 渲染页面节点(each语法)
    function eachRender(view) {
        var vm = this;
        var value = dataGet(this.$data, view.template);

        // 如果数组长度没有变化则不修改节点
        if (value.length === view.props.length) { return false };

        // 根据数组长度变化增减节点
        if (value.length > view.props.length) {
            addNode(view, value);
        } else if (value.length < view.props.length) {
            delNode(view, value);
        }

        viewAdd.call(this, view);
        notify.call(this, view.template);

        return true;

        // 节点添加
        function addNode(view, value) {
            while (value.length > view.props.length) {
                // 复制节点
                var nodeTemplate = view.props.nodeTemplate;
                var newNode = nodeTemplate.cloneNode(true);

                // 插入节点
                if (view.node.nextElementSibling) {
                    view.node.parentNode.insertBefore(newNode, view.node.nextElementSibling);
                } else {
                    view.node.parentNode.appendChild(newNode);
                }

                // 更新当前节点
                view.node = newNode;
                replaceNodeHTML(view);

                // 设置attr
                view.node.setAttribute("dataType", view.template);
                view.node.setAttribute("subType", view.props.subType);
                view.node.setAttribute("index", view.props.length);
                view.props.length++;

                // 刷新视图并遍历新增节点的子节点
                refreshView(view);
                nodeTravel.call(vm, view.node, view.node);
            }
        }

        // 节点减少
        function delNode(view, value) {
            while (value.length < view.props.length) {
                // 刷新视图
                refreshView(view);

                // 删减节点
                var prevNode = view.node.previousSibling;
                view.node.parentNode.removeChild(view.node);
                view.node = prevNode;
                view.props.length--;
            }
        }

        // 替换节点内容
        function replaceNodeHTML(view) {
            var innerHTML = view.node.innerHTML;
            var subType = view.props.subType;
            var length = view.props.length;

            // 替换节点中的mustache语法
            while (innerHTML != innerHTML.replace(`{{${subType}}}`, `{{${view.template}.${length}}}`)
            ) {
                innerHTML = innerHTML.replace(`{{${subType}}}`, `{{${view.template}.${length}}}`);
            }
            view.node.innerHTML = innerHTML;
        }

        // 更新视图
        function refreshView(thisView) {
            vm.views = vm.views.filter(view => {
                return view.belong !== thisView.node;
            });
        }
    }

    function textRender(view) {
        var vm = this;
        var text = replaceText(view);

        // 判断视图类型
        if (view.type === "link") {
            if (view.node.nodeName === "INPUT") {
                view.node.value = text;
            } else {
                view.node.innerText = text;
            }
        } else {
            view.node.data = text;
        }

        // 替换模板内容
        function replaceText(view) {
            var text = view.template;
            var mustaches = text.match(/\{\{(.+?)\}\}/g);

            mustaches.forEach(mustache => {
                var dataTypes = mustache.match(/\{\{(.*)\}\}/)[1].split("+");
                var value = expressionGet(dataTypes);

                if (value == null) {
                    text = text.replace(mustache, "");
                } else {
                    text = text.replace(mustache, value);
                }
            })

            return text;
        }

        // 获取表达式的值
        function expressionGet(keys) {
            var value = null;

            keys.forEach(key => {
                var _value = dataGet(vm.$data, key);

                if (_value === undefined) {
                    _value = isNaN(Number(key)) ? key : Number(key);
                }
                value = (value == null) ? _value : value + _value;
            })

            return value;
        }
    }

    // 渲染页面class
    function classRender(view) {
        var vm = this;
        //拆分class
        var classArr = view.template.split(",");
        var className = view.props.class;

        classArr.forEach(cs => {
            var { thisClassName, boolean } = getClass(cs);
            //修改className
            if (boolean) {
                className += ` ${thisClassName}`;
            }
        })

        view.node.className = className;

        // 获取$class的值
        function getClass(cs) {
            var boolean;
            var thisClassName = "";
            var matches = cs.split(":");

            // 判断是否为对象语法
            // 对象语法的key=className,value=boolean
            // 非对象语法直接获取变量值作为className,boolean根据className取值
            if (matches.length === 1) {
                // 判断是否为函数
                var fn = cs.match(/(.*)\(.*\)/);

                thisClassName = fn ? vm[fn[1]](fn[2]) : dataGet(vm.$data, cs);
                boolean = thisClassName ? true : false;
            } else {
                var dataType = matches[1].trim();
                var fn = dataType.match(/(.*)\(.*\)/);

                thisClassName = matches[0].trim();
                boolean = fn ? vm[fn[1]](fn[2]) : dataGet(vm.$data, dataType);
            }

            return { thisClassName, boolean };
        }
    }

    // 渲染页面style
    function styleRender(view) {
        var styleArr = view.template.split(";");
        var node = view.node;

        styleArr.forEach(style => {
            // style为null或空字符串则返回
            if (style == null || style === "") { return };

            var matches = style.split(":");
            var styleName = matches[0].trim();
            var dataType = matches[1];
            var fn = dataType.match(/(.*)\(.*\)/);
            var value = fn ? this[fn[1]](fn[2]) : dataGet(this.$data, dataType);

            if (node.style[styleName] !== value) {
                node.style[styleName] = value;
            }
        })
    }

    // 渲染节点属性
    function attrRender(view) {
        var attr = view.template;
        var fn = attr.match(/(.*)\(.*\)/);
        var value = fn ? this[fn[1]](fn[2]) : dataGet(this.$data, attr);
        if (view.node[view.type] !== value) {
            view.node[view.type] = value;
        }
    }

    /*
     * Component Module
     */

    // 子组件
    Link.components = [];

    // 注册组件
    Link.component = function component(options) {
        var node = options.template;

        if (node instanceof Object) {
            if (node == null) {
                throw new Error(`Can"t find template "${options.template}"`);
            }
            options.template = node.innerHTML;
            node.parentNode.removeChild(node);
        }

        Link.components.push(options);
    }

    // 检查是否为Component
    function isCpnNode(child) {
        var tagName = child.tagName.toLowerCase();

        for (var cpn of Link.components) {
            if (cpn.name === tagName) {
                addCpn.call(this, cpn, child);
                return true;
            }
        }

        return false;
    }

    // 添加子组件
    function addCpn(component, childNode) {
        // 初始化子组件
        this.$children = this.$children || [];

        // 创建新子组件
        var newCpn = Object.assign({}, component);

        // 绑定组件关系
        newCpn.parent = this.$data;
        newCpn.node = childNode;

        // router的alive功能
        if (this.aliveData && this.aliveData.$children) {
            newCpn.alive = true;
            newCpn.aliveData = this.aliveData.$children[0];
            this.aliveData.$children.shift();
        }

        this.$children.push(newCpn);
    }

    // 创建子组件
    function createCpns() {
        for (var key in this.$children) {
            this.$children[key] = new Link(this.$children[key]);
        }
    }

    return Link;
}))