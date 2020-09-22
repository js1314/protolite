/**
 * 扩展js的原型链prototype方法
 * 这样就可以在全局内方便使用而不用加载
 *
 * @ahtor Yonglong Zhu<733433@qq.com>
 * @version 1.0.3
 */

import { toByteArray } from 'base64-js'

/**
 * 继承多个对象 不替换/不递归/保留索引
 *
 * @param dest
 * @param arguments(1,n)
 * @returns {Object}
 */
function extend(target) {
  for (let i = 1, l = arguments.length; i < l; i++) {
    let dest = arguments[i] || {}
    for (let key in dest) {
      if (typeof target[key] === 'undefined') {
        target[key] = dest[key]
      }
    }
  }
  return target
}

// 对象类型判断方法分配
// Object.is*， as: Promise.isPromise
const toString = Object.prototype.toString
const typeMap = {
  '[object Boolean]': [Boolean, 'Boolean'],
  '[object Number]': [Number, 'Number'],
  '[object String]': [String, 'String'],
  '[object Function]': [Function, 'Function'],
  '[object Array]': [Array, 'Array'],
  '[object Date]': [Date, 'Date'],
  '[object RegExp]': [RegExp, 'RegExp'],
  // '[object Undefined]': [undefined, 'Undefined'],
  // '[object Null]': [null, 'Null'],
  '[object Object]': [Object, 'Object'],
  //'[object Promise]': [Promise, 'Promise'],
}
for (let type in typeMap) {
  let map = typeMap[type]
  let obj = map[0]
  let iss = 'is' + map[1]
  if (typeof obj[iss] === 'function') {
    // console.warn('[native code] ' + map[1] + '.' + iss + ' already defined')
  } else {
    obj[iss] = (v) => toString.call(v) === type
  }
  Object[iss] = obj[iss]
}

const slice = Array.prototype.slice

/**
 * 获取对象类型
 *
 * @param obj
 * @return {String}
 */
function typeOf(obj) {
  let ret = typeMap[toString.call(obj)]
  return ret ? ret[1].toLowerCase() : 'undefined'
}

// extend window
extend(window, {
  // 创建一个全局对象用来存储跟组件相关的方法
  Component: {},
})

// extend Object
extend(Object, {
  extend,
  typeOf,
  /**
   * 使用方法遍历对象
   * @param obj
   * @param callback
   * @param context
   */
  forEach(obj, callback, context) {
    for (let key in obj) {
      callback.call(context, obj[key], key)
    }
  },
  /**
   * 是否为Promise实例
   * @param obj
   * @return {boolean}
   */
  isPromise(obj) {
    return !!obj && typeof obj.then === 'function' && typeof obj.catch === 'function'
  },
  /**
   * 是否为组件
   * @param obj
   * @returns {boolean}
   */
  isComponent(obj) {
    return obj && (typeof obj === 'object' || typeof obj === 'function')
  },
  /**
   * 是否为空对象
   * @param obj
   * @returns {boolean}
   */
  isEmpty(obj) {
    if (obj && typeof obj === 'object') {
      for (let key in obj) {
        return false
      }
    }
    return true
  },
  /**
   * 方法作用到对象中每一个值
   * @param obj
   * @param callback
   * @param deep
   * @return {Object}
   */
  map(obj, callback, deep = true) {
    if (obj && typeof obj === 'object') {
      for (let key in obj) {
        let value = obj[key]
        if (Object.isObject(value)) {
          obj[key] = Object.map(value, callback, deep)
        } else if (Array.isArray(value)) {
          obj[key] = value.map((item) => Object.map(item, callback, deep))
        } else {
          obj[key] = callback(value)
        }
      }
    }
    return obj
  },
  /**
   * 对象数组 转 数组
   * @param obj
   * @return {Array}
   */
  toArray(obj) {
    return slice.call(obj)
  },
  /**
   * 不替换继承对象
   * @param dest
   * @param target
   * @param ignoreKeys
   * @return {Object}
   */
  include(dest, target, ignoreKeys = []) {
    for (let key in target) {
      if (typeof dest[key] === 'undefined' && !ignoreKeys.contains(key)) {
        dest[key] = target[key]
      }
    }
    return dest
  },
  /**
   * 替换继承对象
   * @param dest
   * @param target
   * @param ignoreKeys
   * @return {Object}
   */
  replace(dest, target, ignoreKeys = []) {
    for (let key in target) {
      if (!ignoreKeys.contains(key)) {
        dest[key] = target[key]
      }
    }
    return dest
  },
  /**
   * 去除左右空格
   * @param obj
   * @returns {Object}
   */
  trim(obj, deep = true) {
    if (obj && typeof obj === 'object') {
      // object/array
      for (let key in obj) {
        obj[key] = Object.trimSingle(obj[key], deep)
      }
    }
    return obj
  },
  trimSingle(value, deep = true) {
    if (String.isString(value)) {
      return value.trim()
    }
    if (Object.isObject(value)) {
      return Object.trim(value, deep)
    }
    if (Array.isArray(value)) {
      return value.trim(deep)
    }
    return value
  },
  /**
   * 复制对象
   * @param obj
   * @param deep
   * @returns {Object}
   */
  clone(obj, deep = true) {
    let hash = {}
    if (obj && typeof obj === 'object') {
      for (let key in obj) {
        hash[key] = Object.cloneSingle(obj[key], deep)
      }
    }
    return hash
  },
  cloneSingle(value, deep = true) {
    if (Object.isObject(value)) {
      return Object.clone(value, deep)
    }
    if (Array.isArray(value)) {
      return value.clone(deep)
    }
    return value
  },
  /**
   * 返回两个对象中不相同的部分(递归)
   * @param newValue
   * @param oldValue
   * @param primaryKey
   * @param ignoreKeys
   * @returns {Object}
   */
  diff(newData, oldData, primaryKey = '', ignoreKeys = []) {
    let data = {}
    if (newData && typeof newData === 'object') {
      for (let key in newData) {
        if (!ignoreKeys.contains(key)) {
          let oldv = oldData[key]
          if (primaryKey && primaryKey === key) {
            // 保留主键
            data[key] = oldv
          } else {
            let newv = Object.diffSingle(newData[key], oldv, primaryKey, ignoreKeys)
            if (newv !== undefined) {
              data[key] = newv
            }
          }
        }
      }
    }
    return data
  },
  diffSingle(newValue, oldValue, primaryKey = '', ignoreKeys = []) {
    if (oldValue === undefined) {
      return newValue
    }
    if (oldValue === newValue) {
      // 修改过
      return undefined
    }
    if (Object.isObject(newValue)) {
      return Object.isObject(oldValue) ? Object.diff(newValue, oldValue, primaryKey, ignoreKeys) : newValue
    }
    if (Array.isArray(newValue)) {
      return Array.isArray(oldValue) ? newValue.diff(oldValue, primaryKey, ignoreKeys) : newValue
    }
    if (Date.isDate(newValue)) {
      // 日期格式默认时分秒为00:00:00
      if (
        newValue.toString() ===
        new Date(oldValue + (String.isString(oldValue) && oldValue.indexOf(' ') === -1 ? ' 00:00:00' : '')).toString()
      ) {
        return undefined
      }
    }
    return newValue
  },
  /**
   * 捕获Promise异常到控制台warn
   * @param data
   * @return {Promise<any>}
   */
  console(data) {
    let promise = new Promise((resolve, reject) => reject(data))
    promise.catch((error) => error && console.warn(error))
    return promise
  },
  /**
   * 根据路径获取
   * @param data
   * @param path
   * @param def
   * @returns {*}
   */
  get(data, path, def = null) {
    for (let value = data, paths = path.split('.'), i = 0, l = paths.length; i < l; i++) {
      let _value = value[paths[i]]
      if (typeof _value === 'object') {
        def = value = _value
      } else {
        return _value
      }
    }
    return def
  },
  /**
   * 调用对象方法
   * @param hook
   * @param name
   * @param args
   * @returns {null}
   */
  apply(hook, name, args) {
    if (hook && typeof hook[name] === 'function') {
      try {
        return args ? hook[name].apply(hook, args) : hook[name]()
      } catch (e) {}
    }
    return null
  },
})

// extend Function
extend(Function, {})

// extend Array
extend(Array, {
  isArrayBuffer(val) {
    return toString.call(val) === '[object ArrayBuffer]'
  },
})

// extend String
extend(String, {
  trim: Object.trim,
  /**
   * 对象转数组，为字符串则按split分割
   * @param str 可为数组或字符串
   * @param split
   * @returns {*}
   */
  toArray(str, split = ',') {
    if (str && str.length > 0) {
      if (Array.isArray(str)) {
        return str
      }
      if (String.isString(str)) {
        return str.split(split)
      }
      return [str]
    }
    return []
  },
})

// extend Date
extend(Date, {
  /**
   * 获取时间戳
   * @param date 日期字段串
   * @param ms 是否返回毫秒级
   * @returns {number}
   */
  time(date, ms = false) {
    return Math.round((date ? new Date(date) : new Date()).getTime() / (ms ? 1 : 1000))
  },
})

// extend Element
extend(Element, {
  isElement(elem) {
    return elem && elem.nodeType == 1
  },
})

// extend Component
extend(Component, {
  isComponent: Object.isComponent,
})

// String.prototype
extend(String.prototype, {
  /**
   * 首字母大写
   * @return {string}
   */
  ucfirst() {
    return this.charAt(0).toUpperCase() + this.substr(1)
  },
  /**
   * 重复若干(len)次
   * @param len
   * @return {String}
   */
  repeat(len) {
    let str = ''
    while (len-- > 0) {
      str += this
    }
    return str
  },
  /**
   * 用指定的字符(char)将自身扩展到指定长度(max_len)
   * @param char
   * @param max_len
   * @return {string}
   */
  pad(char, max_len) {
    let str = this
    let len = str.length
    return len < max_len ? char.repeat(max_len - len) + str : str
  },
  /**
   * 字符长度，中文+2
   * @return {number}
   */
  len(ch = 2, en = 1) {
    let len = 0
    let chr = /[\u4e00-\u9fa5]+/
    for (let i = 0, l = this.length; i < l; i++) {
      let char = this.charAt(i)
      if (chr.test(char)) {
        len += ch
      } else {
        len += en
      }
    }
    return len
  },
  /**
   * 删除一段字符串
   * @param str
   * @param split
   * @return {string}
   */
  remove(str, split = ',') {
    return this.split(split).remove(str).join(',')
  },
  /**
   * base64编码
   * @return {string}
   */
  base64encode() {
    return new Buffer(this).toString('base64')
  },
  /**
   * base64解码
   * @return {string}
   */
  base64decode() {
    return String.fromCharCode(...toByteArray(this))
  },
})

// Array.prototype
extend(Array.prototype, {
  toArray() {
    return this.slice(0)
  },
  /**
   * 值是否存在
   * @param item
   * @return {boolean}
   */
  contains(item) {
    return this.indexOf(item) !== -1
  },
  /**
   * 添加项 如果不存在
   * @param item
   * @return {Array}
   */
  add(item) {
    this.indexOf(item) === -1 && this.push(item)
    return this
  },
  /**
   * 删除项 如果存在
   * @param item
   * @return {Array}
   */
  remove(item) {
    let index = this.indexOf(item)
    index === -1 || this.splice(index, 1)
    return this
  },
  /**
   * [...Object] 是否有对象
   * @param obj
   * @param fromKey
   * @param toKey
   * @return {boolean}
   */
  hasObj(obj, fromKey = 'id', toKey = 'id') {
    return this.some((item) => item[fromKey] === obj[toKey])
  },
  /**
   * [...Object] 查找对象
   * @param obj
   * @param fromKey
   * @param toKey
   * @return {boolean}
   */
  findObj(obj, fromKey = 'id', toKey = 'id') {
    let index = this.findIndex((value) => obj[fromKey] === value[toKey])
    return index === -1 ? null : this[index]
  },
  /**
   * [...Object] 添加对象
   * @param obj
   * @param fromKey
   * @param toKey
   * @return {boolean}
   */
  addObj(obj, fromKey = 'id', toKey = 'id') {
    this.hasObj(obj, fromKey, toKey) || this.push(obj)
    return this
  },
  /**
   * [...Object] 替换对象
   * @param obj
   * @param fromKey
   * @param toKey
   * @return {boolean}
   */
  replaceObj(obj, fromKey = 'id', toKey = 'id') {
    let fromFun = typeof fromKey === 'function' ? fromKey : (value) => obj[fromKey] === value[toKey]
    let index = this.findIndex(fromFun)
    let toFun = typeof toKey === 'function' ? toKey : (v) => v
    index === -1 ? this.push(toFun(obj, this[index])) : this.splice(index, 1, toFun(obj, this[index]))
    return this
  },
  /**
   * [...Object] 删除对象
   * @param obj
   * @param fromKey
   * @param toKey
   * @param isAny
   * @return {boolean}
   */
  removeObj(obj, fromKey = 'id', toKey = 'id', isAny = false) {
    let isSome = this.some((item, index) => {
      if (item[fromKey] === obj[toKey]) {
        this.splice(index, 1)
        return true
      }
      return false
    })
    if (isAny && isSome) {
      return this.removeObj(obj, fromKey, toKey, true)
    }
    // return isSome
    return this
  },
  /**
   * 返回两个数据中不相同的项 深度递归
   * @param oldData
   * @param primaryKey
   * @param ignoreKeys
   * @return {boolean}
   */
  diff(oldData, primaryKey = '', ignoreKeys = []) {
    let l = oldData && oldData.length
    if (!l || l != this.length) {
      return this.slice(0)
    }
    let diff = []
    this.forEach((newv, key) => {
      let oldv = primaryKey ? oldData.findObj(newv, primaryKey, primaryKey) : oldData[key]
      if ((newv = Object.diffSingle(newv, oldv, primaryKey, ignoreKeys)) !== undefined) {
        diff[key] = newv
      }
    })
    return diff
  },
  /**
   * 去除数组中每个值的左右空格
   * @param obj
   * @param fromKey
   * @param toKey
   * @return {boolean}
   */
  trim(deep = true) {
    return this.map((item) => Object.trimSingle(item, deep))
  },
  /**
   * 获取数据数据最后一条
   * @return {*}
   */
  end() {
    return this[this.length - 1]
  },
  /**
   * 收集数组对象中某个字段的值
   * Array<Object>
   * @param key
   * @return {Array}
   */
  column(key) {
    let columns = []
    this.forEach((item) => {
      let type = typeof item
      if (type === 'string' || type === 'number') {
        columns.push(item)
      } else if (type === 'object' && item[key] !== undefined) {
        columns.push(item[key])
      }
    })
    return columns
  },
  /**
   * 继承多个数组
   * 数组值唯一
   * @return {Array}
   */
  extend() {
    for (let i = 0, l = arguments.length; i < l; i++) {
      arguments[i].forEach((item) => {
        if (this.indexOf(item) === -1) {
          this.push(item)
        }
      })
    }
    return this
  },
  /**
   * 克隆一个数组
   * @param deep
   * @return {Array}
   */
  clone(deep = true) {
    if (!deep) {
      return this.slice(0)
    }
    let list = []
    this.forEach((item) => list.push(Object.cloneSingle(item, deep)))
    return list
  },
  /**
   * 数组树转hash: key=>value
   * Array<Object.children>
   * @param key primaryKey名称
   * @param keepRef 是否保留引用
   * @param logIndex 是否记录index
   * @return {Object}
   */
  toHash(key, keepRef = false, logIndex = false) {
    let hash = {}
    if (this.length > 0 && typeof key === 'string') {
      let each = (value, index) => {
        hash[value[key]] = logIndex ? [value, index] : value
        if (value.children) {
          Object.assign(hash, value.children.toHash(key, keepRef, logIndex))
        }
      }
      if (keepRef) {
        // 保留引用
        this.forEach(each)
      } else {
        this.forEach((info, index) => {
          each(Object.clone(info), index)
        })
      }
    }
    return hash
  },
  /**
   * 数组Tree转List
   * @param callback 回调方法
   * @param context 回调this
   * @param keepRef 是否保留引用
   * @return {Array}
   */
  toList(callback, context, keepRef = true, level = 0) {
    let list = []
    let each = (value) => {
      list.push(callback ? callback.call(context, value, level) : value)
      if (value.children) {
        list = list.concat(value.children.toList(callback, context, keepRef, level + 1))
      }
    }
    if (keepRef) {
      this.forEach(each)
    } else {
      this.forEach((item) => each(Object.clone(item)))
    }
    return list
  },
  /**
   * 数组List转Tree
   * @param callback
   * @param idKey
   * @param parentIdKey
   * @param childrenKey
   * @returns {*}
   */
  toTree(idKey = 'id', parentIdKey = 'parent_id', childrenKey = 'children') {
    let tree = []
    let children = []
    this.forEach((item) => (item[parentIdKey] ? children.push(item) : tree.push(item)))
    let to = (nodes) => {
      nodes.forEach((node) => (node[childrenKey] = to(children.filter((child) => child[parentIdKey] == node[idKey]))))
      return nodes
    }
    return to(tree)
  },
  /**
   * 根据主键ID查找数组Tree中的对象
   * @param id
   * @param key
   * @return {*}
   */
  findChildren(value, key = 'id') {
    let child = null
    for (let i = 0, l = this.length; i < l; i++) {
      if (this[i][key] === value) {
        return this[i]
      }
      let children = this[i].children
      if (children) {
        if ((child = children.findChildren(value, key)) !== null) {
          break
        }
      }
    }
    return child
  },
  /**
   * 按某键进行分组
   * @param key
   * @return {Object}
   */
  groupBy(key) {
    let group = {}
    this.forEach((item) => {
      let value = item[key]
      group[value] = group[value] || []
      group[value].push(item)
    })
    return group
  },
  /**
   * 分割数组成N列
   * @param size
   * @returns {Array}
   */
  chunk(size) {
    let chunk = []
    let page = 0
    this.forEach((item, index) => {
      chunk[page] = chunk[page] || []
      chunk[page].push(item)
      ;(index + 1) % size === 0 && page++
    })
    return chunk
  },
  /**
   * 查找到最后出现的值
   * @param callback
   * @returns {number}
   */
  findLastIndex(callback) {
    let index = this.slice(0).reverse().findIndex(callback)
    return index === -1 ? -1 : this.length - index - 1
  },
})

// Date.prototype
extend(Date.prototype, {
  /**
   * 日期转yyyy-MM-dd
   * @return {string}
   */
  toYmdString(seperator = '-') {
    return this.getFullYear() + seperator + (this.getMonth() + 1).toString().pad('0', 2) + seperator + this.getDate().toString().pad('0', 2)
  },
  /**
   * 日期转yyyy-MM-dd hh:ii:ss
   * @return {string}
   */
  toYmdhisString(seperator1 = '-', seperator2 = ' ', seperator3 = ':') {
    return (
      this.getFullYear() +
      seperator1 +
      (this.getMonth() + 1).toString().pad('0', 2) +
      seperator1 +
      this.getDate().toString().pad('0', 2) +
      seperator2 +
      this.getHours().toString().pad('0', 2) +
      seperator3 +
      this.getMinutes().toString().pad('0', 2) +
      seperator3 +
      this.getSeconds().toString().pad('0', 2)
    )
  },
})

// Function.prototype
// extend(Function.prototype, {
// });

// extend(Number.prototype, {
// });

// Element.prototype
extend(Element.prototype, {
  /**
   * 对象数组转数组
   * @return {T[]}
   */
  getChildren() {
    return Object.toArray(this.children)
  },
  /**
   * 添加元素 如果不存在
   * @param item
   * @return {Element}
   */
  appendChildx(elem) {
    this.contains(elem) || this.appendChild(elem)
    return this
  },
  /**
   * 删除元素 如果存在
   * @param item
   * @return {Element}
   */
  removeChildx(elem) {
    this.contains(elem) && this.removeChild(elem)
    return this
  },
  /**
   * 获取元素距离current的偏移值
   * @param current
   * @returns {number}
   */
  getOffsetTop(current) {
    let offsetTop = this.offsetTop || 0
    let offsetParent = this.offsetParent
    while (offsetParent) {
      offsetTop += offsetParent.offsetTop || 0
      offsetParent = offsetParent.offsetParent
    }
    return offsetTop - ((current && current.getOffsetTop()) || 0)
  },
})

// <= chrome46
if (window.NodeList) {
  extend(NodeList.prototype, {
    forEach(callback) {
      if (callback && typeof callback === 'function') {
        for (let i = 0, l = this.length; i < l; i++) {
          callback(this[i], i)
        }
      }
    },
  })
}
