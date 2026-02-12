import Footer from "./Footer";
import Header from "./Header";

import cover from "./assets/cover.webp";
import me from "./assets/me.webp";

import Toc from "./Toc";

function App() {
  let bookLink = "https://gum.co/leading-developers";
  const urlSearchParams = new URLSearchParams(window.location.search);

  if (urlSearchParams.has("discount")) {
    bookLink = `${bookLink}/${urlSearchParams.get("discount")}`;
  }
  return (
    <>
      <Header />
      <section className="section">
        <div className="columns">
          <div className="column is-two-thirds">
            <div className="content">
              <h1 id="buy" className="is-size-1 is-size-3-mobile title">
                Leading developers
              </h1>

              <p>Hi! 👋</p>
              <p>
                <em className="accent">Leading developers</em> is a short book
                about engineering management.
              </p>
              <p>
                Why <em>another</em> engineering management book? I'm glad you
                asked!
              </p>
              <p>Here's why I wrote this book:</p>
              <ul>
                <li>
                  Most books out there cover leadership in the context of a
                  larger organisation where leaders operate within an existing
                  leadership framework. The goal of my book is to help you build{" "}
                  <strong>your own leadership framework</strong>.
                </li>
                <li>
                  I wanted to write a book centred around the ideas that I saw
                  work many times in my career. Spoiler alert: it's all about
                  the <strong>people</strong>.
                </li>
                <li>
                  I <em>love</em> writing. Yes, I know. Nothing to do with
                  leadership on the surface. Great leadership means{" "}
                  <strong>great writing skills</strong>, too. I dwell on written
                  communication in the book for quite some time and I hope my
                  love for writing is contagious.
                </li>
              </ul>
              <h2 className="is-size-2 is-size-3-mobile">Who is this for?</h2>
              <p>
                The ideal reader is an early-stage startup CTO/Head of
                Engineering.
              </p>

              <p>
                I believe my book is the ideal first engineering leadership
                book, so if you're looking to start leading teams, I got you
                covered.
              </p>

              <p>
                If you're not sure this book is for you, check out the{" "}
                <a href="https://book.leadthe.dev">online</a> version. It's free
                🎉
              </p>
            </div>
          </div>
          <div className="column">
            <div className="sell">
              <div className="book-container">
                <div className="book-area">
                  <div className="book">
                    <img
                      width="300px"
                      height="478px"
                      src={cover}
                      alt="cover of the book"
                    />
                  </div>
                </div>
              </div>
              <div className="buttons cta">
                <a className="button is-success" href={bookLink}>
                  Buy ($15.00)
                </a>
                <a href="https://book.leadthe.dev" className="button">
                  Read online
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="content">
          <h2 id="toc" className="is-size-2 is-size-3-mobile">
            Table of contents
          </h2>

          <Toc />

          <h2 id="about" className="is-size-2 is-size-3-mobile">
            About the author
          </h2>
          <figure className="image is-128x128">
            <img src={me} width="128" height="128" alt="Luca Pette's avatar" />
          </figure>

          <p>
            My name is Luca Pette (and I look like this 👆 everywhere online).
            You can find more information about me on my{" "}
            <a href="https://lucapette.me">website</a>.
          </p>

          <p>Feel free to reach out with any questions about the book!</p>
        </div>
      </section>
      <Footer />
    </>
  );
}

export default App;
