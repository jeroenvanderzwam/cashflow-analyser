/**
 * app.js — Entry point. Wires file input → parse → analyse → render.
 */

document.addEventListener('DOMContentLoaded', () => {
  const fileInput   = document.getElementById('file-input');
  const errorBanner = document.getElementById('error-banner');

  fileInput.addEventListener('change', handleFilesChanged);

  // Auto-fetch all available years from the FastAPI server
  fetch('/api/years')
    .then(r => r.json())
    .then(years => Promise.all(years.map(y =>
      fetch(`/api/data/${y}`).then(r => r.text())
    )))
    .then(csvTexts => loadFromTexts(csvTexts))
    .catch(err => showError('Kon data niet laden: ' + err.message));

  function handleFilesChanged(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    errorBanner.hidden = true;

    Promise.all(files.map(readFileAsText))
      .then(csvTexts => loadFromTexts(csvTexts, files.map(f => f.name)))
      .catch(err => showError(err.message));
  }

  function loadFromTexts(csvTexts, fileNames) {
    const allTransactions = [];
    csvTexts.forEach((text, i) => {
      try {
        allTransactions.push(...parseCSV(text));
      } catch (err) {
        const name = fileNames ? fileNames[i] : 'server data';
        throw new Error(`Fout in "${name}": ${err.message}`);
      }
    });

    if (allTransactions.length === 0) {
      throw new Error('Geen transacties gevonden.');
    }

    renderApp(analyse(allTransactions));
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Kan bestand niet lezen: ' + file.name));
      reader.readAsText(file, 'UTF-8');
    });
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.hidden = false;
    console.error(msg);
  }
});
