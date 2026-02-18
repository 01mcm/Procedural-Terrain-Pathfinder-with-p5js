// terrain grid
let cols, rows;
let scl = 20;
// let angle = 0;
let w = 1000;
let h = 1000;

let terrain;
let terrainType;


// path finding and selection
let selectedPoints = [];
let maxPoints = 2;
let path = [];


// view modes and camera
let isTopDownView = false;
let toggleButton;

let topCamX = 0;
let topCamY = 0;
let topCamZ = 800;
let topZoom = 1;

let isPanningTop = false;
let lastPanX = 0;
let lastPanY = 0;

let cam;
let didInit3D = false;

let isMobile = false;


// ui stuff
let newMapButton;
let infoButton;
let pathLegend; 
let costLegend;



// sky and stars
let skyLayer;
let starsLayer;
let stars = [];

const NUM_STARS = 350;



// to calculate the cost depending on the time of day
let selectionStage = null;      // 0...3 indices for day, sunset, night and sunrise
let selectionMultiplier = 1;    // 1,2,3 multipliers



const TERRAIN_IDS = {
  WATER: 0,
  SAND: 1,
  SWAMP: 2,
  GRASS: 3,
  JUNGLE: 4,
  FOREST: 5,
  MOUNTAINS: 6,
  SNOW: 7
};

const TERRAIN_NAME_TO_ID = {
  water: TERRAIN_IDS.WATER,
  sand: TERRAIN_IDS.SAND,
  swamp: TERRAIN_IDS.SWAMP,
  grass: TERRAIN_IDS.GRASS,
  jungle: TERRAIN_IDS.JUNGLE,
  forest: TERRAIN_IDS.FOREST,
  mountain: TERRAIN_IDS.MOUNTAINS,
  snowy: TERRAIN_IDS.SNOW
};


const TERRAIN_COSTS = [
  { name: 'water', cost: Infinity},
  { name: 'sand', cost: 2},
  { name: 'swamp', cost: 5},
  { name: 'grass', cost: 1},
  { name: 'jungle', cost: 4},
  { name: 'forest', cost: 3},
  { name: 'mountain', cost: 6},
  { name: 'snowy', cost: 7},
];

const TERRAIN_LIMITS = {
  water: 0.32,
  sand: 0.38,
  swamp: 0.48,
  grass: 0.62,
  jungle: 0.72,
  forest: 0.80,
  mountains: 0.90,
}

const DAY_LENGTH_SEC = 40;      // full cycle (4 stages)
const STAGE_SEC = 10;           // transition interval
// 4 stages * 10 sec = 40 sec loop

const TOD = [
  // day (first spawn TOD)
  {
    name: "day",
    bg: [150, 190, 255],
    ambient: [120, 140, 180],
    dir: [255, 245, 220],
    dirVec: [-0.4, 0.8, -0.6]
  },
  // sunset 
  {
    name: "sunset",
    bg: [255, 170, 120],
    ambient: [140, 110, 95],
    dir: [255, 180, 120],
    dirVec: [-0.2, 0.3, -0.9]
  },
  // night 
  {
    name: "night",
    bg: [15, 20, 35],
    ambient: [30, 40, 70],
    dir: [80, 110, 180],
    dirVec: [0.1, -0.2, -1.0]
  },
  // sunrise 
  {
    name: "sunrise",
    bg: [255, 190, 150],
    ambient: [120, 110, 120],
    dir: [255, 210, 170],
    dirVec: [0.2, 0.4, -0.9]
  }
];


function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  isMobile = windowWidth < windowHeight;
  
  cam = createCamera();
  
  // ui bar stuff
  uiBar = createDiv();
  uiBar.addClass("ui-bar");
  
  if (isMobile == false) {
    toggleButton = new UIButton(
      "Switch to Top-Down View (click to select points)",
      undefined,
      undefined,
      toggleView
    );
    toggleButton.el.parent(uiBar);
  }
  
  
  cols = floor(w / scl);
  rows = floor(h / scl);
  
  newMapButton = new UIButton(
    "Generate New Map",
    undefined,
    undefined,
    () => generateNewMap(cols, rows)
  );
  newMapButton.el.parent(uiBar);
  
  infoButton = new UIButton(
    "?",
    undefined,
    undefined,
    () => Popup.show({
      title: "How to use",
      text: `• Select points: Top-Down View → SHIFT + Left Click
• Pan: Right Click + Drag
• Zoom: Scroll

Note: You cannot change views or select points in mobile screens.`,
    })
  );
  infoButton.el.parent(uiBar);
  infoButton.el.addClass('info-button');
  
  
//   legends
  pathLegend = new UILegend({
    title: "Path Summary",
    nameToId: TERRAIN_NAME_TO_ID,
    order: TERRAIN_COSTS,
    getColor: (terrainId) => terrainColor(terrainId, 0),
    containerClass: "ui-legend",
    side: "left"
  });
  
  costLegend = new UILegend({
    title: "Terrain Costs",
    nameToId: TERRAIN_NAME_TO_ID,
    order: TERRAIN_COSTS,
    getColor: (terrainId) => terrainColor(terrainId, 0),
    containerClass: "ui-legend",
    side: "right"
  });
  
  showTerrainCosts();
  
  generateNewMap(cols, rows);
  
  skyLayer = createGraphics(windowWidth, windowHeight);
  skyLayer.pixelDensity(1); 
  
  starLayer = createGraphics(windowWidth, windowHeight);
  starLayer.pixelDensity(1);
  


  // random star positions 
  stars = Array.from({ length: NUM_STARS }, () => ({
    x: random(windowWidth),
    y: random(windowHeight * 0.7), 
    r: random(0.1, 0.7)            
  }));

  drawStarsOnce();

}

function generateNewMap(cols, rows){
  selectedPoints = [];
  path = [];
  pathLegend.clear();
  
  noiseSeed(floor(random(1000000)));
  
  terrain = Array.from({ length: cols }, () => Array(rows));
  terrainType = Array.from({ length: cols }, () => Array(rows));

  // sample noise, track min/max
  const raw = Array.from({ length: cols }, () => Array(rows));
  let minN = Infinity;
  let maxN = -Infinity;

  let yOff = 0;
  for (let y = 0; y < rows; y++) {
    let xOff = 0;
    for (let x = 0; x < cols; x++) {
      const n = noise(xOff, yOff);
      raw[x][y] = n;
      if (n < minN) minN = n;
      if (n > maxN) maxN = n;
      xOff += 0.08;
    }
    yOff += 0.1;
  }

  const denom = (maxN - minN) || 1;

  // normalize noise to [0..1] across this map, then classify
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nNorm = (raw[x][y] - minN) / denom;
      terrain[x][y] = map(nNorm, 0, 1, -150, 150);
      terrainType[x][y] = getTerrainType(nNorm);
    }
  }
}

function toggleView() {
  isTopDownView = !isTopDownView;
  
  toggleButton.removeClass("blue");
  
  if (isTopDownView) {
    toggleButton.setText("Top-Down Active | Switch to 3D");
    toggleButton.addClass("blue");
  } else {
    didInit3D = false;
    toggleButton.setText("3D Active | Switch to Top-Down");
  }
}

function draw() {
  const L = getTimeOfDayBlend();

  background(L.bg[0], L.bg[1], L.bg[2]);


  
  if (isTopDownView) {
    ambientLight(L.ambient[0], L.ambient[1], L.ambient[2]);
    directionalLight(L.dir[0], L.dir[1], L.dir[2], L.dirVec[0], L.dirVec[1], L.dirVec[2]);

    
    // top-down camera with pan/zoom
    ortho(
      -width / 2 / topZoom,
       width / 2 / topZoom,
      -height / 2 / topZoom,
       height / 2 / topZoom,
      -5000, 5000
    );

    camera(topCamX, topCamY, topCamZ,  topCamX, topCamY, 0,  0, 1, 0);
    
    // build sky 
    drawSky(L);
    drawSkyBackdrop();
    
    noStroke();
    translate(-w/2, -h/2);
    
    // terrain from top
    for (let y = 0; y < rows-1; y++){
      beginShape(TRIANGLE_STRIP);
      for (let x = 0; x < cols; x++){
        fill(terrainColor(terrainType[x][y], terrain[x][y]));
        vertex(x*scl, y*scl, terrain[x][y]);
        
        fill(terrainColor(terrainType[x][y+1], terrain[x][y+1]));
        vertex(x*scl, (y+1)*scl, terrain[x][y+1]);
      }
      endShape();
    }
    
    // water plane
    const zPlane = map(0.32, 0, 1, -150, 150);
    push();
    translate(w/2, h/2, zPlane + 0.5);
    noLights();
    fill(30, 90, 170, 80);
    plane(w, h);
    pop();
    
  } else {
    // 3D orbit view
    ambientLight(L.ambient[0], L.ambient[1], L.ambient[2]);
    directionalLight(L.dir[0], L.dir[1], L.dir[2], L.dirVec[0], L.dirVec[1], L.dirVec[2]);
    
    perspective();
    
    // build sky 
    drawSky(L);
    drawSkyBackdrop();

    // spawn inside map
    if (!didInit3D) {
      cam.setPosition(0, -400, -200); 
      cam.lookAt(0, 0, 0);
      didInit3D = true;
    }
    
    orbitControl(1, 1, 0.5);
    noStroke();
    
    rotateX(PI/3);
    translate(-w/2, -h/2);
    
    for (let y = 0; y < rows-1; y++){
      beginShape(TRIANGLE_STRIP);
      for (let x = 0; x < cols; x++){
        fill(terrainColor(terrainType[x][y], terrain[x][y]));
        vertex(x*scl, y*scl, terrain[x][y]);
        
        fill(terrainColor(terrainType[x][y+1], terrain[x][y+1]));
        vertex(x*scl, (y+1)*scl, terrain[x][y+1]);
      }
      endShape();
    }
    
    const zPlane = map(0.32, 0, 1, -150, 150);
    push();
    translate(w/2, h/2, zPlane + 0.5);
    noLights();
    fill(30, 90, 170, 80);
    plane(w, h);
    pop();
  }
  
  // draw selected points 
  for (let i = 0; i < selectedPoints.length; i++) {
    let pt = selectedPoints[i];
    push();
    translate(pt.x * scl, pt.y * scl, pt.z + 15);
    
    if (i === 0) {
      ambientMaterial(50, 100, 255);
    } else {
      ambientMaterial(255, 50, 50);
    }
    
    noStroke();
    sphere(10);
    pop();
  }
  
  if (path.length > 0) {
    stroke(0);
    strokeWeight(3);
    noFill();
    
    beginShape();
    for (let i = 0; i < path.length; i++) {
      let pt = path[i];
      vertex(pt.x * scl, pt.y * scl, pt.z + 5);
    }
    endShape();
    
    strokeWeight(1);
  }
}

function clamp(v, a, b) { return max(a, min(b, v)); }

function mouseClicked() {
  if (!isTopDownView) return;
  if (!keyIsDown(SHIFT)) return;
  
  if (mouseX < 500 && mouseY < 50) return;
  
  if (isPanningTop) return false;

  let worldX = topCamX + (mouseX - width / 2) / topZoom;
  let worldY = topCamY + (mouseY - height / 2) / topZoom;

  let mapX = worldX + w / 2;
  let mapY = worldY + h / 2;

  // converting to grid
  let gridX = floor(mapX / scl);
  let gridY = floor(mapY / scl);

  // bounds check
  if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
    if (selectedPoints.length < maxPoints) {
      selectedPoints.push({
        x: gridX,
        y: gridY,
        z: terrain[gridX][gridY]
      });
      
      if (selectedPoints.length === 2) {
        selectionStage = getTimeStageIndex();
        selectionMultiplier = getMultiplierForStage(selectionStage);
        calculatePath();
      }

    } else {
      // reset
      selectedPoints = [{
        x: gridX,
        y: gridY,
        z: terrain[gridX][gridY]
      }];
      
      pathLegend.clear();   
      path = []; 
      selectionStage = null;
      selectionMultiplier = 1;

    }
  }
  
  return false;
}

function mousePressed() {
  if (!isTopDownView) return;

  if (mouseButton === RIGHT) {
    isPanningTop = true;
    lastPanX = mouseX;
    lastPanY = mouseY;
    return false;
  }
}

function mouseDragged() {
  if (!isTopDownView || !isPanningTop) return;

  const dx = mouseX - lastPanX;
  const dy = mouseY - lastPanY;
  lastPanX = mouseX;
  lastPanY = mouseY;

  topCamX -= dx / topZoom;
  topCamY -= dy / topZoom;

  return false;
}

function mouseReleased() {
  isPanningTop = false;
}

function mouseWheel(e) {
  if (!isTopDownView) return;

  const zoomFactor = 1 - e.delta * 0.001;
  topZoom = clamp(topZoom * zoomFactor, 0.25, 6);

  return false; 
}


// A* Pathfinding Algorithm
function calculatePath() {
  let start = selectedPoints[0];
  let goal = selectedPoints[1];
  
  console.log(`\n=== PATHFINDING FROM (${start.x}, ${start.y}) TO (${goal.x}, ${goal.y}) ===`);
  
  // check if start or goal is in water
  if (TERRAIN_COSTS[terrainType[start.x][start.y]].cost === Infinity) {
    console.log("ERROR: Start point is in water!");
    Popup.show({
      title: "Warning: Start point is in water!",
      text: "Paths cannot be created from or to water. Please select points on land."
    })
    selectedPoints = [];
    path = [];
    pathLegend.hide();
    return;
  }
  if (TERRAIN_COSTS[terrainType[goal.x][goal.y]].cost === Infinity) {
    console.log("ERROR: Goal point is in water!");
    Popup.show({
      title: "Warning: Goal point is in water!",
      text: "Paths cannot be created from or to water. Please select points on land."
    })
    selectedPoints = [];
    path = [];
    pathLegend.hide();
    return;
  }
  
  // priority queue implementation
  let openSet = [];
  let closedSet = new Set();
  
  // store g-score (cost from start) and f-score (g + heuristic)
  let gScore = Array.from({ length: cols }, () => Array(rows).fill(Infinity));
  let fScore = Array.from({ length: cols }, () => Array(rows).fill(Infinity));
  let cameFrom = Array.from({ length: cols }, () => Array(rows).fill(null));
  
  // heuristic function (Manhattan distance)
  function heuristic(x, y) {
    return abs(x - goal.x) + abs(y - goal.y);
  }
  
  // init start node
  gScore[start.x][start.y] = 0;
  fScore[start.x][start.y] = heuristic(start.x, start.y);
  openSet.push({x: start.x, y: start.y, f: fScore[start.x][start.y]});
  
  while (openSet.length > 0) {
    // node with lowest f-score
    openSet.sort((a, b) => a.f - b.f);
    let current = openSet.shift();
    
    // check if goal reached
    if (current.x === goal.x && current.y === goal.y) {
      // rebuild path
      path = [];
      let curr = {x: goal.x, y: goal.y};
      
      while (curr !== null) {
        path.unshift({
          x: curr.x,
          y: curr.y,
          z: terrain[curr.x][curr.y]
        });
        curr = cameFrom[curr.x][curr.y];
      }
      
      console.log("\n✓ PATH FOUND!");
      console.log(`Path length: ${path.length} steps`);
      
      // total cost and terrain types
      let totalCost = 0;
      let terrainCount = {};
      
      console.log("\nPath details:");
      for (let i = 0; i < path.length; i++) {
        let pt = path[i];
        let tType = terrainType[pt.x][pt.y];
        let tCost = TERRAIN_COSTS[tType].cost;
        let tName = TERRAIN_COSTS[tType].name;
        
        totalCost += tCost;
        
        terrainCount[tName] = (terrainCount[tName] || 0) + 1;
        
        console.log(`  Step ${i}: (${pt.x}, ${pt.y}) - ${tName} (cost: ${tCost})`);
      }
      
      const finalCost = totalCost * selectionMultiplier;

      const todName = (TOD[selectionStage] && TOD[selectionStage].name) || "unknown";
      const infoText = "Time-of-day at selection: " + todName + " (x" + selectionMultiplier + ")";

      console.log(`Time-of-day at selection: ${todName} (x${selectionMultiplier})`);
      
      console.log("\nTerrain summary:");
      for (let terrain in terrainCount) {
        console.log(`  ${terrain}: ${terrainCount[terrain]} cells`);
      }
      
      console.log(`\n>>> TOTAL PATH COST (with TOD): ${finalCost} <<<\n`);
      console.log(infoText);

      
      
      pathLegend.show(terrainCount, finalCost, infoText);
      
      return;

    }
    
    // add to closed set
    closedSet.add(`${current.x},${current.y}`);
    
    // check neighbors (up, down, left, right)
    let neighbors = [
      {x: current.x - 1, y: current.y},
      {x: current.x + 1, y: current.y},
      {x: current.x, y: current.y - 1},
      {x: current.x, y: current.y + 1},
    ];
    
    for (let neighbor of neighbors) {
      // bounds check
      if (neighbor.x < 0 || neighbor.x >= cols || neighbor.y < 0 || neighbor.y >= rows) {
        continue;
      }
      if (closedSet.has(`${neighbor.x},${neighbor.y}`)) {
        continue;
      }
      
      //terrain cost
      let moveCost = TERRAIN_COSTS[terrainType[neighbor.x][neighbor.y]].cost;
      
      // skip if water 
      if (moveCost === Infinity) {
        continue;
      }
      
      let tentativeGScore = gScore[current.x][current.y] + moveCost;
      
      // ff this path is better than any previous one
      if (tentativeGScore < gScore[neighbor.x][neighbor.y]) {
        cameFrom[neighbor.x][neighbor.y] = {x: current.x, y: current.y};
        gScore[neighbor.x][neighbor.y] = tentativeGScore;
        fScore[neighbor.x][neighbor.y] = tentativeGScore + heuristic(neighbor.x, neighbor.y);
        
        // add to open set if not already there
        if (!openSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
          openSet.push({
            x: neighbor.x,
            y: neighbor.y,
            f: fScore[neighbor.x][neighbor.y]
          });
        }
      }
    }
  }
  
  // no path found
  console.log("✗ NO PATH FOUND!");
  pathLegend.hide();
  Popup.show({
    title: "Warning: No path found!",
    text: "Path cannot be generated. The start or end point is surrounded by water. Please select new points."
  })
  selectedPoints = [];
  path = [];
}


function getTerrainType(n) {
  if (n < TERRAIN_LIMITS.water) return TERRAIN_IDS.WATER;
  if (n < TERRAIN_LIMITS.sand) return TERRAIN_IDS.SAND;
  if (n < TERRAIN_LIMITS.swamp) return TERRAIN_IDS.SWAMP;
  if (n < TERRAIN_LIMITS.grass) return TERRAIN_IDS.GRASS;
  if (n < TERRAIN_LIMITS.jungle) return TERRAIN_IDS.JUNGLE;
  if (n < TERRAIN_LIMITS.forest) return TERRAIN_IDS.FOREST;
  if (n < TERRAIN_LIMITS.mountains) return TERRAIN_IDS.MOUNTAINS;
  return TERRAIN_IDS.SNOW;
}

function terrainColor(t, h) {
  switch (t) {
    case TERRAIN_IDS.WATER:     return color(30, 90, 170);
    case TERRAIN_IDS.SAND:      return color(210, 195, 120);    
    case TERRAIN_IDS.SWAMP:     return color(80, 110, 70);
    case TERRAIN_IDS.GRASS:     return color(90, 170, 90);
    case TERRAIN_IDS.JUNGLE:    return color(40, 120, 60);
    case TERRAIN_IDS.FOREST:    return color(30, 95, 50);
    case TERRAIN_IDS.MOUNTAINS: return color(120, 120, 120);
    case TERRAIN_IDS.SNOW:      return color(240, 245, 250);
    default:          return color(255, 0, 255);
  }
}

function p5ColorToCSS(c) {
  return `rgb(${red(c)}, ${green(c)}, ${blue(c)})`;
}

function showTerrainCosts() {
  const entries = TERRAIN_COSTS.map(t => {
    const terrainId = TERRAIN_NAME_TO_ID[t.name];
    return {
      name: t.name,
      value: t.cost,
      colorId: TERRAIN_NAME_TO_ID[t.name]
    };
  });

  costLegend.showKeyValueRows(entries, {
    valueFormatter: (v) => (v === Infinity ? "Blocked" : v),
    footer: {
      label: "Time-of-day multiplier",
      value: "• day x1\n • sunrise/sunset x2\n • night x3"
    }
  });
}

// smoothstep-ish easing to make transitions feel natural
function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

function lerp3(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

function getTimeOfDayBlend() {
  // seconds since start
  const s = (millis() / 1000) % (STAGE_SEC * TOD.length);  
  const stage = floor(s / STAGE_SEC);                      
  const next = (stage + 1) % TOD.length;

  const localT = (s - stage * STAGE_SEC) / STAGE_SEC;      
  const t = easeInOut(localT);

  const A = TOD[stage];
  const B = TOD[next];

  return {
    bg: lerp3(A.bg, B.bg, t),
    ambient: lerp3(A.ambient, B.ambient, t),
    dir: lerp3(A.dir, B.dir, t),
    dirVec: lerp3(A.dirVec, B.dirVec, t)
  };
}


function getTimeStageIndex() {
  const s = (millis() / 1000) % (STAGE_SEC * TOD.length); 
  return floor(s / STAGE_SEC); // 0..3
}

function getMultiplierForStage(stageIdx) {
  const name = TOD[stageIdx].name;
  if (name === "day") return 1;
  if (name === "night") return 3;
  // sunrise or sunset
  return 2;
}


function clamp01(x){ return max(0, min(1, x)); }

function getNightAmount(L){
  const brightness = (L.bg[0] + L.bg[1] + L.bg[2]) / (3 * 255); 
  return clamp01(1.2 - brightness * 1.6); 
}


function drawSky(L){
  skyLayer.noStroke();
  skyLayer.fill(L.bg[0], L.bg[1], L.bg[2], 255);
  skyLayer.rect(0, 0, skyLayer.width, skyLayer.height);

  const nightAmt = getNightAmount(L);
  const alpha = 255 * nightAmt;
  if (alpha < 2) return;

  skyLayer.push();
  skyLayer.blendMode(ADD);          
  skyLayer.image(starLayer, 0, 0);  
  skyLayer.pop();

  skyLayer.fill(L.bg[0], L.bg[1], L.bg[2], 255 - alpha);
  skyLayer.rect(0, 0, skyLayer.width, skyLayer.height);
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  skyLayer = createGraphics(windowWidth, windowHeight);
  skyLayer.pixelDensity(1);
  
  starLayer = createGraphics(windowWidth, windowHeight);
  starLayer.pixelDensity(1);
  

  stars = Array.from({ length: NUM_STARS }, () => ({
    x: random(windowWidth),
    y: random(windowHeight * 0.7),
    r: random(0.1, 0.7)
  }));
  
  drawStarsOnce();

}

function drawStarsOnce(){
  starLayer.clear();
  starLayer.noStroke();
  starLayer.fill(255);

  for (const s of stars) {
    starLayer.circle(s.x, s.y, s.r);
  }
}

function drawSkyBackdrop() {
  push();
  resetMatrix();
  noLights();
  noStroke();

  drawingContext.disable(drawingContext.DEPTH_TEST);

  scale(-1, 1, 1);
  texture(skyLayer);

  sphere(5000, 24, 16);

  drawingContext.enable(drawingContext.DEPTH_TEST);
  pop();
}


