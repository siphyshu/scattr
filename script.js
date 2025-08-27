// Scattr - Smart Asset Layout Generator
// Implementation of Bridson's Fast Poisson Disk Sampling Algorithm

class ScattrApp {
    constructor() {
        this.assets = [];
        this.background = null;
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.samples = [];
        this.isGenerated = false;
        this.zoomLevel = 100;
        
        this.initializeEventListeners();
        this.updateCanvasSize();
        
        // Initialize canvas update tracking
        this.canvasUpdateRequested = false;
        
        // Initialize canvas with white background
        setTimeout(() => {
            this.renderCanvas();
        }, 10);
        
        // Enable export buttons by default (can export background even without assets)
        document.getElementById('export-btn').disabled = false;
        document.getElementById('export-settings-btn').disabled = false;
    }

    initializeEventListeners() {
        // File upload handlers
        document.getElementById('asset-upload').addEventListener('change', (e) => this.handleAssetUpload(e));
        document.getElementById('bg-upload').addEventListener('change', (e) => this.handleBackgroundUpload(e));

        // Delete background handler
        document.getElementById('bg-delete-btn').addEventListener('click', () => this.deleteBackground());

        // Control handlers
        document.getElementById('min-distance').addEventListener('input', (e) => {
            this.updateSpacingDisplay(parseInt(e.target.value));
            if (this.assets.length > 0) {
                setTimeout(() => this.generateLayout(), 50);
            }
        });
        document.getElementById('fill-density').addEventListener('input', (e) => {
            this.updateFillDensityDisplay(parseInt(e.target.value));
            if (this.assets.length > 0) {
                setTimeout(() => this.generateLayout(), 50);
            }
        });
        document.getElementById('asset-size').addEventListener('input', (e) => {
            this.updateAssetSizeDisplay(parseInt(e.target.value));
            if (this.assets.length > 0) {
                setTimeout(() => this.generateLayout(), 50);
            }
        });

        // Toggle rotation controls
        document.getElementById('random-rotation').addEventListener('change', (e) => {
            const controls = document.getElementById('rotation-controls');
            if (e.target.checked) {
                controls.classList.remove('hidden');
            } else {
                controls.classList.add('hidden');
            }
            // Re-render existing layout with/without rotation applied
            if (this.assets.length > 0 && this.isGenerated) {
                setTimeout(() => this.renderCanvas(), 50);
            }
        });

        // Toggle scale controls
        document.getElementById('random-scale').addEventListener('change', (e) => {
            const controls = document.getElementById('scale-controls');
            if (e.target.checked) {
                controls.classList.remove('hidden');
            } else {
                controls.classList.add('hidden');
            }
            // Re-render existing layout with/without scale applied
            if (this.assets.length > 0 && this.isGenerated) {
                setTimeout(() => this.renderCanvas(), 50);
            }
        });

        // Update UI when unique assets toggle changes
        document.getElementById('unique-assets').addEventListener('change', (e) => {
            this.updateUniqueAssetsUI(e.target.checked);
            if (this.assets.length > 0) {
                setTimeout(() => this.generateLayout(), 50);
            }
        });

        // Rotation/scale range inputs
        ['rotation-min', 'rotation-max', 'scale-min', 'scale-max'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                // Re-render existing layout with new rotation/scale values
                if (this.assets.length > 0 && this.isGenerated) {
                    setTimeout(() => this.renderCanvas(), 50);
                }
            });
        });

        // Spacebar shortcut for generating layout
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
                e.preventDefault();
                this.generateLayout();
            }
        });

        // Canvas size handlers
        document.getElementById('canvas-width').addEventListener('input', (e) => this.updateCanvasSize());
        document.getElementById('canvas-height').addEventListener('input', (e) => this.updateCanvasSize());

        // Action buttons
        document.getElementById('generate-btn').addEventListener('click', () => this.generateLayout());
        
        // Export functionality
        this.setupExportDropdown();
        
        // Settings sections functionality (run last to ensure DOM is ready)
        this.setupCollapsibleSections();

        // Drag and drop for assets
        const assetDropZone = document.querySelector('#asset-upload').parentElement;
        assetDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            assetDropZone.classList.add('border-blue-500');
        });
        assetDropZone.addEventListener('dragleave', () => {
            assetDropZone.classList.remove('border-blue-500');
        });
        assetDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            assetDropZone.classList.remove('border-blue-500');
            this.handleAssetDrop(e);
        });

        // Zoom controls
        document.getElementById('zoom-slider').addEventListener('input', (e) => {
            this.setZoom(parseInt(e.target.value));
        });

        document.getElementById('zoom-percentage').addEventListener('click', () => {
            this.toggleZoomPresets();
        });
        
        // Handle window resize and orientation changes for mobile
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Re-adjust zoom on resize, especially important for mobile
                this.autoAdjustZoom();
            }, 250);
        });
        
        // Handle orientation change specifically
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.autoAdjustZoom();
            }, 100);
        });

        // Background tab handlers
        ['bg-tab-image', 'bg-tab-color', 'bg-tab-none'].forEach(tabId => {
            document.getElementById(tabId).addEventListener('click', () => {
                this.switchBackgroundTab(tabId.split('-')[2]);
            });
        });

        // Background color type handlers
        document.getElementById('color-type-solid').addEventListener('click', () => {
            this.setColorType('solid');
        });

        document.getElementById('color-type-gradient').addEventListener('click', () => {
            this.setColorType('gradient');
        });

        // Advanced color picker event listeners
        this.setupAdvancedColorPicker();

        // Gradient controls
        this.setupGradientControls();

        // Eyedropper functionality
        this.setupEyedropper();

        // Floating color picker
        this.setupFloatingColorPicker();

        // Zoom preset buttons
        document.querySelectorAll('.zoom-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const zoom = e.target.dataset.zoom;
                this.setZoomPreset(zoom);
                this.hideZoomPresets();
            });
        });

        // Close zoom presets when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#zoom-percentage') && !e.target.closest('#zoom-presets-menu')) {
                this.hideZoomPresets();
            }
        });

        // Initialize background controls
        this.currentBackgroundType = 'color';
        this.solidColor = '#ffffff'; // Default white background
        this.backgroundColorType = 'solid';
        
        // Initialize color picker after a small delay to ensure DOM is ready
        setTimeout(() => {
            this.updatePickerFromColor();
            this.updateHueHandleColor();
        }, 100);

        // Initialize UI displays
        this.updateFillDensityDisplay(5); // Medium default
        this.updateAssetSizeDisplay(4); // Original default
        this.updateSpacingDisplay(50); // 1.0x default
    }

    async handleAssetUpload(event) {
        const files = Array.from(event.target.files);
        document.getElementById('asset-preview').classList.remove('hidden');
        await this.loadAssets(files);
    }

    async handleAssetDrop(event) {
        const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        await this.loadAssets(files);
    }

    async handleBackgroundUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const img = await this.loadImage(file);
            this.background = img;
            
            // Update canvas size to match background image dimensions
            this.updateCanvasSizeToBackground(img);
            
            this.showBackgroundPreview(img);
            this.renderCanvas();
        }
    }

    async loadAssets(files) {
        for (const file of files) {
            try {
                const img = await this.loadImage(file);
                this.assets.push(img);
                this.showAssetPreview(img);
            } catch (error) {
                console.error('Error loading asset:', error);
            }
        }
        
        // Auto-calculate optimal settings and generate layout
        this.calculateOptimalSettings();
        
        // Update unique assets UI if enabled
        const uniqueOnly = document.getElementById('unique-assets').checked;
        if (uniqueOnly) {
            this.updateUniqueAssetsUI(true);
        }
        
        // Auto-generate layout with new assets
        this.generateLayout();
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    showAssetPreview(img) {
        const preview = document.getElementById('asset-preview');
        const previewItem = document.createElement('div');
        previewItem.className = 'relative bg-neutral-800 rounded p-2';
        
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 80;
        canvas.className = 'w-full h-full object-contain';
        const ctx = canvas.getContext('2d');
        
        // Calculate aspect ratio
        const ratio = Math.min(80 / img.width, 80 / img.height);
        const width = img.width * ratio;
        const height = img.height * ratio;
        const x = (80 - width) / 2;
        const y = (80 - height) / 2;
        
        ctx.drawImage(img, x, y, width, height);
        previewItem.appendChild(canvas);
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => this.deleteAsset(previewItem, img);
        previewItem.appendChild(deleteBtn);
        
        preview.appendChild(previewItem);
    }

    showBackgroundPreview(img) {
        const preview = document.getElementById('bg-preview');
        const previewImg = document.getElementById('bg-preview-img');
        previewImg.src = img.src;
        preview.classList.remove('hidden');
    }

    deleteAsset(previewItem, img) {
        const index = this.assets.indexOf(img);
        if (index > -1) {
            this.assets.splice(index, 1);
            previewItem.remove();
            
                    // Auto-calculate optimal settings and generate layout
        this.calculateOptimalSettings();
        
        // Update unique assets UI if enabled
        const uniqueOnly = document.getElementById('unique-assets').checked;
        if (uniqueOnly) {
            this.updateUniqueAssetsUI(true);
        }
        
        // Auto-generate layout with new assets
        this.generateLayout();
        }
    }

    deleteBackground() {
        this.background = null;
        const preview = document.getElementById('bg-preview');
        preview.classList.add('hidden');
        this.renderCanvas();
    }

    updateCanvasSize() {
        const width = parseInt(document.getElementById('canvas-width').value);
        const height = parseInt(document.getElementById('canvas-height').value);
        
        // Update canvas dimensions
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Update HTML attributes to match
        this.canvas.setAttribute('width', width);
        this.canvas.setAttribute('height', height);
        
        // Auto-adjust zoom to "Fit" if canvas is too big for the viewport
        this.autoAdjustZoom();
        
        // Re-render the canvas content
        this.renderCanvas();
    }

    updateCanvasSizeToBackground(img) {
        // Update the canvas size input fields to match the background image dimensions
        document.getElementById('canvas-width').value = img.width;
        document.getElementById('canvas-height').value = img.height;
        
        // Apply the new canvas size
        this.updateCanvasSize();
    }

    updateSpacingBasedOnAssets() {
        if (this.assets.length === 0) return;
        
        // Calculate appropriate spacing based on asset size setting
        const assetSize = this.getAssetSize();
        const suggestedSpacing = Math.round(assetSize * 0.6); // Reasonable default
        const clampedSpacing = Math.max(10, Math.min(200, suggestedSpacing));
        
        // Update the slider and display
        document.getElementById('min-distance').value = clampedSpacing;
        this.updateSpacingDisplay(clampedSpacing);
    }

    updateSpacingDisplay(value) {
        const multiplier = (value / 50).toFixed(1); // Convert to multiplier (50px = 1.0x)
        document.getElementById('min-distance-value').textContent = `${multiplier}x`;
    }

    updateFillDensityDisplay(value) {
        const densityLabels = ['', 'Minimal', 'Very Sparse', 'Sparse', 'Light', 'Medium', 'Dense', 'Very Dense', 'Heavy', 'Maximum'];
        document.getElementById('fill-density-value').textContent = densityLabels[value] || 'Maximum';
    }

    getFillDensityAsNumItems() {
        const densityValue = parseInt(document.getElementById('fill-density').value);
        const uniqueOnly = document.getElementById('unique-assets').checked;
        
        if (uniqueOnly) {
            return this.assets.length; // Always try all unique assets
        }
        
        // Convert density level (1-10) to number of items (10-200)
        // Using exponential scaling for more intuitive feel
        const minItems = 10;
        const maxItems = 200;
        const normalizedDensity = (densityValue - 1) / 9; // 0 to 1
        const exponentialFactor = Math.pow(normalizedDensity, 1.5); // Slight exponential curve
        return Math.round(minItems + (maxItems - minItems) * exponentialFactor);
    }

    calculateOptimalSettings() {
        if (this.assets.length === 0) return;
        
        const canvasArea = this.canvas.width * this.canvas.height;
        const averageAssetArea = this.assets.reduce((sum, asset) => {
            const aspectRatio = Math.min(1, asset.width / asset.height, asset.height / asset.width);
            return sum + (100 * 100 * aspectRatio); // Approximate rendered area
        }, 0) / this.assets.length;
        
        // Calculate optimal density (aim for 60-70% coverage)
        const targetCoverage = 0.65;
        const optimalItems = Math.floor((canvasArea * targetCoverage) / averageAssetArea);
        
        // Convert back to density scale (1-10)
        const densityScale = Math.max(1, Math.min(10, Math.round(1 + 9 * ((optimalItems - 10) / (200 - 10)))));
        
        // Set optimal asset size (slightly smaller for better coverage)
        const optimalAssetSize = 3; // "Smaller" - good for coverage
        
        // Set moderate spacing
        const tempAssetSize = this.getAssetSize();
        const optimalSpacing = Math.round(tempAssetSize * 0.4);
        
        // Apply calculated settings
        document.getElementById('fill-density').value = densityScale;
        document.getElementById('asset-size').value = optimalAssetSize;
        document.getElementById('min-distance').value = Math.max(10, Math.min(200, optimalSpacing));
        
        // Update displays
        this.updateFillDensityDisplay(densityScale);
        this.updateAssetSizeDisplay(optimalAssetSize);
        this.updateSpacingDisplay(document.getElementById('min-distance').value);
        
        console.log(`Auto-calculated: Density ${densityScale}, Size ${optimalAssetSize}, Spacing ${optimalSpacing}px`);
    }

    updateAssetSizeDisplay(value) {
        const sizeLabels = ['', 'Tiny', 'Small', 'Smaller', 'Original', 'Bigger', 'Large', 'Huge'];
        document.getElementById('asset-size-value').textContent = sizeLabels[value] || 'Original';
    }

    getAssetSize() {
        const sliderValue = parseInt(document.getElementById('asset-size').value);
        // Map 1-7 with middle (4) being original size (100px), others are relative scaling
        const scales = [0, 0.5, 0.7, 0.85, 1.0, 1.2, 1.5, 2.0];
        const originalSize = 100; // Base reference size
        return (scales[sliderValue] || 1.0) * originalSize;
    }

    getRotationRange() {
        const minAngle = parseFloat(document.getElementById('rotation-min').value) || -60;
        const maxAngle = parseFloat(document.getElementById('rotation-max').value) || 60;
        // Convert degrees to radians
        return {
            min: (minAngle * Math.PI) / 180,
            max: (maxAngle * Math.PI) / 180
        };
    }

    getScaleRange() {
        const minScale = parseFloat(document.getElementById('scale-min').value) || 0.7;
        const maxScale = parseFloat(document.getElementById('scale-max').value) || 1.3;
        return {
            min: Math.max(0.1, minScale), // Prevent too small scales
            max: Math.min(5.0, maxScale)  // Prevent too large scales
        };
    }

    updateUniqueAssetsUI(isUnique) {
        const densityContainer = document.getElementById('fill-density').parentElement;
        const densityLabel = densityContainer.querySelector('label');
        
        if (isUnique && this.assets.length > 0) {
            // Show that we'll try to place all unique assets
            densityLabel.innerHTML = `Fill Density: <span class="text-neutral-500">${this.assets.length} unique assets</span>`;
            densityContainer.style.opacity = '0.6';
        } else {
            // Restore normal display
            const currentValue = parseInt(document.getElementById('fill-density').value);
            const densityLabels = ['', 'Minimal', 'Very Sparse', 'Sparse', 'Light', 'Medium', 'Dense', 'Very Dense', 'Heavy', 'Maximum'];
            densityLabel.innerHTML = `Fill Density: <span id="fill-density-value">${densityLabels[currentValue] || 'Medium'}</span>`;
            densityContainer.style.opacity = '1';
        }
    }

    // Pre-process assets to calculate their actual rendered sizes
    prepareAssetPool(uniqueOnly = false) {
        const assetPool = [];
        const maxSize = this.getAssetSize();
        
        const assetsToUse = uniqueOnly ? this.assets : this.assets;
        
        for (const asset of assetsToUse) {
            const ratio = Math.min(maxSize / asset.width, maxSize / asset.height);
            const baseWidth = asset.width * ratio;
            const baseHeight = asset.height * ratio;
            
            // Calculate effective radius for collision detection
            const effectiveRadius = Math.max(baseWidth, baseHeight) / 2;
            
            assetPool.push({
                image: asset,
                baseWidth: baseWidth,
                baseHeight: baseHeight,
                effectiveRadius: effectiveRadius
            });
        }
        
        return assetPool;
    }

    // Improved Asset-aware Poisson Disk Sampling Algorithm
    generatePoissonSamples(desiredGap, k, numSamples) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const uniqueOnly = document.getElementById('unique-assets').checked;
        
        // Prepare asset pool
        const assetPool = this.prepareAssetPool();
        if (assetPool.length === 0) return [];
        
        if (uniqueOnly) {
            // For unique assets, use aggressive multi-attempt strategy
            return this.generateUniqueAssetLayout(assetPool, desiredGap, width, height);
        } else {
            // For normal mode, prioritize unique placement first
            return this.generatePrioritizedLayout(assetPool, desiredGap, k, numSamples, width, height);
        }
    }

    // Aggressive algorithm for unique assets - tries much harder to place all assets
    generateUniqueAssetLayout(assetPool, desiredGap, width, height) {
        const maxAttempts = 5; // Try multiple different starting configurations
        let bestResult = [];
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const result = this.attemptUniqueLayout(assetPool, desiredGap, width, height, attempt);
            
            // If we placed all assets, return immediately
            if (result.length === assetPool.length) {
                return result;
            }
            
            // Keep the best result so far
            if (result.length > bestResult.length) {
                bestResult = result;
            }
        }
        
        return bestResult;
    }

    // Single attempt at unique layout with different strategies per attempt
    attemptUniqueLayout(assetPool, desiredGap, width, height, attemptNumber) {
        // Calculate maximum possible radius for grid sizing
        const maxRadius = Math.max(...assetPool.map(asset => asset.effectiveRadius));
        const maxMinDistance = maxRadius * 2 + desiredGap;
        
        // Grid setup
        const cellSize = maxMinDistance / Math.sqrt(2);
        const gridWidth = Math.ceil(width / cellSize);
        const gridHeight = Math.ceil(height / cellSize);
        const grid = Array(gridWidth).fill().map(() => Array(gridHeight).fill(-1));
        
        const samples = [];
        const activeList = [];
        const remainingAssets = [...assetPool]; // Copy of assets to place
        
        // Helper functions
        const gridCoords = (point) => ({
            x: Math.floor(point.x / cellSize),
            y: Math.floor(point.y / cellSize)
        });
        
        const isValid = (candidate, candidateAsset) => {
            if (candidate.x < candidateAsset.effectiveRadius || 
                candidate.x >= width - candidateAsset.effectiveRadius || 
                candidate.y < candidateAsset.effectiveRadius || 
                candidate.y >= height - candidateAsset.effectiveRadius) {
                return false;
            }
            
            const gridPos = gridCoords(candidate);
            const searchRadius = Math.ceil(maxMinDistance / cellSize) + 1;
            
            for (let x = Math.max(0, gridPos.x - searchRadius); x <= Math.min(gridWidth - 1, gridPos.x + searchRadius); x++) {
                for (let y = Math.max(0, gridPos.y - searchRadius); y <= Math.min(gridHeight - 1, gridPos.y + searchRadius); y++) {
                    const index = grid[x][y];
                    if (index !== -1) {
                        const existingSample = samples[index];
                        const distance = Math.sqrt(
                            Math.pow(candidate.x - existingSample.x, 2) + 
                            Math.pow(candidate.y - existingSample.y, 2)
                        );
                        
                        const requiredDistance = candidateAsset.effectiveRadius + existingSample.asset.effectiveRadius + desiredGap;
                        
                        if (distance < requiredDistance) {
                            return false;
                        }
                    }
                }
            }
            return true;
        };
        
        // Different starting strategies for different attempts
        let startX, startY;
        switch (attemptNumber) {
            case 0: // Center start
                startX = width / 2;
                startY = height / 2;
                break;
            case 1: // Random start
                startX = Math.random() * width;
                startY = Math.random() * height;
                break;
            case 2: // Corner start
                startX = width * 0.25;
                startY = height * 0.25;
                break;
            case 3: // Edge start
                startX = width * 0.1;
                startY = height / 2;
                break;
            default: // Spiral start
                const angle = attemptNumber * Math.PI / 3;
                startX = width / 2 + Math.cos(angle) * width * 0.3;
                startY = height / 2 + Math.sin(angle) * height * 0.3;
        }
        
        // Place first asset
        if (remainingAssets.length > 0) {
            const firstAsset = remainingAssets.shift();
            const initialPoint = { x: startX, y: startY, asset: firstAsset };
            
            if (isValid(initialPoint, firstAsset)) {
                samples.push(initialPoint);
                activeList.push(0);
                const gridPos = gridCoords(initialPoint);
                grid[gridPos.x][gridPos.y] = 0;
            }
        }
        
        // Main generation loop - be very persistent for unique assets
        while (activeList.length > 0 && remainingAssets.length > 0) {
            const randomIndex = Math.floor(Math.random() * activeList.length);
            const pointIndex = activeList[randomIndex];
            const parentSample = samples[pointIndex];
            
            let success = false;
            const attemptsPerPoint = Math.min(200, remainingAssets.length * 50); // Much higher attempts
            
            // Try to place next unique asset
            for (let i = 0; i < attemptsPerPoint && remainingAssets.length > 0; i++) {
                const candidateAsset = remainingAssets[0]; // Always try the next unique asset
                
                const angle = Math.random() * 2 * Math.PI;
                const minDistance = parentSample.asset.effectiveRadius + candidateAsset.effectiveRadius + desiredGap;
                
                // Vary the distance more for better coverage
                const distanceVariation = Math.random() * minDistance * (1 + attemptNumber * 0.2);
                const distance = minDistance + distanceVariation;
                
                const candidate = {
                    x: parentSample.x + Math.cos(angle) * distance,
                    y: parentSample.y + Math.sin(angle) * distance
                };
                
                if (isValid(candidate, candidateAsset)) {
                    const newSample = {
                        x: candidate.x,
                        y: candidate.y,
                        asset: candidateAsset
                    };
                    
                    samples.push(newSample);
                    activeList.push(samples.length - 1);
                    const gridPos = gridCoords(candidate);
                    grid[gridPos.x][gridPos.y] = samples.length - 1;
                    
                    remainingAssets.shift(); // Remove the placed asset
                    success = true;
                    break;
                }
            }
            
            if (!success) {
                activeList.splice(randomIndex, 1);
                
                // If we're running out of active points but still have assets, add some new seed points
                if (activeList.length < 3 && remainingAssets.length > 0) {
                    for (let seedAttempt = 0; seedAttempt < 20; seedAttempt++) {
                        const seedX = Math.random() * width;
                        const seedY = Math.random() * height;
                        const seedAsset = remainingAssets[0];
                        const seedCandidate = { x: seedX, y: seedY };
                        
                        if (isValid(seedCandidate, seedAsset)) {
                            const newSample = {
                                x: seedX,
                                y: seedY,
                                asset: seedAsset
                            };
                            
                            samples.push(newSample);
                            activeList.push(samples.length - 1);
                            const gridPos = gridCoords(seedCandidate);
                            grid[gridPos.x][gridPos.y] = samples.length - 1;
                            
                            remainingAssets.shift();
                            break;
                        }
                    }
                }
            }
        }
        
        return samples;
    }

    // Normal mode: prioritize placing each unique asset first, then duplicate
    generatePrioritizedLayout(assetPool, desiredGap, k, numSamples, width, height) {
        // Calculate maximum possible radius for grid sizing
        const maxRadius = Math.max(...assetPool.map(asset => asset.effectiveRadius));
        const maxMinDistance = maxRadius * 2 + desiredGap;
        
        // Grid setup
        const cellSize = maxMinDistance / Math.sqrt(2);
        const gridWidth = Math.ceil(width / cellSize);
        const gridHeight = Math.ceil(height / cellSize);
        const grid = Array(gridWidth).fill().map(() => Array(gridHeight).fill(-1));
        
        const samples = [];
        const activeList = [];
        const usedAssets = new Set(); // Track which unique assets we've used
        
        // Helper functions
        const gridCoords = (point) => ({
            x: Math.floor(point.x / cellSize),
            y: Math.floor(point.y / cellSize)
        });
        
        const isValid = (candidate, candidateAsset) => {
            if (candidate.x < 0 || candidate.x >= width || candidate.y < 0 || candidate.y >= height) {
                return false;
            }
            
            const gridPos = gridCoords(candidate);
            const searchRadius = 2;
            
            for (let x = Math.max(0, gridPos.x - searchRadius); x <= Math.min(gridWidth - 1, gridPos.x + searchRadius); x++) {
                for (let y = Math.max(0, gridPos.y - searchRadius); y <= Math.min(gridHeight - 1, gridPos.y + searchRadius); y++) {
                    const index = grid[x][y];
                    if (index !== -1) {
                        const existingSample = samples[index];
                        const distance = Math.sqrt(
                            Math.pow(candidate.x - existingSample.x, 2) + 
                            Math.pow(candidate.y - existingSample.y, 2)
                        );
                        
                        const requiredDistance = candidateAsset.effectiveRadius + existingSample.asset.effectiveRadius + desiredGap;
                        
                        if (distance < requiredDistance) {
                            return false;
                        }
                    }
                }
            }
            return true;
        };
        
        // Smart asset selection: prioritize unused assets first
        const selectAsset = () => {
            // First try to select an unused unique asset
            const unusedAssets = assetPool.filter((_, index) => !usedAssets.has(index));
            
            if (unusedAssets.length > 0) {
                const selected = unusedAssets[Math.floor(Math.random() * unusedAssets.length)];
                const originalIndex = assetPool.indexOf(selected);
                usedAssets.add(originalIndex);
                return selected;
            }
            
            // All unique assets used, now we can duplicate randomly
            return assetPool[Math.floor(Math.random() * assetPool.length)];
        };
        
        // Add initial sample
        const initialAsset = selectAsset();
        if (!initialAsset) return [];
        
        const initialPoint = {
            x: Math.random() * width,
            y: Math.random() * height,
            asset: initialAsset
        };
        
        samples.push(initialPoint);
        activeList.push(0);
        const initialGridPos = gridCoords(initialPoint);
        grid[initialGridPos.x][initialGridPos.y] = 0;
        
        // Main generation loop
        while (activeList.length > 0 && samples.length < numSamples) {
            const randomIndex = Math.floor(Math.random() * activeList.length);
            const pointIndex = activeList[randomIndex];
            const parentSample = samples[pointIndex];
            
            let success = false;
            
            // Generate k candidates around the point
            for (let i = 0; i < k; i++) {
                const candidateAsset = selectAsset();
                if (!candidateAsset) break;
                
                const angle = Math.random() * 2 * Math.PI;
                const minDistance = parentSample.asset.effectiveRadius + candidateAsset.effectiveRadius + desiredGap;
                const distance = minDistance + Math.random() * minDistance * 0.5;
                
                const candidate = {
                    x: parentSample.x + Math.cos(angle) * distance,
                    y: parentSample.y + Math.sin(angle) * distance
                };
                
                if (isValid(candidate, candidateAsset)) {
                    const newSample = {
                        x: candidate.x,
                        y: candidate.y,
                        asset: candidateAsset
                    };
                    
                    samples.push(newSample);
                    activeList.push(samples.length - 1);
                    const gridPos = gridCoords(candidate);
                    grid[gridPos.x][gridPos.y] = samples.length - 1;
                    success = true;
                    break;
                }
            }
            
            if (!success) {
                activeList.splice(randomIndex, 1);
            }
        }
        
        return samples;
    }

    generateLayout() {
        if (this.assets.length === 0) {
            alert('Please upload some assets first!');
            return;
        }
        
        const baseSpacing = parseInt(document.getElementById('min-distance').value);
        const desiredGap = baseSpacing; // This represents the gap between assets, not distance between centers
        const k = 30; // Algorithm attempts
        const uniqueOnly = document.getElementById('unique-assets').checked;
        
        // When unique assets only is enabled, try to place all available unique assets
        let numSamples;
        if (uniqueOnly) {
            numSamples = this.assets.length; // Try to place all unique assets
        } else {
            numSamples = this.getFillDensityAsNumItems();
        }
        
        this.samples = this.generatePoissonSamples(desiredGap, k, numSamples);
        this.isGenerated = true;
        
        this.renderCanvas();
        document.getElementById('export-btn').disabled = false;
        document.getElementById('export-settings-btn').disabled = false;
        
        const uniqueOnly2 = document.getElementById('unique-assets').checked;
        if (uniqueOnly2) {
            const successRate = ((this.samples.length / this.assets.length) * 100).toFixed(0);
            console.log(`Generated ${this.samples.length}/${this.assets.length} unique assets (${successRate}% success rate)`);
        } else {
            const uniqueAssetsPlaced = new Set(this.samples.map(s => s.asset.image)).size;
            console.log(`Generated ${this.samples.length} samples (${uniqueAssetsPlaced}/${this.assets.length} unique assets used before duplicating)`);
        }
    }

    renderCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background based on current type
        if (this.currentBackgroundType === 'image' && this.background) {
            this.ctx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
        } else if (this.currentBackgroundType === 'color') {
            if (this.backgroundColorType === 'solid') {
                const hex = document.getElementById('hex-input').value;
                this.ctx.fillStyle = `#${hex}`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } else {
                // Create gradient for canvas using fixed presets
                const stops = this.gradientStops || [
                    { color: '#171717', position: 0 },
                    { color: '#404040', position: 100 }
                ];
                const style = this.currentGradientStyle || 'linear-90';

                let gradient;
                if (style.startsWith('linear')) {
                    const angle = this.getGradientAngle(style);
                    const angleRad = angle * Math.PI / 180;
                    const x1 = this.canvas.width / 2 - Math.cos(angleRad) * this.canvas.width / 2;
                    const y1 = this.canvas.height / 2 - Math.sin(angleRad) * this.canvas.height / 2;
                    const x2 = this.canvas.width / 2 + Math.cos(angleRad) * this.canvas.width / 2;
                    const y2 = this.canvas.height / 2 + Math.sin(angleRad) * this.canvas.height / 2;
                    gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
                } else {
                    if (style === 'radial-center') {
                        gradient = this.ctx.createRadialGradient(
                            this.canvas.width / 2, this.canvas.height / 2, 0,
                            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
                        );
                    } else { // radial-corner
                        gradient = this.ctx.createRadialGradient(
                            0, 0, 0,
                            this.canvas.width, this.canvas.height, Math.max(this.canvas.width, this.canvas.height)
                        );
                    }
                }

                stops.forEach((stop, index) => {
                    const position = stops.length > 1 ? index / (stops.length - 1) : 0;
                    const opacity = stop.opacity || 1.0;
                    const color = opacity < 1.0 ? this.hexToRgba(stop.color.replace('#', ''), opacity) : stop.color;
                    gradient.addColorStop(position, color);
                });
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        } else if (this.currentBackgroundType !== 'none') {
            // Default fallback for image type when no background
            this.ctx.fillStyle = '#262626';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw samples if generated
        if (this.isGenerated && this.samples.length > 0) {
            const randomRotation = document.getElementById('random-rotation').checked;
            const randomScale = document.getElementById('random-scale').checked;
            
            this.samples.forEach(sample => {
                if (sample.asset) {
                    this.drawAsset(sample.asset.image, sample, randomRotation, randomScale, sample.asset);
                }
            });
        }
    }



    drawAsset(asset, position, randomRotation, randomScale, assetInfo = null) {
        this.ctx.save();
        
        // Move to position
        this.ctx.translate(position.x, position.y);
        
        // Apply random rotation with custom range
        if (randomRotation) {
            const rotationRange = this.getRotationRange();
            const rotation = rotationRange.min + Math.random() * (rotationRange.max - rotationRange.min);
            this.ctx.rotate(rotation);
        }
        
        // Apply random scale with custom range
        let scale = 1;
        if (randomScale) {
            const scaleRange = this.getScaleRange();
            scale = scaleRange.min + Math.random() * (scaleRange.max - scaleRange.min);
        }
        
        // Calculate dimensions using current asset size setting
        const maxSize = this.getAssetSize();
            const ratio = Math.min(maxSize / asset.width, maxSize / asset.height);
        const width = asset.width * ratio * scale;
        const height = asset.height * ratio * scale;
        
        // Draw asset centered at position
        this.ctx.drawImage(asset, -width/2, -height/2, width, height);
        
        this.ctx.restore();
    }

    downloadImage(settings = null) {
        // Allow export even without assets (for background-only exports)
        if (!this.isGenerated && this.assets.length > 0) {
            alert('Please generate a layout first!');
            return;
        }
        
        // Use provided settings or defaults
        const exportSettings = settings || {
            format: 'png',
            scale: 2,
            transparent: this.currentBackgroundType === 'none'
        };
        
        // Create a temporary canvas for high-quality export
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        
        // Set export size based on scale setting
        exportCanvas.width = this.canvas.width * exportSettings.scale;
        exportCanvas.height = this.canvas.height * exportSettings.scale;
        
        // Scale context
        exportCtx.scale(exportSettings.scale, exportSettings.scale);
        
        // Check if transparent export is enabled
        const transparentExport = exportSettings.transparent;
        
        if (!transparentExport) {
            // Draw background based on current type
            if (this.currentBackgroundType === 'image' && this.background) {
                exportCtx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
            } else if (this.currentBackgroundType === 'color') {
                if (this.backgroundColorType === 'solid') {
                    const hex = document.getElementById('hex-input').value;
                    exportCtx.fillStyle = `#${hex}`;
                    exportCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                } else {
                    // Create gradient for export using fixed presets
                    const stops = this.gradientStops || [
                        { color: '#171717', position: 0 },
                        { color: '#404040', position: 100 }
                    ];
                    const style = this.currentGradientStyle || 'linear-90';

                    let gradient;
                    if (style.startsWith('linear')) {
                        const angle = this.getGradientAngle(style);
                        const angleRad = angle * Math.PI / 180;
                        const x1 = this.canvas.width / 2 - Math.cos(angleRad) * this.canvas.width / 2;
                        const y1 = this.canvas.height / 2 - Math.sin(angleRad) * this.canvas.height / 2;
                        const x2 = this.canvas.width / 2 + Math.cos(angleRad) * this.canvas.width / 2;
                        const y2 = this.canvas.height / 2 + Math.sin(angleRad) * this.canvas.height / 2;
                        gradient = exportCtx.createLinearGradient(x1, y1, x2, y2);
                    } else {
                        if (style === 'radial-center') {
                            gradient = exportCtx.createRadialGradient(
                                this.canvas.width / 2, this.canvas.height / 2, 0,
                                this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
                            );
                        } else { // radial-corner
                            gradient = exportCtx.createRadialGradient(
                                0, 0, 0,
                                this.canvas.width, this.canvas.height, Math.max(this.canvas.width, this.canvas.height)
                            );
                        }
                    }

                    stops.forEach((stop, index) => {
                        const position = stops.length > 1 ? index / (stops.length - 1) : 0;
                        const opacity = stop.opacity || 1.0;
                        const color = opacity < 1.0 ? this.hexToRgba(stop.color.replace('#', ''), opacity) : stop.color;
                        gradient.addColorStop(position, color);
                    });
                    exportCtx.fillStyle = gradient;
                    exportCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                }
            } else if (this.currentBackgroundType !== 'none') {
                // Default fallback for image type when no background
                exportCtx.fillStyle = '#262626';
                exportCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        
        // Draw samples
        const randomRotation = document.getElementById('random-rotation').checked;
        const randomScale = document.getElementById('random-scale').checked;
        
        this.samples.forEach(sample => {
            if (sample.asset) {
                this.drawAssetOnContext(exportCtx, sample.asset.image, sample, randomRotation, randomScale, sample.asset);
            }
        });
        
        // Create download link
        const link = document.createElement('a');
        
        // Generate filename based on settings
        let filename = this.assets.length > 0 ? 'scattr-layout' : 'scattr-background';
        if (transparentExport) filename += '-transparent';
        if (exportSettings.scale !== 1) filename += `-${exportSettings.scale}x`;
        filename += `.${exportSettings.format}`;
        
        // Set download properties
        link.download = filename;
        
        // Generate image data based on format
        if (exportSettings.format === 'jpg') {
            // JPG doesn't support transparency, so fill with white if transparent was requested
            if (transparentExport) {
                exportCtx.globalCompositeOperation = 'destination-over';
                exportCtx.fillStyle = '#ffffff';
                exportCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
            link.href = exportCanvas.toDataURL('image/jpeg', 0.9);
        } else {
            link.href = exportCanvas.toDataURL('image/png');
        }
        
        // Add a small delay to prevent double downloads
        setTimeout(() => {
            link.click();
        }, 100);
    }

    setupCollapsibleSections() {
        // --- Define which section should be open by default (only one allowed) ---
        const defaultOpenSection = 'upload';

        const headers = document.querySelectorAll('.settings-header');
        
        // Helper function to collapse a section with animation
        const collapseSection = (content, chevron) => {
            const sectionHeight = content.scrollHeight;
            content.style.maxHeight = sectionHeight + 'px';
            content.classList.remove('expanded');
            
            // Force reflow
            content.offsetHeight;
            
            // Start collapse animation
            content.classList.add('collapsed');
            chevron.style.transform = 'rotate(0deg)';
            
            // After animation completes, add hidden class
            setTimeout(() => {
                content.classList.add('hidden');
                content.style.maxHeight = '';
            }, 300);
        };
        
        // Helper function to expand a section with animation
        const expandSection = (content, chevron) => {
            content.classList.remove('hidden', 'collapsed');
            
            // Get the natural height
            const sectionHeight = content.scrollHeight;
            content.style.maxHeight = '0px';
            
            // Force reflow
            content.offsetHeight;
            
            // Start expand animation
            content.style.maxHeight = sectionHeight + 'px';
            content.classList.add('expanded');
            chevron.style.transform = 'rotate(180deg)';
            
            // After animation completes, remove max-height
            setTimeout(() => {
                content.style.maxHeight = '';
            }, 300);
        };
        
        headers.forEach(header => {
            const sectionName = header.dataset.section;
            const content = header.nextElementSibling;
            const chevron = header.querySelector('[data-lucide="chevron-down"]');

            // Set the initial state - only the default section is open
            if (sectionName === defaultOpenSection) {
                content.classList.remove('hidden');
                content.classList.add('expanded');
                chevron.style.transform = 'rotate(180deg)';
            } else {
                content.classList.add('hidden', 'collapsed');
                chevron.style.transform = 'rotate(0deg)';
            }

            // Add the click event listener
            header.addEventListener('click', (e) => {
                e.preventDefault();
                
                const isExpanded = content.classList.contains('expanded');
                
                if (isExpanded) {
                    // Close this section
                    collapseSection(content, chevron);
                } else {
                    // Close all other sections first
                    headers.forEach(otherHeader => {
                        if (otherHeader !== header) {
                            const otherContent = otherHeader.nextElementSibling;
                            const otherChevron = otherHeader.querySelector('[data-lucide="chevron-down"]');
                            if (otherContent.classList.contains('expanded')) {
                                collapseSection(otherContent, otherChevron);
                            }
                        }
                    });
                    
                    // Then open this section after a short delay to allow other sections to close
                    setTimeout(() => {
                        expandSection(content, chevron);
                    }, 100);
                }
            });
        });
    }

    setupExportDropdown() {
        // Export dropdown state
        this.exportSettings = {
            format: 'png',
            scale: 2,
            transparent: false
        };

        // Get DOM elements
        const exportBtn = document.getElementById('export-btn');
        const exportSettingsBtn = document.getElementById('export-settings-btn');
        const exportDropdown = document.getElementById('export-dropdown');
        const chevronIcon = exportSettingsBtn.querySelector('[data-lucide="chevron-down"]');

        // Remove any existing event listeners by cloning and replacing
        const newExportBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
        
        const newSettingsBtn = exportSettingsBtn.cloneNode(true);
        exportSettingsBtn.parentNode.replaceChild(newSettingsBtn, exportSettingsBtn);

        // Main export button - direct export (single click handler)
        newExportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.downloadImage(this.exportSettings);
        });

        // Export settings button toggle
        newSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isVisible = !exportDropdown.classList.contains('hidden');
            
            if (isVisible) {
                exportDropdown.classList.add('hidden');
                chevronIcon.style.transform = 'rotate(0deg)';
            } else {
                exportDropdown.classList.remove('hidden');
                chevronIcon.style.transform = 'rotate(180deg)';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const exportSection = document.getElementById('export-dropdown').closest('.relative');
            if (!exportSection.contains(e.target)) {
                exportDropdown.classList.add('hidden');
                chevronIcon.style.transform = 'rotate(0deg)';
            }
        });

        // Format selection
        document.querySelectorAll('.export-format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Update active state
                document.querySelectorAll('.export-format-btn').forEach(b => {
                    b.classList.remove('active', 'bg-blue-600');
                    b.classList.add('bg-neutral-700', 'hover:bg-neutral-600');
                });
                btn.classList.add('active', 'bg-blue-600');
                btn.classList.remove('bg-neutral-700', 'hover:bg-neutral-600');
                
                // Update setting
                this.exportSettings.format = btn.dataset.format;
            });
        });

        // Size selection
        document.querySelectorAll('.export-size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Update active state
                document.querySelectorAll('.export-size-btn').forEach(b => {
                    b.classList.remove('active', 'bg-blue-600');
                    b.classList.add('bg-neutral-700', 'hover:bg-neutral-600');
                });
                btn.classList.add('active', 'bg-blue-600');
                btn.classList.remove('bg-neutral-700', 'hover:bg-neutral-600');
                
                // Update setting
                this.exportSettings.scale = parseFloat(btn.dataset.scale);
            });
        });

        // Transparent background toggle
        const transparentCheckbox = document.getElementById('export-transparent');
        transparentCheckbox.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.exportSettings.transparent = transparentCheckbox.checked;
        });


    }

    drawAssetOnContext(ctx, asset, position, randomRotation, randomScale, assetInfo = null) {
        ctx.save();
        
        ctx.translate(position.x, position.y);
        
        if (randomRotation) {
            const rotationRange = this.getRotationRange();
            const rotation = rotationRange.min + Math.random() * (rotationRange.max - rotationRange.min);
            ctx.rotate(rotation);
        }
        
        let scale = 1;
        if (randomScale) {
            const scaleRange = this.getScaleRange();
            scale = scaleRange.min + Math.random() * (scaleRange.max - scaleRange.min);
        }
        
        // Calculate dimensions using current asset size setting for export
        const maxSize = this.getAssetSize();
            const ratio = Math.min(maxSize / asset.width, maxSize / asset.height);
        const width = asset.width * ratio * scale;
        const height = asset.height * ratio * scale;
        
        ctx.drawImage(asset, -width/2, -height/2, width, height);
        
        ctx.restore();
    }

    setZoom(zoomLevel) {
        this.zoomLevel = zoomLevel;
        document.getElementById('zoom-slider').value = zoomLevel;
        document.getElementById('zoom-percentage').querySelector('span').textContent = `${zoomLevel}%`;
        this.applyZoom();
    }

    setZoomPreset(zoom) {
        if (zoom === 'fit') {
            this.zoomToFit();
        } else if (zoom === 'fill') {
            this.zoomToFill();
        } else {
            this.setZoom(parseInt(zoom));
        }
    }

    zoomToFit() {
        const viewport = document.getElementById('canvas-viewport');
        // Adjust padding based on screen size
        const isMobile = window.innerWidth < 640;
        const padding = isMobile ? 32 : 64; // Less padding on mobile
        const containerWidth = viewport.clientWidth - padding;
        const containerHeight = viewport.clientHeight - padding;
        
        const scaleX = containerWidth / this.canvas.width;
        const scaleY = containerHeight / this.canvas.height;
        const scale = Math.min(scaleX, scaleY, 1) * 100; // Convert to percentage
        
        this.setZoom(Math.round(scale));
    }

    zoomToFill() {
        const viewport = document.getElementById('canvas-viewport');
        // Adjust padding based on screen size
        const isMobile = window.innerWidth < 640;
        const padding = isMobile ? 32 : 64; // Less padding on mobile
        const containerWidth = viewport.clientWidth - padding;
        const containerHeight = viewport.clientHeight - padding;
        
        const scaleX = containerWidth / this.canvas.width;
        const scaleY = containerHeight / this.canvas.height;
        const scale = Math.max(scaleX, scaleY) * 100;
        
        this.setZoom(Math.round(scale));
    }

    applyZoom() {
        const container = document.getElementById('canvas-container');
        const scale = this.zoomLevel / 100;
        
        // Apply zoom transform to the canvas container
        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = 'center center';
    }

    toggleZoomPresets() {
        const menu = document.getElementById('zoom-presets-menu');
        menu.classList.toggle('hidden');
    }

    hideZoomPresets() {
        const menu = document.getElementById('zoom-presets-menu');
        menu.classList.add('hidden');
    }

    switchBackgroundTab(type) {
        // Update tab appearance
        ['image', 'color', 'none'].forEach(t => {
            const tab = document.getElementById(`bg-tab-${t}`);
            const panel = document.getElementById(`bg-panel-${t}`);
            
            if (t === type) {
                tab.classList.add('bg-neutral-700', 'text-white');
                tab.classList.remove('text-neutral-400');
                panel.classList.remove('hidden');
            } else {
                tab.classList.remove('bg-neutral-700', 'text-white');
                tab.classList.add('text-neutral-400');
                panel.classList.add('hidden');
            }
        });
        
        this.currentBackgroundType = type;
        
        // Always update canvas when background type changes (preserve existing layout)
        setTimeout(() => this.renderCanvas(), 50);
    }

    setColorType(type) {
        const solidBtn = document.getElementById('color-type-solid');
        const gradientBtn = document.getElementById('color-type-gradient');
        const solidControls = document.getElementById('solid-color-controls');
        const gradientControls = document.getElementById('gradient-controls');
        
        if (type === 'solid') {
            solidBtn.classList.add('bg-neutral-700', 'text-white');
            solidBtn.classList.remove('text-neutral-400');
            gradientBtn.classList.remove('bg-neutral-700', 'text-white');
            gradientBtn.classList.add('text-neutral-400');
            solidControls.classList.remove('hidden');
            gradientControls.classList.add('hidden');
        } else {
            // Transfer current solid color to gradient and calculate complementary color
            this.transferSolidColorToGradient();
            
            gradientBtn.classList.add('bg-neutral-700', 'text-white');
            gradientBtn.classList.remove('text-neutral-400');
            solidBtn.classList.remove('bg-neutral-700', 'text-white');
            solidBtn.classList.add('text-neutral-400');
            solidControls.classList.add('hidden');
            gradientControls.classList.remove('hidden');
        }
        
        this.backgroundColorType = type;
        
        // Always update canvas when color type changes (preserve existing layout)
        setTimeout(() => this.renderCanvas(), 50);
    }

    autoAdjustZoom() {
        const viewport = document.getElementById('canvas-viewport');
        // Adjust padding based on screen size
        const isMobile = window.innerWidth < 640;
        const padding = isMobile ? 32 : 64; // Less padding on mobile
        const containerWidth = viewport.clientWidth - padding;
        const containerHeight = viewport.clientHeight - padding;
        
        // Calculate if canvas is too big for container
        const scaleX = containerWidth / this.canvas.width;
        const scaleY = containerHeight / this.canvas.height;
        const maxScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
        
        // If canvas is too big, auto-zoom to fit
        if (maxScale < 1) {
            this.zoomToFit();
        }
        
        // On mobile, always auto-fit the canvas initially
        if (isMobile && this.currentZoom === 100) {
            this.zoomToFit();
        }
    }

    // Color conversion utilities
    hexToHsv(hex) {
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        if (diff !== 0) {
            if (max === r) h = ((g - b) / diff) % 6;
            else if (max === g) h = (b - r) / diff + 2;
            else h = (r - g) / diff + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        const s = max === 0 ? 0 : diff / max;
        const v = max;
        
        return { h, s: s * 100, v: v * 100 };
    }

    hsvToHex(h, s, v) {
        s /= 100;
        v /= 100;
        
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        
        let r, g, b;
        if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
        else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
        else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
        else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
        else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
        else [r, g, b] = [c, 0, x];
        
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        
        return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    setupAdvancedColorPicker() {
        const colorArea = document.getElementById('color-picker-area');
        const colorHandle = document.getElementById('color-picker-handle');
        const hueSlider = document.getElementById('hue-slider');
        const hueHandle = document.getElementById('hue-handle');
        const hexInput = document.getElementById('hex-input');
        
        this.colorPickerState = {
            hue: 0,
            saturation: 100,
            value: 100,
            isDragging: false,
            isHueDragging: false
        };

        // 2D Color picker interactions
        const handleColorPick = (e) => {
            const rect = colorArea.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            
            this.colorPickerState.saturation = (x / rect.width) * 100;
            this.colorPickerState.value = 100 - (y / rect.height) * 100;
            
            // Use direct pixel positioning with transform, maintain scale if dragging
            const scale = this.colorPickerState.isDragging ? ' scale(1.1)' : '';
            colorHandle.style.transform = `translate(${x - 8}px, ${y - 8}px)${scale}`;
            
            this.updateColorFromPicker();
        };

        colorArea.addEventListener('mousedown', (e) => {
            this.colorPickerState.isDragging = true;
            colorHandle.style.borderWidth = '1px';
            handleColorPick(e); // This will now apply the scale automatically
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (this.colorPickerState.isDragging) {
                handleColorPick(e);
            }
            if (this.colorPickerState.isHueDragging) {
                this.handleHueDrag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.colorPickerState.isDragging) {
                this.colorPickerState.isDragging = false;
                colorHandle.style.borderWidth = '2px';
                // Reapply transform without scale
                const transform = colorHandle.style.transform.replace(' scale(1.1)', '');
                colorHandle.style.transform = transform;
            }
            if (this.colorPickerState.isHueDragging) {
                this.colorPickerState.isHueDragging = false;
                hueHandle.style.borderWidth = '2px';
                // Reapply transform without scale
                const transform = hueHandle.style.transform.replace(' scale(1.1)', '');
                hueHandle.style.transform = transform;
            }
        });

        // Hue slider interactions
        const handleHuePick = (e) => {
            const rect = hueSlider.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            
            this.colorPickerState.hue = (x / rect.width) * 360;
            
            // Use direct pixel positioning with transform, maintain scale if dragging
            const scale = this.colorPickerState.isHueDragging ? ' scale(1.1)' : '';
            hueHandle.style.transform = `translate(${x - 8}px, -8px)${scale}`;
            
            this.updateColorFromPicker();
            this.updateColorAreaBackground();
            this.updateHueHandleColor();
        };

        hueSlider.addEventListener('mousedown', (e) => {
            this.colorPickerState.isHueDragging = true;
            hueHandle.style.borderWidth = '1px';
            handleHuePick(e); // This will now apply the scale automatically
            e.preventDefault();
        });

        this.handleHueDrag = handleHuePick;

        // Hex input validation
        hexInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9a-fA-F]/g, '');
            if (value.length > 6) value = value.slice(0, 6);
            e.target.value = value;
            
            if (value.length === 6) {
                const hsv = this.hexToHsv(value);
                this.colorPickerState = { ...this.colorPickerState, ...hsv };
                this.updatePickerFromColor();
                this.updateHexColorSwatch();
                
                // Update canvas in real-time with debouncing
                clearTimeout(this.colorUpdateTimeout);
                this.colorUpdateTimeout = setTimeout(() => this.renderCanvas(), 16); // ~60fps
            }
        });

        // Initialize color picker with current color after a small delay to ensure DOM is ready
        setTimeout(() => {
            this.updatePickerFromColor();
        }, 10);
    }

    updateColorFromPicker() {
        const { hue, saturation, value } = this.colorPickerState;
        const hex = this.hsvToHex(hue, saturation, value);
        document.getElementById('hex-input').value = hex;
        this.updateHexColorSwatch();
        
        // Update canvas smoothly using requestAnimationFrame
        if (!this.canvasUpdateRequested) {
            this.canvasUpdateRequested = true;
            requestAnimationFrame(() => {
                this.renderCanvas();
                this.canvasUpdateRequested = false;
            });
        }
    }

    updatePickerFromColor() {
        const hex = document.getElementById('hex-input').value;
        const hsv = this.hexToHsv(hex);
        this.colorPickerState = { ...this.colorPickerState, ...hsv };
        
        // Update handle positions using transforms
        const colorHandle = document.getElementById('color-picker-handle');
        const hueHandle = document.getElementById('hue-handle');
        const colorArea = document.getElementById('color-picker-area');
        const hueSlider = document.getElementById('hue-slider');
        
        if (colorArea && hueSlider) {
            const colorRect = colorArea.getBoundingClientRect();
            const hueRect = hueSlider.getBoundingClientRect();
            
            // Calculate pixel positions for handles
            const colorX = (hsv.s / 100) * colorRect.width;
            const colorY = ((100 - hsv.v) / 100) * colorRect.height;
            const hueX = (hsv.h / 360) * hueRect.width;
            
            colorHandle.style.transform = `translate(${colorX - 8}px, ${colorY - 8}px)`;
            hueHandle.style.transform = `translate(${hueX - 8}px, -8px)`;
        }
        
        this.updateColorAreaBackground();
        this.updateHexColorSwatch();
        this.updateHueHandleColor();
    }

    updateColorAreaBackground() {
        const colorArea = document.getElementById('color-picker-area');
        const hue = this.colorPickerState.hue;
        const baseColor = this.hsvToHex(hue, 100, 100);
        colorArea.style.background = `linear-gradient(to right, white, #${baseColor})`;
    }

    setupGradientControls() {
        // Initialize gradient stops
        this.gradientStops = [
            { color: '#171717', position: 0 },
            { color: '#404040', position: 100 }
        ];
        this.currentGradientStyle = 'linear-90'; // Default to vertical

        // Gradient style preset handlers
        document.querySelectorAll('.gradient-style').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update selected state - work with containers
                document.querySelectorAll('.gradient-style-container').forEach(container => {
                    container.classList.remove('border-blue-500');
                    container.classList.add('border-transparent');
                });
                
                const container = e.target.closest('.gradient-style-container');
                container.classList.remove('border-transparent');
                container.classList.add('border-blue-500');
                
                this.currentGradientStyle = e.target.dataset.style;
                
                // Always update canvas when gradient style changes (preserve existing layout)
                setTimeout(() => this.renderCanvas(), 50);
            });
        });
        
        // Initialize gradient previews
        this.updateAllGradientPreviews();
    }

    updateGradientSwatch() {
        // Update gradient style previews with current colors
        this.updateAllGradientPreviews();
    }

    updateAllGradientPreviews() {
        document.querySelectorAll('.gradient-style').forEach(btn => {
            this.updateGradientPreview(btn, btn.dataset.style);
        });
    }

    updateGradientPreview(element, style) {
        const colors = this.gradientStops.map(stop => {
            const opacity = stop.opacity || 1.0;
            if (opacity < 1.0) {
                const rgba = this.hexToRgba(stop.color.replace('#', ''), opacity);
                return rgba;
            }
            return stop.color;
        });
        
        let background = '';
        
        // Handle multiple colors properly
        if (colors.length === 2) {
            switch (style) {
                case 'linear-90':
                    background = `linear-gradient(to bottom, ${colors[0]}, ${colors[1]})`;
                    break;
                case 'linear-180':
                    background = `linear-gradient(to right, ${colors[0]}, ${colors[1]})`;
                    break;
                case 'linear-135':
                    background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
                    break;
                case 'radial-center':
                    background = `radial-gradient(circle at 50% 50%, ${colors[0]}, ${colors[1]})`;
                    break;
                case 'radial-corner':
                    background = `radial-gradient(circle at 0% 0%, ${colors[0]}, ${colors[1]})`;
                    break;
            }
        } else if (colors.length > 2) {
            // Handle multiple colors
            const colorStops = colors.join(', ');
            switch (style) {
                case 'linear-90':
                    background = `linear-gradient(to bottom, ${colorStops})`;
                    break;
                case 'linear-180':
                    background = `linear-gradient(to right, ${colorStops})`;
                    break;
                case 'linear-135':
                    background = `linear-gradient(135deg, ${colorStops})`;
                    break;
                case 'radial-center':
                    background = `radial-gradient(circle at 50% 50%, ${colorStops})`;
                    break;
                case 'radial-corner':
                    background = `radial-gradient(circle at 0% 0%, ${colorStops})`;
                    break;
            }
        } else {
            // Single color fallback
            background = colors[0] || '#171717';
        }
        
        element.style.background = background;
    }

    getGradientAngle(style) {
        const styleMap = {
            'linear-90': 90,    // Vertical (top to bottom)
            'linear-180': 180,  // Horizontal (left to right) 
            'linear-135': 135,  // Diagonal
            'radial-center': null,  // Radial at center
            'radial-corner': null   // Radial at corner
        };
        return styleMap[style] || 90;
    }

    updateHexColorSwatch() {
        const swatch = document.getElementById('hex-color-swatch');
        const hex = document.getElementById('hex-input').value;
        if (swatch && hex.length === 6) {
            swatch.style.background = `#${hex}`;
        }
    }

    setupEyedropper() {
        const eyedropperBtn = document.getElementById('eyedropper-btn');
        
        eyedropperBtn.addEventListener('click', async () => {
            if ('EyeDropper' in window) {
                try {
                    const eyeDropper = new EyeDropper();
                    const result = await eyeDropper.open();
                    
                    // Remove # from the color result and update
                    const hex = result.sRGBHex.replace('#', '');
                    document.getElementById('hex-input').value = hex;
                    
                    // Update color picker state
                    const hsv = this.hexToHsv(hex);
                    this.colorPickerState = { ...this.colorPickerState, ...hsv };
                    this.updatePickerFromColor();
                    this.updateHexColorSwatch();
                    
                    // Trigger canvas update smoothly (preserve existing layout)
                    if (!this.canvasUpdateRequested) {
                        this.canvasUpdateRequested = true;
                        requestAnimationFrame(() => {
                            this.renderCanvas();
                            this.canvasUpdateRequested = false;
                        });
                    }
                } catch (e) {
                    console.log('Eyedropper cancelled or failed:', e);
                }
            } else {
                // Fallback for browsers without EyeDropper API
                alert('Eyedropper is not supported in this browser. Please use a modern browser like Chrome, Edge, or Safari.');
            }
        });
    }

    transferSolidColorToGradient() {
        const currentHex = document.getElementById('hex-input').value;
        const currentColor = `#${currentHex}`;
        
        // Update first gradient color
        const firstStop = document.querySelector('.gradient-color-stop[data-index="0"]');
        if (firstStop) {
            firstStop.style.background = currentColor;
            firstStop.dataset.color = currentColor;
        }
        
        // Calculate complementary second color (darker or lighter based on brightness)
        const complementaryColor = this.calculateComplementaryColor(currentHex);
        const secondStop = document.querySelector('.gradient-color-stop[data-index="1"]');
        if (secondStop) {
            secondStop.style.background = complementaryColor;
            secondStop.dataset.color = complementaryColor;
        }
        
        // Update gradient stops array
        this.gradientStops = [
            { color: currentColor, position: 0, opacity: 1.0 },
            { color: complementaryColor, position: 100, opacity: 1.0 }
        ];
        
        // Update gradient previews with new colors
        this.updateAllGradientPreviews();
    }

    calculateComplementaryColor(hex) {
        // Convert hex to RGB
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        
        // Calculate perceived brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        if (brightness > 128) {
            // Color is bright, make it darker
            const factor = 0.4; // Make it 40% darker
            const newR = Math.round(r * factor);
            const newG = Math.round(g * factor);
            const newB = Math.round(b * factor);
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        } else {
            // Color is dark, make it lighter
            const factor = 0.6; // Add 60% more brightness
            const newR = Math.min(255, Math.round(r + (255 - r) * factor));
            const newG = Math.min(255, Math.round(g + (255 - g) * factor));
            const newB = Math.min(255, Math.round(b + (255 - b) * factor));
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        }
    }

    setupFloatingColorPicker() {
        const floatingPicker = document.getElementById('floating-color-picker');
        const closeBtn = document.getElementById('floating-picker-close');
        const addBtn = document.getElementById('add-gradient-color');
        const deleteBtn = document.getElementById('floating-delete-color');
        
        // Use event delegation for gradient color stops (including dynamically added ones)
        document.addEventListener('click', (e) => {
            const colorStop = e.target.closest('.gradient-color-stop');
            if (colorStop) {
                this.openFloatingColorPicker(colorStop, e);
                e.stopPropagation();
                return;
            }
            
            // Close if clicking outside
            if (!floatingPicker.contains(e.target)) {
                this.closeFloatingColorPicker();
            }
        });
        
        // Add gradient color button
        addBtn.addEventListener('click', (e) => {
            this.addGradientColor();
            e.stopPropagation();
        });
        
        // Close button
        closeBtn.addEventListener('click', () => {
            this.closeFloatingColorPicker();
        });
        
        // Delete button
        deleteBtn.addEventListener('click', () => {
            this.deleteCurrentGradientColor();
        });
        
        // Floating eyedropper button
        const floatingEyedropperBtn = document.getElementById('floating-eyedropper-btn');
        floatingEyedropperBtn.addEventListener('click', async () => {
            if ('EyeDropper' in window) {
                try {
                    const eyeDropper = new EyeDropper();
                    const result = await eyeDropper.open();
                    
                    // Remove # from the color result and update
                    const hex = result.sRGBHex.replace('#', '');
                    document.getElementById('floating-hex-input').value = hex;
                    
                    // Update floating color picker state
                    const hsv = this.hexToHsv(hex);
                    this.floatingColorState = { ...this.floatingColorState, ...hsv };
                    this.updateFloatingPickerFromColor();
                    this.updateFloatingHexColorSwatch();
                    
                    // Trigger canvas update smoothly (preserve existing layout)
                    if (!this.canvasUpdateRequested) {
                        this.canvasUpdateRequested = true;
                        requestAnimationFrame(() => {
                            this.renderCanvas();
                            this.canvasUpdateRequested = false;
                        });
                    }
                } catch (e) {
                    console.log('Eyedropper cancelled or failed:', e);
                }
            } else {
                // Fallback for browsers without EyeDropper API
                alert('Eyedropper is not supported in this browser. Please use a modern browser like Chrome, Edge, or Safari.');
            }
        });
        
        // Setup floating picker interactions (similar to main picker but smaller)
        this.setupFloatingPickerInteractions();
        
        // Setup drag and drop reordering
        this.setupGradientReordering();
    }

    addGradientColor() {
        // Calculate a sensible color based on existing colors
        const newColor = this.calculateSensibleNewColor();
        const newIndex = this.gradientStops.length;
        
        // Add to gradient stops array just before the last stop
        this.gradientStops.push({
            color: newColor,
            position: 100,
            opacity: 1.0
        });
        
        // Create new DOM element
        const container = document.getElementById('gradient-colors-container');
        const newStop = document.createElement('div');
        newStop.className = 'gradient-color-stop';
        newStop.draggable = true;
        // Ensure color has # prefix for consistency
        const colorWithHash = newColor.startsWith('#') ? newColor : `#${newColor}`;
        newStop.dataset.color = colorWithHash;
        newStop.dataset.index = newIndex;
        newStop.dataset.opacity = '1.0';
        newStop.style.background = colorWithHash;
        
        // Update the gradientStops array to have consistent color format
        this.gradientStops[newIndex].color = colorWithHash;
        
        container.appendChild(newStop);
        
        // Update all gradient previews
        this.updateAllGradientPreviews();
        
        // Update canvas if we have assets (preserve existing layout)
        if (this.assets.length > 0 && this.isGenerated) {
            setTimeout(() => this.renderCanvas(), 50);
        }

        // Re-order the add color button to the end of the list
        const addColorBtn = document.getElementById('add-gradient-color');
        addColorBtn.parentNode.appendChild(addColorBtn);
        
        // Open color picker for the new color
        this.openFloatingColorPicker(newStop, { target: newStop });
    }

    deleteCurrentGradientColor() {
        if (!this.editingGradientStop) return;
        
        const index = parseInt(this.editingGradientStop.dataset.index);
        const colorStops = document.querySelectorAll('.gradient-color-stop');
        
        // Don't delete if we only have 2 colors
        if (colorStops.length <= 2) return;
        
        // Remove from DOM
        this.editingGradientStop.remove();
        
        // Remove from gradient stops array
        this.gradientStops.splice(index, 1);
        
        // Update indices of remaining stops
        document.querySelectorAll('.gradient-color-stop').forEach((stop, i) => {
            stop.dataset.index = i;
        });
        
        // Close the picker
        this.closeFloatingColorPicker();
        
        // Update previews and layout
        this.updateAllGradientPreviews();
        if (this.assets.length > 0) {
            setTimeout(() => this.generateLayout(), 50);
        }
    }

    openFloatingColorPicker(stopElement, event) {
        const floatingPicker = document.getElementById('floating-color-picker');
        const currentColor = stopElement.dataset.color.replace('#', '');
        
        // Store reference to the stop being edited
        this.editingGradientStop = stopElement;
        
        // Position the floating picker near the clicked element
        const rect = stopElement.getBoundingClientRect();
        const pickerRect = floatingPicker.getBoundingClientRect();
        
        let left = rect.right;
        let top = rect.top + rect.height + 10;
        
        // Adjust if it would go off screen
        if (left + pickerRect.width > window.innerWidth) {
            left = rect.left - pickerRect.width - 10;
        }
        if (top + pickerRect.height > window.innerHeight) {
            top = window.innerHeight - pickerRect.height - 10;
        }
        
        floatingPicker.style.left = left + 'px';
        floatingPicker.style.top = top + 'px';
        floatingPicker.classList.remove('hidden');
        
        // Initialize floating picker with current color and opacity
        document.getElementById('floating-hex-input').value = currentColor;
        const hsv = this.hexToHsv(currentColor);
        this.floatingColorState = { 
            hue: hsv.h || 0,
            saturation: hsv.s || 0,
            value: hsv.v || 0,
            isDragging: false, 
            isHueDragging: false, 
            isOpacityDragging: false,
            opacity: stopElement.dataset.opacity ? parseFloat(stopElement.dataset.opacity) : 1.0
        };
        this.updateFloatingPickerFromColor();
        this.updateFloatingHexColorSwatch();
        // Small delay to ensure DOM is ready for opacity slider positioning
        setTimeout(() => {
            this.updateFloatingOpacitySlider();
        }, 10);
        
        // Show/hide delete button based on whether we have more than 2 colors
        const deleteBtn = document.getElementById('floating-delete-color');
        const colorStops = document.querySelectorAll('.gradient-color-stop');
        deleteBtn.style.display = colorStops.length > 2 ? 'block' : 'none';
    }

    closeFloatingColorPicker() {
        document.getElementById('floating-color-picker').classList.add('hidden');
        this.editingGradientStop = null;
    }

    updateFloatingPickerFromColor() {
        const hex = document.getElementById('floating-hex-input').value;
        const hsv = this.hexToHsv(hex);
        this.floatingColorState = { ...this.floatingColorState, ...hsv };
        
        // Update handle positions
        const colorHandle = document.getElementById('floating-color-picker-handle');
        const hueHandle = document.getElementById('floating-hue-handle');
        const colorArea = document.getElementById('floating-color-picker-area');
        const hueSlider = document.getElementById('floating-hue-slider');
        
        if (colorArea && hueSlider) {
            const colorRect = colorArea.getBoundingClientRect();
            const hueRect = hueSlider.getBoundingClientRect();
            
            if (colorRect.width > 0 && hueRect.width > 0) {
                const colorX = (hsv.s / 100) * colorRect.width;
                const colorY = ((100 - hsv.v) / 100) * colorRect.height;
                const hueX = (hsv.h / 360) * hueRect.width;
                
                colorHandle.style.transform = `translate(${colorX - 8}px, ${colorY - 8}px)`;
                hueHandle.style.transform = `translate(${hueX - 8}px, -8px)`;
            }
        }
        
        this.updateFloatingColorAreaBackground();
        this.updateFloatingHexColorSwatch();
        this.updateFloatingHueHandleColor();
        this.updateFloatingOpacitySlider();
        
                        // Update canvas in real-time with debouncing (only if not during initial setup)
                if (this.editingGradientStop) {
                    clearTimeout(this.colorUpdateTimeout);
                    this.colorUpdateTimeout = setTimeout(() => this.renderCanvas(), 16); // ~60fps
                }
    }

    updateFloatingColorAreaBackground() {
        const colorArea = document.getElementById('floating-color-picker-area');
        const hue = this.floatingColorState.hue;
        const baseColor = this.hsvToHex(hue, 100, 100);
        colorArea.style.background = `linear-gradient(to right, white, #${baseColor})`;
    }

    updateFloatingHexColorSwatch() {
        const swatch = document.getElementById('floating-hex-color-swatch');
        const hex = document.getElementById('floating-hex-input').value;
        if (swatch && hex.length === 6) {
            swatch.style.background = `#${hex}`;
        }
        
        // Update the gradient stop being edited
        if (this.editingGradientStop) {
            const newColor = `#${hex}`;
            this.editingGradientStop.style.background = newColor;
            this.editingGradientStop.dataset.color = newColor;
            
            // Update gradient stops array
            const index = parseInt(this.editingGradientStop.dataset.index);
            if (this.gradientStops[index]) {
                this.gradientStops[index].color = newColor;
                this.gradientStops[index].opacity = this.floatingColorState.opacity || 1.0;
            }
            
            // Update element's data attributes
            this.editingGradientStop.dataset.opacity = this.floatingColorState.opacity || 1.0;
            
            // Update gradient previews
            this.updateAllGradientPreviews();
            
            // Note: Canvas update is handled by updateFloatingColorFromPicker() to avoid conflicts
        }
    }

    setupFloatingPickerInteractions() {
        // Similar to main picker but with floating- prefixed IDs and smaller handles
        const colorArea = document.getElementById('floating-color-picker-area');
        const colorHandle = document.getElementById('floating-color-picker-handle');
        const hueSlider = document.getElementById('floating-hue-slider');
        const hueHandle = document.getElementById('floating-hue-handle');
        const hexInput = document.getElementById('floating-hex-input');
        
        // Color area interactions
        const handleFloatingColorPick = (e) => {
            const rect = colorArea.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            
            this.floatingColorState.saturation = (x / rect.width) * 100;
            this.floatingColorState.value = 100 - (y / rect.height) * 100;
            
            const scale = this.floatingColorState.isDragging ? ' scale(1.1)' : '';
            colorHandle.style.transform = `translate(${x - 8}px, ${y - 8}px)${scale}`;
            
            this.updateFloatingColorFromPicker();
        };
        
        colorArea.addEventListener('mousedown', (e) => {
            this.floatingColorState.isDragging = true;
            colorHandle.style.borderWidth = '1px';
            handleFloatingColorPick(e);
            e.preventDefault();
        });
        
        // Hue slider interactions
        const handleFloatingHuePick = (e) => {
            const rect = hueSlider.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            
            this.floatingColorState.hue = (x / rect.width) * 360;
            
            const scale = this.floatingColorState.isHueDragging ? ' scale(1.1)' : '';
            hueHandle.style.transform = `translate(${x - 8}px, -8px)${scale}`;
            
            this.updateFloatingColorFromPicker();
            this.updateFloatingColorAreaBackground();
            this.updateFloatingHueHandleColor();
        };
        
        hueSlider.addEventListener('mousedown', (e) => {
            this.floatingColorState.isHueDragging = true;
            hueHandle.style.borderWidth = '1px';
            handleFloatingHuePick(e);
            e.preventDefault();
        });
        
        // Global mouse events for floating picker
        document.addEventListener('mousemove', (e) => {
            if (this.floatingColorState && this.floatingColorState.isDragging) {
                handleFloatingColorPick(e);
            }
            if (this.floatingColorState && this.floatingColorState.isHueDragging) {
                handleFloatingHuePick(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.floatingColorState && this.floatingColorState.isDragging) {
                this.floatingColorState.isDragging = false;
                colorHandle.style.borderWidth = '2px';
                const transform = colorHandle.style.transform.replace(' scale(1.1)', '');
                colorHandle.style.transform = transform;
            }
            if (this.floatingColorState && this.floatingColorState.isHueDragging) {
                this.floatingColorState.isHueDragging = false;
                hueHandle.style.borderWidth = '2px';
                const transform = hueHandle.style.transform.replace(' scale(1.1)', '');
                hueHandle.style.transform = transform;
            }
        });
        
        // Hex input
        hexInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9a-fA-F]/g, '');
            if (value.length > 6) value = value.slice(0, 6);
            e.target.value = value;
            
            if (value.length === 6) {
                const hsv = this.hexToHsv(value);
                this.floatingColorState = { ...this.floatingColorState, ...hsv };
                this.updateFloatingPickerFromColor();
                
                // Update canvas in real-time with debouncing
                clearTimeout(this.colorUpdateTimeout);
                this.colorUpdateTimeout = setTimeout(() => this.renderCanvas(), 16); // ~60fps
            }
        });
        
        // Opacity slider interactions
        const opacitySlider = document.getElementById('floating-opacity-slider');
        const opacityHandle = document.getElementById('floating-opacity-handle');
        
        const handleOpacityPick = (e) => {
            const rect = opacitySlider.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            
            this.floatingColorState.opacity = x / rect.width;
            
            const scale = this.floatingColorState.isOpacityDragging ? ' scale(1.1)' : '';
            opacityHandle.style.transform = `translate(${x - 8}px, -8px)${scale}`;
            
            this.updateFloatingHexColorSwatch();
            
            // Update the current gradient stop opacity
            if (this.editingGradientStop) {
                const index = parseInt(this.editingGradientStop.dataset.index);
                if (this.gradientStops[index]) {
                    this.gradientStops[index].opacity = this.floatingColorState.opacity;
                    this.editingGradientStop.dataset.opacity = this.floatingColorState.opacity.toString();
                }
                
                // Update gradient previews
                this.updateAllGradientPreviews();
            }
            
            // Update canvas in real-time with debouncing
            clearTimeout(this.colorUpdateTimeout);
            this.colorUpdateTimeout = setTimeout(() => this.renderCanvas(), 16); // ~60fps
        };
        
        opacitySlider.addEventListener('mousedown', (e) => {
            this.floatingColorState.isOpacityDragging = true;
            opacityHandle.style.borderWidth = '1px';
            handleOpacityPick(e);
            e.preventDefault();
        });
        
        // Global mouse events for opacity slider
        document.addEventListener('mousemove', (e) => {
            if (this.floatingColorState && this.floatingColorState.isOpacityDragging) {
                handleOpacityPick(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.floatingColorState && this.floatingColorState.isOpacityDragging) {
                this.floatingColorState.isOpacityDragging = false;
                opacityHandle.style.borderWidth = '1px';
                const transform = opacityHandle.style.transform.replace(' scale(1.1)', '');
                opacityHandle.style.transform = transform;
            }
        });
    }

    updateFloatingColorFromPicker() {
        const { hue, saturation, value } = this.floatingColorState;
        const hex = this.hsvToHex(hue, saturation, value);
        document.getElementById('floating-hex-input').value = hex;
        this.updateFloatingHexColorSwatch();
        this.updateFloatingOpacitySlider();
        
        // Update the current gradient stop color
        if (this.editingGradientStop) {
            const newColor = `#${hex}`;
            this.editingGradientStop.style.background = newColor;
            this.editingGradientStop.dataset.color = newColor;
            
            // Update the gradientStops array
            const index = parseInt(this.editingGradientStop.dataset.index);
            if (this.gradientStops[index]) {
                this.gradientStops[index].color = newColor;
                this.gradientStops[index].opacity = this.floatingColorState.opacity || 1.0;
            }
            
            // Update gradient previews
            this.updateAllGradientPreviews();
        }
        
        // Update canvas smoothly using requestAnimationFrame
        if (!this.canvasUpdateRequested) {
            this.canvasUpdateRequested = true;
            requestAnimationFrame(() => {
                this.renderCanvas();
                this.canvasUpdateRequested = false;
            });
        }
    }

    updateHueHandleColor() {
        const hueHandle = document.getElementById('hue-handle');
        const hue = this.colorPickerState.hue;
        const hueColor = this.hsvToHex(hue, 100, 100);
        hueHandle.style.background = `#${hueColor}`;
    }

    updateFloatingHueHandleColor() {
        const hueHandle = document.getElementById('floating-hue-handle');
        if (this.floatingColorState) {
            const hue = this.floatingColorState.hue;
            const hueColor = this.hsvToHex(hue, 100, 100);
            hueHandle.style.background = `#${hueColor}`;
        }
    }

    updateFloatingOpacitySlider() {
        if (!this.floatingColorState) return;
        
        const opacitySlider = document.getElementById('floating-opacity-gradient');
        const opacityHandle = document.getElementById('floating-opacity-handle');
        const currentColor = this.hsvToHex(this.floatingColorState.hue, this.floatingColorState.saturation, this.floatingColorState.value);
        
        // Update the opacity gradient background to reflect current hue
        opacitySlider.style.background = `linear-gradient(to right, transparent, #${currentColor})`;
        
        // Update handle position - use pixel positioning like other sliders
        const opacity = this.floatingColorState.opacity || 1.0;
        const sliderContainer = document.getElementById('floating-opacity-slider');
        if (sliderContainer) {
            const sliderRect = sliderContainer.getBoundingClientRect();
            let x;
            if (sliderRect.width > 0) {
                x = opacity * sliderRect.width;
            } else {
                // Fallback for initial positioning when rect is not available
                x = opacity * 280; // Approximate width based on container width
            }
            opacityHandle.style.transform = `translate(${x - 8}px, -8px)`;
        }
        
        // Set handle color to current color with current opacity
        const rgba = this.hexToRgba(currentColor, opacity);
        opacityHandle.style.background = rgba;
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    calculateSensibleNewColor() {
        if (this.gradientStops.length === 0) {
            return '#808080'; // Default gray if no colors exist
        }
        
        if (this.gradientStops.length === 1) {
            // For second color, create a complementary color
            const existingColor = this.gradientStops[0].color.replace('#', '');
            return this.calculateComplementaryColor(existingColor);
        }
        
        // For third+ colors, interpolate between first and last colors
        const firstColor = this.gradientStops[0].color;
        const lastColor = this.gradientStops[this.gradientStops.length - 1].color;
        
        // Simple interpolation - take middle color
        const firstHsv = this.hexToHsv(firstColor.replace('#', ''));
        const lastHsv = this.hexToHsv(lastColor.replace('#', ''));
        
        const middleHsv = {
            h: (firstHsv.h + lastHsv.h) / 2,
            s: (firstHsv.s + lastHsv.s) / 2,
            v: (firstHsv.v + lastHsv.v) / 2
        };
        
        return '#' + this.hsvToHex(middleHsv.h, middleHsv.s, middleHsv.v);
    }

    setupGradientReordering() {
        let draggedElement = null;
        let draggedIndex = null;
        
        // Use event delegation for drag events on gradient color stops
        document.addEventListener('dragstart', (e) => {
            const colorStop = e.target.closest('.gradient-color-stop');
            if (colorStop) {
                draggedElement = colorStop;
                draggedIndex = parseInt(colorStop.dataset.index);
                
                // Add visual feedback
                colorStop.style.opacity = '0.5';
                
                // Set drag data
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedIndex);
            }
        });
        
        document.addEventListener('dragend', (e) => {
            const colorStop = e.target.closest('.gradient-color-stop');
            if (colorStop) {
                // Remove visual feedback
                colorStop.style.opacity = '1';
                draggedElement = null;
                draggedIndex = null;
            }
        });
        
        document.addEventListener('dragover', (e) => {
            const colorStop = e.target.closest('.gradient-color-stop');
            if (colorStop && draggedElement && colorStop !== draggedElement) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                // Visual feedback for drop target
                colorStop.style.transform = 'scale(1.1)';
                colorStop.style.borderColor = '#3b82f6';
            }
        });
        
        document.addEventListener('dragleave', (e) => {
            const colorStop = e.target.closest('.gradient-color-stop');
            if (colorStop && draggedElement && colorStop !== draggedElement) {
                // Remove visual feedback
                colorStop.style.transform = '';
                colorStop.style.borderColor = '';
            }
        });
        
        document.addEventListener('drop', (e) => {
            const colorStop = e.target.closest('.gradient-color-stop');
            if (colorStop && draggedElement && colorStop !== draggedElement) {
                e.preventDefault();
                
                // Remove visual feedback
                colorStop.style.transform = '';
                colorStop.style.borderColor = '';
                
                const targetIndex = parseInt(colorStop.dataset.index);
                this.reorderGradientColors(draggedIndex, targetIndex);
            }
        });
    }

    reorderGradientColors(fromIndex, toIndex) {
        // Reorder the gradient stops array
        const movedStop = this.gradientStops.splice(fromIndex, 1)[0];
        this.gradientStops.splice(toIndex, 0, movedStop);
        
        // Update DOM elements order
        const container = document.getElementById('gradient-colors-container');
        const colorStops = Array.from(container.querySelectorAll('.gradient-color-stop'));
        
        // Remove all color stops from DOM
        colorStops.forEach(stop => stop.remove());
        
        // Re-add in new order and update indices
        this.gradientStops.forEach((stop, index) => {
            const element = colorStops.find(el => el.dataset.color === stop.color);
            if (element) {
                element.dataset.index = index;
                container.appendChild(element);
            }
        });
        
        // Update gradient previews
        this.updateAllGradientPreviews();
        
        // Trigger canvas update (preserve existing layout)
        if (this.assets.length > 0 && this.isGenerated) {
            setTimeout(() => this.renderCanvas(), 50);
        }
    }
}