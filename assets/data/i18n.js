const I18N = {
    "zh-TW": {
        "title": "聖焰與暗影的交鋒",
        "audio_settings": "⚙️ 音訊設定",
        "music": "音樂",
        "sfx": "音效",
        "max_chars_label": "上場人數 (2~5): ",
        "btn_random": "🎲 一鍵隨機佈陣",
        "btn_start": "⚔️ 開始戰鬥",
        "btn_reset": "🔄 重置下一局",
        "btn_export": "💾 匯出戰鬥紀錄",
        "legend_warrior": "🛡️ 戰士 剋 ⚔️ 刺客",
        "legend_assassin": "⚔️ 刺客 剋 🏹 弓手",
        "legend_archer": "🏹 弓手 剋 🛡️ 戰士",
        "legend_tiebreaker": "⏱️ 同時攻擊時，雙方陣營將輪流取得先手優勢",
        "team1_name": "玩家 1 (光之陣營)",
        "team2_name": "玩家 2 (闇之陣營)",
        "instruction": "請將下方角色「拖曳」至棋盤空格，或是點擊後再點擊棋盤",
        "selection_status": "目前選擇：",
        "selection_none": "無",
        "battle_log_title": "📜 戰鬥日誌",
        
        "class_warrior": "戰士",
        "class_assassin": "刺客",
        "class_archer": "弓手",
        "class_mage": "法師",
        "pref_front": "前排",
        "pref_back": "後排",
        "pref_crowd": "人多的一排",
        "pref_label": "優先: ",
        "cd_label": " | CD: {0}秒",
        "speed_label": "戰鬥速度: ",

        "log_limit_reached": "玩家 {0} 已經達到人數上限 ({1}人)！",
        "log_battle_start": "⚔️ <b>戰鬥開始！</b>",
        "log_turn": "--- 回合 {0} ---",
        "log_attack": "[{0}s] [玩家 {1}] {2}{3} 攻擊 [玩家 {4}] {5}{6}{7} 造成 {8} 傷害。",
        "log_crit": "，屬性克制！",
        "log_no_crit": "。",
        "log_death": "💀 [{0}s] {1}{2} 陣亡！",
        "log_win": "🏆 <b>玩家 {0} 獲勝！</b>",
        "log_draw": "🤝 <b>雙方平手！</b>",
        "log_random_done": "🎲 已為雙方隨機生成陣容！",
        "alert_no_record": "目前還沒有任何戰鬥紀錄可以匯出！",
        "confirm_clear_record": "匯出成功！是否要清空目前存在瀏覽器的對戰紀錄？",
        "select_instruction": " (點擊棋盤放置)"
    },
    "en": {
        "title": "Clash of Light and Shadow",
        "audio_settings": "⚙️ Audio",
        "music": "Music",
        "sfx": "SFX",
        "max_chars_label": "Party Size (2~5): ",
        "btn_random": "🎲 Auto Deploy",
        "btn_start": "⚔️ Start Battle",
        "btn_reset": "🔄 Reset Board",
        "btn_export": "💾 Export Log",
        "legend_warrior": "🛡️ Warrior > ⚔️ Assassin",
        "legend_assassin": "⚔️ Assassin > 🏹 Archer",
        "legend_archer": "🏹 Archer > 🛡️ Warrior",
        "legend_tiebreaker": "⏱️ Simultaneous attacks alternate priority between teams",
        "team1_name": "Player 1 (Light)",
        "team2_name": "Player 2 (Dark)",
        "instruction": "Drag characters to the board, or click to select and click the board",
        "selection_status": "Selected: ",
        "selection_none": "None",
        "battle_log_title": "📜 Battle Log",
        
        "class_warrior": "Warrior",
        "class_assassin": "Assassin",
        "class_archer": "Archer",
        "class_mage": "Mage",
        "pref_front": "Front Row",
        "pref_back": "Back Row",
        "pref_crowd": "Crowded Row",
        "pref_label": "Target: ",
        "cd_label": " | CD: {0}s",
        "speed_label": "Speed: ",

        "log_limit_reached": "Player {0} reached the limit ({1})!",
        "log_battle_start": "⚔️ <b>Battle Starts!</b>",
        "log_turn": "--- Turn {0} ---",
        "log_attack": "[{0}s] [Player {1}] {2}{3} attacks [Player {4}] {5}{6}{7} dealing {8} DMG.",
        "log_crit": ", Element Advantage!",
        "log_no_crit": ".",
        "log_death": "💀 [{0}s] {1}{2} fell!",
        "log_win": "🏆 <b>Player {0} Wins!</b>",
        "log_draw": "🤝 <b>It's a Draw!</b>",
        "log_random_done": "🎲 Auto deployment complete!",
        "alert_no_record": "No battle records to export!",
        "confirm_clear_record": "Export successful! Do you want to clear the local battle records?",
        "select_instruction": " (Click board to place)"
    }
};

let currentLang = "zh-TW";

function t(key, ...args) {
    let str = I18N[currentLang][key] || key;
    args.forEach((arg, i) => {
        let translatedArg = arg;
        if (typeof arg === "string" && I18N[currentLang][arg]) {
            translatedArg = I18N[currentLang][arg];
        }
        str = str.replace(`{${i}}`, translatedArg);
    });
    return str;
}

function switchLanguage(lang) {
    currentLang = lang;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerHTML = t(key);
    });

    document.querySelectorAll('[data-i18n-text]').forEach(el => {
        const key = el.getAttribute('data-i18n-text');
        el.childNodes[0].nodeValue = t(key);
    });

    document.querySelectorAll('[data-i18n-log]').forEach(el => {
        const key = el.getAttribute('data-i18n-log');
        const argsStr = el.getAttribute('data-i18n-args');
        let args = [];
        if (argsStr) {
            try { args = JSON.parse(argsStr.replace(/&quot;/g, '"')); } catch(e){}
        }
        el.innerHTML = t(key, ...args);
    });
    
    if (typeof renderCharacterPool === "function") {
        renderCharacterPool('character-pool-container');
        if (typeof window.bindCharCards === "function") {
            window.bindCharCards();
        }
    }
    
    // update status
    const statusEl = document.getElementById('selection-status');
    if(statusEl && typeof selectedClassForPlacement !== 'undefined') {
        if(!selectedClassForPlacement) {
            statusEl.innerHTML = `<span data-i18n-text="selection_status">${t("selection_status")}</span><span data-i18n-text="selection_none">${t("selection_none")}</span>`;
        } else {
            const clsData = CHARACTER_TEMPLATES[selectedClassForPlacement];
            statusEl.innerText = t("selection_status") + t(clsData.nameKey) + t("select_instruction");
        }
    }
}
