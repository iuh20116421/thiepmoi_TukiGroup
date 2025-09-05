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
        this.cropCanvas = document.getElementById('cropCanvas');
        this.photoPreview = document.getElementById('photoPreview');
        this.cancelCrop = document.getElementById('cancelCrop');
        this.saveCrop = document.getElementById('saveCrop');
        this.scaleSlider = document.getElementById('scaleSlider');
        
        // Dữ liệu ảnh người dùng
        this.userPhoto = null;
        this.photoImage = null;
        this.photoScale = 1;
        this.photoPositionX = 0;
        this.photoPositionY = 0;
        this.positionSynced = false; // Flag để tránh đồng bộ nhiều lần
        
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
        this.isTouchDevice = this.detectTouchDevice();
        
        // Màu theo hạng vé
        this.ticketColors = {
            'Silver': '#E8E8E8',
            'Gold': '#FFD700',
            'Diamond': '#00BFFF'
        };
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.loadBackgroundImage();
    }
    
    detectTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    
    initializeCanvas() {
        // Kiểm tra nếu là mobile để tối ưu performance
        const isMobile = window.innerWidth <= 768;
        
        // Thiết lập High-DPI để ảnh vẽ sắc nét
        const devicePixelRatioValue = window.devicePixelRatio || 1;

        // TỐI ƯU: Giảm kích thước canvas để cải thiện performance
        const canvasSize = isMobile ? 800 : 1200; // Giảm từ 2500 xuống 1200
        this.canvas.width = canvasSize * devicePixelRatioValue;
        this.canvas.height = canvasSize * devicePixelRatioValue;

        // Xoá kích thước CSS inline để không phá vỡ responsive
        this.canvas.style.width = '';
        this.canvas.style.height = '';

        // Scale ngữ cảnh vẽ về đơn vị điểm ảnh CSS
        this.ctx.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);

        // Kích thước vẽ logic
        this.displayWidth = canvasSize;
        this.displayHeight = canvasSize;

        // Tối ưu canvas context cho kích thước lớn
        this.ctx.imageSmoothingEnabled = true;
        if (isMobile) {
            this.ctx.imageSmoothingQuality = 'medium';
        } else {
            this.ctx.imageSmoothingQuality = 'high';
        }

        // Tối ưu performance cho canvas lớn
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1.0;

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
        
        // Thanh trượt phóng to/thu nhỏ trong modal
        if (this.scaleSlider) {
            this.scaleSlider.addEventListener('input', (e) => {
                this.photoScale = parseFloat(e.target.value);
                // Reset flag đồng bộ khi người dùng thay đổi scale
                this.positionSynced = false;
                this.updateCropPreview();
            });
        }
        
        // Sự kiện kéo ảnh trong vùng cắt
        this.setupCropCanvasEvents();
        
        // Đã bỏ nút chỉnh sửa inline; chỉ mở modal bằng nút chính
        
        // TỐI ƯU: Thêm debounce để tránh vẽ lại canvas liên tục
        let debounceTimer;
        this.guestNameInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.generateInvitation();
            }, 300); // Delay 300ms trước khi vẽ lại
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
        
        // Thêm sự kiện click cho các step trong welcomeModal để điều hướng
        this.setupStepNavigation();
        
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
    
    setupStepNavigation() {
        // Thêm sự kiện click cho tất cả các step trong welcomeModal
        const steps = document.querySelectorAll('.instruction-steps .step');
        steps.forEach(step => {
            step.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Đóng modal chào mừng
                const welcomeModal = document.getElementById('welcomeModal');
                if (welcomeModal) {
                    welcomeModal.style.display = 'none';
                }
                
                // Điều hướng đến phần nhập họ tên
                this.navigateToGuestNameSection();
            });
            
            // Thêm style cursor pointer để người dùng biết có thể click
            step.style.cursor = 'pointer';
        });
    }
    
    navigateToGuestNameSection() {
        // Tìm phần tử nhập họ tên
        const guestNameSection = document.getElementById('guestNameSection');
        const guestNameInput = document.getElementById('guestName');
        
        if (guestNameSection && guestNameInput) {
            // Scroll đến phần nhập họ tên với hiệu ứng mượt mà
            guestNameSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Focus vào input nhập tên
            setTimeout(() => {
                guestNameInput.focus();
                
                // Thêm hiệu ứng highlight để thu hút sự chú ý
                this.highlightGuestNameSection();
            }, 500);
        }
    }
    
    highlightGuestNameSection() {
        const guestNameSection = document.getElementById('guestNameSection');
        const guestNameInput = document.getElementById('guestName');
        
        if (guestNameSection && guestNameInput) {
            // Thêm class highlight tạm thời
            guestNameSection.classList.add('highlight-section');
            guestNameInput.classList.add('highlight-input');
            
            // Xóa highlight sau 3 giây
            setTimeout(() => {
                guestNameSection.classList.remove('highlight-section');
                guestNameInput.classList.remove('highlight-input');
            }, 3000);
        }
    }
    
    loadBackgroundImage() {
        // Kiểm tra nếu là mobile để tối ưu performance
        const isMobile = window.innerWidth <= 768;
        
        this.backgroundImage = new Image();
        this.backgroundImage.onload = () => {
            // Delay nhỏ trên mobile để tránh blocking UI
            if (isMobile) {
                setTimeout(() => this.generateInvitation(), 50);
            } else {
                this.generateInvitation();
            }
        };
        this.backgroundImage.onerror = () => {
            console.warn('ThiepMoi.png not found, using fallback design');
            this.generateInvitation();
        };
        
        // Tối ưu loading cho mobile
        if (isMobile) {
            this.backgroundImage.crossOrigin = 'anonymous';
        }
        
        this.backgroundImage.src = 'image/frameNew.jpg';
    }
    
    openPhotoModal() {
        // Tự động mở hộp thoại chọn file
        const photoInput = document.getElementById('photoInput');
        if (photoInput) {
            photoInput.click();
        } else {
            this.showNotification('Lỗi: Không tìm thấy input file', 'error');
        }
    }
    
    closePhotoModal() {
        const photoModal = document.getElementById('photoModal');
        if (photoModal) photoModal.style.display = 'none';
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
                    // Sử dụng tối ưu vị trí thay vì reset
                    this.optimizePhotoPosition();
                    
                    // Hiển thị modal với preview
                    const photoModal = document.getElementById('photoModal');
                    if (photoModal) {
                        photoModal.style.display = 'block';
                    }
                    
                    this.updateCropPreview();
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
        
        // Lưu kích thước preview để đồng bộ với thiệp mời
        this.previewRadius = radius;
        
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
        
        // Tính toán tỉ lệ và vị trí ảnh với ưu tiên hiển thị phần đầu
        const imgAspect = this.photoImage.width / this.photoImage.height;
        let drawWidth, drawHeight;
        
        // Kích thước cơ sở vừa khít hình tròn - sử dụng radius thay vì width-20
        const baseSize = radius * 2;
        
        // Debug log để kiểm tra
        console.log('Preview - Image aspect:', imgAspect, 'BaseSize:', baseSize, 'Radius:', radius, 'Position:', { x: this.photoPositionX, y: this.photoPositionY });
        
        if (imgAspect > 1) {
            // Ảnh ngang: khớp theo chiều cao
            drawHeight = baseSize * this.photoScale;
            drawWidth = drawHeight * imgAspect;
        } else {
            // Ảnh dọc: khớp theo chiều rộng
            drawWidth = baseSize * this.photoScale;
            drawHeight = drawWidth / imgAspect;
        }
        
        // Độ lệch tối đa để ảnh không vượt khỏi hình tròn (cho phép linh hoạt hơn)
        const maxOffsetX = Math.max(0, (drawWidth - baseSize) / 2);
        const maxOffsetY = Math.max(0, (drawHeight - baseSize) / 2);
        
        // Cho phép kéo tự do hơn, chỉ giới hạn khi ảnh quá nhỏ so với khung
        let clampedPositionX = this.photoPositionX;
        let clampedPositionY = this.photoPositionY;
        
        // Chỉ giới hạn khi ảnh lớn hơn khung
        if (drawWidth > baseSize) {
            clampedPositionX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.photoPositionX));
        }
        if (drawHeight > baseSize) {
            clampedPositionY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.photoPositionY));
        }
        
        // Căn giữa ảnh và áp dụng độ lệch với ưu tiên hiển thị phần đầu
        let drawX = Math.round(centerX - drawWidth / 2 + clampedPositionX);
        let drawY = Math.round(centerY - drawHeight / 2 + clampedPositionY);
        
        // Điều chỉnh vị trí để ưu tiên hiển thị phần đầu (nếu chưa có vị trí tùy chỉnh)
        if (this.photoPositionX === 0 && this.photoPositionY === 0) {
            // Dịch ảnh lên trên để hiển thị phần đầu tốt hơn
            const headOffset = Math.min(30, drawHeight * 0.15); // 15% chiều cao ảnh hoặc tối đa 30px
            drawY -= headOffset;
        }
        
        // Vẽ ảnh
        cropCtx.drawImage(this.photoImage, drawX, drawY, drawWidth, drawHeight);
        cropCtx.restore();
    }
    
    saveCroppedPhoto() {
        if (!this.photoImage) return;
        
        // Đồng bộ vị trí trước khi lưu
        this.syncPhotoPosition();
        
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
         finalCtx.lineWidth = 4;
         finalCtx.beginPath();
         finalCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
         finalCtx.stroke();
         
         // Thêm viền sáng bên trong để tăng độ sâu
         finalCtx.strokeStyle = 'rgba(0, 191, 255, 0.7)';
         finalCtx.lineWidth = 2;
         finalCtx.beginPath();
         finalCtx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
         finalCtx.stroke();
        
        finalCtx.restore();
        
        // Create circular clipping path
        finalCtx.save();
        finalCtx.beginPath();
        finalCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        finalCtx.clip();
        
        // Calculate image scaling and positioning with head priority
        const imgAspect = this.photoImage.width / this.photoImage.height;
        let drawWidth, drawHeight;
        
        // Calculate base size to fit the circle - sử dụng radius thay vì 150
        const baseSize = radius * 2;
        
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
        
        // Center the image and apply position offsets with head priority
        let drawX = centerX - drawWidth / 2 + clampedPositionX;
        let drawY = centerY - drawHeight / 2 + clampedPositionY;
        
        // Apply head priority adjustment for final saved image
        if (this.photoPositionX === 0 && this.photoPositionY === 0) {
            const headOffset = Math.min(20, drawHeight * 0.12); // 12% chiều cao ảnh hoặc tối đa 20px
            drawY -= headOffset;
        }
        
        // Draw the image
        finalCtx.drawImage(this.photoImage, drawX, drawY, drawWidth, drawHeight);
        finalCtx.restore();
        
        // Save as user photo
        this.userPhoto = finalCanvas.toDataURL();
        
        this.closePhotoModal();
        this.generateInvitation();
    }
    
    // resetPhotoPosition() {
    //     this.photoScale = 1;
    //     this.photoPositionX = 0;
    //     this.photoPositionY = 0;
    //     
    //     // Reset scale slider in modal
    //     if (this.scaleSlider) {
    //         this.scaleSlider.value = 1;
    //     }
    //     
    //     this.updateCropPreview();
    // } // Đã bỏ method này vì không còn nút đặt lại
    
    // Tối ưu vị trí ảnh để hiển thị khuôn mặt tốt hơn
    optimizePhotoPosition() {
        if (!this.photoImage) return;
        
        // Thuật toán ưu tiên hiển thị phần đầu/khuôn mặt
        const imgAspect = this.photoImage.width / this.photoImage.height;
        
        // Reset vị trí về 0 trước khi tối ưu
        this.photoPositionX = 0;
        this.photoPositionY = 0;
        
        if (imgAspect > 1) {
            // Ảnh ngang - ưu tiên căn giữa theo chiều cao và dịch lên trên
            this.photoPositionY = -20; // Dịch lên trên để hiển thị đầu
        } else {
            // Ảnh dọc - ưu tiên căn giữa theo chiều rộng và dịch lên trên
            this.photoPositionY = -30; // Dịch lên trên nhiều hơn cho ảnh dọc
        }
        
        // Điều chỉnh scale để đảm bảo ảnh vừa khít
        if (imgAspect > 1.5) {
            // Ảnh rất ngang - tăng scale
            this.photoScale = 1.2;
            if (this.scaleSlider) this.scaleSlider.value = 1.2;
        } else if (imgAspect < 0.8) {
            // Ảnh rất dọc - tăng scale
            this.photoScale = 1.3;
            if (this.scaleSlider) this.scaleSlider.value = 1.3;
        }
        
        this.updateCropPreview();
    }
    
    // Đồng bộ vị trí giữa preview và thiệp mời
    syncPhotoPosition() {
        if (!this.photoImage || !this.previewRadius) return;
        
        // Lưu vị trí gốc từ preview
        const originalX = this.photoPositionX;
        const originalY = this.photoPositionY;
        
        // Tính tỷ lệ scale dựa trên kích thước thực tế của preview và thiệp mời
        // Preview sử dụng radius động, thiệp mời sử dụng circleRadius được tính theo tỷ lệ
        const previewRadius = this.previewRadius;
        
        // Tính invitationRadius thực tế dựa trên designRect hiện tại
        const currentDesignRect = this.designRect || { width: 650, height: 650 };
        const baseScale = currentDesignRect.width / 650;
        const invitationRadius = Math.max(10, Math.round(this.anchor.avatar.r * 650 * baseScale));
        
        const scaleRatio = invitationRadius / previewRadius;
        
        // Điều chỉnh vị trí theo tỷ lệ
        this.photoPositionX = originalX * scaleRatio;
        this.photoPositionY = originalY * scaleRatio;
        
        console.log('Sync position:', {
            original: { x: originalX, y: originalY },
            previewRadius: previewRadius,
            invitationRadius: invitationRadius,
            scaleRatio: scaleRatio,
            synced: { x: this.photoPositionX, y: this.photoPositionY }
        });
    }
    
    setupCropCanvasEvents() {
        let isDragging = false;
        let lastMousePos = { x: 0, y: 0 };
        let isTouchDevice = this.isTouchDevice;
        
        // Desktop mouse events
        this.cropCanvas.addEventListener('mousedown', (e) => {
            if (isTouchDevice) return; // Bỏ qua mouse events trên touch device
            isDragging = true;
            this.cropCanvas.style.cursor = 'grabbing';
            const rect = this.cropCanvas.getBoundingClientRect();
            lastMousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            // Thêm class để hiển thị trạng thái đang kéo
            this.cropCanvas.classList.add('dragging');
        });
        
        this.cropCanvas.addEventListener('mousemove', (e) => {
            if (isTouchDevice) return; // Bỏ qua mouse events trên touch device
            if (isDragging && this.photoImage) {
                const rect = this.cropCanvas.getBoundingClientRect();
                const mousePos = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                
                // Cập nhật vị trí theo cả hai chiều
                this.photoPositionX += mousePos.x - lastMousePos.x;
                this.photoPositionY += mousePos.y - lastMousePos.y;
                
                // Reset flag đồng bộ khi người dùng thay đổi vị trí
                this.positionSynced = false;
                
                lastMousePos = mousePos;
                this.updateCropPreview();
            } else if (!isDragging) {
                // Hiển thị cursor grab khi hover
                this.cropCanvas.style.cursor = 'grab';
            }
        });
        
        this.cropCanvas.addEventListener('mouseup', (e) => {
            if (isTouchDevice) return; // Bỏ qua mouse events trên touch device
            isDragging = false;
            this.cropCanvas.style.cursor = 'grab';
            this.cropCanvas.classList.remove('dragging');
        });
        
        this.cropCanvas.addEventListener('mouseleave', (e) => {
            if (isTouchDevice) return; // Bỏ qua mouse events trên touch device
            isDragging = false;
            this.cropCanvas.style.cursor = 'default';
            this.cropCanvas.classList.remove('dragging');
        });

        // Mobile touch events - Cải thiện để hoạt động tốt hơn
        this.cropCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Ngăn chặn zoom
            e.stopPropagation(); // Ngăn chặn event bubbling
            isTouchDevice = true;
            isDragging = true;
            
            const rect = this.cropCanvas.getBoundingClientRect();
            const touch = e.touches[0];
            lastMousePos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            // Thêm class để hiển thị trạng thái đang kéo
            this.cropCanvas.classList.add('dragging');
            
            // Thêm visual feedback
            this.cropCanvas.style.transform = 'scale(1.02)';
            
            // Log để debug
            console.log('Touch start detected on mobile');
        }, { passive: false });
        
        this.cropCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Ngăn chặn scroll
            e.stopPropagation(); // Ngăn chặn event bubbling
            
            if (isDragging && this.photoImage) {
                const rect = this.cropCanvas.getBoundingClientRect();
                const touch = e.touches[0];
                const touchPos = {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top
                };
                
                // Cập nhật vị trí theo cả hai chiều
                this.photoPositionX += touchPos.x - lastMousePos.x;
                this.photoPositionY += touchPos.y - lastMousePos.y;
                
                // Reset flag đồng bộ khi người dùng thay đổi vị trí
                this.positionSynced = false;
                
                lastMousePos = touchPos;
                this.updateCropPreview();
                
                // Log để debug
                console.log('Touch move - Position:', { x: this.photoPositionX, y: this.photoPositionY });
            }
        }, { passive: false });
        
        this.cropCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = false;
            this.cropCanvas.classList.remove('dragging');
            
            // Reset visual feedback
            this.cropCanvas.style.transform = 'scale(1)';
        }, { passive: false });
        
        this.cropCanvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = false;
            this.cropCanvas.classList.remove('dragging');
            
            // Reset visual feedback
            this.cropCanvas.style.transform = 'scale(1)';
        }, { passive: false });

        // Recompute preview center on resize to keep avatar centered
        window.addEventListener('resize', () => this.updateCropPreview());
    }
    
    generateInvitation() {
        // TỐI ƯU: Sử dụng requestAnimationFrame để smooth rendering
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.animationFrame = requestAnimationFrame(() => {
            this.drawCanvas();
        });
    }
    
    drawCanvas() {
        // Kiểm tra nếu là mobile để tối ưu performance
        const isMobile = window.innerWidth <= 768;
        
        // Clear canvas using display dimensions
        this.ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);
        
        if (this.backgroundImage && this.backgroundImage.complete) {
            // Draw background image with optimized quality for large canvas
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = isMobile ? 'medium' : 'high';

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

            // Draw overlays relative to image rect with performance optimization
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
        
        // Sử dụng vị trí trực tiếp từ preview thay vì đồng bộ
        // Vì cách tính toán đã được chuẩn hóa, không cần đồng bộ nữa
        
        if (this.userPhoto && this.photoImage) {
            // Draw glowing blue border effect for uploaded avatar
            ctx.save();
            
                         // Tạo hiệu ứng viền neon với glow mờ nhòe dần cho tất cả 3 viền
             
             // 1. Vẽ viền neon xanh bên ngoài với glow
             ctx.shadowColor = '#00BFFF';
             ctx.shadowBlur = 40;
             ctx.shadowOffsetX = 0;
             ctx.shadowOffsetY = 0;
             
             ctx.strokeStyle = '#00BFFF';
             ctx.lineWidth = 1.6;
             ctx.beginPath();
             ctx.arc(circleX, circleY, circleRadius + 3.5, 0, Math.PI * 2);
             ctx.stroke();
             
             // 2. Vẽ vòng tròn chính màu trắng với glow
             ctx.shadowColor = '#FFFFFF';
             ctx.shadowBlur = 35;
             ctx.shadowOffsetX = 0;
             ctx.shadowOffsetY = 0;
             
             ctx.strokeStyle = '#FFFFFF';
             ctx.lineWidth = 1.6;
             ctx.beginPath();
             ctx.arc(circleX, circleY, circleRadius + 2.5, 0, Math.PI * 2);
             ctx.stroke();
             
             // 3. Vẽ viền neon xanh bên trong với glow - vừa chạm viền avatar
             ctx.shadowColor = '#00BFFF';
             ctx.shadowBlur = 40;
             ctx.shadowOffsetX = 0;
             ctx.shadowOffsetY = 0;
             
             ctx.strokeStyle = '#00BFFF';
             ctx.lineWidth = 1.6;
             ctx.beginPath();
             ctx.arc(circleX, circleY, circleRadius +1.5, 0, Math.PI * 2);
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
            
            // Calculate base size to fit the circle - đồng bộ với preview
            // Sử dụng cùng cách tính như trong preview để đảm bảo tính nhất quán
            const baseSize = circleRadius * 2;
            
            // Debug log để kiểm tra
            console.log('Thiệp mời - Image aspect:', imgAspect, 'BaseSize:', baseSize, 'CircleRadius:', circleRadius, 'Position:', { x: this.photoPositionX, y: this.photoPositionY });
            
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
            
            // Clamp position to keep image within circle bounds - sử dụng vị trí đã đồng bộ
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
        let nameY = rect.y + this.anchor.inviteRespectBottomY * rect.height + paddingBelowRespect +17 + 5;

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
		
		ctx.save();
		
		// Tạo hiệu ứng 3D shadow - vẽ nhiều lớp shadow để tạo độ sâu
		const shadowLayers = 8;
		const maxShadowOffset = 6 * scale;
		const shadowColor = 'rgba(0, 0, 0, 0.3)';
		
		// Vẽ các lớp shadow từ xa đến gần để tạo hiệu ứng 3D
		for (let i = shadowLayers; i > 0; i--) {
			const shadowOffset = (i / shadowLayers) * maxShadowOffset;
			const shadowOpacity = (i / shadowLayers) * 0.3;
			
			ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
			ctx.shadowBlur = 2 * scale;
			ctx.shadowOffsetX = shadowOffset;
			ctx.shadowOffsetY = shadowOffset;
			
			ctx.fillStyle = this.ticketColors[ticketType] || '#ff3b8a';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = `bold ${fontSize}px Arial`;
			ctx.fillText(text, textX, textY);
		}
		
		// Thêm hiệu ứng phát sáng (glow) trước khi vẽ text chính
		const baseColor = this.ticketColors[ticketType] || '#ff3b8a';
		const glowColor = this.lightenColor(baseColor, 0.4);
		
		ctx.shadowColor = glowColor;
		ctx.shadowBlur = 3 * scale;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		
		ctx.fillStyle = baseColor;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = `bold ${fontSize}px Arial`;
		ctx.fillText(text, textX, textY);
		
		// Vẽ text chính với hiệu ứng gradient
		const textGrad = ctx.createLinearGradient(textX - textWidth/2, textY - fontSize/2, textX + textWidth/2, textY + fontSize/2);
		textGrad.addColorStop(0, this.lightenColor(baseColor, 0.6));
		textGrad.addColorStop(0.3, this.lightenColor(baseColor, 0.3));
		textGrad.addColorStop(0.7, baseColor);
		textGrad.addColorStop(1, this.darkenColor(baseColor, 0.4));
		
		// Xóa shadow cho text chính
		ctx.shadowColor = 'transparent';
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		
		// Vẽ text chính với gradient
		ctx.fillStyle = textGrad;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = `bold ${fontSize}px Arial`;
		ctx.fillText(text, textX, textY);
		
		// Thêm hiệu ứng gloss trên text
		const glossGrad = ctx.createLinearGradient(textX - textWidth/2, textY - fontSize/2, textX + textWidth/2, textY + fontSize/2);
		glossGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
		glossGrad.addColorStop(0.3, 'rgba(255,255,255,0.3)');
		
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
        ctx.fillText('AI E-COMMERCE REVOLUTION', this.displayWidth/2, this.displayHeight/2);
        
        ctx.font = '18px Arial';
        ctx.fillText('Thiệp mời sự kiện', this.displayWidth/2, this.displayHeight/2 + 50);
    }
    
    downloadInvitation() {
        const guestName = this.guestNameInput.value || 'guest';
        const ticketType = this.ticketTypeSelect.value;
        
        // TỐI ƯU: Canvas tạm để xuất ảnh chất lượng cao với độ phân giải tối ưu
        const downloadCanvas = document.createElement('canvas');
        const downloadCtx = downloadCanvas.getContext('2d');
        
        // Đặt độ phân giải cao (3x) để ảnh sắc nét hơn khi download
        const downloadScale = 3;
        downloadCanvas.width = this.displayWidth * downloadScale;
        downloadCanvas.height = this.displayHeight * downloadScale;
        
        // Scale context tương ứng bản gốc
        downloadCtx.scale(downloadScale, downloadScale);
        
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
        
        // Tối ưu cho file lớn - sử dụng blob thay vì dataURL
        downloadCanvas.toBlob((blob) => {
            // Kiểm tra xem có phải thiết bị di động không
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // Sử dụng Web Share API để chia sẻ ảnh trực tiếp vào bộ sưu tập ảnh
                this.downloadForMobile(blob, guestName, ticketType);
            } else {
                // Tải xuống bình thường cho desktop với blob
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `Thiep-Moi-TukiGroup-2025-${guestName}-${ticketType}.png`;
                link.href = url;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Cleanup blob URL
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                
                this.showNotification('Thiệp mời đã được tải xuống thành công! Hẹn sớm gặp lại quý khách');
            }
        }, 'image/png', 1.0);
    }
    
    async downloadForMobile(blob, guestName, ticketType) {
        try {
            // Tạo file object từ blob
            const file = new File([blob], `Thiep-Moi-TukiGroup-2025-${guestName}-${ticketType}.png`, {
                type: 'image/png'
            });
            
            // Kiểm tra Web Share API
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: 'Thiệp mời TukiGroup',
                        text: `Thiệp mời của ${guestName} - ${ticketType}`,
                        files: [file]
                    });
                    this.showNotification('Thiệp mời đã được chia sẻ! Bạn có thể lưu vào bộ sưu tập ảnh.');
                    return;
                } catch (shareError) {
                    console.log('Web Share API bị hủy, hiển thị modal');
                }
            }
            
            // Fallback: Hiển thị modal để hướng dẫn lưu ảnh
            this.showImageForDirectSave(blob, guestName, ticketType);
            
        } catch (error) {
            console.error('Lỗi khi tải ảnh:', error);
            // Fallback: Hiển thị modal
            this.showImageForDirectSave(blob, guestName, ticketType);
        }
    }
    

    
    // TỐI ƯU: Hiển thị ảnh để người dùng có thể lưu trực tiếp
    showImageForDirectSave(blob, guestName, ticketType) {
        // Tạo modal hiển thị ảnh
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        // Tạo ảnh để hiển thị với chất lượng cao
        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);
        img.style.cssText = `
            max-width: 100%;
            max-height: 65vh;
            border-radius: 15px;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
            border: 3px solid rgba(255, 255, 255, 0.1);
        `;
        
        // Thêm thuộc tính để tối ưu lưu ảnh
        img.setAttribute('download', `Thiep-Moi-TukiGroup-2025-${guestName}-${ticketType}.png`);
        img.setAttribute('alt', `Thiệp mời ${guestName} - ${ticketType}`);
        
        // Tạo nút hướng dẫn chi tiết
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            color: white;
            text-align: center;
            margin-top: 25px;
            font-family: 'Roboto', sans-serif;
            font-size: 16px;
            line-height: 1.6;
            max-width: 400px;
        `;
        instructions.innerHTML = `
            <h3 style="margin-bottom: 10px; color: #00BFFF; font-size: 20px;">💾 Lưu thiệp mời vào bộ sưu tập ảnh</h3>
            <div style="background: rgba(255, 255, 255, 0.11); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <p style="margin-bottom: 8px; font-weight: 600;">📱 <strong>Cách 1:</strong> Nhấn giữ ảnh → "Thêm vào ảnh"</p>
                <p style="margin-bottom: 8px; font-weight: 600;">📤 <strong>Cách 2:</strong> Nhấn giữ ảnh → "Chia sẻ" → "Lưu vào Ảnh"</p>
            </div>
            <p style="font-size: 14px; opacity: 0.8; margin-top: 10px;">Thiệp mời: <strong>${guestName}</strong> - <strong>${ticketType}</strong></p>
        `;
        

        
        // Tạo nút đóng
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ Đóng';
        closeBtn.style.cssText = `
            background: linear-gradient(45deg, #e91e63, #ff6b9d);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 10px;
            transition: all 0.3s ease;
        `;
        closeBtn.onclick = () => {
            document.body.removeChild(modal);
            URL.revokeObjectURL(img.src);
        };
        
        // Thêm các phần tử vào modal
        modal.appendChild(img);
        modal.appendChild(instructions);
        modal.appendChild(closeBtn);
        
        // Thêm vào body
        document.body.appendChild(modal);
        
        // Tự động đóng sau 60 giây
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
                URL.revokeObjectURL(img.src);
            }
        }, 60000);
        
        // Thêm sự kiện click để đóng modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                URL.revokeObjectURL(img.src);
            }
        });
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
    
    // Đảm bảo hiệu ứng ngôi sao và sóng nước hiển thị
    setTimeout(() => {
        const starEffect = document.querySelector('.star-effect');
        const waveEffect = document.querySelector('.wave-effect');
        
        // Kiểm tra nếu là mobile
        const isMobile = window.innerWidth <= 768;
        
        if (starEffect) {
            starEffect.style.display = 'block';
            starEffect.style.visibility = 'visible';
            if (isMobile) {
                starEffect.style.opacity = '0.2';
                starEffect.style.animationDuration = '40s';
            } else {
                starEffect.style.opacity = '0.8';
                starEffect.style.animationDuration = '30s';
            }
            starEffect.style.zIndex = '1';
            console.log('Hiệu ứng ngôi sao đã được kích hoạt!');
        }
        
        if (waveEffect) {
            if (isMobile) {
                waveEffect.style.display = 'none';
                waveEffect.style.visibility = 'hidden';
                console.log('Hiệu ứng sóng nước đã bị ẩn trên mobile!');
            } else {
                waveEffect.style.display = 'block';
                waveEffect.style.visibility = 'visible';
                waveEffect.style.opacity = '1';
                waveEffect.style.zIndex = '1';
                console.log('Hiệu ứng sóng nước đã được kích hoạt!');
            }
        }
        
        // Thêm hiệu ứng ngôi sao và sóng nước nếu chưa có
        if (!starEffect) {
            const newStarEffect = document.createElement('div');
            newStarEffect.className = 'star-effect';
            const starOpacity = isMobile ? '0.2' : '0.6';
            const starAnimation = isMobile ? '40s' : '30s';
            newStarEffect.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: none !important;
                z-index: 1 !important;
                background: 
                    radial-gradient(3px 3px at 25px 35px, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, transparent 100%),
                    radial-gradient(2px 2px at 85px 125px, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 60%, transparent 100%),
                    radial-gradient(4px 4px at 145px 85px, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 40%, transparent 100%),
                    radial-gradient(2.5px 2.5px at 205px 175px, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.09) 55%, transparent 100%),
                    radial-gradient(3.5px 3.5px at 265px 125px, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.11) 45%, transparent 100%),
                    radial-gradient(2px 2px at 325px 215px, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.07) 65%, transparent 100%),
                    radial-gradient(4.5px 4.5px at 385px 165px, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.13) 35%, transparent 100%),
                    radial-gradient(2.8px 2.8px at 445px 255px, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.08) 58%, transparent 100%),
                    radial-gradient(3.2px 3.2px at 505px 195px, rgba(255,255,255,0.29) 0%, rgba(255,255,255,0.10) 50%, transparent 100%),
                    radial-gradient(2.3px 2.3px at 565px 285px, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.07) 62%, transparent 100%);
                background-repeat: repeat !important;
                background-size: 600px 400px !important;
                animation: sparkle ${starAnimation} linear infinite !important;
                opacity: ${starOpacity} !important;
                filter: blur(0.3px) !important;
                display: block !important;
                visibility: visible !important;
            `;
            document.body.appendChild(newStarEffect);
            console.log('Đã tạo hiệu ứng ngôi sao mới!');
        }
        
        if (!waveEffect && !isMobile) {
            const newWaveEffect = document.createElement('div');
            newWaveEffect.className = 'wave-effect';
            newWaveEffect.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 50% !important;
                height: 100% !important;
                pointer-events: none !important;
                z-index: 1 !important;
                background: 
                    radial-gradient(ellipse 300px 80px at 15% 20%, rgba(64, 156, 255, 0.15) 0%, rgba(64, 156, 255, 0.08) 30%, transparent 60%),
                    radial-gradient(ellipse 250px 60px at 35% 40%, rgba(100, 181, 246, 0.12) 0%, rgba(100, 181, 246, 0.06) 40%, transparent 70%),
                    radial-gradient(ellipse 200px 50px at 55% 60%, rgba(144, 202, 249, 0.10) 0%, rgba(144, 202, 249, 0.05) 35%, transparent 65%),
                    radial-gradient(ellipse 180px 45px at 75% 80%, rgba(179, 229, 252, 0.08) 0%, rgba(179, 229, 252, 0.04) 45%, transparent 75%),
                    radial-gradient(ellipse 220px 55px at 25% 85%, rgba(129, 212, 250, 0.09) 0%, rgba(129, 212, 250, 0.04) 50%, transparent 80%);
                animation: gentleWave 12s ease-in-out infinite !important;
                display: block !important;
                visibility: visible !important;
            `;
            document.body.appendChild(newWaveEffect);
            console.log('Đã tạo hiệu ứng sóng nước mới!');
        }
    }, 100);
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