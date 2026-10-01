(function () {
  const navToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.querySelector('.toggle-label').textContent = isOpen ? 'Fermer' : 'Menu';
      document.body.classList.toggle('menu-open', isOpen);
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.querySelector('.toggle-label').textContent = 'Menu';
        document.body.classList.remove('menu-open');
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.querySelector('.toggle-label').textContent = 'Menu';
        document.body.classList.remove('menu-open');
        navToggle.focus();
      }
    });
  }

  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const status = contactForm.querySelector('.form-status');
      if (!contactForm.checkValidity()) return;
      status.textContent = 'Votre logiciel de messagerie va s’ouvrir. Votre message ne sera envoyé qu’après votre confirmation dans celui-ci.';
      const name = encodeURIComponent(contactForm.querySelector('#name').value);
      const email = encodeURIComponent(contactForm.querySelector('#email').value);
      const topic = encodeURIComponent(contactForm.querySelector('#subject').value);
      const message = encodeURIComponent(contactForm.querySelector('#message').value);
      const recipient = document.querySelector('[data-email]').getAttribute('href');
      window.location.href = `${recipient}?subject=${topic}%20depuis%20le%20site%20-%20${name}&body=Nom%20:%20${name}%0AEmail%20:%20${email}%0A%0A${message}`;
    });
  }
})();
