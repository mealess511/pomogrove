const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('pomogrove', {
  platform: process.platform,
  version: '1.1.0',
  minimize: () => invoke('window:minimize'),
  toggleMaximize: () => invoke('window:toggle-maximize'),
  close: () => invoke('window:close'),
  setAlwaysOnTop: (value) => invoke('window:set-always-on-top', Boolean(value)),
  setMiniMode: (value) => invoke('window:set-mini-mode', Boolean(value)),
  setCloseToTray: (value) => invoke('window:set-close-to-tray', Boolean(value)),
  setAutoLaunch: (value) => invoke('app:set-auto-launch', Boolean(value)),
  setKeepAwake: (value) => invoke('app:set-keep-awake', Boolean(value)),
  notify: (payload) => invoke('app:notify', payload),
  setProgress: (value) => invoke('app:set-progress', value),
  updateTimerState: (state) => ipcRenderer.send('app:timer-state', state),
  neteasePlaylist: (id) => invoke('music:netease-playlist', id),
  neteaseStream: (songId) => invoke('music:netease-stream', songId),
  onTrayToggle: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('tray:toggle', listener);
    return () => ipcRenderer.removeListener('tray:toggle', listener);
  },
  onWindowState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('window:state', listener);
    return () => ipcRenderer.removeListener('window:state', listener);
  },
});
