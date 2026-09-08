document.addEventListener('DOMContentLoaded', () => {
    const scanArea = document.getElementById('scan-area');
    if (!scanArea) return;

    const scanLines = [
        { text: 'Initializing Phantom Security Scanner...', class: 'info' },
        { text: 'Scanning project dependencies...', class: 'scanning' },
        { text: '[HIGH] Found vulnerable package: `log4j` version 2.14.0', class: 'vulnerability' },
        { text: '         > Applying patch: Upgrading to version 2.17.1...', class: 'info' },
        { text: '         > Patch applied successfully.', class: 'fix' },
        { text: '[MEDIUM] Insecure JWT signing secret detected.', class: 'vulnerability' },
        { text: '         > Action: Rotating secret and moving to environment variable...', class: 'info' },
        { text: '         > Secret rotated.', class: 'fix' },
        { text: 'Scanning for code quality issues...', class: 'scanning' },
        { text: '[LOW] SQL injection possibility in `user_query.py` line 42.', class: 'vulnerability' },
        { text: '         > Action: Parameterizing SQL query...', class: 'info' },
        { text: '         > Query secured.', class: 'fix' },
        { text: 'Scan complete. 3 issues found and resolved.', class: 'summary' }
    ];

    let lineIndex = 0;

    function showNextLine() {
        if (lineIndex < scanLines.length) {
            const line = scanLines[lineIndex];
            const lineElement = document.createElement('div');
            lineElement.className = `scan-line ${line.class}`;
            
            const textNode = document.createTextNode(line.text);
            lineElement.appendChild(textNode);
            
            scanArea.appendChild(lineElement);
            scanArea.scrollTop = scanArea.scrollHeight;

            lineIndex++;
            
            const delay = line.text.includes('...') ? 1200 : 500;
            setTimeout(showNextLine, delay);
        } else {
            const cursor = document.createElement('span');
            cursor.className = 'typing-cursor';
            scanArea.lastChild.appendChild(cursor);
        }
    }

    setTimeout(showNextLine, 500);
});
