import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { logInfo, logError } from '../logger';

let inspectorWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let currentSelectorType: string | null = null;

/**
 * Setup inspector handlers for the page inspector feature
 * @param window The main browser window
 */
export function setupInspectorHandlers(window: BrowserWindow): void {
  mainWindow = window;

  /**
   * Open the inspector with a specific URL and selector type
   */
  ipcMain.handle(IPC_CHANNELS.INSPECTOR_OPEN, async (event: IpcMainInvokeEvent, url: string, selectorType: string): Promise<void> => {
    logInfo(`[Inspector] Opening inspector for URL: ${url}, type: ${selectorType}`);

    try {
      // Close existing inspector if open
      if (inspectorWindow && !inspectorWindow.isDestroyed()) {
        inspectorWindow.close();
        inspectorWindow = null;
      }

      currentSelectorType = selectorType;

      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      // Get main window position and size
      const mainBounds = mainWindow.getBounds();

      // Create a new BrowserWindow for the inspector
      // Position it to the right of the main window
      inspectorWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        x: mainBounds.x + mainBounds.width + 10, // Position to the right of main window
        y: mainBounds.y,
        title: 'Page Inspector - Click elements to select them',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          javascript: true,
        },
        autoHideMenuBar: true,
        backgroundColor: '#f0f0f0',
      });

      // Handle window close
      inspectorWindow.on('closed', () => {
        inspectorWindow = null;
        currentSelectorType = null;
        logInfo('[Inspector] Inspector window closed');
      });

      // Show the window immediately
      inspectorWindow.show();

      // Load the URL with timeout
      logInfo(`[Inspector] Loading URL: ${url}`);

      let pageHasLoaded = false;

      // Prevent navigation AFTER initial page load
      inspectorWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        if (pageHasLoaded && navigationUrl !== url) {
          logInfo(`[Inspector] Prevented navigation to: ${navigationUrl}`);
          event.preventDefault();
        }
      });

      // Prevent form submissions that would navigate
      inspectorWindow.webContents.on('did-create-window', (childWindow) => {
        logInfo('[Inspector] Prevented window creation');
        childWindow.close();
      });

      // Also prevent new window creation
      inspectorWindow.webContents.setWindowOpenHandler(() => {
        logInfo('[Inspector] Blocked window open attempt');
        return { action: 'deny' };
      });

      await Promise.race([
        inspectorWindow.loadURL(url),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('URL loading timeout after 30s')), 30000)
        )
      ]);

      // Wait for page to load with timeout (only for initial load)
      logInfo('[Inspector] Waiting for page to finish loading');

      // Check if page is already loaded (in case loadURL finished very quickly)
      if (inspectorWindow.webContents.isLoading()) {
        logInfo('[Inspector] Page is still loading, waiting for did-finish-load event');

        const loadPromise = new Promise<void>((resolve, reject) => {
          if (!inspectorWindow || inspectorWindow.isDestroyed()) {
            reject(new Error('Inspector window destroyed'));
            return;
          }

          const timeout = setTimeout(() => {
            logError('[Inspector] Page load timeout - page took too long to load');
            reject(new Error('Page load timeout after 30s - try a simpler page or check internet connection'));
          }, 30000); // Increased to 30 seconds

          const finishHandler = () => {
            logInfo('[Inspector] Page finished loading (did-finish-load event)');
            pageHasLoaded = true; // Mark that initial load is complete
            clearTimeout(timeout);
            // Remove listeners to prevent them from firing on any blocked navigation attempts
            if (inspectorWindow && !inspectorWindow.isDestroyed()) {
              inspectorWindow.webContents.removeListener('did-finish-load', finishHandler);
              inspectorWindow.webContents.removeListener('did-fail-load', failHandler);
            }
            resolve();
          };

          const failHandler = (event: any, errorCode: number, errorDescription: string) => {
            logError(`[Inspector] Page failed to load: ${errorDescription} (${errorCode})`);
            clearTimeout(timeout);
            if (inspectorWindow && !inspectorWindow.isDestroyed()) {
              inspectorWindow.webContents.removeListener('did-finish-load', finishHandler);
              inspectorWindow.webContents.removeListener('did-fail-load', failHandler);
            }
            reject(new Error(`Failed to load: ${errorDescription} (${errorCode})`));
          };

          inspectorWindow.webContents.once('did-finish-load', finishHandler);
          inspectorWindow.webContents.once('did-fail-load', failHandler);
        });

        await loadPromise;
      } else {
        logInfo('[Inspector] Page already loaded, skipping wait');
        pageHasLoaded = true;
      }

      logInfo('[Inspector] Page loaded, injecting script');

      // Inject the inspector script
      await injectInspectorScript();

      logInfo('[Inspector] Inspector opened successfully');
    } catch (error) {
      logError('[Inspector] Failed to open inspector', error as Error);
      if (inspectorWindow && !inspectorWindow.isDestroyed()) {
        inspectorWindow.close();
        inspectorWindow = null;
      }
      throw error;
    }
  });

  /**
   * Close the inspector
   */
  ipcMain.handle(IPC_CHANNELS.INSPECTOR_CLOSE, async (): Promise<void> => {
    logInfo('[Inspector] Closing inspector');
    await closeInspector();
  });
}

/**
 * Close and cleanup the inspector
 */
async function closeInspector(): Promise<void> {
  if (inspectorWindow && !inspectorWindow.isDestroyed()) {
    try {
      inspectorWindow.close();
      inspectorWindow = null;
      currentSelectorType = null;
      logInfo('[Inspector] Inspector closed successfully');
    } catch (error) {
      logError('[Inspector] Error closing inspector', error as Error);
    }
  }
}

/**
 * Inject the inspector content script into the page
 */
async function injectInspectorScript(): Promise<void> {
  if (!inspectorWindow || inspectorWindow.isDestroyed()) return;

  const script = `
    (function() {
      console.log('[Inspector] Injecting inspector script');

      let selectedElement = null;
      let highlightOverlay = null;
      let infoBox = null;

      // Create highlight overlay
      function createHighlightOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'inspector-highlight-overlay';
        overlay.style.position = 'absolute';
        overlay.style.border = '3px solid #3B82F6';
        overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'none';
        overlay.style.transition = 'all 0.1s ease';
        document.body.appendChild(overlay);
        return overlay;
      }

      // Create info box to show selector
      function createInfoBox() {
        const box = document.createElement('div');
        box.id = 'inspector-info-box';
        box.style.position = 'fixed';
        box.style.bottom = '20px';
        box.style.right = '20px';
        box.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        box.style.color = 'white';
        box.style.padding = '12px 16px';
        box.style.borderRadius = '8px';
        box.style.fontFamily = 'monospace';
        box.style.fontSize = '12px';
        box.style.zIndex = '9999999';
        box.style.maxWidth = '400px';
        box.style.wordBreak = 'break-all';
        box.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        box.innerHTML = '<strong style="color: #60A5FA;">Hover over elements to preview</strong><br><span style="color: #9CA3AF; font-size: 10px;">Click to select</span>';
        document.body.appendChild(box);
        return box;
      }

      highlightOverlay = createHighlightOverlay();
      infoBox = createInfoBox();

      // Generate optimal CSS selector for an element
      function generateSelector(element) {
        // Try ID first
        if (element.id) {
          return '#' + CSS.escape(element.id);
        }

        // Try unique class combination
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\\s+/).filter(c => c);
          if (classes.length > 0) {
            const classSelector = '.' + classes.map(c => CSS.escape(c)).join('.');
            if (document.querySelectorAll(classSelector).length === 1) {
              return classSelector;
            }
          }
        }

        // Build path from root
        const path = [];
        let current = element;

        while (current && current !== document.body) {
          let selector = current.tagName.toLowerCase();

          // Add nth-child if needed for uniqueness
          const parent = current.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              child => child.tagName === current.tagName
            );
            if (siblings.length > 1) {
              const index = siblings.indexOf(current) + 1;
              selector += ':nth-of-type(' + index + ')';
            }
          }

          path.unshift(selector);
          current = parent;
        }

        return path.join(' > ');
      }

      // Update highlight position
      function updateHighlight(element) {
        if (!highlightOverlay) return;

        const rect = element.getBoundingClientRect();
        highlightOverlay.style.top = (rect.top + window.scrollY) + 'px';
        highlightOverlay.style.left = (rect.left + window.scrollX) + 'px';
        highlightOverlay.style.width = rect.width + 'px';
        highlightOverlay.style.height = rect.height + 'px';
        highlightOverlay.style.display = 'block';
      }

      // Update info box with selector
      function updateInfoBox(element) {
        if (!infoBox) return;

        const selector = generateSelector(element);
        const matches = document.querySelectorAll(selector).length;
        const tag = element.tagName.toLowerCase();

        infoBox.innerHTML = \`
          <strong style="color: #60A5FA;">Hovering: &lt;\${tag}&gt;</strong><br>
          <span style="color: #34D399; margin-top: 4px; display: block;">\${selector}</span><br>
          <span style="color: #9CA3AF; font-size: 10px; margin-top: 4px; display: block;">Matches: \${matches} element(s)</span>
        \`;
      }

      // Hide highlight
      function hideHighlight() {
        if (highlightOverlay) {
          highlightOverlay.style.display = 'none';
        }
        if (infoBox) {
          infoBox.innerHTML = '<strong style="color: #60A5FA;">Hover over elements to preview</strong><br><span style="color: #9CA3AF; font-size: 10px;">Click to select</span>';
        }
      }

      // Mouse move handler - show preview
      document.addEventListener('mousemove', (e) => {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (element && element !== highlightOverlay && element !== infoBox) {
          updateHighlight(element);
          updateInfoBox(element);
        }
      }, true);

      // Mouse leave handler
      document.addEventListener('mouseleave', () => {
        hideHighlight();
      });

      // Click handler - select element
      document.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || element === highlightOverlay || element === infoBox) return false;

        selectedElement = element;
        const selector = generateSelector(element);

        console.log('[Inspector] Selected element:', element);
        console.log('[Inspector] Generated selector:', selector);

        // Verify selector works
        const matches = document.querySelectorAll(selector);
        console.log('[Inspector] Selector matches', matches.length, 'elements');

        // Show selection feedback
        if (infoBox) {
          infoBox.innerHTML = \`
            <strong style="color: #34D399;">✓ Selected!</strong><br>
            <span style="color: #60A5FA; margin-top: 4px; display: block;">\${selector}</span><br>
            <span style="color: #9CA3AF; font-size: 10px; margin-top: 4px; display: block;">Matches: \${matches} element(s)</span>
          \`;
          setTimeout(() => {
            if (infoBox) {
              infoBox.innerHTML = '<strong style="color: #60A5FA;">Hover over elements to preview</strong><br><span style="color: #9CA3AF; font-size: 10px;">Click to select</span>';
            }
          }, 2000);
        }

        // Send selector back to main process via postMessage
        window.postMessage({
          type: 'INSPECTOR_SELECT',
          selector: selector,
          matchCount: matches.length
        }, '*');

        return false;
      }, true);

      console.log('[Inspector] Inspector script loaded successfully');
    })();
  `;

  try {
    // Inject main inspector script with timeout
    logInfo('[Inspector] Injecting main inspector script');
    await Promise.race([
      inspectorWindow.webContents.executeJavaScript(script),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Script injection timeout after 5s')), 5000)
      )
    ]);

    logInfo('[Inspector] Main script injected, setting up message bridge');

    // Listen for postMessage events and relay to main window
    await Promise.race([
      inspectorWindow.webContents.executeJavaScript(`
        window.addEventListener('message', (event) => {
          if (event.data.type === 'INSPECTOR_SELECT') {
            console.log('[Inspector Bridge] Received selector:', event.data.selector);
            // We can't use ipcRenderer directly, so we'll use a workaround
            // The main process will poll for selections via IPC
          }
        });

        // Store the last selected selector globally so main process can retrieve it
        window.__lastSelectedSelector = null;
        window.addEventListener('message', (event) => {
          if (event.data.type === 'INSPECTOR_SELECT') {
            window.__lastSelectedSelector = event.data.selector;
          }
        });
        true; // Return value to indicate success
      `),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Message bridge setup timeout after 3s')), 3000)
      )
    ]);

    logInfo('[Inspector] Message bridge set up, starting polling');

    // Poll for selector selections from the inspector window
    const checkForSelections = async () => {
      if (!inspectorWindow || inspectorWindow.isDestroyed()) return;

      try {
        const selector = await inspectorWindow.webContents.executeJavaScript('window.__lastSelectedSelector');
        if (selector && mainWindow && !mainWindow.isDestroyed()) {
          // Clear the stored selector
          await inspectorWindow.webContents.executeJavaScript('window.__lastSelectedSelector = null');
          // Send to main window
          mainWindow.webContents.send(IPC_CHANNELS.INSPECTOR_SELECT, selector);
          logInfo(`[Inspector] Sent selector to main window: ${selector}`);
        }
      } catch (err) {
        // Window might be destroyed, ignore
      }

      // Continue polling if window is still open
      if (inspectorWindow && !inspectorWindow.isDestroyed()) {
        setTimeout(checkForSelections, 500);
      }
    };

    // Start polling (don't await, let it run in background)
    checkForSelections();

    logInfo('[Inspector] Polling started successfully');

  } catch (error) {
    logError('[Inspector] Failed to inject inspector script', error as Error);
    throw error;
  }
}
