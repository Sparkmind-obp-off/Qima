/*
 * QIMA bootstrap shell client script.
 *
 * Traceability: doc 07 §"Loading/error/empty states" — the shell must represent
 * loading, success, and error states explicitly.
 *
 * No business logic and no authorization decisions live here
 * (doc 08 §20: UI visibility is never an authorization boundary).
 */

(function initBootstrapHealthProbe() {
  'use strict';

  var output = document.getElementById('health-output');
  if (!output) {
    return;
  }

  function setState(className, message) {
    output.className = className;
    output.textContent = message;
  }

  fetch('/api/v1/health', { headers: { accept: 'application/json' } })
    .then(function handleResponse(response) {
      if (!response.ok) {
        throw new Error('unexpected status ' + response.status);
      }
      return response.json();
    })
    .then(function handleBody(body) {
      if (body && body.ok === true && body.data && body.data.status === 'ok') {
        setState('state-success', 'API siap — environment: ' + body.data.environment);
        return;
      }
      setState('state-error', 'API merespons namun status tidak sehat.');
    })
    .catch(function handleError() {
      setState('state-error', 'API tidak dapat dihubungi.');
    });
})();
