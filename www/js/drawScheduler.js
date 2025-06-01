// Draw Scheduler - Centralizes and optimizes drawing calls
// This prevents multiple draw calls per frame and ensures smooth 60fps rendering

class DrawScheduler {
    constructor() {
        this.isDrawScheduled = false;
        this.lastDrawTime = 0;
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        this.drawFunction = null;
        this.isRunning = false;
        
        // Performance tracking
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        this.currentFPS = 60;
    }
    
    setDrawFunction(drawFn) {
        this.drawFunction = drawFn;
    }
    
    start() {
        if (!this.isRunning && this.drawFunction) {
            this.isRunning = true;
            this.lastDrawTime = performance.now();
            this.animationLoop();
        }
    }
    
    stop() {
        this.isRunning = false;
    }
    
    // Request a draw on the next frame
    requestDraw() {
        this.isDrawScheduled = true;
    }
    
    // Main animation loop
    animationLoop() {
        if (!this.isRunning) return;
        
        const now = performance.now();
        const elapsed = now - this.lastDrawTime;
        
        // Only draw if enough time has passed (throttle to target FPS)
        if (elapsed >= this.frameTime) {
            // Draw if requested or if animations are running
            if (this.isDrawScheduled || (window.animationManager && window.animationManager.hasActiveAnimations())) {
                this.drawFunction();
                this.isDrawScheduled = false;
                
                // Track FPS
                this.frameCount++;
                if (now - this.fpsUpdateTime >= 1000) {
                    this.currentFPS = this.frameCount;
                    this.frameCount = 0;
                    this.fpsUpdateTime = now;
                }
            }
            
            this.lastDrawTime = now - (elapsed % this.frameTime);
        }
        
        requestAnimationFrame(() => this.animationLoop());
    }
    
    getCurrentFPS() {
        return this.currentFPS;
    }
}

// Create singleton instance
export const drawScheduler = new DrawScheduler();

// Replace direct draw calls with scheduled draws
export function scheduleDraw() {
    drawScheduler.requestDraw();
}