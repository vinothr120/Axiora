(function () {
  var stored = localStorage.getItem("axiora.theme");
  var pref = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  var dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
})();
