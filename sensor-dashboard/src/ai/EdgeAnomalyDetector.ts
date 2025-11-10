import * as tf from '@tensorflow/tfjs'

// Types for sensor data
export interface SensorReading {
  timestamp: number
  value: number
  sensorType: 'temperature' | 'light' | 'distance' | 'gas' | 'gps'
}

export interface AnomalyResult {
  isAnomaly: boolean
  confidence: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  anomalyType: 'outlier' | 'drift' | 'spike' | 'pattern_break'
  affectedSensors: string[]
  recommendation: string
  timestamp: number
}

export interface SensorOptimization {
  sensorType: string
  samplingRate: number
  thresholdAdjustment: number
  priority: 'low' | 'medium' | 'high'
  reason: string
}

export class EdgeAnomalyDetector {
  private model: tf.LayersModel | null = null
  private isModelLoaded = false
  private featureHistory: number[][] = []
  private readonly maxHistoryLength = 50
  private readonly featureSize = 10 // Multi-sensor features (temp,light,dist,gas,gps speed) with stds
  private readonly windowLength = 32 // sequence length for temporal modeling
  private initializationPromise: Promise<void> | null = null
  private reconstructionErrorHistory: number[] = []
  private readonly maxErrorHistoryLength = 200
  // Running stats for per-sensor normalization (Welford)
  private runningStats: Record<string, { count: number; mean: number; m2: number }> = {
    temperature: { count: 0, mean: 0, m2: 0 },
    light: { count: 0, mean: 0, m2: 0 },
    distance: { count: 0, mean: 0, m2: 0 },
    gas: { count: 0, mean: 0, m2: 0 },
    gps: { count: 0, mean: 0, m2: 0 }
  }
  // Sensor history for trend analysis (keep recent readings with timestamps)
  private sensorHistory: Map<string, Array<{ timestamp: number; value: number }>> = new Map()
  private readonly maxSensorHistoryLength = 100 // Keep last 100 readings per sensor for trend analysis
  private baselineLoaded = false // Flag to indicate if baseline was loaded from file

  constructor() {
    // Delay initialization to avoid blocking UI
    setTimeout(() => {
      this.initializeModel().catch(console.error)
    }, 100)
  }

  private async initializeModel() {
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this._doInitialize()
    return this.initializationPromise
  }

  private async _doInitialize() {
    try {
      // Check if TensorFlow.js is available
      if (typeof tf === 'undefined') {
        console.warn('TensorFlow.js not available, using fallback detection only')
        return
      }

      // Create a lightweight sequence autoencoder model for anomaly detection
      const input = tf.input({ shape: [this.windowLength, this.featureSize] })
      const flat = tf.layers.flatten().apply(input) as tf.SymbolicTensor
      const enc1 = tf.layers.dense({ units: 128, activation: 'relu', name: 'enc1' }).apply(flat) as tf.SymbolicTensor
      const enc2 = tf.layers.dense({ units: 64, activation: 'relu', name: 'enc2' }).apply(enc1) as tf.SymbolicTensor
      const bottleneck = tf.layers.dense({ units: 16, activation: 'relu', name: 'bottleneck' }).apply(enc2) as tf.SymbolicTensor
      const dec1 = tf.layers.dense({ units: 64, activation: 'relu', name: 'dec1' }).apply(bottleneck) as tf.SymbolicTensor
      const dec2 = tf.layers.dense({ units: 128, activation: 'relu', name: 'dec2' }).apply(dec1) as tf.SymbolicTensor
      const out = tf.layers.dense({ units: this.windowLength * this.featureSize, activation: 'linear', name: 'out' }).apply(dec2) as tf.SymbolicTensor
      const reshaped = tf.layers.reshape({ targetShape: [this.windowLength, this.featureSize] }).apply(out) as tf.SymbolicTensor
      this.model = tf.model({ inputs: input, outputs: reshaped })

      // Compile with mean squared error for reconstruction
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mse']
      })

      // Train the model with synthetic normal data
      await this.trainModel()
      this.isModelLoaded = true
      
      console.log('✅ Edge Anomaly Detector initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Edge Anomaly Detector:', error)
      this.isModelLoaded = false
    }
  }

  private async trainModel() {
    if (!this.model) return

    // If baseline was loaded, skip synthetic training (will train from real data)
    if (this.baselineLoaded) {
      console.log('✅ Baseline loaded, skipping synthetic training')
      return
    }

    // Generate synthetic normal sequences for training (fallback)
    const sequences = this.generateSyntheticNormalSequences(500)
    const xs = tf.tensor3d(sequences, [sequences.length, this.windowLength, this.featureSize])
    const ys = tf.tensor3d(sequences, [sequences.length, this.windowLength, this.featureSize])
    await this.model.fit(xs, ys, { epochs: 30, batchSize: 16, verbose: 0, validationSplit: 0.1 })
    xs.dispose()
    ys.dispose()
  }

  /**
   * Train model from real baseline data (from file)
   */
  public async trainFromRealData(sensorData: SensorReading[]): Promise<void> {
    if (!this.model) {
      throw new Error('Model not initialized')
    }

    try {
      // Check if model was already trained with synthetic data
      const wasTrainedWithSynthetic = !this.baselineLoaded && this.isModelLoaded
      
      if (wasTrainedWithSynthetic) {
        console.log('⚠️ Model was trained with synthetic data. Reinitializing model for clean real data training...')
        // Dispose old model to avoid conflict between synthetic and real training
        if (this.model) {
          this.model.dispose()
        }
        // Reset model state
        this.model = null
        this.isModelLoaded = false
        this.initializationPromise = null
        
        // Reinitialize model structure (without training)
        if (typeof tf === 'undefined') {
          throw new Error('TensorFlow.js not available')
        }
        
        const input = tf.input({ shape: [this.windowLength, this.featureSize] })
        const flat = tf.layers.flatten().apply(input) as tf.SymbolicTensor
        const enc1 = tf.layers.dense({ units: 128, activation: 'relu', name: 'enc1' }).apply(flat) as tf.SymbolicTensor
        const enc2 = tf.layers.dense({ units: 64, activation: 'relu', name: 'enc2' }).apply(enc1) as tf.SymbolicTensor
        const bottleneck = tf.layers.dense({ units: 16, activation: 'relu', name: 'bottleneck' }).apply(enc2) as tf.SymbolicTensor
        const dec1 = tf.layers.dense({ units: 64, activation: 'relu', name: 'dec1' }).apply(bottleneck) as tf.SymbolicTensor
        const dec2 = tf.layers.dense({ units: 128, activation: 'relu', name: 'dec2' }).apply(dec1) as tf.SymbolicTensor
        const out = tf.layers.dense({ units: this.windowLength * this.featureSize, activation: 'linear', name: 'out' }).apply(dec2) as tf.SymbolicTensor
        const reshaped = tf.layers.reshape({ targetShape: [this.windowLength, this.featureSize] }).apply(out) as tf.SymbolicTensor
        this.model = tf.model({ inputs: input, outputs: reshaped })
        
        // Compile model
        this.model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'meanSquaredError',
          metrics: ['mse']
        })
        
        // Mark as loaded (will be trained with real data below)
        this.isModelLoaded = true
        console.log('✅ Model reinitialized, ready for real data training')
      }

      // First, update running stats from baseline data
      const grouped: Record<string, number[]> = {}
      for (const r of sensorData) {
        if (!grouped[r.sensorType]) grouped[r.sensorType] = []
        grouped[r.sensorType].push(r.value)
      }
      
      // Reset and rebuild running stats from baseline
      // This ensures clean stats from real baseline data
      Object.keys(this.runningStats).forEach(key => {
        this.runningStats[key] = { count: 0, mean: 0, m2: 0 }
      })
      
      Object.keys(grouped).forEach(key => {
        const values = grouped[key]
        for (const v of values) {
          const s = this.runningStats[key]
          if (!s) continue
          s.count += 1
          const delta = v - s.mean
          s.mean += delta / s.count
          const delta2 = v - s.mean
          s.m2 += delta * delta2
        }
      })

      console.log('📊 Running stats from baseline:', Object.keys(this.runningStats).map(k => ({
        sensor: k,
        mean: this.runningStats[k].mean.toFixed(2),
        std: Math.sqrt(this.runningStats[k].m2 / Math.max(1, this.runningStats[k].count - 1)).toFixed(2),
        count: this.runningStats[k].count
      })))

      // Build sequences from real data
      const byTime = [...sensorData].sort((a, b) => a.timestamp - b.timestamp)
      const sequences: number[][][] = []
      
      // Create sliding windows
      for (let i = this.windowLength; i < byTime.length; i += Math.floor(this.windowLength / 2)) {
        const window = byTime.slice(i - this.windowLength, i)
        const seq: number[][] = []
        
        // Extract features for each point in window
        for (let j = 0; j < window.length; j++) {
          const subset = window.slice(0, j + 1)
          const features = this.extractFeatures(subset)
          seq.push(features)
        }
        
        // Pad if needed
        while (seq.length < this.windowLength) {
          seq.unshift(seq[0] || new Array(this.featureSize).fill(0))
        }
        
        sequences.push(seq.slice(-this.windowLength))
      }

      if (sequences.length === 0) {
        console.warn('⚠️ Not enough data to create sequences, using synthetic fallback')
        return
      }

      console.log(`📊 Training from ${sequences.length} real sequences (${sensorData.length} readings)`)

      // Train model
      const xs = tf.tensor3d(sequences, [sequences.length, this.windowLength, this.featureSize])
      const ys = tf.tensor3d(sequences, [sequences.length, this.windowLength, this.featureSize])
      await this.model.fit(xs, ys, { epochs: 50, batchSize: 16, verbose: 1, validationSplit: 0.1 })
      xs.dispose()
      ys.dispose()

      // Warm up reconstruction error history
      // Clear old history if model was retrained to avoid mixing synthetic and real error distributions
      this.reconstructionErrorHistory = []
      for (let i = 0; i < Math.min(sequences.length, 100); i++) {
        const input = tf.tensor3d([sequences[i]], [1, this.windowLength, this.featureSize])
        const recon = this.model.predict(input) as tf.Tensor
        const arr = await recon.array() as number[][][]
        const mse = this.calculateMSE(sequences[i].flat(), arr[0].flat())
        this.reconstructionErrorHistory.push(mse)
        input.dispose()
        recon.dispose()
      }

      // Clear feature history to avoid mixing synthetic and real features
      this.featureHistory = []
      
      // Clear sensor history to start fresh with real baseline data
      this.sensorHistory.clear()

      this.baselineLoaded = true
      console.log('✅ Model trained from real baseline data (clean training, no conflicts)')
    } catch (error) {
      console.error('❌ Failed to train from real data:', error)
      throw error
    }
  }

  private generateSyntheticNormalSequences(numSequences: number): number[][][] {
    const sequences: number[][][] = []
    for (let s = 0; s < numSequences; s++) {
      const seq: number[][] = []
      // baseline per sequence to simulate smooth dynamics
      let temp = 27.5 + this.generateNormalValue(0, 0.3)
      let light = 300 + this.generateNormalValue(0, 20)
      let dist = 50 + this.generateNormalValue(0, 2)
      let gas = 5 + this.generateNormalValue(0, 0.5)
      let gps = 0.5 + this.generateNormalValue(0, 0.1)
      for (let t = 0; t < this.windowLength; t++) {
        // random walk small noise
        temp += this.generateNormalValue(0, 0.05)
        light += this.generateNormalValue(0, 5)
        dist += this.generateNormalValue(0, 0.5)
        gas += this.generateNormalValue(0, 0.1)
        gps += this.generateNormalValue(0, 0.02)
        const composed = [
          temp, 0.5,
          light, 50,
          dist, 5,
          gas, 1,
          gps, 0.2
        ]
        seq.push(composed)
      }
      sequences.push(seq)
    }
    return sequences
  }

  private generateNormalValue(mean: number, std: number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + std * z0
  }

  public async detectAnomaly(sensorData: SensorReading[]): Promise<AnomalyResult> {
    if (!this.isModelLoaded || !this.model) {
      return this.fallbackDetection(sensorData)
    }

    try {
      // Update running stats with latest values per sensor before extracting features
      this.updateRunningStats(sensorData)
      // Extract current features and build sequence window
      const features = this.extractFeatures(sensorData)
      this.featureHistory.push(features)
      if (this.featureHistory.length > this.maxHistoryLength) {
        this.featureHistory.shift()
      }
      const window = this.getLatestWindow()
      const inputTensor = tf.tensor3d([window], [1, this.windowLength, this.featureSize])
      const reconstruction = this.model.predict(inputTensor) as tf.Tensor
      const reconstructionArray = await reconstruction.array() as number[][][]
      const reconWindow = reconstructionArray[0]
      // Calculate reconstruction error over the sequence
      const mse = this.calculateMSE(window.flat(), reconWindow.flat())
      // Track reconstruction error history for dynamic thresholds
      this.reconstructionErrorHistory.push(mse)
      if (this.reconstructionErrorHistory.length > this.maxErrorHistoryLength) {
        this.reconstructionErrorHistory.shift()
      }
      
      // Classify anomaly type first (needed for adaptive threshold)
      const anomalyType = this.classifyAnomalyType(features, mse)
      
      // Determine anomaly with adaptive threshold based on anomaly type
      const threshold = this.calculateThreshold(anomalyType)
      const isAnomaly = mse > threshold
      const confidence = Math.min(mse / threshold, 1.0)
      
      // Determine severity
      const severity = this.determineSeverity(confidence, anomalyType)
      
      // Get affected sensors
      const affectedSensors = this.getAffectedSensors(sensorData, features)
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(anomalyType, severity, affectedSensors)

      // Cleanup tensors
      inputTensor.dispose()
      reconstruction.dispose()

      return {
        isAnomaly,
        confidence,
        severity,
        anomalyType,
        affectedSensors,
        recommendation,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('Error in anomaly detection:', error)
      return this.fallbackDetection(sensorData)
    }
  }

  // Persist/restore detector state (running stats and error history)
  public getState(): { runningStats: Record<string, { count: number; mean: number; m2: number }>; reconstructionErrorHistory: number[] } {
    return {
      runningStats: JSON.parse(JSON.stringify(this.runningStats)),
      reconstructionErrorHistory: [...this.reconstructionErrorHistory]
    }
  }

  public setState(state: Partial<{ runningStats: Record<string, { count: number; mean: number; m2: number }>; reconstructionErrorHistory: number[] }>) {
    if (state.runningStats) {
      this.runningStats = { ...this.runningStats, ...state.runningStats }
    }
    if (state.reconstructionErrorHistory && Array.isArray(state.reconstructionErrorHistory)) {
      this.reconstructionErrorHistory = [...state.reconstructionErrorHistory].slice(-this.maxErrorHistoryLength)
    }
  }

  private updateRunningStats(sensorData: SensorReading[]) {
    // Use the latest value per sensor to update running stats
    const latestBySensor: Record<string, number | undefined> = {}
    for (const r of sensorData) {
      latestBySensor[r.sensorType] = r.value
      
      // Update sensor history for trend analysis
      if (!this.sensorHistory.has(r.sensorType)) {
        this.sensorHistory.set(r.sensorType, [])
      }
      const history = this.sensorHistory.get(r.sensorType)!
      history.push({ timestamp: r.timestamp, value: r.value })
      
      // Keep only recent history
      if (history.length > this.maxSensorHistoryLength) {
        history.shift()
      }
    }
    
    Object.keys(this.runningStats).forEach(key => {
      const v = latestBySensor[key]
      if (typeof v === 'number' && Number.isFinite(v)) {
        const s = this.runningStats[key]
        s.count += 1
        const delta = v - s.mean
        s.mean += delta / s.count
        const delta2 = v - s.mean
        s.m2 += delta * delta2
      }
    })
  }

  private getMeanStd(sensorType: string): { mean: number; std: number } {
    const s = this.runningStats[sensorType]
    if (!s || s.count < 2) return { mean: 0, std: 1 }
    const variance = s.m2 / (s.count - 1)
    const std = Math.max(Math.sqrt(variance), 1e-6)
    return { mean: s.mean, std }
  }

  private extractFeatures(sensorData: SensorReading[]): number[] {
    // Group by sensor type
    const grouped = sensorData.reduce((acc, reading) => {
      if (!acc[reading.sensorType]) acc[reading.sensorType] = []
      acc[reading.sensorType].push(reading.value)
      return acc
    }, {} as Record<string, number[]>)

    // Extract statistical features
    const features: number[] = []
    
    // Temperature features
    const tempValues = grouped.temperature || []
    const tempLast = tempValues.length > 0 ? tempValues[tempValues.length - 1] : 0
    const tempStd = tempValues.length > 0 ? this.calculateStdDev(tempValues) : 0
    const tStats = this.getMeanStd('temperature')
    features.push((tempLast - tStats.mean) / tStats.std)
    features.push(tempStd / tStats.std)
    
    // Light features
    const lightValues = grouped.light || []
    const lightLast = lightValues.length > 0 ? lightValues[lightValues.length - 1] : 0
    const lightStd = lightValues.length > 0 ? this.calculateStdDev(lightValues) : 0
    const lStats = this.getMeanStd('light')
    features.push((lightLast - lStats.mean) / lStats.std)
    features.push(lightStd / lStats.std)
    
    // Distance features
    const distanceValues = grouped.distance || []
    const distLast = distanceValues.length > 0 ? distanceValues[distanceValues.length - 1] : 0
    const distStd = distanceValues.length > 0 ? this.calculateStdDev(distanceValues) : 0
    const dStats = this.getMeanStd('distance')
    features.push((distLast - dStats.mean) / dStats.std)
    features.push(distStd / dStats.std)
    
    // Gas features
    const gasValues = grouped.gas || []
    const gasLast = gasValues.length > 0 ? gasValues[gasValues.length - 1] : 0
    const gasStd = gasValues.length > 0 ? this.calculateStdDev(gasValues) : 0
    const gStats = this.getMeanStd('gas')
    features.push((gasLast - gStats.mean) / gStats.std)
    features.push(gasStd / gStats.std)

    // GPS speed features (encode gps as speed numeric in readings.value)
    const gpsValues = grouped.gps || []
    const gpsLast = gpsValues.length > 0 ? gpsValues[gpsValues.length - 1] : 0
    const gpsStd = gpsValues.length > 0 ? this.calculateStdDev(gpsValues) : 0
    const gpsStats = this.getMeanStd('gps')
    features.push((gpsLast - gpsStats.mean) / gpsStats.std)
    features.push(gpsStd / gpsStats.std)

    return features
  }

  // Calibrate baseline using provided normal readings
  public async calibrateBaseline(sensorData: SensorReading[]): Promise<void> {
    try {
      // Update running stats with the batch
      const grouped: Record<string, number[]> = {}
      for (const r of sensorData) {
        if (!grouped[r.sensorType]) grouped[r.sensorType] = []
        grouped[r.sensorType].push(r.value)
      }
      Object.keys(grouped).forEach((key) => {
        const values = grouped[key]
        for (const v of values) {
          const s = this.runningStats[key]
          if (!s) return
          s.count += 1
          const delta = v - s.mean
          s.mean += delta / s.count
          const delta2 = v - s.mean
          s.m2 += delta * delta2
        }
      })

      // Warm up reconstruction error history using sequence windows
      if (this.model && this.isModelLoaded) {
        const byTime = [...sensorData].sort((a, b) => a.timestamp - b.timestamp)
        for (let i = 0; i < byTime.length; i++) {
          const subset = byTime.slice(Math.max(0, i - this.windowLength), i)
          const f = this.extractFeatures(subset)
          this.featureHistory.push(f)
          if (this.featureHistory.length > this.maxHistoryLength) this.featureHistory.shift()
          const window = this.getLatestWindow()
          const input = tf.tensor3d([window], [1, this.windowLength, this.featureSize])
          const recon = this.model.predict(input) as tf.Tensor
          const arr = await recon.array() as number[][][]
          const mse = this.calculateMSE(window.flat(), arr[0].flat())
          this.reconstructionErrorHistory.push(mse)
          if (this.reconstructionErrorHistory.length > this.maxErrorHistoryLength) this.reconstructionErrorHistory.shift()
          input.dispose()
          recon.dispose()
        }
      }
    } catch (e) {
      console.warn('Calibration failed:', e)
    }
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  private calculateMSE(original: number[], reconstructed: number[]): number {
    let sum = 0
    for (let i = 0; i < original.length; i++) {
      sum += Math.pow(original[i] - reconstructed[i], 2)
    }
    return sum / original.length
  }

  private calculateThreshold(anomalyType?: 'outlier' | 'drift' | 'spike' | 'pattern_break'): number {
    // Dynamic threshold from reconstruction error distribution
    const errs = this.reconstructionErrorHistory
    if (errs.length < 30) return 0.1
    const recent = errs.slice(-100)
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length
    const variance = recent.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / recent.length
    const std = Math.sqrt(variance)
    
    // Adaptive thresholds for different anomaly types
    if (anomalyType === 'drift') {
      // Lower threshold for drift (2.5-sigma) to catch slow changes
      return mean + 2.5 * std
    } else if (anomalyType === 'spike') {
      // Higher threshold for spike (3.5-sigma) to reduce false positives
      return mean + 3.5 * std
    } else if (anomalyType === 'outlier') {
      // Standard threshold for outlier (3-sigma)
      return mean + 3.0 * std
    }
    
    // Default: 3-sigma threshold
    return mean + 3 * std
  }

  private getLatestWindow(): number[][] {
    const win: number[][] = []
    const len = this.featureHistory.length
    for (let i = Math.max(0, len - this.windowLength); i < len; i++) {
      win.push(this.featureHistory[i])
    }
    while (win.length < this.windowLength) {
      const pad = win.length > 0 ? win[0] : new Array(this.featureSize).fill(0)
      win.unshift(pad)
    }
    return win
  }

  // Expose detector metrics
  public getLatestError(): number | null {
    if (this.reconstructionErrorHistory.length === 0) return null
    return this.reconstructionErrorHistory[this.reconstructionErrorHistory.length - 1]
  }

  public getCurrentThreshold(): number {
    return this.calculateThreshold()
  }

  /**
   * Get training status information
   */
  public getTrainingStatus(): {
    isTrained: boolean
    trainingType: 'baseline' | 'synthetic' | 'none'
    baselineLoaded: boolean
    modelLoaded: boolean
  } {
    return {
      isTrained: this.isModelLoaded,
      trainingType: this.baselineLoaded ? 'baseline' : (this.isModelLoaded ? 'synthetic' : 'none'),
      baselineLoaded: this.baselineLoaded,
      modelLoaded: this.isModelLoaded
    }
  }

  /**
   * Analyze trend for a sensor using linear regression
   */
  private analyzeTrend(sensorType: string, minPoints: number = 10): {
    slope: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    rSquared: number;
    velocity: number; // rate of change per second
  } {
    const history = this.sensorHistory.get(sensorType) || []
    
    if (history.length < minPoints) {
      return { slope: 0, trend: 'stable', rSquared: 0, velocity: 0 }
    }

    // Use recent points for trend analysis
    const recent = history.slice(-Math.min(history.length, 50))
    const n = recent.length
    
    // Prepare data: x = time (seconds from first point), y = value
    const firstTime = recent[0].timestamp
    const x = recent.map((_, i) => (recent[i].timestamp - firstTime) / 1000) // Convert to seconds
    const y = recent.map(p => p.value)
    
    // Linear regression: y = slope * x + intercept
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

    const denominator = n * sumXX - sumX * sumX
    if (Math.abs(denominator) < 1e-10) {
      return { slope: 0, trend: 'stable', rSquared: 0, velocity: 0 }
    }

    const slope = (n * sumXY - sumX * sumY) / denominator
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared (coefficient of determination)
    const yMean = sumY / n
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept
      return sum + Math.pow(yi - predicted, 2)
    }, 0)
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
    const rSquared = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0

    // Determine trend direction
    const slopeThreshold = 0.001 // Minimum slope to consider as trend (per second)
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (slope > slopeThreshold && rSquared > 0.3) {
      trend = 'increasing'
    } else if (slope < -slopeThreshold && rSquared > 0.3) {
      trend = 'decreasing'
    }

    // Velocity is slope (rate of change per second)
    const velocity = slope

    return { slope, trend, rSquared, velocity }
  }

  private classifyAnomalyType(features: number[], mse: number): 'outlier' | 'drift' | 'spike' | 'pattern_break' {
    // features are normalized: [z_temp, std_temp_scaled, z_light, std_light_scaled, z_dist, std_dist_scaled, z_gas, std_gas_scaled, z_gps, std_gps_scaled]
    const zVals = [features[0], features[2], features[4], features[6], features[8]]
    const stdScaled = [features[1], features[3], features[5], features[7], features[9]]

    // Spike: large reconstruction error OR sudden jump in z-values compared to previous feature vector
    let jump = 0
    if (this.featureHistory.length > 0) {
      const prev = this.featureHistory[this.featureHistory.length - 1]
      const prevZ = [prev[0], prev[2], prev[4], prev[6], prev[8]]
      jump = Math.max(
        Math.abs(zVals[0] - prevZ[0]),
        Math.abs(zVals[1] - prevZ[1]),
        Math.abs(zVals[2] - prevZ[2]),
        Math.abs(zVals[3] - prevZ[3]),
        Math.abs(zVals[4] - prevZ[4])
      )
    }
    if (mse > 0.2 || jump > 3.0) return 'spike'

    // Improved Drift Detection: Use trend analysis instead of just std deviation
    const sensorTypes = ['temperature', 'light', 'distance', 'gas', 'gps']
    for (const sensorType of sensorTypes) {
      const trend = this.analyzeTrend(sensorType, 10)
      const stats = this.getMeanStd(sensorType)
      
      // Detect drift: sustained trend with significant slope
      if (trend.rSquared > 0.4) { // Good fit to linear trend
        // Calculate slope as percentage of mean (normalized)
        const meanValue = Math.max(Math.abs(stats.mean), 1) // Avoid division by zero
        const slopePercent = Math.abs(trend.slope * 60) / meanValue * 100 // Convert to per-minute percentage
        
        // Drift detected if:
        // 1. Significant trend (slope > threshold)
        // 2. Good R-squared (trend is consistent)
        // 3. Slope is significant relative to baseline
        if (slopePercent > 0.5 && trend.rSquared > 0.4) { // >0.5% change per minute
          // Additional check: sustained deviation from baseline
          const history = this.sensorHistory.get(sensorType) || []
          if (history.length >= 20) {
            const recentValues = history.slice(-20).map(h => h.value)
            const baselineDeviation = recentValues.map(v => Math.abs(v - stats.mean) / stats.std)
            const avgDeviation = baselineDeviation.reduce((a, b) => a + b, 0) / baselineDeviation.length
            
            // If average deviation is increasing and trend is significant
            if (avgDeviation > 1.0 && Math.abs(trend.slope) > 0.01) {
              return 'drift'
            }
          }
        }
      }
      
      // Fallback: traditional std-based drift detection (for backward compatibility)
      const stdAvg = stdScaled.reduce((a, b) => a + b, 0) / stdScaled.length
      if (stdAvg > 1.2 || stdScaled.some(s => s > 1.8)) { // Lowered thresholds for better sensitivity
        // But verify with trend analysis
        if (trend.rSquared > 0.3) {
          return 'drift'
        }
      }
    }

    // Outlier: any z is far from mean
    if (zVals.some(z => Math.abs(z) > 3.0)) return 'outlier'

    // Pattern Break: Check for trend reversal or pattern change
    // If multiple sensors show inconsistent trends (some increasing, some decreasing)
    // or if trend suddenly changes direction, it's a pattern break
    const allSensorTypes = ['temperature', 'light', 'distance', 'gas', 'gps']
    const trends = allSensorTypes.map(st => this.analyzeTrend(st, 10))
    const increasingCount = trends.filter(t => t.trend === 'increasing').length
    const decreasingCount = trends.filter(t => t.trend === 'decreasing').length
    
    // Pattern break: if we have conflicting trends across sensors (unusual)
    // or if a sensor's trend suddenly reversed
    if (increasingCount > 0 && decreasingCount > 0 && trends.some(t => t.rSquared > 0.4)) {
      // Multiple sensors showing opposite trends is unusual
      return 'pattern_break'
    }
    
    // Check for trend reversal in recent history
    for (const sensorType of allSensorTypes) {
      const history = this.sensorHistory.get(sensorType) || []
      if (history.length >= 30) {
        // Analyze first half vs second half
        const firstHalf = history.slice(0, Math.floor(history.length / 2))
        const secondHalf = history.slice(Math.floor(history.length / 2))
        
        if (firstHalf.length >= 10 && secondHalf.length >= 10) {
          const firstTrend = this.analyzeTrendFromData(firstHalf)
          const secondTrend = this.analyzeTrendFromData(secondHalf)
          
          // If trends are opposite (one increasing, one decreasing), it's a pattern break
          if (
            (firstTrend.trend === 'increasing' && secondTrend.trend === 'decreasing') ||
            (firstTrend.trend === 'decreasing' && secondTrend.trend === 'increasing')
          ) {
            if (firstTrend.rSquared > 0.3 && secondTrend.rSquared > 0.3) {
              return 'pattern_break'
            }
          }
        }
      }
    }

    return 'pattern_break'
  }

  /**
   * Helper method to analyze trend from raw data array
   */
  private analyzeTrendFromData(data: Array<{ timestamp: number; value: number }>): {
    slope: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    rSquared: number;
  } {
    if (data.length < 2) {
      return { slope: 0, trend: 'stable', rSquared: 0 }
    }

    const n = data.length
    const firstTime = data[0].timestamp
    const x = data.map((_, i) => (data[i].timestamp - firstTime) / 1000)
    const y = data.map(p => p.value)

    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

    const denominator = n * sumXX - sumX * sumX
    if (Math.abs(denominator) < 1e-10) {
      return { slope: 0, trend: 'stable', rSquared: 0 }
    }

    const slope = (n * sumXY - sumX * sumY) / denominator
    const intercept = (sumY - slope * sumX) / n

    const yMean = sumY / n
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept
      return sum + Math.pow(yi - predicted, 2)
    }, 0)
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
    const rSquared = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0

    const slopeThreshold = 0.001
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (slope > slopeThreshold && rSquared > 0.3) {
      trend = 'increasing'
    } else if (slope < -slopeThreshold && rSquared > 0.3) {
      trend = 'decreasing'
    }

    return { slope, trend, rSquared }
  }

  private determineSeverity(confidence: number, _anomalyType: string): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence > 0.9) return 'critical'
    if (confidence > 0.7) return 'high'
    if (confidence > 0.5) return 'medium'
    return 'low'
  }

  private getAffectedSensors(_sensorData: SensorReading[], features: number[]): string[] {
    // Using normalized z-values: mark sensors whose |z| > 2.5 as affected
    const affected: string[] = []
    const zTemp = features[0]
    const zLight = features[2]
    const zDist = features[4]
    const zGas = features[6]
    const zGps = features[8]
    if (Math.abs(zTemp) > 2.5) affected.push('temperature')
    if (Math.abs(zLight) > 2.5) affected.push('light')
    if (Math.abs(zDist) > 2.5) affected.push('distance')
    if (Math.abs(zGas) > 2.5) affected.push('gas')
    if (Math.abs(zGps) > 2.5) affected.push('gps')
    return affected
  }

  private generateRecommendation(
    anomalyType: string, 
    severity: string, 
    affectedSensors: string[]
  ): string {
    const recommendations = {
      outlier: 'Kiểm tra cảm biến có bị lỗi không',
      drift: 'Cảm biến có thể bị drift, cần hiệu chuẩn',
      spike: 'Có sự kiện bất thường xảy ra, cần kiểm tra ngay',
      pattern_break: 'Mô hình dữ liệu thay đổi, cần phân tích thêm'
    }
    
    const baseRecommendation = recommendations[anomalyType as keyof typeof recommendations]
    
    if (severity === 'critical') {
      return `🚨 KHẨN CẤP: ${baseRecommendation}. Cảm biến bị ảnh hưởng: ${affectedSensors.join(', ')}`
    }
    
    return `${baseRecommendation}. Cảm biến: ${affectedSensors.join(', ')}`
  }

  private fallbackDetection(sensorData: SensorReading[]): AnomalyResult {
    // Simple statistical fallback when AI model is not available
    const values = sensorData.map(d => d.value)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const stdDev = this.calculateStdDev(values)
    
    const outliers = values.filter(val => Math.abs(val - mean) > 2 * stdDev)
    const isAnomaly = outliers.length > 0
    
    return {
      isAnomaly,
      confidence: isAnomaly ? 0.7 : 0.1,
      severity: isAnomaly ? 'medium' : 'low',
      anomalyType: 'outlier',
      affectedSensors: sensorData.map(d => d.sensorType),
      recommendation: isAnomaly ? 'Phát hiện giá trị ngoại lệ bằng phương pháp thống kê' : 'Dữ liệu bình thường',
      timestamp: Date.now()
    }
  }

  public optimizeSensorResponse(anomalyResult: AnomalyResult): SensorOptimization[] {
    const optimizations: SensorOptimization[] = []
    
    anomalyResult.affectedSensors.forEach(sensorType => {
      const optimization = this.getOptimizationForSensor(sensorType, anomalyResult.severity)
      optimizations.push(optimization)
    })
    
    return optimizations
  }

  private getOptimizationForSensor(sensorType: string, severity: string): SensorOptimization {
    const baseOptimizations = {
      temperature: {
        low: { samplingRate: 60, thresholdAdjustment: 0.1, priority: 'low' as const },
        medium: { samplingRate: 30, thresholdAdjustment: 0.2, priority: 'medium' as const },
        high: { samplingRate: 10, thresholdAdjustment: 0.3, priority: 'high' as const },
        critical: { samplingRate: 5, thresholdAdjustment: 0.5, priority: 'high' as const }
      },
      gas: {
        low: { samplingRate: 30, thresholdAdjustment: 0.1, priority: 'medium' as const },
        medium: { samplingRate: 15, thresholdAdjustment: 0.2, priority: 'high' as const },
        high: { samplingRate: 5, thresholdAdjustment: 0.3, priority: 'high' as const },
        critical: { samplingRate: 2, thresholdAdjustment: 0.5, priority: 'high' as const }
      },
      light: {
        low: { samplingRate: 60, thresholdAdjustment: 0.1, priority: 'low' as const },
        medium: { samplingRate: 30, thresholdAdjustment: 0.2, priority: 'medium' as const },
        high: { samplingRate: 15, thresholdAdjustment: 0.3, priority: 'medium' as const },
        critical: { samplingRate: 10, thresholdAdjustment: 0.4, priority: 'high' as const }
      },
      distance: {
        low: { samplingRate: 30, thresholdAdjustment: 0.1, priority: 'medium' as const },
        medium: { samplingRate: 15, thresholdAdjustment: 0.2, priority: 'medium' as const },
        high: { samplingRate: 10, thresholdAdjustment: 0.3, priority: 'high' as const },
        critical: { samplingRate: 5, thresholdAdjustment: 0.4, priority: 'high' as const }
      }
    }
    
    const config = baseOptimizations[sensorType as keyof typeof baseOptimizations]?.[severity as keyof typeof baseOptimizations.temperature] || 
                   baseOptimizations.temperature.low
    
    return {
      sensorType,
      samplingRate: config.samplingRate,
      thresholdAdjustment: config.thresholdAdjustment,
      priority: config.priority,
      reason: `Tối ưu cho ${severity} anomaly`
    }
  }

  public dispose() {
    if (this.model) {
      this.model.dispose()
    }
  }
}
