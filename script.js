class InvitationGenerator {
    constructor() {
        this.canvas = document.getElementById('invitationCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.guestNameInput = document.getElementById('guestName');
        this.guestTitleInput = document.getElementById('guestTitle');
        this.ticketTypeSelect = document.getElementById('ticketType');
        this.photoInput = document.getElementById('photoInput');
        this.generateBtn = document.getElementById('generateInvitation');
        this.downloadBtn = document.getElementById('downloadInvitation');
        this.showInstructionsBtn = document.getElementById('showInstructions');
        
        // Photo modal elements
        this.photoModal = document.getElementById('photoModal');
        this.uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        this.cropCanvas = document.getElementById('cropCanvas');
        this.photoPreview = document.getElementById('photoPreview');
        this.cancelCrop = document.getElementById('cancelCrop');
        this.saveCrop = document.getElementById('saveCrop');
        this.resetCrop = document.getElementById('resetCrop');
        this.scaleSlider = document.getElementById('scaleSlider');
        
        // Photo controls
        this.photoControls = document.getElementById('photoControls');
        this.editPhotoBtn = document.getElementById('editPhotoBtn');
        
        // Photo data
        this.userPhoto = null;
        this.photoImage = null;
        this.photoScale = 1;
        this.photoPositionX = 0;
        this.photoPositionY = 0;
        
        // Background image
        this.backgroundImage = null;
        
        // Ticket colors with enhanced metallic effects
        this.ticketColors = {
            'Silver': '#C0C0C0',
            'Gold': '#FFD700',
            'Diamond': '#4169E1',
            'V.VIP': '#FF6B35'
        };
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.loadBackgroundImage();
    }
    
    initializeCanvas() {
        // Set high DPI canvas for crisp image quality
        const dpr = window.devicePixelRatio || 1;
        
        // Set display size (what user sees)
        this.canvas.style.width = '800px';
        this.canvas.style.height = '600px';
        
        // Set actual canvas size (internal resolution)
        this.canvas.width = 800 * dpr;
        this.canvas.height = 600 * dpr;
        
        // Scale the drawing context to match the display size
        this.ctx.scale(dpr, dpr);
        
        // Store the display dimensions for calculations
        this.displayWidth = 800;
        this.displayHeight = 600;
    }
    
    setupEventListeners() {
        // Form events
        this.generateBtn.addEventListener('click', () => {
            this.openPhotoModal();
        });
        
        this.downloadBtn.addEventListener('click', () => {
            this.downloadInvitation();
        });
        
        this.showInstructionsBtn.addEventListener('click', () => {
            document.getElementById('welcomeModal').style.display = 'block';
        });
        
        // Photo modal events
        this.uploadPhotoBtn.addEventListener('click', () => {
            this.photoInput.click();
        });
        
        this.photoInput.addEventListener('change', (e) => {
            this.handlePhotoUpload(e);
        });
        
        this.cancelCrop.addEventListener('click', () => {
            this.closePhotoModal();
        });
        
        this.saveCrop.addEventListener('click', () => {
            this.saveCroppedPhoto();
        });
        
        this.resetCrop.addEventListener('click', () => {
            this.resetPhotoPosition();
        });
        
        // Scale slider in modal
        if (this.scaleSlider) {
            this.scaleSlider.addEventListener('input', (e) => {
                this.photoScale = parseFloat(e.target.value);
                this.updateCropPreview();
            });
        }
        
        // Crop canvas drag events
        this.setupCropCanvasEvents();
        
        // Photo controls
        this.editPhotoBtn.addEventListener('click', () => {
            this.openPhotoModal();
        });
        
        // Auto-generate when input changes
        this.guestNameInput.addEventListener('input', () => {
            this.generateInvitation();
        });
        
        this.guestTitleInput.addEventListener('input', () => {
            this.generateInvitation();
        });
        
        this.ticketTypeSelect.addEventListener('change', () => {
            this.generateInvitation();
        });
        
        // Modal events
        this.setupModalEvents();
        
        // Direct close button event for welcome modal
        const closeWelcomeBtn = document.getElementById('closeWelcomeModal');
        if (closeWelcomeBtn) {
            closeWelcomeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('welcomeModal').style.display = 'none';
            };
        }
        
        // Show welcome modal once
        this.showWelcomeModalOnce();
    }
    
    setupModalEvents() {
        // Close modals when clicking X
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    if (modal.id === 'photoModal') {
                        this.closePhotoModal();
                    }
                }
            });
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
                if (e.target.id === 'photoModal') {
                    this.closePhotoModal();
                }
            }
        });
        
        // Welcome modal specific events
        const closeWelcomeModal = document.getElementById('closeWelcomeModal');
        const welcomeModal = document.getElementById('welcomeModal');
        
        if (closeWelcomeModal && welcomeModal) {
            closeWelcomeModal.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                welcomeModal.style.display = 'none';
            });
        }
    }
    
    showWelcomeModalOnce() {
        const welcomeModal = document.getElementById('welcomeModal');
        if (welcomeModal) {
            // Luôn hiển thị modal khi vào trang
            setTimeout(() => {
                welcomeModal.style.display = 'block';
            }, 500);
        }
    }
    
    loadBackgroundImage() {
        this.backgroundImage = new Image();
        this.backgroundImage.onload = () => {
            this.generateInvitation();
        };
        this.backgroundImage.onerror = () => {
            console.warn('frameEvents.jpg not found, using fallback design');
            this.generateInvitation();
        };
        this.backgroundImage.src = 'image/framEvents.jpg';
    }
    
    openPhotoModal() {
        this.photoModal.style.display = 'block';
    }
    
    closePhotoModal() {
        this.photoModal.style.display = 'none';
        this.photoPreview.style.display = 'none';
    }
    
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.photoImage = new Image();
                this.photoImage.onload = () => {
                    this.userPhoto = e.target.result;
                    this.resetPhotoPosition();
                    this.photoPreview.style.display = 'block';
                    this.updateCropPreview();
                };
                this.photoImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    updateCropPreview() {
        if (!this.photoImage) return;
        
        const cropCtx = this.cropCanvas.getContext('2d');
        cropCtx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        
        // Draw white circle background first
        cropCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        cropCtx.beginPath();
        cropCtx.arc(this.cropCanvas.width/2, this.cropCanvas.height/2, this.cropCanvas.width/2 - 10, 0, Math.PI * 2);
        cropCtx.fill();
        
        // Create circular clipping path
        cropCtx.save();
        cropCtx.beginPath();
        cropCtx.arc(this.cropCanvas.width/2, this.cropCanvas.height/2, this.cropCanvas.width/2 - 10, 0, Math.PI * 2);
        cropCtx.clip();
        
        // Calculate image scaling and positioning
        const imgAspect = this.photoImage.width / this.photoImage.height;
        let drawWidth, drawHeight;
        
        // Calculate base size to fit the circle
        const baseSize = this.cropCanvas.width - 20;
        
        if (imgAspect > 1) {
            // Landscape image - fit by height
            drawHeight = baseSize * this.photoScale;
            drawWidth = drawHeight * imgAspect;
        } else {
            // Portrait image - fit by width
            drawWidth = baseSize * this.photoScale;
            drawHeight = drawWidth / imgAspect;
        }
        
        // Calculate maximum allowed offset to keep image within circle
        const maxOffsetX = Math.max(0, (drawWidth - baseSize) / 2);
        const maxOffsetY = Math.max(0, (drawHeight - baseSize) / 2);
        
        // Clamp position to keep image within circle bounds
        const clampedPositionX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.photoPositionX));
        const clampedPositionY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.photoPositionY));
        
        // Center the image and apply position offsets
        const drawX = (this.cropCanvas.width - drawWidth) / 2 + clampedPositionX;
        const drawY = (this.cropCanvas.height - drawHeight) / 2 + clampedPositionY;
        
        // Draw the image
        cropCtx.drawImage(this.photoImage, drawX, drawY, drawWidth, drawHeight);
        cropCtx.restore();
        
        // Add white border
        cropCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        cropCtx.lineWidth = 3;
        cropCtx.beginPath();
        cropCtx.arc(this.cropCanvas.width/2, this.cropCanvas.height/2, this.cropCanvas.width/2 - 10, 0, Math.PI * 2);
        cropCtx.stroke();
    }
    
    saveCroppedPhoto() {
        if (!this.photoImage) return;
        
        // Create a new canvas for the final cropped image
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        finalCanvas.width = 150;
        finalCanvas.height = 150;
        
        // Draw white circle background first
        finalCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        finalCtx.beginPath();
        finalCtx.arc(75, 75, 75, 0, Math.PI * 2);
        finalCtx.fill();
        
        // Create circular clipping path
        finalCtx.save();
        finalCtx.beginPath();
        finalCtx.arc(75, 75, 75, 0, Math.PI * 2);
        finalCtx.clip();
        
        // Calculate image scaling and positioning
        const imgAspect = this.photoImage.width / this.photoImage.height;
        let drawWidth, drawHeight;
        
        // Calculate base size to fit the circle
        const baseSize = 150;
        
        if (imgAspect > 1) {
            // Landscape image - fit by height
            drawHeight = baseSize * this.photoScale;
            drawWidth = drawHeight * imgAspect;
        } else {
            // Portrait image - fit by width
            drawWidth = baseSize * this.photoScale;
            drawHeight = drawWidth / imgAspect;
        }
        
        // Calculate maximum allowed offset to keep image within circle
        const maxOffsetX = Math.max(0, (drawWidth - baseSize) / 2);
        const maxOffsetY = Math.max(0, (drawHeight - baseSize) / 2);
        
        // Clamp position to keep image within circle bounds
        const clampedPositionX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.photoPositionX * 0.5));
        const clampedPositionY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.photoPositionY * 0.5));
        
        // Center the image and apply position offsets
        const drawX = (150 - drawWidth) / 2 + clampedPositionX;
        const drawY = (150 - drawHeight) / 2 + clampedPositionY;
        
        // Draw the image
        finalCtx.drawImage(this.photoImage, drawX, drawY, drawWidth, drawHeight);
        finalCtx.restore();
        
        // Save as user photo
        this.userPhoto = finalCanvas.toDataURL();
        
        this.closePhotoModal();
        this.photoControls.style.display = 'block';
        this.generateInvitation();
    }
    
    resetPhotoPosition() {
        this.photoScale = 1;
        this.photoPositionX = 0;
        this.photoPositionY = 0;
        
        // Reset scale slider in modal
        if (this.scaleSlider) {
            this.scaleSlider.value = 1;
        }
        
        this.updateCropPreview();
    }
    
    setupCropCanvasEvents() {
        let isDragging = false;
        let lastMousePos = { x: 0, y: 0 };
        
        this.cropCanvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = this.cropCanvas.getBoundingClientRect();
            lastMousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });
        
        this.cropCanvas.addEventListener('mousemove', (e) => {
            if (isDragging && this.photoImage) {
                const rect = this.cropCanvas.getBoundingClientRect();
                const mousePos = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                
                this.photoPositionX += mousePos.x - lastMousePos.x;
                this.photoPositionY += mousePos.y - lastMousePos.y;
                
                lastMousePos = mousePos;
                this.updateCropPreview();
            }
        });
        
        this.cropCanvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        this.cropCanvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });
    }
    
    generateInvitation() {
        // Clear canvas using display dimensions
        this.ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);
        
        if (this.backgroundImage && this.backgroundImage.complete) {
            // Draw background image with high quality scaling
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Draw background image to fit exactly 800x600 display size
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.displayWidth, this.displayHeight);
            
            // Draw user photo in the white circle area
            this.drawUserPhotoOnFrame();
            
            // Draw guest name and title
            this.drawGuestNameOnFrame();
            
                         // Draw ticket type badge
             this.drawTicketTypeBadgeOnFrame();
        } else {
            // Fallback design if background image not loaded
            this.drawFallbackDesign();
        }
    }
    
    drawUserPhotoOnFrame(ctx = this.ctx) {
        // Position of the white circle in the frame (adjust these coordinates to match the existing white circle in frameEvents.jpg)
        const circleX = 590; // X position of circle center - adjusted to match existing white circle
        const circleY = 160; // Y position of circle center - adjusted to match existing white circle
        const circleRadius = 77; // Radius of the white circle - adjusted to match existing white circle
        
        // Don't draw white circle background since it already exists in the frameEvents.jpg
        // Just use the existing white circle in the background image
        
        if (this.userPhoto && this.photoImage) {
            ctx.save();
            
            // Create circular clipping path
            ctx.beginPath();
            ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
            ctx.clip();
            
            // Calculate image scaling and positioning for perfect fit
            const imgAspect = this.photoImage.width / this.photoImage.height;
            let drawWidth, drawHeight;
            
            // Calculate base size to fit the circle
            const baseSize = circleRadius * 2;
            
            if (imgAspect > 1) {
                // Landscape image - fit by height
                drawHeight = baseSize * this.photoScale;
                drawWidth = drawHeight * imgAspect;
            } else {
                // Portrait image - fit by width
                drawWidth = baseSize * this.photoScale;
                drawHeight = drawWidth / imgAspect;
            }
            
            // Calculate maximum allowed offset to keep image within circle
            const maxOffsetX = Math.max(0, (drawWidth - baseSize) / 2);
            const maxOffsetY = Math.max(0, (drawHeight - baseSize) / 2);
            
            // Clamp position to keep image within circle bounds
            const clampedPositionX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.photoPositionX));
            const clampedPositionY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.photoPositionY));
            
            // Center the image and apply position offsets
            const drawX = circleX - drawWidth / 2 + clampedPositionX;
            const drawY = circleY - drawHeight / 2 + clampedPositionY;
            
            // Draw the image
            ctx.drawImage(this.photoImage, drawX, drawY, drawWidth, drawHeight);
            
            ctx.restore();
        } else {
            // Show placeholder in the white circle if no photo uploaded
            ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
            ctx.beginPath();
            ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add upload instruction icon
            ctx.fillStyle = '#666666';
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('👤', circleX, circleY + 8);
        }
        
        // Add a subtle white border around the photo circle (optional, since white circle already exists in background)
        // ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        // ctx.lineWidth = 3;
        // ctx.beginPath();
        // ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
        // ctx.stroke();
    }
    
    drawGuestNameOnFrame(ctx = this.ctx) {
        const guestName = this.guestNameInput.value || 'TÊN KHÁCH MỜI';
        const guestTitle = this.guestTitleInput.value || 'Chức danh';
        
        // Position name and title below the white circle (adjusted to match new circle position)
        const circleX = 580;
        const circleY = 210;
        const circleRadius = 60;
        
        const nameX = circleX;
        const nameY = circleY + circleRadius + 30;
        const titleX = circleX;
        const titleY = nameY + 25;
        
        // Guest name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(guestName, nameX, nameY);
        
        // Guest title
        ctx.fillStyle = '#E0E0E0';
        ctx.font = '14px Arial';
        ctx.fillText(guestTitle, titleX, titleY);
    }
    
    drawTicketTypeBadgeOnFrame(ctx = this.ctx) {
        const ticketType = this.ticketTypeSelect.value;
        const ticketColor = this.ticketColors[ticketType];
        
        // Position of the avatar circle (same as in drawUserPhotoOnFrame)
        const circleX = 580;
        const circleY = 200;
        const circleRadius = 60;
        
        // Position circular badge at top-right corner of avatar circle
        const badgeRadius = 16; // Small circular badge (slightly smaller to fit better)
        const badgeX = circleX + circleRadius - badgeRadius + 3; // Slightly overlapping
        const badgeY = circleY - circleRadius + badgeRadius - 3; // Top-right corner
        
        // Draw circular badge background with gradient for metallic effect
        const gradient = ctx.createRadialGradient(badgeX, badgeY, 0, badgeX, badgeY, badgeRadius);
        gradient.addColorStop(0, ticketColor);
        gradient.addColorStop(0.7, ticketColor);
        gradient.addColorStop(1, this.darkenColor(ticketColor, 0.3));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add metallic border
        ctx.strokeStyle = this.lightenColor(ticketColor, 0.4);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw badge text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ticketType, badgeX, badgeY + 4);
        
        // Add subtle shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    

    
    drawFallbackDesign(ctx = this.ctx) {
        // Fallback design if background image not available
        const gradient = ctx.createLinearGradient(0, 0, this.displayWidth, this.displayHeight);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.5, '#FF8E53');
        gradient.addColorStop(1, '#FF6B9D');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
        
        // Add some basic text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BEAUTY SUMMIT 2025', this.displayWidth/2, this.displayHeight/2);
        
        ctx.font = '18px Arial';
        ctx.fillText('Thiệp mời sự kiện', this.displayWidth/2, this.displayHeight/2 + 50);
    }
    
    downloadInvitation() {
        const guestName = this.guestNameInput.value || 'guest';
        const ticketType = this.ticketTypeSelect.value;
        
        // Create a temporary canvas for high-quality download
        const downloadCanvas = document.createElement('canvas');
        const downloadCtx = downloadCanvas.getContext('2d');
        
        // Set download canvas to high resolution (2x for better quality)
        downloadCanvas.width = this.displayWidth * 2;
        downloadCanvas.height = this.displayHeight * 2;
        
        // Scale the context to match the original
        downloadCtx.scale(2, 2);
        
        // Enable high-quality image smoothing
        downloadCtx.imageSmoothingEnabled = true;
        downloadCtx.imageSmoothingQuality = 'high';
        
        // Redraw everything at high resolution
        downloadCtx.clearRect(0, 0, this.displayWidth, this.displayHeight);
        
        if (this.backgroundImage && this.backgroundImage.complete) {
            // Draw background image at high quality
            downloadCtx.drawImage(this.backgroundImage, 0, 0, this.displayWidth, this.displayHeight);
            
                         // Redraw all elements at high resolution
             this.drawUserPhotoOnFrame(downloadCtx);
             this.drawGuestNameOnFrame(downloadCtx);
             this.drawTicketTypeBadgeOnFrame(downloadCtx);
        } else {
            this.drawFallbackDesign(downloadCtx);
        }
        
        const link = document.createElement('a');
        link.download = `thiep-moi-beauty-summit-2025-${guestName}-${ticketType}.png`;
        link.href = downloadCanvas.toDataURL('image/png', 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Thiệp mời đã được tải xuống thành công!');
    }
    
    // Helper functions for color manipulation
    darkenColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * amount * 100);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    lightenColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * amount * 100);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            font-family: Roboto, sans-serif;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;
        
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InvitationGenerator();
});

// Add some interactive effects
document.addEventListener('DOMContentLoaded', () => {
    // Parallax effect for background
    document.addEventListener('mousemove', (e) => {
        const container = document.getElementById('container');
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        
        container.style.backgroundPosition = `${x}% ${y}%`;
    });
    
    // Add floating animation to form inputs
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach((input, index) => {
        input.style.animationDelay = `${index * 0.1}s`;
    });
});