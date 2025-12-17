class PosterDamageGenerator {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.images = [];
        this.posterFragments = [];
        this.seed = Math.random() * 10000;

        this.settings = {
            canvasWidth: 1200,
            canvasHeight: 800,
            tear: { enabled: true, intensity: 50 },
            wrinkle: { enabled: true, intensity: 40 },
            stain: { enabled: true, intensity: 30 },
            fade: { enabled: true, intensity: 25 },
            peeling: { enabled: true, intensity: 35 },
            weather: { enabled: true, intensity: 20 },
            wallTexture: 'concrete',
            wallDirt: 50,
            overlap: 30,
            rotation: 15,
            chaos: 50,
            density: 50
        };

        this.initCanvas();
        this.bindEvents();
        this.render();
    }

    // Seeded random for consistent results
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    initCanvas() {
        this.canvas.width = this.settings.canvasWidth;
        this.canvas.height = this.settings.canvasHeight;
    }

    bindEvents() {
        const imageInput = document.getElementById('imageInput');
        const uploadZone = document.getElementById('uploadZone');

        imageInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        document.getElementById('canvasWidth').addEventListener('input', (e) => {
            this.settings.canvasWidth = parseInt(e.target.value);
            document.getElementById('canvasWidthValue').textContent = e.target.value;
            this.initCanvas();
            this.render();
        });

        document.getElementById('canvasHeight').addEventListener('input', (e) => {
            this.settings.canvasHeight = parseInt(e.target.value);
            document.getElementById('canvasHeightValue').textContent = e.target.value;
            this.initCanvas();
            this.render();
        });

        const effectSettings = [
            { id: 'Tear', key: 'tear' },
            { id: 'Wrinkle', key: 'wrinkle' },
            { id: 'Stain', key: 'stain' },
            { id: 'Fade', key: 'fade' },
            { id: 'Peeling', key: 'peeling' },
            { id: 'Weather', key: 'weather' }
        ];

        effectSettings.forEach(({ id, key }) => {
            document.getElementById(`enable${id}`).addEventListener('change', (e) => {
                this.settings[key].enabled = e.target.checked;
            });
            document.getElementById(`${key}Intensity`).addEventListener('input', (e) => {
                this.settings[key].intensity = parseInt(e.target.value);
            });
        });

        document.getElementById('wallTexture').addEventListener('change', (e) => {
            this.settings.wallTexture = e.target.value;
            this.render();
        });

        document.getElementById('wallDirt').addEventListener('input', (e) => {
            this.settings.wallDirt = parseInt(e.target.value);
            document.getElementById('wallDirtValue').textContent = e.target.value;
        });

        document.getElementById('overlap').addEventListener('input', (e) => {
            this.settings.overlap = parseInt(e.target.value);
            document.getElementById('overlapValue').textContent = e.target.value;
        });

        document.getElementById('rotation').addEventListener('input', (e) => {
            this.settings.rotation = parseInt(e.target.value);
            document.getElementById('rotationValue').textContent = e.target.value;
        });

        document.getElementById('shuffleLayout').addEventListener('click', () => this.shuffleLayout());
        document.getElementById('generateBtn').addEventListener('click', () => this.generate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.download());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        this.images.push({
                            id: Date.now() + Math.random(),
                            element: img,
                            name: file.name
                        });
                        this.updateImageList();
                        this.generateChaosLayout();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    updateImageList() {
        const container = document.getElementById('uploadedImages');
        container.innerHTML = '';

        this.images.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'uploaded-image';
            div.innerHTML = `
                <img src="${img.element.src}" alt="${img.name}">
                <button class="remove-btn" data-index="${index}">&times;</button>
            `;
            div.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeImage(index);
            });
            container.appendChild(div);
        });
    }

    removeImage(index) {
        this.images.splice(index, 1);
        this.updateImageList();
        this.generateChaosLayout();
    }

    // Generate irregular torn shape path
    generateTornPath(width, height, tearIntensity, seed) {
        const points = [];
        const segments = 30;

        // Decide which edges/sections to tear off
        const tearTop = this.seededRandom(seed * 1.1) < tearIntensity * 0.8;
        const tearRight = this.seededRandom(seed * 1.2) < tearIntensity * 0.8;
        const tearBottom = this.seededRandom(seed * 1.3) < tearIntensity * 0.8;
        const tearLeft = this.seededRandom(seed * 1.4) < tearIntensity * 0.8;

        // Large chunk removal
        const removeChunk = this.seededRandom(seed * 2) < tearIntensity * 0.6;
        const chunkSide = Math.floor(this.seededRandom(seed * 2.1) * 4);
        const chunkStart = this.seededRandom(seed * 2.2) * 0.6 + 0.1;
        const chunkSize = this.seededRandom(seed * 2.3) * 0.4 + 0.2;
        const chunkDepth = this.seededRandom(seed * 2.4) * 0.5 + 0.2;

        // Top edge
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            let x = t * width;
            let y = 0;

            if (tearTop) {
                const noise = this.seededRandom(seed + i * 0.1) * tearIntensity * height * 0.15;
                y += noise;
                // Jagged tears
                if (this.seededRandom(seed + i * 0.2) < 0.3) {
                    y += this.seededRandom(seed + i * 0.3) * tearIntensity * height * 0.1;
                }
            }

            // Chunk removal on top
            if (removeChunk && chunkSide === 0 && t > chunkStart && t < chunkStart + chunkSize) {
                y += chunkDepth * height;
            }

            points.push({ x, y });
        }

        // Right edge
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            let x = width;
            let y = t * height;

            if (tearRight) {
                const noise = this.seededRandom(seed + 100 + i * 0.1) * tearIntensity * width * 0.15;
                x -= noise;
                if (this.seededRandom(seed + 100 + i * 0.2) < 0.3) {
                    x -= this.seededRandom(seed + 100 + i * 0.3) * tearIntensity * width * 0.1;
                }
            }

            if (removeChunk && chunkSide === 1 && t > chunkStart && t < chunkStart + chunkSize) {
                x -= chunkDepth * width;
            }

            points.push({ x, y });
        }

        // Bottom edge (reversed)
        for (let i = segments - 1; i >= 0; i--) {
            const t = i / segments;
            let x = t * width;
            let y = height;

            if (tearBottom) {
                const noise = this.seededRandom(seed + 200 + i * 0.1) * tearIntensity * height * 0.15;
                y -= noise;
                if (this.seededRandom(seed + 200 + i * 0.2) < 0.3) {
                    y -= this.seededRandom(seed + 200 + i * 0.3) * tearIntensity * height * 0.1;
                }
            }

            if (removeChunk && chunkSide === 2 && t > chunkStart && t < chunkStart + chunkSize) {
                y -= chunkDepth * height;
            }

            points.push({ x, y });
        }

        // Left edge (reversed)
        for (let i = segments - 1; i >= 1; i--) {
            const t = i / segments;
            let x = 0;
            let y = t * height;

            if (tearLeft) {
                const noise = this.seededRandom(seed + 300 + i * 0.1) * tearIntensity * width * 0.15;
                x += noise;
                if (this.seededRandom(seed + 300 + i * 0.2) < 0.3) {
                    x += this.seededRandom(seed + 300 + i * 0.3) * tearIntensity * width * 0.1;
                }
            }

            if (removeChunk && chunkSide === 3 && t > chunkStart && t < chunkStart + chunkSize) {
                x += chunkDepth * width;
            }

            points.push({ x, y });
        }

        return points;
    }

    // Generate rip/tear holes in the middle
    generateTearHoles(width, height, intensity, seed) {
        const holes = [];
        const holeCount = Math.floor(intensity * 5);

        for (let i = 0; i < holeCount; i++) {
            if (this.seededRandom(seed + i * 10) > 0.6) continue;

            const cx = this.seededRandom(seed + i * 10 + 1) * width * 0.6 + width * 0.2;
            const cy = this.seededRandom(seed + i * 10 + 2) * height * 0.6 + height * 0.2;
            const size = (this.seededRandom(seed + i * 10 + 3) * 0.15 + 0.05) * Math.min(width, height);

            const holePoints = [];
            const segments = 12;
            for (let j = 0; j < segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                const r = size * (0.5 + this.seededRandom(seed + i * 10 + j) * 0.5);
                holePoints.push({
                    x: cx + Math.cos(angle) * r,
                    y: cy + Math.sin(angle) * r
                });
            }
            holes.push(holePoints);
        }

        return holes;
    }

    generateChaosLayout() {
        this.posterFragments = [];
        if (this.images.length === 0) {
            this.render();
            return;
        }

        const overlap = this.settings.overlap / 100;
        const maxRotation = this.settings.rotation;
        const tearIntensity = this.settings.tear.intensity / 100;

        // Create multiple fragments from each image
        const fragmentsPerImage = Math.max(3, Math.floor(5 + overlap * 5));

        let zIndex = 0;

        this.images.forEach((img, imgIndex) => {
            for (let f = 0; f < fragmentsPerImage; f++) {
                const seed = this.seed + imgIndex * 1000 + f * 100;

                // Vary scale significantly
                const baseScale = 0.3 + this.seededRandom(seed) * 0.5;
                const width = img.element.width * baseScale;
                const height = img.element.height * baseScale;

                // Constrain to canvas while allowing overflow
                const maxW = this.canvas.width * 0.7;
                const maxH = this.canvas.height * 0.7;
                const scale = Math.min(maxW / width, maxH / height, 1) * baseScale;

                const finalWidth = img.element.width * scale;
                const finalHeight = img.element.height * scale;

                // Random position with controlled overlap
                const x = (this.seededRandom(seed + 1) - 0.2) * (this.canvas.width - finalWidth * 0.3);
                const y = (this.seededRandom(seed + 2) - 0.2) * (this.canvas.height - finalHeight * 0.3);

                // Which portion of the original image to show
                const cropX = this.seededRandom(seed + 3) * 0.3;
                const cropY = this.seededRandom(seed + 4) * 0.3;
                const cropW = 0.7 + this.seededRandom(seed + 5) * 0.3;
                const cropH = 0.7 + this.seededRandom(seed + 6) * 0.3;

                this.posterFragments.push({
                    image: img,
                    x: x,
                    y: y,
                    width: finalWidth,
                    height: finalHeight,
                    rotation: (this.seededRandom(seed + 7) - 0.5) * 2 * maxRotation,
                    zIndex: zIndex++,
                    seed: seed,
                    cropX: cropX,
                    cropY: cropY,
                    cropW: cropW,
                    cropH: cropH,
                    tearIntensity: tearIntensity * (0.5 + this.seededRandom(seed + 8) * 0.5)
                });
            }
        });

        // Sort by zIndex
        this.posterFragments.sort((a, b) => a.zIndex - b.zIndex);
        this.render();
    }

    shuffleLayout() {
        this.seed = Math.random() * 10000;
        this.generateChaosLayout();
    }

    generate() {
        this.seed = Math.random() * 10000;
        this.generateChaosLayout();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawWallTexture();

        this.posterFragments.forEach(fragment => {
            this.drawPosterFragment(fragment);
        });

        // Add overall weathering
        this.addOverallWeathering();
    }

    drawWallTexture() {
        const { wallTexture, wallDirt } = this.settings;

        let baseColor;
        switch (wallTexture) {
            case 'concrete':
                baseColor = { r: 160, g: 155, b: 150 };
                break;
            case 'brick':
                baseColor = { r: 150, g: 90, b: 70 };
                break;
            case 'metal':
                baseColor = { r: 130, g: 135, b: 140 };
                break;
            case 'wood':
                baseColor = { r: 160, g: 120, b: 80 };
                break;
            default:
                baseColor = { r: 160, g: 155, b: 150 };
        }

        this.ctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Strong texture noise
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 60;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }

        this.ctx.putImageData(imageData, 0, 0);

        // Add dirt patches
        const dirtCount = Math.floor(wallDirt * 3);
        for (let i = 0; i < dirtCount; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const radius = Math.random() * 80 + 20;
            const alpha = Math.random() * 0.25;

            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(40, 30, 20, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(50, 40, 30, ${alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(50, 40, 30, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }

        // Add old poster residue/glue marks
        const residueCount = Math.floor(wallDirt * 1.5);
        for (let i = 0; i < residueCount; i++) {
            this.ctx.fillStyle = `rgba(200, 190, 170, ${Math.random() * 0.3 + 0.1})`;
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const w = Math.random() * 100 + 30;
            const h = Math.random() * 100 + 30;

            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(Math.random() * Math.PI * 2);
            this.ctx.fillRect(-w/2, -h/2, w, h);
            this.ctx.restore();
        }

        if (wallTexture === 'concrete') {
            this.drawCracks();
        }
    }

    drawCracks() {
        const crackCount = 5 + Math.floor(Math.random() * 8);

        for (let i = 0; i < crackCount; i++) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(50, 45, 40, ${0.15 + Math.random() * 0.25})`;
            this.ctx.lineWidth = Math.random() * 3 + 0.5;

            let x = Math.random() * this.canvas.width;
            let y = Math.random() * this.canvas.height;
            this.ctx.moveTo(x, y);

            const segments = 8 + Math.floor(Math.random() * 15);
            for (let j = 0; j < segments; j++) {
                x += (Math.random() - 0.5) * 80;
                y += Math.random() * 40 + 5;
                this.ctx.lineTo(x, y);

                // Branch cracks
                if (Math.random() < 0.3) {
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(
                        x + (Math.random() - 0.5) * 40,
                        y + Math.random() * 30
                    );
                    this.ctx.moveTo(x, y);
                }
            }

            this.ctx.stroke();
        }
    }

    drawPosterFragment(fragment) {
        const { image, x, y, width, height, rotation, seed, tearIntensity } = fragment;

        // Create offscreen canvas
        const offCanvas = document.createElement('canvas');
        const padding = 50;
        offCanvas.width = width + padding * 2;
        offCanvas.height = height + padding * 2;
        const offCtx = offCanvas.getContext('2d');

        // Generate torn shape
        const tornPath = this.generateTornPath(width, height, tearIntensity, seed);
        const holes = this.generateTearHoles(width, height, tearIntensity, seed);

        // Apply clipping path
        offCtx.save();
        offCtx.translate(padding, padding);

        offCtx.beginPath();
        tornPath.forEach((point, i) => {
            if (i === 0) {
                offCtx.moveTo(point.x, point.y);
            } else {
                offCtx.lineTo(point.x, point.y);
            }
        });
        offCtx.closePath();

        // Cut out holes
        holes.forEach(hole => {
            offCtx.moveTo(hole[0].x, hole[0].y);
            for (let i = hole.length - 1; i >= 0; i--) {
                offCtx.lineTo(hole[i].x, hole[i].y);
            }
            offCtx.closePath();
        });

        offCtx.clip('evenodd');

        // Draw the image portion
        const srcX = fragment.cropX * image.element.width;
        const srcY = fragment.cropY * image.element.height;
        const srcW = fragment.cropW * image.element.width;
        const srcH = fragment.cropH * image.element.height;

        offCtx.drawImage(
            image.element,
            srcX, srcY, srcW, srcH,
            0, 0, width, height
        );

        offCtx.restore();

        // Apply damage effects to the offscreen canvas
        this.applyDamageEffects(offCtx, width + padding * 2, height + padding * 2, seed);

        // Draw torn edge shadows/highlights
        this.drawTornEdgeEffects(offCtx, tornPath, holes, padding, seed);

        // Draw to main canvas
        this.ctx.save();
        this.ctx.translate(x + width / 2, y + height / 2);
        this.ctx.rotate((rotation * Math.PI) / 180);

        // Add drop shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;

        this.ctx.drawImage(offCanvas, -width / 2 - padding, -height / 2 - padding);
        this.ctx.restore();
    }

    applyDamageEffects(ctx, width, height, seed) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const fadeInt = this.settings.fade.enabled ? this.settings.fade.intensity / 100 : 0;
        const weatherInt = this.settings.weather.enabled ? this.settings.weather.intensity / 100 : 0;
        const stainInt = this.settings.stain.enabled ? this.settings.stain.intensity / 100 : 0;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                // Fade effect - desaturation and yellowing
                if (fadeInt > 0) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = data[i] + (avg - data[i]) * fadeInt * 0.7;
                    data[i + 1] = data[i + 1] + (avg - data[i + 1]) * fadeInt * 0.7;
                    data[i + 2] = data[i + 2] + (avg - data[i + 2]) * fadeInt * 0.7;

                    // Yellow/sepia tint
                    data[i] = Math.min(255, data[i] + fadeInt * 35);
                    data[i + 1] = Math.min(255, data[i + 1] + fadeInt * 25);
                    data[i + 2] = Math.max(0, data[i + 2] - fadeInt * 15);
                }

                // Weather noise
                if (weatherInt > 0) {
                    const noise = (this.seededRandom(seed + i) - 0.5) * weatherInt * 80;
                    data[i] = Math.min(255, Math.max(0, data[i] + noise));
                    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Stain overlays
        if (stainInt > 0) {
            const stainCount = Math.floor(stainInt * 15) + 3;
            for (let i = 0; i < stainCount; i++) {
                const sx = this.seededRandom(seed + i * 20) * width;
                const sy = this.seededRandom(seed + i * 20 + 1) * height;
                const radius = this.seededRandom(seed + i * 20 + 2) * 60 + 20;
                const alpha = this.seededRandom(seed + i * 20 + 3) * stainInt * 0.5;

                const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);

                const stainType = this.seededRandom(seed + i * 20 + 4);
                if (stainType < 0.4) {
                    // Brown coffee/water stain
                    gradient.addColorStop(0, `rgba(80, 50, 20, ${alpha})`);
                    gradient.addColorStop(0.6, `rgba(100, 70, 40, ${alpha * 0.7})`);
                    gradient.addColorStop(1, 'rgba(100, 70, 40, 0)');
                } else if (stainType < 0.7) {
                    // Gray dirt
                    gradient.addColorStop(0, `rgba(60, 60, 50, ${alpha * 0.8})`);
                    gradient.addColorStop(1, 'rgba(60, 60, 50, 0)');
                } else {
                    // Water ring mark
                    gradient.addColorStop(0, 'rgba(120, 110, 90, 0)');
                    gradient.addColorStop(0.7, `rgba(90, 80, 60, ${alpha * 0.4})`);
                    gradient.addColorStop(0.85, `rgba(110, 100, 80, ${alpha * 0.6})`);
                    gradient.addColorStop(1, 'rgba(110, 100, 80, 0)');
                }

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.ellipse(sx, sy, radius, radius * (0.6 + this.seededRandom(seed + i * 20 + 5) * 0.4),
                    this.seededRandom(seed + i * 20 + 6) * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Wrinkle lines
        if (this.settings.wrinkle.enabled) {
            const wrinkleInt = this.settings.wrinkle.intensity / 100;
            const lineCount = Math.floor(wrinkleInt * 30) + 5;

            ctx.save();
            ctx.globalCompositeOperation = 'multiply';

            for (let i = 0; i < lineCount; i++) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(80, 75, 70, ${wrinkleInt * 0.25})`;
                ctx.lineWidth = this.seededRandom(seed + 500 + i) * 2.5 + 0.5;

                let lx = this.seededRandom(seed + 500 + i * 3) * width;
                let ly = this.seededRandom(seed + 500 + i * 3 + 1) * height;
                ctx.moveTo(lx, ly);

                const segments = 4 + Math.floor(this.seededRandom(seed + 500 + i * 3 + 2) * 6);
                for (let j = 0; j < segments; j++) {
                    lx += (this.seededRandom(seed + 500 + i * 10 + j) - 0.5) * 100;
                    ly += (this.seededRandom(seed + 501 + i * 10 + j) - 0.5) * 100;
                    ctx.lineTo(lx, ly);
                }

                ctx.stroke();
            }

            ctx.restore();
        }
    }

    drawTornEdgeEffects(ctx, tornPath, holes, padding, seed) {
        ctx.save();
        ctx.translate(padding, padding);

        // Draw torn paper edge highlight (white edge showing paper fiber)
        ctx.strokeStyle = 'rgba(255, 250, 240, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        tornPath.forEach((point, i) => {
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.closePath();
        ctx.stroke();

        // Draw shadow on torn edges
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);

        tornPath.forEach((point, i) => {
            if (this.seededRandom(seed + i * 0.5) < 0.3) {
                ctx.beginPath();
                ctx.moveTo(point.x - 2, point.y + 2);
                const next = tornPath[(i + 1) % tornPath.length];
                ctx.lineTo(next.x - 2, next.y + 2);
                ctx.stroke();
            }
        });

        // Draw hole edges
        holes.forEach((hole, hi) => {
            ctx.strokeStyle = 'rgba(255, 250, 240, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            hole.forEach((point, i) => {
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.closePath();
            ctx.stroke();
        });

        ctx.restore();
    }

    addOverallWeathering() {
        if (!this.settings.weather.enabled) return;

        const intensity = this.settings.weather.intensity / 100;

        // Add overall grain/dust
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < intensity * 0.1) {
                const dust = Math.random() * 30;
                data[i] = Math.min(255, data[i] + dust);
                data[i + 1] = Math.min(255, data[i + 1] + dust);
                data[i + 2] = Math.min(255, data[i + 2] + dust);
            }
        }

        this.ctx.putImageData(imageData, 0, 0);

        // Add scratches
        const scratchCount = Math.floor(intensity * 20);
        for (let i = 0; i < scratchCount; i++) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
            this.ctx.lineWidth = Math.random() * 1.5;

            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(
                x + (Math.random() - 0.5) * 100,
                y + (Math.random() - 0.5) * 100
            );
            this.ctx.stroke();
        }
    }

    download() {
        const link = document.createElement('a');
        link.download = 'poster-damage-' + Date.now() + '.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    clear() {
        this.images = [];
        this.posterFragments = [];
        this.updateImageList();
        this.render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PosterDamageGenerator();
});
