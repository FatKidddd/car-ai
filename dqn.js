class DQNAgent {
  constructor(state_size, action_size, batch_size=32) {
    this.state_size = state_size;
    this.action_size = action_size;
    this.memory = [];;
    this.gamma = 0.95;
    this.epsilon = 1.0;
    this.epsilon_min = 0.001;
    this.epsilon_decay = 0.995;
    this.learning_rate = 0.001;
    this.batch_size = batch_size;
    this.model = this.create_model();
  }
	
  create_model() {
    const m = tf.sequential();
    m.add(tf.layers.dense({ inputShape: [this.state_size], units: 32, activation: 'relu' }));
    m.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    m.add(tf.layers.dense({ units: this.action_size, activation: 'softmax' }));

    m.compile({
      optimizer: tf.train.adam(),
      loss: tf.losses.meanSquaredError,
      metrics: ['mse'],
    });
    return m;
  }

  remember(state, action, reward, next_state, done) {
    this.memory.push([state, action, reward, next_state, done]);
  }

  async get_action(state) {
    // console.log('got action')
    const randVal = await tf.randomUniform([1]).arraySync()[0];
    if (randVal <= this.epsilon) {
      if (this.epsilon > this.epsilon_min) {
        this.epsilon *= this.epsilon_decay
      }
      const idx = await tf.randomUniform([1], 0, this.action_size, 'int32').arraySync()[0];
      const act_values = tf.oneHot(idx, this.action_size);
      // console.log(act_values)
      return await act_values.arraySync();
    }
    return await this.model.predict(state).arraySync()[0];
  }

  async train_step(states, actions, rewards, next_states, dones) {
    const targets = await this.model.predict(states).arraySync();

    for (let i = 0; i < dones.length; i++) {
      let q_new = rewards[i];
      if (!dones[i]) {
        const next_state = tf.expandDims(next_states[i], 0);
        q_new = (rewards[i] + this.gamma * tf.argMax(await this.model.predict(next_state).arraySync()[0]));
      }
      targets[i][await tf.argMax(actions[i]).dataSync()[0]] = q_new;
    }

    const history = await this.model.fit(states, targets, { epochs: 1 });
    // console.log(history);
    return history.history.loss[0];
  }
	
  async train_short_memory(state, action, reward, next_state, done) {
    return await this.train_step(tf.tensor(state), tf.tensor(action), tf.tensor(reward), tf.tensor(next_state), tf.tensor(done));
  }

  async train_long_memory() {
    const minibatch = await randomSample(this.memory, min(this.memory.length, this.batch_size));
    let [states, actions, rewards, next_states, dones] = zip(...minibatch);
    console.log(states)
    console.log(actions)
    console.log(rewards)
    console.log(next_states)
    console.log(dones)
    states = tf.squeeze(states);
    actions = tf.squeeze(actions);
    rewards = tf.squeeze(rewards);
    next_states = tf.squeeze(next_states);
    dones = tf.squeeze(dones);
    // states.print();
    return await this.train_step(states, actions, rewards, next_states, dones);
  }
}

const zip = (...arr) => {
  return Array(Math.max(...arr.map(a => a.length))).fill().map((_, i) => arr.map(a => a[i]));
}

const randomSample = async (arr, sampleSize) => {
  let n = arr.length;
  const res = [];
  for (let i = 0; i < sampleSize; i++) {
    const idx = await tf.randomUniform([1], 0, n, 'int32').arraySync()[0];
    [arr[n - 1], arr[idx]] = [arr[idx], arr[n - 1]];
    n--;
    res.push(arr[idx]);
  }
  return res;
}