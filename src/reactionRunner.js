import {
  registerReactionForKey,
  iterateReactionsForKey,
  releaseReaction
} from './store'

const AFTER = Symbol('after reaction')
const RESOLVE_AFTER = Symbol('resolve after reaction')
let runningReaction

// 'this' is bound to a reaction in this function, do not try to call it normally
export function runAsReaction () {
  try {
    // delete all existing (obj.key -> reaction) connections
    // and reconstruct them in the get trap while the reaction is running
    releaseReaction(this.reaction)
    // set the reaction as the currently running one
    // this is required so that we can create (observable.prop -> reaction) pairs in the get trap
    runningReaction = this.reaction
    return this.apply(null, arguments)
  } finally {
    // always remove the currently running flag from the reaction when it stops execution
    runningReaction = undefined
  }
}

// register the currently running reaction to be queued again on obj.key mutations
export function registerRunningReactionForKey (obj, key) {
  if (runningReaction) {
    registerReactionForKey(obj, key, runningReaction)
  }
}

export function queueReactionsForKey (obj, key) {
  // iterate and queue every reaction, which is triggered by obj.key mutation
  iterateReactionsForKey(obj, key, queueReaction)
}

function queueReaction (reaction) {
  if (reaction.queue) {
    reaction.queue.add(reaction)
  } else {
    reaction()
  }
}

export function hasRunningReaction () {
  return runningReaction !== undefined
}
