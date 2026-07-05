const CHARACTER_TEMPLATES = {
    "Warrior": { classId: "Warrior", nameKey: "class_warrior", icon: "🛡️", hp: 120, atk: 20, def: 1, prefKey: "pref_front", cd: 1.0 },
    "Assassin": { classId: "Assassin", nameKey: "class_assassin", icon: "🗡️", hp: 90, atk: 30, def: 1, prefKey: "pref_back", cd: 0.8 },
    "Archer": { classId: "Archer", nameKey: "class_archer", icon: "🏹", hp: 100, atk: 26, def: 1, prefKey: "pref_back", cd: 0.8 },
    "Mage": { classId: "Mage", nameKey: "class_mage", icon: "🔮", hp: 80, atk: 19, def: 1, prefKey: "pref_crowd", cd: 1.5 },
    "Healer": { classId: "Healer", nameKey: "class_healer", icon: "💖", hp: 100, atk: 30, def: 5, prefKey: "pref_low_hp", cd: 1.5, tag: "HEALER" },
    "Fighter": { classId: "Fighter", nameKey: "class_fighter", icon: "⚔️", hp: 110, atk: 18, def: 2, prefKey: "pref_front", cd: 1.2, multiHit: 2 },
    "Warlock": { classId: "Warlock", nameKey: "class_warlock", icon: "🔥🪄", hp: 70, atk: 25, def: 1, prefKey: "pref_crowd", cd: 1.5, skillCast: 3 }
};

function updateCharacterTemplate(classId, updates) {
    if (CHARACTER_TEMPLATES[classId]) {
        Object.assign(CHARACTER_TEMPLATES[classId], updates);
        renderCharacterPool('character-pool-container');
    }
}

function renderCharacterPool(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    for (const key in CHARACTER_TEMPLATES) {
        const char = CHARACTER_TEMPLATES[key];
        const card = document.createElement('div');
        card.className = 'char-card';
        card.setAttribute('data-class', key);
        card.setAttribute('draggable', 'true');
        
        // Use t() for translations if available, otherwise fallback
        const translatedName = typeof t === "function" ? t(char.nameKey) : char.nameKey;
        const translatedPrefLabel = typeof t === "function" ? t("pref_label") : "優先: ";
        const translatedPref = typeof t === "function" ? t(char.prefKey) : char.prefKey;
        const cdLabel = typeof t === "function" ? t("cd_label", char.cd) : ` | CD: ${char.cd}s`;

        card.innerHTML = `
            <div class="icon">${char.icon}</div>
            <div class="info">
                <strong>${translatedName}</strong>
                <span>HP:${char.hp} | ATK:${char.atk} | DEF:${char.def}${cdLabel}</span>
                <span>${translatedPrefLabel}${translatedPref}</span>
            </div>
        `;
        container.appendChild(card);
    }
}

