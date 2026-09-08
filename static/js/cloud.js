document.addEventListener('DOMContentLoaded', () => {
    const logArea = document.getElementById('log-area');
    if (!logArea) return;

    const logLines = [
        { text: 'Provisioning Azure resources...', type: 'status' },
        { text: '[✓] Resource Group created', type: 'prefix' },
        { text: '[✓] Virtual Network configured', type: 'prefix' },
        { text: '[✓] PostgreSQL Database provisioned', type: 'prefix' },
        { text: '[✓] Redis Cache instance ready', type: 'prefix' },
        { text: 'Building container image...', type: 'status' },
        { text: ' > Pushing image to registry... done', type: 'result' },
        { text: 'Deploying to Phantom Cloud...', type: 'status' },
        { text: '[✓] Container App service deployed successfully!', type: 'prefix' },
        { text: ' > Endpoint: https://phantom-app.azurewebsites.net', type: 'result' },
        { text: 'Deployment complete.', type: 'status' }
    ];

    let lineIndex = 0;

    function showNextLine() {
        if (lineIndex < logLines.length) {
            const line = logLines[lineIndex];
            const lineElement = document.createElement('div');
            lineElement.className = 'log-line';

            let htmlContent = '';
            switch(line.type) {
                case 'prefix':
                    const parts = line.text.split(']');
                    htmlContent = `<span class="prefix">${parts[0]}]</span><span class="result">${parts[1]}</span>`;
                    break;
                case 'status':
                    htmlContent = `<span class="status">${line.text}</span>`;
                    break;
                case 'result':
                    htmlContent = `<span class="result">${line.text}</span>`;
                    break;
                default:
                    htmlContent = line.text;
            }

            logArea.innerHTML += `<div>${htmlContent}</div>`;
            logArea.scrollTop = logArea.scrollHeight; // Auto-scroll to bottom
            lineIndex++;
            
            const delay = line.text.includes('...') ? 1500 : 400;
            setTimeout(showNextLine, delay);
        } else {
            const cursor = document.createElement('span');
            cursor.className = 'typing-cursor';
            logArea.lastChild.appendChild(cursor);
        }
    }

    setTimeout(showNextLine, 500); // Initial delay
});
