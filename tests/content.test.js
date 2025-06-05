const { createDynamicMessageContainer, toggleSummarySidePane, closeSummarySidePane } = require('../content');

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
  beforeEach(() => {
    document.body.innerHTML = '';
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ events: [] }) }));
    delete global.window.ytInitialPlayerResponse;
  });

  test('uses the most recent ytInitialPlayerResponse script', async () => {
    const oldScript = document.createElement('script');
    oldScript.textContent = 'var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"old","languageCode":"en"}]}}};';
    document.body.appendChild(oldScript);

    const newScript = document.createElement('script');
    newScript.textContent = 'var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"new","languageCode":"en"}]}}};';
    document.body.appendChild(newScript);

    const { fetchTranscriptFromCaptionsApi } = require('../content');
    await fetchTranscriptFromCaptionsApi();

    expect(fetch).toHaveBeenCalledWith('new&fmt=json3');
  });
});
