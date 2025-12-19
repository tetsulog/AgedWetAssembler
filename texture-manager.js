/**
 * TextureManager - テクスチャの保存・読み込みを管理
 * localStorageを使用してBase64形式で保存
 */
class TextureManager {
    constructor() {
        this.storageKey = 'posterDamageTextures';
        this.textures = this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load textures:', e);
        }
        return {
            tear: [],
            stain: [],
            wrinkle: [],
            wall: []
        };
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.textures));
        } catch (e) {
            console.error('Failed to save textures:', e);
            if (e.name === 'QuotaExceededError') {
                alert('ストレージ容量が不足しています。一部のテクスチャを削除してください。');
            }
        }
    }

    addTextures(category, files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Resize image if too large to save storage
                    this.resizeAndStore(category, e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    resizeAndStore(category, dataUrl) {
        const img = new Image();
        img.onload = () => {
            const maxSize = 512; // Max dimension
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                } else {
                    width = (width / height) * maxSize;
                    height = maxSize;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const resizedDataUrl = canvas.toDataURL('image/png', 0.8);
            this.textures[category].push(resizedDataUrl);
            this.save();

            // Dispatch event for UI update
            window.dispatchEvent(new CustomEvent('textureAdded', {
                detail: { category }
            }));
        };
        img.src = dataUrl;
    }

    getTextures(category) {
        return this.textures[category] || [];
    }

    getAllTextures() {
        return this.textures;
    }

    removeTexture(category, index) {
        if (this.textures[category]) {
            this.textures[category].splice(index, 1);
            this.save();
        }
    }

    clearCategory(category) {
        if (this.textures[category]) {
            this.textures[category] = [];
            this.save();
        }
    }

    hasTextures(category) {
        return this.textures[category] && this.textures[category].length > 0;
    }

    getRandomTexture(category) {
        const textures = this.textures[category];
        if (textures && textures.length > 0) {
            return textures[Math.floor(Math.random() * textures.length)];
        }
        return null;
    }

    // Load texture as Image element (returns Promise)
    loadTextureAsImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    // Get multiple random textures
    getRandomTextures(category, count) {
        const textures = this.textures[category];
        if (!textures || textures.length === 0) return [];

        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(textures[Math.floor(Math.random() * textures.length)]);
        }
        return result;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextureManager;
}
