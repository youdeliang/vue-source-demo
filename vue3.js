let x;
let y;
let activeEffect
let f = n => n*100 + 100
let effect  = (fn, options = {}) => {
  let effect = (...args) => {
    try {
      activeEffect = effect
      return fn(...args)
    } finally {
      activeEffect = null
    }
  }
  effect.options = options
  effect.deps = []
  return effect
}

let watchEffect = cb => {
  let runner = effect(cb)
  runner()
  return () => {
    clearUpEffect(runner)
  }
}
let clearUpEffect = (effect) => {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
  }
}

let nextTick = (cb) => Promise.resolve().then(cb)

let queue = []
let queueJob = job => {
  if (!queue.includes(job)) {
    queue.push(job)
    nextTick(flushJobs)
  }
}
let flushJobs = () => {
  let job;
  while((job = queue.shift()) !== undefined) {
    job()
  }
}

let computed = (fn) => {
  let value;
  let dirty = true
  let runner = effect(fn, {
    schedular: () => {
      if (!dirty) {
        dirty = true
      }
    }
  })
  return {
    get value() {
      if (dirty) {
        value = runner()
        dirty = false
      }

      return value
    }
  }
}

let watch = (source, cb, options = {}) => {
  let getter = () => {
    return source()
  }
  const { immediate } = options
  let oldValue;
  let runner = effect(getter, {
    schedular: () => applyCb()
  })

  const applyCb = () => {
    let newValue = runner()
    if (newValue !== oldValue) {
      cb(newValue, oldValue)
      oldValue = newValue
    }
  }
  if (immediate) {
    applyCb()
  } else {
    oldValue = runner()
  }
}

const createReactive = (target) => {
  let deps = new Dep()
  return new Proxy(target, {
    get(target, prop) {
      deps.depend()
      return Reflect.get(target, prop)
    },
    set(target, prop, value) {
      Reflect.set(target, prop, value)
      deps.notify()
    }
  })
}

export const reactive = (obj) => {
  Object.keys(obj).forEach(key => createReactive(obj))
  return obj
}

class Dep {
  deps = new Set()
  depend() {
    if (activeEffect) {
      this.deps.add(activeEffect)
      activeEffect.deps.push(this.deps)
    }
  }
  notify() {
    this.deps.forEach(dep => queueJob(dep))
    this.deps.forEach(dep => {
     dep.options && dep.options.schedular && dep.options.schedular()
    })
  }
}

const ref = initValue => createReactive({'value': initValue})

x = ref(1)
let cx = computed(() => x.value + 2)

let count = set([], 1, 0)
const data = reactive({
  count: 0
})

document.getElementById("add").addEventListener("click", function() {
  console.log('111 :>> ', 111);
  data.count++
})

let stop = watchEffect(() => {
  document.querySelector('#text')
    .innerHTML = `${data.count}`
})

setTimeout(() => {
  stop
}, 3000)

watch(() => x.value, (newValue, oldValue) => {
  console.log('newValue, oldValue :>> ', newValue, oldValue);
}, {immediate: true})

// x.value = 2

// x.value = 4