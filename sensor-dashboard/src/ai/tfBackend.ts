import * as tf from '@tensorflow/tfjs'

export async function initTfBackend(prefer: 'wasm' | 'webgl' = 'wasm') {
  try {
    await tf.setBackend(prefer)
  } catch {
    try {
      await tf.setBackend(prefer === 'wasm' ? 'webgl' : 'wasm')
    } catch {
      try {
        await tf.setBackend('cpu')
      } catch {}
    }
  }
  await tf.ready()
  if ((tf as any).enableProdMode) {
    (tf as any).enableProdMode()
  }
  return tf.getBackend()
}


