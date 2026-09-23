# Game runtime contract

## Mục tiêu

Một checkout phải có hai cách chạy:

1. mở thẳng local hoặc URL Vercel để người phát triển deploy test và chơi ngay;
2. mở trong iframe Wink để dùng certified bridge, parent session và capability
   thật.

Standalone fallback chỉ là presentation/runtime mode. Không tạo token, identity,
fake Wink score, fake remote leaderboard hoặc custom `postMessage` protocol.

## Runtime decision

```text
window.WinkBridge missing
        |
        └── local mode

WinkBridge + top-level + PARENT_REQUIRED
        |
        └── local mode, hide expected parent error

WinkBridge + iframe
        |
        └── Wink mode, preserve real phase/capabilities/errors

iframe + unrelated error
        |
        └── show error, do not silently fallback
```

`top-level` được xác định bằng `window.top === window.self`, không hard-code
domain. Vì vậy `localhost`, `127.0.0.1`, preview Vercel, production Vercel hoặc
custom HTTPS domain đều dùng cùng một quy tắc. Chỉ `PARENT_REQUIRED` ở top-level
mới được map sang `local`.

## Checkout and play

```bash
git clone <repo-url>
cd 03_muavu
npm ci
npm run verify:wink-bridge
npm run typecheck
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
```

Mở `http://127.0.0.1:5173/` để standalone play. Với Vercel, project build
command là `npm run build`, output directory là `dist`, không cần secret hoặc
backend environment variable cho standalone mode. Kiểm tra URL deploy bằng
`curl -I https://<deployment>.vercel.app/` rồi mở URL trực tiếp.

## Wink iframe

`index.html` phải load bridge trước module game:

```html
<script src="/wink-bridge.js"></script>
<script type="module" src="/src/main.tsx"></script>
```

Local harness dùng exact game origin `http://127.0.0.1:5173` và parent
`http://127.0.0.1:8787`. Dev Wink dùng parent
`https://dev-winkgames.papastudio.net`. Runtime config chỉ chứa public metadata;
không đưa token, password, cookie, API authority hoặc anonymous id vào repo.

Các case bắt buộc:

- standalone top-level: không hiện `PARENT_REQUIRED`, game vẫn chơi được;
- iframe Anonymous: `ready_anonymous`, read/complete theo capability, score bị
  từ chối thì hiển thị đúng `CAPABILITY_DENIED`, không fake save;
- iframe User: `ready_authenticated`, submit score và refresh remote leaderboard;
- iframe pause/mute: dừng và tiếp tục đúng ticker/timer/audio;
- iframe lỗi khác parent thiếu: giữ lỗi để debug, không fallback mù.

## Gates

```bash
npm run verify:wink-bridge
npm run verify:wink-config
npm test
npm run typecheck
npm run build
git diff --check
```

Static pass không đồng nghĩa browser, iframe, phone hoặc release pass. Vercel
`READY` chỉ chứng minh deployment; Wink runtime cần harness/browser evidence.
