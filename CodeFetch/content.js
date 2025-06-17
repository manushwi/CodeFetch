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





class CSSInspector {
    constructor() {
        this.isActive = false;
        this.overlay = null;
        this.popup = null;
        this.currentElement = null;
        
        this.init();
    }
    
    init() {
        document.addEventListener('cssInspectorActivate', () => {
            this.activate();
        });
        
        // Check if already activated via window variable
        if (window.cssInspectorActive) {
            this.activate();
        }
    }
    
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.createOverlay();
        this.attachEventListeners();
        document.body.style.cursor = 'crosshair';
    }
    
    deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.removeOverlay();
        this.removePopup();
        this.removeEventListeners();
        document.body.style.cursor = '';
        window.cssInspectorActive = false;
    }
    
    createOverlay() {
        if (this.overlay) return;
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'css-inspector-overlay';
        this.overlay.style.display = 'none';
        document.body.appendChild(this.overlay);
    }
    
    removeOverlay() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
    }
    
    createPopup(element, x, y) {
        this.removePopup();
        
        const popup = document.createElement('div');
        popup.className = 'css-inspector-popup';
        
        const html = this.getElementHTML(element);
        const css = this.getElementCSS(element);
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'css-inspector-close';
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', () => {
            this.removePopup();
        });
        
        // Create HTML section
        const htmlSection = document.createElement('div');
        htmlSection.className = 'css-inspector-section';
        
        const htmlTitle = document.createElement('div');
        htmlTitle.className = 'css-inspector-title';
        htmlTitle.innerHTML = 'HTML';
        
        const htmlCopyBtn = document.createElement('button');
        htmlCopyBtn.className = 'css-inspector-copy-btn';
        htmlCopyBtn.innerHTML = 'Copy';
        htmlCopyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(html);
        });
        
        const htmlCode = document.createElement('div');
        htmlCode.className = 'css-inspector-code';
        htmlCode.innerHTML = this.highlightHTML(html);
        
        htmlTitle.appendChild(htmlCopyBtn);
        htmlSection.appendChild(htmlTitle);
        htmlSection.appendChild(htmlCode);
        
        // Create CSS section
        const cssSection = document.createElement('div');
        cssSection.className = 'css-inspector-section';
        
        const cssTitle = document.createElement('div');
        cssTitle.className = 'css-inspector-title';
        cssTitle.innerHTML = 'CSS';
        
        const cssCopyBtn = document.createElement('button');
        cssCopyBtn.className = 'css-inspector-copy-btn';
        cssCopyBtn.innerHTML = 'Copy';
        cssCopyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(css);
        });
        
        const cssCode = document.createElement('div');
        cssCode.className = 'css-inspector-code';
        cssCode.innerHTML = this.highlightCSS(css);
        
        cssTitle.appendChild(cssCopyBtn);
        cssSection.appendChild(cssTitle);
        cssSection.appendChild(cssCode);
        
        // Append all elements to popup
        popup.appendChild(closeBtn);
        popup.appendChild(htmlSection);
        popup.appendChild(cssSection);
        
        // Position popup
        popup.style.left = Math.min(x + 10, window.innerWidth - 520) + 'px';
        popup.style.top = Math.min(y + 10, window.innerHeight - 420) + 'px';
        
        document.body.appendChild(popup);
        this.popup = popup;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (this.popup === popup) {
                this.removePopup();
            }
        }, 10000);
    }
    
    removePopup() {
        if (this.popup && this.popup.parentNode) {
            this.popup.parentNode.removeChild(this.popup);
            this.popup = null;
        }
    }
    
    getElementHTML(element) {
        const clone = element.cloneNode(true);
        
        // Remove inspector elements
        clone.querySelectorAll('.css-inspector-overlay, .css-inspector-popup').forEach(el => el.remove());
        
        // Clean up the HTML
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(clone);
        
        let html = tempDiv.innerHTML;
        
        // Format HTML nicely
        html = html.replace(/></g, '>\n<');
        html = this.formatHTML(html);
        
        return html;
    }
    
    formatHTML(html) {
        let formatted = '';
        let indent = 0;
        const lines = html.split('\n');
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            
            if (trimmed.startsWith('</')) {
                indent--;
            }
            
            formatted += '  '.repeat(Math.max(0, indent)) + trimmed + '\n';
            
            if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
                indent++;
            }
        });
        
        return formatted.trim();
    }
    
    getElementCSS(element) {
        const computedStyles = window.getComputedStyle(element);
        const importantStyles = [
            'display', 'position', 'top', 'right', 'bottom', 'left',
            'width', 'height', 'margin', 'padding', 'border',
            'background', 'color', 'font-family', 'font-size', 'font-weight',
            'text-align', 'line-height', 'z-index', 'opacity', 'transform',
            'box-shadow', 'border-radius', 'flex', 'grid'
        ];
        
        let css = `.${element.className.split(' ')[0] || element.tagName.toLowerCase()} {\n`;
        
        importantStyles.forEach(prop => {
            const camelCase = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            let value = computedStyles.getPropertyValue(prop);
            
            if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
                // Skip default values
                if (prop === 'display' && value === 'block' && element.tagName === 'DIV') return;
                if (prop === 'position' && value === 'static') return;
                if (prop === 'color' && value === 'rgb(0, 0, 0)') return;
                
                css += `  ${prop}: ${value};\n`;
            }
        });
        
        css += '}';
        return css;
    }
    
    highlightHTML(html) {
        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/(&lt;\/?)(\\w+)/g, '<span class="css-inspector-tag">$1$2</span>')
            .replace(/(\\w+)(=)/g, '<span class="css-inspector-attr">$1</span>$2')
            .replace(/(=")([^"]*?)(")/g, '$1<span class="css-inspector-value">$2</span>$3');
    }
    
    highlightCSS(css) {
        return css
            .replace(/([a-zA-Z-]+)(:)/g, '<span class="css-inspector-property">$1</span>$2')
            .replace(/(: )([^;\\n]+)/g, '$1<span class="css-inspector-css-value">$2</span>');
    }
    
    updateOverlay(element) {
        if (!this.overlay || !element) return;
        
        const rect = element.getBoundingClientRect();
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        
        this.overlay.style.display = 'block';
        this.overlay.style.left = (rect.left + scrollX) + 'px';
        this.overlay.style.top = (rect.top + scrollY) + 'px';
        this.overlay.style.width = rect.width + 'px';
        this.overlay.style.height = rect.height + 'px';
    }
    
    handleMouseMove = (e) => {
        if (!this.isActive) return;
        
        const element = e.target;
        
        // Skip inspector elements
        if (element.classList.contains('css-inspector-overlay') || 
            element.classList.contains('css-inspector-popup') ||
            element.closest('.css-inspector-popup')) {
            return;
        }
        
        this.currentElement = element;
        this.updateOverlay(element);
    };
    
    handleClick = (e) => {
        if (!this.isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        if (e.target.closest('.css-inspector-popup')) return;
        
        if (this.currentElement) {
            this.createPopup(this.currentElement, e.clientX, e.clientY);
        }
    };
    
    handleKeyDown = (e) => {
        if (e.key === 'Escape' && this.isActive) {
            this.deactivate();
        }
    };
    
    attachEventListeners() {
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('click', this.handleClick);
        document.addEventListener('keydown', this.handleKeyDown);
    }
    
    removeEventListeners() {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('click', this.handleClick);
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}

// Initialize the CSS Inspector
const cssInspector = new CSSInspector();