// Inline, render-blocking theme bootstrap: applies the stored theme class
// before first paint so a light-theme user never flashes dark (and vice
// versa). Dark is the brand default — only "light" is acted on.
const BOOTSTRAP = `try{if(localStorage.getItem("aurum-theme")==="light")document.documentElement.classList.add("light")}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />;
}
