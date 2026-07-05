// 角色設定已移至 assets/data/characters.js
// 在選取 .char-card 元素前先動態生成角色卡片
renderCharacterPool('character-pool-container');

let team1 = []; 
let team2 = [];
let selectedClassForPlacement = null;
let historyRecords = JSON.parse(localStorage.getItem('jrpg_history')) || [];

let bgmMuted = false;
let sfxMuted = false;
let bgmVolume = 0.25;
let sfxVolume = 0.25;

const audio = {
    bgm: document.getElementById('bgm-audio'),
    hit: document.getElementById('hit-audio'),
    crit: document.getElementById('crit-audio'),
    die: document.getElementById('die-audio'),
    magic: document.getElementById('magic-audio'),
    playSFX: (sound) => {
        if (!sound || sfxMuted) return;
        const clone = sound.cloneNode();
        clone.volume = sfxVolume;
        clone.play().catch(() => {});
    },
    playBGM: () => {
        if (bgmMuted || !audio.bgm) return;
        audio.bgm.volume = bgmVolume;
        audio.bgm.play().catch(() => {});
    },
    stopBGM: () => {
        if (audio.bgm) {
            audio.bgm.pause();
            audio.bgm.currentTime = 0;
        }
    }
};

// UI 元素
const gridTeam1 = document.getElementById('grid-team1');
const gridTeam2 = document.getElementById('grid-team2');
const logContent = document.getElementById('log-content');
const btnStart = document.getElementById('btn-start');
const btnRandom = document.getElementById('btn-random');
const btnReset = document.getElementById('btn-reset');
const btnExport = document.getElementById('btn-export');
const inputNumChars = document.getElementById('num-chars');
const charCards = document.querySelectorAll('.char-card');
const selectionStatus = document.getElementById('selection-status');
const speedSelect = document.getElementById('speed-select');

let battleSpeed = 1.0;
speedSelect.addEventListener('change', (e) => {
    battleSpeed = parseFloat(e.target.value);
    document.documentElement.style.setProperty('--battle-speed', battleSpeed);
});
speedSelect.dispatchEvent(new Event('change'));

// 拖放狀態變數
let draggedCharId = null; 
let draggedCharClass = null;

// 音訊設定面板邏輯
const volBgmSlider = document.getElementById('vol-bgm');
const volSfxSlider = document.getElementById('vol-sfx');
const toggleBgmBtn = document.getElementById('toggle-bgm');
const toggleSfxBtn = document.getElementById('toggle-sfx');

volBgmSlider.addEventListener('input', e => {
    bgmVolume = parseFloat(e.target.value);
    if(audio.bgm) audio.bgm.volume = bgmVolume;
});

volSfxSlider.addEventListener('input', e => {
    sfxVolume = parseFloat(e.target.value);
});

toggleBgmBtn.addEventListener('click', () => {
    bgmMuted = !bgmMuted;
    toggleBgmBtn.classList.toggle('muted', bgmMuted);
    if(bgmMuted) audio.bgm.pause();
    else audio.playBGM();
});

toggleSfxBtn.addEventListener('click', () => {
    sfxMuted = !sfxMuted;
    toggleSfxBtn.classList.toggle('muted', sfxMuted);
});

// 嘗試在第一次點擊頁面時啟動背景音樂 (繞過瀏覽器自動播放限制)
let bgmStarted = false;
document.body.addEventListener('click', () => {
    if(!bgmStarted && !bgmMuted) {
        audio.playBGM();
        bgmStarted = true;
    }
}, { once: true });

function initGrids() {
    gridTeam1.innerHTML = '';
    gridTeam2.innerHTML = '';
    
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            createCell(gridTeam1, 1, x, y);
            createCell(gridTeam2, 2, x, y);
        }
    }
}

function createCell(parent, teamId, x, y) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.team = teamId;
    cell.dataset.x = x;
    cell.dataset.y = y;
    
    // 點擊放置 (舊有操作)
    cell.addEventListener('click', () => {
        if (selectedClassForPlacement && !cell.hasChildNodes()) {
            placeNewCharacter(teamId, x, y, selectedClassForPlacement, cell);
        }
    });

    // 拖放事件支援
    cell.addEventListener('dragover', e => {
        e.preventDefault(); // 允許 drop
        if (!cell.hasChildNodes() || draggedCharId) {
            cell.classList.add('drag-over');
        }
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', e => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        
        // 從下方卡片拉過來的新角色
        if (draggedCharClass && !cell.hasChildNodes()) {
            placeNewCharacter(teamId, x, y, draggedCharClass, cell);
        } 
        // 在盤面上移動既有角色
        else if (draggedCharId) {
            moveCharacter(draggedCharId, teamId, x, y, cell);
        }
    });

    parent.appendChild(cell);
}

// 設定卡片的拖曳事件
window.bindCharCards = function() {
    const charCards = document.querySelectorAll('.char-card');
    charCards.forEach(card => {
        card.addEventListener('dragstart', e => {
            draggedCharClass = card.dataset.class;
            draggedCharId = null;
        });
        card.addEventListener('dragend', () => draggedCharClass = null);
        
        // 點擊選擇 (舊有操作)
        card.addEventListener('click', () => {
            charCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedClassForPlacement = card.dataset.class;
            selectionStatus.innerText = t("selection_status") + t(CHARACTER_TEMPLATES[selectedClassForPlacement].nameKey) + t("select_instruction");
        });
    });
};
window.bindCharCards();

// 將角色拖放出盤面外即可刪除
document.body.addEventListener('dragover', e => {
    e.preventDefault(); // 必須 preventDefault 才能接收 drop
});

document.body.addEventListener('drop', e => {
    // 如果是丟在九宮格內，交給 cell 的 drop 處理
    if (e.target.closest('.cell')) return;

    // 如果丟在九宮格外部，且是盤面上既有的角色，就刪除它
    if (draggedCharId) {
        let charIndex = team1.findIndex(c => c.id === draggedCharId);
        if (charIndex !== -1) {
            team1[charIndex].dom.remove();
            team1.splice(charIndex, 1);
        } else {
            charIndex = team2.findIndex(c => c.id === draggedCharId);
            if (charIndex !== -1) {
                team2[charIndex].dom.remove();
                team2.splice(charIndex, 1);
            }
        }
        checkReady();
    }
});

function placeNewCharacter(teamId, x, y, cls, cellElem) {
    const maxChars = parseInt(inputNumChars.value);
    const targetTeam = teamId === 1 ? team1 : team2;
    
    // 測試用：取消滿員限制，允許繼續增員
    // if (targetTeam.length >= maxChars) {
    //     logMessage(t("log_limit_reached", teamId, maxChars));
    //     return;
    // }

    addCharacterToBoard(teamId, x, y, CHARACTER_TEMPLATES[cls], cellElem);
    checkReady();
}

function moveCharacter(charId, targetTeamId, newX, newY, targetCell) {
    // 尋找角色原本在哪個隊伍
    let charObj = team1.find(c => c.id === charId);
    let originalTeam = 1;
    if (!charObj) {
        charObj = team2.find(c => c.id === charId);
        originalTeam = 2;
    }
    
    if (!charObj) return;

    // 不能跨陣營移動
    if (originalTeam !== targetTeamId) return;

    const oldCell = charObj.dom.parentElement;

    // 如果目標格子已有其他人，執行交換
    if (targetCell.hasChildNodes()) {
        const targetCharDom = targetCell.firstChild;
        const targetCharId = targetCharDom.id;
        
        // 如果是同一個角色 (在原地放開)，不作處理
        if (targetCharId === charId) return;

        let targetCharObj = (originalTeam === 1 ? team1 : team2).find(c => c.id === targetCharId);
        
        if (targetCharObj) {
            // 交換座標資料
            const oldX = charObj.x;
            const oldY = charObj.y;
            charObj.x = parseInt(newX);
            charObj.y = parseInt(newY);
            targetCharObj.x = oldX;
            targetCharObj.y = oldY;
            
            // 交換 DOM
            oldCell.appendChild(targetCharDom);
            targetCell.appendChild(charObj.dom);
        }
        return;
    }

    // 更新資料與 DOM (目標為空格)
    charObj.x = parseInt(newX);
    charObj.y = parseInt(newY);
    targetCell.appendChild(charObj.dom);
}

function addCharacterToBoard(teamId, x, y, tpl, cellElem) {
    const charObj = {
        team: teamId,
        x: parseInt(x),
        y: parseInt(y),
        nameKey: tpl.nameKey,
        icon: tpl.icon,
        hp: tpl.hp,
        maxHp: tpl.hp,
        atk: tpl.atk,
        element: tpl.element,
        prefKey: tpl.prefKey,
        cd: tpl.cd,
        id: `char-${teamId}-${Date.now()}-${Math.floor(Math.random()*1000)}`
    };
    
    const targetTeam = teamId === 1 ? team1 : team2;
    targetTeam.push(charObj);

    // 渲染角色 DOM
    const charDom = document.createElement('div');
    charDom.className = 'character';
    charDom.id = charObj.id;
    charDom.innerText = tpl.icon;
    charDom.draggable = true; // 允許盤面上拖曳

    // 盤面上角色的拖曳事件
    charDom.addEventListener('dragstart', e => {
        draggedCharId = charObj.id;
        draggedCharClass = null;
        charDom.classList.add('dragging');
        // 為了讓拖曳圖像保留，但滑鼠下方不要卡到 DOM (避免擋住 drop 判定)
        setTimeout(() => charDom.style.display = 'none', 0);
    });
    charDom.addEventListener('dragend', () => {
        draggedCharId = null;
        charDom.classList.remove('dragging');
        charDom.style.display = 'block';
    });

    const hpContainer = document.createElement('div');
    hpContainer.className = 'hp-bar-container';
    const hpBar = document.createElement('div');
    hpBar.className = 'hp-bar';
    hpContainer.appendChild(hpBar);
    charDom.appendChild(hpContainer);

    charObj.dom = charDom;
    charObj.hpBar = hpBar;

    cellElem.appendChild(charDom);
}

btnRandom.addEventListener('click', () => {
    resetBoard();
    const maxChars = parseInt(inputNumChars.value);
    const classes = Object.keys(CHARACTER_TEMPLATES);
    
    const generateForTeam = (teamId, targetArray, gridElem) => {
        const positions = [];
        for(let x=0; x<3; x++) for(let y=0; y<3; y++) positions.push({x, y});
        positions.sort(() => Math.random() - 0.5);
        
        for(let i=0; i<maxChars; i++) {
            const cls = classes[Math.floor(Math.random() * classes.length)];
            const pos = positions[i];
            const cell = gridElem.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
            addCharacterToBoard(teamId, pos.x, pos.y, CHARACTER_TEMPLATES[cls], cell);
        }
    };

    generateForTeam(1, team1, gridTeam1);
    generateForTeam(2, team2, gridTeam2);
    checkReady();
    logI18n('{content}', "log_random_done");
});

function checkReady() {
    // 只要雙方都有至少一名角色，就可以開始戰鬥（不需人數相等）
    if (team1.length > 0 && team2.length > 0) {
        btnStart.disabled = false;
    } else {
        btnStart.disabled = true;
    }
}

function resetBoard() {
    team1 = [];
    team2 = [];
    initGrids();
    btnStart.disabled = true;
    document.getElementById('selection-panel').classList.remove('hidden');
    logContent.innerHTML = '';
}

btnReset.addEventListener('click', () => {
    resetBoard();
    btnReset.classList.add('hidden');
    btnRandom.disabled = false;
    inputNumChars.disabled = false;
    // 不再停止 BGM，讓它保持循環播放
});

function logMessage(htmlStr) {
    const p = document.createElement('div');
    p.className = 'log-entry';
    p.innerHTML = htmlStr;
    logContent.appendChild(p);
    logContent.scrollTop = logContent.scrollHeight;
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function logI18n(htmlTemplate, key, args = []) {
    const argsStr = escapeHtml(JSON.stringify(args));
    const translated = t(key, ...args);
    const spanHtml = `<span data-i18n-log="${key}" data-i18n-args="${argsStr}">${translated}</span>`;
    const finalHtml = htmlTemplate ? htmlTemplate.replace('{content}', spanHtml) : spanHtml;
    logMessage(finalHtml);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    btnRandom.disabled = true;
    inputNumChars.disabled = true;
    logContent.innerHTML = '';
    
    // 戰鬥開始時隱藏下方自選面板
    document.getElementById('selection-panel').classList.add('hidden');
    
    audio.playBGM();
    logI18n('{content}', "log_battle_start");
    
    // 將所有角色設為不可拖曳
    document.querySelectorAll('.character').forEach(el => el.draggable = false);

    // 紀錄簡化的初始陣容
    const record = {
        timestamp: new Date().toISOString(),
        team1Formation: team1.map(c => ({ nameKey: c.nameKey, x: c.x, y: c.y })),
        team2Formation: team2.map(c => ({ nameKey: c.nameKey, x: c.x, y: c.y }))
    };

    const calcDamage = (atk, def) => {
        let mult = 1.0;
        if ((atk.element === "石頭" && def.element === "剪刀") ||
            (atk.element === "剪刀" && def.element === "布") ||
            (atk.element === "布" && def.element === "石頭")) {
            mult = 1.5;
        }
        return { dmg: Math.floor(atk.atk * mult), crit: mult > 1.0 };
    };

    const isAlive = c => c.hp > 0;

    const getTarget = (attacker, enemies) => {
        const aliveEnemies = enemies.filter(isAlive);
        if(aliveEnemies.length === 0) return [];

        // Group enemies by x
        const xGroups = {};
        for (const e of aliveEnemies) {
            if (!xGroups[e.x]) xGroups[e.x] = [];
            xGroups[e.x].push(e);
        }
        
        const xKeys = Object.keys(xGroups).map(Number);
        
        if (attacker.prefKey === "pref_crowd") {
            const counts = xKeys.map(x => xGroups[x].length);
            const maxCount = Math.max(...counts);
            const maxRows = xKeys.filter(x => xGroups[x].length === maxCount);
            const targetX = maxRows[Math.floor(Math.random() * maxRows.length)];
            return xGroups[targetX];
        } else {
            let targetRowEnemies = [];
            if (attacker.prefKey === "pref_front") {
                const minX = Math.min(...xKeys);
                targetRowEnemies = xGroups[minX];
            } else {
                const maxX = Math.max(...xKeys);
                targetRowEnemies = xGroups[maxX];
            }
            const randomIndex = Math.floor(Math.random() * targetRowEnemies.length);
            return [targetRowEnemies[randomIndex]];
        }
    };

    // 初始化所有角色的 nextAttackTime
    for (const c of [...team1, ...team2]) {
        c.maxHp = c.maxHp || c.hp;
        if (c.nameKey === "class_assassin") {
            c.nextAttackTime = 0.0; // 刺客先手
        } else {
            c.nextAttackTime = c.cd || 1.0;
        }
    }

    let simTime = 0.0;
    let nextTiedTeamPriority = 1; // 輪流先手優先權，開局 Team 1 優先

    while(team1.some(isAlive) && team2.some(isAlive)) {
        // 尋找下一個要發動攻擊的存活角色
        const living = [...team1, ...team2].filter(isAlive);
        if(living.length === 0) break;

        // 依據 nextAttackTime 排序；若時間相同，則根據雙方輪流先手優先權決定，再以 ID 排序
        living.sort((a, b) => {
            if (Math.abs(a.nextAttackTime - b.nextAttackTime) > 0.0001) {
                return a.nextAttackTime - b.nextAttackTime;
            }
            if (a.team !== b.team) {
                return a.team === nextTiedTeamPriority ? -1 : 1;
            }
            return a.id.localeCompare(b.id);
        });

        const attacker = living[0];
        simTime = attacker.nextAttackTime;

        // 檢查在相同的時間點是否有其他角色也準備攻擊（即發生同時攻擊的情況）
        const hasTie = living.slice(1).some(other => 
            Math.abs(other.nextAttackTime - attacker.nextAttackTime) <= 0.0001
        );
        if (hasTie) {
            // 只要同時間點還有角色未攻擊，就將下一順位的優先權交給對手陣營
            // 如此一來，在人數不對等的同時攻擊結束後，下一輪的先手權自然會輪替給另一方
            nextTiedTeamPriority = attacker.team === 1 ? 2 : 1;
        }

        const defenders = attacker.team === 1 ? team2 : team1;
        if (!defenders.some(isAlive)) break;

        const targets = getTarget(attacker, defenders);
        if (targets && targets.length > 0) {
            const isMagic = attacker.nameKey === "class_mage";

            attacker.dom.classList.add(attacker.team === 1 ? 'anim-attack-t1' : 'anim-attack-t2');
            
            let playCritSound = false;
            let playHitSound = false;
            let anyoneDied = false;
            const dmgTexts = [];

            for (const target of targets) {
                if (!isAlive(target)) continue;

                const { dmg, crit } = calcDamage(attacker, target);
                target.hp = Math.max(0, target.hp - dmg);

                const hpPercent = (target.hp / target.maxHp) * 100;
                target.hpBar.style.width = `${hpPercent}%`;
                if(hpPercent < 30) target.hpBar.classList.add('low');

                if (isMagic) {
                    target.dom.classList.add('anim-magic-hit');
                } else {
                    target.dom.classList.add('anim-hit');
                }
                
                if (crit) playCritSound = true; 
                else playHitSound = true;

                const dmgText = document.createElement('div');
                dmgText.className = `damage-text ${crit ? 'crit' : ''}`;
                dmgText.innerText = `-${dmg}`;
                target.dom.parentElement.appendChild(dmgText);
                dmgTexts.push({text: dmgText, target: target});

                const critArg = crit ? "log_crit" : "log_no_crit";
                logI18n('{content}', "log_attack", [simTime.toFixed(1), attacker.team, attacker.icon, attacker.nameKey, target.team, target.icon, target.nameKey, critArg, dmg]);

                if(!isAlive(target)) {
                    target.dom.classList.add('anim-die');
                    logI18n('<span class="log-death">{content}</span>', "log_death", [simTime.toFixed(1), target.icon, target.nameKey]);
                    anyoneDied = true;
                }
            }

            if (isMagic) audio.playSFX(audio.magic);
            else if (playCritSound) audio.playSFX(audio.crit);
            else if (playHitSound) audio.playSFX(audio.hit);

            if (anyoneDied) audio.playSFX(audio.die);

            await sleep((isMagic ? 500 : 200) / battleSpeed); 

            attacker.dom.classList.remove('anim-attack-t1', 'anim-attack-t2');
            for (const dt of dmgTexts) {
                dt.target.dom.classList.remove('anim-hit', 'anim-magic-hit');
                dt.text.remove();
            }

            if (anyoneDied) {
                await sleep(300 / battleSpeed); 
            }
        }

        // 更新該攻擊者的下一次攻擊時間
        attacker.nextAttackTime = simTime + (attacker.cd || 1.0);
    }

    let winnerArg = "log_draw";
    let winnerArgs = [];
    if (team1.some(isAlive)) { winnerArg = "log_win"; winnerArgs = ["1"]; }
    else if (team2.some(isAlive)) { winnerArg = "log_win"; winnerArgs = ["2"]; }

    logI18n('<br>{content}', winnerArg, winnerArgs);
    record.result = t(winnerArg, ...winnerArgs);
    
    // 寫入簡化版的紀錄並存入 LocalStorage
    historyRecords.push(record);
    localStorage.setItem('jrpg_history', JSON.stringify(historyRecords));

    btnReset.classList.remove('hidden');
    // 移除 audio.stopBGM() 讓背景音樂保持播放
});

// 匯出簡易紀錄
btnExport.addEventListener('click', () => {
    if (historyRecords.length === 0) {
        alert(t("alert_no_record"));
        return;
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyRecords, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "battle_history_simple.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    // 匯出後可選擇清空
    if(confirm(t("confirm_clear_record"))) {
        historyRecords = [];
        localStorage.removeItem('jrpg_history');
    }
});

initGrids();
