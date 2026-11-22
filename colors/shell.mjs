if (location.protocol === 'https:' || location.protocol === 'http:') {
  for (const form of document.querySelectorAll('[data-web-logout]')) {
    form.hidden = false;
  }
}
