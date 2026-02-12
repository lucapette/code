import { MouseEvent, useEffect, useState } from "react";

function NavLink({ title, id }: { title: string; id: string }) {
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    window.history.pushState({}, "", `#${id}`);
    window.dispatchEvent(new PopStateEvent("hash-changed"));

    const top =
      (document.getElementById(id)?.getBoundingClientRect().top || 0) +
      window.pageYOffset -
      70;
    window.scroll({
      top,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const onLocationChange = () => setCurrentHash(window.location.hash);

    window.addEventListener("hash-changed", onLocationChange);

    return () => window.removeEventListener("hash-changed", onLocationChange);
  }, []);

  const isActive = (id: string) => {
    const hash = currentHash;

    if (hash === "") {
      return `#${id}` === "#buy";
    }

    return hash === `#${id}`;
  };

  return (
    <a
      className={`navbar-item ${isActive(id) ? "is-active" : ""}`}
      href={`#${id}`}
      onClick={onClick}
      data-toc={id}
    >
      {title}
    </a>
  );
}

function Header() {
  return (
    <nav
      className="navbar is-fixed-top"
      role="navigation"
      aria-label="main navigation"
    >
      <div className="navbar-brand">
        <a
          role="button"
          className="navbar-burger burger"
          aria-label="menu"
          aria-expanded="false"
          data-target="navbarPrimary"
          onClick={() =>
            document
              .querySelectorAll(".navbar-menu, .burger")
              .forEach((el) => el.classList.toggle("is-active"))
          }
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>

      <div className="navbar-menu">
        <div className="navbar-start">
          <NavLink title="Buy" id="buy" />
          <NavLink title="Table of contents" id="toc" />
          <NavLink title="About the author" id="about" />
        </div>
      </div>
    </nav>
  );
}

export default Header;
