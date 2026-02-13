import {
  createIcons,
  Mail,
  Twitter,
  Linkedin,
  Github,
  Moon,
  Sun,
} from "lucide";

createIcons({
  icons: {
    Mail,
    Twitter,
    Linkedin,
    Github,
    Moon,
    Sun,
  },
});

const toggle = document.getElementById("toggle");

if (toggle) {
  toggle.addEventListener("click", function (e) {
    e.preventDefault();
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      localStorage.getItem("theme") === "light" ? "dark" : "light",
    );
  });
}

document.querySelectorAll("pre[class*='language-']").forEach((pre) => {
  pre.classList.add("line-numbers");

  const code = pre.querySelector("code");
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
      navigator.clipboard.writeText(code.textContent);
      copyingDone();
    } else {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        document.execCommand("copy");
        copyingDone();
      } catch (e) {}
      selection.removeAllRanges(range);
    }
  });

  pre.style.position = "relative";
  pre.appendChild(copyButton);
});

console.info(
  " 👋👋👋\n Grab the code here: https://github.com/lucapette/web/tree/main/main\n 👋👋👋",
);
