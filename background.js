chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("Received request from content script:", request);
    if (request.action === 'summarize') {
        chrome.storage.local.get('geminiApiKey', function (data) {
            const apiKey = data.geminiApiKey;
            if (!apiKey) {
                console.error('No API key found in storage.');
                sendResponse({ success: false, error: 'No API key found in storage.' });
                return;
            }
            const modelId = 'gemini-1.0-pro';
            const textToSummarize = request.text;
            const requestBody = {
                contents: [{
                    role: "user",
                    parts: [{ text: textToSummarize }]
                }]
            };
            console.log("Sending summarization request to Gemini API...");
            fetch(`https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(requestBody)
            }).then(response => {
                console.log('HTTP Status:', response.status); 
                return response.json();
            }).then(data => {
                console.log('API Response:', data); 
                sendResponse({ success: true, data: data });
            }).catch(error => {
                console.error('Error calling the Gemini API:', error);
                sendResponse({ success: false, error: error.message });
            });
        });
        return true;
    }
});
