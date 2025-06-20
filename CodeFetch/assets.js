let currentAssets = null;

document.addEventListener('DOMContentLoaded', function() {
    loadAssets();
    
    document.getElementById('downloadAllBtn').addEventListener('click', downloadAllAssets);
});

function loadAssets() {
    chrome.storage.local.get(['currentAssets'], function(result) {
        if (result.currentAssets) {
            currentAssets = result.currentAssets;
            displayAssets(currentAssets);
        } else {
            document.getElementById('loading').innerHTML = '<div>❌ No assets found</div>';
        }
    });
}

function displayAssets(assets) {
    // Update counts
    document.getElementById('imageCount').textContent = assets.images.length;
    document.getElementById('videoCount').textContent = assets.videos.length;
    document.getElementById('svgCount').textContent = assets.svg.length;
    document.getElementById('otherCount').textContent = assets.other.length;
    
    document.getElementById('imagesSubCount').textContent = `${assets.images.length} items`;
    document.getElementById('videosSubCount').textContent = `${assets.videos.length} items`;
    document.getElementById('svgSubCount').textContent = `${assets.svg.length} items`;
    document.getElementById('otherSubCount').textContent = `${assets.other.length} items`;

    // Display assets
    displayImageAssets(assets.images);
    displayVideoAssets(assets.videos);
    displaySvgAssets(assets.svg);
    displayOtherAssets(assets.other);

    // Hide loading and show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('assetsContainer').style.display = 'block';
}

function displayImageAssets(images) {
    const grid = document.getElementById('imagesGrid');
    
    if (images.length === 0) {
        grid.innerHTML = '<div class="empty-category">No images found</div>';
        return;
    }
    
    grid.innerHTML = '';
    
    images.forEach((image, index) => {
        const item = createAssetItem(image, 'image', index);
        grid.appendChild(item);
    });
}

function displayVideoAssets(videos) {
    const grid = document.getElementById('videosGrid');
    
    if (videos.length === 0) {
        grid.innerHTML = '<div class="empty-category">No videos found</div>';
        return;
    }
    
    grid.innerHTML = '';
    
    videos.forEach((video, index) => {
        const item = createAssetItem(video, 'video', index);
        grid.appendChild(item);
    });
}

function displaySvgAssets(svgs) {
    const grid = document.getElementById('svgGrid');
    
    if (svgs.length === 0) {
        grid.innerHTML = '<div class="empty-category">No SVG files found</div>';
        return;
    }
    
    grid.innerHTML = '';
    
    svgs.forEach((svg, index) => {
        const item = createAssetItem(svg, 'svg', index);
        grid.appendChild(item);
    });
}

function displayOtherAssets(others) {
    const grid = document.getElementById('otherGrid');
    
    if (others.length === 0) {
        grid.innerHTML = '<div class="empty-category">No other files found</div>';
        return;
    }
    
    grid.innerHTML = '';
    
    others.forEach((other, index) => {
        const item = createAssetItem(other, 'other', index);
        grid.appendChild(item);
    });
}

function createAssetItem(asset, type, index) {
    const item = document.createElement('div');
    item.className = 'asset-item';
    
    const preview = document.createElement('div');
    preview.className = 'asset-preview';
    
    const title = document.createElement('div');
    title.className = 'asset-title';
    title.textContent = asset.title || asset.alt || `${type}_${index + 1}`;
    
    const info = document.createElement('div');
    info.className = 'asset-info';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = '⬇';
    downloadBtn.onclick = () => downloadAsset(asset, type, index);
    
    // Create preview based on type
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = asset.url;
        img.alt = asset.alt || 'Image';
        img.onerror = () => {
            preview.innerHTML = '<div class="placeholder-icon">🖼️</div>';
        };
        preview.appendChild(img);
        
        if (asset.width && asset.height) {
            info.textContent = `${asset.width} × ${asset.height}`;
        }
    } else if (type === 'video') {
        const video = document.createElement('video');
        video.src = asset.url;
        video.muted = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.onerror = () => {
            preview.innerHTML = '<div class="placeholder-icon">🎥</div>';
        };
        preview.appendChild(video);
        
        if (asset.duration) {
            info.textContent = `Duration: ${Math.round(asset.duration)}s`;
        }
    } else if (type === 'svg') {
        if (asset.inline && asset.data) {
            preview.innerHTML = asset.data;
        } else {
            const img = document.createElement('img');
            img.src = asset.url;
            img.alt = 'SVG';
            img.onerror = () => {
                preview.innerHTML = '<div class="placeholder-icon">🎨</div>';
            };
            preview.appendChild(img);
        }
        info.textContent = asset.inline ? 'Inline SVG' : 'SVG File';
    } else {
        preview.innerHTML = '<div class="placeholder-icon">📄</div>';
        info.textContent = asset.type ? asset.type.toUpperCase() : 'File';
    }
    
    item.appendChild(preview);
    item.appendChild(title);
    item.appendChild(info);
    item.appendChild(downloadBtn);
    
    return item;
}

function downloadAsset(asset, type, index) {
    const filename = generateFilename(asset, type, index);
    
    if (type === 'svg' && asset.inline && asset.data) {
        // Download inline SVG
        const blob = new Blob([asset.data], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: filename
        }, () => {
            URL.revokeObjectURL(url);
        });
    } else {
        // Download external asset
        chrome.downloads.download({
            url: asset.url,
            filename: filename
        });
    }
}

function generateFilename(asset, type, index) {
    let filename = asset.title || asset.alt || `${type}_${index + 1}`;
    
    // Clean filename
    filename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    // Add extension based on type
    if (type === 'image') {
        const ext = getExtensionFromUrl(asset.url) || 'jpg';
        filename += `.${ext}`;
    } else if (type === 'video') {
        const ext = getExtensionFromUrl(asset.url) || 'mp4';
        filename += `.${ext}`;
    } else if (type === 'svg') {
        filename += '.svg';
    } else {
        const ext = getExtensionFromUrl(asset.url) || 'file';
        filename += `.${ext}`;
    }
    
    return filename;
}

function getExtensionFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split('.').pop().split('?')[0].toLowerCase();
    } catch (e) {
        return null;
    }
}

function downloadAllAssets() {
    if (!currentAssets) return;
    
    const downloadBtn = document.getElementById('downloadAllBtn');
    const originalText = downloadBtn.textContent;
    
    downloadBtn.textContent = '⏳ Downloading...';
    downloadBtn.disabled = true;
    
    let downloadCount = 0;
    let totalAssets = 0;
    
    // Count total assets
    Object.values(currentAssets).forEach(category => {
        totalAssets += category.length;
    });
    
    // Download all assets
    Object.entries(currentAssets).forEach(([type, assets]) => {
        assets.forEach((asset, index) => {
            setTimeout(() => {
                downloadAsset(asset, type, index);
                downloadCount++;
                
                if (downloadCount === totalAssets) {
                    downloadBtn.textContent = '✅ Downloads Started!';
                    setTimeout(() => {
                        downloadBtn.textContent = originalText;
                        downloadBtn.disabled = false;
                    }, 2000);
                }
            }, index * 100); // Stagger downloads
        });
    });
}