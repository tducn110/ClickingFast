# Pastel Serenity Design System

> Portable, markdown-based design system. Plain text, version-controllable, tool-agnostic.

**Brand:** Pastel Serenity — Bình yên, tối giản và thư giãn.
**Direction:** Minimalist, flat illustration style. Bầu không khí nhẹ nhàng, sử dụng các dải màu pastel nhạt, góc bo tròn mềm mại (soft rounded edges), tuyệt đối không dùng bóng đổ (drop shadows) nặng nề.

---

## Colors

### Brand / Primary
* **Primary / CTA** (`#EED05E`): Vàng mù tạt (Mustard Yellow). Dùng cho nút bấm chính (Primary Button), các điểm nhấn quan trọng (Highlight), icon chính.
* **Primary Hover** (`#D6B847`): Trạng thái hover của nút bấm chính.
* **Secondary Accent** (`#CC7069`): Đỏ san hô nhạt (Muted Coral). Dùng cho các nút bấm phụ, tag, hoặc các yếu tố cảnh báo nhẹ nhàng.

### Neutrals & Surfaces
* **Background** (`#FFFFFF`): Màu nền mặc định của toàn bộ trang web.
* **Surface / Muted Background** (`#DCECF0`): Xanh nước nhạt (Pastel Blue). Dùng làm màu nền cho các section xen kẽ, các thẻ (Card), hoặc khu vực làm nổi bật nội dung.
* **Border** (`rgba(74, 77, 78, 0.1)`): Viền phân cách rất mờ, dùng để tách biệt các khu vực nếu không dùng màu nền.

### Text
* **Text Primary** (`#4A4D4E`): Xám than đậm (Dark Charcoal). Thay thế hoàn toàn cho màu đen (`#000000`). Dùng cho mọi Tiêu đề và Body text để giữ sự mềm mại.
* **Text Muted** (`rgba(74, 77, 78, 0.6)`): Xám trong suốt. Dùng cho caption, placeholder, text phụ trợ.
* **Text On Primary** (`#4A4D4E`): Chữ trên nền Vàng mù tạt (vì màu vàng sáng nên dùng chữ xám than để đảm bảo độ tương phản, không dùng chữ trắng).
* **Text On Secondary** (`#FFFFFF`): Chữ trên nền Đỏ san hô.

---

## Typography

Sử dụng các phông chữ bo tròn, không chân (Rounded Sans-serif) để khớp với nét vẽ minh họa mộc mạc.

* **Display / Headings** — `Nunito` hoặc `Quicksand`, weight **700/800**, fallback `system-ui, sans-serif`. Dùng cho các thẻ `h1`/`h2`/`h3`.
* **Body** — `DM Sans` hoặc `Inter`, weights 400/500/600, fallback `system-ui, sans-serif`. Dùng cho đoạn văn, menu, label để tối ưu độ dễ đọc.

### Scale
| Style | Font | Size | Weight | Line height |
| --- | --- | --- | --- | --- |
| H1 / Hero | Nunito | 56px | 800 | 1.1 |
| H2 / Section | Nunito | 40px | 800 | 1.2 |
| H3 | Nunito | 28px | 700 | 1.3 |
| Lead / Intro | DM Sans | 20px | 400 | 1.6 |
| Body | DM Sans | 16px | 400 | 1.6 |
| Nav / Label | DM Sans | 16px | 500 | 1.5 |
| Button | DM Sans | 15px | 600 | 1.0 |
| Caption | DM Sans | 13px | 500 | 1.4 |

---

## Spacing & Radius
* **Base unit:** 4px. Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 / 96.
* **Radius (Độ bo góc):** Đặc biệt quan trọng cho theme này.
  * `12px` hoặc `16px` cho Card, Input, Modal.
  * `full` (9999px / pill shape) cho toàn bộ Button và Badge/Tag.
* **Section padding:** Rất rộng rãi (`py-16` đến `py-24` trong Tailwind) để không gian "thở", tạo cảm giác bình yên.

---

## Components

### Buttons
* **Primary:** Background `#EED05E`, Text `#4A4D4E`, Radius `full` (pill). Hover state chuyển sang `#D6B847`. Không có border.
* **Secondary:** Background `#CC7069`, Text `#FFFFFF`, Radius `full` (pill).
* **Outline / Ghost:** Text `#4A4D4E`, Background transparent. Có viền `1px solid rgba(74, 77, 78, 0.2)` nếu là Outline. Trạng thái Hover: Background `rgba(74, 77, 78, 0.05)`.

### Cards
* **Style:** Phẳng hoàn toàn (Flat).
* Background `#DCECF0` (hoặc Trắng nếu nằm trên section nền `#DCECF0`).
* Padding `24px` hoặc `32px`.
* Góc bo `16px`.
* **Tùy chọn:** Có thể thêm viền nhẹ `1px solid rgba(74, 77, 78, 0.05)` thay vì dùng bóng đổ.

### Inputs
* Background `#F8F9FA`.
* Border `1px solid rgba(74, 77, 78, 0.15)`. Focus state: `border-[#EED05E] ring-2 ring-[#EED05E]/20`.
* Góc bo `12px`.
* Text `#4A4D4E`.

---

## Elevation & Effects
Thiết kế loại bỏ hoàn toàn các hiệu ứng nổi khối 3D hoặc bóng đổ đậm.
* **Level 0 (Nền):** Trắng `#FFFFFF` hoặc Xanh nhạt `#DCECF0`.
* **Level 1 (Card/Container):** Phân biệt bằng màu nền khác màu Level 0, tuyệt đối **không** dùng `box-shadow`.
* **Level 2 (Dropdown/Modal):** Cho phép dùng một bóng đổ cực kỳ mờ và nhạt để tách lớp: `box-shadow: 0 10px 40px -10px rgba(74, 77, 78, 0.08)`. Không dùng màu đen cho bóng đổ.
* **Animations:** Sử dụng transition nhẹ nhàng (`duration-200 ease-in-out`) cho các tương tác hover, không dùng các hiệu ứng bounce hoặc giật nảy mạnh.

---

## Guidelines

**Do**
* Dùng màu Xám than `#4A4D4E` cho chữ thay vì màu đen.
* Để khoảng trắng (white space) rộng rãi giữa các phần tử.
* Thiết kế nút bấm thành dạng viên thuốc (pill shape).
* Chọn các icon có đường nét bo tròn (rounded icons), ví dụ như Lucide icon set với stroke-width là 1.5 hoặc 2.

**Don't**
* Không dùng màu đen thuần `#000000`.
* Không dùng hiệu ứng Glow, Neon hay Gradient rực rỡ. Toàn bộ là màu Solid (màu đơn sắc).
* Không thả bóng (drop shadow) cho nút bấm hoặc Card tĩnh.
* Không dùng các font chữ sắc cạnh (serif hoặc angular sans-serif).
