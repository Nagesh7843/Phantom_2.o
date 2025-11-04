document.addEventListener('DOMContentLoaded', () => {
    const codeLineElement = document.getElementById('code-line-1');
    if (!codeLineElement) return;

    const originalCode = `def <span class="function">calculate_fibonacci</span>(n):`;
    const suggestionCode = `  # AI suggestion: handle non-integer inputs`;
    
    const codeText = originalCode.split('');
    let currentIndex = 0;
    let isTypingSuggestion = false;

    const typingCursor = document.createElement('span');
    typingCursor.className = 'typing-cursor';

    function type() {
        if (currentIndex < codeText.length) {
            // Typing the main code
            codeLineElement.innerHTML = codeText.slice(0, currentIndex + 1).join('') + '<span class="typing-cursor"></span>';
            currentIndex++;
            setTimeout(type, 100);
        } else if (!isTypingSuggestion) {
            // Finished typing main code, start suggestion
            isTypingSuggestion = true;
            currentIndex = 0; // Reset for suggestion
            const suggestionSpan = document.createElement('span');
            suggestionSpan.id = 'ai-suggestion';
            suggestionSpan.className = 'suggestion';
            
            const lineBreak = document.createElement('br');
            const lineNumbers = document.querySelector('.line-numbers');
            lineNumbers.innerHTML += '<br>2';

            codeLineElement.parentElement.appendChild(lineBreak);
            codeLineElement.parentElement.appendChild(suggestionSpan);
            
            typeSuggestion(suggestionSpan);
        }
    }

    function typeSuggestion(element) {
        if (currentIndex < suggestionCode.length) {
            element.innerHTML = suggestionCode.slice(0, currentIndex + 1) + '<span class="typing-cursor"></span>';
            currentIndex++;
            setTimeout(() => typeSuggestion(element), 80);
        } else {
            // Finished, remove cursor
            element.innerHTML = suggestionCode;
        }
    }

    // Initial call
    type();
});
