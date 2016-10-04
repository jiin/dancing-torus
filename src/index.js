import App from './App';

const app = new App();

window.onresize = app.onResize.bind(app);
window.onkeyup = app.onKeyUp.bind(app);
window.onmousemove = app.onMouseMove.bind(app);

document.getElementById('play').addEventListener('click', app.onPlayClick.bind(app), false);
document.getElementById('pause').addEventListener('click', app.onPauseClick.bind(app), false);
document.getElementById('change_song').addEventListener('click', app.onChangeSongClick.bind(app), false);