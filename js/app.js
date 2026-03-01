/**
 * app.js — Entry point. Wires file input → parse → analyse → render.
 */

document.addEventListener('DOMContentLoaded', () => {
  const fileInput   = document.getElementById('file-input');
  const errorBanner = document.getElementById('error-banner');

  fileInput.addEventListener('change', handleFilesChanged);

  function handleFilesChanged(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    errorBanner.hidden = true;

    // Read all files in parallel, then analyse together
    const readers = files.map(file => readFileAsText(file));

    Promise.all(readers)
      .then(csvTexts => {
        // Parse each CSV, merge all transactions
        const allTransactions = [];
        csvTexts.forEach((text, i) => {
          try {
            const txs = parseCSV(text);
            allTransactions.push(...txs);
          } catch (err) {
            throw new Error(`Fout in bestand "${files[i].name}": ${err.message}`);
          }
        });

        if (allTransactions.length === 0) {
          throw new Error('Geen transacties gevonden in de geselecteerde bestanden.');
        }

        const yearlyOverviews = analyse(allTransactions);
        renderApp(yearlyOverviews);
      })
      .catch(err => {
        errorBanner.textContent = err.message;
        errorBanner.hidden = false;
        console.error(err);
      });
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
