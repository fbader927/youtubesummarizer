function injectButton() {
    const moreActionsMenu = document.querySelector('ytd-menu-renderer yt-icon-button.dropdown-trigger');
    const descriptionBox = document.querySelector('ytd-video-secondary-info-renderer');
    const targetElement = moreActionsMenu || descriptionBox;
    if (targetElement && !document.getElementById('askButton')) {
        const askButton = document.createElement('button');
        askButton.innerText = 'Summarize';
        askButton.id = 'askButton';
        askButton.className = 'style-scope ytd-menu-renderer action-button askButton';
        askButton.onclick = extractTranscript;
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.style.display = 'none'; 
        askButton.appendChild(loadingIndicator);

        if (moreActionsMenu) {
            moreActionsMenu.before(askButton);
        } else {
            descriptionBox.appendChild(askButton);
        }
    } else if (!targetElement) {
        setTimeout(injectButton, 1000);
    }
}

window.addEventListener('unload', function () {
    const sidePane = document.getElementById('summary-side-pane');
    if (sidePane) {
        sidePane.innerHTML = ''; 
    }
    clearInterval(intervalId);
    isSummarizing = false; 
    hideLoadingIndicator(); 
});

function showLoadingIndicator() {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'inline-block';
}

function hideLoadingIndicator() {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}


function createCloseButton() {
    const closeButton = document.createElement('button');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="(link unavailable)">
            <path d="M18 6L6 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    closeButton.id = 'summary-close-button';
    closeButton.className = 'summaryCloseButton';
    closeButton.title = 'Close';
    closeButton.onclick = () => {
        const sidePane = document.getElementById('summary-side-pane');
        if (sidePane) {
            sidePane.style.display = 'none';
        }
    };
    return closeButton;
}

function createDynamicMessageContainer() {
    let dynamicMessage = document.getElementById('dynamic-message');
    if (!dynamicMessage) {
        dynamicMessage = document.createElement('div');
        dynamicMessage.id = 'dynamic-message';
        dynamicMessage.className = 'dynamicMessage';
        const sidePane = document.getElementById('summary-side-pane');
        sidePane.prepend(dynamicMessage);
    }
    return dynamicMessage;
}

function updateDynamicMessage(message) {
    const dynamicMessage = createDynamicMessageContainer();
    dynamicMessage.innerHTML = message;
}

function toggleSummarySidePane(formattedSummary, append = false) {
    let sidePane = document.getElementById('summary-side-pane');
    if (!sidePane) {
        sidePane = document.createElement('div');
        sidePane.id = 'summary-side-pane';
        sidePane.className = 'summarySidePane';
        document.body.appendChild(sidePane);
        sidePane.appendChild(createCloseButton());
        sidePane.appendChild(createDynamicMessageContainer());  
    }

    if (!append) {
        const contentContainers = sidePane.querySelectorAll('.contentContainer');
        contentContainers.forEach(container => container.remove());
    }

    const contentContainer = document.createElement('div');
    contentContainer.className = 'contentContainer';
    contentContainer.innerHTML = formattedSummary.replace(/\n/g, '<br>');
    sidePane.appendChild(contentContainer);
    sidePane.style.display = 'block';
}

function clickShowTranscriptButton() {
    const buttons = Array.from(document.querySelectorAll('button'));
    const showTranscriptButton = buttons.find(btn => btn.textContent.trim() === 'Show transcript');
    if (showTranscriptButton) {
        showTranscriptButton.click();
        return true;
    } else {
        return false;
    }
}

function waitForTranscriptLoad(callback) {
    let attempts = 0;
    const checkTranscript = setInterval(() => {
        const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
        if (transcriptSegments.length > 0 || attempts > 10) {
            clearInterval(checkTranscript);
            callback(transcriptSegments);
        }
        attempts++;
    }, 500);
}

let intervalId;  
let isSummarizing = false;

function extractTranscript() {
    if (isSummarizing) {
        console.log("Summarization is already in progress.");
        return;
    }
    isSummarizing = true;  
    clearInterval(intervalId); 

    showLoadingIndicator(); 

    if (!clickShowTranscriptButton()) {
        updateDynamicMessage('Transcript not available for this video.');
        isSummarizing = false; 
        hideLoadingIndicator();
        return;
    }

    waitForTranscriptLoad((transcriptSegments) => {
        if (!transcriptSegments.length) {
            updateDynamicMessage('Transcript loading failed or not found.');
            hideLoadingIndicator();
            isSummarizing = false;  
            return;
        }

        let transcriptText = '';
        transcriptSegments.forEach(segment => {
            const time = segment.querySelector('div.segment-timestamp').innerText;
            const text = segment.querySelector('yt-formatted-string').innerText;
            transcriptText += time + ' ' + text + '\n';
        });

        processTranscriptInChunks(transcriptText);
    });
}

function processTranscriptInChunks(transcriptText) {
    const chunkSize = 20000; 
    let position = 0;

    function summarizeNextChunk() {
        if (position >= transcriptText.length) {
            clearInterval(intervalId);
            hideLoadingIndicator();
            chrome.storage.local.remove('transcriptText', function () {
                console.log('Transcript text cleared after processing.');
            });
            isSummarizing = false;  
            return;
        }

        const chunk = transcriptText.substring(position, Math.min(position + chunkSize, transcriptText.length));
        position += chunkSize;

        chrome.runtime.sendMessage({ action: 'summarize', text: chunk }, (response) => {
            if (!response.success) {
                clearInterval(intervalId);
                toggleSummarySidePane('Error in processing summary: ' + response.error);
                hideLoadingIndicator();
                isSummarizing = false;  
                return;
            }
            toggleSummarySidePane(response.data, true);  
            summarizeNextChunk();  
        });
    }

    summarizeNextChunk();
}

let observer;

function setupObserver() {
    if (observer) {
        observer.disconnect();
    }
    observer = new MutationObserver(injectButton);
    observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof module === 'undefined') {
    injectButton();
    setupObserver();
    window.addEventListener('yt-navigate-finish', () => {
        injectButton();
        setupObserver();
    });
} else {
    module.exports = { createDynamicMessageContainer, toggleSummarySidePane };
}
