import { tileSize } from './gameConfig.js';
import { audioManager } from './audioManager.js';

export class AnimationManager {
    constructor() {
        this.animations = [];
        this.particles = [];
        this.explosions = [];
        this.damageTexts = [];
    }
    
    // Check if there are any active animations
    hasActiveAnimations() {
        return this.animations.length > 0 || 
               this.particles.length > 0 || 
               this.explosions.length > 0 || 
               this.damageTexts.length > 0;
    }

    // Shot animation with improved visuals
    createShotAnimation(fromX, fromY, toX, toY, unit, isCritical = false) {
        return new Promise(resolve => {
            // Play shot sound, now passing the entire unit object
            audioManager.playWeaponSound(unit);

            // Determine projectile type based on unit
            const projectileType = this.getProjectileType(unit);

            const animation = {
                type: 'shot',
                fromX,
                fromY,
                toX,
                toY,
                progress: 0,
                duration: 300, // Increased duration for better visibility
                startTime: performance.now(),
                projectileType,
                isCritical,
                onComplete: resolve
            };

            // Add muzzle flash
            this.createMuzzleFlash(fromX, fromY);

            this.animations.push(animation);
        });
    }

    // Create ricochet animation when armor blocks damage
    createRicochetAnimation(x, y) {
        // Play ricochet sound
        audioManager.playSound('ricochet');

        const sparkCount = 8 + Math.floor(Math.random() * 5);
        const angle = Math.random() * Math.PI * 2;

        // Create multiple particles in different directions
        for (let i = 0; i < sparkCount; i++) {
            const sparkAngle = angle + (Math.PI * 2 * i / sparkCount) + (Math.random() * 0.5 - 0.25);
            const speed = 1 + Math.random() * 2;

            this.particles.push({
                x,
                y,
                vx: Math.cos(sparkAngle) * speed,
                vy: Math.sin(sparkAngle) * speed,
                size: 2 + Math.random() * 3,
                color: `rgba(255, ${150 + Math.floor(Math.random() * 105)}, 0, ${0.7 + Math.random() * 0.3})`,
                life: 300 + Math.random() * 200,
                startTime: performance.now()
            });
        }

        // Add metallic "ping" circle
        this.particles.push({
            type: 'ring',
            x,
            y,
            radius: 5,
            maxRadius: 25,
            color: 'rgba(200, 200, 200, 0.7)',
            life: 300,
            startTime: performance.now()
        });
    }

    // Create hit effect for successful shots with unit type awareness
    createHitEffect(x, y, damage, isCritical = false, penetratedArmor = true, unit) {
        // Play hit sound
        audioManager.playImpactSound(unit, isCritical, penetratedArmor);

        // Determine if the unit is infantry
        const isInfantry = this.isInfantryUnit(unit);

        // Number of particles depends on unit type and armor penetration success
        const particleCount = isInfantry
            ? (penetratedArmor ? 8 : 4)  // Fewer particles for infantry
            : (penetratedArmor ? 12 : 6); // More particles for vehicles

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            // Lower speed for infantry units
            const speed = isInfantry
                ? (0.3 + Math.random() * 1.2)
                : (0.5 + Math.random() * 2);

            // Different colors for infantry and vehicles
            let colorBase;
            if (isInfantry) {
                // Red and dark red colors for infantry (blood imitation)
                colorBase = penetratedArmor
                    ? [180 + Math.floor(Math.random() * 75), 20 + Math.floor(Math.random() * 40), 20 + Math.floor(Math.random() * 40)]
                    : [100 + Math.floor(Math.random() * 55), 20 + Math.floor(Math.random() * 30), 20 + Math.floor(Math.random() * 30)];
            } else {
                // Yellow, orange and sparks for vehicles
                colorBase = penetratedArmor
                    ? [255, 100 + Math.floor(Math.random() * 155), 50]
                    : [200 + Math.floor(Math.random() * 55), 200 + Math.floor(Math.random() * 55), 50];
            }

            // Smaller particle size for infantry
            const particleSize = isInfantry
                ? (1.5 + Math.random() * 2)
                : (2 + Math.random() * 3);

            // Shorter particle lifetime for infantry
            const particleLife = isInfantry
                ? (200 + Math.random() * 200)
                : (400 + Math.random() * 300);

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: particleSize,
                color: `rgba(${colorBase[0]}, ${colorBase[1]}, ${colorBase[2]}, ${0.7 + Math.random() * 0.3})`,
                life: particleLife,
                startTime: performance.now(),
                fadeOut: true
            });
        }

        // Create shockwave effect, weaker for infantry
        this.particles.push({
            type: 'ring',
            x,
            y,
            radius: isInfantry ? 3 : 5,
            maxRadius: isInfantry
                ? (penetratedArmor ? 20 : 10)
                : (penetratedArmor ? 40 : 20),
            color: isInfantry
                ? (penetratedArmor ? 'rgba(180, 30, 30, 0.4)' : 'rgba(100, 100, 100, 0.3)')
                : (penetratedArmor ? 'rgba(255, 100, 50, 0.5)' : 'rgba(200, 200, 200, 0.5)'),
            life: isInfantry ? 300 : 400,
            startTime: performance.now()
        });

        // Show damage text
        if (damage > 0) {
            this.damageTexts.push({
                text: isCritical ? `${damage} CRIT!` : `${damage}`,
                x,
                y: y - 15,
                color: isCritical ? '#ff5500' : '#ffffff',
                outline: '#000000',
                size: isCritical ? 20 : 16,
                life: 800,
                startTime: performance.now(),
                vy: -0.7 // Float upward
            });
        } else if (damage === 0) {
            // Show "BLOCKED" for zero damage
            this.damageTexts.push({
                text: 'BLOCKED',
                x,
                y: y - 15,
                color: '#cccccc',
                outline: '#000000',
                size: 16,
                life: 800,
                startTime: performance.now(),
                vy: -0.5
            });
        }

        // Additional effects for different unit types
        if (isInfantry && penetratedArmor) {
            // Add blood splatter for infantry on successful hit
            for (let i = 0; i < 3; i++) {
                const splatterAngle = Math.random() * Math.PI * 2;
                const splatterDistance = 5 + Math.random() * 10;

                this.particles.push({
                    type: 'splatter',
                    x: x + Math.cos(splatterAngle) * splatterDistance,
                    y: y + Math.sin(splatterAngle) * splatterDistance,
                    size: 3 + Math.random() * 4,
                    color: `rgba(${140 + Math.floor(Math.random() * 60)}, ${10 + Math.floor(Math.random() * 30)}, ${10 + Math.floor(Math.random() * 30)}, ${0.6 + Math.random() * 0.3})`,
                    life: 2000 + Math.random() * 3000, // Blood stays longer
                    startTime: performance.now(),
                    fadeOut: true
                });
            }
        }
    }

    isInfantryUnit(unit) {
        if (!unit) return false;

        // Check unitType directly if it exists
        if (typeof unit === 'object' && unit.unitType) {
            return unit.unitType === 'infantry' ||
                unit.unitType === 'heavy_infantry' ||
                unit.unitType === 'sniper';
        }

        return false;
    }

    // Create explosion effect for tank/artillery shots and unit destruction
    createExplosion(x, y, size = 'medium') {
        // Play explosion sound
        audioManager.playExplosionSound(size);

        const sizeMultiplier = {
            small: 0.7,
            medium: 1,
            large: 1.5,
            huge: 2.5
        }[size] || 1;

        const baseRadius = 50 * sizeMultiplier;
        const duration = 700 * sizeMultiplier;

        // Create main explosion
        this.explosions.push({
            x,
            y,
            currentRadius: 5,
            maxRadius: baseRadius,
            duration,
            startTime: performance.now(),
            color1: 'rgba(255, 200, 50, 0.9)',
            color2: 'rgba(255, 100, 20, 0.7)',
            color3: 'rgba(100, 20, 0, 0.5)'
        });

        // Create debris particles
        const particleCount = Math.floor(15 * sizeMultiplier);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (1 + Math.random() * 3) * sizeMultiplier;
            const size = (3 + Math.random() * 4) * sizeMultiplier;

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color: `rgba(${100 + Math.floor(Math.random() * 155)}, ${50 + Math.floor(Math.random() * 50)}, 0, ${0.7 + Math.random() * 0.3})`,
                life: 500 + Math.random() * 500,
                startTime: performance.now(),
                gravity: 0.05,
                fadeOut: true
            });
        }

        // Create smoke particles that linger
        const smokeCount = Math.floor(10 * sizeMultiplier);
        for (let i = 0; i < smokeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.3 + Math.random() * 0.7) * sizeMultiplier;
            const smokeDuration = (100 + Math.random() * 1200) * sizeMultiplier;
            const smokeSize = (8 + Math.random() * 12) * sizeMultiplier;

            this.particles.push({
                type: 'smoke',
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5, // Smoke rises
                size: smokeSize,
                growFactor: 1.01,
                color: `rgba(80, 80, 80, ${0.3 + Math.random() * 0.3})`,
                life: smokeDuration,
                startTime: performance.now(),
                fadeOut: true
            });
        }

        // Create shockwave
        this.particles.push({
            type: 'ring',
            x,
            y,
            radius: 10,
            maxRadius: baseRadius * 1.5,
            color: 'rgba(255, 255, 255, 0.4)',
            life: duration * 0.7,
            startTime: performance.now()
        });
    }

    // Create unit destruction effect
    createUnitDestructionEffect(x, y, unit) {
        // Use large explosion for heavy vehicle destruction
        if (this.isVehicleUnit(unit)) {
            // Play vehicle destruction sound
            const size = this.isHeavyUnit(unit) ? 'large' : 'medium';
            audioManager.playExplosionSound(size);
        } else {
            // Quieter destruction for infantry
            // audioManager.playSound('hit_infantry', 0.8);
        }

        // Then add unit-specific destruction effects
        if (this.isVehicleUnit(unit)) {
            // First create the base explosion
            const size = this.isHeavyUnit(unit) ? 'large' : 'medium';
            this.createExplosion(x, y, size);

            // Add secondary explosions for vehicles
            setTimeout(() => {
                const offsetX = (Math.random() * 40) - 20;
                const offsetY = (Math.random() * 40) - 20;
                this.createExplosion(x + offsetX, y + offsetY, 'small');
            }, 100 + Math.random() * 100);

            // Add black smoke for vehicles
            // for (let i = 0; i < 5; i++) {
            //     const offsetX = (Math.random() * 30) - 15;
            //     const offsetY = (Math.random() * 30) - 15;
            //
            //     this.particles.push({
            //         type: 'smoke',
            //         x: x + offsetX,
            //         y: y + offsetY,
            //         vx: (Math.random() * 0.4) - 0.2,
            //         vy: -0.8 - Math.random() * 0.4, // Smoke rises
            //         size: 15 + Math.random() * 15,
            //         growFactor: 1.02,
            //         color: `rgba(30, 30, 30, ${0.6 + Math.random() * 0.4})`,
            //         life: 2000 + Math.random() * 2000,
            //         startTime: performance.now(),
            //         fadeOut: true
            //     });
            // }
        } else {
            // For infantry units, create flying debris
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 2;

                this.particles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1, // Initial upward velocity
                    size: 2 + Math.random() * 2,
                    color: `rgba(100, 100, 100, ${0.7 + Math.random() * 0.3})`,
                    life: 800 + Math.random() * 400,
                    startTime: performance.now(),
                    gravity: 0.1,
                    fadeOut: true
                });
            }
        }
    }

    // Create muzzle flash effect
    createMuzzleFlash(x, y) {
        // Create flash light
        this.particles.push({
            type: 'flash',
            x,
            y,
            radius: 15,
            color: 'rgba(255, 220, 130, 0.9)',
            life: 100,
            startTime: performance.now()
        });

        // Create small particles around the muzzle
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 5;

            this.particles.push({
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                size: 2 + Math.random() * 3,
                color: `rgba(255, ${150 + Math.floor(Math.random() * 105)}, 50, ${0.7 + Math.random() * 0.3})`,
                life: 200 + Math.random() * 100,
                startTime: performance.now(),
                fadeOut: true
            });
        }
    }

    // Helper method to determine projectile type based on unit
    getProjectileType(unit) {
        if (!unit) return 'bullet';

        // If the unit has unitType, use it directly
        if (typeof unit === 'object' && unit.unitType) {
            switch (unit.unitType) {
                case 'infantry':
                    return 'bullet';
                case 'heavy_infantry':
                    return 'heavy_infantry';
                case 'sniper':
                    return 'sniper';
                case 'autocannon':
                    return 'autocannon';
                case 'light_tank':
                    return 'lightShell';
                case 'tank':
                    return 'tankShell';
                case 'artillery':
                    return 'artillery';
                default:
                    return 'bullet';
            }
        }

        return 'bullet'; // Default
    }

    // In animations.js, isVehicleUnit method:
    isVehicleUnit(unit) {
        if (!unit) return false;

        // Check unitType directly if it exists
        if (typeof unit === 'object' && unit.unitType) {
            return unit.unitType === 'autocannon' ||
                unit.unitType === 'light_tank' ||
                unit.unitType === 'tank' ||
                unit.unitType === 'artillery';
        }

        return false;
    }

    // In animations.js, isHeavyUnit method:
    isHeavyUnit(unit) {
        if (!unit) return false;

        // Check unitType directly if it exists
        if (typeof unit === 'object' && unit.unitType) {
            return unit.unitType === 'tank' || unit.unitType === 'artillery';
        }

        return false;
    }

    update() {
        const currentTime = performance.now();

        // Update shot animations
        this.animations = this.animations.filter(animation => {
            const elapsed = currentTime - animation.startTime;
            animation.progress = Math.min(elapsed / animation.duration, 1);

            // If animation is completed
            if (animation.progress >= 1) {
                if (animation.onComplete) {
                    animation.onComplete();
                }
                return false;
            }
            return true;
        });

        // Update particles
        this.particles = this.particles.filter(particle => {
            const elapsed = currentTime - particle.startTime;

            if (elapsed >= particle.life) {
                return false;
            }

            // Update particle position
            if (particle.type !== 'ring' && particle.type !== 'flash') {
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Apply gravity if specified
                if (particle.gravity) {
                    particle.vy += particle.gravity;
                }

                // Grow smoke particles
                if (particle.type === 'smoke' && particle.growFactor) {
                    particle.size *= particle.growFactor;
                }
            }

            return true;
        });

        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            const elapsed = currentTime - explosion.startTime;

            if (elapsed >= explosion.duration) {
                return false;
            }

            // Update explosion radius
            const progress = elapsed / explosion.duration;
            explosion.currentRadius = explosion.maxRadius * Math.sin(progress * Math.PI);

            return true;
        });

        // Update damage texts
        this.damageTexts = this.damageTexts.filter(text => {
            const elapsed = currentTime - text.startTime;

            if (elapsed >= text.life) {
                return false;
            }

            // Move text upward
            text.y += text.vy;

            return true;
        });
    }

    draw(ctx) {
        // Draw shot animations
        this.animations.forEach(animation => {
            if (animation.type === 'shot') {
                this.drawShot(ctx, animation);
            }
        });

        // Draw particles
        this.particles.forEach(particle => {
            if (particle.type === 'ring') {
                this.drawRing(ctx, particle);
            } else if (particle.type === 'flash') {
                this.drawFlash(ctx, particle);
            } else if (particle.type === 'smoke') {
                this.drawSmoke(ctx, particle);
            } else {
                this.drawParticle(ctx, particle);
            }
        });

        // Draw explosions
        this.explosions.forEach(explosion => {
            this.drawExplosion(ctx, explosion);
        });

        // Draw damage texts
        this.damageTexts.forEach(text => {
            this.drawDamageText(ctx, text);
        });
    }

    drawShot(ctx, animation) {
        const {fromX, fromY, toX, toY, progress, projectileType, isCritical} = animation;

        // Calculate current projectile position
        const currentX = fromX + (toX - fromX) * progress;
        const currentY = fromY + (toY - fromY) * progress;

        // Draw projectile based on type
        switch (projectileType) {
            case 'bullet':
                // Small, fast bullet
                ctx.fillStyle = isCritical ? '#FFFF00' : '#FFD700';
                ctx.beginPath();
                ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
                ctx.fill();

                // Short trace behind bullet
                ctx.strokeStyle = isCritical ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 215, 0, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();

                const trailLength = 15;
                const trailX = currentX - (toX - fromX) * (trailLength / tileSize) * progress;
                const trailY = currentY - (toY - fromY) * (trailLength / tileSize) * progress;

                ctx.moveTo(currentX, currentY);
                ctx.lineTo(trailX, trailY);
                ctx.stroke();
                break;

            case 'heavy_infantry':
                // Burst fire with bullets in a linear formation (one after another)
                const burstCount = 3; // Number of bullets in burst
                const bulletSpacing = 12; // Spacing between bullets in the line

                // Calculate angle for proper orientation of burst
                const burstAngle = Math.atan2(toY - fromY, toX - fromX);

                // Draw multiple bullets in a line
                for (let i = 0; i < burstCount; i++) {
                    // Calculate offset distance based on bullet position in burst
                    const offsetDistance = i * bulletSpacing;

                    // Calculate bullet position along the trajectory line
                    const bulletProgress = progress - (i * 0.07); // Each bullet is slightly behind the previous

                    // Only draw bullets that are within the animation progress
                    if (bulletProgress <= 0 || bulletProgress > 1) continue;

                    // Calculate bullet position on trajectory
                    const bulletX = fromX + (toX - fromX) * bulletProgress;
                    const bulletY = fromY + (toY - fromY) * bulletProgress;

                    // Draw individual bullet
                    ctx.fillStyle = isCritical ? '#FFEE00' : '#FFC800';
                    ctx.beginPath();
                    ctx.arc(bulletX, bulletY, 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Short trace behind each bullet
                    const bulletTrailLength = 10;

                    // Calculate trail end point
                    const bulletTrailX = bulletX - Math.cos(burstAngle) * bulletTrailLength;
                    const bulletTrailY = bulletY - Math.sin(burstAngle) * bulletTrailLength;

                    // Create gradient for trail
                    const trailGradient = ctx.createLinearGradient(bulletX, bulletY, bulletTrailX, bulletTrailY);
                    trailGradient.addColorStop(0, isCritical ? 'rgba(255, 238, 0, 0.8)' : 'rgba(255, 200, 0, 0.7)');
                    trailGradient.addColorStop(1, 'rgba(255, 200, 0, 0)');

                    ctx.strokeStyle = trailGradient;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(bulletX, bulletY);
                    ctx.lineTo(bulletTrailX, bulletTrailY);
                    ctx.stroke();
                }
                break;

            case 'autocannon':
                // Larger, rapid-fire projectiles for autocannon in a line
                const acBurstCount = 3; // Number of shells in autocannon burst
                const shellSpacing = 15; // Spacing between shells in the line

                // Calculate angle for proper orientation
                const acAngle = Math.atan2(toY - fromY, toX - fromX);

                // Draw multiple autocannon shells in a line
                for (let i = 0; i < acBurstCount; i++) {
                    // Calculate shell position in the burst sequence
                    const shellProgress = progress - (i * 0.08); // Each shell is slightly behind the previous

                    // Only draw shells that are within the animation progress
                    if (shellProgress <= 0 || shellProgress > 1) continue;

                    // Calculate shell position on trajectory
                    const shellX = fromX + (toX - fromX) * shellProgress;
                    const shellY = fromY + (toY - fromY) * shellProgress;

                    // Draw shell with glowing effect
                    ctx.fillStyle = isCritical ? '#FF4400' : '#FF6600';
                    ctx.shadowColor = isCritical ? 'rgba(255, 68, 0, 0.8)' : 'rgba(255, 102, 0, 0.6)';
                    ctx.shadowBlur = 5;
                    ctx.beginPath();
                    ctx.arc(shellX, shellY, 3.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Create long tracer effect for autocannon shells
                    const acTrailLength = 25;

                    // Calculate trail end point
                    const shellTrailX = shellX - Math.cos(acAngle) * acTrailLength;
                    const shellTrailY = shellY - Math.sin(acAngle) * acTrailLength;

                    // Create bright tracer effect with gradient
                    const acGradient = ctx.createLinearGradient(shellX, shellY, shellTrailX, shellTrailY);
                    acGradient.addColorStop(0, isCritical ? 'rgba(255, 68, 0, 0.9)' : 'rgba(255, 102, 0, 0.8)');
                    acGradient.addColorStop(0.4, isCritical ? 'rgba(255, 170, 0, 0.6)' : 'rgba(255, 136, 0, 0.5)');
                    acGradient.addColorStop(1, 'rgba(255, 136, 0, 0)');

                    ctx.strokeStyle = acGradient;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(shellX, shellY);
                    ctx.lineTo(shellTrailX, shellTrailY);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                break;

            case 'sniper':
                // Sleek, long-range bullet with tracer
                ctx.fillStyle = isCritical ? '#FF5500' : '#FF8800';
                ctx.beginPath();
                ctx.arc(currentX, currentY, 2, 0, Math.PI * 2);
                ctx.fill();

                // Long trace for a sniper bullet
                ctx.strokeStyle = isCritical ? 'rgba(255, 85, 0, 0.4)' : 'rgba(255, 136, 0, 0.3)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();

                // Draw longer trace with gradient
                const gradient = ctx.createLinearGradient(
                    currentX, currentY,
                    fromX + (currentX - fromX) * 0.3,
                    fromY + (currentY - fromY) * 0.3
                );
                gradient.addColorStop(0, isCritical ? 'rgba(255, 85, 0, 0.7)' : 'rgba(255, 136, 0, 0.6)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.strokeStyle = gradient;

                ctx.moveTo(currentX, currentY);
                ctx.lineTo(fromX, fromY);
                ctx.stroke();
                break;

            case 'lightShell':
            case 'tankShell':
                // Heavy tank shell with elongated shape
                const shellSize = projectileType === 'tankShell' ? 6 : 5;
                const angle = Math.atan2(toY - fromY, toX - fromX);

                // Create oblong shape for shell
                ctx.save();
                ctx.translate(currentX, currentY);
                ctx.rotate(angle);

                // Shell body
                ctx.fillStyle = isCritical ? '#FFDD00' : '#FFAA00';
                ctx.beginPath();
                ctx.ellipse(0, 0, shellSize, shellSize / 2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Shell tip
                ctx.fillStyle = isCritical ? '#FF5500' : '#FF3300';
                ctx.beginPath();
                ctx.ellipse(shellSize, 0, shellSize / 2, shellSize / 2.5, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();

                // Draw glowing trail
                ctx.shadowColor = isCritical ? 'rgba(255, 85, 0, 0.8)' : 'rgba(255, 170, 0, 0.6)';
                ctx.shadowBlur = 8;

                const trailGradient = ctx.createLinearGradient(
                    currentX, currentY,
                    currentX - Math.cos(angle) * 30,
                    currentY - Math.sin(angle) * 30
                );

                trailGradient.addColorStop(0, isCritical ? 'rgba(255, 221, 0, 0.9)' : 'rgba(255, 170, 0, 0.8)');
                trailGradient.addColorStop(0.6, isCritical ? 'rgba(255, 85, 0, 0.6)' : 'rgba(255, 51, 0, 0.5)');
                trailGradient.addColorStop(1, 'rgba(50, 50, 50, 0)');

                ctx.strokeStyle = trailGradient;
                ctx.lineWidth = shellSize;
                ctx.lineCap = 'round';

                ctx.beginPath();
                ctx.moveTo(currentX, currentY);
                ctx.lineTo(
                    currentX - Math.cos(angle) * 30,
                    currentY - Math.sin(angle) * 30
                );
                ctx.stroke();

                ctx.shadowBlur = 0;
                ctx.lineCap = 'butt';
                break;

            case 'artillery':
                // Large, arcing artillery shell
                const artillerySize = 7;

                // Calculate shell position with arc
                const directX = fromX + (toX - fromX) * progress;
                const directY = fromY + (toY - fromY) * progress;

                // Add arc trajectory - shell goes up and then down
                const arcHeight = Math.sin(progress * Math.PI) * Math.min(100, Math.abs(toX - fromX) / 2);
                const arcY = directY - arcHeight;

                // Draw the shell
                ctx.fillStyle = isCritical ? '#FF3300' : '#FF6600';
                ctx.beginPath();
                ctx.arc(directX, arcY, artillerySize, 0, Math.PI * 2);
                ctx.fill();

                // Add a glowing outline
                ctx.strokeStyle = isCritical ? 'rgba(255, 221, 0, 0.8)' : 'rgba(255, 170, 0, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(directX, arcY, artillerySize + 1, 0, Math.PI * 2);
                ctx.stroke();

                // Add a faint trail
                ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(fromX, fromY);

                // Create dashed arc path
                const steps = 10;
                for (let i = 0; i <= steps; i++) {
                    const pathProgress = i / steps;
                    const pathX = fromX + (toX - fromX) * pathProgress;
                    const pathY = fromY + (toY - fromY) * pathProgress;
                    const pathArcHeight = Math.sin(pathProgress * Math.PI) * Math.min(100, Math.abs(toX - fromX) / 2);
                    const pathArcY = pathY - pathArcHeight;

                    if (i % 2 === 0 && pathProgress < progress) {
                        ctx.lineTo(pathX, pathArcY);
                    } else if (pathProgress < progress) {
                        ctx.moveTo(pathX, pathArcY);
                    }
                }
                ctx.stroke();
                break;

            default:
                // Fallback to simple projectile
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
                ctx.fill();
        }
    }

    // Add blood splatter rendering
    drawParticle(ctx, particle) {
        if (particle.type === 'splatter') {
            // Blood splatter rendering - more irregular shape
            const { x, y, size, color, life, startTime, fadeOut } = particle;
            const elapsed = performance.now() - startTime;
            const progress = elapsed / life;

            // Calculate transparency
            let opacity = 1;
            if (fadeOut) {
                opacity = progress < 0.7 ? 1 : 1 - ((progress - 0.7) / 0.3);
            }

            // Extract base color and apply transparency
            let baseColor = color;
            if (color.startsWith('rgba')) {
                const parts = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
                if (parts) {
                    baseColor = `rgba(${parts[1]}, ${parts[2]}, ${parts[3]}, ${parseFloat(parts[4]) * opacity})`;
                }
            } else if (color.startsWith('rgb')) {
                const parts = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (parts) {
                    baseColor = `rgba(${parts[1]}, ${parts[2]}, ${parts[3]}, ${opacity})`;
                }
            }

            ctx.fillStyle = baseColor;

            // Draw irregular shape for blood splatters
            ctx.beginPath();
            const points = 5 + Math.floor(Math.random() * 3);
            const startAngle = Math.random() * Math.PI * 2;

            for (let i = 0; i < points; i++) {
                const angle = startAngle + (Math.PI * 2 * i / points);
                const pointRadius = size * (0.7 + Math.random() * 0.6);
                const px = x + Math.cos(angle) * pointRadius;
                const py = y + Math.sin(angle) * pointRadius;

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }

            ctx.closePath();
            ctx.fill();
        } else {
            // Standard rendering for other particle types
            const { x, y, size, color, life, startTime, fadeOut } = particle;
            const elapsed = performance.now() - startTime;
            const progress = elapsed / life;

            // Calculate transparency
            let opacity = 1;
            if (fadeOut) {
                opacity = 1 - progress;
            }

            // Extract base color and apply transparency
            let baseColor = color;
            if (color.startsWith('rgba')) {
                const parts = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
                if (parts) {
                    baseColor = `rgba(${parts[1]}, ${parts[2]}, ${parts[3]}, ${parseFloat(parts[4]) * opacity})`;
                }
            } else if (color.startsWith('rgb')) {
                const parts = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (parts) {
                    baseColor = `rgba(${parts[1]}, ${parts[2]}, ${parts[3]}, ${opacity})`;
                }
            }

            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawRing(ctx, ring) {
        const {x, y, radius, maxRadius, color, life, startTime} = ring;
        const elapsed = performance.now() - startTime;
        const progress = elapsed / life;

        // Calculate current radius
        const currentRadius = radius + (maxRadius - radius) * progress;

        // Calculate opacity (fade out as it expands)
        const opacity = 1 - progress;

        // Draw ring
        ctx.strokeStyle = color.replace(/[\d.]+\)$/, `${opacity})`);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawFlash(ctx, flash) {
        const { x, y, radius, color, life, startTime } = flash;
        const elapsed = performance.now() - startTime;
        const progress = elapsed / life;

        // Flash gets bigger and then smaller
        // Make sure the size is never negative
        const flashSize = Math.max(0.1, radius * (1 - Math.abs(2 * progress - 1)));

        // Create radial gradient for flash - using minimum value of 0.1 for inner radius
        const gradient = ctx.createRadialGradient(x, y, 0.1, x, y, flashSize);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
        gradient.addColorStop(0.7, color);
        gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

        // Draw flash
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, flashSize, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSmoke(ctx, smoke) {
        const { x, y, size, color, life, startTime } = smoke;
        const elapsed = performance.now() - startTime;
        const progress = elapsed / life;

        // Calculate opacity (fade out)
        const opacity = 1 - progress;
        const updatedColor = color.replace(/[\d.]+\)$/, `${opacity})`);

        // Create a more irregular smoke cloud using multiple circles
        ctx.fillStyle = updatedColor;

        // Main smoke blob
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Add some smaller blobs to make it look more cloud-like
        // Use the smoke's unique position to generate deterministic random offsets
        const seed = x * 0.1 + y * 0.1;

        for (let i = 0; i < 3; i++) {
            const offset = i + 1;
            const offsetX = Math.sin(seed + i * 1.5) * (size * 0.6);
            const offsetY = Math.cos(seed + i * 1.5) * (size * 0.6);
            const blobSize = size * (0.6 + Math.sin(seed + i) * 0.2);

            ctx.beginPath();
            ctx.arc(x + offsetX, y + offsetY, blobSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawExplosion(ctx, explosion) {
        const { x, y, currentRadius, maxRadius, duration, startTime, color1, color2, color3 } = explosion;
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;

        // Check radius to avoid negative values
        const safeRadius = Math.max(0.1, currentRadius);

        // Create radial gradient for explosion - using minimum value of 0.1 for inner radius
        const gradient = ctx.createRadialGradient(x, y, 0.1, x, y, safeRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
        gradient.addColorStop(0.2, color1);
        gradient.addColorStop(0.6, color2);
        gradient.addColorStop(1, color3);

        // Add glow effect
        ctx.shadowColor = 'rgba(255, 200, 50, 0.8)';
        ctx.shadowBlur = 20;

        // Draw explosion
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, safeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Add white highlight in the center for more realism
        if (progress < 0.3) {
            // Ensure highlight size is always positive
            const highlightSize = Math.max(0.1, safeRadius * 0.3 * (1 - progress / 0.3));
            ctx.fillStyle = `rgba(255, 255, 255, ${0.9 - progress * 3})`;
            ctx.beginPath();
            ctx.arc(x, y, highlightSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawDamageText(ctx, text) {
        const { x, y, text: content, color, outline, size, life, startTime } = text;
        const elapsed = performance.now() - startTime;
        const progress = elapsed / life;

        // Fade out text as it reaches end of life
        const opacity = progress > 0.7 ? 1 - ((progress - 0.7) / 0.3) : 1;

        // Draw text with outline for better visibility
        ctx.font = `bold ${size}px Arial`;
        ctx.textAlign = 'center';

        // Text outline
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.8})`;
        ctx.strokeText(content, x, y);

        // Text fill
        ctx.fillStyle = color.replace(/[\d.]+\)$/, `${opacity})`);
        if (!color.includes('rgba')) {
            ctx.fillStyle = `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${opacity})`;
        }
        ctx.fillText(content, x, y);

        // For critical hits, add a subtle glow
        if (content.includes('CRIT')) {
            ctx.shadowColor = 'rgba(255, 120, 0, 0.8)';
            ctx.shadowBlur = 8;
            ctx.fillText(content, x, y);
            ctx.shadowBlur = 0;
        }
    }
}
