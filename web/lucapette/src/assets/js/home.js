const scrollDivider = document.querySelector('.scroll-divider');
const whoWheAre = document.querySelector('.who-we-are');
const scrollArrow = document.querySelector('.scroll-arrow');

if (scrollDivider && whoWheAre && scrollArrow) {
  let isScrolledDown = false;

  function updateArrowDirection() {
    const whoWheAreTop = whoWheAre.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;

    const newIsScrolledDown = whoWheAreTop < windowHeight * 0.5;

    if (newIsScrolledDown !== isScrolledDown) {
      isScrolledDown = newIsScrolledDown;
      scrollArrow.classList.toggle('scrolled-down', isScrolledDown);
    }
  }

  function ease(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  }

  function smoothScrollTo(targetPosition) {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1200;
    let start = null;

    function animation(currentTime) {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const run = ease(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    requestAnimationFrame(animation);
  }

  scrollDivider.addEventListener('click', () => {
    const targetPosition = isScrolledDown ? 0 : whoWheAre.offsetTop;
    smoothScrollTo(targetPosition);
  });

  window.addEventListener('scroll', updateArrowDirection, { passive: true });

  updateArrowDirection();
}