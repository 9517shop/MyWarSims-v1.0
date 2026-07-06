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
        def: tpl.def,
        prefKey: tpl.prefKey,
        cd: tpl.cd,
        tag: tpl.tag,
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
        setTimeout(() => {
            charDom.style.opacity = '0';
            charDom.style.pointerEvents = 'none';
        }, 0);
    });
    charDom.addEventListener('dragend', () => {
        draggedCharId = null;
        charDom.classList.remove('dragging');
        charDom.style.opacity = '1';
        charDom.style.pointerEvents = 'auto';
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
        let dmg = Math.floor(atk.atk) - (def.def || 0);
        if (dmg < 1) dmg = 1;
        return { dmg: dmg, crit: false }; // 拔除爆擊或相剋加成，純看數值
    };

    const isAlive = c => c.hp > 0;

    const getTarget = (attacker, enemies, allies, useProjected = false) => {
        const checkAlive = c => useProjected ? c.projectedHp > 0 : c.hp > 0;
        const targetPool = attacker.tag === "HEALER" ? allies : enemies;
        const aliveTargets = targetPool.filter(checkAlive);
        if(aliveTargets.length === 0) return [];

        if (attacker.tag === "HEALER") {
            let minHpRatio = Infinity;
            let target = null;
            for (const t of aliveTargets) {
                const hp = useProjected ? t.projectedHp : t.hp;
                const ratio = hp / t.maxHp;
                if (ratio < minHpRatio) {
                    minHpRatio = ratio;
                    target = t;
                }
            }
            return target ? [target] : [];
        }

        // Group enemies by x
        const xGroups = {};
        for (const e of aliveTargets) {
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

    while(team1.some(isAlive) && team2.some(isAlive)) {
        const living = [...team1, ...team2].filter(isAlive);
        if(living.length === 0) break;

        living.sort((a, b) => a.nextAttackTime - b.nextAttackTime);
        simTime = living[0].nextAttackTime;

        // 收集所有在同一時間點發動攻擊的角色（同步判定）
        const currentAttackers = living.filter(c => Math.abs(c.nextAttackTime - simTime) <= 0.0001);

        const actions = [];

        // 初始化 Projected HP
        for (const t of [...team1, ...team2]) {
            t.projectedHp = t.hp;
        }

        // 階段一：所有攻擊者同時鎖定目標與計算預計數值
        for (const attacker of currentAttackers) {
            const defenders = attacker.team === 1 ? team2 : team1;
            const allies = attacker.team === 1 ? team1 : team2;
            
            if (!defenders.some(isAlive)) continue;

            // Warlock skill counting
            if (attacker.nameKey === "class_warlock") {
                attacker.attackCount = (attacker.attackCount || 0) + 1;
            }
            const isSkill = attacker.skillCast && (attacker.attackCount % attacker.skillCast === 0);
            const hits = isSkill ? 1 : (attacker.multiHit || 1);

            for (let i = 0; i < hits; i++) {
                const targets = getTarget(attacker, defenders, allies, true);
                if (targets && targets.length > 0) {
                    const isMagic = attacker.nameKey === "class_mage" || isSkill;
                    const isHeal = attacker.tag === "HEALER";

                    let finalTargets = targets;
                    if (isSkill) {
                        const mainTarget = targets[0];
                        // 2x2 area
                        finalTargets = defenders.filter(d => 
                            d.projectedHp > 0 && 
                            d.x >= mainTarget.x && d.x <= mainTarget.x + 1 &&
                            d.y >= mainTarget.y && d.y <= mainTarget.y + 1
                        );
                        if (finalTargets.length === 0) finalTargets = [mainTarget];
                    }

                    for (const target of finalTargets) {
                        if (isHeal) {
                            const amount = attacker.atk;
                            target.projectedHp = Math.min(target.maxHp, target.projectedHp + amount);
                            actions.push({ type: 'heal', attacker, target, amount, isMagic });
                        } else {
                            let { dmg, crit } = calcDamage(attacker, target);
                            if (isSkill) dmg *= 2; // Skill DMG x2
                            
                            target.projectedHp -= dmg;
                            actions.push({ type: 'damage', attacker, target, amount: dmg, crit, isMagic, isSkill });
                        }
                    }
                }
            }
        }

        if (actions.length === 0) {
            for (const attacker of currentAttackers) {
                attacker.nextAttackTime = simTime + (attacker.cd || 1.0);
            }
            continue;
        }

        // 階段二：同時結算所有傷害與治療
        let playCritSound = false;
        let playHitSound = false;
        let playMagicSound = false;
        let anyoneDied = false;
        const dmgTexts = [];



        for (const attacker of currentAttackers) {
            attacker.dom.classList.add(attacker.team === 1 ? 'anim-attack-t1' : 'anim-attack-t2');
        }

        for (const action of actions) {
            const { type, attacker, target, amount, crit, isMagic, isSkill } = action;
            
            if (type === 'heal') {
                if (isAlive(target)) {
                    target.hp = Math.min(target.maxHp, target.hp + amount);
                }
                target.dom.classList.add('anim-heal');
                
                const dmgText = document.createElement('div');
                dmgText.className = `damage-text heal`;
                dmgText.innerText = `+${amount}`;
                target.dom.parentElement.appendChild(dmgText);
                dmgTexts.push({text: dmgText, target});

                logI18n('{content}', "log_heal", [simTime.toFixed(1), attacker.team, attacker.icon, attacker.nameKey, target.team, target.icon, target.nameKey, amount]);
                playMagicSound = true;
            } else {
                target.hp = Math.max(0, target.hp - amount);

                if (isSkill) {
                    target.dom.classList.add('anim-fireball');
                    playMagicSound = true;
                } else if (isMagic) {
                    target.dom.classList.add('anim-magic-hit');
                    playMagicSound = true;
                } else {
                    target.dom.classList.add('anim-hit');
                }
                
                if (crit) playCritSound = true; 
                else playHitSound = true;

                const dmgText = document.createElement('div');
                dmgText.className = `damage-text ${crit ? 'crit' : ''}`;
                dmgText.innerText = `-${amount}`;
                target.dom.parentElement.appendChild(dmgText);
                dmgTexts.push({text: dmgText, target});

                const critArg = crit ? "log_crit" : "log_no_crit";
                if (isSkill && target === action.target) {
                    // Only log skill once per target or once total? Let's just log normally, and add skill log
                    logI18n('{content}', "log_skill_warlock", [simTime.toFixed(1), attacker.team, attacker.icon, attacker.nameKey]);
                } else {
                    logI18n('{content}', "log_attack", [simTime.toFixed(1), attacker.team, attacker.icon, attacker.nameKey, target.team, target.icon, target.nameKey, critArg, amount]);
                }
            }
        }

        // 更新血條並判定死亡 (在所有傷害都結算後統一判定)
        const uniqueTargets = [...new Set(actions.map(a => a.target))];
        for (const target of uniqueTargets) {
            const hpPercent = (target.hp / target.maxHp) * 100;
            target.hpBar.style.width = `${hpPercent}%`;
            
            if(hpPercent < 30 && hpPercent > 0) target.hpBar.classList.add('low');
            else target.hpBar.classList.remove('low');

            if(!isAlive(target) && !target.dom.classList.contains('anim-die')) {
                target.dom.classList.add('anim-die');
                logI18n('<span class="log-death">{content}</span>', "log_death", [simTime.toFixed(1), target.icon, target.nameKey]);
                anyoneDied = true;
            }
        }

        if (playMagicSound) audio.playSFX(audio.magic);
        else if (playCritSound) audio.playSFX(audio.crit);
        else if (playHitSound) audio.playSFX(audio.hit);

        if (anyoneDied) audio.playSFX(audio.die);

        const maxDelay = actions.some(a => a.isMagic || a.type === 'heal') ? 500 : 200;
        await sleep(maxDelay / battleSpeed); 

        for (const attacker of currentAttackers) {
            attacker.dom.classList.remove('anim-attack-t1', 'anim-attack-t2');
            attacker.nextAttackTime = simTime + (attacker.cd || 1.0);
        }

        for (const dt of dmgTexts) {
            dt.target.dom.classList.remove('anim-hit', 'anim-magic-hit', 'anim-heal');
            dt.text.remove();
        }

        if (anyoneDied) {
            await sleep(300 / battleSpeed); 
        }
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

// --- Stats Editor Modal Logic ---
const btnEditStats = document.getElementById('btn-edit-stats');
const statsModal = document.getElementById('stats-modal');
const btnCloseStats = document.getElementById('btn-close-stats');
const statsEditorContainer = document.getElementById('stats-editor-container');

function renderStatsEditor() {
    statsEditorContainer.innerHTML = '';
    for (const key in CHARACTER_TEMPLATES) {
        const char = CHARACTER_TEMPLATES[key];
        const row = document.createElement('div');
        row.className = 'stat-editor-row';
        row.innerHTML = `
            <div class="char-icon">${char.icon}</div>
            <div class="stat-editor-inputs">
                <div class="stat-input-group">
                    <label>HP</label>
                    <input type="number" id="edit-hp-${key}" value="${char.hp}" min="1">
                </div>
                <div class="stat-input-group">
                    <label>ATK</label>
                    <input type="number" id="edit-atk-${key}" value="${char.atk}" min="1">
                </div>
                <div class="stat-input-group">
                    <label>DEF</label>
                    <input type="number" id="edit-def-${key}" value="${char.def}" min="0">
                </div>
                <div class="stat-input-group">
                    <label>CD (sec)</label>
                    <input type="number" id="edit-cd-${key}" value="${char.cd}" min="0.1" step="0.1">
                </div>
            </div>
        `;
        statsEditorContainer.appendChild(row);
    }
    renderCharacterPool();
}

if (btnEditStats) {
    btnEditStats.addEventListener('click', () => {
        renderStatsEditor();
        statsModal.classList.remove('hidden');
    });
}

if (btnCloseStats) {
    btnCloseStats.addEventListener('click', () => {
        // Save to localStorage
        localStorage.setItem("warsims_stats", JSON.stringify(CHARACTER_TEMPLATES));
        
        for (const key in CHARACTER_TEMPLATES) {
            const hp = parseInt(document.getElementById(`edit-hp-${key}`).value);
            const atk = parseInt(document.getElementById(`edit-atk-${key}`).value);
            const def = parseInt(document.getElementById(`edit-def-${key}`).value);
            const cd = parseFloat(document.getElementById(`edit-cd-${key}`).value);
            
            updateCharacterTemplate(key, {
                hp: isNaN(hp) ? CHARACTER_TEMPLATES[key].hp : hp,
                atk: isNaN(atk) ? CHARACTER_TEMPLATES[key].atk : atk,
                def: isNaN(def) ? CHARACTER_TEMPLATES[key].def : def,
                cd: isNaN(cd) ? CHARACTER_TEMPLATES[key].cd : cd
            });
        }
        statsModal.classList.add('hidden');
    });
}

// --- Stats Export / Import ---
const btnExportStats = document.getElementById("btn-export-stats");
if (btnExportStats) {
    btnExportStats.addEventListener("click", () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(CHARACTER_TEMPLATES, null, 2));
        const a = document.createElement("a");
        a.setAttribute("href", dataStr);
        a.setAttribute("download", "warsims_stats.json");
        document.body.appendChild(a);
        a.click();
        a.remove();
    });
}

const inputImportStats = document.getElementById("input-import-stats");
if (inputImportStats) {
    inputImportStats.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = JSON.parse(evt.target.result);
                for (const classId in parsed) {
                    if (CHARACTER_TEMPLATES[classId]) {
                        updateCharacterTemplate(classId, parsed[classId]);
                    }
                }
                localStorage.setItem("warsims_stats", JSON.stringify(CHARACTER_TEMPLATES));
                renderStatsEditor();
                renderCharacterPool();
                renderGrids();
                alert("Stats imported successfully!");
            } catch (err) {
                alert("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
        e.target.value = ""; 
    });
}
