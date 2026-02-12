import { Mail, Linkedin } from "lucide-react";

function Footer() {
  return (
    <footer className="footer">
      <nav className="level">
        <div className="level-left">
          <div className="level-item">
            <div className="content">
              Built with 🧡 by <a href="http://lucapette.me">Luca Pette</a>
            </div>
          </div>
        </div>

        <div className="level-right">
          <div className="level-item">
            <a href="mailto:ciao@lucapette.me">
              <span className="has-text-black">
                <Mail aria-hidden={true} />
                <span className="sr-only">Email</span>
              </span>
            </a>
          </div>
          <div className="level-item">
            <a href="https://www.linkedin.com/in/lucapette/">
              <span className="has-text-black">
                <Linkedin aria-hidden={true} />
                <span className="sr-only">LinkedIn</span>
              </span>
            </a>
          </div>
        </div>
      </nav>
    </footer>
  );
}

export default Footer;
