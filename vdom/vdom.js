const VNodeType = {
  HTML: 'HTML',
  TEXT: 'TEXT',
  COMPONENT: 'COMPONENT'
}

let ChildTyps = {
  EMPTY: 'EMPTY',
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE'
}

function createElement(tag, data = null, children = null) {
  let flags //确定flags
  if (typeof tag === 'string') {
    flags = VNodeType.HTML
  } else if (typeof tag === 'function') {
    // 组件 未完  待续
    flags = VNodeType.COMPONENT
  } else {
    flags = VNodeType.TEXT
  }

  // 确定childFlags
  let childFlags
  if (Array.isArray(children)) {
    const { length } = children
    if (length === 0) {
      childFlags = ChildTyps.EMPTY  //没有children
    } else {
      childFlags = childFlags.MULTIPLE //对个子节点， 且子节点使用key
    }
  } else if (children === null) {
    childFlags = ChildTyps.EMPTY  // 没有子节点
  } else {
    childFlags = ChildTyps.SINGLE //其他情都作为文本节点处理，即单个子节点。会调用createTextNode 创建纯文本类型的VNode
    children = createTextNode(children + '')
  }

  // 返回 VNode 对象 
  return {
    flags,
    tag,
    data,
    key: data && data.key,
    children,
    childFlags,
    el: null
  }
}


function createTextNode(text) {
  return {
    // flags是 VNodeType.TEXT
    flags: VNodeType.TEXT,
    tag: null,
    data: null,
    // 纯文本类型的VNode, 其 children 属性存储的是与之相符的文本内容
    children: text,
    // 文本节点没有子节点
    childFlags: childFlags.EMPTY
  }
}

function patchData(el, key, oldValue, newValue) {
  switch (key) {
    case 'style':
      for (let k in newValue) {
        el.style[k] = newValue[k]
      }
      for (let k in oldValue) {
        if (!newValue[k].hasOwnProperty(k)) {
          el.style[k] = ''
        }
      }
      break
    case 'class':
      el.className = newValue
      break
    default:
      if (key[0] === '@') {
        // 事件
        // 移除旧事件
        if (oldValue) {
          el.removeEventListener(key.slice(1), oldValue)
        }

        // 添加新事件
        if (newValue) {
          el.addEventListener(key.slice(1), newValue)
        }
      } else {
        // 当做 Attr处理
        el.setAttribute(key, newValue)
      }
      break
  }
}

function render(vnode, container) {
  var oldVnode = container.vnode
  if (oldVnode == null) {
    // 没有旧的 Vnode ,使用 `mount` 函数挂载全新的 VNode
    mount(vnode, container)
    // 将新的 Vnode 添加到 container.vnode 属性下,这样下一次渲染时旧的 VNode 就存在了
  } else {
    // 有 旧的 VNode,则调用 patch 函数打补丁
    patch(oldVnode, vnode, container)
    // 更新 container.vnode
  }
  container.vnode = vnode
}

function mount(vnode, container, refNode) {
  const { flags } = vnode
  if (flags === VNodeType.HTML) {
    // 普通挂载标签
    mountElement(vnode, container, refNode)
  } else if (flags === VNodeType.Text) {
    // 挂载纯文本
    mountText(vnode, container)
  }
}

function mountElement(vnode, container, refNode) {
  const el = document.createElement(vnode.tag)
  vnode.el = el
  const data = vnode.data
  if (data) {
    for (let key in data) {
      patchData(el, key, null, data[key])
    }
  }

  const childFlags = vnode.childFlags
  const children = vnode.children
  if (childFlags !== ChildTyps.EMPTY) {
    if (childFlags !== ChildTyps.SINGLE) {
      mount(children, el)
    } else if (childFlags === ChildTyps.MULTIPLE) {
      for (let i = 0; i < children.length; i++) {
        mount(children[i], el)
      }
    }
  }
  refNode ? container.insetBefore(el, refNode) : container.appendChild(el)
}

function mountText(vnode, container) {
  const el = document.createTextNode(vnode.children)
  vnode.el = el
  container.appendChild(el)
}

function patch(oldVnode, newVnode, container) {
  const newFlags = newVnode.flags
  const oldFlags = oldVnode.flags
  if (newFlags !== oldFlags) {
    replaceVnode(oldVnode, newVnode, container)
  } else if (newFlags === VNodeType.HTML) {
    patchElement(oldVnode, newVnode, container)
  } else if (newFlags === VNodeType.TEXT) {
    patchText(oldVnode, newVnode)
  }
}

function replaceVnode(oldVnode, newVnode, container) {
  container.removeChild(oldVnode.el)
  mount(newVnode, container)
}

function patchElement(oldVnode, newVnode, container) {
  // 如果新旧Vnode描述的是不同的标签，则调用 replaceVnode 函数 使用新的 Vnode替换 旧的Vnode
  if (oldVnode.tag !== newVnode.tag) {
    replaceVnode(oldVnode, newVnode, container)
    return
  }

  // 拿到 el 元素，注意这时要让 newVnode.el 也引用还元素
  const el = (newVnode.el = oldVnode.el)
  const oldData = oldVnode.data
  const newData = newVnode.data

  if (newData) {
    for (let key in newData) {
      const oldValue = oldData[key]
      const newValue = newData[key]
      patchData(el, key, oldValue, newValue)
    }
  }
  // 删除
  if (oldValue) {
    const oldValue = oldData[key]
    if (oldValue && !newData.hasOwnProperty(key)) {
      patchData(el, key, oldValue, null)
    }
  }

  // 调用 patchChildren 函数递归的更新子节点 
  patchChildren(
    oldVnode.childFlags, // 旧的 Vnode 子节点的类型
    newVnode.childFlags, // 新的 Vnode 子节点的类型
    oldVnode.children, // 旧的 Vnode 子节点
    newVnode.children, // 新的 Vnode 子节点
    el // 当前标签元素，即这些子节点的父节点
  )
}

function patchChildren(oldChildFlags, newChildFlags, oldChildren, newChildren, container) {
  switch (oldChildFlags) {
    // 旧的 children 是单个子节点,会执行该 case 语句块
    case ChildTyps.SINGLE:
      switch (newChildFlags) {
        case ChildTyps.SINGLE:
          // 新的 children 也是单个子节点时，会执行该 case 语句块
          patch(oldChildren, newChildren, container)
          break
        case ChildTyps.EMPTY:
          // 新的 children 中没有子节点时
          container.removeChild(oldChildren.el)
          break
        default:
          // 新的 children 中有多个子节点
          container.removeChild(oldChildren.el)
          for (let i = 0; i < newChildren.length; i++) {
            mount(newChildren[i], container)
          }
          break
      }
      break
    //旧的 children 没有子节点
    case ChildTyps.EMPTY:
      switch (newChildFlags) {
        case ChildTyps.SINGLE:
          mount(newChildren, container)
          break
        case ChildTyps.EMPTY:
          break
        default:
          for (let i = 0; i < newChildren.length; i++) {
            mount(newChildren[i], container)
          }
          break
      }
    // 旧 children 有多个子节点
    default:
      switch (newChildFlags) {
        case ChildTyps.SINGLE:
          for (let i = 0; i < oldChildren.length; i++) {
            container.removeChild(oldChildren[i].el)
          }
          mount(newChildren, container)
          break
        case ChildTyps.EMPTY:
          for (let i = 0; i < oldChildren.length; i++) {
            container.removeChild(oldChildren[i].el)
          }
          break
        default:
          let lastIndex = 0
          for (let i = 0; i < newChildren.length; i++) {
            const newVnode = newChildren[i]
            let j = 0, find = false
            for (j; j < oldChildren.length; j++) {
              const oldVnode = oldChildren[j]
              if (newVnode.key === oldVnode.key) {
                find = true
                patch(oldVnode, newVnode, container)
                if (j < lastIndex) {
                  // 需要移动
                  const refNode = newChildren[i - 1].el.nextSibling
                  container.insertBefore(oldVnode.el, refNode)
                  break
                } else {
                  // 更新lastIndex
                  lastIndex = j
                }
              }
            }
            if (!find) {
              // 挂载新节点
              const refVnode = i - 1 < 0 ? oldChildren[0].el : newChildren[i - 1].el.nextSibling
              mount(newVnode, container, refVnode)
            }
          }
          //移除已经不存在的节点
          for (let i = 0; i < oldChildren.length; i++) {
            const oldVnode = oldChildren[i]
            const has = newChildren.find(newVnode => newVnode.key === oldVnode.key)
            if (!has) {
              container.removeChild(oldVnode.el)
            }
          }
          break
      }
      break
  }
}

function patchText(oldVnode, newVnode) {
  // 拿到文本节点 el,同时让 newVnode.el 指向该文本节点
  const el = (newVnode.el = oldVnode.el)
  // 只有当新旧文本内容不一致时才有必要更新
  if (newVnode.children !== oldVnode.children) {
    el.nodeValue = newVnode.children
  }
}
