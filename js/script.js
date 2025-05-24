class TowersOfHanoi {
    constructor() {
        this.towers = [[], [], []];
        this.diskCount = 3;
        this.moves = 0;
        this.selectedDisk = null;
        this.selectedTower = null;
        this.gameStarted = false;
        this.gameCompleted = false;
        this.startTime = null;
        this.timerInterval = null;
        this.isAutoSolving = false;
        this.autoSolveSpeed = 800;
        
        // New features
        this.moveHistory = [];
        this.currentTheme = 'classic';
        this.gameMode = 'single';
        this.currentPlayer = 1;
        this.playerStats = {
            1: { moves: 0, score: 0 },
            2: { moves: 0, score: 0 }
        };
        this.achievements = new Set(JSON.parse(localStorage.getItem('towersAchievements') || '[]'));
        this.savedGames = JSON.parse(localStorage.getItem('towersOfHanoiSaves') || '[]');
        this.gameStats = JSON.parse(localStorage.getItem('towersGameStats') || '{"gamesPlayed": 0, "undoCount": 0, "themesUsed": []}');
        
        // Touch/gesture handling
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.selectedDiskForGesture = null;
        
        this.initializeAchievements();
        this.initializeEventListeners();
        this.loadTheme();
        this.initializeGame();
    }

    initializeAchievements() {
        this.achievementsList = [
            { id: 'first_win', icon: '🏆', title: 'First Victory', desc: 'Complete your first puzzle' },
            { id: 'speed_demon', icon: '⚡', title: 'Speed Demon', desc: 'Solve 3-disk puzzle in under 30 seconds' },
            { id: 'efficiency_master', icon: '🎯', title: 'Efficiency Master', desc: 'Solve with minimum moves' },
            { id: 'persistent', icon: '💪', title: 'Persistent', desc: 'Complete 5 games' },
            { id: 'tower_master', icon: '🗼', title: 'Tower Master', desc: 'Solve 8-disk puzzle' },
            { id: 'undo_master', icon: '↩️', title: 'Undo Master', desc: 'Use undo 10 times' },
            { id: 'theme_explorer', icon: '🎨', title: 'Theme Explorer', desc: 'Try all 5 themes' },
            { id: 'multiplayer_champ', icon: '👥', title: 'Multiplayer Champion', desc: 'Win a multiplayer game' },
            { id: 'save_master', icon: '💾', title: 'Save Master', desc: 'Save and load a game' },
            { id: 'gesture_guru', icon: '👆', title: 'Gesture Guru', desc: 'Complete a move using gestures' }
        ];
        this.renderAchievements();
    }

    initializeEventListeners() {
        // Control buttons
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('undo-btn').addEventListener('click', () => this.undoMove());
        document.getElementById('solve-btn').addEventListener('click', () => this.autoSolve());
        document.getElementById('save-btn').addEventListener('click', () => this.showSaveModal());
        document.getElementById('load-btn').addEventListener('click', () => this.showLoadModal());
        
        // Selectors
        document.getElementById('disk-count').addEventListener('change', (e) => {
            this.diskCount = parseInt(e.target.value);
            this.newGame();
        });
        
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.changeTheme(e.target.value);
        });
        
        document.getElementById('game-mode').addEventListener('change', (e) => {
            this.changeGameMode(e.target.value);
        });

        // Modal and panel events
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('achievements-btn').addEventListener('click', () => this.showAchievements());
        document.getElementById('close-achievements').addEventListener('click', () => this.hideAchievements());
        
        // Save/Load modal events
        document.getElementById('confirm-save').addEventListener('click', () => this.confirmSave());
        document.getElementById('cancel-save').addEventListener('click', () => this.hideSaveLoadModal());
        
        // Multiplayer events
        document.getElementById('switch-turn').addEventListener('click', () => this.switchPlayer());

        // Tower click events
        document.querySelectorAll('.disk-container').forEach(container => {
            container.addEventListener('click', (e) => {
                const towerIndex = parseInt(container.getAttribute('data-tower')) - 1;
                this.handleTowerClick(towerIndex, e);
            });
        });

        // Touch/Gesture events
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    initializeGame() {
        this.diskCount = parseInt(document.getElementById('disk-count').value);
        this.newGame();
    }

    newGame() {
        this.towers = [[], [], []];
        this.moves = 0;
        this.moveHistory = [];
        this.selectedDisk = null;
        this.selectedTower = null;
        this.gameStarted = false;
        this.gameCompleted = false;
        this.isAutoSolving = false;
        this.currentPlayer = 1;
        this.playerStats = {
            1: { moves: 0, score: 0 },
            2: { moves: 0, score: 0 }
        };
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Initialize first tower with disks
        for (let i = this.diskCount; i >= 1; i--) {
            this.towers[0].push(i);
        }
        
        this.updateDisplay();
        this.updateStats();
        this.closeModal();
        this.updateUndoButton();
        this.updateMultiplayerDisplay();
    }

    resetGame() {
        if (this.isAutoSolving) return;
        
        this.towers = [[], [], []];
        this.moves = 0;
        this.moveHistory = [];
        this.selectedDisk = null;
        this.selectedTower = null;
        this.playerStats[this.currentPlayer].moves = 0;
        
        // Initialize first tower with disks
        for (let i = this.diskCount; i >= 1; i--) {
            this.towers[0].push(i);
        }
        
        this.updateDisplay();
        this.updateStats();
        this.updateUndoButton();
    }

    handleTowerClick(towerIndex, event) {
        if (this.gameCompleted || this.isAutoSolving) return;

        // Start timer on first move
        if (!this.gameStarted) {
            this.startTimer();
            this.gameStarted = true;
        }

        const clickedDisk = event.target.closest('.disk');
        
        if (clickedDisk && this.towers[towerIndex].length > 0) {
            // Clicking on a disk - select it if it's the top disk
            const diskNumber = parseInt(clickedDisk.textContent);
            const topDisk = this.towers[towerIndex][this.towers[towerIndex].length - 1];
            
            if (diskNumber === topDisk) {
                this.selectDisk(towerIndex, diskNumber);
            }
        } else if (this.selectedDisk !== null) {
            // Clicking on empty space or tower base - try to move selected disk
            this.moveDisk(towerIndex);
        }
    }

    selectDisk(towerIndex, diskNumber) {
        // Deselect if clicking the same disk
        if (this.selectedTower === towerIndex && this.selectedDisk === diskNumber) {
            this.selectedDisk = null;
            this.selectedTower = null;
        } else {
            this.selectedDisk = diskNumber;
            this.selectedTower = towerIndex;
        }
        
        this.updateDisplay();
    }

    moveDisk(targetTower) {
        if (this.selectedDisk === null || this.selectedTower === null) return;

        // Check if move is valid
        if (this.isValidMove(this.selectedTower, targetTower)) {
            // Save move to history for undo
            this.moveHistory.push({
                from: this.selectedTower,
                to: targetTower,
                disk: this.selectedDisk,
                player: this.currentPlayer
            });
            
            // Move the disk
            const disk = this.towers[this.selectedTower].pop();
            this.towers[targetTower].push(disk);
            
            this.moves++;
            this.playerStats[this.currentPlayer].moves++;
            this.selectedDisk = null;
            this.selectedTower = null;
            
            this.updateDisplay();
            this.updateStats();
            this.updateUndoButton();
            
            // Switch player in multiplayer mode
            if (this.gameMode === 'multiplayer') {
                this.switchPlayer();
            }
            
            // Check for win condition
            if (this.checkWin()) {
                this.gameWin();
            }
        } else {
            // Invalid move - show animation
            this.showInvalidMove();
        }
    }

    isValidMove(fromTower, toTower) {
        if (fromTower === toTower) return false;
        if (this.towers[fromTower].length === 0) return false;
        
        const movingDisk = this.towers[fromTower][this.towers[fromTower].length - 1];
        
        if (this.towers[toTower].length === 0) return true;
        
        const topDiskOnTarget = this.towers[toTower][this.towers[toTower].length - 1];
        return movingDisk < topDiskOnTarget;
    }

    undoMove() {
        if (this.moveHistory.length === 0 || this.isAutoSolving || this.gameCompleted) return;
        
        const lastMove = this.moveHistory.pop();
        const disk = this.towers[lastMove.to].pop();
        this.towers[lastMove.from].push(disk);
        
        this.moves--;
        this.playerStats[lastMove.player].moves--;
        this.gameStats.undoCount++;
        
        // Switch back to previous player in multiplayer
        if (this.gameMode === 'multiplayer') {
            this.currentPlayer = lastMove.player;
        }
        
        this.updateDisplay();
        this.updateStats();
        this.updateUndoButton();
        this.updateMultiplayerDisplay();
        
        // Check undo achievement
        if (this.gameStats.undoCount >= 10) {
            this.unlockAchievement('undo_master');
        }
        
        this.saveGameStats();
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undo-btn');
        undoBtn.disabled = this.moveHistory.length === 0 || this.isAutoSolving || this.gameCompleted;
    }

    changeTheme(theme) {
        this.currentTheme = theme;
        document.body.className = theme === 'classic' ? '' : `${theme}-theme`;
        localStorage.setItem('towersTheme', theme);
        
        // Track theme usage for achievements
        if (!this.gameStats.themesUsed.includes(theme)) {
            this.gameStats.themesUsed.push(theme);
            this.saveGameStats();
        }
        
        if (this.gameStats.themesUsed.length >= 5) {
            this.unlockAchievement('theme_explorer');
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('towersTheme') || 'classic';
        document.getElementById('theme-select').value = savedTheme;
        this.changeTheme(savedTheme);
    }

    changeGameMode(mode) {
        this.gameMode = mode;
        const multiplayerPanel = document.getElementById('multiplayer-panel');
        
        if (mode === 'multiplayer') {
            multiplayerPanel.classList.add('show');
            this.updateMultiplayerDisplay();
        } else {
            multiplayerPanel.classList.remove('show');
        }
        
        this.newGame();
    }

    switchPlayer() {
        if (this.gameMode !== 'multiplayer') return;
        
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateMultiplayerDisplay();
        this.updateStats();
    }

    updateMultiplayerDisplay() {
        if (this.gameMode !== 'multiplayer') return;
        
        // Update player cards
        document.querySelectorAll('.player-card').forEach(card => {
            card.classList.remove('active');
        });
        document.getElementById(`player${this.currentPlayer}-card`).classList.add('active');
        
        // Update stats
        document.getElementById('p1-moves').textContent = this.playerStats[1].moves;
        document.getElementById('p1-score').textContent = this.playerStats[1].score;
        document.getElementById('p2-moves').textContent = this.playerStats[2].moves;
        document.getElementById('p2-score').textContent = this.playerStats[2].score;
        
        // Update current player indicator
        document.getElementById('current-player').textContent = `Player ${this.currentPlayer}`;
    }

    // Touch and Gesture Handling
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartTime = Date.now();
            
            // Check if touching a disk
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            const disk = element?.closest('.disk');
            if (disk) {
                const container = disk.closest('.disk-container');
                const towerIndex = parseInt(container.getAttribute('data-tower')) - 1;
                const diskNumber = parseInt(disk.textContent);
                const topDisk = this.towers[towerIndex][this.towers[towerIndex].length - 1];
                
                if (diskNumber === topDisk) {
                    this.selectedDiskForGesture = { disk: diskNumber, tower: towerIndex };
                    this.showGestureIndicator();
                }
            }
            
            // Add touch feedback
            this.addTouchFeedback(touch.clientX, touch.clientY);
        }
    }

    handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling
    }

    handleTouchEnd(e) {
        if (this.selectedDiskForGesture && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = touch.clientY - this.touchStartY;
            const deltaTime = Date.now() - this.touchStartTime;
            
            // Check for swipe gesture
            if (Math.abs(deltaX) > 50 && deltaTime < 1000) {
                const direction = deltaX > 0 ? 'right' : 'left';
                this.handleSwipeGesture(direction);
            }
        }
        
        this.selectedDiskForGesture = null;
        this.hideGestureIndicator();
    }

    handleSwipeGesture(direction) {
        if (!this.selectedDiskForGesture) return;
        
        const currentTower = this.selectedDiskForGesture.tower;
        let targetTower;
        
        if (direction === 'right') {
            targetTower = (currentTower + 1) % 3;
        } else {
            targetTower = (currentTower - 1 + 3) % 3;
        }
        
        // Select the disk and try to move it
        this.selectDisk(currentTower, this.selectedDiskForGesture.disk);
        
        setTimeout(() => {
            this.moveDisk(targetTower);
            this.unlockAchievement('gesture_guru');
        }, 100);
    }

    showGestureIndicator() {
        document.getElementById('gesture-indicator').classList.add('show');
    }

    hideGestureIndicator() {
        document.getElementById('gesture-indicator').classList.remove('show');
    }

    addTouchFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.className = 'touch-feedback';
        feedback.style.left = (x - 20) + 'px';
        feedback.style.top = (y - 20) + 'px';
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 600);
    }

    // Save/Load Functionality
    showSaveModal() {
        document.getElementById('save-load-title').textContent = 'Save Game';
        document.getElementById('save-name').style.display = 'block';
        document.getElementById('confirm-save').style.display = 'block';
        document.getElementById('confirm-save').textContent = 'Save';
        this.renderSaveSlots();
        document.getElementById('save-load-modal').classList.add('show');
    }

    showLoadModal() {
        document.getElementById('save-load-title').textContent = 'Load Game';
        document.getElementById('save-name').style.display = 'none';
        document.getElementById('confirm-save').style.display = 'block';
        document.getElementById('confirm-save').textContent = 'Load';
        this.renderSaveSlots();
        document.getElementById('save-load-modal').classList.add('show');
    }

    renderSaveSlots() {
        const slotsContainer = document.getElementById('save-slots');
        slotsContainer.innerHTML = '';
        
        this.savedGames.forEach((save, index) => {
            const slot = document.createElement('div');
            slot.className = 'save-slot';
            slot.dataset.index = index;
            
            slot.innerHTML = `
                <div class="save-info">
                    <div class="save-name">${save.name}</div>
                    <div class="save-details">
                        ${save.diskCount} disks • ${save.moves} moves • ${save.date}
                    </div>
                </div>
                <button class="btn" onclick="event.stopPropagation(); towersGame.deleteSave(${index})">Delete</button>
            `;
            
            slot.addEventListener('click', () => {
                document.querySelectorAll('.save-slot').forEach(s => s.classList.remove('selected'));
                slot.classList.add('selected');
            });
            
            slotsContainer.appendChild(slot);
        });
    }

    confirmSave() {
        const title = document.getElementById('save-load-title').textContent;
        
        if (title === 'Save Game') {
            this.saveGame();
        } else {
            this.loadGame();
        }
    }

    saveGame() {
        const saveName = document.getElementById('save-name').value.trim();
        if (!saveName) {
            alert('Please enter a save name');
            return;
        }
        
        const saveData = {
            name: saveName,
            date: new Date().toLocaleDateString(),
            towers: JSON.parse(JSON.stringify(this.towers)),
            diskCount: this.diskCount,
            moves: this.moves,
            moveHistory: JSON.parse(JSON.stringify(this.moveHistory)),
            currentPlayer: this.currentPlayer,
            playerStats: JSON.parse(JSON.stringify(this.playerStats)),
            gameMode: this.gameMode,
            startTime: this.startTime
        };
        
        this.savedGames.push(saveData);
        localStorage.setItem('towersOfHanoiSaves', JSON.stringify(this.savedGames));
        
        this.hideSaveLoadModal();
        this.unlockAchievement('save_master');
    }

    loadGame() {
        const selectedSlot = document.querySelector('.save-slot.selected');
        if (!selectedSlot) {
            alert('Please select a save slot');
            return;
        }
        
        const index = parseInt(selectedSlot.dataset.index);
        const saveData = this.savedGames[index];
        
        this.towers = saveData.towers;
        this.diskCount = saveData.diskCount;
        this.moves = saveData.moves;
        this.moveHistory = saveData.moveHistory;
        this.currentPlayer = saveData.currentPlayer;
        this.playerStats = saveData.playerStats;
        this.gameMode = saveData.gameMode;
        this.startTime = saveData.startTime;
        this.gameStarted = true;
        
        // Update UI
        document.getElementById('disk-count').value = this.diskCount;
        document.getElementById('game-mode').value = this.gameMode;
        this.changeGameMode(this.gameMode);
        
        this.updateDisplay();
        this.updateStats();
        this.updateUndoButton();
        this.updateMultiplayerDisplay();
        
        if (this.startTime) {
            this.startTimer();
        }
        
        this.hideSaveLoadModal();
        this.unlockAchievement('save_master');
    }

    deleteSave(index) {
        if (confirm('Are you sure you want to delete this save?')) {
            this.savedGames.splice(index, 1);
            localStorage.setItem('towersOfHanoiSaves', JSON.stringify(this.savedGames));
            this.renderSaveSlots();
        }
    }

    hideSaveLoadModal() {
        document.getElementById('save-load-modal').classList.remove('show');
        document.getElementById('save-name').value = '';
    }

    // Achievement System
    unlockAchievement(achievementId) {
        if (this.achievements.has(achievementId)) return;
        
        this.achievements.add(achievementId);
        localStorage.setItem('towersAchievements', JSON.stringify([...this.achievements]));
        
        const achievement = this.achievementsList.find(a => a.id === achievementId);
        if (achievement) {
            this.showAchievementNotification(achievement);
            this.renderAchievements();
        }
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <span class="achievement-icon">${achievement.icon}</span>
            <div>
                <strong>Achievement Unlocked!</strong><br>
                ${achievement.title}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showAchievements() {
        this.renderAchievements();
        document.getElementById('achievements-panel').classList.add('show');
    }

    hideAchievements() {
        document.getElementById('achievements-panel').classList.remove('show');
    }

    renderAchievements() {
        const grid = document.getElementById('achievements-grid');
        grid.innerHTML = '';
        
        this.achievementsList.forEach(achievement => {
            const card = document.createElement('div');
            card.className = `achievement-card ${this.achievements.has(achievement.id) ? 'unlocked' : ''}`;
            
            card.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-desc">${achievement.desc}</div>
            `;
            
            grid.appendChild(card);
        });
    }

    handleKeyPress(e) {
        switch(e.key.toLowerCase()) {
            case 'r':
                this.resetGame();
                break;
            case 'n':
                this.newGame();
                break;
            case 's':
                this.autoSolve();
                break;
            case 'u':
                this.undoMove();
                break;
            case 'escape':
                this.closeModal();
                this.hideAchievements();
                this.hideSaveLoadModal();
                break;
        }
    }

    showInvalidMove() {
        const selectedDiskElement = document.querySelector('.disk.selected');
        if (selectedDiskElement) {
            selectedDiskElement.classList.add('invalid-move');
            setTimeout(() => {
                selectedDiskElement.classList.remove('invalid-move');
            }, 500);
        }
    }

    updateDisplay() {
        // Clear all towers
        document.querySelectorAll('.disk-container').forEach(container => {
            container.innerHTML = '';
        });

        // Render disks on each tower
        this.towers.forEach((tower, towerIndex) => {
            const container = document.querySelector(`[data-tower="${towerIndex + 1}"]`);
            
            tower.forEach(diskSize => {
                const diskElement = document.createElement('div');
                diskElement.className = `disk disk-${diskSize}`;
                diskElement.textContent = diskSize;
                
                // Highlight selected disk
                if (this.selectedTower === towerIndex && this.selectedDisk === diskSize) {
                    diskElement.classList.add('selected');
                }
                
                container.appendChild(diskElement);
            });
        });

        // Update tower highlights
        document.querySelectorAll('.tower').forEach((tower, index) => {
            tower.classList.remove('highlight');
            if (this.selectedDisk !== null && this.isValidMove(this.selectedTower, index)) {
                tower.classList.add('highlight');
            }
        });
    }

    updateStats() {
        document.getElementById('move-count').textContent = this.moves;
        document.getElementById('min-moves').textContent = Math.pow(2, this.diskCount) - 1;
        
        // Calculate score (higher is better - based on efficiency and speed)
        const minMoves = Math.pow(2, this.diskCount) - 1;
        const efficiency = this.moves > 0 ? Math.max(0, (minMoves / this.moves) * 100) : 100;
        const timeBonus = this.gameStarted ? Math.max(0, 1000 - ((Date.now() - this.startTime) / 1000)) : 0;
        const score = Math.round(efficiency * 10 + timeBonus);
        
        this.playerStats[this.currentPlayer].score = score;
        document.getElementById('score').textContent = score;
        
        if (this.gameMode === 'multiplayer') {
            this.updateMultiplayerDisplay();
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    checkWin() {
        return this.towers[2].length === this.diskCount;
    }

    gameWin() {
        this.gameCompleted = true;
        clearInterval(this.timerInterval);
        
        const finalTime = document.getElementById('timer').textContent;
        const minMoves = Math.pow(2, this.diskCount) - 1;
        const efficiency = Math.round((minMoves / this.moves) * 100);
        const winner = this.gameMode === 'multiplayer' ? 
            (this.playerStats[1].score > this.playerStats[2].score ? 'Player 1' : 'Player 2') : 
            `Player ${this.currentPlayer}`;
        
        // Update game stats
        this.gameStats.gamesPlayed++;
        this.saveGameStats();
        
        // Check achievements
        if (this.gameStats.gamesPlayed === 1) {
            this.unlockAchievement('first_win');
        }
        if (this.gameStats.gamesPlayed >= 5) {
            this.unlockAchievement('persistent');
        }
        if (this.diskCount === 8) {
            this.unlockAchievement('tower_master');
        }
        if (this.moves === minMoves) {
            this.unlockAchievement('efficiency_master');
        }
        if (this.diskCount === 3 && this.startTime && (Date.now() - this.startTime) < 30000) {
            this.unlockAchievement('speed_demon');
        }
        if (this.gameMode === 'multiplayer') {
            this.unlockAchievement('multiplayer_champ');
        }
        
        // Update modal
        document.getElementById('winner-name').textContent = winner;
        document.getElementById('final-moves').textContent = this.moves;
        document.getElementById('final-time').textContent = finalTime;
        document.getElementById('efficiency').textContent = `${efficiency}%`;
        document.getElementById('final-score').textContent = this.playerStats[this.currentPlayer].score;
        
        if (this.gameMode === 'multiplayer') {
            document.getElementById('win-message').textContent = `${winner} wins!`;
        }
        
        setTimeout(() => {
            document.getElementById('win-modal').classList.add('show');
        }, 500);
    }

    closeModal() {
        document.getElementById('win-modal').classList.remove('show');
    }

    saveGameStats() {
        localStorage.setItem('towersGameStats', JSON.stringify(this.gameStats));
    }

    // Auto-solve functionality
    autoSolve() {
        if (this.isAutoSolving || this.gameCompleted) return;
        
        this.isAutoSolving = true;
        document.getElementById('solve-btn').textContent = 'Solving...';
        document.getElementById('solve-btn').disabled = true;
        
        // Start timer if not started
        if (!this.gameStarted) {
            this.startTimer();
            this.gameStarted = true;
        }
        
        const moves = this.generateSolution(this.diskCount, 0, 2, 1);
        this.executeSolution(moves, 0);
    }

    generateSolution(n, from, to, aux) {
        if (n === 1) {
            return [{ from, to }];
        }
        
        const moves = [];
        moves.push(...this.generateSolution(n - 1, from, aux, to));
        moves.push({ from, to });
        moves.push(...this.generateSolution(n - 1, aux, to, from));
        
        return moves;
    }

    executeSolution(moves, index) {
        if (index >= moves.length) {
            this.isAutoSolving = false;
            document.getElementById('solve-btn').textContent = 'Auto Solve';
            document.getElementById('solve-btn').disabled = false;
            return;
        }

        const move = moves[index];
        
        // Save move to history for undo
        this.moveHistory.push({
            from: move.from,
            to: move.to,
            disk: this.towers[move.from][this.towers[move.from].length - 1],
            player: this.currentPlayer
        });
        
        const disk = this.towers[move.from].pop();
        this.towers[move.to].push(disk);
        
        this.moves++;
        this.playerStats[this.currentPlayer].moves++;
        this.updateDisplay();
        this.updateStats();
        this.updateUndoButton();
        
        if (this.checkWin()) {
            this.gameWin();
            this.isAutoSolving = false;
            document.getElementById('solve-btn').textContent = 'Auto Solve';
            document.getElementById('solve-btn').disabled = false;
            return;
        }
        
        setTimeout(() => {
            this.executeSolution(moves, index + 1);
        }, this.autoSolveSpeed);
    }
}

// Global variable to access the game instance
let towersGame;

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    towersGame = new TowersOfHanoi();
});

// Enhanced touch handling for better mobile experience
document.addEventListener('touchstart', (e) => {
    // Prevent default touch behavior on game elements
    if (e.target.closest('.game-board') || e.target.closest('.disk')) {
        e.preventDefault();
    }
});

// Prevent context menu on long press
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.game-board')) {
        e.preventDefault();
    }
});

// Add visibility change handler to pause timer when tab is not active
document.addEventListener('visibilitychange', () => {
    if (towersGame && towersGame.timerInterval) {
        if (document.hidden) {
            clearInterval(towersGame.timerInterval);
        } else if (towersGame.gameStarted && !towersGame.gameCompleted) {
            towersGame.startTimer();
        }
    }
});

// Add window resize handler for responsive adjustments
window.addEventListener('resize', () => {
    // Adjust game board layout on resize
    const gameBoard = document.querySelector('.game-board');
    if (window.innerWidth < 768) {
        gameBoard.classList.add('mobile-layout');
    } else {
        gameBoard.classList.remove('mobile-layout');
    }
});

// Service Worker registration for offline capability (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Add performance monitoring
const perfObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
            console.log(`${entry.name}: ${entry.startTime}ms`);
        }
    }
});

if (PerformanceObserver.supportedEntryTypes.includes('paint')) {
    perfObserver.observe({ entryTypes: ['paint'] });
}

// Add analytics tracking (placeholder - replace with your analytics service)
function trackEvent(category, action, label = '', value = 0) {
    // Example: Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value
        });
    }
    
    console.log(`Analytics: ${category} - ${action} - ${label} - ${value}`);
}

// Track game events
document.addEventListener('gameEvent', (e) => {
    const { category, action, label, value } = e.detail;
    trackEvent(category, action, label, value);
});

// Add error handling
window.addEventListener('error', (e) => {
    console.error('Game error:', e.error);
    trackEvent('error', 'javascript_error', e.error.message);
});

// Add unhandled promise rejection handling
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    trackEvent('error', 'promise_rejection', e.reason);
});

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    if (!towersGame) return;
    
    // Arrow key navigation for disk selection
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        
        if (towersGame.selectedTower !== null) {
            let newTower = towersGame.selectedTower;
            
            switch(e.key) {
                case 'ArrowLeft':
                    newTower = Math.max(0, towersGame.selectedTower - 1);
                    break;
                case 'ArrowRight':
                    newTower = Math.min(2, towersGame.selectedTower + 1);
                    break;
            }
            
            if (newTower !== towersGame.selectedTower && towersGame.towers[newTower].length > 0) {
                const topDisk = towersGame.towers[newTower][towersGame.towers[newTower].length - 1];
                towersGame.selectDisk(newTower, topDisk);
            }
        }
    }
    
    // Enter to move selected disk to next valid tower
    if (e.key === 'Enter' && towersGame.selectedTower !== null) {
        for (let i = 0; i < 3; i++) {
            if (i !== towersGame.selectedTower && towersGame.isValidMove(towersGame.selectedTower, i)) {
                towersGame.moveDisk(i);
                break;
            }
        }
    }
    
    // Space to select/deselect top disk of first tower with disks
    if (e.key === ' ') {
        e.preventDefault();
        
        if (towersGame.selectedTower === null) {
            // Find first tower with disks
            for (let i = 0; i < 3; i++) {
                if (towersGame.towers[i].length > 0) {
                    const topDisk = towersGame.towers[i][towersGame.towers[i].length - 1];
                    towersGame.selectDisk(i, topDisk);
                    break;
                }
            }
        } else {
            // Deselect current disk
            towersGame.selectedDisk = null;
            towersGame.selectedTower = null;
            towersGame.updateDisplay();
        }
    }
});

// Add screen orientation change handling
screen.orientation?.addEventListener('change', () => {
    setTimeout(() => {
        towersGame?.updateDisplay();
    }, 100);
});

// Add focus management for accessibility
document.addEventListener('focusin', (e) => {
    if (e.target.classList.contains('disk')) {
        e.target.setAttribute('tabindex', '0');
    }
});

document.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('disk')) {
        e.target.setAttribute('tabindex', '-1');
    }
});

// Add ARIA live region updates for screen readers
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Add game state announcements
const originalMoveDisk = towersGame?.moveDisk;
if (towersGame) {
    towersGame.moveDisk = function(targetTower) {
        const result = originalMoveDisk.call(this, targetTower);
        
        if (this.selectedDisk && this.selectedTower !== null) {
            announceToScreenReader(
                `Moved disk ${this.selectedDisk} from tower ${String.fromCharCode(65 + this.selectedTower)} to tower ${String.fromCharCode(65 + targetTower)}`
            );
        }
        
        return result;
    };
}