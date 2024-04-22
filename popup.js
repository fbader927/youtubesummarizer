document.addEventListener('DOMContentLoaded', function () {
    const askButton = document.getElementById('askButtonPopup');
    const changeApiKeyButton = document.getElementById('changeApiKeyButton');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKeyStatus = document.getElementById('apiKeyStatus'); 
    changeApiKeyButton.addEventListener('click', function () {
        if (apiKeyInput.style.display !== 'none') {
            const apiKey = apiKeyInput.value;
            if (apiKey) {
                chrome.storage.local.set({ 'geminiApiKey': apiKey }, function () {
                    console.log('API Key saved');
                    apiKeyInput.style.display = 'none';
                    apiKeyStatus.textContent = 'API Key Stored';
                    apiKeyStatus.style.display = 'block';
                });
            }
        } else {
            apiKeyInput.style.display = 'block';
            apiKeyStatus.textContent = '';
            apiKeyStatus.style.display = 'none';
        }
    });
});
