class PosterDamageGenerator {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.images = [];
        this.posters = [];

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
            rotation: 15
        };

        this.initCanvas();
        this.bindEvents();
        this.render();
    }

    initCanvas() {
        this.canvas.width = this.settings.canvasWidth;
        this.canvas.height = this.settings.canvasHeight;
    }

    bindEvents() {
        // File upload
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

        // Canvas size
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

        // Damage effects
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

        // Wall settings
        document.getElementById('wallTexture').addEventListener('change', (e) => {
            this.settings.wallTexture = e.target.value;
            this.render();
        });

        document.getElementById('wallDirt').addEventListener('input', (e) => {
            this.settings.wallDirt = parseInt(e.target.value);
            document.getElementById('wallDirtValue').textContent = e.target.value;
        });

        // Layout settings
        document.getElementById('overlap').addEventListener('input', (e) => {
            this.settings.overlap = parseInt(e.target.value);
            document.getElementById('overlapValue').textContent = e.target.value;
        });

        document.getElementById('rotation').addEventListener('input', (e) => {
            this.settings.rotation = parseInt(e.target.value);
            document.getElementById('rotationValue').textContent = e.target.value;
        });

        // Buttons
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
                        this.autoLayout();
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
        this.autoLayout();
    }

    autoLayout() {
        this.posters = [];
        if (this.images.length === 0) {
            this.render();
            return;
        }

        const overlapFactor = this.settings.overlap / 100;
        const maxRotation = this.settings.rotation;

        this.images.forEach((img, index) => {
            const scale = Math.random() * 0.3 + 0.5;
            const width = img.element.width * scale;
            const height = img.element.height * scale;

            const maxWidth = Math.min(width, this.canvas.width * 0.6);
            const maxHeight = Math.min(height, this.canvas.height * 0.6);
            const finalScale = Math.min(maxWidth / width, maxHeight / height) * scale;

            const finalWidth = img.element.width * finalScale;
            const finalHeight = img.element.height * finalScale;

            this.posters.push({
                image: img,
                x: Math.random() * (this.canvas.width - finalWidth * (1 - overlapFactor)),
                y: Math.random() * (this.canvas.height - finalHeight * (1 - overlapFactor)),
                width: finalWidth,
                height: finalHeight,
                rotation: (Math.random() - 0.5) * 2 * maxRotation,
                zIndex: index
            });
        });

        this.render();
    }

    shuffleLayout() {
        this.autoLayout();
    }

    generate() {
        this.render();
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw wall texture
        this.drawWallTexture();

        // Draw posters with effects
        this.posters.sort((a, b) => a.zIndex - b.zIndex).forEach(poster => {
            this.drawPoster(poster);
        });
    }

    drawWallTexture() {
        const { wallTexture, wallDirt } = this.settings;

        // Base wall color
        let baseColor;
        switch (wallTexture) {
            case 'concrete':
                baseColor = { r: 140, g: 140, b: 135 };
                break;
            case 'brick':
                baseColor = { r: 150, g: 90, b: 70 };
                break;
            case 'metal':
                baseColor = { r: 120, g: 125, b: 130 };
                break;
            case 'wood':
                baseColor = { r: 160, g: 120, b: 80 };
                break;
            default:
                baseColor = { r: 140, g: 140, b: 135 };
        }

        // Fill base
        this.ctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Add texture noise
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 40;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }

        this.ctx.putImageData(imageData, 0, 0);

        // Add dirt/stains
        const dirtCount = Math.floor(wallDirt * 2);
        for (let i = 0; i < dirtCount; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const radius = Math.random() * 50 + 10;
            const alpha = Math.random() * 0.15;

            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(50, 40, 30, ${alpha})`);
            gradient.addColorStop(1, 'rgba(50, 40, 30, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }

        // Add cracks for concrete
        if (wallTexture === 'concrete') {
            this.drawCracks();
        }
    }

    drawCracks() {
        const crackCount = 3 + Math.floor(Math.random() * 5);

        for (let i = 0; i < crackCount; i++) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(60, 60, 60, ${0.1 + Math.random() * 0.2})`;
            this.ctx.lineWidth = Math.random() * 2 + 0.5;

            let x = Math.random() * this.canvas.width;
            let y = Math.random() * this.canvas.height;
            this.ctx.moveTo(x, y);

            const segments = 5 + Math.floor(Math.random() * 10);
            for (let j = 0; j < segments; j++) {
                x += (Math.random() - 0.5) * 60;
                y += Math.random() * 30 + 10;
                this.ctx.lineTo(x, y);
            }

            this.ctx.stroke();
        }
    }

    drawPoster(poster) {
        const { image, x, y, width, height, rotation } = poster;

        // Create offscreen canvas for poster processing
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width + 40;
        offCanvas.height = height + 40;
        const offCtx = offCanvas.getContext('2d');

        // Draw original image
        offCtx.drawImage(image.element, 20, 20, width, height);

        // Apply damage effects
        if (this.settings.fade.enabled) {
            this.applyFadeEffect(offCtx, width, height);
        }

        if (this.settings.stain.enabled) {
            this.applyStainEffect(offCtx, width, height);
        }

        if (this.settings.wrinkle.enabled) {
            this.applyWrinkleEffect(offCtx, width, height);
        }

        if (this.settings.weather.enabled) {
            this.applyWeatherEffect(offCtx, width, height);
        }

        // Draw tear effect on main canvas
        this.ctx.save();
        this.ctx.translate(x + width / 2, y + height / 2);
        this.ctx.rotate((rotation * Math.PI) / 180);

        if (this.settings.tear.enabled || this.settings.peeling.enabled) {
            this.drawWithTearEffect(offCanvas, -width / 2 - 20, -height / 2 - 20);
        } else {
            this.ctx.drawImage(offCanvas, -width / 2 - 20, -height / 2 - 20);
        }

        this.ctx.restore();
    }

    applyFadeEffect(ctx, width, height) {
        const intensity = this.settings.fade.intensity / 100;
        const imageData = ctx.getImageData(0, 0, width + 40, height + 40);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                // Reduce saturation
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = data[i] + (avg - data[i]) * intensity * 0.5;
                data[i + 1] = data[i + 1] + (avg - data[i + 1]) * intensity * 0.5;
                data[i + 2] = data[i + 2] + (avg - data[i + 2]) * intensity * 0.5;

                // Add slight yellow tint (aging effect)
                data[i] = Math.min(255, data[i] + intensity * 20);
                data[i + 1] = Math.min(255, data[i + 1] + intensity * 15);
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    applyStainEffect(ctx, width, height) {
        const intensity = this.settings.stain.intensity / 100;
        const stainCount = Math.floor(intensity * 10) + 1;

        for (let i = 0; i < stainCount; i++) {
            const x = Math.random() * width + 20;
            const y = Math.random() * height + 20;
            const radius = Math.random() * 40 + 10;
            const alpha = Math.random() * intensity * 0.4;

            // Water stain effect
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            const stainType = Math.random();

            if (stainType < 0.5) {
                // Brown stain
                gradient.addColorStop(0, `rgba(100, 70, 40, ${alpha})`);
                gradient.addColorStop(0.7, `rgba(80, 60, 30, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'rgba(80, 60, 30, 0)');
            } else {
                // Water mark
                gradient.addColorStop(0, `rgba(120, 100, 80, ${alpha * 0.3})`);
                gradient.addColorStop(0.5, `rgba(100, 80, 60, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'rgba(100, 80, 60, 0)');
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(x, y, radius, radius * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    applyWrinkleEffect(ctx, width, height) {
        const intensity = this.settings.wrinkle.intensity / 100;
        const lineCount = Math.floor(intensity * 20) + 5;

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';

        for (let i = 0; i < lineCount; i++) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100, 100, 100, ${intensity * 0.15})`;
            ctx.lineWidth = Math.random() * 2 + 0.5;

            const startX = Math.random() * width + 20;
            const startY = Math.random() * height + 20;
            ctx.moveTo(startX, startY);

            const segments = 3 + Math.floor(Math.random() * 5);
            let x = startX;
            let y = startY;

            for (let j = 0; j < segments; j++) {
                x += (Math.random() - 0.5) * 80;
                y += (Math.random() - 0.5) * 80;
                ctx.lineTo(x, y);
            }

            ctx.stroke();
        }

        ctx.restore();
    }

    applyWeatherEffect(ctx, width, height) {
        const intensity = this.settings.weather.intensity / 100;
        const imageData = ctx.getImageData(0, 0, width + 40, height + 40);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                // Add noise
                const noise = (Math.random() - 0.5) * intensity * 50;
                data[i] = Math.min(255, Math.max(0, data[i] + noise));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));

                // Slight transparency at edges
                const edgeX = (i / 4) % (width + 40);
                const edgeY = Math.floor((i / 4) / (width + 40));
                const edgeDist = Math.min(edgeX, width + 40 - edgeX, edgeY, height + 40 - edgeY);

                if (edgeDist < 30 && Math.random() < intensity * 0.3) {
                    data[i + 3] = Math.max(0, data[i + 3] - Math.random() * 50);
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    drawWithTearEffect(sourceCanvas, x, y) {
        const tearIntensity = this.settings.tear.intensity / 100;
        const peelingIntensity = this.settings.peeling.intensity / 100;

        // Draw with torn edges
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;

        // Create clipping path for torn edges
        this.ctx.save();
        this.ctx.beginPath();

        // Top edge with tears
        this.ctx.moveTo(x, y);
        for (let i = 0; i <= width; i += 10) {
            const tearOffset = Math.random() * tearIntensity * 15 * (Math.random() > 0.7 ? 1 : 0);
            this.ctx.lineTo(x + i, y + tearOffset);
        }

        // Right edge
        for (let i = 0; i <= height; i += 10) {
            const tearOffset = Math.random() * tearIntensity * 15 * (Math.random() > 0.7 ? 1 : 0);
            this.ctx.lineTo(x + width - tearOffset, y + i);
        }

        // Bottom edge
        for (let i = width; i >= 0; i -= 10) {
            const tearOffset = Math.random() * tearIntensity * 15 * (Math.random() > 0.7 ? 1 : 0);
            this.ctx.lineTo(x + i, y + height - tearOffset);
        }

        // Left edge
        for (let i = height; i >= 0; i -= 10) {
            const tearOffset = Math.random() * tearIntensity * 15 * (Math.random() > 0.7 ? 1 : 0);
            this.ctx.lineTo(x + tearOffset, y + i);
        }

        this.ctx.closePath();
        this.ctx.clip();

        // Draw the poster
        this.ctx.drawImage(sourceCanvas, x, y);

        // Add peeling effect (corners lifting)
        if (peelingIntensity > 0) {
            // Shadow for peeling corner
            const corners = [
                { cx: x, cy: y }, // top-left
                { cx: x + width, cy: y }, // top-right
                { cx: x + width, cy: y + height }, // bottom-right
                { cx: x, cy: y + height } // bottom-left
            ];

            corners.forEach((corner, index) => {
                if (Math.random() < peelingIntensity) {
                    const size = 20 + Math.random() * 30 * peelingIntensity;
                    const gradient = this.ctx.createRadialGradient(
                        corner.cx, corner.cy, 0,
                        corner.cx, corner.cy, size
                    );
                    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(corner.cx - size, corner.cy - size, size * 2, size * 2);
                }
            });
        }

        this.ctx.restore();
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PosterDamageGenerator();
});
