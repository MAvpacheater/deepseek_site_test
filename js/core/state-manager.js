// 📦 State Manager - Централізоване управління станом (вже існує як app-state.js)
// Цей файл є аліасом до app-state.js для сумісності з новою структурою

// Імпортувати AppState з app-state.js
// (у реальному проекті це буде import, але тут просто посилання)

console.log('ℹ️ state-manager.js - using AppState from app-state.js');

// Експортувати для сумісності
if (window.appState) {
    window.stateManager = window.appState;
    console.log('✅ State Manager initialized (alias to AppState)');
}
