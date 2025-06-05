const { createDynamicMessageContainer, toggleSummarySidePane, closeSummarySidePane, fetchTranscriptFromCaptionsApi } = require('../content');

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createDynamicMessageContainer', () => {
  test('should create the container only once', () => {
    const first = createDynamicMessageContainer();
    const second = createDynamicMessageContainer();
    expect(first).toBe(second);
    expect(document.querySelectorAll('#dynamic-message').length).toBe(1);
    expect(document.getElementById('summary-side-pane')).not.toBeNull();
  });
});

describe('toggleSummarySidePane', () => {
  test('should add a new .contentContainer and display the pane', () => {
    toggleSummarySidePane('hello');
    const sidePane = document.getElementById('summary-side-pane');
    expect(sidePane).not.toBeNull();
    expect(sidePane.style.display).toBe('block');
    const containers = sidePane.querySelectorAll('.contentContainer');
    expect(containers.length).toBe(1);
    expect(containers[0].innerHTML).toBe('hello');
  });
});

describe('closeSummarySidePane', () => {
  test('should hide the side pane and remove summary content only', () => {
    toggleSummarySidePane('hello');
    closeSummarySidePane();
    const sidePane = document.getElementById('summary-side-pane');
    expect(sidePane.style.display).toBe('none');
    expect(sidePane.querySelector('.contentContainer')).toBeNull();
    expect(document.getElementById('summary-close-button')).not.toBeNull();
    expect(document.getElementById('summary-minimize-button')).not.toBeNull();
  });
});

describe('fetchTranscriptFromCaptionsApi', () => {
  test('uses the most recent ytInitialPlayerResponse script', async () => {
    document.body.innerHTML = `
      <script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"languageCode":"en","baseUrl":"https://old"}]}}};</script>
      <script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"languageCode":"en","baseUrl":"https://new"}]}}};</script>
    `;
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    await fetchTranscriptFromCaptionsApi();
    expect(global.fetch).toHaveBeenCalledWith('https://new&fmt=json3');
    delete global.fetch;
  });

  test('prefers window.ytInitialPlayerResponse when available', async () => {
    window.ytInitialPlayerResponse = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{ languageCode: 'en', baseUrl: 'https://window' }]
        }
      }
    };
    document.body.innerHTML = `
      <script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"languageCode":"en","baseUrl":"https://old"}]}}};</script>
    `;
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    await fetchTranscriptFromCaptionsApi();
    expect(global.fetch).toHaveBeenCalledWith('https://window&fmt=json3');
    delete global.fetch;
    delete window.ytInitialPlayerResponse;
  });
});
