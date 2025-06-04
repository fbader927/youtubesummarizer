const { createDynamicMessageContainer, toggleSummarySidePane } = require('../content');

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
