// ===============================================================
// =================== GAME CLASS STRUCTURE ======================
// ===============================================================

/**
 * Base Game class containing shared logic for all games.
 */
class Game {
    constructor(config) {
        this.id = config.id
        this.name = config.name;
        this.timeLimit = config.timeLimit; // in seconds
        this.containerEl = config.containerEl;
        this.onComplete = config.onComplete;
        this.remainingTime = this.timeLimit;
        this.masterTimer = null;
        this.isPaused = false;
    }
    // --- Public Methods (called by GameManager) ---
    start() {
        this.isPaused = false;
        this.remainingTime = this.timeLimit;
        this._updateTimerDisplay();
        this.containerEl.classList.remove('hidden');
        this.masterTimer = setInterval(() => this._tick(), 1000);
        this.onStart(); // Hook for child class
    }
    pause() {
        if (this.isPaused) return;
        this.isPaused = true;
        clearInterval(this.masterTimer);
        this.onPause(); // Hook for child class
    }
    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.masterTimer = setInterval(() => this._tick(), 1000);
        this.onResume(); // Hook for child class
    }
    stop() {
        clearInterval(this.masterTimer);
        this.containerEl.classList.add('hidden');
        this.onStop(); // Hook for child class
    }
    // --- Private Methods ---
    _tick() {
        if (this.isPaused) return;
        this.remainingTime--;
        this._updateTimerDisplay();
        if (this.remainingTime <= 0) {
            this.stop();
            if (this.onComplete) {
                this.onComplete();
            }
        }
    }
    _updateTimerDisplay() {
        const minutes = Math.floor(this.remainingTime / 60);
        const seconds = this.remainingTime % 60;
        document.getElementById('gameCountdownTimer').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    // --- Hooks for Child Classes (to be overridden) ---
    onStart() { console.log(`Starting ${this.name}`); }
    onPause() { console.log(`Pausing ${this.name}`); }
    onResume() { console.log(`Resuming ${this.name}`); }
    onStop() { console.log(`Stopping ${this.name}`); }
}

class SayTheItemGame extends Game {
    constructor(config, item_name) {
        super(config);
        this.itemName = item_name;
        this.ITEMS_DATABASE = [];

        this.difficultySettings = {
            easy: { min: 3000, max: 5000 },
            medium: { min: 2000, max: 3000 },
            hard: { min: 1000, max: 2000 }
        };
        this.difficulty = null; // Wait for user selection
        this.currentItem = null;
        this.itemTimer = null;
        this.progressTimer = null;
        this.timeLeftForItem = 0;
        this.maxTimeForItem = 0;

        // === MODIFICATION START ===
        // 將所有 DOM 查詢都限定在 this.containerEl 內，並在建構時就儲存起來
        this.gameWrapper = this.containerEl; // containerEl 就是 gameWrapper
        this.startScreen = this.containerEl.querySelector(`#${this.itemName}GameStartScreen`);
        this.mainScreen = this.containerEl.querySelector(`#${this.itemName}GameMainScreen`);
        this.itemDisplayEl = this.containerEl.querySelector(`#${this.itemName}Display`);
        this.progressBarEl = this.containerEl.querySelector(`#${this.itemName}ProgressBar`);
        this.startBtn = this.containerEl.querySelector(`#${this.itemName}GameStartBtn`);
        this.difficultyBtns = this.containerEl.querySelectorAll('.difficulty-btn');
        // === MODIFICATION END ===
    }

    // MODIFICATION: These methods are now called by external event listeners
    setDifficulty(level) {
        this.difficulty = level;
        // 使用預先查詢好的 this.difficultyBtns
        this.difficultyBtns.forEach(b => b.classList.remove('ring-4', 'ring-blue-400'));
        // 找到對應的按鈕並添加樣式
        this.containerEl.querySelector(`.difficulty-btn[data-difficulty="${level}"]`).classList.add('ring-4', 'ring-blue-400');
        // 使用預先查詢好的 this.startBtn
        if (this.startBtn) {
            this.startBtn.disabled = false;
        }
    }

    confirmSettings() {
        if (!this.difficulty) {
            alert("Please select a difficulty!");
            return;
        }
        this.startScreen.classList.add('hidden');
        this.mainScreen.classList.remove('hidden');
        this._showNextItem();
    }

    onStart() {
        this.items = [...this.ITEMS_DATABASE];
        this.difficulty = null; // Reset difficulty for the new game
        
        // gameWrapper 就是 containerEl，它在 Game.start() 中已經被移除了 hidden
        // this.gameWrapper.classList.remove('hidden');
        this.startScreen.classList.remove('hidden');
        this.mainScreen.classList.add('hidden');
        
        // === MODIFICATION START ===
        // 使用預先在 constructor 中找到的元素
        if (this.startBtn) {
            this.startBtn.disabled = true;
        }
        this.difficultyBtns.forEach(b => b.classList.remove('ring-4', 'ring-blue-400'));
        // === MODIFICATION END ===
    }

    // ... (onPause, onResume, onStop, _showNextItem, _showAnswer, _startProgressBar 方法保持不變)
    onPause() {
        clearTimeout(this.itemTimer);
        clearInterval(this.progressTimer);
    }
    onResume() {
        if (this.mainScreen.classList.contains('hidden')) return; // Don't resume if still on start screen
        this._startProgressBar();
        this.itemTimer = setTimeout(() => this._showAnswer(), this.timeLeftForItem); // 注意: timeLeftForFruit 應為 timeLeftForItem
    }
    onStop() {
        clearTimeout(this.itemTimer);
        clearInterval(this.progressTimer);
    }
    _showNextItem() {
        if (this.isPaused || this.remainingTime <= 0) return;
        if (this.items.length === 0) this.items = [...this.ITEMS_DATABASE];
        const randomIndex = Math.floor(Math.random() * this.items.length);
        this.currentItem = this.items.splice(randomIndex, 1)[0];
        this.itemDisplayEl.innerHTML = `
            <img src="${this.currentItem.image}" alt="${this.itemName}" class="w-64 h-64 object-contain mx-auto mb-4 pulse-animation">
            <h2 id="${this.itemName}Name" class="text-4xl font-bold text-gray-400">?</h2>`;
        const settings = this.difficultySettings[this.difficulty];
        const nextTime = Math.random() * (settings.max - settings.min) + settings.min;
        this.maxTimeForItem = nextTime;
        this.timeLeftForItem = nextTime;
        this._startProgressBar();
        this.itemTimer = setTimeout(() => this._showAnswer(), nextTime);
    }
    _showAnswer() {
        if (!this.currentItem) return;
        // 在 _showNextItem 之後，元素會被重建，所以需要重新查詢
        const itemNameEl = this.containerEl.querySelector(`#${this.itemName}Name`);
        if (itemNameEl) {
            itemNameEl.textContent = this.currentItem.name;
            itemNameEl.className = `text-4xl font-bold ${this.currentItem.color}`;
        }
        this.itemTimer = setTimeout(() => {
            if (!this.isPaused) this._showNextItem();
        }, 1500);
    }
    _startProgressBar() {
        clearInterval(this.progressTimer);
        this.progressBarEl.style.width = '100%';
        this.progressTimer = setInterval(() => {
            if (this.isPaused) return;
            this.timeLeftForItem -= 100;
            const percentage = (this.timeLeftForItem / this.maxTimeForItem) * 100;
            this.progressBarEl.style.width = Math.max(0, percentage) + '%';
            if (this.timeLeftForItem <= 0) {
                clearInterval(this.progressTimer);
            }
        }, 100);
    }
}


/**
 * FruitGame - Reaction training game.
 */
export class FruitGame extends SayTheItemGame {
    constructor(config) {
        super(config,"fruit");
        this.ITEMS_DATABASE = [
            { image: 'image/fruits/apple.jpg', name: '蘋果', color: 'text-red-600' },
            { image: 'image/fruits/green_apple.jpg', name: '青蘋果', color: 'text-green-600' },
            { image: 'image/fruits/guava.jpg', name: '芭樂', color: 'text-green-600' },
            { image: 'image/fruits/banana.jpg', name: '香蕉', color: 'text-yellow-600' },
            { image: 'image/fruits/orange.jpg', name: '橘子', color: 'text-orange-600' },
            { image: 'image/fruits/watermelon.jpg', name: '西瓜', color: 'text-green-600' },
            { image: 'image/fruits/grapes.jpg', name: '葡萄', color: 'text-purple-600' },
            { image: 'image/fruits/green_grapes.jpg', name: '綠葡萄', color: 'text-green-600' },
            { image: 'image/fruits/pineapple.jpg', name: '鳳梨', color: 'text-yellow-600' },
            { image: 'image/fruits/strawberry.jpg', name: '草莓', color: 'text-red-600' },
            { image: 'image/fruits/mango.jpg', name: '芒果', color: 'text-orange-600' },
            { image: 'image/fruits/peach.jpg', name: '桃子', color: 'text-pink-500' },
            { image: 'image/fruits/cherry.jpg', name: '櫻桃', color: 'text-red-600' },
            { image: 'image/fruits/kiwi.jpg', name: '奇異果', color: 'text-green-600' },
            { image: 'image/fruits/lemon.jpg', name: '檸檬', color: 'text-yellow-600' },
            { image: 'image/fruits/coconut.jpg', name: '椰子', color: 'text-amber-800' },
            { image: 'image/fruits/pear.jpg', name: '梨子', color: 'text-yellow-400' },
            { image: 'image/fruits/blueberry.jpg', name: '藍莓', color: 'text-blue-600' },
            { image: 'image/fruits/melon.jpg', name: '哈密瓜', color: 'text-orange-400' },
            { image: 'image/fruits/tomato.jpg', name: '番茄', color: 'text-red-400' },
            { image: 'image/fruits/longan.jpg', name: '龍眼', color: 'text-orange-400' },
            { image: 'image/fruits/avocado.jpg', name: '酪梨', color: 'text-red-600' },
            { image: 'image/fruits/starfruit.jpg', name: '楊桃', color: 'text-yellow-600' },
            { image: 'image/fruits/cranberry.jpg', name: '蔓越莓', color: 'text-red-600' },
            { image: 'image/fruits/sugar_apple.jpg', name: '釋迦', color: 'text-green-600' },
            { image: 'image/fruits/durian.jpg', name: '榴槤', color: 'text-yellow-600' },
            { image: 'image/fruits/dragon_fruit.jpg', name: '火龍果', color: 'text-red-600' },
            { image: 'image/fruits/grapefruit.jpg', name: '葡萄柚', color: 'text-orange-600' },
            { image: 'image/fruits/kumquat.jpg', name: '金桔', color: 'text-orange-600' },
            { image: 'image/fruits/lychee.jpg', name: '荔枝', color: 'text-red-600' },
            { image: 'image/fruits/mangosteen.jpg', name: '山竹', color: 'text-purple-600' },
            { image: 'image/fruits/passionfruit.jpg', name: '百香果', color: 'text-purple-600' },
            { image: 'image/fruits/mulberry.jpg', name: '桑葚', color: 'text-purple-500' },
            { image: 'image/fruits/papaya.jpg', name: '木瓜', color: 'text-orange-600' },
            { image: 'image/fruits/persimmon.jpg', name: '柿子', color: 'text-orange-600' },
            { image: 'image/fruits/plum.jpg', name: '李子', color: 'text-red-600' },
            { image: 'image/fruits/pomegrante.jpg', name: '石榴', color: 'text-red-800' },
            { image: 'image/fruits/pomelo.jpg', name: '柚子', color: 'text-yellow-400' },
            { image: 'image/fruits/wax_apple.jpg', name: '蓮霧', color: 'text-red-600' },
            { image: 'image/fruits/raspberry.jpg', name: '覆盆子', color: 'text-red-400' }
        ];
    }
}
/**
 * AnimalGame - Reaction training game.
 */
export class AnimalGame extends SayTheItemGame {
    constructor(config) {
        super(config,"animal");
        this.ITEMS_DATABASE = [
            { image: 'image/animals/獅子.jpg', name: '獅子', color: 'text-red-600' },
            { image: 'image/animals/狗.jpg', name: '狗', color: 'text-green-600' },
            { image: 'image/animals/貓.jpg', name: '貓', color: 'text-green-600' },
            { image: 'image/animals/鯊魚.jpg', name: '鯊魚', color: 'text-yellow-600' },
            { image: 'image/animals/魚.jpg', name: '魚', color: 'text-orange-600' },
            { image: 'image/animals/老虎.jpg', name: '老虎', color: 'text-green-600' },
            { image: 'image/animals/袋鼠.jpg', name: '袋鼠', color: 'text-purple-600' },
            { image: 'image/animals/兔.jpg', name: '兔', color: 'text-green-600' },
            { image: 'image/animals/熊.jpg', name: '熊', color: 'text-green-600' },
            { image: 'image/animals/蛇.jpg', name: '蛇', color: 'text-green-600' },
            { image: 'image/animals/犀牛.jpg', name: '犀牛', color: 'text-green-600' }
        ];
    }
}


/**
 * TempoGame - Rhythm and timing game.
 */
export class TempoGame extends Game {
    constructor(config) {
        super(config);
        this.beatIntervalTime = 1000; // 60 BPM
        this.beatTimer = null;
        this.starTimer = null;
        this.currentBeat = 0;
        this.starVisible = false;
        this.quadrants = document.querySelectorAll('#tempoGameContainer .quadrant');
        this.starEl = document.getElementById('star');
        this.clapHandler = () => this._clap();
        this.keydownHandler = (e) => {
            if(e.code === 'Space') {
                e.preventDefault();
                this._clap();
            }
        };
    }
    onStart() {
        this.currentBeat = 0;
        this.beatTimer = setInterval(() => this._playBeat(), this.beatIntervalTime);
        this._playBeat(); // Start immediately
        this.quadrants.forEach(q => q.addEventListener('click', this.clapHandler));
        document.addEventListener('keydown', this.keydownHandler);
    }
    onPause() {
        clearInterval(this.beatTimer);
        clearTimeout(this.starTimer);
    }
    onResume() {
        this.beatTimer = setInterval(() => this._playBeat(), this.beatIntervalTime);
    }
    onStop() {
        clearInterval(this.beatTimer);
        clearTimeout(this.starTimer);
        this.quadrants.forEach(q => {
            q.removeEventListener('click', this.clapHandler);
            q.classList.remove('active', 'dim');
        });
        document.removeEventListener('keydown', this.keydownHandler);
        this.starEl.style.display = 'none';
    }
    _playBeat() {
        this.quadrants.forEach(q => q.classList.remove('active'));
        const activeQuadrant = this.quadrants[this.currentBeat];
        activeQuadrant.classList.add('active');
        setTimeout(() => activeQuadrant.classList.remove('active'), this.beatIntervalTime * 0.5);
        this._scheduleStar();
        this.currentBeat = (this.currentBeat + 1) % 4;
    }
    _scheduleStar() {
        clearTimeout(this.starTimer);
        if (Math.random() < 0.25) { // 25% chance to show a star
            this._showStar();
        }
    }
    _showStar() {
        if (this.starVisible) return;
        this.starVisible = true;
        const activeQuadrant = this.quadrants[this.currentBeat];
        const containerRect = document.getElementById('tempoGameContainer').getBoundingClientRect();
        const quadRect = activeQuadrant.getBoundingClientRect();
        const relativeLeft = ((quadRect.left + quadRect.width / 2) - containerRect.left) / containerRect.width * 100;
        const relativeTop = ((quadRect.top + quadRect.height / 2) - containerRect.top) / containerRect.height * 100;
        this.starEl.style.left = `${relativeLeft}%`;
        this.starEl.style.top = `${relativeTop}%`;
        this.starEl.style.display = 'block';
        this.starTimer = setTimeout(() => this._hideStar(), this.beatIntervalTime * 0.5);
    }
    _hideStar() {
        this.starVisible = false;
        this.starEl.style.display = 'none';
    }
    _clap() {
        if(this.starVisible) {
            this._hideStar();
        }
    }
}
/**
 * AerobicGame - Video-based exercise.
 */
export class AerobicGame extends Game {
    constructor(config) {
        super(config);
        this.videoEl = document.getElementById('aerobicVideo');
    }
    onStart() {
        this.videoEl.currentTime = 0;
        this.videoEl.play().catch(e => console.error("Video autoplay was blocked.", e));
    }
    onPause() {
        if (!this.videoEl.paused) {
            this.videoEl.pause();
        }
    }
    onResume() {
        if (this.videoEl.paused) {
            this.videoEl.play().catch(e => console.error("Video play on resume failed.", e));
        }
    }
    onStop() {
        this.videoEl.pause();
    }
}