// 如果原始的obj和proxy对象被删除之后，这里就会得到释放
// key为原始对象，值为一个Map, key是原始对象的属性，值是一个reaction的set集合
const connectionStore = new WeakMap()
const ITERATION_KEY = Symbol('iteration key')

export function storeObservable (obj) {
  // this will be used to save (obj.key -> reaction) connections later
  connectionStore.set(obj, new Map())
}

export function registerReactionForOperation (reaction, { target, key, type }) {
  if (type === 'iterate') {
    key = ITERATION_KEY
  }

  const reactionsForObj = connectionStore.get(target)
  let reactionsForKey = reactionsForObj.get(key)
  if (!reactionsForKey) {
    reactionsForKey = new Set()
    // 给observable的某个属性上添加一个依赖的集合
    reactionsForObj.set(key, reactionsForKey)
  }
  // save the fact that the key is used by the reaction during its current run
  // 避免重复添加
  if (!reactionsForKey.has(reaction)) {
    // 把当前reaction添加到 observable对象key的某个依赖集合上
    reactionsForKey.add(reaction) 
    // 双向关联，当reaction消失时，主动冲依赖项中去除，这里就不用去重了吗？？
    reaction.cleaners.push(reactionsForKey)
  }
}

export function getReactionsForOperation ({ target, key, type }) {
  // target有可能存在被释放的风险，这里就会获取不到
  const reactionsForTarget = connectionStore.get(target)
  const reactionsForKey = new Set()

  if (type === 'clear') {
    reactionsForTarget.forEach((_, key) => {
      addReactionsForKey(reactionsForKey, reactionsForTarget, key)
    })
  } else {
    addReactionsForKey(reactionsForKey, reactionsForTarget, key)
  }

  if (type === 'add' || type === 'delete' || type === 'clear') {
    const iterationKey = Array.isArray(target) ? 'length' : ITERATION_KEY
    addReactionsForKey(reactionsForKey, reactionsForTarget, iterationKey)
  }

  // 获取到某个对象属性上的全部reaction集合
  return reactionsForKey
}

function addReactionsForKey (reactionsForKey, reactionsForTarget, key) {
  const reactions = reactionsForTarget.get(key)
  reactions && reactions.forEach(reactionsForKey.add, reactionsForKey)
}

export function releaseReaction (reaction) {
  if (reaction.cleaners) {
    reaction.cleaners.forEach(releaseReactionKeyConnection, reaction)
  }
  reaction.cleaners = []
}

function releaseReactionKeyConnection (reactionsForKey) {
  reactionsForKey.delete(this)
}
