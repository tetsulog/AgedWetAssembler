class PosterDamageGenerator {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.images = [];
        this.posters = [];
        this.textureManager = new TextureManager();
        this.loadedTextures = {
            tear: [],
            stain: [],
            wrinkle: [],
            wall: []
        };

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
            overlap: 50,
            rotation: 15
        };

        this.initCanvas();
        this.bindEvents();
        this.preloadTextures().then(() => {
            this.render();
        });
    }

    async preloadTextures() {
        const categories = ['tear', 'stain', 'wrinkle', 'wall'];

        for (const category of categories) {
            const textureUrls = this.textureManager.getTextures(category);
            this.loadedTextures[category] = [];

            for (const url of textureUrls) {
                try {
                    const img = await this.loadImage(url);
                    this.loadedTextures[category].push(img);
                } catch (e) {
                    console.error(`Failed to load ${category} texture:`, e);
                }
            }
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
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

        // Listen for texture updates
        window.addEventListener('textureAdded', () => {
            this.preloadTextures();
        });
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
                        this.layoutPosters();
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
        this.layoutPosters();
    }

    layoutPosters() {
        this.posters = [];
        if (this.images.length === 0) {
            this.render();
            return;
        }

        const overlapFactor = this.settings.overlap / 100;
        const maxRotation = this.settings.rotation;

        // Each image appears exactly once
        this.images.forEach((img, index) => {
            // Calculate scale to fit nicely
            const maxDim = Math.min(this.canvas.width, this.canvas.height) * 0.6;
            const scale = Math.min(maxDim / img.element.width, maxDim / img.element.height);
            const width = img.element.width * scale;
            const height = img.element.height * scale;

            // Position with overlap consideration
            const marginX = width * overlapFactor;
            const marginY = height * overlapFactor;
            const x = Math.random() * (this.canvas.width - width + marginX * 2) - marginX;
            const y = Math.random() * (this.canvas.height - height + marginY * 2) - marginY;

            this.posters.push({
                image: img,
                x: x,
                y: y,
                width: width,
                height: height,
                rotation: (Math.random() - 0.5) * 2 * maxRotation,
                zIndex: index,
                seed: Math.random() * 10000
            });
        });

        this.render();
    }

    shuffleLayout() {
        this.layoutPosters();
    }

    async generate() {
        await this.preloadTextures();
        this.layoutPosters();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawWallTexture();

        // Sort by zIndex and draw each poster
        this.posters.sort((a, b) => a.zIndex - b.zIndex).forEach(poster => {
            this.drawPoster(poster);
        });
    }

    drawWallTexture() {
        const { wallTexture, wallDirt } = this.settings;

        // Check if we have custom wall textures
        if (this.loadedTextures.wall.length > 0) {
            const wallImg = this.loadedTextures.wall[0];
            // Tile the wall texture
            const pattern = this.ctx.createPattern(wallImg, 'repeat');
            this.ctx.fillStyle = pattern;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback to generated wall
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

            // Add texture noise
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 50;
                data[i] = Math.min(255, Math.max(0, data[i] + noise));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
            }

            this.ctx.putImageData(imageData, 0, 0);
        }

        // Add dirt/stains overlay
        if (wallDirt > 0) {
            const dirtIntensity = wallDirt / 100;
            const spotCount = Math.floor(dirtIntensity * 30);

            for (let i = 0; i < spotCount; i++) {
                const x = Math.random() * this.canvas.width;
                const y = Math.random() * this.canvas.height;
                const radius = Math.random() * 60 + 20;
                const alpha = Math.random() * dirtIntensity * 0.3;

                const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, `rgba(40, 30, 20, ${alpha})`);
                gradient.addColorStop(1, 'rgba(40, 30, 20, 0)');

                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            }
        }
    }

    drawPoster(poster) {
        const { image, x, y, width, height, rotation, seed } = poster;

        // Create offscreen canvas for poster processing
        const offCanvas = document.createElement('canvas');
        const padding = 60;
        offCanvas.width = width + padding * 2;
        offCanvas.height = height + padding * 2;
        const offCtx = offCanvas.getContext('2d');

        // Draw original image centered with padding
        offCtx.drawImage(image.element, padding, padding, width, height);

        // Apply tear mask if available
        if (this.settings.tear.enabled && this.loadedTextures.tear.length > 0) {
            this.applyTearMask(offCtx, width, height, padding, seed);
        }

        // Apply stain overlay if available
        if (this.settings.stain.enabled) {
            this.applyStainEffect(offCtx, width, height, padding, seed);
        }

        // Apply wrinkle overlay if available
        if (this.settings.wrinkle.enabled) {
            this.applyWrinkleEffect(offCtx, width, height, padding, seed);
        }

        // Apply fade effect
        if (this.settings.fade.enabled) {
            this.applyFadeEffect(offCtx, offCanvas.width, offCanvas.height);
        }

        // Apply weather effect
        if (this.settings.weather.enabled) {
            this.applyWeatherEffect(offCtx, offCanvas.width, offCanvas.height, seed);
        }

        // Draw to main canvas with rotation
        this.ctx.save();
        this.ctx.translate(x + width / 2, y + height / 2);
        this.ctx.rotate((rotation * Math.PI) / 180);

        // Add shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 5;
        this.ctx.shadowOffsetY = 5;

        this.ctx.drawImage(offCanvas, -width / 2 - padding, -height / 2 - padding);
        this.ctx.restore();
    }

    applyTearMask(ctx, width, height, padding, seed) {
        const tearIntensity = this.settings.tear.intensity / 100;
        const tearTextures = this.loadedTextures.tear;

        if (tearTextures.length === 0) return;

        // Select a random tear mask
        const maskIndex = Math.floor(this.seededRandom(seed) * tearTextures.length);
        const tearMask = tearTextures[maskIndex];

        // Create temporary canvas for masking
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = ctx.canvas.width;
        maskCanvas.height = ctx.canvas.height;
        const maskCtx = maskCanvas.getContext('2d');

        // Draw the tear mask scaled to poster size
        maskCtx.drawImage(tearMask, padding, padding, width, height);

        // Use the mask to cut out parts of the poster
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';

        // Add white edge effect on torn edges
        this.addTornEdgeHighlight(ctx, maskCanvas, padding, tearIntensity);
    }

    addTornEdgeHighlight(ctx, maskCanvas, padding, intensity) {
        const maskCtx = maskCanvas.getContext('2d');
        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        const w = maskCanvas.width;
        const h = maskCanvas.height;

        // Collect edge points
        const edgePoints = [];
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = (y * w + x) * 4;
                const alpha = data[idx + 3];

                if (alpha > 128) {
                    const neighbors = [
                        data[((y - 1) * w + x) * 4 + 3],
                        data[((y + 1) * w + x) * 4 + 3],
                        data[(y * w + x - 1) * 4 + 3],
                        data[(y * w + x + 1) * 4 + 3]
                    ];

                    if (neighbors.some(n => n < 128)) {
                        // Calculate edge direction
                        const dx = (data[(y * w + x + 1) * 4 + 3] || 0) - (data[(y * w + x - 1) * 4 + 3] || 0);
                        const dy = (data[((y + 1) * w + x) * 4 + 3] || 0) - (data[((y - 1) * w + x) * 4 + 3] || 0);
                        edgePoints.push({ x, y, dx, dy });
                    }
                }
            }
        }

        // Create edge canvas for torn paper effect
        const edgeCanvas = document.createElement('canvas');
        edgeCanvas.width = w;
        edgeCanvas.height = h;
        const edgeCtx = edgeCanvas.getContext('2d');

        // Layer 1: Dark shadow (for depth)
        edgeCtx.save();
        for (const point of edgePoints) {
            if (Math.random() > 0.3) continue;
            const len = Math.sqrt(point.dx * point.dx + point.dy * point.dy) || 1;
            const nx = -point.dy / len;
            const ny = point.dx / len;

            edgeCtx.fillStyle = `rgba(80, 70, 60, ${0.3 + Math.random() * 0.3})`;
            edgeCtx.beginPath();
            edgeCtx.arc(point.x + nx * 2, point.y + ny * 2, 1 + Math.random() * 2, 0, Math.PI * 2);
            edgeCtx.fill();
        }
        edgeCtx.restore();

        // Layer 2: Main white torn edge (paper fiber)
        edgeCtx.save();
        for (const point of edgePoints) {
            const len = Math.sqrt(point.dx * point.dx + point.dy * point.dy) || 1;
            const nx = -point.dy / len;
            const ny = point.dx / len;

            // Base white edge
            const baseAlpha = 0.7 + Math.random() * 0.3;
            edgeCtx.fillStyle = `rgba(255, 252, 245, ${baseAlpha})`;
            edgeCtx.fillRect(point.x, point.y, 2, 2);

            // Paper fiber strands extending outward
            if (Math.random() < 0.4 * intensity) {
                const fiberLen = 2 + Math.random() * 6 * intensity;
                const fiberAngle = Math.atan2(ny, nx) + (Math.random() - 0.5) * 0.8;

                edgeCtx.strokeStyle = `rgba(255, 250, 240, ${0.5 + Math.random() * 0.4})`;
                edgeCtx.lineWidth = 0.5 + Math.random() * 1.5;
                edgeCtx.beginPath();
                edgeCtx.moveTo(point.x, point.y);
                edgeCtx.lineTo(
                    point.x + Math.cos(fiberAngle) * fiberLen,
                    point.y + Math.sin(fiberAngle) * fiberLen
                );
                edgeCtx.stroke();
            }

            // Fuzzy fiber texture
            if (Math.random() < 0.25) {
                for (let f = 0; f < 3; f++) {
                    const fx = point.x + (Math.random() - 0.5) * 4;
                    const fy = point.y + (Math.random() - 0.5) * 4;
                    edgeCtx.fillStyle = `rgba(255, 248, 235, ${0.3 + Math.random() * 0.4})`;
                    edgeCtx.beginPath();
                    edgeCtx.arc(fx, fy, 0.5 + Math.random() * 1, 0, Math.PI * 2);
                    edgeCtx.fill();
                }
            }
        }
        edgeCtx.restore();

        // Layer 3: Highlight on the torn edge (for 3D effect)
        edgeCtx.save();
        for (const point of edgePoints) {
            if (Math.random() > 0.15) continue;
            edgeCtx.fillStyle = `rgba(255, 255, 255, ${0.6 + Math.random() * 0.4})`;
            edgeCtx.fillRect(point.x - 1, point.y - 1, 3, 3);
        }
        edgeCtx.restore();

        ctx.drawImage(edgeCanvas, 0, 0);
    }

    applyStainEffect(ctx, width, height, padding, seed) {
        const intensity = this.settings.stain.intensity / 100;

        if (this.loadedTextures.stain.length > 0) {
            // Use uploaded stain textures
            const stainCount = Math.floor(intensity * 3) + 1;
            for (let i = 0; i < stainCount; i++) {
                const stainIndex = Math.floor(this.seededRandom(seed + i * 100) * this.loadedTextures.stain.length);
                const stainImg = this.loadedTextures.stain[stainIndex];

                const stainSize = (0.3 + this.seededRandom(seed + i * 101) * 0.5) * Math.min(width, height);
                const sx = padding + this.seededRandom(seed + i * 102) * width - stainSize / 2;
                const sy = padding + this.seededRandom(seed + i * 103) * height - stainSize / 2;

                ctx.save();
                ctx.globalAlpha = intensity * (0.3 + this.seededRandom(seed + i * 104) * 0.4);
                ctx.globalCompositeOperation = 'multiply';
                ctx.drawImage(stainImg, sx, sy, stainSize, stainSize);
                ctx.restore();
            }
        } else {
            // Fallback: Generate stains procedurally
            const stainCount = Math.floor(intensity * 8) + 2;
            for (let i = 0; i < stainCount; i++) {
                const sx = padding + this.seededRandom(seed + i * 10) * width;
                const sy = padding + this.seededRandom(seed + i * 11) * height;
                const radius = this.seededRandom(seed + i * 12) * 40 + 15;
                const alpha = intensity * this.seededRandom(seed + i * 13) * 0.4;

                const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
                gradient.addColorStop(0, `rgba(80, 50, 20, ${alpha})`);
                gradient.addColorStop(0.7, `rgba(100, 70, 40, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'rgba(100, 70, 40, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.ellipse(sx, sy, radius, radius * 0.7, this.seededRandom(seed + i * 14) * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    applyWrinkleEffect(ctx, width, height, padding, seed) {
        const intensity = this.settings.wrinkle.intensity / 100;

        if (this.loadedTextures.wrinkle.length > 0) {
            // Use uploaded wrinkle textures
            const wrinkleIndex = Math.floor(this.seededRandom(seed * 2) * this.loadedTextures.wrinkle.length);
            const wrinkleImg = this.loadedTextures.wrinkle[wrinkleIndex];

            ctx.save();
            ctx.globalAlpha = intensity * 0.6;
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(wrinkleImg, padding, padding, width, height);
            ctx.restore();
        } else {
            // Fallback: Generate wrinkles procedurally
            const lineCount = Math.floor(intensity * 15) + 3;
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';

            for (let i = 0; i < lineCount; i++) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(120, 110, 100, ${intensity * 0.2})`;
                ctx.lineWidth = this.seededRandom(seed + 200 + i) * 2 + 0.5;

                let lx = padding + this.seededRandom(seed + 200 + i * 3) * width;
                let ly = padding + this.seededRandom(seed + 201 + i * 3) * height;
                ctx.moveTo(lx, ly);

                const segments = 3 + Math.floor(this.seededRandom(seed + 202 + i * 3) * 5);
                for (let j = 0; j < segments; j++) {
                    lx += (this.seededRandom(seed + 300 + i * 10 + j) - 0.5) * 80;
                    ly += (this.seededRandom(seed + 301 + i * 10 + j) - 0.5) * 80;
                    ctx.lineTo(lx, ly);
                }

                ctx.stroke();
            }

            ctx.restore();
        }
    }

    applyFadeEffect(ctx, width, height) {
        const intensity = this.settings.fade.intensity / 100;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                // Desaturation
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = data[i] + (avg - data[i]) * intensity * 0.6;
                data[i + 1] = data[i + 1] + (avg - data[i + 1]) * intensity * 0.6;
                data[i + 2] = data[i + 2] + (avg - data[i + 2]) * intensity * 0.6;

                // Yellow/sepia tint
                data[i] = Math.min(255, data[i] + intensity * 30);
                data[i + 1] = Math.min(255, data[i + 1] + intensity * 20);
                data[i + 2] = Math.max(0, data[i + 2] - intensity * 10);
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    applyWeatherEffect(ctx, width, height, seed) {
        const intensity = this.settings.weather.intensity / 100;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                // Add noise
                const noise = (this.seededRandom(seed + i * 0.001) - 0.5) * intensity * 60;
                data[i] = Math.min(255, Math.max(0, data[i] + noise));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    download() {
        const link = document.createElement('a');
        link.download = 'poster-damage-' + Date.now() + '.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    clear() {
        this.images = [];
        this.posters = [];
        this.updateImageList();
        this.render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PosterDamageGenerator();
});
