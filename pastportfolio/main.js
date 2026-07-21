const btn = document.getElementById('darkModeToggle');
const body = document.body;

// 保存されたテーマを適用
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    btn.innerHTML = 'Light';
}

btn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    
    btn.innerHTML = isDark ? 'Light' : 'Dark';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// --- スクロールアニメーション制御 ---
const revealOnScroll = () => {
    const reveals = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight;
    const revealPoint = 200; // 要素がどれくらい見えたら発火するか

    reveals.forEach(el => {
        const revealTop = el.getBoundingClientRect().top;
        if (revealTop < windowHeight - revealPoint) {
            el.classList.add('active');
        }
    });
};

window.addEventListener('scroll', revealOnScroll);
// 読み込み時にも一度実行（最初に見えている範囲の要素を表示させるため）
window.addEventListener('load', revealOnScroll);

const container = document.getElementById('scrollContainer');

if (container) {
    let scrollSpeed = 1; // スクロールの速さ
    let scrollInterval;

    const startAutoScroll = () => {
        scrollInterval = setInterval(() => {
            // 右端まで到達したら左端に戻る
            if (container.scrollLeft + container.clientWidth >= container.scrollWidth) {
                container.scrollLeft = 0;
            } else {
                container.scrollLeft += scrollSpeed;
            }
        }, 30); // 30ミリ秒ごとに更新（数値が小さいほど滑らか）
    };

    // 自動スクロール開始
    startAutoScroll();

    // ユーザーがマウスを乗せた時は停止、離れたら再開
    container.addEventListener('mouseover', () => clearInterval(scrollInterval));
    container.addEventListener('mouseout', startAutoScroll);

    // スマホでのタッチ操作時も停止
    container.addEventListener('touchstart', () => clearInterval(scrollInterval));
    container.addEventListener('touchend', startAutoScroll);
}

if (window.innerWidth >= 1024) {
    const createParticle = () => {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.width = '5px';
        particle.style.height = '5px';
        particle.style.backgroundColor = 'var(--primary-color)';
        particle.style.opacity = '0.2';
        particle.style.borderRadius = '50%';
        particle.style.zIndex = '-1';
        
        // 左右の余白にランダム配置（中央を避ける）
        const isLeft = Math.random() > 0.5;
        particle.style.left = isLeft ? `${Math.random() * 15}%` : `${85 + Math.random() * 15}%`;
        
        particle.style.top = '-10px';
        document.body.appendChild(particle);

        const animation = particle.animate([
            { transform: 'translateY(0)', opacity: 0.2 },
            { transform: `translateY(${window.innerHeight}px)`, opacity: 0 }
        ], {
            duration: Math.random() * 5000 + 5000,
            easing: 'linear'
        });

        animation.onfinish = () => particle.remove();
    };

    setInterval(createParticle, 500); // 0.5秒ごとに生成
}