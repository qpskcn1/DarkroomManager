document.addEventListener('DOMContentLoaded', () => {
    const btnScan = document.getElementById('btn-scan');
    const btnApply = document.getElementById('btn-apply');
    const btnSelectAll = document.getElementById('btn-select-all');
    const btnClearSelection = document.getElementById('btn-clear-selection');
    const folderPathInput = document.getElementById('folder-path');
    const photoGrid = document.getElementById('photo-grid');
    const selectedCountSpan = document.getElementById('selected-count');
    const presetSelect = document.getElementById('preset-select');

    // Metadata inputs
    const metaMake = document.getElementById('meta-make');
    const metaModel = document.getElementById('meta-model');
    const metaLens = document.getElementById('meta-lens');
    const metaFilm = document.getElementById('meta-film');
    const metaDate = document.getElementById('meta-date');
    const metaAperture = document.getElementById('meta-aperture');
    const metaShutter = document.getElementById('meta-shutter');

    let currentPhotos = [];
    let selectedPhotos = new Set();

    let presets = {};

    // Fetch Presets
    async function loadPresets() {
        try {
            const response = await fetch('/api/presets');
            const data = await response.json();
            
            if (data.presets) {
                presets = {};
                presetSelect.innerHTML = '<option value="">Select a preset...</option>';
                
                data.presets.forEach(preset => {
                    presets[preset.name] = preset;
                    const option = document.createElement('option');
                    option.value = preset.name;
                    option.textContent = preset.name;
                    presetSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load presets:', error);
        }
    }

    loadPresets();

    // Handle Preset Selection
    presetSelect.addEventListener('change', (e) => {
        const preset = presets[e.target.value];
        if (preset) {
            metaMake.value = preset.make || '';
            metaModel.value = preset.model || '';
            metaLens.value = preset.lens || '';
            metaFilm.value = preset.film || '';
        }
    });

    // Scan Directory
    btnScan.addEventListener('click', async () => {
        const path = folderPathInput.value.trim();
        if (!path) {
            alert('Please enter a directory path.');
            return;
        }

        btnScan.disabled = true;
        btnScan.textContent = 'Scanning...';

        try {
            const response = await fetch(`/api/photos?path=${encodeURIComponent(path)}`);
            const data = await response.json();

            if (data.error) {
                alert(`Error: ${data.error}`);
                return;
            }

            currentPhotos = data.photos;
            selectedPhotos.clear();
            updateSelectionUI();
            renderGrid();
        } catch (error) {
            console.error('Failed to scan:', error);
            alert('Failed to scan directory.');
        } finally {
            btnScan.disabled = false;
            btnScan.textContent = 'Scan Directory';
        }
    });

    // Render Photo Grid
    function renderGrid() {
        photoGrid.innerHTML = '';

        if (currentPhotos.length === 0) {
            photoGrid.innerHTML = '<div class="empty-state"><p>No photos found in this directory.</p></div>';
            return;
        }

        currentPhotos.forEach(photo => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            if (selectedPhotos.has(photo.path)) {
                card.classList.add('selected');
            }

            card.innerHTML = `
                <div class="photo-thumb">
                    <span>[Image]</span>
                    <!-- We could show actual image here if we serve them or use file:// protocol if permitted, but for now just a placeholder with name -->
                </div>
                <div class="photo-info">
                    <div class="photo-name" title="${photo.name}">${photo.name}</div>
                </div>
            `;

            card.addEventListener('click', () => {
                if (selectedPhotos.has(photo.path)) {
                    selectedPhotos.delete(photo.path);
                    card.classList.remove('selected');
                } else {
                    selectedPhotos.add(photo.path);
                    card.classList.add('selected');
                }
                updateSelectionUI();
            });

            photoGrid.appendChild(card);
        });
    }

    // Update Selection UI
    function updateSelectionUI() {
        selectedCountSpan.textContent = selectedPhotos.size;
    }

    // Select All
    btnSelectAll.addEventListener('click', () => {
        currentPhotos.forEach(photo => selectedPhotos.add(photo.path));
        updateSelectionUI();
        renderGrid();
    });

    // Clear Selection
    btnClearSelection.addEventListener('click', () => {
        selectedPhotos.clear();
        updateSelectionUI();
        renderGrid();
    });

    // Apply Metadata
    btnApply.addEventListener('click', async () => {
        if (selectedPhotos.size === 0) {
            alert('Please select at least one photo.');
            return;
        }

        const metadata = {};
        if (metaMake.value) metadata.Make = metaMake.value;
        if (metaModel.value) metadata.Model = metaModel.value;
        if (metaLens.value) metadata.LensModel = metaLens.value;
        if (metaFilm.value) metadata.UserComment = `Film: ${metaFilm.value}`; // Common way to store film info
        if (metaDate.value) {
            // ExifTool expects YYYY:MM:DD HH:MM:SS or similar.
            // HTML date input gives YYYY-MM-DD. We need to format it.
            metadata.DateTimeOriginal = metaDate.value.replace(/-/g, ':') + ' 12:00:00';
        }
        if (metaAperture.value) metadata.FNumber = metaAperture.value.replace('f/', '');
        if (metaShutter.value) metadata.ShutterSpeedValue = metaShutter.value;

        const photosToProcess = currentPhotos.filter(p => selectedPhotos.has(p.path));

        btnApply.disabled = true;
        btnApply.textContent = 'Applying...';

        try {
            const response = await fetch('/api/apply-metadata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    photos: photosToProcess,
                    metadata: metadata
                }),
            });

            const data = await response.json();
            
            const successCount = data.results.filter(r => r.success).length;
            alert(`Successfully updated ${successCount} of ${data.results.length} photos.`);
            
            // Optionally refresh or clear selection
            selectedPhotos.clear();
            updateSelectionUI();
            renderGrid();
        } catch (error) {
            console.error('Failed to apply metadata:', error);
            alert('Failed to apply metadata.');
        } finally {
            btnApply.disabled = false;
            btnApply.textContent = 'Apply to Selected';
        }
    });
});
