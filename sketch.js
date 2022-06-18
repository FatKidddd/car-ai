/* eslint-disable no-undef */

class Rect {
  constructor(w, h, color, pos, angle) {
    this.w = w;
    this.h = h;
    this.angle = angle;
    this.color = color;
    this.pos = pos;
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    strokeWeight(5);
    stroke(0);
    rect(-this.w / 2, -this.h / 2, this.w, this.h);
    translate(-this.pos.x, -this.pos.y);
    pop();
    // this.displayArms();
  }

  displayArms() {
    stroke(255, 0, 0);
    strokeWeight(1);
    line(this.pos.x, this.pos.y, ...this.topLeftCorner);
    line(this.pos.x, this.pos.y, ...this.topRightCorner);
    line(this.pos.x, this.pos.y, ...this.botLeftCorner);
    line(this.pos.x, this.pos.y, ...this.botRightCorner);
  }

  get cornerDets() {
    let x = this.pos.x, y = this.pos.y;
    let hw = this.w / 2, hh = this.h / 2;
    let armLen = sqrt(hw * hw + hh * hh);
    let basicAngle = atan(hh / hw);
    return { x, y, armLen, basicAngle };
  }

  displayPoint(res) {
    push();
    strokeWeight(10)
    point(res[0], res[1]);
    pop();
  }

  get botLeftCorner() {
    const { x, y, armLen, basicAngle } = this.cornerDets;
    let newAngle = basicAngle + this.angle;
    const res = [x - armLen * cos(newAngle), y - armLen * sin(newAngle)];
    // this.displayPoint(res);
    return res;
  }

  get topLeftCorner() {
    const { x, y, armLen, basicAngle } = this.cornerDets;
    let newAngle = basicAngle - this.angle;
    const res = [x + armLen * cos(newAngle), y - armLen * sin(newAngle)];
    // this.displayPoint(res);
    return res;
  }

  get topRightCorner() {
    const { x, y, armLen, basicAngle } = this.cornerDets;
    let newAngle = basicAngle + this.angle;
    const res = [x + armLen * cos(newAngle), y + armLen * sin(newAngle)];
    // this.displayPoint(res);
    return res;
  }

  get botRightCorner() {
    const { x, y, armLen, basicAngle } = this.cornerDets;
    let newAngle = basicAngle - this.angle;
    const res = [x - armLen * cos(newAngle), y + armLen * sin(newAngle)];
    // this.displayPoint(res);
    return res;
  }

  get topCenter() {
    const copiedPos = this.pos.copy();
    const v = createVector(this.w / 2, 0);
    v.rotate(this.angle);
    copiedPos.add(v);
    const res = [copiedPos.x, copiedPos.y];
    // this.displayPoint(res);
    return res;
  }
}

class Car extends Rect {
  constructor(pos, angle) {
    super(35, 20, [0, 50, 180], pos, angle);
    this.vel = createVector(0, 0);
    this.mass = 150;
    this.rayLen = 200;
    this.wallThreshold = 10;
    this.velCap = 100;
  }

  applyForce(f) {
    this.vel.add(f);
    this.vel.limit(this.velCap);
    if (this.vel.mag() > 0) {
      this.angle = this.vel.heading();
    }
  }

  move() {
    this.drag();
    this.pos.add(this.vel);
  }

  drag() {
    let f = this.vel.copy();
    f.mult(-1);
    f.setMag(this.vel.magSq() / this.mass);
    this.applyForce(f);
    if (this.vel.mag() < 0.3) this.vel.mult(0);
  }

  accelerate() {
    let forwardAcc = new p5.Vector.fromAngle(this.angle);
    this.applyForce(forwardAcc);
  }

  brake() {
    let backAcc = this.vel.copy();
    backAcc.mult(-0.2);
    backAcc.limit(this.vel.mag());
    this.applyForce(backAcc);
  }

  steer(dir) {
    let frictionAngle = this.vel.heading() + PI/2 * dir;
    let friction = new p5.Vector.fromAngle(frictionAngle);
    friction.mult(this.vel.magSq() / this.mass);
    this.applyForce(friction);
  }

  checkRayIntersect(x1, x2, y1, y2, x3, x4, y3, y4) {
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
    const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
    return [0 <= t && t <= 1 && 0 <= u && u <= 1, t];
  }

  rayTrace(leftWallCoords, rightWallCoords, originCoords, showRay) {
    const intersections = [];
    for (let j = 0; j < 2; j++) {
      let coords = leftWallCoords;
      if (j === 1) coords = rightWallCoords;
      for (let i = 1; i < coords.length; i++) {
        const x1 = coords[i - 1][0], x2 = coords[i][0], y1 = coords[i - 1][1], y2 = coords[i][1];
        const x3 = originCoords[0][0], x4 = originCoords[1][0], y3 = originCoords[0][1], y4 = originCoords[1][1];
        const [doesIntersect, t] = this.checkRayIntersect(x1, x2, y1, y2, x3, x4, y3, y4);
        if (doesIntersect) {
          const intersection = createVector(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
          intersections.push(intersection);
        }
      }
    }
    let idx = -1;
    let res = 1e9;
    for (let i = 0; i < intersections.length; i++) {
      const copied = intersections[i].copy();
      copied.sub(createVector(originCoords[0][0], originCoords[0][1]));
      const mag = copied.mag();
      if (mag < res) res = mag, idx = i;
    }
    stroke([255, 0, 0]);
    if (idx === -1) {
      if (showRay) {
        line(...originCoords[0], ...originCoords[1]);
      }
      return this.rayLen;
    }
    if (showRay) {
      line(...originCoords[0], intersections[idx].x, intersections[idx].y);
    }
    return res;
  }
    
  getRay(coords, angle) {
    const ox = coords[0], oy = coords[1];
    let v = new p5.Vector.fromAngle(this.angle);
    v.rotate(angle);
    v.setMag(this.rayLen);
    return [[ox, oy], [ox + v.x, oy + v.y]];
  }

  detectBoundaries(leftWallCoords, rightWallCoords, showRay) {
    const res = [
      this.rayTrace(leftWallCoords, rightWallCoords, this.getRay(this.topLeftCorner, -PI / 2), showRay),
      this.rayTrace(leftWallCoords, rightWallCoords, this.getRay(this.topLeftCorner, -PI / 4), showRay),
      this.rayTrace(leftWallCoords, rightWallCoords, this.getRay(this.topCenter, 0), showRay),
      this.rayTrace(leftWallCoords, rightWallCoords, this.getRay(this.topRightCorner, PI / 4), showRay),
      this.rayTrace(leftWallCoords, rightWallCoords, this.getRay(this.topRightCorner, PI / 2), showRay)
    ];
    return res;
  }

  getInputs(leftWallCoords, rightWallCoords, showRay=false) {
    const res = this.detectBoundaries(leftWallCoords, rightWallCoords, showRay);
    const threshold = this.wallThreshold;
    let gameEnded = false;
    for (const val of res) {
      if (val <= threshold) {
        gameEnded = true;
      }
    }
    
    // normalize inputs
    for (let i = 0; i < res.length; i++) {
      res[i] /= this.rayLen;
    }
    res.push(this.vel.mag() / this.velCap);
    // console.log(res)
    return [res, gameEnded];
  }

  get bodyLine() {
    const topCenter = createVector(...this.topCenter);
    const dir = new p5.Vector.fromAngle(this.angle);
    dir.setMag(this.w);
    const botCenter = topCenter.copy();
    botCenter.sub(dir);
    return [[botCenter.x, botCenter.y], [topCenter.x, topCenter.y]];
  }

  passCheckpoint(track) {
    const checkpoints = track.checkpoints;
    const bodyLineCoords = this.bodyLine;
    for (let i = 0; i < checkpoints.length; i++) {
      const checkpoint = checkpoints[i];
      const x1 = checkpoint[0][0], y1 = checkpoint[0][1], x2 = checkpoint[1][0], y2 = checkpoint[1][1];
      const x3 = bodyLineCoords[0][0], y3 = bodyLineCoords[0][1], x4 = bodyLineCoords[1][0], y4 = bodyLineCoords[1][1];
      const [doesIntersect, t] = this.checkRayIntersect(x1, x2, y1, y2, x3, x4, y3, y4);
      if (doesIntersect) {
        // this.color = [0, 180, 50];
        if (i === Math.floor((checkpoints.length - 1)/ 2)) {
          this.nearEnd(track);
        }
        return true;
      }
    }
    // this.color = [0, 50, 180];
    return false;
  }

  nearEnd(track) {
    track.checkpoints.shift();
    track.leftWallCoords.shift();
    track.rightWallCoords.shift();
    track.generateTile();
  }
}

class Track {
  // infinite track generation
  constructor(noOfRoads, roadHeight, roadLength) {
    this.leftWallCoords = [[0, -roadHeight/2]];
    this.rightWallCoords = [[0, roadHeight/2]];
    this.noOfRoads = noOfRoads;
    this.roadHeight = roadHeight;
    this.roadLength = roadLength;
    this.checkpoints = [];
    this.generateTrack();
  }

  get wallCoords() {
    return [this.leftWallCoords, this.rightWallCoords];
  }
  
  generateTile() {
    const maxTurn = PI / 2;
    const angle = map(noise(noiseInput), 0, 1, -1, 1) * maxTurn;
    const leftCoords = this.leftWallCoords[this.leftWallCoords.length - 1];
    const rightCoords = this.rightWallCoords[this.rightWallCoords.length - 1];
    const centreX = (leftCoords[0] + rightCoords[0]) / 2;
    const centreY = (leftCoords[1] + rightCoords[1]) / 2;
    const newCentreX = centreX + this.roadLength * cos(angle);
    const newCentreY = centreY + this.roadLength * sin(angle);
    const newLeftX = newCentreX + this.roadHeight / 2 * cos(PI / 2 - angle);
    const newLeftY = newCentreY - this.roadHeight / 2 * sin(PI / 2 - angle);
    const newRightX = newCentreX - this.roadHeight / 2 * cos(PI / 2 - angle);
    const newRightY = newCentreY + this.roadHeight / 2 * sin(PI / 2 - angle);
    this.leftWallCoords.push([newLeftX, newLeftY]);
    this.rightWallCoords.push([newRightX, newRightY]);
    this.checkpoints.push([[newLeftX, newLeftY], [newRightX, newRightY]]);
    noiseInput += 0.1; // the higher the number the more random the noise
    return [newCentreX, newCentreY, angle];
  }
  
  generateTrack() {
    let prevCentreX, prevCentreY;
    for (let i = 0; i < this.noOfRoads; i++) {
      const [newCentreX, newCentreY, angle] = this.generateTile();
      if (i === Math.floor((this.noOfRoads - 1)/2)) {
        car = new Car(createVector((prevCentreX + newCentreX)/2, (prevCentreY + newCentreY)/2), angle, track);
      }
      prevCentreX = newCentreX, prevCentreY = newCentreY;
    }
  }

  displayTrack(showCheckpoints=false) {
    for (let i = 1; i < this.leftWallCoords.length; i++) {
      const left = this.leftWallCoords.slice(i - 1, i + 1);
      const right = this.rightWallCoords.slice(i - 1, i + 1);
      push();
      // strokeWeight(10);
      fill(255);
      noStroke();
      quad(...left[0], ...left[1], ...right[1], ...right[0]);

      stroke(0, 50, 200);
      strokeWeight(10)
      line(...left[0], ...left[1]);
      line(...right[0], ...right[1]);

      if (showCheckpoints) {
        stroke(0, 150, 0);
        strokeWeight(2);
        line(...left[1], ...right[1]);
      }
      pop();
    }
  }
}

let windowWidth = 600;
let windowHeight = 600;
let roadHeight = 100;
let roadLength = 60;
let noOfRoads = Math.floor((windowWidth + windowHeight) / roadLength);
let noiseInput = 0;

let car, track;
let episode = 0;
const losses = [];
const dqn = new DQNAgent(6, 4, 1000);

let globalDone = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  track = new Track(noOfRoads, roadHeight, roadLength);
}

async function draw() {
  background(200);
  translate(windowWidth / 2, windowHeight / 2);
  translate(-car.pos.x, -car.pos.y);

  track.displayTrack(false);

  let [state, _] = car.getInputs(...track.wallCoords);

  state = tf.tensor2d(state, [1, state.length]);

  if (!globalDone) {
    action = await dqn.get_action(state);
    const argMaxedAction = await tf.argMax(action).dataSync()[0];
    switch (argMaxedAction) {
      case 0:
        car.accelerate();
        break;
      case 1:
        car.accelerate();
        car.steer(-1);
        break;
      case 2:
        car.accelerate();
        car.steer(1);
        break;
      // case 3:
      //   car.brake();
      //   break;
      default: // do nothing
        break;
    }
    car.move();
  }
  car.display();

  let [next_state, done] = car.getInputs(...track.wallCoords, showRay=true);

  let reward = Number(car.passCheckpoint(track)) * 5;// + car.vel.mag();
  if (done) reward = -200;

  // train
  if (!globalDone) {
    // convert everything to javascript array first and with the correct dims, commented shape
    state = await state.arraySync(); // (1, state_size)
    action = [action]; // (1, action_size)
    next_state = [next_state];
    reward = [reward]; // (1,)
    done1d = [done]; // (1,)
    dqn.remember(state, action, reward, next_state, done1d);
    globalDone = true;
    // train short memory removed because it makes the game laggy
    // await dqn.train_short_memory(state, action, reward, next_state, done1d); 
    if (done) {
      const loss = await dqn.train_long_memory();
      losses.push(loss);
      ++episode;
      console.log('Episode ' + episode + ' - loss: ' + loss);
      track = new Track(noOfRoads, roadHeight, roadLength);
    }
    globalDone = false;
  }
}

  // if (keyIsDown(UP_ARROW)) car.accelerate();
  // if (keyIsDown(LEFT_ARROW)) {
  //   car.accelerate();
  //   car.steer(-1);
  // }
  // if (keyIsDown(RIGHT_ARROW)) {
  //   car.accelerate();
  //   car.steer(1);
  // }
  // if (keyIsDown(DOWN_ARROW)) car.brake();
