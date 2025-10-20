(function() {
    let vocabulary = [];
    let studyList = [];
    
    const searchInput = document.getElementById('search-input');
    const suggestionsList = document.getElementById('suggestions-list');
    const resultDisplay = document.getElementById('result-display');
    const wordWheel = document.getElementById('word-wheel');
    const wordWheelContainer = document.getElementById('word-wheel-container');
    const cookieNoticeModal = document.getElementById('cookie-notice-modal');
    const acknowledgeCookieBtn = document.getElementById('acknowledge-cookie-btn');
    const viewStudyListBtn = document.getElementById('view-study-list-btn');
    const studyListModal = document.getElementById('study-list-modal');
    const closeStudyListModal = document.getElementById('close-study-list-modal');
    const studyListUl = document.getElementById('study-list-ul');
    const studyListPlaceholder = document.getElementById('study-list-placeholder');
    const downloadListBtn = document.getElementById('download-list-btn');
    const importListBtn = document.getElementById('import-list-btn');
    const importFileInput = document.getElementById('import-file-input');
    const copyListBtn = document.getElementById('copy-list-btn');
    const toggleWordWheelBtn = document.getElementById('toggle-word-wheel-btn');
    const closeWordWheelBtn = document.getElementById('close-word-wheel-btn');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    
    // --- Functions ---
    
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
    }
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    /** MODIFIED: Now removes parentheses in addition to other characters **/
    function normalizeForSearch(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize('NFD') // Decompose diacritics (e.g., 'ē' -> 'e' + '̄')
            .replace(/[\u0300-\u036f]/g, '') // Remove the diacritic marks
            .replace(/[()–-]/g, ''); // Remove parentheses, en-dashes, and hyphens
    }

    function parseCSV(data) {
        const lines = data.trim().split('\n');
        const hasHeader = lines[0].toLowerCase().includes('latin');
        const dataLines = hasHeader ? lines.slice(1) : lines;
        const records = [];
        for (const line of dataLines) {
             if (!line) continue;
            const values = []; let current = ''; let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' && (i === 0 || line[i - 1] !== '\\')) { inQuotes = !inQuotes; } 
                else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; } 
                else { current += char; }
            }
            values.push(current.trim());
            if (values.length >= 3) {
                records.push({ latin: values[0].replace(/"/g, ''), definition: values[1].replace(/"/g, ''), chapter: values[2].replace(/"/g, '') || 'N/A' });
            }
        }
        return records;
    }

    function populateWordWheel() {
        wordWheel.innerHTML = '';
        const fragment = document.createDocumentFragment();
        vocabulary.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word.latin;
            li.dataset.latin = word.latin;
            fragment.appendChild(li);
        });
        wordWheel.appendChild(fragment);
    }

    function displayWordDetails(word) {
        if (!word) {
            resultDisplay.innerHTML = `<div class="placeholder-text"><p>Word not found.</p></div>`;
            return;
        }
        const isSaved = studyList.includes(word.latin);
        const buttonHtml = `
            <button id="add-to-list-btn" class="btn ${isSaved ? 'btn-danger' : 'btn-primary'}">
                ${isSaved ? 'Remove from List' : 'Add to List'}
            </button>`;
        
        resultDisplay.innerHTML = `
            <div class="result-header">
                <h2>${word.latin}</h2>
                ${buttonHtml}
            </div>
            <p>${word.definition}</p>
            <div class="chapter">First Appears in Chapter: ${word.chapter}</div>
            <div class="result-footer">
                ${buttonHtml}
            </div>
        `;
        
        resultDisplay.querySelectorAll('#add-to-list-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (isSaved) removeFromStudyList(word.latin);
                else addToStudyList(word.latin);
                displayWordDetails(word);
            });
        });

        updateWordWheelSelection(word.latin);
        searchInput.value = word.latin;
        suggestionsList.style.display = 'none';
        suggestionsList.innerHTML = '';
    }
    
    function updateWordWheelSelection(latinWord) {
        const currentSelected = wordWheel.querySelector('.selected');
        if (currentSelected) currentSelected.classList.remove('selected');
        const newSelectedItem = wordWheel.querySelector(`li[data-latin="${CSS.escape(latinWord)}"]`);
        if (newSelectedItem) {
            newSelectedItem.classList.add('selected');
            newSelectedItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    function updateWordWheelStyles() {
        const studyListSet = new Set(studyList);
        const allWords = wordWheel.querySelectorAll('li');
        allWords.forEach(li => {
            li.classList.toggle('in-study-list', studyListSet.has(li.dataset.latin));
        });
    }

    function saveStudyList() {
        setCookie('studyList', JSON.stringify(studyList), 365);
        updateWordWheelStyles();
    }
    function addToStudyList(latinWord) {
        if (!studyList.includes(latinWord)) {
            studyList.push(latinWord);
            saveStudyList();
        }
    }
    
    function removeFromStudyList(latinWord, refreshModal = false) {
        studyList = studyList.filter(word => word !== latinWord);
        saveStudyList();
        if (refreshModal) {
            showStudyListModal();
        }
    }
    
    function showStudyListModal() {
        studyListUl.innerHTML = '';
        if (studyList.length === 0) {
            studyListPlaceholder.style.display = 'block';
        } else {
            studyListPlaceholder.style.display = 'none';
            studyList.sort((a,b) => a.localeCompare(b)).forEach(latinWord => {
                const wordObject = vocabulary.find(w => w.latin === latinWord);
                if (wordObject) {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div class="study-list-item-content">
                            <span class="study-list-latin">${wordObject.latin}</span>
                            <span class="study-list-definition">${wordObject.definition}</span>
                            <span class="study-list-chapter">Chapter: ${wordObject.chapter}</span>
                        </div>
                        <button class="remove-from-list-btn" data-word="${latinWord}" title="Remove from list">&times;</button>
                    `;
                    studyListUl.appendChild(li);
                }
            });
        }
        studyListModal.style.display = 'flex';
    }

    function generateTSVContent() {
        return studyList.map(latinWord => {
            const word = vocabulary.find(w => w.latin === latinWord);
            return word ? [word.latin, word.definition, word.chapter].join('\t') : '';
        }).filter(Boolean).join('\n');
    }

    function downloadTSV() {
        const tsvContent = generateTSVContent();
        const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "ecce_romani_study_list.tsv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function copyTSVToClipboard() {
        const tsvContent = generateTSVContent();
        if (!navigator.clipboard) {
            alert("Clipboard API not available in your browser.");
            return;
        }
        navigator.clipboard.writeText(tsvContent).then(() => {
            const originalText = copyListBtn.textContent;
            copyListBtn.textContent = "Copied!";
            setTimeout(() => {
                copyListBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            alert('Failed to copy list to clipboard.');
            console.error('Clipboard copy failed:', err);
        });
    }

    function handleImport() {
        if (!confirm("This will replace your current study list with the contents of the file. Are you sure you want to proceed?")) return;
        importFileInput.click();
    }

    function processImportFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const content = event.target.result;
            const lines = content.trim().split('\n');
            const firstLineCols = lines[0].split('\t');
            const hasHeader = firstLineCols[0].toLowerCase().includes('latin') || firstLineCols[0].toLowerCase().includes('word');
            const dataLines = hasHeader ? lines.slice(1) : lines;
            const newList = [];
            const allLatinWords = new Set(vocabulary.map(v => v.latin));
            dataLines.forEach(line => {
                const latinWord = line.split('\t')[0].trim();
                if (latinWord && allLatinWords.has(latinWord)) {
                    newList.push(latinWord);
                }
            });
            studyList = [...new Set(newList)];
            saveStudyList();
            showStudyListModal();
            alert(`Import complete. ${studyList.length} valid words were added to your list.`);
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function onSearchInput(e) {
        const rawSearchTerm = e.target.value;
        const normalizedSearchTerm = normalizeForSearch(rawSearchTerm);

        if (normalizedSearchTerm.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }

        const primaryMatches = [];
        const secondaryMatches = [];

        vocabulary.forEach(word => {
            const normalizedLatin = normalizeForSearch(word.latin);
            if (normalizedLatin.startsWith(normalizedSearchTerm)) {
                primaryMatches.push(word);
            } else if (normalizedLatin.includes(' ' + normalizedSearchTerm)) {
                secondaryMatches.push(word);
            }
        });

        const matches = [...primaryMatches, ...secondaryMatches].slice(0, 10);

        suggestionsList.innerHTML = '';
        if (matches.length > 0) {
            matches.forEach(match => {
                const div = document.createElement('div');
                const words = match.latin.split(' ');
                let hasBolded = false;
                const highlightedHtml = words.map(wordPart => {
                    if (!hasBolded && normalizeForSearch(wordPart).startsWith(normalizedSearchTerm)) {
                        hasBolded = true;
                        // Find the original substring to bold, case-insensitively
                        const originalWordPart = wordPart;
                        const normalizedWordPart = normalizeForSearch(originalWordPart);
                        const matchIndex = normalizedWordPart.indexOf(normalizedSearchTerm);
                        const len = rawSearchTerm.length;
                        
                        // Reconstruct the bolding based on original casing
                        return originalWordPart.substring(0, matchIndex) + 
                               `<strong>${originalWordPart.substring(matchIndex, matchIndex + len)}</strong>` +
                               originalWordPart.substring(matchIndex + len);
                    }
                    return wordPart;
                }).join(' ');
                
                div.innerHTML = highlightedHtml;
                div.addEventListener('mousedown', () => displayWordDetails(match));
                suggestionsList.appendChild(div);
            });
            suggestionsList.style.display = 'block';
        } else {
            suggestionsList.style.display = 'none';
        }
    }

    function onWordWheelClick(e) {
        if (e.target && e.target.nodeName === "LI") {
            const latinWord = e.target.dataset.latin;
            const wordObject = vocabulary.find(w => w.latin === latinWord);
            if (wordObject) {
                displayWordDetails(wordObject);
                if (window.innerWidth <= 768) {
                    closeMobileMenu();
                }
            }
        }
    }
    
    function openMobileMenu() {
        wordWheelContainer.classList.add('mobile-visible');
        mobileMenuOverlay.style.display = 'block';
    }
    function closeMobileMenu() {
        wordWheelContainer.classList.remove('mobile-visible');
        mobileMenuOverlay.style.display = 'none';
    }

    async function initialize() {
        acknowledgeCookieBtn.addEventListener('click', () => {
            cookieNoticeModal.style.display = 'none';
            setCookie('cookieConsent', 'true', 365);
        });

        if (!getCookie('cookieConsent')) {
            cookieNoticeModal.style.display = 'flex';
        }
        
        const savedList = getCookie('studyList');
        if (savedList) {
            try { studyList = JSON.parse(savedList); } catch (e) { studyList = []; }
        }
        
        try {
            const response = await fetch('vocabulary.csv');
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const csvText = await response.text();
            vocabulary = parseCSV(csvText);
        } catch (error) {
            console.error("Error fetching or parsing vocabulary.csv:", error);
            resultDisplay.innerHTML = `<div class="placeholder-text"><p style="color:var(--danger-color);">Error: Could not load vocabulary.csv. This app must be run from a web server.</p></div>`;
            return;
        }

        vocabulary.sort((a, b) => a.latin.localeCompare(b.latin));
        populateWordWheel();
        updateWordWheelStyles();

        searchInput.addEventListener('input', onSearchInput);
        wordWheel.addEventListener('click', onWordWheelClick);
        searchInput.addEventListener('blur', () => setTimeout(() => { suggestionsList.style.display = 'none'; }, 150));

        viewStudyListBtn.addEventListener('click', showStudyListModal);
        closeStudyListModal.addEventListener('click', () => studyListModal.style.display = 'none');
        
        studyListUl.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('remove-from-list-btn')) {
                removeFromStudyList(e.target.dataset.word, true);
            }
        });

        downloadListBtn.addEventListener('click', downloadTSV);
        importListBtn.addEventListener('click', handleImport);
        importFileInput.addEventListener('change', processImportFile);
        copyListBtn.addEventListener('click', copyTSVToClipboard);

        toggleWordWheelBtn.addEventListener('click', openMobileMenu);
        closeWordWheelBtn.addEventListener('click', closeMobileMenu);
        mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();
