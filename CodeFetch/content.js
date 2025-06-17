// Content script to extract assets from webpage
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "extractAssets") {
        const assets = extractAllAssets();
        sendResponse({assets: assets});
    }
});

function extractAllAssets() {
    const assets = {
        images: [],
        videos: [],
        svg: [],
        other: []
    };

    // Extract images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.src && img.src.startsWith('http')) {
            assets.images.push({
                url: img.src,
                alt: img.alt || 'Image',
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height
            });
        }
    });

    // Extract background images from CSS
    const elementsWithBg = document.querySelectorAll('*');
    elementsWithBg.forEach(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
            const match = bgImage.match(/url\(['"]*([^'"]*)['"]*\)/);
            if (match && match[1]) {
                const url = match[1].startsWith('http') ? match[1] : new URL(match[1], window.location.href).href;
                if (!assets.images.some(img => img.url === url)) {
                    assets.images.push({
                        url: url,
                        alt: 'Background Image',
                        width: 0,
                        height: 0
                    });
                }
            }
        }
    });

    // Extract videos
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        if (video.src && video.src.startsWith('http')) {
            assets.videos.push({
                url: video.src,
                title: video.title || 'Video',
                duration: video.duration || 0
            });
        }
        
        // Check video sources
        const sources = video.querySelectorAll('source');
        sources.forEach(source => {
            if (source.src && source.src.startsWith('http')) {
                assets.videos.push({
                    url: source.src,
                    title: video.title || 'Video',
                    type: source.type || '',
                    duration: video.duration || 0
                });
            }
        });
    });

    // Extract SVGs
    const svgs = document.querySelectorAll('svg');
    svgs.forEach((svg, index) => {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        
        assets.svg.push({
            url: url,
            title: `SVG_${index + 1}`,
            inline: true,
            data: svgData
        });
    });

    // Extract SVG images
    const svgImages = document.querySelectorAll('img[src$=".svg"], img[src*=".svg"]');
    svgImages.forEach(img => {
        if (img.src && img.src.startsWith('http')) {
            assets.svg.push({
                url: img.src,
                title: img.alt || 'SVG Image',
                inline: false
            });
        }
    });

    // Extract other media files from links
    const links = document.querySelectorAll('a[href]');
    const mediaExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.mp3', '.wav', '.mp4', '.avi'];
    
    links.forEach(link => {
        const href = link.href;
        if (href && mediaExtensions.some(ext => href.toLowerCase().includes(ext))) {
            assets.other.push({
                url: href,
                title: link.textContent || 'Document',
                type: getFileExtension(href)
            });
        }
    });

    // Remove duplicates
    assets.images = removeDuplicates(assets.images, 'url');
    assets.videos = removeDuplicates(assets.videos, 'url');
    assets.svg = removeDuplicates(assets.svg, 'url');
    assets.other = removeDuplicates(assets.other, 'url');

    return assets;
}

function removeDuplicates(array, key) {
    return array.filter((item, index, self) => 
        index === self.findIndex(t => t[key] === item[key])
    );
}

function getFileExtension(url) {
    return url.split('.').pop().split('?')[0].toLowerCase();
}





