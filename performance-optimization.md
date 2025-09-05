# Hướng dẫn tối ưu hiệu suất website thiệp mời

## Các vấn đề hiệu suất hiện tại:

### 1. Canvas quá lớn (2500x2500px)
- **Vấn đề**: Canvas quá lớn gây lag khi vẽ
- **Giải pháp**: 
  - Giảm kích thước canvas xuống 1200x1200px cho desktop
  - Sử dụng 800x800px cho mobile
  - Chỉ tăng độ phân giải khi download

### 2. Hiệu ứng CSS nặng
- **Vấn đề**: Nhiều animation đồng thời (star, wave effects)
- **Giải pháp**:
  - Tắt hiệu ứng trên mobile
  - Giảm opacity và animation duration
  - Sử dụng `will-change: auto` thay vì `transform`

### 3. Vẽ lại canvas liên tục
- **Vấn đề**: Canvas được vẽ lại mỗi khi thay đổi input
- **Giải pháp**:
  - Thêm debounce cho input events (300ms)
  - Chỉ vẽ lại khi cần thiết
  - Sử dụng `requestAnimationFrame` cho smooth rendering

### 4. Ảnh không tối ưu
- **Vấn đề**: Ảnh nền lớn, không nén
- **Giải pháp**:
  - Nén ảnh nền xuống dưới 200KB
  - Sử dụng WebP format
  - Thêm lazy loading

## Code tối ưu:

### 1. Tối ưu Canvas:
```javascript
// Giảm kích thước canvas
const canvasSize = isMobile ? 800 : 1200; // Thay vì 2500
this.canvas.width = canvasSize;
this.canvas.height = canvasSize;

// Thêm debounce cho input
let debounceTimer;
this.guestNameInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        this.generateInvitation();
    }, 300);
});
```

### 2. Tối ưu CSS:
```css
/* Tắt hiệu ứng nặng trên mobile */
@media (max-width: 768px) {
    .star-effect, .wave-effect {
        display: none !important;
    }
    
    body::before, body::after {
        animation: none !important;
    }
}

/* Tối ưu performance */
.canvas-container {
    will-change: auto;
    transform: translateZ(0);
    backface-visibility: hidden;
}
```

### 3. Tối ưu ảnh:
```html
<!-- Thêm lazy loading -->
<img src="image/frameNew.jpg" loading="lazy" alt="Background">
```

### 4. Tối ưu JavaScript:
```javascript
// Sử dụng requestAnimationFrame
generateInvitation() {
    if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
    }
    
    this.animationFrame = requestAnimationFrame(() => {
        this.drawCanvas();
    });
}
```

## Kết quả mong đợi:
- **Tốc độ load**: Giảm 60-70%
- **FPS**: Tăng từ 30fps lên 60fps
- **Memory usage**: Giảm 50%
- **Mobile performance**: Cải thiện đáng kể

## Các bước thực hiện:
1. Giảm kích thước canvas
2. Thêm debounce cho input events
3. Tối ưu CSS animations
4. Nén và lazy load ảnh
5. Sử dụng requestAnimationFrame
6. Tắt hiệu ứng nặng trên mobile

Bạn có muốn tôi implement các tối ưu này không?
