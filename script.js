class InvitationGenerator {
    constructor() {
        this.canvas = document.getElementById('invitationCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.guestNameInput = document.getElementById('guestName');
        this.ticketTypeSelect = document.getElementById('ticketType');
        this.photoInput = document.getElementById('photoInput');
        this.generateBtn = document.getElementById('generateInvitation');
        this.downloadBtn = document.getElementById('downloadInvitation');
        this.showInstructionsBtn = document.getElementById('showInstructions');
        
        // Phần tử trong modal ảnh
        this.photoModal = document.getElementById('photoModal');
        this.uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        this.cropCanvas = document.getElementById('cropCanvas');
        this.photoPreview = document.getElementById('photoPreview');
        this.cancelCrop = document.getElementById('cancelCrop');
        this.saveCrop = document.getElementById('saveCrop');
        this.resetCrop = document.getElementById('resetCrop');
        this.scaleSlider = document.getElementById('scaleSlider');
        
        // Điều khiển ảnh (đã bỏ phần inline)
        this.photoControls = null;
        this.editPhotoBtn = null;
        
        // Dữ liệu ảnh người dùng
        this.userPhoto = null;
        this.photoImage = null;
        this.photoScale = 1;
        this.photoPositionX = 0;
        this.photoPositionY = 0;
        
        // Neo vị trí (theo tỉ lệ trên khung 650x650) để các lớp vẽ bám theo ảnh khi letterbox
        this.anchor = {
            avatar: { x: 480 / 650, y: 150 / 650, r: 78 / 650 },
            inviteRespectBottomY: 254 / 650,
            eventHeaderTopY: 351 / 650
        };
        // Hình chữ nhật vùng ảnh nền được vẽ bên trong canvas vuông
        this.designRect = { x: 0, y: 0, width: 650, height: 650 };
        
        // Ảnh nền khung thiệp
        this.backgroundImage = null;
        
        // Trạng thái nội bộ
        this.isFileDialogOpen = false;
        
        // Màu theo hạng vé
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
        // Thiết lập High-DPI để ảnh vẽ sắc nét
        const devicePixelRatioValue = window.devicePixelRatio || 1;

        // Kích thước vẽ logic cố định 650x650
        this.canvas.width = 650 * devicePixelRatioValue;
        this.canvas.height = 650 * devicePixelRatioValue;

        // Xoá kích thước CSS inline để không phá vỡ responsive
        this.canvas.style.width = '';
        this.canvas.style.height = '';

        // Scale ngữ cảnh vẽ về đơn vị điểm ảnh CSS
        this.ctx.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);

        // Kích thước vẽ logic
        this.displayWidth = 650;
        this.displayHeight = 650;

        // Có thể cập nhật lại neo avatar/badge nếu cần khi responsive
        this.updateAvatarPosition();
    }

    updateAvatarPosition() {
        // Dùng neo theo tỉ lệ; hiện không cần tính lại
    }
    
    setupEventListeners() {
        // Sự kiện của biểu mẫu
        this.generateBtn.addEventListener('click', () => {
            // Kiểm tra trường bắt buộc
            if (!this.guestNameInput.value.trim()) {
                this.showNotification('Vui lòng nhập tên hiển thị trên thiệp mời!', 'error');
                this.guestNameInput.focus();
                return;
            }
            this.openPhotoModal();
        });
        
        this.downloadBtn.addEventListener('click', () => {
            // Kiểm tra trường bắt buộc
            if (!this.guestNameInput.value.trim()) {
                this.showNotification('Vui lòng nhập tên hiển thị trên thiệp mời!', 'error');
                this.guestNameInput.focus();
                return;
            }
            this.downloadInvitation();
        });
        
        this.showInstructionsBtn.addEventListener('click', () => {
            document.getElementById('welcomeModal').style.display = 'block';
        });
        
        // Sự kiện trong modal ảnh
        this.uploadPhotoBtn.addEventListener('click', () => {
            // Ngăn nhấn ngoài đóng modal khi hộp thoại chọn file của hệ điều hành trả về
            this.isFileDialogOpen = true;
            this.photoInput.click();
        });
        
        this.photoInput.addEventListener('change', (e) => {
            this.handlePhotoUpload(e);
        });
        // Một số trình duyệt trả focus về window dễ kích hoạt đóng modal.
        // Chặn nổi bọt trên các phần tử chính trong modal để tránh đóng ngoài ý muốn.
        [this.photoModal, this.photoPreview, this.cropCanvas].forEach(el => {
            if (!el) return;
            el.addEventListener('click', (evt) => evt.stopPropagation());
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
        
        // Thanh trượt phóng to/thu nhỏ trong modal
        if (this.scaleSlider) {
            this.scaleSlider.addEventListener('input', (e) => {
                this.photoScale = parseFloat(e.target.value);
                this.updateCropPreview();
            });
        }
        
        // Sự kiện kéo ảnh trong vùng cắt
        this.setupCropCanvasEvents();
        
        // Đã bỏ nút chỉnh sửa inline; chỉ mở modal bằng nút chính
        
        // Tự vẽ lại khi thay đổi thông tin đầu vào
        this.guestNameInput.addEventListener('input', () => {
            this.generateInvitation();
        });
        

        
        this.ticketTypeSelect.addEventListener('change', () => {
            this.generateInvitation();
        });

        // Đồng bộ dropdown tuỳ chỉnh với select ẩn
        const hiddenSelect = document.getElementById('ticketType');
        const dropdown = document.getElementById('ticketDropdown');
        const toggle = dropdown ? dropdown.querySelector('.dropdown-toggle') : null;
        const labelEl = dropdown ? dropdown.querySelector('.dropdown-label') : null;
        const options = dropdown ? dropdown.querySelectorAll('.dropdown-option') : [];

        if (dropdown && toggle && labelEl && options.length) {
            // Mở/đóng menu
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const expanded = dropdown.getAttribute('aria-expanded') === 'true';
                dropdown.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            });

            // Chọn một tuỳ chọn
            const updateLabelForViewport = (optEl) => {
                const longText = optEl.getAttribute('data-long') || optEl.textContent;
                const shortText = optEl.getAttribute('data-short') || longText;
                const isMobile = window.matchMedia('(max-width: 768px)').matches;
                const text = isMobile ? shortText : longText;
                labelEl.textContent = text;
                toggle.title = longText;
            };

            options.forEach((opt) => {
                opt.addEventListener('click', () => {
                    options.forEach(o => o.removeAttribute('aria-selected'));
                    opt.setAttribute('aria-selected', 'true');
                    const value = opt.getAttribute('data-value');
                    updateLabelForViewport(opt);
                    hiddenSelect.value = value;
                    dropdown.setAttribute('aria-expanded', 'false');
                    this.generateInvitation();
                });
            });

            // Khởi tạo nhãn khi tải trang và khi đổi kích thước
            const selected = dropdown.querySelector('.dropdown-option[aria-selected="true"]') || options[0];
            if (selected) updateLabelForViewport(selected);
            window.addEventListener('resize', () => {
                const current = dropdown.querySelector('.dropdown-option[aria-selected="true"]') || options[0];
                if (current) updateLabelForViewport(current);
            });

            // Đóng khi click ra ngoài
            window.addEventListener('click', (e) => {
                if (dropdown.getAttribute('aria-expanded') === 'true' && !dropdown.contains(e.target)) {
                    dropdown.setAttribute('aria-expanded', 'false');
                }
            });

            // Hỗ trợ bàn phím: Enter/Space mở, mũi tên điều hướng, Enter để chọn
            toggle.addEventListener('keydown', (e) => {
                const key = e.key;
                if (key === 'Enter' || key === ' ') {
                    e.preventDefault();
                    toggle.click();
                }
                if ((key === 'ArrowDown' || key === 'ArrowUp') && dropdown.getAttribute('aria-expanded') !== 'true') {
                    dropdown.setAttribute('aria-expanded', 'true');
                }
            });
        }
        
        // Sự kiện chung của các modal
        this.setupModalEvents();
        
        // Sự kiện nút đóng trực tiếp cho modal chào mừng
        const closeWelcomeBtn = document.getElementById('closeWelcomeModal');
        if (closeWelcomeBtn) {
            closeWelcomeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('welcomeModal').style.display = 'none';
            };
        }
        
        // Hiển thị modal chào mừng khi vào trang
        this.showWelcomeModalOnce();
    }
    
    setupModalEvents() {
        // Đóng modal khi bấm nút X
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
        
        // Đóng modal khi click ra ngoài
        window.addEventListener('click', (e) => {
            if (this.isFileDialogOpen) return; // bỏ qua click giả/sau khi chọn file
            if (!e.target) return;
            const targetHasModalClass = e.target.classList && e.target.classList.contains('modal');
            const clickedInsidePhoto = this.photoModal && this.photoModal.contains(e.target);
            if (targetHasModalClass && !clickedInsidePhoto) {
                e.target.style.display = 'none';
                if (e.target.id === 'photoModal') {
                    this.closePhotoModal();
                }
            }
        });
        
        // Sự kiện riêng cho modal chào mừng
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
        this.backgroundImage.src = 'image/ThiepMoi.png';
    }
    
    openPhotoModal() {
        this.photoModal.style.display = 'block';
        // Đảm bảo canvas preview khớp kích thước CSS để nét
        setTimeout(() => this.updateCropPreview(), 0);
    }
    
    closePhotoModal() {
        if (this.photoModal) this.photoModal.style.display = 'none';
        if (this.photoPreview) this.photoPreview.style.display = 'none';
        this.isFileDialogOpen = false;
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
                    // Ensure modal stays open after selecting a file
                    if (this.photoModal) this.photoModal.style.display = 'block';
                    this.isFileDialogOpen = false;
                };
                this.photoImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            // Khi hộp thoại bị huỷ, cho phép click ngoài để đóng lại
            this.isFileDialogOpen = false;
        }
    }
    
    updateCropPreview() {
        if (!this.photoImage) return;
        
        const cropCtx = this.cropCanvas.getContext('2d');
        // Chỉnh kích thước canvas preview theo kích thước hiển thị thực tế
        const rect = this.cropCanvas.getBoundingClientRect();
        let size = Math.min(rect.width || 0, (rect.height || rect.width || 0));
        // Kích thước dự phòng nếu layout chưa sẵn sàng
        if (!size || size < 50) size = this.cropCanvas.width || 300;
        if (this.cropCanvas.width !== size || this.cropCanvas.height !== size) {
            this.cropCanvas.width = size;
            this.cropCanvas.height = size;
        }
        cropCtx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        
        const centerX = this.cropCanvas.width/2;
        const centerY = this.cropCanvas.height/2;
        const radius = this.cropCanvas.width/2 - 10;
        
        // Vẽ viền phát sáng xanh ở preview
        cropCtx.save();
        
        // Các lớp phát sáng bên ngoài (nhiều lớp để chân thực)
        const glowLayers = [
            { radius: radius + 15, alpha: 0.1, color: '#00BFFF' },
            { radius: radius + 10, alpha: 0.2, color: '#00BFFF' },
            { radius: radius + 5, alpha: 0.3, color: '#00BFFF' },
            { radius: radius + 2, alpha: 0.5, color: '#00BFFF' }
        ];
        
        // Vẽ các lớp sáng từ ngoài vào trong
        glowLayers.forEach(layer => {
            cropCtx.shadowColor = layer.color;
            cropCtx.shadowBlur = 20;
            cropCtx.shadowOffsetX = 0;
            cropCtx.shadowOffsetY = 0;
            
            cropCtx.fillStyle = `rgba(0, 191, 255, ${layer.alpha})`;
            cropCtx.beginPath();
            cropCtx.arc(centerX, centerY, layer.radius, 0, Math.PI * 2);
            cropCtx.fill();
        });
        
        // Xoá bóng cho vòng tròn chính
        cropCtx.shadowColor = 'transparent';
        cropCtx.shadowBlur = 0;
        
        // Vẽ viền phát sáng chính
        cropCtx.strokeStyle = '#00BFFF';
        cropCtx.lineWidth = 4;
        cropCtx.beginPath();
        cropCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        cropCtx.stroke();
        
        // Thêm hiệu ứng sáng bên trong
        cropCtx.strokeStyle = 'rgba(0, 191, 255, 0.6)';
        cropCtx.lineWidth = 2;
        cropCtx.beginPath();
        cropCtx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
        cropCtx.stroke();
        
        cropCtx.restore();
        
        // Tạo vùng cắt tròn
        cropCtx.save();
        cropCtx.beginPath();
        cropCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        cropCtx.clip();
        
        // Tính toán tỉ lệ và vị trí ảnh
        const imgAspect = this.photoImage.width / this.photoImage.height;
        let drawWidth, drawHeight;
        
        // Kích thước cơ sở vừa khít hình tròn
        const baseSize = this.cropCanvas.width - 20;
        
        if (imgAspect > 1) {
            // Ảnh ngang: khớp theo chiều cao
            drawHeight = baseSize * this.photoScale;
            drawWidth = drawHeight * imgAspect;
        } else {
            // Ảnh dọc: khớp theo chiều rộng
            drawWidth = baseSize * this.photoScale;
            drawHeight = drawWidth / imgAspect;
        }
        
        // Độ lệch tối đa để ảnh không vượt khỏi hình tròn
        const maxOffsetX = Math.max(0, (drawWidth - baseSize) / 2);
        const maxOffsetY = Math.max(0, (drawHeight - baseSize) / 2);
        
        // Khoá vị trí để ảnh luôn trong hình tròn
        const clampedPositionX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.photoPositionX));
        const clampedPositionY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.photoPositionY));
        
        // Căn giữa ảnh và áp dụng độ lệch
        const drawX = Math.round((this.cropCanvas.width - drawWidth) / 2 + clampedPositionX);
        const drawY = Math.round((this.cropCanvas.height - drawHeight) / 2 + clampedPositionY);
        
        // Vẽ ảnh
        cropCtx.drawImage(this.photoImage, drawX, drawY, drawWidth, drawHeight);
        cropCtx.restore();
    }
    
    saveCroppedPhoto() {
        if (!this.photoImage) return;
        
        // Create a new canvas for the final cropped image
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        finalCanvas.width = 150;
        finalCanvas.height = 150;
        
        const centerX = 75;
        const centerY = 75;
        const radius = 75;
        
        // Draw glowing blue border effect for saved photo
        finalCtx.save();
        
                 // Tạo hiệu ứng viền sáng xanh neon như trong ảnh mẫu
         const glowLayers = [
             { radius: radius + 20, alpha: 0.05, color: '#00BFFF' },
             { radius: radius + 15, alpha: 0.1, color: '#00BFFF' },
             { radius: radius + 10, alpha: 0.15, color: '#00BFFF' },
             { radius: radius + 6, alpha: 0.2, color: '#00BFFF' },
             { radius: radius + 3, alpha: 0.3, color: '#00BFFF' },
             { radius: radius + 1, alpha: 0.4, color: '#00BFFF' }
         ];
         
         // Vẽ các lớp sáng từ ngoài vào trong để tạo hiệu ứng glow mềm mại
         glowLayers.forEach(layer => {
             finalCtx.shadowColor = layer.color;
             finalCtx.shadowBlur = 25;
             finalCtx.shadowOffsetX = 0;
             finalCtx.shadowOffsetY = 0;
             
             finalCtx.fillStyle = `rgba(0, 191, 255, ${layer.alpha})`;
             finalCtx.beginPath();
             finalCtx.arc(centerX, centerY, layer.radius, 0, Math.PI * 2);
             finalCtx.fill();
         });
         
         // Xoá shadow cho vòng tròn chính
         finalCtx.shadowColor = 'transparent';
         finalCtx.shadowBlur = 0;
         
         // Vẽ viền sáng chính với độ dày vừa phải
         finalCtx.strokeStyle = '#00BFFF';
         finalCtx.lineWidth = 3;
         finalCtx.beginPath();
         finalCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
         finalCtx.stroke();
         
         // Thêm viền sáng bên trong để tăng độ sâu
         finalCtx.strokeStyle = 'rgba(0, 191, 255, 0.7)';
         finalCtx.lineWidth = 1.5;
         finalCtx.beginPath();
         finalCtx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
         finalCtx.stroke();
        
        finalCtx.restore();
        
        // Create circular clipping path
        finalCtx.save();
        finalCtx.beginPath();
        finalCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
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

        // Recompute preview center on resize to keep avatar centered
        window.addEventListener('resize', () => this.updateCropPreview());
    }
    
    generateInvitation() {
        // Clear canvas using display dimensions
        this.ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);
        
        if (this.backgroundImage && this.backgroundImage.complete) {
            // Draw background image with high quality scaling
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';

            // Letterbox-fit the background into the square canvas (object-fit: contain)
            const imgW = this.backgroundImage.width;
            const imgH = this.backgroundImage.height;
            const scale = Math.min(this.displayWidth / imgW, this.displayHeight / imgH);
            const drawW = Math.round(imgW * scale);
            const drawH = Math.round(imgH * scale);
            const dx = Math.round((this.displayWidth - drawW) / 2);
            const dy = Math.round((this.displayHeight - drawH) / 2);

            // Paint backdrop so letterboxing feels intentional
            const bgGrad = this.ctx.createLinearGradient(0, 0, this.displayWidth, this.displayHeight);
            bgGrad.addColorStop(0, '#0f2b4c');
            bgGrad.addColorStop(1, '#0a1a30');
            this.ctx.fillStyle = bgGrad;
            this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

            // Draw the centered background image
            this.ctx.drawImage(this.backgroundImage, dx, dy, drawW, drawH);

            // Store rect for overlays
            this.designRect = { x: dx, y: dy, width: drawW, height: drawH };

            // Draw overlays relative to image rect
            this.drawUserPhotoOnFrame(this.ctx, this.designRect);
            this.drawGuestNameOnFrame(this.ctx, this.designRect);
            this.drawTicketTypeBadgeOnFrame(this.ctx, this.designRect);
        } else {
            // Fallback design if background image not loaded
            this.drawFallbackDesign();
        }
    }
    
    drawUserPhotoOnFrame(ctx = this.ctx, rect = this.designRect) {
        // Compute circle position from normalized anchors against the image rect
        const circleX = rect.x + this.anchor.avatar.x * rect.width;
        const circleY = rect.y + this.anchor.avatar.y * rect.height;
        const baseScale = rect.width / 650;
        const circleRadius = Math.max(10, Math.round(this.anchor.avatar.r * 650 * baseScale));
        
        if (this.userPhoto && this.photoImage) {
            // Draw glowing blue border effect for uploaded avatar
            ctx.save();
            
                         // Tạo hiệu ứng viền sáng xanh neon như trong ảnh mẫu
             const glowLayers = [
                 { radius: circleRadius + 20, alpha: 0.05, color: '#00BFFF' },
                 { radius: circleRadius + 15, alpha: 0.1, color: '#00BFFF' },
                 { radius: circleRadius + 10, alpha: 0.15, color: '#00BFFF' },
                 { radius: circleRadius + 6, alpha: 0.2, color: '#00BFFF' },
                 { radius: circleRadius + 3, alpha: 0.3, color: '#00BFFF' },
                 { radius: circleRadius + 1, alpha: 0.4, color: '#00BFFF' }
             ];
             
             // Vẽ các lớp sáng từ ngoài vào trong để tạo hiệu ứng glow mềm mại
             glowLayers.forEach(layer => {
                 ctx.shadowColor = layer.color;
                 ctx.shadowBlur = 25;
                 ctx.shadowOffsetX = 0;
                 ctx.shadowOffsetY = 0;
                 
                 ctx.fillStyle = `rgba(0, 191, 255, ${layer.alpha})`;
                 ctx.beginPath();
                 ctx.arc(circleX, circleY, layer.radius, 0, Math.PI * 2);
                 ctx.fill();
             });
             
             // Xoá shadow cho vòng tròn chính
             ctx.shadowColor = 'transparent';
             ctx.shadowBlur = 0;
             
             // Vẽ viền sáng chính với độ dày vừa phải
             ctx.strokeStyle = '#00BFFF';
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
             ctx.stroke();
             
             // Thêm viền sáng bên trong để tăng độ sâu
             ctx.strokeStyle = 'rgba(0, 191, 255, 0.7)';
             ctx.lineWidth = 1.5;
             ctx.beginPath();
             ctx.arc(circleX, circleY, circleRadius - 1, 0, Math.PI * 2);
             ctx.stroke();
            
            ctx.restore();
            
            // Draw the avatar image
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
            // Hiển thị placeholder nếu chưa có ảnh
            ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
            ctx.beginPath();
            ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Biểu tượng gợi ý tải ảnh
            ctx.fillStyle = '#666666';
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('👤', circleX, circleY + 8);
        }
    }
    
    drawGuestNameOnFrame(ctx = this.ctx, rect = this.designRect) {
        const guestName = this.guestNameInput.value || 'TÊN KHÁCH MỜI';
        
        // Cùng trục X với avatar; đặt chữ giữa hai mốc neo
        const circleX = rect.x + this.anchor.avatar.x * rect.width;
        const paddingBelowRespect = 54 * (rect.height / 650);
        let nameX = circleX;
        let nameY = rect.y + this.anchor.inviteRespectBottomY * rect.height + paddingBelowRespect +17;

        // Đảm bảo tên nằm trên tiêu đề sự kiện ít nhất 6px
        const nameMaxY = rect.y + this.anchor.eventHeaderTopY * rect.height - 6;
        if (nameY > nameMaxY) {
            nameY = nameMaxY;
        }
        
        // Vẽ tên khách mời
        const scale = rect.width / 650;
        const fontSize = Math.max(14, Math.round(18 * scale));
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(guestName, nameX, nameY);
        
        // No title text drawn
    }
    
	 drawTicketTypeBadgeOnFrame(ctx = this.ctx, rect = this.designRect) {
		const ticketType = this.ticketTypeSelect.value;

		// Tính vị trí vòng tròn avatar từ các neo
		const circleX = rect.x + this.anchor.avatar.x * rect.width;
		const circleY = rect.y + this.anchor.avatar.y * rect.height;
		const circleRadius = Math.max(10, Math.round(this.anchor.avatar.r * 650 * (rect.width / 650)));

		// Thông số tỷ lệ theo base 650
		const scale = rect.width / 650;
		const fontSize = Math.max(12, Math.round(16 * scale));
		ctx.font = `bold ${fontSize}px Arial`;
		const text = ticketType.toUpperCase();
		const textWidth = Math.ceil(ctx.measureText(text).width);
		
		// Đặt text ngay dưới avatar
		const textX = circleX;
		const textY = circleY + circleRadius + Math.round(15 * scale); // Khoảng cách 15px dưới avatar
		
		// Vẽ text với hiệu ứng gradient và glow
		ctx.save();
		
		// Tạo gradient cho text theo màu hạng vé
		const baseColor = this.ticketColors[ticketType] || '#ff3b8a';
		const textGrad = ctx.createLinearGradient(textX - textWidth/2, textY - fontSize/2, textX + textWidth/2, textY + fontSize/2);
		textGrad.addColorStop(0, this.lightenColor(baseColor, 0.6));
		textGrad.addColorStop(0.3, this.lightenColor(baseColor, 0.3));
		textGrad.addColorStop(0.7, baseColor);
		textGrad.addColorStop(1, this.darkenColor(baseColor, 0.4));
		
		// Viền neon cyan xung quanh text
		ctx.shadowColor = 'rgba(64, 224, 255, 0.8)';
		ctx.shadowBlur = 6 * scale;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		
		// Vẽ text với gradient
		ctx.fillStyle = textGrad;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = `bold ${fontSize}px Arial`;
		ctx.fillText(text, textX, textY);
		
		// Thêm hiệu ứng gloss trên text
		const glossGrad = ctx.createLinearGradient(textX - textWidth/2, textY - fontSize/2, textX + textWidth/2, textY + fontSize/2);
		glossGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
		glossGrad.addColorStop(0.3, 'rgba(255,255,255,0.3)');
		glossGrad.addColorStop(0.7, 'rgba(255,255,255,0.1)');
		glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
		
		ctx.fillStyle = glossGrad;
		ctx.fillText(text, textX, textY);
		
		ctx.restore();
	 }
    

    
    drawFallbackDesign(ctx = this.ctx) {
        // Thiết kế dự phòng khi không có ảnh nền
        const gradient = ctx.createLinearGradient(0, 0, this.displayWidth, this.displayHeight);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.5, '#FF8E53');
        gradient.addColorStop(1, '#FF6B9D');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
        
        // Một số chữ cơ bản
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
        
        // Canvas tạm để xuất ảnh chất lượng cao
        const downloadCanvas = document.createElement('canvas');
        const downloadCtx = downloadCanvas.getContext('2d');
        
        // Đặt độ phân giải cao (2x) để ảnh sắc nét hơn
        downloadCanvas.width = this.displayWidth * 2;
        downloadCanvas.height = this.displayHeight * 2;
        
        // Scale context tương ứng bản gốc
        downloadCtx.scale(2, 2);
        
        // Bật làm mịn ảnh chất lượng cao
        downloadCtx.imageSmoothingEnabled = true;
        downloadCtx.imageSmoothingQuality = 'high';
        
        // Vẽ lại mọi thứ ở độ phân giải cao
        downloadCtx.clearRect(0, 0, this.displayWidth, this.displayHeight);
        
        if (this.backgroundImage && this.backgroundImage.complete) {
            // Khi xuất cũng letterbox giống xem trước
            const imgW = this.backgroundImage.width;
            const imgH = this.backgroundImage.height;
            const scale = Math.min(this.displayWidth / imgW, this.displayHeight / imgH);
            const drawW = Math.round(imgW * scale);
            const drawH = Math.round(imgH * scale);
            const dx = Math.round((this.displayWidth - drawW) / 2);
            const dy = Math.round((this.displayHeight - drawH) / 2);

            const bgGrad = downloadCtx.createLinearGradient(0, 0, this.displayWidth, this.displayHeight);
            bgGrad.addColorStop(0, '#0f2b4c');
            bgGrad.addColorStop(1, '#0a1a30');
            downloadCtx.fillStyle = bgGrad;
            downloadCtx.fillRect(0, 0, this.displayWidth, this.displayHeight);

            downloadCtx.drawImage(this.backgroundImage, dx, dy, drawW, drawH);

            const rect = { x: dx, y: dy, width: drawW, height: drawH };

            // Vẽ lại các lớp theo rect ảnh
            this.drawUserPhotoOnFrame(downloadCtx, rect);
            this.drawGuestNameOnFrame(downloadCtx, rect);
            this.drawTicketTypeBadgeOnFrame(downloadCtx, rect);
        } else {
            this.drawFallbackDesign(downloadCtx);
        }
        
        const link = document.createElement('a');
        link.download = `Thiep-Moi-TukiGroup-2025-${guestName}-${ticketType}.png`;
        link.href = downloadCanvas.toDataURL('image/png', 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Thiệp mời đã được tải xuống thành công! Hẹn sớm gặp lại quý khách');
    }
    
    // Hàm phụ trợ xử lý màu sắc
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
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.textContent = message;
        
        const bgColor = type === 'error' ? '#f44336' : '#4CAF50';
        const icon = type === 'error' ? '❌' : '✅';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            font-family: Roboto, sans-serif;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        notification.innerHTML = `${icon} ${message}`;
        
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

// Khởi tạo ứng dụng khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    new InvitationGenerator();
});

// Thêm một số hiệu ứng tương tác
document.addEventListener('DOMContentLoaded', () => {
    // Hiệu ứng parallax cho nền
    document.addEventListener('mousemove', (e) => {
        const container = document.getElementById('container');
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        
        container.style.backgroundPosition = `${x}% ${y}%`;
    });
    
    // Hiệu ứng nổi nhẹ cho các input
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach((input, index) => {
        input.style.animationDelay = `${index * 0.1}s`;
    });
});