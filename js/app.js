/**
 * app.js — Entry point. Wires file input → parse → analyse → render.
 */

document.addEventListener('DOMContentLoaded', () => {
  const fileInput   = document.getElementById('file-input');
  const errorBanner = document.getElementById('error-banner');

  fileInput.addEventListener('change', handleFilesChanged);

  // Auto-load default data if available (js/default-data.js defines DEFAULT_CSV)
  if (typeof DEFAULT_CSV !== 'undefined') {
    loadFromTexts([DEFAULT_CSV]);
  }

  function handleFilesChanged(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    errorBanner.hidden = true;

    Promise.all(files.map(readFileAsText))
      .then(csvTexts => loadFromTexts(csvTexts, files.map(f => f.name)))
      .catch(err => {
        errorBanner.textContent = err.message;
        errorBanner.hidden = false;
        console.error(err);
      });
  }

  function loadFromTexts(csvTexts, fileNames) {
    const allTransactions = [];
    csvTexts.forEach((text, i) => {
      try {
        allTransactions.push(...parseCSV(text));
      } catch (err) {
        const name = fileNames ? fileNames[i] : 'standaard data';
        throw new Error(`Fout in "${name}": ${err.message}`);
      }
    });

    if (allTransactions.length === 0) {
      throw new Error('Geen transacties gevonden in de geselecteerde bestanden.');
    }

    renderApp(analyse(allTransactions));
  }

  /**
   * Wrap FileReader in a Promise.
   * @param {File} file
   * @returns {Promise<string>}
   */
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Kan bestand niet lezen: ' + file.name));
      reader.readAsText(file, 'UTF-8');
    });
  }
});
