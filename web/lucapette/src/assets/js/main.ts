const toggle = document.getElementById("toggle");

if (toggle) {
  toggle.addEventListener("click", function (e) {
    e.preventDefault();
    const newTheme =
      localStorage.getItem("theme") === "light" ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
    document.documentElement.style.setProperty("color-scheme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  });
}

document.querySelectorAll("pre[class*='language-']").forEach((pre) => {
  const htmlPre = pre as HTMLElement;
  htmlPre.classList.add("line-numbers");

  const code = htmlPre.querySelector("code");
  if (!code) return;
  const lines = code.textContent.split("\n");
  const lineNumbersWrapper = document.createElement("span");
  lineNumbersWrapper.className = "line-numbers-rows";
  lineNumbersWrapper.setAttribute("aria-hidden", "true");

  lines.forEach(() => {
    const span = document.createElement("span");
    lineNumbersWrapper.appendChild(span);
  });

  code.appendChild(lineNumbersWrapper);

  const copyButton = document.createElement("button");
  copyButton.className = "copy-code";
  copyButton.textContent = "copy";

  function copyingDone() {
    copyButton.textContent = "copied!";
    setTimeout(() => {
      copyButton.textContent = "copy";
    }, 2000);
  }

  copyButton.addEventListener("click", () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code.textContent || "");
      copyingDone();
    } else {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        try {
            //TODO remove deprecated execCommand
          document.execCommand("copy");
          copyingDone();
        } catch (e) {
          // Ignore errors
        }
        selection.removeAllRanges();
      }
    }
  });

  htmlPre.style.position = "relative";
  htmlPre.appendChild(copyButton);
});

const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const navMenu = document.getElementById("nav-menu");

if (mobileMenuToggle && navMenu) {
  mobileMenuToggle.addEventListener("click", function () {
    const isOpen = navMenu.classList.contains("is-open");
      navMenu.classList.toggle("is-open");
    mobileMenuToggle.setAttribute("aria-expanded", String(!isOpen));
  });
}

console.info(
  " 👋👋👋\n Grab the code here: https://github.com/lucapette/web/tree/main/main\n 👋👋👋",
);
