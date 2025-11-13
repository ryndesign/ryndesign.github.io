// season-loader.js
(function () {
  const params = new URLSearchParams(window.location.search);
  const season = Number(params.get("s") || "1");

  // Store which season was requested (optional, but handy)
  window.PP_SEASON_PARAM = season;

  // Flags used by main.js
  window.PP_PUZZLES_READY = false;

  // Create script tag for the correct puzzles file
  const script = document.createElement("script");

  // Do not rely on defer for dynamic scripts, use onload
  script.async = true;

  if (season === 1) {
    script.src = "puzzles-1.js";
  } else if (season === 2) {
    script.src = "puzzles-2.js";
  } else if (season === 3) {
    script.src = "puzzles-3.js";
  } else {
    // Fallback if unknown season
    script.src = "puzzles-1.js";
  }

  script.onload = function () {
    window.PP_PUZZLES_READY = true;
    if (typeof window.PP_BOOTSTRAP === "function") {
      window.PP_BOOTSTRAP();
    }
  };

  script.onerror = function () {
    console.error("Failed to load puzzles file:", script.src);
    window.PP_PUZZLES_READY = true; // let boot happen so we can at least show an error
    if (typeof window.PP_BOOTSTRAP === "function") {
      window.PP_BOOTSTRAP();
    }
  };

  document.head.appendChild(script);
})();