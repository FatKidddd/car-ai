/* eslint-disable no-undef */
let scribble = new Scribble();

function drawRect(x, y, w, h, color, haveBorder = true) {
  scribble.bowing = 0.1;
  scribble.roughness = 0.8;
  if (haveBorder) {
    strokeWeight(5);
    stroke(0);
    scribble.scribbleRect(x, y, w, h);
  }

  let borderOffset = 1;
  let xl= x - w / 2 + borderOffset;
  let xr= x + w / 2 - borderOffset;
  let yt = y - h / 2 + borderOffset;
  let yb = y + h / 2 - borderOffset;
  
  // reduce the sizes to fit in the rect
  if (yt>yb) {
    yt -= borderOffset;
    yb += borderOffset;
  } else {
    yt += borderOffset;
    yb -= borderOffset;
  }
  let xCoords = [xl, xr, xr, xl];
  let yCoords = [yt, yt, yb, yb];
  // the gap between two hachure lines
  let gap = 3.5;
  // the angle of the hachure in degrees
  let angle = 315;
  strokeWeight(3);
  stroke(...color);
  scribble.scribbleFilling(xCoords, yCoords, gap, angle);
}

class Rect {
  constructor(w, h, color, pos, angle, haveBorder = true) {
    this.w = w;
    this.h = h;
    this.angle = angle;
    this.color = color;
    this.pos = pos;
    this.haveBorder = haveBorder;
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    drawRect(0, 0, this.w, this.h, this.color, this.haveBorder);
    translate(-this.pos.x, -this.pos.y);
    pop();
    // this.displayArms();
    this.botRightCorner;
  }

  displayArms() {
    stroke(255, 0, 0);
    strokeWeight(1);
    scribble.scribbleLine(this.pos.x, this.pos.y, ...this.topLeftCorner);
    scribble.scribbleLine(this.pos.x, this.pos.y, ...this.topRightCorner);
    scribble.scribbleLine(this.pos.x, this.pos.y, ...this.botLeftCorner);
    scribble.scribbleLine(this.pos.x, this.pos.y, ...this.botRightCorner);
  }

  get cornerDets() {
    let x = this.pos.x, y = this.pos.y;
    let hw = this.w / 2, hh = this.h / 2;
    let armLen = sqrt(hw * hw + hh * hh);
    let basicAngle = atan(hh / hw);
    return { x, y, armLen, basicAngle };
  }

  displayCorner(res) {
    push();
    strokeWeight(10)
    point(res[0], res[1]);
    pop();
  }

  get botLeftCorner() {
    const { x, y, armLen, basicAngle } = this.cornerDets;
    let newAngle = basicAngle + this.angle;
    const res = [x - armLen * cos(newAngle), y - armLen * sin(newAngle)];
    return res;
  }

  get topLeftCorner() {
    const { x, y, armLen, basicAngle } = this.cornerDets;
    let newAngle = basicAngle - this.angle;
    const res = [x + armLen * cos(newAngle), y - armLen * sin(newAngle)];
    return res;
  }

  get topRightCorner() {
    const { x, y, armLen, basicAngle } = this.cornerDets;
    let newAngle = basicAngle + this.angle;
    const res = [x + armLen * cos(newAngle), y + armLen * sin(newAngle)];
    return res;
  }

  get botRightCorner() {
    const { x, y, armLen, basicAngle } = this.cornerDets;
    let newAngle = basicAngle - this.angle;
    const res = [x - armLen * cos(newAngle), y + armLen * sin(newAngle)];
    return res;
  }
}

class Car extends Rect {
  constructor() {
    super(35, 20, [0, 50, 180], createVector(0, 0), 0);
    this.vel = createVector(0, 0);
    this.mass = 150;
    this.rayLen = 60;
  }

  applyForce(f) {
    let scl = 30;
    stroke([255, 0, 0])
    scribble.scribbleLine(this.pos.x, this.pos.y, this.pos.x + f.x * scl, this.pos.y + f.y * scl);
    this.vel.add(f);
    // this.vel.limit(10);
    if (this.vel.mag() > 0) {
      this.angle = this.vel.heading();
    }
  }

  move() {
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
    backAcc.div(this.mass * 10);
    backAcc.mult(-1);
    backAcc.limit(this.vel.mag());
    this.applyForce(backAcc);
  }

  steer(dir) {
    let frictionAngle = this.vel.heading() + PI/2 * dir;
    let friction = new p5.Vector.fromAngle(frictionAngle);
    friction.mult(this.vel.magSq() / this.mass);
    this.applyForce(friction);
  }

  rayTrace(coords, originCoords) {
    for (let i = 1; i < coords.length; i++) {
      const x1 = coords[i - 1][0], x2 = coords[i][0], y1 = coords[i - 1][1], y2 = coords[i][1];
      const x3 = originCoords[0][0], x4 = originCoords[1][0], y3 = originCoords[0][1], y4 = originCoords[1][1];
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
      const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
      if (0 <= t && t <= 1 && 0 <= u && u <= 1) {
        const intersection = createVector(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
        const copied = intersection.copy();
        copied.sub(createVector(originCoords[0][0], originCoords[0][1]));
        line(...originCoords[0], intersection.x, intersection.y);
        return copied.mag();
      }
    }
    return this.rayLen;
  }
    
  getRay(coords, angle) {
    const ox = coords[0], oy = coords[1];
    const v = this.vel.copy();
    v.rotate(angle);
    v.setMag(this.rayLen);
    return [[ox, oy], [ox + v.x, oy + v.y]];
  }

  detectBoundaries(coords) {
    const res = [
      this.rayTrace(coords, this.getRay(this.topLeftCorner, -PI / 2)),
      this.rayTrace(coords, this.getRay(this.topLeftCorner, 0)),
      this.rayTrace(coords, this.getRay(this.topRightCorner, 0)),
      this.rayTrace(coords, this.getRay(this.topRightCorner, PI / 2))
    ];
    return res;
  }
}

let noOfRoads = 200;
let roadHeight = 120; // width and height are flipped for all including car because of the angle.
let roadLength = 100;

let leftWallCoords = [[0, -roadHeight / 2]];
let rightWallCoords = [[0, roadHeight / 2]];

function displayTrack() {
  for (let i = 1; i <= noOfRoads; i++) {
    const left = leftWallCoords.slice(i - 1, i + 1);
    const right = rightWallCoords.slice(i - 1, i + 1);
    // line(...left[0], ...left[1]);
    // line(...right[0], ...right[1]);
    push();
    // strokeWeight(10);
    stroke(0, 255, 0);
    // point(...left[0]);
    // stroke(0, 0, 255);
    // point(...right[0]);
    // stroke(123, 0, 123);
    // point(...left[1]);
    // stroke(214, 52, 123);
    // point(...right[1]);
    fill(255);
    // noStroke();
    quad(...left[0], ...left[1], ...right[1], ...right[0]);
    pop();
  }
}

let car;

let windowWidth = 1200;
let windowHeight = 600;

function setup() {
  createCanvas(windowWidth, windowHeight);
  car = new Car();
  for (let i = 0, c = 0; i < noOfRoads; i++, c += 0.1) {
    let angle = map(noise(c), 0, 1, -1, 1) * PI / 2;
    const leftCoords = leftWallCoords[leftWallCoords.length - 1];
    const rightCoords = rightWallCoords[rightWallCoords.length - 1];
    const centreX = (leftCoords[0] + rightCoords[0]) / 2;
    const centreY = (leftCoords[1] + rightCoords[1]) / 2;
    const newCentreX = centreX + roadLength * cos(angle);
    const newCentreY = centreY + roadLength * sin(angle);
    const newLeftX = newCentreX + roadHeight / 2 * cos(PI / 2 - angle);
    const newLeftY = newCentreY - roadHeight / 2 * sin(PI / 2 - angle);
    const newRightX = newCentreX - roadHeight / 2 * cos(PI / 2 - angle);
    const newRightY = newCentreY + roadHeight / 2 * sin(PI / 2 - angle);
    leftWallCoords.push([newLeftX, newLeftY]);
    rightWallCoords.push([newRightX, newRightY]);
  }
}

function draw() {
  background(200);
  translate(windowWidth/2, windowHeight/2);
  translate(-car.pos.x, -car.pos.y);

  displayTrack();

  // push();
  car.move();
  car.display();
  // pop();
  if (keyIsDown(UP_ARROW)) car.accelerate();
  if (keyIsDown(LEFT_ARROW)) car.steer(-1);
  if (keyIsDown(RIGHT_ARROW)) car.steer(1);
  if (keyIsDown(DOWN_ARROW)) car.brake();
  car.drag();
  car.detectBoundaries(leftWallCoords);
  car.detectBoundaries(rightWallCoords);
}

// function keyPressed() {
  //   let forwardAcc = createVector(cos(car.angle - PI/2), sin(car.angle - PI/2));
//   forwardAcc.setMag(1);
//   switch (keyCode) {
//     case UP_ARROW:
//       car.applyForce(forwardAcc);
//       break;
//     case LEFT_ARROW:
//       car.angle -= 0.5;
//       break;
//       // car.applyForce(forwardAcc);
//     case RIGHT_ARROW:
//       car.angle += 0.5;
//       break;
//     default:
//       console.log("You pressed a random key");
//       break;
//   }
// }
