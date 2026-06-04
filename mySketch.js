const UI = {
  ts: 14,   // Text size
  sf: 1.5,  // Scale factor (1.5x scaled up)
  bh: 30,   // Bar height
  rad: 8,   // Radius
  ind: 20,  // Indentation
  bw: 130   // Base width
};

const BOLD = 'bold';
const NORMAL = 'normal';
const userVariables = [];
const BLOCK_MENUS = {};
const loadedImages = [];
const loadedImageNames = [];
let currentImageIcon = null;

// Built-in slot editing state tracking
let editingSlot = null;

// Execution state tracking for deferred live rendering
let renderBlocks = []; 

const blockSetups = [
  { name: 'setup + styles + rect', children: ['strokeWeight', 'stroke', 'fill', 'rect'] },
  { name: 'setup + styles + circle', children: ['strokeWeight', 'stroke', 'fill', 'circle'] },
  { name: 'setup + styles + ellipse', children: ['strokeWeight', 'stroke', 'fill', 'ellipse'] },
//  { name: 'setup + styles + triangle', children: ['strokeWeight', 'stroke', 'fill', 'triangle'] },

];

let currentSetupIndex = 0;
let activeBlocks = [];
let liveStrokeWeight = 1;
let currentLevel = 1
let pointIcon, textIcon, lineIcon, rectangleIcon, triangleIcon, ellipseIcon, circleIcon, arcIcon;
let gameState = 'PLAY'

function preload() {
  let names = ['pointIcon', 'textIcon', 'lineIcon', 'rectangleIcon', 'triangleIcon', 'ellipseIcon', 'circleIcon', 'arcIcon'];

	  for (let name of names) {
    window[name] = loadImage(name + '.png');
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  selectSetup(0);
	angleMode(DEGREES);
}

function draw() {
if (typeof gameState !== 'undefined' && gameState === 'WIN') {
    drawWinScreen();
    return; // Exit out early to prevent drawing the interactive panels
  }
	
  background('#aa5533');
  leftPanelW = width / 3;
  rightPanelT = 100;
  rightPanelH = height - rightPanelT;
  
  // ------------------------------------------
  // DRAW RIGHT PANEL (2/3 Width Full Live Render)
  // ------------------------------------------
  fill('#fafafa');
  rect(leftPanelW, rightPanelT, width - leftPanelW, rightPanelH);
  drawLiveViewport(leftPanelW);

  // ------------------------------------------
  // DRAW HEADER / CONTROL AREA ABOVE LIVE RENDER
  // ------------------------------------------
  fill('#f0f2f5');
  noStroke();
  rect(leftPanelW, 0, width - leftPanelW, rightPanelT);

  let btnX = leftPanelW + 20;
  let btnY = rightPanelT - 80;
  let btnW = 110;
  let btnH = 40;

  textSize(14);
  textStyle(BOLD);
fill(0)
	textAlign(LEFT)
	text('mouseX: ' + round(mouseX - leftPanelW) + '   mouseY: ' + round(mouseY - (height - rightPanelH)), btnX, btnY + btnH * 1.2)

  
  // Render full nested container block trees
  for (let b of activeBlocks) {
    b.draw();
  }

  // Calculate the bottom threshold layout bound of the block tree rendering space
  let blocksBottom = 0;
  for (let b of activeBlocks) {
    if (b.y !== undefined && b.h !== undefined) {
      blocksBottom = max(blocksBottom, b.y + b.h);
    }
  }
  if (blocksBottom === 0) blocksBottom = height / 2 + 60;

// Render Interactive Performance Task Validation Elements

  // Draw Onscreen Progression Graphical Button
  let nextBtnX = 20;
  let nextBtnY = promptY + 15;
  let nextBtnW = leftPanelW - 40;
  let nextBtnH = 40;

if (keyIsDown(71)) { 
  push();
	labelSize = 7 * UI.sf
  textSize(labelSize);
  let simLeft = leftPanelW;
  let simTop = rightPanelT;
  let simH = rightPanelH;
  let simW = width - leftPanelW;

  // 1. Calculate which grid lines (in steps of 25) the mouse is closest to
  let closestX = Math.round((mouseX - simLeft) / 25) * 25;
  let closestY = Math.round((mouseY - simTop) / 25) * 25;

  for (let x = 0; x <= simW; x += 25) {
    let gridX = simLeft + x;
    stroke(0, 100, 255, 60); 
    strokeWeight(1);
    line(gridX, simTop, gridX, simTop + simH);
    noStroke();
    fill(50);
    textAlign(CENTER, BOTTOM);
    
    // 2. Set to BOLD if this x matches the closest grid line
    if (x === closestX) {
      textStyle(BOLD);
		strokeWeight(5)
		textSize(labelSize * 1.5)
    } else {
      textStyle(NORMAL);
		strokeWeight(1)
		textSize(labelSize)
    }

    let stagger = (x % 50 === 0) ? 5 : 0;
    text(x, gridX, simTop - 4 * UI.sf - stagger);
  }

  for (let y = 0; y <= simH; y += 25) {
    let gridY = simTop + y;
    stroke(0, 100, 255, 60);
    strokeWeight(1);
    line(simLeft, gridY, simLeft + simW, gridY);
    noStroke();
    fill(50);
    textAlign(RIGHT, CENTER);

    // 3. Set to BOLD if this y matches the closest grid line
    if (y === closestY) {
      textStyle(BOLD);
		strokeWeight(5)
			textSize(labelSize * 1.5)
    } else {
      textStyle(NORMAL);
		strokeWeight(1)
		textSize(labelSize)
    }

    text(y, simLeft - 6 * UI.sf, gridY);
  }
  pop();
}
textAlign(RIGHT)
	text('hold G key to view grid', leftPanelW - 10, height - 20)
}

function yOffsetForCheck(baseY, offset) {
  return baseY + offset;
}

// ==========================================
// 3. TASK COMPLETION CONDITION VALIDATOR
// ==========================================

function searchBlockTreeByType(b, type) {
  if (b.type === type) return b;
  if (b.children) {
    for (let child of b.children) {
      let found = searchBlockTreeByType(child, type);
      if (found) return found;
    }
  }
  if (b.elseChildren) {
    for (let child of b.elseChildren) {
      let found = searchBlockTreeByType(child, type);
      if (found) return found;
    }
  }
  return null;
}

function mousePressed() {
  let leftPanelW = width / 3;
  let btnX = leftPanelW + 20;
  let btnY = rightPanelT - 80;
  let btnW = 110;
  let btnH = 40;
  if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
    renderBlocks = activeBlocks.map(cloneBlockTree);
    return;
  }

  // Handle Advancement Button Click Logic
  let blocksBottom = 0;
  for (let b of activeBlocks) {
    if (b.y !== undefined && b.h !== undefined) {
      blocksBottom = max(blocksBottom, b.y + b.h);
    }
  }
  if (blocksBottom === 0) blocksBottom = height / 2 + 60;
  let promptY = blocksBottom + 40 + 25 + (currentPrompts.length * 32);
  let nextBtnX = 20;
  let nextBtnY = promptY + 15;
  let nextBtnW = leftPanelW - 40;
  let nextBtnH = 40;

if (mouseX >= nextBtnX && mouseX <= nextBtnX + nextBtnW && mouseY >= nextBtnY && mouseY <= nextBtnY + nextBtnH) {
  let checkAllSatisfied = currentPrompts.length > 0;
  for (let p of currentPrompts) {
    if (!evaluatePromptSatisfaction(p)) {
      checkAllSatisfied = false;
    }
  }
}

	// Recalculate promptY base coordinate exactly like the layout engine does
blocksBottom = 0;
for (let b of activeBlocks) {
  if (b.y !== undefined && b.h !== undefined) {
    blocksBottom = max(blocksBottom, b.y + b.h);
  }
}
if (blocksBottom === 0) blocksBottom = height / 2 + 60;
promptY = blocksBottom + 40;
}

function triggerGlobalLayoutRefresh() {
  repositionBlock();
}

function selectSetup(index) {
  currentSetupIndex = index; // cite: 2
  let setupData = blockSetups[index]; // cite: 3

  let setupContainer = new Block('function setup'); // cite: 4
  currentPrompts = []; // cite: 5

  // Identify if we are currently handling the "fill + text" level
  let isFillTextLevel = (setupData.name && setupData.name.toLowerCase().includes('fill') && setupData.name.toLowerCase().includes('text')) || 
                        (setupData.children.includes('fill') && setupData.children.includes('text'));

  for (let type of setupData.children) { // cite: 6
    let childBlock = new Block(type); // cite: 7
    childBlock.parent = setupContainer; // cite: 8

    // Apply custom initial values for the 'fill' blocks based on the level context
    if (type === 'fill') {
      if (isFillTextLevel) {
        childBlock.args = [0, 0, 0];          // Level specific: Start at Black
      } else {
        childBlock.args = [255, 255, 255];    // Default: Start at White
      }
    }

    setupContainer.children.push(childBlock); // cite: 9

    if (PROMPT_DICTIONARY[type]) { // cite: 10
      let stringPool = PROMPT_DICTIONARY[type]; // cite: 11
      let selectedPrompt = random(stringPool); // cite: 12
      let modifiedText = selectedPrompt; // cite: 15

      let lowerPrompt = selectedPrompt.toLowerCase();
      let randVal = 0;

      if (
        lowerPrompt.includes('move') || 
        lowerPrompt.includes(' x ') || 
        lowerPrompt.includes(' y ') || 
        lowerPrompt.includes('position') || // Catches "x position" and "y position"
        lowerPrompt.includes('bottom')
      ) {
        randVal = floor(random(-10, 800)); // Range: 0 to 600
      } else if (
        lowerPrompt.includes('color') || 
        lowerPrompt.includes('red') || 
        lowerPrompt.includes('green') || 
        lowerPrompt.includes('blue') || 
        lowerPrompt.includes('black') ||
        lowerPrompt.includes('grey')
      ) {
        randVal = floor(random(0, 255)); // Range: 0 to 255
      } else if (lowerPrompt.includes('strokeweight')) {
        randVal = floor(random(0, 51));  // Range: 0 to 50
      } else if (
        lowerPrompt.includes('w') || 
        lowerPrompt.includes('width') || 
        lowerPrompt.includes('h') || 
        lowerPrompt.includes('height') || 
        lowerPrompt.includes('larger') || 
        lowerPrompt.includes('smaller') ||
        lowerPrompt.includes('diameter') || // Fits size changes for circles
        lowerPrompt.includes('perfect square') ||
        lowerPrompt.includes('perfect circle')
      ) {
        randVal = floor(random(10, 800)); // Range: 10 to 400
      } else {
        randVal = floor(random(0, 255)); // Fallback baseline
      }

  // Keep weightRandVal separate for dedicated strokeWeight placeholders if needed
      let weightRandVal = floor(random(0, 50)); 
      let finalTargetValue = randVal; // Track which value we actually use

      // FIX 1: Check 'weightValue' FIRST to prevent 'value' from cannibalizing it
      if (modifiedText.includes('weightValue')) { 
        modifiedText = modifiedText.replace('weightValue', weightRandVal); 
        finalTargetValue = weightRandVal; // Update our evaluation target
      } else if (modifiedText.includes('value')) { 
        modifiedText = modifiedText.replace('value', randVal); 
        finalTargetValue = randVal;
      }

      // Store complete snapshot record including block properties right at point of creation
      currentPrompts.push({ 
        blockType: type, 
        originalPrompt: selectedPrompt, 
        promptText: modifiedText, 
        randomValue: finalTargetValue, // FIX 2: Compare against the actual injected value
        defaults: [...childBlock.args] 
      });
    }
  }

  activeBlocks = [setupContainer]; // cite: 32
  window.workspaceBlocks = activeBlocks; // cite: 33
  repositionBlock(); // cite: 34
  renderBlocks = activeBlocks.map(cloneBlockTree); // cite: 35
}

function repositionBlock() {
  if (activeBlocks.length === 0) return;
  
  let totalH = 0;
  let maxW = 0;
  
  for (let b of activeBlocks) {
    b.layout(0, 0);
    totalH += b.h;
    if (b.w > maxW) maxW = b.w;
  }
  
  let leftPanelW = width / 3;
  let targetX = (leftPanelW - maxW) / 10;
  let targetY = (height - totalH) / 4; 
  
  let currentY = targetY;
  for (let b of activeBlocks) {
    b.layout(targetX, currentY);
    currentY += b.h;
  }
}

function cloneBlockTree(b) {
  if (!b) return null;
  let clone = new Block(b.type);
  clone.args = [...b.args];
  
  if (b.children) {
    clone.children = b.children.map(child => {
      let childClone = cloneBlockTree(child);
      if (childClone) childClone.parent = clone;
      return childClone;
    }).filter(Boolean);
  }
  
  if (b.elseChildren) {
    clone.elseChildren = b.elseChildren.map(child => {
      let childClone = cloneBlockTree(child);
      if (childClone) childClone.parent = clone;
      return childClone;
    }).filter(Boolean);
  }
  
  return clone;
}

function drawLiveViewport(leftPanelW) {
  let viewX = leftPanelW;
  let viewY = rightPanelT;
  let viewW = width - leftPanelW;
  let viewH = rightPanelH;
  
  push();
  translate(viewX, viewY);
  fill(255); // Global canvas shape default remains white
  stroke(0);
  strokeWeight(1);
  liveStrokeWeight = 1;
  
  // Reset custom fill tracking flag for the current draw loop sequence
  window.customFillApplied = false; 
  
  for (let b of renderBlocks) {
    executeRenderTree(b, viewW, viewH);
  }
  pop();
}

function executeRenderTree(b, viewW, viewH) {
  let a = b.args.map(v => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() === '') return undefined;
    let parsed = parseFloat(v);
    return isNaN(parsed) ? 0 : parsed;
  });

  let type = b.type;
  
  if (type === 'background') {
    push();
    let val = b.args[0];
    if (typeof val === 'string' && val.trim() !== "" && isNaN(Number(val))) {
      fill(val);
    } else {
      let validArgs = a.filter(v => v !== undefined);
fill(...validArgs);
    }
    noStroke();
    rect(0, 0, viewW, viewH);
    pop();
  } else if (type === 'fill') {
    let val = b.args[0];
    if (typeof val === 'string' && val.trim() !== "" && isNaN(Number(val))) {
      fill(val);
    } else {
      let validArgs = a.filter(v => v !== undefined);
fill(...validArgs);
    }
    // Mark that a user-defined fill block has altered the global state
    window.customFillApplied = true; 
  } else if (type === 'stroke') {
    let val = b.args[0];
    if (typeof val === 'string' && val.trim() !== "" && isNaN(Number(val))) {
      stroke(val);
    } else {
      let validArgs = a.filter(v => v !== undefined);
stroke(...validArgs);
    }
  } else if (type === 'strokeWeight') {
    liveStrokeWeight = a[0];
    strokeWeight(liveStrokeWeight);
  } else if (type === 'rect') {
    rectMode(CORNER);
    rect(a[0], a[1], a[2], a[3]);
  } else if (type === 'circle') {
    circle(a[0], a[1], a[2]);
  } else if (type === 'ellipse') {
    ellipse(a[0], a[1], a[2], a[3]);
  } else if (type === 'line') {
    line(a[0], a[1], a[2], a[3]);
  } else if (type === 'triangle') {
    triangle(a[0], a[1], a[2], a[3], a[4], a[5]);
  } else if (type === 'arc') {
    angleMode(DEGREES);
    arc(a[0], a[1], a[2], a[3], a[4], a[5]);
  } else if (type === 'point') {
    push();
    strokeWeight(liveStrokeWeight);
    point(a[0], a[1]);
    pop();
  } else if (type === 'text') {
    push();
    // Check if a preceding custom fill block exists.
    // If not, override the canvas baseline white (255) with black (0).
    if (!window.customFillApplied) {
      fill(0);
    }
    noStroke(); 
    textSize(a[3] || 16);
    textStyle(NORMAL);
    textAlign(LEFT, TOP);
    text(b.args[0] || '', a[1] ?? 20, a[2] ?? 20);
    pop();
  }

  for (let child of b.children) {
    executeRenderTree(child, viewW, viewH);
  }
  if (b.elseChildren) {
    for (let child of b.elseChildren) {
      executeRenderTree(child, viewW, viewH);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  repositionBlock();
}

function drawWinScreen() {
  // Solid slate-blue workspace backdrop
  background('#2c3e50');
  
  push();
  textAlign(CENTER, CENTER);
  noStroke();
  
  // Decorative Trophy Icon
  textSize(80);
  text("🏆", width / 2, height / 2 - 80);
  
  // Primary Victory Typography
  fill('#ffffff');
  textSize(36);
  textStyle(BOLD);
  text("ALL CHALLENGES COMPLETE!", width / 2, height / 2 + 10);
  
  // Secondary Explanatory Prompt Typography
  fill('#a6b9cb');
  textSize(16);
  textStyle(NORMAL);
  text("You have mastered all coordinate geometry and drawing vector properties.", width / 2, height / 2 + 55);
  
  // Optional Interactive Reset Layout Container Button
  let rBtnW = 200;
  let rBtnH = 45;
  let rBtnX = width / 2 - rBtnW / 2;
  let rBtnY = height / 2 + 110;
  
  // Highlight reset execution block button on hover
  if (mouseX >= rBtnX && mouseX <= rBtnX + rBtnW && mouseY >= rBtnY && mouseY <= rBtnY + rBtnH) {
    fill('#388E3C'); // Hover emerald green state
    if (mouseIsPressed) {
      // Completely reset state machines back to level 1 baseline parameters
      gameState = 'PLAY'; 
      currentLevel = 1;
      selectSetup(0);
    }
  } else {
    fill('#4CAF50'); // Default interface action green
  }
  
  rect(rBtnX, rBtnY, rBtnW, rBtnH, 6);
  
  fill('#ffffff');
  textSize(14);
  textStyle(BOLD);
  text("PLAY AGAIN ↺", width / 2, rBtnY + rBtnH / 2);
  pop();
}

class Block {
  constructor(type, x = 0, y = 0) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.w = 0;
    this.h = 0;
    this.children = [];
    this.elseChildren = [];
    this.args = [];
    this.argPos = [];
    this.parent = null;
    this.topBarH = 0;
    this.midBarY = 0;
    this.icon = null;

    this.initValues(type);
    this.setupVisuals(type);
    this.initHints(type);
  }

  setPosition(x, y) {
    this.layout(x, y);
  }

  get isReporter() {
    const standardReporters = [
      'pickRandom', 'mouseX', 'mouseY', 'pmouseX', 'pmouseY', 'width', 'height', 'atan2',
      'sin', 'cos', 'noise', 'frameCount', 'add', 'sub', 'mul', 'div', 'map', 'dist', 'round', 'remainder', 'touches.length', 'touches_get_x', 'touches_get_y'
    ];
    return standardReporters.includes(this.type) || userVariables.includes(this.type) || this.type.startsWith('array_get_') || this.type.startsWith('array_length');
  }

  get hasMenu() {
    if (this.type === 'image') return true;
    return BLOCK_MENUS.hasOwnProperty(this.type);
  }

  get isLogic() {
    return ['>', '<', '=', 'and', 'or', 'not'].includes(this.type);
  }

  get isContainer() {
    const standardContainers = ['function draw', 'function setup', 'function mousePressed', 'function keyPressed', 'repeat', 'if', 'if/else', 'beginShape', 'push/pop'];
    return standardContainers.includes(this.type) || this.type.startsWith('function ');
  }

  get isFunction() {
    const standardFunctions = ['function draw', 'function setup', 'function mousePressed', 'function keyPressed'];
    return standardFunctions.includes(this.type) || this.type.startsWith('function ');
  }

  get isInfix() {
    return ['add', 'sub', 'mul', 'div', '>', '<', '=', 'and', 'or', 'round'].includes(this.type);
  }

  syncArgs(targetCount) {
    if (!this.args) this.args = [];
    while (this.args.length < targetCount) {
      this.args.push(0); 
    }
    while (this.args.length > targetCount) {
      this.args.pop();
    }
  }

  initValues(type) {
    if (type === 'repeat') this.args = [10];
    else if (type === 'dist') this.args = [0, 0, 100, 100];
    else if (type === 'if' || type === 'if/else') this.args = [1];
    else if (type === 'point') this.args = [100, 100];
    else if (type === 'vertex') this.args = [100, 100];
    else if (type === 'circle') this.args = [400, 300, 50];
    else if (type === 'ellipse') this.args = [400, 300, 100, 80];
    else if (type === 'arc') this.args = [400, 300, 50, 50, 0, 180];
    else if (type === 'line') this.args = [0, 0, 200, 200];
    else if (type === 'rect') this.args = [200, 200, 100, 80];
    else if (type === 'triangle') this.args = [100, 20, 200, 400, 400, 400];
    else if (type === 'text') this.args = ['blank', 200, 200];
    else if (type === 'filter') this.args = ['BLUR'];
    else if (type === 'rectMode') this.args = ['CORNER'];
    else if (type === 'imageMode') this.args = ['CORNER'];
    else if (type === 'image') this.args = [loadedImages && loadedImages.length > 0 ? loadedImages[0] : 'Image', 200, 200, 180, 180];
    else if (type === 'colorMode') this.args = ['RGB'];
    // CHANGED: Initialize with 3 items (RGB) instead of 4 (RGBA)
    else if (['fill', 'background', 'tint'].includes(type)) this.args = [255, 255, 255];
		 else if (type === 'stroke') this.args = [0, 0, 0];
    else if (['textSize', 'strokeWeight', 'sin', 'cos', 'noise', 'not', 'round', 'rotate'].includes(type)) this.args = [20];
		else if (type === 'atan2') this.args = [0, 0];
    else if (type === 'translate') this.args = [100, 100];
    else if (type === 'pickRandom') this.args = [0, 255];
    else if (type === 'remainder') this.args = [10, 6];
    else if (type === 'map') this.args = [50, -1, 1, 0, 255];
    else if (this.isInfix) this.args = [1, 1];

    if (type.startsWith('set_')) this.args = [0];
    else if (type.startsWith('change_')) this.args = [1];

    if (type.startsWith('array_set_')) this.args = ['12, 0, 100'];
    else if (type.startsWith('array_change_')) this.args = [0, 1]; 
    else if (type.startsWith('array_get_')) this.args = [0];
    else if (type.startsWith('array_push_')) this.args = [10];
    else if (type.startsWith('array_length')) this.args = [];

    if (type.startsWith('touches_get_x')) this.args = [0];
    else if (type.startsWith('touches_get_y')) this.args = [0];
    else if (type.startsWith('touches.length')) this.args = [];
  }

  setupVisuals(type) {
    const drawCol = '#4CAF50', styleCol = '#DD5722', motCol = '#FF1E63', repoCol = '#8E24AA',
    loopCol = '#FF8F00', funcCol = '#40E0D0', eventCol = '#C0C000', mathCol = '#03A9F4', logicCol = '#4472C4', arrayCol = '#FFAAAA';

    const labels = {
      'function draw': 'function draw  // draw forever', 'function setup': 'function setup  // draw once',
      'repeat': 'repeat', 'if': 'if', 'if/else': 'if', 'push/pop' : 'push', 'point' : 'point',
      'circle': 'circle', 'ellipse' : 'ellipse', 'arc': 'arc', 'line': 'line', 'rect': 'rect', 'triangle': 'triangle', 'text': 'text',
      'beginShape' : 'beginShape', 'vertex' : 'vertex', 'rectMode' : 'rectMode', 'image' : 'image',
      'background': 'background', 'fill': 'fill', 'stroke': 'stroke', 'strokeWeight': 'strokeWeight', 'textSize': 'textSize', 'filter' : 'filter',
      'colorMode' : 'colorMode', 'noStroke' : 'noStroke', 'noFill' : 'noFill', 'imageMode' : 'imageMode', 'tint' : 'tint', 'noCursor' : 'noCursor',
      'translate' : 'translate', 'rotate' : 'rotate',
      'pickRandom': 'random', 'mouseX': 'mouseX', 'mouseY': 'mouseY', 'pmouseX': 'pMouseX', 'pmouseY': 'pMouseY',
      'width': 'width', 'height': 'height', 'frameCount': 'frameCount', 'sin': 'sin', 'cos': 'cos', 'noise': 'noise', 'atan2' : 'atan2',
      'touches.length' : 'touches.length', 'touches_get_x' : 'touches.x', 'touches_get_y' : 'touches.y',
      'add': '+', 'sub': '-', 'mul': '×', 'div': '÷', 'map': 'map', 'dist' : 'dist', 'round' : 'round', 'remainder' : 'remainder',
      '>': '>', '<': '<', '=': '=', 'and': 'and', 'or': 'or', 'not': 'not',
      'function mousePressed': 'function mousePressed', 'function keyPressed': 'function keyPressed'
    };

    const icons = {
      'point': window.pointIcon, 'text': window.textIcon, 'line': window.lineIcon,
      'rect': window.rectangleIcon, 'triangle': window.triangleIcon, 'ellipse': window.ellipseIcon,
      'circle': window.circleIcon, 'arc': window.arcIcon, 'image': currentImageIcon
    };

    this.label = labels[type] || type;
    this.icon = icons[type] || null;

    if (type === 'function mousePressed' || type === 'function keyPressed') {
      this.col = eventCol;
    } else if (this.isFunction || type.startsWith('call_')) {
      this.col = funcCol;
    } else if (type === 'if' || type === 'if/else' || type === 'repeat' || this.type === 'push/pop') {
      this.col = loopCol;
    } else if (this.isLogic) {
      this.col = logicCol;
    } else if (['fill', 'stroke', 'background', 'tint', 'strokeWeight', 'textSize', 'filter', 'colorMode', 'noFill', 'noStroke', 'imageMode', 'noCursor'].includes(type)) {
      this.col = styleCol;
    } else if (['point', 'circle', 'ellipse', 'rect', 'line', 'arc', 'triangle', 'text', 'beginShape', 'vertex', 'rectMode', 'image'].includes(type)) {
      this.col = drawCol;
    } else if (['translate', 'rotate'].includes(type)) {
      this.col = motCol;
    } else if (['add', 'sub', 'mul', 'div', 'map', 'dist', 'pickRandom', 'sin', 'cos', 'noise', 'atan2', 'round', 'remainder'].includes(type)) {
      this.col = mathCol;
    } else if (type.startsWith('touches')) {
      this.col = arrayCol;
    } else {
      this.col = repoCol;
    }

    if (type.startsWith('set_')) {
      this.label = `set ${type.split('_')[1]} to`;
      this.col = repoCol;
    } else if (type.startsWith('change_')) {
      this.label = `change ${type.split('_')[1]} by`;
      this.col = repoCol;
    } else if (type.startsWith('call')) {
      this.col = funcCol;
      let baseName = type.replace('call_', '');
      this.label = `${baseName} (`;
    }

    if (type.startsWith('array_set_')) {
      this.label = `${type.split('_')[2]} = (`;
      this.col = arrayCol;
    } else if (type.startsWith('array_change_')) {
      this.label = `${type.split('_')[2]}[`; 
      this.col = arrayCol;
    } else if (type.startsWith('array_get_')) {
      this.label = `${type.split('_')[2]}[`;
      this.col = arrayCol;
    } else if (type.startsWith('array_push_')) {
      this.label = `${type.split('_')[2]}.push(`;
      this.col = arrayCol;
    } else if (type.startsWith('array_length')) {
      this.col = arrayCol;
      if (type === 'array_length') {
        this.label = 'array length';
      } else {
        let arrayName = type.replace('array_length_', '').replace('array_length', '');
        this.label = `${arrayName}.length`;
      }
    }

    if (type.startsWith('touches_get_x')) {
      this.label = `touches[`;
      this.col = arrayCol;
    } else if (type.startsWith('touches_get_y')) {
      this.label = `touches[`; 
      this.col = arrayCol;
    } else if (type.startsWith('touches.length')) {
      this.label = `touches.length`;
      this.col = arrayCol;
    }
  }

layout(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.plusIconRect = null;
    this.minusIconRect = null;
    this.labelPositions = [];

    if (this.type.startsWith('call')) {
      let funcName = this.type.startsWith('call ') 
        ? this.type.substring(5) 
        : this.type.replace('call_', '').replace('call', '');
        
      Block.customFunctions = Block.customFunctions || {};
      let defBlock = (typeof findFunctionDefinition === 'function')
        ? findFunctionDefinition(funcName)
        : Block.customFunctions['function ' + funcName];

      if (defBlock) {
        let targetCount = defBlock.args ? defBlock.args.length : 0;
        this.syncArgs(targetCount);
      }
    }

    textSize(UI.ts);
    textStyle(BOLD);

    const padding = (this.isLogic ? 15 : (this.isReporter ? 16 : 10)) * UI.sf;
    const isCustomFunction = this.type.startsWith('function ') && !['function draw', 'function setup', 'function mousePressed', 'function keyPressed'].includes(this.type);

    if (isCustomFunction) {
      Block.customFunctions = Block.customFunctions || {};
      Block.customFunctions[this.type] = this;
    }

    const labelW = textWidth(this.label + '  ');
    const iconW = this.icon ? 28 * UI.sf : 0;

    const headerWidth = Math.max(labelW, iconW);
    let currentX = startX + padding + headerWidth;
    let maxArgH = 20 * UI.sf;

    const getSlotW = (val, minW) => {
      let txtW = textWidth(String(val));
      return Math.max(minW, txtW + 16 * UI.sf);
    };

    // ==========================================
    // UPDATED: Dynamic Sync of Alpha Argument Slot Array Sizes
    // ==========================================
    const isColorBlock = ['background', 'tint', 'fill', 'stroke'].includes(this.type);
    if (isColorBlock) {
      if (this.hasAlpha && this.args.length === 3) {
        this.args.push(255); // Inject Alpha parameter slot natively
        if (this.argHints && this.argHints.length === 3) this.argHints.push('A');
      } else if (!this.hasAlpha && this.args.length === 4) {
        this.args.pop();     // Drop Alpha parameter gracefully
        if (this.argHints && this.argHints.length === 4) this.argHints.pop();
      }
    }

    for (let arg of this.args) {
      if (arg instanceof Block) {
        arg.layout(0, 0);
        maxArgH = Math.max(maxArgH, arg.h);
      }
    }

    let hintPadding = this.argHints.length > 0 ? 5 * UI.sf : 0;
    let stackedContentH = this.icon ? (UI.ts + 32 * UI.sf) : UI.bh;
    this.topBarH = Math.max(stackedContentH, maxArgH + 12 * UI.sf) + hintPadding;

    this.argPos = [];
    const getArgY = (h) => startY + (this.topBarH - hintPadding - h) / 2;

    if ((this.type === 'map' || this.type === 'dist') && this.args.length > 0) {
      this.labelPositions = [];
      for (let i = 0; i < this.args.length; i++) {
        let arg = this.args[i];
        let argW = (arg instanceof Block) ? arg.w : getSlotW(arg, 38 * UI.sf);
        let argY = (arg instanceof Block) ? getArgY(arg.h) : getArgY(20 * UI.sf);

        if (arg instanceof Block) arg.layout(currentX, argY);

        this.argPos.push({
          x: currentX,
          y: argY,
          w: argW,
          h: (arg instanceof Block ? arg.h : 20 * UI.sf),
          block: arg instanceof Block ? arg : null
        });

        currentX += argW + 6 * UI.sf;
        if (this.type === 'dist' && i === 1) {
          this.labelPositions.push({
            txt: ",", x: currentX, y: startY + (this.topBarH - hintPadding) / 2
          });
          currentX += textWidth(",") + 8 * UI.sf;
        }
      }
    }
    else if (this.isInfix && this.args.length === 2) {
      const isMath = ['add', 'sub', 'mul', 'div'].includes(this.type);
      const isComparison = ['>', '<', '='].includes(this.type);

      let sideGap = isMath ? 6 * UI.sf : (isComparison ? 12 * UI.sf : padding);
      let internalGap = (isMath || isComparison) ? 4 * UI.sf : 10 * UI.sf;

      let p0_x = startX + sideGap;
      let arg0 = this.args[0];
      let arg0W = (arg0 instanceof Block) ? arg0.w : getSlotW(arg0, 40 * UI.sf);
      let arg0Y = (arg0 instanceof Block) ? getArgY(arg0.h) : getArgY(20 * UI.sf);

      this.argPos.push({
        x: p0_x,
        y: arg0Y,
        w: arg0W,
        h: (arg0 instanceof Block ? arg0.h : 20 * UI.sf),
        block: arg0 instanceof Block ? arg0 : null
      });

      if (arg0 instanceof Block) arg0.layout(p0_x, arg0Y);

      let opX = p0_x + arg0W + internalGap;
      let arg1X = opX + textWidth(this.label) + internalGap;

      let arg1 = this.args[1];
      let arg1W = (arg1 instanceof Block) ? arg1.w : getSlotW(arg1, 40 * UI.sf);
      let arg1Y = (arg1 instanceof Block) ? getArgY(arg1.h) : getArgY(20 * UI.sf);

      this.argPos.push({
        x: arg1X,
        y: arg1Y,
        w: arg1W,
        h: (arg1 instanceof Block ? arg1.h : 20 * UI.sf),
        block: arg1 instanceof Block ? arg1 : null
      });

      if (arg1 instanceof Block) arg1.layout(arg1X, arg1Y);

      currentX = arg1X + arg1W + sideGap;
    }
    else if (this.type.startsWith('array_change_') && this.args.length === 2) {
      this.labelPositions = [];

      let arg0 = this.args[0];
      let arg0W = (arg0 instanceof Block) ? arg0.w : getSlotW(arg0, 38 * UI.sf);
      let arg0Y = (arg0 instanceof Block) ? getArgY(arg0.h) : getArgY(20 * UI.sf);
      if (arg0 instanceof Block) arg0.layout(currentX, arg0Y);

      this.argPos.push({
        x: currentX,
        y: arg0Y,
        w: arg0W,
        h: (arg0 instanceof Block ? arg0.h : 20 * UI.sf),
        block: arg0 instanceof Block ? arg0 : null
      });
      currentX += arg0W + 4 * UI.sf;

      let midTxt = "] += ";
      this.labelPositions.push({
        txt: midTxt, x: currentX, y: startY + (this.topBarH - hintPadding) / 2
      });
      currentX += textWidth(midTxt) + 4 * UI.sf;

      let arg1 = this.args[1];
      let arg1W = (arg1 instanceof Block) ? arg1.w : getSlotW(arg1, 38 * UI.sf);
      let arg1Y = (arg1 instanceof Block) ? getArgY(arg1.h) : getArgY(20 * UI.sf);
      if (arg1 instanceof Block) arg1.layout(currentX, arg1Y);

      this.argPos.push({
        x: currentX,
        y: arg1Y,
        w: arg1W,
        h: (arg1 instanceof Block ? arg1.h : 20 * UI.sf),
        block: arg1 instanceof Block ? arg1 : null
      });

      currentX += arg1W + padding;
    }
    else {
      for (let i = 0; i < this.args.length; i++) {
        let arg = this.args[i];
        
        let displayVal = arg;
        if (this.type === 'image' && i === 0 && !(arg instanceof Block)) {
          let imgIdx = loadedImages.indexOf(arg);
          displayVal = (imgIdx !== -1 && loadedImageNames[imgIdx]) ? loadedImageNames[imgIdx] : 'Image';
        }

        let argW = (arg instanceof Block) ? arg.w : getSlotW(displayVal, 38 * UI.sf);
        let argY = (arg instanceof Block) ? getArgY(arg.h) : getArgY(20 * UI.sf);

        if (arg instanceof Block) arg.layout(currentX, argY);

        this.argPos.push({
          x: currentX,
          y: argY,
          w: argW,
          h: (arg instanceof Block ? arg.h : 20 * UI.sf),
          block: arg instanceof Block ? arg : null
        });

        currentX += argW + (i === this.args.length - 1 ? 0 : 5 * UI.sf);
      }

      if (isCustomFunction) {
        currentX += 6 * UI.sf;

        if (this.args.length >= 1) {
          let minusW = textWidth('-') + 14 * UI.sf;
          this.minusIconRect = {
            x: currentX, y: startY, w: minusW, h: this.topBarH
          };
          currentX += minusW + 4 * UI.sf;
        }

        let plusW = textWidth('+') + 14 * UI.sf;
        this.plusIconRect = {
          x: currentX, y: startY, w: plusW, h: this.topBarH
        };
        currentX += plusW;
      } 
      // ==========================================
      // UPDATED: Controlled Color Triggers Toggle Conditions
      // ==========================================
      else if (isColorBlock) {
        currentX += 6 * UI.sf;
        if (!this.hasAlpha) {
          let plusW = textWidth('+') + 14 * UI.sf;
          this.plusIconRect = {
            x: currentX, y: startY, w: plusW, h: this.topBarH
          };
          currentX += plusW;
        } else {
          let minusW = textWidth('-') + 14 * UI.sf;
          this.minusIconRect = {
            x: currentX, y: startY, w: minusW, h: this.topBarH
          };
          currentX += minusW;
        }
      }

      currentX += padding;
    }

    if (this.type.startsWith('call')) {
      this.labelPositions = [{
        txt: ")", x: currentX - padding + 2 * UI.sf, y: startY + (this.topBarH - hintPadding) / 2
      }];
      currentX += textWidth(")") + 2 * UI.sf;
    }

    if (
      this.type.startsWith('array_set_') ||
      this.type.startsWith('array_get_') ||
      this.type.startsWith('array_push_') ||
      this.type.startsWith('touches_get_x') ||
      this.type.startsWith('touches_get_y')
    ) {
      let closingTxt = '';

      if (this.type.startsWith('array_get_') || this.type.startsWith('array_set_')) {
        closingTxt = ']';
      } else if (this.type.startsWith('array_push_')) {
        closingTxt = ')';
      } else if (this.type.startsWith('touches_get_x')) {
        closingTxt = '].x';
      } else if (this.type.startsWith('touches_get_y')) {
        closingTxt = '].y';
      }

      let closingX = currentX - padding + 4 * UI.sf;
      let closingY = startY + (this.topBarH - hintPadding) / 2;

      this.labelPositions.push({
        txt: closingTxt,
        x: closingX,
        y: closingY
      });

      currentX = closingX + textWidth(closingTxt) + padding;
    }

    let calculatedWidth = currentX - startX;
    this.w = (this.isReporter || this.isLogic) ? calculatedWidth : Math.max(UI.bw, calculatedWidth);

    if (this.isContainer) {
      let cy = startY + this.topBarH;
      for (let c of this.children) {
        c.layout(startX + UI.ind, cy);
        cy += c.h;
      }
      if (this.children.length === 0) cy += 10 * UI.sf;

      if (this.type === 'if/else') {
        this.midBarY = cy;
        cy += UI.bh;
        for (let c of this.elseChildren) {
          c.layout(startX + UI.ind, cy);
          cy += c.h;
        }
        if (this.elseChildren.length === 0) cy += 10 * UI.sf;
      }

      let footerH = (this.type === 'beginShape' || this.type === 'push/pop') ? UI.bh : 8 * UI.sf;
      this.h = (cy - startY) + footerH;
    } else {
      this.h = this.topBarH;
    }
  }

  draw() {
    if (this.type.startsWith('call_')) {
      let defType = this.type.replace('call_', 'function ');
      let defBlock = Block.customFunctions ? Block.customFunctions[defType] : null;
      if (defBlock && this.args.length !== defBlock.args.length) {
        this.syncArgs(defBlock.args.length);
        this.layout(this.x, this.y); 
      }
    }

    if (['fill', 'stroke', 'background', 'tint'].includes(this.type)) {
      this.updateColorHints();
    }
    push();
    fill(this.col);
    stroke(0);
    strokeWeight(1 * UI.sf);

    let topH = this.topBarH;
    let bottomCapH = (this.type === 'beginShape' || this.type === 'push/pop') ? this.topBarH : 8 * UI.sf;
    let hintPadding = this.argHints.length > 0 ? 15 * UI.sf : 0;

    if (this.isLogic) {
      this.drawLogicShape(this.x, this.y, this.w, this.h);
    } else if (this.isReporter) {
      rect(this.x, this.y, this.w, this.h, this.h / 2);
    } else if (this.isContainer) {
      rect(this.x, this.y, this.w, topH, UI.rad, UI.rad, 0, 0);         
      rect(this.x, this.y + topH, UI.ind, this.h - topH - bottomCapH);   

      if (this.type === 'if/else') {
        rect(this.x, this.midBarY, this.w, UI.bh);                                
        fill(255); noStroke(); textStyle(BOLD); textAlign(LEFT, CENTER);
        text("else", this.x + 8 * UI.sf, this.midBarY + UI.bh / 2);
        fill(this.col); stroke(0);
      }
      if (this.type === 'beginShape') {
        rect(this.x, this.y + this.h - bottomCapH, this.w, topH, 0, 0, UI.rad, UI.rad);
        fill(255); noStroke(); textStyle(BOLD); textAlign(LEFT, CENTER);
        text('endShape', this.x + 8 * UI.sf, this.y + this.h - bottomCapH + UI.bh / 2);
      }
      else if (this.type === 'push/pop') {
        rect(this.x, this.y + this.h - bottomCapH, this.w, topH, 0, 0, UI.rad, UI.rad);
        fill(255); noStroke(); textStyle(BOLD); textAlign(LEFT, CENTER);
        text('pop', this.x + 8 * UI.sf, this.y + this.h - bottomCapH + UI.bh / 2);
      } else {
        fill(this.col); stroke(0);
        rect(this.x, this.y + this.h - bottomCapH, this.w, bottomCapH, 0, 0, UI.rad, UI.rad);
      }

      noStroke(); fill(this.col);
      rect(this.x + 1, this.y + topH - 2, UI.ind - 2, 5);
      if (this.type === 'if/else') {
        rect(this.x + 1, this.midBarY - 2, UI.ind - 2, 5);
        rect(this.x + 1, this.midBarY + UI.bh - 3, UI.ind - 2, 6);
      }
      rect(this.x + 1, this.y + this.h - bottomCapH - 2, UI.ind - 2, 5);
      stroke(0);
    } else {
      rect(this.x, this.y, this.w, this.h, UI.rad);
    }

    fill(255); noStroke(); textSize(UI.ts); textStyle(BOLD);

    let labelAreaX = this.x + (this.isLogic ? 15 : (this.isReporter ? 16 : 10)) * UI.sf;
    let labelAreaW = Math.max(textWidth(this.label), this.icon ? 28 * UI.sf : 0);
    let contentY = this.y + (topH - hintPadding) / 1.5;

    if (this.isInfix && this.argPos.length === 2) {
      let p0 = this.argPos[0], p1 = this.argPos[1];
      textAlign(CENTER, CENTER);
      if (['+', '-', '×', '÷'].includes(this.label)) {
        text(this.label, p0.x + p0.w + (p1.x - (p0.x + p0.w)) / 2, contentY - this.h / 8);
      } else {
        text(this.label, p0.x + p0.w + (p1.x - (p0.x + p0.w)) / 2, contentY);
      }
    } else {
      if (this.icon) {
        textAlign(CENTER, CENTER);
        let centerX = labelAreaX + labelAreaW / 2;
        text(this.label, centerX, contentY - 12 * UI.sf);
        imageMode(CENTER);
        if (this.type === 'image') {
          if (this.args[0] && !(this.args[0] instanceof Block)) {
            this.icon = this.args[0];
          }
        }
        image(this.icon, centerX, contentY + 10 * UI.sf, 28 * UI.sf, 28 * UI.sf);
      } else {
        textAlign(LEFT, CENTER);
        text(this.label, labelAreaX, contentY);

        // CHANGED: Decoupled logic from isCustomFunction so color blocks use the exact same triggers
        if (this.plusIconRect) {
          let isHovered = mouseX >= this.plusIconRect.x && mouseX <= this.plusIconRect.x + this.plusIconRect.w &&
                          mouseY >= this.plusIconRect.y && mouseY <= this.plusIconRect.y + this.plusIconRect.h;
          push();
          fill(isHovered ? '#FFEB3B' : 255);
          textAlign(CENTER, CENTER);
          text('+', this.plusIconRect.x + this.plusIconRect.w / 2, contentY);
          pop();
        }

        if (this.minusIconRect) {
          let isMinusHovered = mouseX >= this.minusIconRect.x && mouseX <= this.minusIconRect.x + this.minusIconRect.w &&
                               mouseY >= this.minusIconRect.y && mouseY <= this.minusIconRect.y + this.minusIconRect.h;
          push();
          fill(isMinusHovered ? '#FFEB3B' : 255);
          textAlign(CENTER, CENTER);
          text('-', this.minusIconRect.x + this.minusIconRect.w / 2, contentY);
          pop();
        }
      }
    }

    if (this.labelPositions) {
      textAlign(LEFT, CENTER);
      for (let lp of this.labelPositions) text(lp.txt, lp.x, lp.y);
    }

    for (let i = 0; i < this.args.length; i++) {
      let arg = this.args[i], pos = this.argPos[i];
      if (!pos) continue;

      textSize(UI.ts);

      if (arg instanceof Block) {
        arg.draw();
      } else {
        fill(255); stroke(0); strokeWeight(1 * UI.sf);

        let isLogicInput = ['if', 'if/else', 'not', 'and', 'or'].includes(this.type);
        let isMenuSlot = this.hasMenu && (i === 0);

        if (isLogicInput) {
          this.drawLogicShape(pos.x, pos.y, pos.w, pos.h);
        } else if (isMenuSlot) {
          rect(pos.x, pos.y, pos.w, pos.h);
        } else {
          rect(pos.x, pos.y, pos.w, pos.h, 10 * UI.sf);
        }

        if (isMenuSlot) {
          fill(this.col);
          noStroke();
          let arrowSize = 5 * UI.sf;
          let arrowX = pos.x + pos.w - 8 * UI.sf;
          let arrowY = pos.y + pos.h / 2;
          triangle(
            arrowX - arrowSize, arrowY - arrowSize/2,
            arrowX + arrowSize, arrowY - arrowSize/2,
            arrowX, arrowY + arrowSize/2
          );
        }
            
        fill(0); noStroke(); textStyle(NORMAL); textAlign(CENTER, CENTER);
        let textOffsetX = isMenuSlot ? -4 * UI.sf : 0;

        let displayedText = arg;

        if (['background', 'stroke', 'fill', 'tint'].includes(this.type)) {
          displayedText = Math.min(Math.max(arg, 0), 255); 
        } else if (this.type === 'image' && i === 0 && !(arg instanceof Block)) {
          let imgIdx = loadedImages.indexOf(arg);
          displayedText = (imgIdx !== -1 && loadedImageNames[imgIdx]) ? loadedImageNames[imgIdx] : 'Image';
        }

        text(displayedText, pos.x + pos.w / 2 + textOffsetX, pos.y + pos.h / 2 + 1);
      }

      if (this.argHints[i]) {
        fill(255, 200); textStyle(BOLD); textAlign(CENTER, TOP); textSize(UI.ts * 0.7);
        text(this.argHints[i], pos.x + pos.w / 2, pos.y + pos.h + UI.sf);
      }
    }

    pop();

    for (let c of this.children) c.draw();
    if (this.type === 'if/else') {
      for (let c of this.elseChildren) c.draw();
    }
  }

getMenuOptions() {
    if (this.type === 'image') {
      return loadedImages && loadedImages.length > 0 ? [...loadedImages] : ['Image'];
    }
    
    if (typeof BLOCK_MENUS[this.type] === 'function') {
      return BLOCK_MENUS[this.type]();
    }

    return BLOCK_MENUS[this.type] || [];
  }

  checkClick(mx, my) {
    const isCustomFunction = this.type.startsWith('function ') &&
      !['function draw', 'function setup', 'function mousePressed', 'function keyPressed'].includes(this.type);
    
    const isColorBlock = ['background', 'tint', 'fill', 'stroke'].includes(this.type);

    if (isCustomFunction) {
      const syncAllMatchingCalls = (targetCount) => {
        let callType = this.type.replace('function ', 'call_');
        const activeBlocks = window.workspaceBlocks || [];
        for (let b of activeBlocks) {
          this._applyToBlockTree(b, (block) => {
            if (block.type === callType) {
              block.syncArgs(targetCount);
            }
          });
        }
      };

      if (this.plusIconRect && 
          mx >= this.plusIconRect.x && mx <= this.plusIconRect.x + this.plusIconRect.w &&
          my >= this.plusIconRect.y && my <= this.plusIconRect.y + this.plusIconRect.h) {
        
        let defaultParamName = 'arg' + (this.args.length + 1);
        this.args.push(defaultParamName);
        
        this.layout(this.x, this.y);
        syncAllMatchingCalls(this.args.length);
        
        if (typeof triggerGlobalLayoutRefresh === 'function') {
          triggerGlobalLayoutRefresh();
        }
        return true;
      }

      if (this.minusIconRect && this.args.length >= 1 &&
          mx >= this.minusIconRect.x && mx <= this.minusIconRect.x + this.minusIconRect.w &&
          my >= this.minusIconRect.y && my <= this.minusIconRect.y + this.minusIconRect.h) {
        
        this.args.pop();
        
        this.layout(this.x, this.y);
        syncAllMatchingCalls(this.args.length);
        
        if (typeof triggerGlobalLayoutRefresh === 'function') {
          triggerGlobalLayoutRefresh();
        }
        return true;
      }
    }
    // ========================================================
    // FIX: Handle Clicks Natively on Color Block Toggle Buttons
    // ========================================================
    else if (isColorBlock) {
      // Clicked Plus -> Set state flag and trigger re-layout
      if (this.plusIconRect && 
          mx >= this.plusIconRect.x && mx <= this.plusIconRect.x + this.plusIconRect.w &&
          my >= this.plusIconRect.y && my <= this.plusIconRect.y + this.plusIconRect.h) {
        
        this.hasAlpha = true;
        this.layout(this.x, this.y);
        
        if (typeof triggerGlobalLayoutRefresh === 'function') {
          triggerGlobalLayoutRefresh();
        }
        return true;
      }

      // Clicked Minus -> Unset state flag and trigger re-layout
      if (this.minusIconRect && 
          mx >= this.minusIconRect.x && mx <= this.minusIconRect.x + this.minusIconRect.w &&
          my >= this.minusIconRect.y && my <= this.minusIconRect.y + this.minusIconRect.h) {
        
        this.hasAlpha = false;
        this.layout(this.x, this.y);
        
        if (typeof triggerGlobalLayoutRefresh === 'function') {
          triggerGlobalLayoutRefresh();
        }
        return true;
      }
    }

    for (let arg of this.args) {
      if (arg instanceof Block && arg.checkClick && arg.checkClick(mx, my)) return true;
    }

    for (let child of this.children) {
      if (child.checkClick && child.checkClick(mx, my)) return true;
    }

    if (this.elseChildren) {
      for (let child of this.elseChildren) {
        if (child.checkClick && child.checkClick(mx, my)) return true;
      }
    }

    return false;
  }

  drawLogicShape(x, y, w, h) {
    let side = h / 2;
    beginShape();
    vertex(x + side, y); vertex(x + w - side, y); vertex(x + w, y + h / 2);
    vertex(x + w - side, y + h); vertex(x + side, y + h); vertex(x, y + h / 2);
    endShape(CLOSE);
  }

  serialize() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      args: this.args.map(arg => {
        if (arg && typeof arg.serialize === 'function') {
          return arg.serialize();
        }
        return arg;
      }),
      children: this.children.map(c => {
        if (c && typeof c.serialize === 'function') return c.serialize();
        return null;
      }).filter(Boolean),
      elseChildren: this.elseChildren ? this.elseChildren.map(c => {
        if (c && typeof c.serialize === 'function') return c.serialize();
        return null;
      }).filter(Boolean) : []
    };
  }

  static fromData(data) {
    let b = new Block(data.type, data.x, data.y);
    
    b.args = data.args.map(arg => {
      if (arg && typeof arg === 'object' && arg.type) {
        let childReporter = Block.fromData(arg);
        childReporter.parent = b; 
        return childReporter;
      }
      return arg;
    });

    if (data.children) {
      b.children = data.children.map(cData => {
        let child = Block.fromData(cData);
        child.parent = b; 
        return child;
      });
    }

    if (data.elseChildren) {
      b.elseChildren = data.elseChildren.map(cData => {
        let child = Block.fromData(cData);
        child.parent = b; 
        return child;
      });
    }

    return b;
  }

  duplicate() {
    let copy = new Block(this.type, this.x + 20 * UI.sf, this.y + 20 * UI.sf);
    copy.args = this.args.map(arg => {
      if (arg instanceof Block) { let aC = arg.duplicate(); aC.parent = copy; return aC; }
      return arg;
    });
    copy.children = this.children.map(child => {
      let cC = child.duplicate(); cC.parent = copy; return cC;
    });
    if (this.type === 'if/else') {
      copy.elseChildren = this.elseChildren.map(child => {
        let cC = child.duplicate(); cC.parent = copy; return cC;
      });
    }
    copy.layout(copy.x, copy.y);
    return copy;
  }

  initHints(type) {
    const hints = {
      'line': ['x1', 'y1', 'x2', 'y2'],
      'circle': ['x', 'y', 'd'],
      'triangle': ['x1', 'y1', 'x2', 'y2', 'x3', 'y3'],
      'rect': ['x', 'y', 'w', 'h'],
      'ellipse': ['x', 'y', 'w', 'h'],
      'point': ['x', 'y'],
      'pickRandom': ['min', 'max'],
      'text': ['string', 'x', 'y'],
      'map': ['value', 'low', 'high', 'low', 'high'],
      'dist': ['x1', 'y1', 'x2', 'y2'],
      'arc': ['x', 'y', 'w', 'h', 'start', 'stop'],
      'textSize': ['pixels'],
      'strokeWeight': ['pixels'],
      'remainder': ['dividend', 'divisor'],
      'translate': ['x', 'y'],
      'rotate': ['degrees'],
      'image': ['file', 'x', 'y', 'w', 'h'],
		'atan2': ['y', 'x']
    };

    if (['fill', 'stroke', 'background', 'tint'].includes(type)) {
      this.updateColorHints();
    } else {
      this.argHints = hints[type] || [];
    }
  }

  updateColorHints() {
    if (!['fill', 'stroke', 'background', 'tint'].includes(this.type)) return;

    const findModeBefore = (targetBlock) => {
      let p = targetBlock.parent;
      if (!p) return 'RGB'; 

      let list = (p.elseChildren && p.elseChildren.includes(targetBlock)) 
                 ? p.elseChildren 
                 : p.children;

      let myIndex = list.indexOf(targetBlock);
      let lastFoundInScope = null;

      for (let i = 0; i < myIndex; i++) {
        if (list[i].type === 'colorMode') {
          lastFoundInScope = list[i].args[0];
        }
      }

      if (lastFoundInScope) return lastFoundInScope;

      return findModeBefore(p);
    };

    const mode = findModeBefore(this);

    if (mode === 'HSB') {
      this.argHints = ['H', 'S', 'B', 'alpha'];
    } else {
      this.argHints = ['R', 'G', 'B', 'alpha'];
    }
  }
}
