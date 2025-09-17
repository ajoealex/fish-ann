function triggerSpook() { spookActive = true; spookTimer = SPOOK_DURATION; }

function mouseMoved() { pointerPositions = [createVector(mouseX, mouseY)]; triggerSpook(); }
function mouseDragged() { pointerPositions = [createVector(mouseX, mouseY)]; triggerSpook(); }
function mouseReleased() { pointerPositions = []; }

function touchStarted() { pointerPositions = touches.map(t => createVector(t.x, t.y)); triggerSpook(); return false; }
function touchMoved() { pointerPositions = touches.map(t => createVector(t.x, t.y)); triggerSpook(); return false; }
function touchEnded() { pointerPositions = []; return false; }
