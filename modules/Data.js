const Respond = require('../modules/Respond.js')

class Reactive {
    constructor(link) {
        this.link = link
        this.defineReactive(link.data)
        return this.defineProperty
    }

    defineReactive(data) {
        for (const key of Object.keys(data)) {
            let value = data[key]

            this.defineProperty(data, key, value)

            if (data[key] instanceof Object) {
                this.defineReactive(data[key])
            }
        }
    }

    defineProperty(data, key, value) {
        let link = this.link
        Object.defineProperty(data, key, {
            get() {
                return value
            },
            set(newValue) {
                if (value !== newValue) {
                    value = newValue
                    Respond.notify(link, key)
                }
            },
            enumerable: true,
            configurable: true,
        })
    }
}

module.exports = Reactive