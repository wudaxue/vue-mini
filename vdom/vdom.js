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
