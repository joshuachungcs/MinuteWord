// bibleVerseApp.js

let font;
let referenceFont; // <<< NEW: Variable for the reference text font
let vehicles = []; // Array for the original 'Vehicle' effect
let textParticles = []; // Array for the new 'TextParticle' effect
let currentEffect = 'vehicle'; // Start with the vehicle effect ('vehicle' or 'textParticle')

let formattedTime = "00:00"; // Still needed for static display
let prevMinute = -1;
let prevDay = -1; // <<< NEW: To track day changes for holiday check
let maxChangeForce = 10; // Keep particle effect force for vehicles

// bibleData and timeToVerseMap will be populated asynchronously
let bibleData = {};
//let timeToVerseMap = {};
let timeVerseOptionsData = {}; // <<< NEW: To store loaded options map
let currentVerse = "";
let currentEnVerse = "";
let currentBookName = "";
let currentBookNumber = '1';
let currentChapter = '1';
let currentVerseNumber = '1';
let isDisplayingQuote = false; // <<< NEW: Flag to track if current display is a quote
let isLoading = true; // Flag to indicate if data is still loading
let transitionAlphaMultiplier = 1.0; // Controls particle alpha during transition (1 = fully visible, 0 = invisible)

// --- Configuration ---
let fontPath = 'LXGWWenKaiTC-Regular.ttf';
let referenceFontPath = 'NotoSansTC-Regular.ttf';
// NEW: Define Bible versions to load
const bibleVersionsToLoad = [
  { key: 'Union', path: 'bibles_csv/ZH-Chinese/chinese_union_trad.csv' },
  { key: 'CKJV', path: 'bibles_csv/ZH-Chinese/ckjv_sdt.csv' },
  { key: 'ASV', path: 'bibles_csv/EN-English/asv.csv' },
  { key: 'KJV', path: 'bibles_csv/EN-English/kjv.csv' },
  { key: 'WEB', path: 'bibles_csv/EN-English/web.csv' }
];
let defaultChBibleVersion = 'Union'; // The version to use for mapping and initial display
let defaultEnBibleVersion = 'KJV'; // The default English version to use
let currentChBibleVersion = defaultChBibleVersion; // The currently active version
let currentEnBibleVersion = defaultEnBibleVersion; // The currently active version
let palettesJSONPath = 'palettes.json'; // Path to your palettes file
let verseOptionsMapPath = 'time_verse_mapping.json'; // <<< NEW: Path to the options map

// --- Particle Text Configuration ---
// These will be dynamically calculated but provide base ratios/defaults
let baseVerseFontSizeRatio = 1 / 25; // Ratio of width for verse font size
let baseReferenceFontSizeRatio = 1 / 15; // Ratio of width for reference font size
let minFontSize = 12; // Minimum font size
let particleSampleFactor = 0.13; // Shared sample factor for density
let fillSamplingDensity = 2; // <<< NEW: Check every Nth pixel for filling (lower = denser)
const outlineSampleFactor = 0.25; // Sample factor for textToPoints (higher = fewer outline points)
let referencePadding = 5; // Padding from bottom for reference text block
let versePadding = 5; // Padding between verse and reference (used indirectly)
let textBlockMaxWidthRatio = 0.8; // Max width of text block as ratio of screen width
let verseLineHeightFactor = 0.8; // Line height multiplier for verse
let referenceLineHeightFactor = 1.2; // Line height multiplier for reference
let verseSpacing = 10; // <<< NEW: Spacing between Chinese and English verses
let showText = false;

// --- TextParticle Specific Config --- (Adapted from textParticle.js)
const textParticleImpactRange = 40; // How close mouse needs to be to affect TextParticles
const textParticleBaseRadius = 1.5; // Base size of TextParticles

// --- Color Transition & Palette Config ---
let allPalettesData; // To store loaded palettes
let paletteCount = 0; // <<< NEW: Variable to store the count explicitly
let colorPalette = []; // Will hold the *selected* palette's p5.color objects
let nextColorPalette = []; // <<< Not currently used, but kept for potential future use
let startColor;
let endColor;
let verseColor; // Color used for particles
let overlayTextColor; // Color used for static text overlay
let paletteIndex = 0;

// --- Background Color Transition ---
let startBackgroundColorCycle; // Bg color at the START of the full particle palette cycle
let targetBackgroundColor;     // Bg color (lightest) to reach at the END of the full cycle
let gradientTopColor;          // Interpolated top color for *background* gradient
let gradientBottomColor;       // Interpolated bottom color for *background* gradient

// --- Background Noise Configuration ---
const noiseDensity = 3000; // How many noise particles per frame
const noiseScale = 0.001;   // How coarse/fine the noise pattern is
const noiseTimeScale = 0.005; // How fast the noise pattern evolves
const noiseAlphaMax = 30;    // Maximum alpha for noise particles (lower = more subtle/blurry)
const noiseSizeMax = 100;       // Size of the noise particles (ellipses)
const noiseSizeMin = 2;       // Minimum size of the noise particles
let noiseParticles = []; // Array to hold persistent noise particles
// --- NEW: Noise Fade Configuration ---
const noiseFadeSpeed = 0.03; // How quickly noise particles lerp visibility (0-1)
const noiseMinVisibleDuration = 2000; // ms - Minimum time a noise particle stays visible/invisible
const noiseMaxVisibleDuration = 8000; // ms - Maximum time a noise particle stays visible/invisible

// --- Contrast Adjustment ---
const MIN_BRIGHTNESS_DIFFERENCE = 35; // Minimum brightness difference required (0-100)
const CONTRAST_ADJUSTMENT_FACTOR = 0.5; // How much to lighten bg / darken particles (0.0 to 1.0)
const OVERLAY_CONTRAST_FACTOR = 0.8; // How much to lerp particle color towards white/black for overlay

// --- Analog Clock Configuration (Kept but unused in current particle/text setup) ---
// let clockHandAlpha = 50;
// let secondHandColor;
// const clockPointSpacing = 6;

// --- Transition State ---
let isTransitioning = false;
let isParticleSettling = false;     // Particles moving to new targets (text invisible)
let isTextFadingIn = false;         // Text fading in after particles settled
let transitionStartTime = 0;
let particleSettleStartTime = 0;    // Timestamp when particle settling begins
let textFadeInStartTime = 0;        // Timestamp when text fade-in begins
const transitionDuration = 4000;      // Duration of the main particle fade out/in (ms)
const particleSettleDuration = 4000;  // Duration allowed for particles to reach targets (ms)
const textFadeInDuration = 5000;
// --- Holiday Data ---
let yearlyHolidayData = null; // Store the whole year's data from API
let todaysHolidayNames = []; // Store names of holidays for the current date
let upcomingHolidaysInfo = []; // <<< NEW: Store info about upcoming holidays [{offset, date, names}]
let lastHolidayFetchYear = -1; // Track the year for which data was fetched
// --- Weather Data --- <<< NEW SECTION START >>>
const weatherApiKey = 'df83d3cd942b8e79679ec129be0e3476'; // <<< --- PASTE YOUR OpenWeatherMap API KEY HERE --- >>>
const weatherCity = 'New York, US'; // <<< --- CHANGE CITY (e.g., "London, UK", "Tokyo, JP") --- >>>
// OR use coordinates:
// const weatherLat = 40.7128;
// const weatherLon = -74.0060;
const weatherUnits = 'imperial'; // 'metric' for Celsius, 'imperial' for Fahrenheit
const weatherUpdateInterval = 10 * 60 * 1000; // Update every 60 minutes (in milliseconds)
let currentWeatherData = null; // To store the fetched weather JSON object
let weatherIconImage = null; // To store the loaded p5.Image for the icon
let lastWeatherUpdateTime = 0; // Track the last update time
// --- Preload, Setup, Loading/Error Display ---
// --- Add near top with other global variables ---
let backgroundGraphics;
let lastGradientTopColorStr = ""; // To track color changes
let lastGradientBottomColorStr = "";

function preload() {
  font = loadFont(fontPath,
    () => { console.log(`Font '${fontPath}' loaded successfully.`); },
    (err) => { console.error(`Error loading font '${fontPath}':`, err); }
  );
  // <<< NEW: Load reference font >>>
  referenceFont = loadFont(referenceFontPath,
    () => { console.log(`Reference font '${referenceFontPath}' loaded successfully.`); },
    (err) => {
      console.error(`Error loading reference font '${referenceFontPath}':`, err);
      referenceFont = null; // Set to null if loading fails
      console.warn("Reference font failed to load. Will fallback to main font.");
    }
  );
  allPalettesData = loadJSON(palettesJSONPath,
    (loadedData) => { console.log(`Palettes '${palettesJSONPath}' loaded successfully. Length: ${loadedData.length}`); paletteCount = loadedData.length; },
    (err) => {
      console.error(`Error loading palettes '${palettesJSONPath}':`, err);
      allPalettesData = [
        ["0xffCC5D4C", "0xffFFFEC6", "0xffC7D1AF", "0xff96B49C", "0xff5B5847"] // Default dark + colors
      ];
      console.warn("Using default color palette.");
      paletteCount = allPalettesData.length;
    }
  );
  // <<< NEW: Load the verse options map >>>
  timeVerseOptionsData = loadJSON(verseOptionsMapPath,
    (loadedMap) => { console.log(`Verse options map '${verseOptionsMapPath}' loaded successfully. Keys: ${Object.keys(loadedMap).length}`); },
    (err) => {
      console.error(`Error loading verse options map '${verseOptionsMapPath}':`, err);
      timeVerseOptionsData = null; // Indicate failure
    }
  );
}

// --- Color Helper Functions (hex0xffToRgb, findLightestAndOthers, adjustColorsForContrast) ---
function hex0xffToRgb(hexString) {
  if (typeof hexString !== 'string' || !hexString.startsWith('0xff')) return null;
  const hexColor = hexString.substring(4);
  if (hexColor.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hexColor)) return null;
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r: r, g: g, b: b };
}

function findLightestAndOthers(paletteArray) {
  // Convert hex strings to p5.Color objects if needed
  let p5Palette = paletteArray.map(item => {
    if (typeof item === 'string' && item.startsWith('0xff')) {
      const rgb = hex0xffToRgb(item);
      return rgb ? color(rgb.r, rgb.g, rgb.b) : null;
    } else if (item instanceof p5.Color) {
      return item; // Already a p5.Color
    }
    return null; // Invalid item
  }).filter(c => c !== null); // Remove nulls

  if (p5Palette.length === 0) {
    console.error("findLightestAndOthers: Palette is empty or contains only invalid colors.");
    return { lightest: null, others: [] };
  }

  let lightestColor = null;
  let highestScore = -1;
  let lightestIndex = -1;

  for (let i = 0; i < p5Palette.length; i++) {
    let currentColor = p5Palette[i];
    let currentBrightness = brightness(currentColor);
    let currentSaturation = saturation(currentColor);
    let currentScore = currentBrightness + (100 - currentSaturation); // Prioritize brightness, then low saturation

    if (currentScore > highestScore) {
      highestScore = currentScore;
      lightestColor = currentColor;
      lightestIndex = i;
    }
  }

  if (lightestColor === null) {
    console.warn("findLightestAndOthers: Could not determine lightest color.");
    return { lightest: p5Palette[0] || null, others: p5Palette.slice(1) }; // Fallback
  }

  const otherColors = p5Palette.filter((_, index) => index !== lightestIndex);

  return {
    lightest: lightestColor,
    others: otherColors
  };
}

function adjustColorsForContrast(lightestColor, otherColors) {
  if (!lightestColor || !(lightestColor instanceof p5.Color) || !Array.isArray(otherColors)) {
    console.warn("adjustColorsForContrast: Invalid input provided.");
    return { adjustedLightest: lightestColor || color(240), adjustedOthers: otherColors || [color(50)] };
  }

  let lightestBrightness = brightness(lightestColor);
  let needsAdjustment = false;

  for (let otherColor of otherColors) {
    if (otherColor instanceof p5.Color) {
      let otherBrightness = brightness(otherColor);
      if (abs(lightestBrightness - otherBrightness) < MIN_BRIGHTNESS_DIFFERENCE) {
        needsAdjustment = true;
        break;
      }
    }
  }

  if (needsAdjustment) {
    console.log(`Adjusting colors for contrast. Original bg brightness: ${lightestBrightness.toFixed(1)}`);
    let adjustedLightest = lerpColor(lightestColor, color(255), CONTRAST_ADJUSTMENT_FACTOR);
    console.log(` -> New bg brightness: ${brightness(adjustedLightest).toFixed(1)}`);
    let adjustedOthers = otherColors.map(c => {
      if (c instanceof p5.Color) {
        return lerpColor(c, color(0), CONTRAST_ADJUSTMENT_FACTOR);
      }
      return c;
    });
    return { adjustedLightest: adjustedLightest, adjustedOthers: adjustedOthers };
  } else {
    return { adjustedLightest: lightestColor, adjustedOthers: otherColors };
  }
}

// --- Helper to set default colors ---
function setDefaultColors() {
  console.warn("Setting default colors.");
  let defaultRawPalette = ["0xffCC5D4C", "0xffFFFEC6", "0xffC7D1AF", "0xff96B49C", "0xff5B5847"];
  let splitColor = findLightestAndOthers(defaultRawPalette);
  let { adjustedLightest, adjustedOthers } = adjustColorsForContrast(splitColor.lightest, splitColor.others);

  targetBackgroundColor = adjustedLightest; // || color(240);
  startBackgroundColorCycle = adjustedLightest; // || color(240);
  gradientTopColor = adjustedLightest;  // || color(240);
  gradientBottomColor = lerpColor(gradientTopColor, color(0), 0.35);

  colorPalette = adjustedOthers.length > 0 ? adjustedOthers : [color(250)];
  verseColor = lerpColor(gradientBottomColor, color(0), 0.05);
  overlayTextColor = lerpColor(verseColor, color(255), OVERLAY_CONTRAST_FACTOR); // Initial overlay color
}
// --- NEW: Helper Functions for Context Tags ---

/**
 * Generates a time-of-day tag based on the current hour.
 * @param {number} currentHour - The current hour (0-23).
 * @returns {string|null} - The time tag (e.g., "time:morning") or null.
 */
function getTimeOfDayTag(currentHour) {
  if (currentHour >= 5 && currentHour < 12) {
    return "time:morning";
  } else if (currentHour >= 12 && currentHour < 18) {
    // Using 'midday' as used in generate_mapping.js sample tags
    return "time:midday"; // Or "time:afternoon" if you prefer consistency elsewhere
  } else if (currentHour >= 18 && currentHour < 22) {
    return "time:evening";
  } else { // Covers 22, 23, 0, 1, 2, 3, 4
    return "time:night";
  }
}

/**
 * Generates holiday tags from the todaysHolidayNames array.
 * @returns {string[]} - An array of holiday tags (e.g., ["holiday:Christmas"]).
 */
function getHolidayTags() {
  if (!todaysHolidayNames || todaysHolidayNames.length === 0) {
    return [];
  }
  // Format names into tags: replace spaces with underscores, lowercase, prefix
  return todaysHolidayNames.map(name =>
    `holiday:${name.replace(/\s+/g, '_').toLowerCase()}`
  );
  // NOTE: Ensure these generated tags match the format used in your mapping JSON
  // Example: If JSON has "holiday:christmas", this needs to generate that.
  // The current generate_mapping.js uses lowercase snake_case like "holiday:rosh_hashanah"
  // Let's adjust to match that convention:
  // return todaysHolidayNames.map(name =>
  //   `holiday:${name.replace(/[\s\.]+/g, '_').toLowerCase()}` // More robust replacement
  // );
}


/**
 * Generates weather-related tags based on currentWeatherData.
 * Tries to map OpenWeatherMap data to the tags used in generate_mapping.js.
 * @returns {string[]} - An array of weather tags (e.g., ["weather:clear_day", "weather:warm"]).
 */
function getWeatherTags() {
  const tags = [];
  if (!currentWeatherData || !currentWeatherData.weather || currentWeatherData.weather.length === 0) {
    return tags; // No data, no tags
  }

  const weather = currentWeatherData.weather[0];
  const main = currentWeatherData.main;
  const wind = currentWeatherData.wind;
  const icon = weather.icon; // e.g., "01d", "10n"
  const id = weather.id; // Weather condition code

  // --- Map Condition ID/Main Description to Broad Categories ---
  // Ref: https://openweathermap.org/weather-conditions
  // Ref: generate_mapping.js sample tags: weather:calm, weather:stormy, weather:light, weather:darkness

  // Stormy conditions
  if (id >= 200 && id < 300) tags.push("weather:stormy"); // Thunderstorm
  if (id >= 900 && id <= 902) tags.push("weather:stormy"); // Extreme (tornado, hurricane)
  if (id === 960 || id === 961) tags.push("weather:stormy"); // Storm variants

  // Rain/Drizzle
  if (id >= 300 && id < 600) tags.push("weather:rain"); // Drizzle & Rain

  // Snow
  if (id >= 600 && id < 700) tags.push("weather:snow");

  // Atmosphere (Mist, Fog, Haze etc.)
  if (id >= 700 && id < 800) tags.push("weather:fog"); // Generalize atmosphere to fog

  // Clear
  if (id === 800) {
    tags.push("weather:clear");
    tags.push(icon.endsWith('d') ? "weather:light" : "weather:darkness"); // Map clear day/night
    tags.push(icon.endsWith('d') ? "weather:clear_day" : "weather:clear_night"); // More specific
  }

  // Clouds
  if (id > 800 && id < 900) {
    tags.push("weather:cloudy");
    // Could potentially add light/darkness based on cloud cover % + icon, but keep simple for now
    tags.push(icon.endsWith('d') ? "weather:cloudy_day" : "weather:cloudy_night");
    if (id === 801 || id === 802) tags.push("weather:partly_cloudy");
    else tags.push("weather:mostly_cloudy"); // 803, 804
  }

  // --- Add Calm/Windy ---
  if (wind && wind.speed !== undefined) {
    if (wind.speed < 5) { // Threshold for 'calm' (adjust as needed)
      tags.push("weather:calm");
    } else if (wind.speed > 15) { // Threshold for 'windy' (adjust as needed)
      tags.push("weather:windy");
    }
  } else {
    tags.push("weather:calm"); // Default to calm if no wind data
  }


  // --- Add Temperature Tags (Optional, based on units) ---
  if (main && main.temp !== undefined) {
    const temp = main.temp;
    if (weatherUnits === 'imperial') {
      if (temp > 85) tags.push("weather:hot");
      else if (temp > 65) tags.push("weather:warm");
      else if (temp < 40) tags.push("weather:cold");
      if (temp < 32) tags.push("weather:freezing");
    } else { // metric (Celsius)
      if (temp > 30) tags.push("weather:hot");
      else if (temp > 18) tags.push("weather:warm");
      else if (temp < 5) tags.push("weather:cold");
      if (temp < 0) tags.push("weather:freezing");
    }
  }

  // Add general day/night based on icon
  if (icon.endsWith('d')) tags.push("weather:day");
  else tags.push("weather:night");


  // Return unique tags
  return [...new Set(tags)];
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  //textFont(font);
  pixelDensity(1); // Optional: Ensure consistent pixel density

  // --- Create background buffer ---
  backgroundGraphics = createGraphics(width, height);
  backgroundGraphics.pixelDensity(1); // Match main canvas

  console.log("--- Start of setup() ---");

  // --- Select and Initialize FIRST Color Palette ---
  if (!allPalettesData || paletteCount === 0) {
    console.error("Palettes data is missing or empty! Using defaults.");
    setDefaultColors();
  } else {
    let randomIndex = floor(random(paletteCount));
    console.log("Selected Palette Index:", randomIndex);
    let selectedRawPalette = allPalettesData[randomIndex];

    if (!selectedRawPalette || selectedRawPalette.length === 0) {
      console.error(`Palette at index ${randomIndex} is invalid! Using defaults.`);
      setDefaultColors();
    } else {
      console.log("Initial Raw Selected Palette:", selectedRawPalette);
      let colorSplit = findLightestAndOthers(selectedRawPalette);

      if (!colorSplit.lightest || colorSplit.others.length === 0) {
        console.warn("Could not properly split initial palette. Using defaults.");
        setDefaultColors();
      } else {
        let { adjustedLightest, adjustedOthers } = adjustColorsForContrast(colorSplit.lightest, colorSplit.others);

        // Set initial background state
        startBackgroundColorCycle = adjustedLightest;
        targetBackgroundColor = adjustedLightest; // Start and target are the same initially
        gradientTopColor = adjustedLightest;
        gradientBottomColor = lerpColor(gradientTopColor, color(0), 0.35); // Derive bottom color

        // Set initial particle state
        verseColor = lerpColor(gradientBottomColor, color(0), 0.25);
        // Initialize particle color
        overlayTextColor = lerpColor(verseColor, color(255), OVERLAY_CONTRAST_FACTOR); // Initial overlay color

        console.log("Initial Background Target:", adjustedLightest.toString());
        console.log("Initial Particle Palette:", colorPalette.map(c => c.toString()));
      }
    }
  }

  // --- Initialize Noise Particles ---
  noiseParticles = []; // Clear any previous
  for (let i = 0; i < noiseDensity; i++) {
    noiseParticles.push(new NoiseParticle());
  }

  // --- Draw Initial Background ---
  // drawGradientBackground(gradientTopColor, gradientBottomColor);
  updateBackgroundGraphics(); // <<< NEW: Initial draw to buffer

  // --- Start Loading Process ---
  displayLoadingMessage("正在載入聖經數據...\nLoading Bible data...");
  loadAllBibles(); // <<< NEW function call
}
// --- NEW: Function to draw gradient to the buffer ---
function updateBackgroundGraphics() {
  if (!gradientTopColor || !gradientBottomColor) return; // Safety check

  const currentTopStr = gradientTopColor.toString();
  const currentBottomStr = gradientBottomColor.toString();

  // Only redraw if colors have actually changed
  if (currentTopStr !== lastGradientTopColorStr || currentBottomStr !== lastGradientBottomColorStr) {
    // console.log("Updating background graphics buffer"); // Optional log
    backgroundGraphics.push();
    backgroundGraphics.noFill();
    backgroundGraphics.noStroke(); // Ensure no stroke is inherited
    for (let y = 0; y < backgroundGraphics.height; y++) {
      let inter = map(y, 0, backgroundGraphics.height, 0, 1);
      let c = lerpColor(gradientTopColor, gradientBottomColor, inter);
      backgroundGraphics.stroke(c); // Use stroke for lines
      backgroundGraphics.line(0, y, backgroundGraphics.width, y);
    }
    backgroundGraphics.pop();

    lastGradientTopColorStr = currentTopStr;
    lastGradientBottomColorStr = currentBottomStr;
  }
}
// --- NEW: Function to load all Bible versions ---
function loadAllBibles() {
  isLoading = true;
  bibleData = {}; // Reset bible data

  const loadPromises = bibleVersionsToLoad.map(versionInfo => {
    return new Promise((resolve, reject) => {
      console.log(`Attempting to load: ${versionInfo.key} from ${versionInfo.path}`);
      loadTable(versionInfo.path, 'csv', 'header',
        (table) => { // Success callback
          console.log(`Successfully loaded table for: ${versionInfo.key}`);
          const processedData = processSingleBibleTable(table, versionInfo.key, versionInfo.path);
          if (processedData) {
            resolve({ key: versionInfo.key, data: processedData });
          } else {
            // Processing failed even though table loaded
            reject({ key: versionInfo.key, error: `Failed to process table data from ${versionInfo.path}` });
          }
        },
        (error) => { // Error callback
          console.error(`Error loading table for ${versionInfo.key} from ${versionInfo.path}:`, error);
          reject({ key: versionInfo.key, error: error }); // Reject with key and error info
        }
      );
    });
  });

  Promise.allSettled(loadPromises)
    .then(results => {
      let loadedVersions = [];
      let failedVersions = [];

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { key, data } = result.value;
          bibleData[key] = data; // Store processed data under its key
          loadedVersions.push(key);
          console.log(`Successfully processed and stored: ${key}`);
        } else {
          const { key, error } = result.reason;
          failedVersions.push(key);
          console.error(`Failed to load or process ${key}:`, error);
        }
      });

      console.log("--- Bible Loading Complete ---");
      console.log("Loaded versions:", loadedVersions);
      console.log("Failed versions:", failedVersions);

      // Check if any versions loaded successfully
      if (loadedVersions.length === 0) {
        displayError("錯誤：無法載入任何聖經版本。\nError: Could not load any Bible versions.");
        noLoop();
        return;
      }

      // Ensure the default/current version is one that actually loaded
      if (!bibleData[currentChBibleVersion]) {
        console.warn(`Default version '${currentChBibleVersion}' failed to load. Switching to first available Chinese version or first overall.`);
        // Try to find another Chinese version first
        const availableCh = loadedVersions.find(v => ['Union', 'CKJV'].includes(v));
        if (availableCh) {
          currentChBibleVersion = availableCh;
        } else {
          currentChBibleVersion = loadedVersions[0]; // Fallback to the very first loaded
        }
        console.log(` -> Now using: '${currentChBibleVersion}'`);
      }
      // Similar check for English default (though not actively used for mapping)
      if (!bibleData[currentEnBibleVersion]) {
        console.warn(`Default English version '${currentEnBibleVersion}' failed to load. Switching to first available English or first overall.`);
        const availableEn = loadedVersions.find(v => ['ASV', 'KJV', 'WEB'].includes(v));
        if (availableEn) {
          currentEnBibleVersion = availableEn;
        } else if (loadedVersions.length > 0 && currentChBibleVersion !== loadedVersions[0]) {
          // Avoid setting En to the same as Ch if possible
          currentEnBibleVersion = loadedVersions.find(v => v !== currentChBibleVersion) || loadedVersions[0];
        } else if (loadedVersions.length > 0) {
          currentEnBibleVersion = loadedVersions[0];
        }
        console.log(` -> Default English set to: '${currentEnBibleVersion}'`);
      }
      // Proceed with setup using the loaded data
      finishSetup();
    });
}

// --- NEW: Function to process a single loaded table ---
function processSingleBibleTable(table, versionKey, filePath) {
  console.log(`Processing table for: ${versionKey}`);
  if (!table || table.getRowCount() === 0) {
    console.error(`Loaded table for ${versionKey} (${filePath}) is invalid or empty.`);
    return null; // Indicate failure
  }

  const versionBibleData = {};
  const bookNumCol = "BookNumber", bookNameCol = "BookName", chapCol = "Chapter", verseCol = "Verse", textCol = "Text";

  // Basic check for required columns
  if (!table.getColumn(bookNumCol) || !table.getColumn(bookNameCol) || !table.getColumn(chapCol) || !table.getColumn(verseCol) || !table.getColumn(textCol)) {
    console.error(`Error: CSV for ${versionKey} (${filePath}) missing required columns:`, bookNumCol, bookNameCol, chapCol, verseCol, textCol);
    return null; // Indicate failure
  }

  let rowCount = 0;
  let processedCount = 0;
  try {
    for (let row of table.rows) {
      rowCount++;
      let bookNumStr = row.getString(bookNumCol)?.trim(); // <<< Get book number as string
      let bookName = row.getString(bookNameCol)?.trim().replace(/^"|"$/g, ''); // <<< Get book name for display
      // Use String() conversion *after* parsing to ensure consistency
      let chapterNum = parseInt(row.getString(chapCol)?.trim());
      let verseNum = parseInt(row.getString(verseCol)?.trim());
      let text = row.getString(textCol)?.trim().replace(/^"|"$/g, '');

      // Validate data before adding
      if (bookNumStr && bookName && !isNaN(chapterNum) && !isNaN(verseNum) && text !== undefined && text !== null) {
        let chapterStr = String(chapterNum);
        let verseStr = String(verseNum);

        // <<< Structure: versionBibleData[bookNumber][chapterNumber][verseNumber] = text >>>
        // <<< Also store bookName at the bookNumber level for easy lookup >>>
        if (!versionBibleData[bookNumStr]) {
          versionBibleData[bookNumStr] = { bookName: bookName }; // Store name here
        }
        if (!versionBibleData[bookNumStr][chapterStr]) {
          versionBibleData[bookNumStr][chapterStr] = {};
        }
        versionBibleData[bookNumStr][chapterStr][verseStr] = text;
        processedCount++;
      } else {
        // Optional: Log rows with parsing issues
        // console.warn(`Skipping row in ${versionKey} due to invalid data: BookNum='${bookNumStr}', Name='${bookName}', Chap='${chapterNum}', Verse='${verseNum}'`);
      }
    }
  } catch (e) {
    console.error(`Error processing CSV rows for ${versionKey} (${filePath}) at row approx ${rowCount}:`, e);
    return null; // Indicate failure during processing
  }

  console.log(`Finished processing ${versionKey}. ${processedCount} verses added from ${table.getRowCount()} rows. Found ${Object.keys(versionBibleData).length} books.`);
  if (Object.keys(versionBibleData).length === 0) {
    console.error(`Processing ${versionKey} table resulted in empty data.`);
    return null; // Indicate failure
  }
  return versionBibleData;
}

// --- NEW: Function called after all loading attempts are finished ---
function finishSetup() {
  console.log(`Finalizing setup using Bible version: ${currentChBibleVersion}`);
  //createVerseMapping(); // Create mapping based on the currentBibleVersion
  // <<< NEW: Check if the pre-generated map loaded >>>
  if (!timeVerseOptionsData || Object.keys(timeVerseOptionsData).length === 0) { // Check if null or empty
    console.error(`Failed to load or parse '${verseOptionsMapPath}'. Cannot proceed without mapping.`);
    displayError(`錯誤：缺少經文選項數據\nError: Missing verse options data ('${verseOptionsMapPath}')`);
    noLoop();
    return; // Stop setup
  }
  if (Object.keys(timeVerseOptionsData).length < 1440) {
    console.warn(`Warning: '${verseOptionsMapPath}' seems incomplete (expected 1440 keys, found ${Object.keys(timeVerseOptionsData).length}).`);
    // Proceed, but be aware some times might lack options.
  }
  console.log("Using pre-generated time-to-verse options map.");
  // The map is already loaded into timeVerseOptionsData, no need to call createVerseMapping

  isLoading = false;
  prevDay = day(); // <<< Initialize prevDay
  fetchHolidayData(); // <<< Fetch holiday data after setup is complete
  calcTime(); // Initial calculation and particle setup using the loaded data
  console.log("Setup complete after Bible load and processing.");
  // Optional: Start the main loop if it was stopped
  // loop();
}

function displayLoadingMessage(message) {
  // Use the calculated initial gradient for loading screen background
  if (gradientTopColor && gradientBottomColor) {
    drawGradientBackground(gradientTopColor, gradientBottomColor);
  } else {
    background(251); // Fallback solid color
  }
  fill(255); // White text for loading message
  textFont(font); // Use main font for loading message
  textSize(24);
  textAlign(CENTER, CENTER);
  text(message, width / 2, height / 2);
}

function displayError(message) {
  background(51); // Dark background for error
  fill(255, 0, 0); // Red text for error
  textFont(font); // Use main font for error message
  textSize(24);
  textAlign(CENTER, CENTER);
  text(message, width / 2, height / 2);
}

// --- NEW: Helper function to get book name from book number ---
function getBookName(version, bookNumber) {
  if (bibleData[version] && bibleData[version][bookNumber] && bibleData[version][bookNumber].bookName) {
    return bibleData[version][bookNumber].bookName;
  }
  console.warn(`Book name not found for version ${version}, number ${bookNumber}`);
  // Fallback: Try to find the name in the default English version if different
  if (version !== defaultEnBibleVersion && bibleData[defaultEnBibleVersion] && bibleData[defaultEnBibleVersion][bookNumber] && bibleData[defaultEnBibleVersion][bookNumber].bookName) {
    console.log(` -> Found name in default English version: ${defaultEnBibleVersion}`);
    return bibleData[defaultEnBibleVersion][bookNumber].bookName;
  }
  // Absolute fallback
  return `Book ${bookNumber}`;
}

// Modified getVerse to use the currentBibleVersion implicitly
function getVerse(bookNumber, chapter, verse) {  // Check if the current version's data exists
  if (!bibleData[currentChBibleVersion]) {
    console.error(`Verse lookup failed: Bible data for version '${currentChBibleVersion}' not loaded.`);
    return `版本 '${currentChBibleVersion}' 未載入 (Version '${currentChBibleVersion}' not loaded).`;
  }
  // Lookup within the specific version's data
  // if (bibleData[currentChBibleVersion][bookNumber] &&
  //   bibleData[currentChBibleVersion][bookNumber][chapter] &&
  //   bibleData[currentChBibleVersion][bookNumber][chapter][verse]) {
  if (bibleData[currentChBibleVersion][bookNumber]?.[chapter]?.[verse]) {
    return bibleData[currentChBibleVersion][bookNumber][chapter][verse];
  } else {
    console.warn(`Verse not found in getVerse: Version='${currentChBibleVersion}', Ref='${bookNumber}:${chapter}:${verse}'`);
    return "經文未找到 (Verse not found).";
  }
}

// <<< NEW: Function to get the English verse >>>
function getEnVerse(bookNumber, chapter, verse) {
  // Check if the current English version's data exists
  if (!bibleData[currentEnBibleVersion]) {
    console.error(`English Verse lookup failed: Bible data for version '${currentEnBibleVersion}' not loaded.`);
    return `(English version '${currentEnBibleVersion}' not loaded)`;
  }
  // Lookup within the specific English version's data
  if (bibleData[currentEnBibleVersion][bookNumber]?.[chapter]?.[verse]) {
    return bibleData[currentEnBibleVersion][bookNumber][chapter][verse];
  } else {
    console.warn(`English Verse not found: Version='${currentEnBibleVersion}', Ref='${bookNumber}:${chapter}:${verse}'`);
    return "(English verse not found)";
  }
}

// --- Function to Draw Background Gradient ---
function drawGradientBackground(topColor, bottomColor) {
  push();
  noFill();
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(topColor, bottomColor, inter);
    stroke(c);
    line(0, y, width, y);
  }
  noStroke();
  pop();
}

// --- NEW: Centralized Text Layout Calculation Function ---
/**
 * Calculates the layout for multi-line text within a bounding box.
 * Returns an array of objects, each containing the text line and its x, y position.
 *
 * @param {string} textString The text to lay out.
 * @param {number} targetFontSize The font size to use.
 * @param {number} blockX The starting X coordinate of the text block.
 * @param {number} blockY The starting Y coordinate of the text block.
 * @param {number} blockWidth The maximum width allowed for the text block.
 * @param {string} alignH Horizontal alignment ('left', 'center', 'right').
 * @param {string} alignV Vertical alignment ('top', 'center', 'bottom') relative to blockY.
 * @param {p5.Font} fontObject The p5.Font object to use for calculations. // <<< NEW
 * @param {number} [lineHeightFactor=1.2] Multiplier for line height (based on fontSize).
 * @param {string} [wrapMode='character'] How to wrap text: 'character' or 'word'.
 * @returns {{lines: Array<{text: string, x: number, y: number}>, totalHeight: number}}
 *          An object containing the array of line objects and the total calculated height.
 */
function calculateTextLayout(textString, targetFontSize, blockX, blockY, blockWidth, alignH, alignV, fontObject, lineHeightFactor = 1.2, wrapMode = 'character') { // <<< ADD fontObject parameter
  if (!fontObject) {
    console.error("calculateTextLayout called without a valid font object!");
    return { lines: [], totalHeight: 0 }; // Return empty layout
  }
  push(); // Isolate text settings
  textFont(fontObject); // <<< USE the provided font object
  textSize(targetFontSize);
  // Use textAscent() and textDescent() for more accurate line height, adjusted by factor
  let singleLineHeight = (textAscent() + textDescent()) * lineHeightFactor;

  // --- Word/Character Wrapping ---
  let units; // Can be words or characters
  if (wrapMode === 'word') {
    units = textString.split(' '); // Split by space for word wrapping
  } else { // Default or 'character' mode
    units = textString.split(''); // Split by character
  }

  let lines = [];
  let currentLine = '';

  if (textWidth(textString) <= blockWidth && !textString.includes('\n')) {
    // If the whole string fits and has no explicit newlines, use it as one line
    lines.push(textString);
  } else {
    // Otherwise, perform wrapping based on units
    for (let i = 0; i < units.length; i++) {
      let testUnit = units[i];

      // Handle potential line breaks in the source text explicitly
      if (testUnit === '\n') {
        lines.push(currentLine);
        currentLine = '';
        continue;
      }
      // Skip empty units resulting from multiple spaces in word wrap mode
      if (wrapMode === 'word' && testUnit.length === 0) {
        continue;
      }

      let testLine;
      if (wrapMode === 'word') {
        // Add space only if currentLine is not empty
        testLine = currentLine.length > 0 ? currentLine + ' ' + testUnit : testUnit;
      } else { // Character mode
        testLine = currentLine + testUnit; // testUnit is a single character
      }

      if (textWidth(testLine) > blockWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = testUnit; // Start new line with the current word/char
      } else {
        currentLine = testLine; // Add the word/char (and space if applicable) to the current line
      }
    }
    lines.push(currentLine); // Add the last line
  }


  // --- Calculate Vertical Positioning ---
  let totalTextBlockHeight = lines.length * singleLineHeight;
  let startY; // This will be the Y position of the *top* of the first line

  switch (alignV) {
    case 'center':
      // Align the center of the text block with blockY
      startY = blockY - totalTextBlockHeight / 2;
      break;
    case 'bottom':
      // Align the bottom of the text block with blockY
      startY = blockY - totalTextBlockHeight;
      break;
    case 'top':
    default:
      // Align the top of the text block with blockY
      startY = blockY;
      break;
  }

  // --- Calculate Final Line Positions ---
  let layout = [];
  let currentY = startY; // Start at the calculated top Y

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim(); // Trim whitespace from lines
    if (line.length === 0) { // Skip empty lines resulting from split/wrap
      // currentY += singleLineHeight; // Still advance Y position if needed, but usually skip
      continue;
    }
    let lineWidth = textWidth(line);
    let lineX;

    switch (alignH) {
      case 'center':
        lineX = blockX + (blockWidth - lineWidth) / 2;
        break;
      case 'right':
        lineX = blockX + (blockWidth - lineWidth);
        break;
      case 'left':
      default:
        lineX = blockX;
        break;
    }

    // Store the top-left coordinate for this line
    layout.push({
      text: line,
      x: lineX,
      y: currentY // Use the top Y for consistency
    });
    currentY += singleLineHeight;
  }

  pop(); // Restore previous text settings
  // Recalculate total height based on actual lines added and their positions
  let actualTotalHeight = layout.length > 0 ? (layout[layout.length - 1].y + singleLineHeight) - layout[0].y : 0;
  // Adjust layout line Y positions to be baseline-relative for standard text() drawing
  // Need to push/pop and set font again for textAscent()
  push();
  textFont(fontObject);
  textSize(targetFontSize);
  let asc = textAscent();
  pop();
  layout.forEach(line => line.y += asc);

  return { lines: layout, totalHeight: actualTotalHeight };
}

// --- Holiday Data Functions --- <<< NEW SECTION START >>>
function fetchHolidayData() {
  let currentYear = year();
  // Avoid fetching again if we already have data for the current year
  if (currentYear === lastHolidayFetchYear && yearlyHolidayData) {
    console.log(`Already have holiday data for ${currentYear}. Checking today's.`);
    checkTodaysAndUpcomingHolidays();
    return;
  }

  console.log(`Fetching holiday data for ${currentYear}...`);
  // Using Nager.Date API for US Public Holidays
  let apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${currentYear}/US`;

  loadJSON(apiUrl,
    (data) => { // Success callback
      console.log(`Successfully fetched holiday data for ${currentYear}. Count: ${data.length}`);
      yearlyHolidayData = data;
      lastHolidayFetchYear = currentYear;
      // checkTodaysHolidays(); // <<< OLD
      checkTodaysAndUpcomingHolidays(); // <<< NEW: Check today and upcoming
    },
    (error) => { // Error callback
      console.error(`Error fetching holiday data from ${apiUrl}:`, error);
      yearlyHolidayData = null; // Clear data on error
      todaysHolidayNames = []; // Clear today's holidays
    }
  );
}

// Renamed for clarity, but keeping original call points the same for now
function checkTodaysAndUpcomingHolidays() {
  // Clear previous results
  todaysHolidayNames = [];
  upcomingHolidaysInfo = []; // <<< Clear upcoming holidays too

  if (!yearlyHolidayData) {
    console.log("No yearly holiday data available to check.");
    return;
  }

  // --- Check Today ---
  let today = new Date(); // Use JS Date for easier manipulation
  let todayYear = today.getFullYear();
  let todayMonth = today.getMonth() + 1; // 0-indexed month
  let todayDay = today.getDate();
  let todayStr = todayYear + "-" + nf(todayMonth, 2) + "-" + nf(todayDay, 2);

  // Filter and map to get names
  let todayHolidaysRaw = yearlyHolidayData
    .filter(holiday => holiday.date === todayStr)
    .map(holiday => holiday.name);

  // <<< NEW: Use Set to get unique names >>>
  todaysHolidayNames = [...new Set(todayHolidaysRaw)];

  if (todaysHolidayNames.length > 0) {
    // Log the unique names
    console.log(`Check holiday: Today (${todayStr}) is: ${todaysHolidayNames.join(', ')}`);
  } else {
    // console.log(`No public holidays found for today (${todayStr}).`); // Keep this less verbose
  }

  // --- Check Next 5 Days ---
  console.log("Checking for holidays in the next 5 days...");
  for (let i = 1; i <= 5; i++) {
    let futureDate = new Date(); // Start with today
    futureDate.setDate(today.getDate() + i); // Add 'i' days (handles month/year rollover)

    let futureYear = futureDate.getFullYear();
    let futureMonth = futureDate.getMonth() + 1; // 0-indexed month
    let futureDay = futureDate.getDate();
    let futureDateStr = futureYear + "-" + nf(futureMonth, 2) + "-" + nf(futureDay, 2);

    let foundUpcoming = yearlyHolidayData
      .filter(holiday => holiday.date === futureDateStr);

    if (foundUpcoming.length > 0) {
      // Filter and map to get names
      let upcomingNamesRaw = foundUpcoming.map(holiday => holiday.name);

      // <<< NEW: Use Set to get unique names >>>
      let uniqueNames = [...new Set(upcomingNamesRaw)];

      // Log the unique names
      console.log(` -> Found holiday on ${futureDateStr} (+${i}d): ${uniqueNames.join(', ')}`);
      upcomingHolidaysInfo.push({
        offset: i, // How many days from today
        date: futureDateStr,
        names: uniqueNames // <<< Store the unique names array
      });
    }
  }
  if (upcomingHolidaysInfo.length === 0) {
    console.log(" -> No public holidays found in the next 5 days.");
  }
}
// --- NEW SECTION END ---
// --- Weather Data Functions --- <<< NEW SECTION START >>>
function fetchWeatherData() {
  // Check if API key is set
  if (!weatherApiKey || weatherApiKey === 'YOUR_API_KEY_HERE') {
    console.warn("Weather API key not set. Skipping weather fetch.");
    return;
  }

  // Check if enough time has passed
  if (millis() - lastWeatherUpdateTime < weatherUpdateInterval) {
    //console.log("Weather data fetch skipped. Interval not reached.");
    return; // Not time to update yet
  }

  console.log("Fetching weather data...");
  lastWeatherUpdateTime = millis(); // Update time immediately

  let apiUrl;
  // Construct API URL based on whether city or lat/lon is defined
  if (typeof weatherLat !== 'undefined' && typeof weatherLon !== 'undefined') {
    apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${weatherLat}&lon=${weatherLon}&appid=${weatherApiKey}&units=${weatherUnits}`;
    console.log(`Using coordinates: Lat=${weatherLat}, Lon=${weatherLon}`);
  } else if (weatherCity) {
    apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(weatherCity)}&appid=${weatherApiKey}&units=${weatherUnits}`;
    console.log(`Using city: ${weatherCity}`);
  } else {
    console.error("Weather location (city or lat/lon) not configured.");
    return;
  }
  loadJSON(apiUrl, weatherSuccessCallback, weatherErrorCallback);
}

function weatherSuccessCallback(data) {
  console.log("Weather data received:", data);
  if (data && data.main && data.weather && data.weather.length > 0) {
    currentWeatherData = data; // Store the whole object

    // Load the weather icon
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`; // Use @2x for better resolution
    loadImage(iconUrl,
      img => {
        weatherIconImage = img;
        console.log(`Weather icon '${iconCode}' loaded successfully.`);
      },
      err => {
        console.error(`Error loading weather icon (${iconCode}) from ${iconUrl}:`, err);
        weatherIconImage = null; // Clear image on error
      }
    );
  } else {
    console.error("Received weather data is incomplete or invalid:", data);
    currentWeatherData = null;
    weatherIconImage = null;
  }
}

function weatherErrorCallback(error) {
  console.error("Error fetching weather data:", error);
  currentWeatherData = null; // Clear data on error
  weatherIconImage = null; // Clear icon on error
}
// --- NEW SECTION END ---
// --- Draw Function ---
function draw() {
  // --- Background Color Update ---
  let cycleLengthFrames = 60 * 5 * 1; // 1 minute cycle for background approx
  if (frameCount % cycleLengthFrames === 0 && startBackgroundColorCycle && targetBackgroundColor && allPalettesData && paletteCount > 0) {
    startBackgroundColorCycle = gradientTopColor; // Start next cycle from current top color
    let cs = findLightestAndOthers(allPalettesData[floor(random(paletteCount))]); //allPalettesData.length
    if (cs.lightest) {
      let { adjustedLightest } = adjustColorsForContrast(cs.lightest, cs.others); // Only need lightest for bg
      targetBackgroundColor = adjustedLightest; // || color(200); // Target the new lightest, fallback
      console.log("New Background Cycle Target:", targetBackgroundColor.toString());
    } else {
      console.warn("Could not find lightest color for new background cycle, keeping target.");
      // Keep the existing targetBackgroundColor
    }
  }

  // Interpolate background colors if valid
  if (startBackgroundColorCycle instanceof p5.Color && targetBackgroundColor instanceof p5.Color) {
    let lerp_pos = (frameCount % cycleLengthFrames) / cycleLengthFrames;
    gradientTopColor = lerpColor(startBackgroundColorCycle, targetBackgroundColor, lerp_pos);
    gradientBottomColor = lerpColor(gradientTopColor, color(0), 0.35); // Derive bottom color
  } else if (!gradientTopColor || !gradientBottomColor) {
    // Fallback if colors are somehow invalid at the start
    gradientTopColor = color(251);
    gradientBottomColor = color(210);
  }
  verseColor = lerpColor(gradientBottomColor, color(0), 0.05); // Update verse color based on gradient

  // --- Draw Gradient Background ---
  // drawGradientBackground(gradientTopColor, gradientBottomColor);
  // --- Update and Draw Gradient Background ---
  updateBackgroundGraphics(); // <<< NEW: Update buffer if needed
  image(backgroundGraphics, 0, 0); // <<< NEW: Draw the buffer image

  // --- Loading/Paused Check ---
  if (isLoading || !isLooping()) { return; }

  // --- Update Time, Handle Transitions, Update Colors ---
  calcTime(); // Handles minute changes, transitions, and color interpolation

  // --- Calculate Transition Alpha Multiplier ---
  // --- Fetch Weather Data Periodically --- <<< NEW
  fetchWeatherData();
  // --- Draw Background Noise ---
  noStroke();
  for (let i = 0; i < noiseParticles.length; i++) {
    noiseParticles[i].update();
    noiseColor = lerpColor(gradientBottomColor, gradientTopColor, 0.5); // Update verse color based on gradient
    noiseParticles[i].show(noiseColor); // Pass bottom color for noise calculation
  }

  // --- Define Layout Parameters (MATCH updateParticleSystems) ---
  let verseFontSize = max(minFontSize, width * baseVerseFontSizeRatio);
  let enVerseFontSize = max(minFontSize * 0.8, verseFontSize * 0.8);
  let referenceFontSize = max(minFontSize, width * baseReferenceFontSizeRatio);
  let textBlockWidth = width - verseFontSize * 2 + 1; //width * textBlockMaxWidthRatio;
  let textBlockX = (width - textBlockWidth) / 2; // Centered block

  // --- Draw Active Particle System ---
  // Particle color and alpha are handled within their respective show/draw methods
  if (currentEffect === 'vehicle') {
    for (let v of vehicles) { v.behaviors(); v.update(); v.show(); }
  } else if (currentEffect === 'textParticle') {
    for (let p of textParticles) { p.update(); p.draw(); }
  }

  // --- Draw Date and Holiday --- <<< MODIFIED SECTION START >>>
  push();
  let dateString = year() + "-" + nf(month(), 2) + "-" + nf(day(), 2);
  let dateTextSize = max(12, verseFontSize / 2); // Slightly smaller date text
  let holidayTextSize = max(10, verseFontSize * 0.6); // Even smaller for holiday
  let weatherTextSize = dateTextSize; // Use same size as date for temp
  let bottomPadding = verseFontSize; // Padding from bottom edge
  let textX = bottomPadding; // Padding from left edge
  let leftPadding = bottomPadding; // Padding from left edge
  let elementSpacing = dateTextSize * 0.5; // Spacing between weather icon, temp, and date

  textFont(referenceFont || font); // Use reference font or fallback
  fill(verseColor); // Use particle color for date/holiday
  noStroke();
  textAlign(LEFT, BOTTOM); // Align bottom-left

  // 1. Calculate Date Position FIRST
  textSize(dateTextSize);
  let dateY = height - bottomPadding; // Bottom alignment
  let dateAscent = textAscent();
  let dateDescent = textDescent();
  let dateLineHeight = dateAscent + dateDescent;

  // 2. Calculate Starting Y for text ABOVE the date
  let nextLineY = dateY - dateLineHeight * 1.1; // Start position for the line directly above the date

  // 3. Draw Weather Icon and Temperature (if available)
  let currentX = leftPadding; // Start drawing from the left padding
  let weatherIconSize = dateTextSize * 1.8; // Make icon a bit larger than text

  if (weatherIconImage) {
    // Draw icon aligned vertically with the bottom of the date text
    image(weatherIconImage, currentX, dateY - weatherIconSize, weatherIconSize, weatherIconSize);
    currentX += weatherIconSize + elementSpacing * 0.5; // Move X position past the icon
  }

  if (currentWeatherData && currentWeatherData.main) {
    textSize(weatherTextSize);
    let temp = nf(currentWeatherData.main.temp, 0, 0); // Format temp to whole number
    let unitSymbol = (weatherUnits === 'metric') ? '°C' : '°F';
    let tempString = temp + unitSymbol;
    text(tempString, currentX, dateY); // Draw temperature at the same baseline as date
    currentX += textWidth(tempString) + elementSpacing; // Move X position past the temperature text
  } else if (weatherApiKey && weatherApiKey !== 'YOUR_API_KEY_HERE') {
    // Optional: Show a loading/error indicator if key is set but data not loaded
    textSize(weatherTextSize * 0.8);
    fill(verseColor, 100); // Dimmed color
    text("...", currentX, dateY);
    currentX += textWidth("...") + elementSpacing;
    fill(verseColor); // Reset fill
  }


  // 4. Draw Upcoming Holiday(s) FIRST (from furthest to closest)
  // These will start at the calculated currentX position
  textSize(holidayTextSize);
  let holidayAscent = textAscent(); // Get ascent/descent for holiday size
  let holidayDescent = textDescent();
  let holidayLineHeight = holidayAscent + holidayDescent;

  if (upcomingHolidaysInfo.length > 0) {
    // Loop backwards to draw furthest away first at the top
    for (let i = upcomingHolidaysInfo.length - 1; i >= 0; i--) {
      let item = upcomingHolidaysInfo[i];
      let dayOffsetStr = (item.offset === 1) ? "Tomorrow" : `+${item.offset}d`;
      let upcomingText = `(${dayOffsetStr}) ${item.names.join(', ')}`;
      text(upcomingText, textX, nextLineY);
      nextLineY -= holidayLineHeight * 1.1; // Move Y up for the next line
    }
  }

  // 5. Draw Today's Holiday(s) if they exist, below upcoming, above date
  if (todaysHolidayNames.length > 0) {
    textSize(holidayTextSize); // Ensure holiday size is set
    let holidayString = todaysHolidayNames.join(', ');
    text(holidayString, textX, nextLineY); // Draw at the current nextLineY
    // nextLineY -= holidayLineHeight * 1.1; // No need to move Y further up after drawing today's
  }

  // 5. Draw Date String at its calculated position (always last)
  textSize(dateTextSize);
  text(dateString, currentX, dateY);

  pop();
  // <<< MODIFIED SECTION END >>>
} // End draw()


// --- windowResized (Updates Both Systems, Cancels Transition) ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // --- Resize background buffer ---
  backgroundGraphics.resizeCanvas(width, height);
  lastGradientTopColorStr = ""; // Force redraw on resize
  lastGradientBottomColorStr = "";
  updateBackgroundGraphics(); // Redraw background immediately

  if (isTransitioning || isParticleSettling || isTextFadingIn) {
    console.log("Resize during transition/settling/fade - cancelling.");
    isTransitioning = false;
    isParticleSettling = false;
    isTextFadingIn = false;
    transitionAlphaMultiplier = 1.0; // Ensure particles are visible
    overlayTextAlpha = 220; // Make overlay text fully visible
    particleSettleStartTime = 0;
    textFadeInStartTime = 0;

    // Force color update to current state
    // let lerpAmt = second() / 60.0;
    // if (startColor instanceof p5.Color && endColor instanceof p5.Color) {
    //   verseColor = lerpColor(startColor, endColor, lerpAmt);
    //   updateOverlayTextColor(); // Update base overlay color
    // }
  }

  if (!isLoading && isLooping()) {
    // Recalculate particle positions for the CURRENT verse/effect
    // let verseReferenceText = `${currentBookName} ${currentChapter}:${currentVerseNumber}`;
    // updateParticleSystems(currentVerse, verseReferenceText); // This now uses calculateTextLayout
    let mainText = currentVerse;
    let referenceString = isDisplayingQuote ? currentBookName : `${currentBookName} ${currentChapter}:${currentVerseNumber}`;
    updateParticleSystems(mainText, referenceString); // Pass correct strings

    // Recreate Noise Particles for new size
    console.log("Recreating noise particles for new window size.");
    noiseParticles = [];
    for (let i = 0; i < noiseDensity; i++) {
      noiseParticles.push(new NoiseParticle());
    }
    // Redraw background immediately
    if (gradientTopColor && gradientBottomColor) {
      drawGradientBackground(gradientTopColor, gradientBottomColor);
    }
  } else if (isLoading) {
    displayLoadingMessage("正在載入聖經數據...\nLoading Bible data...");
  }
}

// --- Helper Function to Reset Particle Positions to Top ---
function resetParticlesToTop() {
  console.log("Resetting particles to top post-transition.");

  // --- Reset Vehicle Positions ---
  if (vehicles.length > 0) {
    for (let v of vehicles) {
      // Place vehicle randomly above the top edge
      v.pos.x = random(width);
      v.pos.y = random(-height * 0.1, -v.r * 2); // Start slightly scattered above the top
      // DO NOT reset velocity here - let 'arrive' behavior take over naturally
      v.acc.mult(0); // Clear any residual acceleration from falling
    }
  }

  // --- Reset TextParticle Positions ---
  if (textParticles.length > 0) {
    for (let p of textParticles) {
      // Place particle randomly above the top edge
      p.x = random(width);
      p.y = random(-height * 0.1, -p.r * 2); // Start slightly scattered above the top
    }
  }
}

// --- calcTime (Handles Effect Switching, Color Transition, Verse Update) ---
function calcTime() {
  let currentHour = hour();
  let currentMinute = minute();
  let currentSecond = second();
  let currentDay = day(); // <<< Get current day

  formattedTime = nf(currentHour, 2, 0) + ":" + nf(currentMinute, 2, 0);
  // --- Daily Holiday Check --- <<< NEW SECTION
  if (currentDay !== prevDay) {
    console.log(`Day changed from ${prevDay} to ${currentDay}. Checking holidays.`);
    // Check if the year also changed, if so, fetch new data
    if (year() !== lastHolidayFetchYear) {
      fetchHolidayData(); // Fetches new year's data and then checks
    } else {
      // checkTodaysHolidays(); // <<< OLD
      checkTodaysAndUpcomingHolidays(); // <<< NEW: Just check today and upcoming using existing year data
    }
    prevDay = currentDay; // Update the tracked day
  }
  // --- END NEW SECTION ---
  // --- Handle Ongoing Transition ---
  if (isTransitioning) {
    let elapsed = millis() - transitionStartTime;
    if (elapsed >= transitionDuration) {
      // --- Transition ENDS ---
      isTransitioning = false;
      isParticleSettling = true; // <<< Start particle settling phase
      particleSettleStartTime = millis(); // <<< Record start time for particle settling
      overlayTextAlpha = 0; // <<< Keep text invisible
      transitionAlphaMultiplier = 1.0; // Ensure particles are fully visible for settling
      console.log("Main transition ended. Starting particle settling.");
      // <<< --- NEW: Clear particle arrays --- >>>
      console.log(`Clearing ${vehicles.length} Vehicles and ${textParticles.length} TextParticles.`);
      vehicles = [];
      textParticles = [];
      // <<< --- END NEW --- >>>
      // ... (rest of the transition end logic: toggle effect, update palette, get verse, update particles) ...
      // 1. Toggle Particle Effect (Actual Switch)
      currentEffect = (currentEffect === 'vehicle') ? 'textParticle' : 'vehicle';
      console.log("Switching effect to:", currentEffect);

      // 2. Update Color Palette Index and Target Colors (Actual Switch)

      // --- 3. Get New Verse OR Quote (using the options map) --- <<< MODIFIED SECTION START >>>
      const optionsArray = timeVerseOptionsData[formattedTime]; // Get the array of options
      let selectedOption = null; // Initialize selectedOption

      if (optionsArray && Array.isArray(optionsArray) && optionsArray.length > 0) {
        // <<< --- NEW: Context Tag Prioritization Logic --- >>>
        const timeTag = getTimeOfDayTag(currentHour);
        const holidayTags = getHolidayTags(); // Ensure this matches JSON format (e.g., holiday:christmas)
        const weatherTags = getWeatherTags(); // Ensure this matches JSON format (e.g., weather:sunny)

        const contextTags = [timeTag, ...holidayTags, ...weatherTags].filter(tag => tag !== null); // Combine and remove nulls
        console.log(`Current Context Tags: [${contextTags.join(', ')}]`);

        // Filter optionsArray for matches
        const matchingOptions = optionsArray.filter(option =>
          option.tags && Array.isArray(option.tags) && option.tags.some(tag => contextTags.includes(tag))
        );

        if (matchingOptions.length > 0) {
          // Select randomly from the MATCHING options
          selectedOption = random(matchingOptions);
          console.log(`Selected option based on context match (${matchingOptions.length} matches found):`, selectedOption);
        } else {
          // No context match, select randomly from ALL options for this minute
          selectedOption = random(optionsArray);
          console.log(`No context match found. Selected random option for ${formattedTime}:`, selectedOption);
        }
        // <<< --- END: Context Tag Prioritization Logic --- >>>

        if (selectedOption && selectedOption.type === "verse" && selectedOption.ref && selectedOption.ref.includes(':')) {
          // --- Handle Verse ---
          isDisplayingQuote = false;
          const parts = selectedOption.ref.split(':');
          if (parts.length === 3) {
            currentBookNumber = parts[0];
            currentChapter = parts[1];
            currentVerseNumber = parts[2];
            // Get Chinese verse using the currently selected CHINESE version
            currentBookName = getBookName(currentChBibleVersion, currentBookNumber);
            currentVerse = getVerse(currentBookNumber, currentChapter, currentVerseNumber);
            // <<< --- NEW: Select Random English Version --- >>>
            const englishVersionKeys = ['ASV', 'KJV', 'WEB']; // Define potential English keys
            // Filter to get only the English versions that are actually loaded
            const loadedEnglishVersions = englishVersionKeys.filter(key => bibleData[key]);

            if (loadedEnglishVersions.length > 0) {
              // Randomly select one key from the available loaded English versions
              currentEnBibleVersion = random(loadedEnglishVersions); // p5.js random selects one element from array
              console.log(`Switched English Bible version to: ${currentEnBibleVersion}`);
            } else {
              console.warn("No loaded English versions available to switch to. Keeping current:", currentEnBibleVersion);
              // Optional fallback: Ensure the current one is valid if possible
              if (!bibleData[currentEnBibleVersion]) {
                const firstLoadedEnglish = Object.keys(bibleData).find(k => englishVersionKeys.includes(k));
                if (firstLoadedEnglish) {
                  currentEnBibleVersion = firstLoadedEnglish;
                  console.warn(` -> Fallback: Set English version to first loaded: ${currentEnBibleVersion}`);
                } else {
                  console.error("CRITICAL: No English Bible data seems to be loaded at all!");
                  // Keep the potentially invalid currentEnBibleVersion as a last resort
                }
              }
            }
            // <<< --- End Select Random English Version --- >>>

            // Fetch the English verse using the (potentially newly selected) currentEnBibleVersion
            currentEnVerse = getEnVerse(currentBookNumber, currentChapter, currentVerseNumber);

          } else {
            console.error(`Invalid verse ref format: ${selectedOption.ref}`);
            setFallbackVerse(); // This also gets the EN verse using the currentEnBibleVersion
          }
        } else if (selectedOption && selectedOption.type === "quote" && selectedOption.text) {
          // --- Handle Quote ---
          isDisplayingQuote = true;
          currentVerse = selectedOption.text; // Store quote text in currentVerse
          currentBookName = `${selectedOption.source || "Unknown Source"} ${formattedTime}`;
          currentEnVerse = ""; // Clear English verse
          // Set placeholder numbers (optional, but helps consistency)
          currentBookNumber = 'Q';
          currentChapter = '0';
          currentVerseNumber = '0';
          console.log(`Displaying quote: "${currentVerse}" - ${currentBookName}`);
        } else {
          // This case might happen if the selectedOption was somehow invalid after filtering/random selection
          console.error(`Invalid or incomplete selected option after prioritization:`, selectedOption);
          setFallbackVerse(); // This also gets the EN verse using the currentEnBibleVersion
        }
      } else {
        console.error(`No valid verse/quote options found for time: ${formattedTime}`);
        setFallbackVerse(); // Use fallback if no options for the time
      }
      // <<< MODIFIED SECTION END >>>

      // 4. Trigger Particle Update for BOTH systems with NEW text/targets
      // Determine the reference string based on whether it's a quote or verse
      // This logic is now implicitly handled because currentBookName is already formatted correctly
      let mainText = currentVerse;
      let referenceString = isDisplayingQuote ? currentBookName : `${currentBookName} ${currentChapter}:${currentVerseNumber}`;
      updateParticleSystems(mainText, referenceString); // Pass correct strings
      // let verseReferenceText = `${currentBookName} ${currentChapter}:${currentVerseNumber}`;
      // updateParticleSystems(currentVerse, verseReferenceText); // This now uses calculateTextLayout
      //updateParticleSystems(currentVerse, currentEnVerse, verseReferenceText); // Pass EN verse

      // 5. Force color update to the start of the new minute's interpolation

    } else {
      // --- Transition ONGOING ---
      // Keep overlay text invisible during the main transition
      overlayTextAlpha = 0;
      // Calculate particle alpha multiplier (fade out/in)
      let progress = constrain(elapsed / transitionDuration, 0, 1);
      transitionAlphaMultiplier = map(progress, 0, 1, 1, 0); // Linear fade out
      transitionAlphaMultiplier = constrain(transitionAlphaMultiplier, 0, 1);
    }
  }
  /// --- Handle Particle Settling Phase ---
  else if (isParticleSettling) {
    let elapsedSettle = millis() - particleSettleStartTime;
    if (elapsedSettle >= particleSettleDuration) {
      // --- Particle Settling ENDS ---
      isParticleSettling = false;
      isTextFadingIn = true; // <<< Start text fade-in phase
      textFadeInStartTime = millis(); // <<< Record start time for text fade-in
      overlayTextAlpha = 0; // <<< Start fade from invisible
      console.log("Particle settling phase ended (particles already cleared). Starting text fade-in.");
    } else {
      // --- Particle Settling ONGOING ---
      overlayTextAlpha = 0; // Keep text invisible
      transitionAlphaMultiplier = 1.0; // Particles remain visible
    }
  }
  // --- Handle Text Fade-In Phase ---
  else if (isTextFadingIn) {
    let elapsedFade = millis() - textFadeInStartTime;
    if (elapsedFade >= textFadeInDuration) {
      // --- Text Fade-In ENDS ---
      isTextFadingIn = false;
      overlayTextAlpha = 220; // Ensure text is fully visible
      transitionAlphaMultiplier = 1.0;
      console.log("Text fade-in complete.");
    } else {
      // --- Text Fade-In ONGOING ---
      let fadeProgress = elapsedFade / textFadeInDuration;
      overlayTextAlpha = map(fadeProgress, 0, 1, 0, 220); // Map progress to alpha
      transitionAlphaMultiplier = 1.0; // Particles remain visible
    }
  }
  // --- Check for NEW Minute Change (Only if NOT in any transition phase) ---
  else if (currentMinute !== prevMinute) { // No need to check other flags, if they were true, we wouldn't reach here
    // --- Transition BEGINS ---
    console.log("Minute changed. Starting transition (particles will fall)...");
    isTransitioning = true;
    isParticleSettling = false; // Ensure particle settling is false
    isTextFadingIn = false;    // <<< Ensure fade-in is false
    overlayTextAlpha = 0; // Make text invisible immediately
    transitionStartTime = millis();
    prevMinute = currentMinute; // Update prevMinute *here*
    // --- NEW: Randomly select Bible version ---
    const versionsToChoose = ['Union', 'CKJV'];
    // Ensure the chosen versions are actually loaded
    const availableVersions = versionsToChoose.filter(v => bibleData[v]);
    if (availableVersions.length > 0) {
      currentChBibleVersion = random(availableVersions); // Use p5.js random() on array
      console.log(`Switched Chinese Bible version to: ${currentChBibleVersion}`);
      // NO NEED to call createVerseMapping() here anymore
    } else {
      console.warn("Neither 'Union' nor 'CKJV' versions are loaded. Cannot switch.");
    }

    // <<< REMOVED: applyEscapeForce() call - falling is handled in particle classes >>>
    // applyEscapeForce();
  }
  // --- If not transitioning and not settling, ensure text is visible ---
  else {
    // This block remains the same, ensuring visibility when idle
    if (!isTextFadingIn) { // Only set full alpha if not actively fading in
      overlayTextAlpha = 220;
    }
    transitionAlphaMultiplier = 1.0;
  }
}


// --- Helper to update overlay text color based on particle color and background ---
function updateOverlayTextColor() {
  if (!verseColor || !gradientTopColor) {
    overlayTextColor = color(255, 200); // Fallback
    return;
  }
  // Determine if background is light or dark
  let bgBrightness = brightness(gradientTopColor); // Check top color brightness
  // Determine if particle color is light or dark
  let partBrightness = brightness(verseColor);

  // Decide whether to lerp towards white or black for contrast
  let targetContrastColor;
  if (abs(bgBrightness - partBrightness) < MIN_BRIGHTNESS_DIFFERENCE * 0.8) {
    // If particle and background are too similar, prioritize contrast with background
    targetContrastColor = (bgBrightness > 50) ? color(0) : color(255); // Dark text on light bg, light text on dark bg
  } else {
    // Otherwise, contrast with the particle color itself
    targetContrastColor = (partBrightness > 50) ? color(0) : color(255); // Dark text on light particles, light text on dark particles
  }


  overlayTextColor = lerpColor(verseColor, targetContrastColor, OVERLAY_CONTRAST_FACTOR);
  // Set a consistent alpha, maybe slightly less than full
  overlayTextColor.setAlpha(220); // Adjust alpha as needed
}


// --- setFallbackVerse (Unchanged) ---
function setFallbackVerse() {
  console.warn(`Setting fallback content for time ${formattedTime}.`);
  isDisplayingQuote = false; // Default to trying a verse fallback
  const versionData = bibleData[currentChBibleVersion];
  let foundVerseFallback = false;

  if (versionData && Object.keys(versionData).length > 0) {
    const bookNumbers = Object.keys(versionData).filter(k => k !== 'bookName').sort((a, b) => parseInt(a) - parseInt(b));
    if (bookNumbers.length > 0) {
      const firstBookNumber = bookNumbers[0];
      // <<< Get chapters for the first book number, filter 'bookName', sort numerically >>>
      const chapters = Object.keys(versionData[firstBookNumber]).filter(k => k !== 'bookName').sort((a, b) => parseInt(a) - parseInt(b));
      if (chapters.length > 0) {
        const firstChapter = chapters[0];
        const verses = Object.keys(versionData[firstBookNumber][firstChapter]).sort((a, b) => parseInt(a) - parseInt(b));
        if (verses.length > 0) {
          const firstVerse = verses[0];
          currentBookNumber = firstBookNumber;
          currentChapter = firstChapter;
          currentVerseNumber = firstVerse;
          // Use the modified getVerse which implicitly uses currentBibleVersion
          currentBookName = getBookName(currentChBibleVersion, currentBookNumber);
          currentVerse = getVerse(currentBookNumber, currentChapter, currentVerseNumber);
          currentEnVerse = getEnVerse(currentBookNumber, currentChapter, currentVerseNumber); // <<< NEW: Get English
          console.log(`Using fallback verse from ${currentChBibleVersion}: ${currentBookName} (${currentBookNumber}) ${currentChapter}:${currentVerseNumber}`);
          foundVerseFallback = true; //return;
        }
      }
    }
  }

  // Absolute fallback if data is missing or empty for the current version
  if (!foundVerseFallback) {
    console.error(`Could not determine fallback verse for version '${currentChBibleVersion}'. Using hardcoded quote.`);
    isDisplayingQuote = true;
    currentVerse = "時間是我們最寶貴的資源。\nTime is our most precious resource.";
    currentBookName = "系統提示 / System"; // Source
    currentEnVerse = "";
    currentBookNumber = 'F'; // Fallback indicator
    currentChapter = '0';
    currentVerseNumber = '0';
  }
}


// --- Function to apply initial escape force AND reset positions for falling ---
/*function applyEscapeForce() {
  console.log("Transition started. Resetting particles to top for falling effect.");

  // --- Reset Vehicle Positions ---
  if (vehicles.length > 0) {
    for (let v of vehicles) {
      // Place vehicle randomly above the top edge
      v.pos.x = random(width);
      v.pos.y = random(-height * 0.1, -v.r * 2); // Start slightly scattered above the top

      // Reset velocity to a small downward/random initial state
      v.vel.set(random(-1, 1), random(0, 3)); // Small initial downward/horizontal velocity
      v.acc.mult(0); // Clear any existing acceleration
    }
    console.log(`Reset ${vehicles.length} Vehicles to top.`);
  }

  // --- Reset TextParticle Positions ---
  if (textParticles.length > 0) {
    for (let p of textParticles) {
      // Place particle randomly above the top edge
      p.x = random(width);
      p.y = random(-height * 0.1, -p.r * 2); // Start slightly scattered above the top
    }
    console.log(`Reset ${textParticles.length} TextParticles to top.`);
  }
}*/
// --- Unified Function to Update BOTH Particle Systems using calculateTextLayout ---
/*function updateParticleSystems(verseString, referenceString) {
  console.log(`Updating particle systems for: "${referenceString}"`);

  // --- Define Layout Parameters ---
  let verseFontSize = max(minFontSize, width * baseVerseFontSizeRatio);
  let enVerseFontSize = max(minFontSize * 0.8, verseFontSize * 0.8);
  let referenceFontSize = max(minFontSize, width * baseReferenceFontSizeRatio);
  let textBlockWidth = width - verseFontSize * 2 + 1;  //* textBlockMaxWidthRatio; // Use ratio for width
  let textBlockX = (width - textBlockWidth) / 2; // Centered block X

  // --- Calculate Layouts relative to (0,0) FIRST to determine total height ---
  // These calculations are done just to get the height dimensions.
  // Chinese Verse (for height calculation)
  let tempVerseLayout = calculateTextLayout(
    verseString, verseFontSize,
    0, 0, textBlockWidth, 'left', 'top', font, verseLineHeightFactor
  );

  // English Verse (for height calculation)
  let tempEnVerseY = tempVerseLayout.totalHeight + verseSpacing;
  let tempEnVerseLayout = calculateTextLayout(
    currentEnVerse, enVerseFontSize,
    0, tempEnVerseY, textBlockWidth, 'left', 'top', font, verseLineHeightFactor, 'word' // <<< Pass font
  );

  // Reference Text (for height calculation)
  let tempReferenceY = height - verseFontSize * 1.5; //tempEnVerseY + tempEnVerseLayout.totalHeight + referencePadding; // Use referencePadding for spacing below English
  let tempReferenceLayout = calculateTextLayout(
    referenceString, referenceFontSize,
    0, tempReferenceY, textBlockWidth, 'right', 'bottom', referenceFont || font, referenceLineHeightFactor // <<< Pass referenceFont (fallback)
  );

  // --- Calculate Total Combined Height ---
  let totalLayoutHeight = tempReferenceY; // + tempReferenceLayout.totalHeight;
  console.log(`Calculated total layout height: ${totalLayoutHeight}`);

  // --- Calculate Centered Canvas Offset Y ---
  // This is the Y coordinate where the *top* of the combined block should start
  let finalCanvasOffsetY = (height - totalLayoutHeight) / 2;
  console.log(`Calculated finalCanvasOffsetY for centering: ${finalCanvasOffsetY}`);

  // --- Now, Recalculate Layouts relative to (0,0) for the BUFFER drawing ---
  // We use the same relative positioning as before, the final centering happens when translating points.
  // Chinese Verse Layout (for buffer)
  let verseLayout = calculateTextLayout(
    verseString, verseFontSize,
    0, 0, textBlockWidth, 'left', 'top', font, verseLineHeightFactor // <<< Pass font
  );

  // English Verse Layout (for buffer)
  let enVerseY_buffer = verseLayout.totalHeight + verseSpacing;
  let enVerseLayout = calculateTextLayout(
    currentEnVerse, enVerseFontSize,
    0, enVerseY_buffer, textBlockWidth, 'left', 'top', font, verseLineHeightFactor, 'word' // <<< Pass font
  );

  // Reference Text Layout (for buffer)
  let referenceY_buffer = height - verseFontSize * 1.5; //enVerseY_buffer + enVerseLayout.totalHeight + referencePadding;
  let referenceLayout = calculateTextLayout(
    referenceString, referenceFontSize,
    0, referenceY_buffer, textBlockWidth, 'right', 'bottom', referenceFont || font, referenceLineHeightFactor // <<< Pass referenceFont (fallback)
  );

  // --- Determine Buffer Dimensions (using the final element's position + height) ---
  let bufferWidth = ceil(textBlockWidth);
  let bufferHeight = ceil(referenceY_buffer + referenceLayout.totalHeight); // Same as totalLayoutHeight

  let allPoints = []; // Array to hold ALL particle target points

  // --- Create and Draw to a SINGLE Buffer ---
  if (bufferWidth > 0 && bufferHeight > 0) {
    let textBuffer = createGraphics(bufferWidth, bufferHeight);
    // console.log(`Created single text buffer: ${bufferWidth}x${bufferHeight}`);

    // Draw ALL Text to Buffer
    textBuffer.pixelDensity(1);
    textBuffer.background(255); // White background
    // textBuffer.textFont(font);
    textBuffer.fill(0); // Black text
    textBuffer.noStroke();

    // Draw Chinese Verse
    textBuffer.textFont(font); // <<< Set font for buffer
    textBuffer.textSize(verseFontSize);
    textBuffer.textAlign(LEFT, TOP);
    for (const line of verseLayout.lines) {
      textBuffer.text(line.text, line.x, line.y - textBuffer.textAscent()); // Adjust Y for baseline
    }

    // Draw English Verse
    textBuffer.textFont(font); // <<< Ensure main font
    textBuffer.textSize(enVerseFontSize);
    textBuffer.textAlign(LEFT, TOP);
    for (const line of enVerseLayout.lines) {
      textBuffer.text(line.text, line.x, line.y - textBuffer.textAscent()); // Adjust Y
    }

    // Draw Reference (Aligned Right within the buffer)
    textBuffer.textFont(referenceFont || font); // <<< Set REFERENCE font for buffer (fallback)
    textBuffer.textSize(referenceFontSize);
    textBuffer.textAlign(RIGHT, TOP);
    for (const line of referenceLayout.lines) {
      // Draw text aligned to the right edge (bufferWidth) at the calculated line.y
      textBuffer.text(line.text, bufferWidth, line.y - textBuffer.textAscent()); // Adjust Y
    }

    // --- Sample Pixels from Buffer ---
    textBuffer.loadPixels();
    let canvasOffsetX = textBlockX; // Use the pre-calculated centered X

    for (let y = 0; y < textBuffer.height; y += fillSamplingDensity) {
      for (let x = 0; x < textBuffer.width; x += fillSamplingDensity) {
        let index = (x + y * textBuffer.width) * 4;
        if (textBuffer.pixels[index] < 128) { // If black pixel
          allPoints.push({
            // Translate buffer coordinates to CANVAS coordinates using the centered offsets
            x: x + canvasOffsetX,
            y: y + finalCanvasOffsetY // <<< USE THE CENTERED Y OFFSET
          });
        }
      }
    }
    textBuffer.remove(); // Clean up
    // console.log(`Added ${allPoints.length} points from combined buffer.`);

  } else {
    console.warn("Skipping combined buffer creation due to invalid dimensions:", bufferWidth, bufferHeight);
  }

  // --- Update Particle Systems with Combined Points ---
  console.log(`Generated ${allPoints.length} total points for centered layout.`);
  if (allPoints.length === 0) {
    console.warn("No points generated for particles. Clearing existing particles.");
  }
  updateVehicleTargets(allPoints);
  updateTextParticleOrigins(allPoints);

  console.log(`Finished updating particle systems. Total points: ${allPoints.length}, Vehicles: ${vehicles.length}, TextParticles: ${textParticles.length}`);
}*/

// --- Modify updateParticleSystems() ---
function updateParticleSystems(verseString, referenceString) {
  console.log(`Updating particle systems for: "${referenceString}" (using FILL sampling ONLY)`); // <<< Modified log message

  // --- Define Layout Parameters (same as before) ---
  let verseFontSize = max(minFontSize, width * baseVerseFontSizeRatio);
  let enVerseFontSize = max(minFontSize * 0.8, verseFontSize * 0.8);
  let referenceFontSize = max(minFontSize, width * baseReferenceFontSizeRatio);
  let textBlockWidth = width - verseFontSize * 2 + 1;
  let textBlockX = (width - textBlockWidth) / 2;

  // --- Calculate Layouts (same as before to get positions and total height) ---
  // These are needed to determine the overall bounding box and final Y offset
  let tempVerseLayout = calculateTextLayout(verseString, verseFontSize, 0, 0, textBlockWidth, 'left', 'top', font, verseLineHeightFactor);
  let tempEnVerseY = tempVerseLayout.totalHeight + verseSpacing;
  let tempEnVerseLayout = calculateTextLayout(currentEnVerse, enVerseFontSize, 0, tempEnVerseY, textBlockWidth, 'left', 'top', font, verseLineHeightFactor, 'word');
  let tempReferenceY = height - verseFontSize * 1.5; // Position relative to top for height calculation
  let tempReferenceLayout = calculateTextLayout(referenceString, referenceFontSize, 0, tempReferenceY, textBlockWidth, 'right', 'bottom', referenceFont || font, referenceLineHeightFactor);
  let totalLayoutHeight = tempReferenceY; // Approximate total height for centering
  let finalCanvasOffsetY = (height - totalLayoutHeight) / 2; // Centering offset

  // --- Recalculate Layouts for final CANVAS positions ---
  // These define where text *would* be drawn on the main canvas
  let verseLayout = calculateTextLayout(verseString, verseFontSize, textBlockX, finalCanvasOffsetY, textBlockWidth, 'left', 'top', font, verseLineHeightFactor);
  let enVerseY_final = finalCanvasOffsetY + tempVerseLayout.totalHeight + verseSpacing;
  let enVerseLayout = calculateTextLayout(currentEnVerse, enVerseFontSize, textBlockX, enVerseY_final, textBlockWidth, 'left', 'top', font, verseLineHeightFactor, 'word');
  let referenceY_final = finalCanvasOffsetY + tempReferenceY;
  let referenceLayout = calculateTextLayout(referenceString, referenceFontSize, textBlockX, referenceY_final, textBlockWidth, 'right', 'bottom', referenceFont || font, referenceLineHeightFactor);

  // --- Initialize points array ---
  let allPoints = []; // Initialize empty

  // --- 1. Generate OUTLINE Points using textToPoints --- <<< REMOVED/COMMENTED OUT START >>>
  /*
  console.log("Generating outline points...");
  const getPointOptions = (factor) => ({ sampleFactor: factor });

  push(); // Isolate font settings for outline points
  // Chinese Verse Outline
  textFont(font);
  textSize(verseFontSize);
  for (const line of verseLayout.lines) {
    let points = font.textToPoints(line.text, line.x, line.y, verseFontSize, getPointOptions(outlineSampleFactor * 1.0));
    allPoints = allPoints.concat(points.map(p => ({ x: p.x, y: p.y }))); // Ensure consistent point format
  }
  // English Verse Outline
  textSize(enVerseFontSize);
  for (const line of enVerseLayout.lines) {
    let points = font.textToPoints(line.text, line.x, line.y, enVerseFontSize, getPointOptions(outlineSampleFactor * 1.2));
    allPoints = allPoints.concat(points.map(p => ({ x: p.x, y: p.y })));
  }
  // Reference Text Outline
  textFont(referenceFont || font);
  textSize(referenceFontSize);
  for (const line of referenceLayout.lines) {
    let lineWidth = textWidth(line.text);
    let lineX = textBlockX + textBlockWidth - lineWidth;
    let points = (referenceFont || font).textToPoints(line.text, lineX, line.y, referenceFontSize, getPointOptions(outlineSampleFactor * 0.8));
    allPoints = allPoints.concat(points.map(p => ({ x: p.x, y: p.y })));
  }
  pop(); // Restore font settings
  console.log(`Generated ${allPoints.length} outline points.`);
  */
  // --- <<< REMOVED/COMMENTED OUT END >>>


  // --- 2. Generate FILL Points using Localized Pixel Sampling ---
  console.log("Generating fill points...");
  let fillPoints = []; // Keep this array to store fill points
  try {
    // --- Determine Bounding Box of ALL text on canvas ---
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const checkBounds = (layout, fontObj, size) => {
      push();
      textFont(fontObj);
      textSize(size);
      let asc = textAscent();
      let desc = textDescent();
      for (const line of layout.lines) {
        minX = min(minX, line.x);
        minY = min(minY, line.y - asc); // Use ascent for top boundary
        maxX = max(maxX, line.x + textWidth(line.text));
        maxY = max(maxY, line.y + desc); // Use descent for bottom boundary
      }
      pop();
    };

    checkBounds(verseLayout, font, verseFontSize);
    checkBounds(enVerseLayout, font, enVerseFontSize);
    checkBounds(referenceLayout, referenceFont || font, referenceFontSize);

    // Add some padding
    minX -= 5;
    minY -= 5;
    maxX += 5;
    maxY += 5;

    let bufferWidth = ceil(maxX - minX);
    let bufferHeight = ceil(maxY - minY);

    if (bufferWidth > 0 && bufferHeight > 0 && bufferWidth < width * 2 && bufferHeight < height * 2) { // Sanity check buffer size
      console.log(`Creating fill buffer: ${bufferWidth}x${bufferHeight} at (${minX.toFixed(0)}, ${minY.toFixed(0)})`);
      let fillBuffer = createGraphics(bufferWidth, bufferHeight);
      fillBuffer.pixelDensity(1);
      fillBuffer.background(255); // White background
      fillBuffer.fill(0);         // Black text
      fillBuffer.noStroke();

      // Draw Chinese Verse to Buffer (adjust coords relative to buffer's 0,0)
      fillBuffer.textFont(font);
      fillBuffer.textSize(verseFontSize);
      fillBuffer.textAlign(LEFT, TOP); // Align top-left for easier coord mapping
      for (const line of verseLayout.lines) {
        fillBuffer.text(line.text, line.x - minX, line.y - minY - fillBuffer.textAscent()); // Adjust coords and use baseline offset
      }

      // Draw English Verse to Buffer
      fillBuffer.textSize(enVerseFontSize);
      for (const line of enVerseLayout.lines) {
        fillBuffer.text(line.text, line.x - minX, line.y - minY - fillBuffer.textAscent());
      }

      // Draw Reference Text to Buffer
      fillBuffer.textFont(referenceFont || font);
      fillBuffer.textSize(referenceFontSize);
      // Align right within the buffer requires knowing line width *again*
      for (const line of referenceLayout.lines) {
          let lineWidth = fillBuffer.textWidth(line.text);
          // Calculate X relative to buffer's right edge
          let bufferLineX = (line.x + lineWidth) - minX; // Line's right edge on canvas, minus buffer offset
          fillBuffer.textAlign(RIGHT, BOTTOM); // Align right for drawing
          fillBuffer.text(line.text, bufferLineX, height-verseFontSize-minY);  //line.y - minY - fillBuffer.textAscent());
      }


      // Sample Pixels from Buffer
      fillBuffer.loadPixels();
      for (let y = 0; y < fillBuffer.height; y += fillSamplingDensity) {
        for (let x = 0; x < fillBuffer.width; x += fillSamplingDensity) {
          let index = (x + y * fillBuffer.width) * 4;
          // Check if pixel is black (or dark enough)
          if (fillBuffer.pixels[index] < 128 && fillBuffer.pixels[index + 3] > 128) { // Check Red and Alpha
            // Map buffer coordinates back to CANVAS coordinates
            fillPoints.push({
              x: x + minX,
              y: y + minY
            });
          }
        }
      }
      fillBuffer.remove(); // Clean up the buffer!
      console.log(`Generated ${fillPoints.length} fill points.`);

    } else {
      console.warn(`Skipping fill buffer creation due to invalid dimensions: W=${bufferWidth}, H=${bufferHeight}`);
    }
  } catch (error) {
      console.error("Error during fill point generation:", error);
      // Continue without fill points if an error occurs
  }

  // --- Assign Fill Points to allPoints --- <<< MODIFIED LINE >>>
  // allPoints = allPoints.concat(fillPoints); // <<< OLD LINE (combining outline + fill)
  allPoints = fillPoints; // <<< NEW LINE: Use ONLY the fill points
  console.log(`Total points (fill only): ${allPoints.length}`); // <<< Modified log message

  // --- Remove potential duplicate points (optional, might add overhead) ---
  // ... (keep commented out unless needed) ...


  // --- Update Particle Systems with Combined Points ---
  if (allPoints.length === 0) {
    console.warn("No points generated for particles. Clearing existing particles.");
    // Ensure particle arrays are cleared if no points
    vehicles = [];
    textParticles = [];
  }
  updateVehicleTargets(allPoints);
  updateTextParticleOrigins(allPoints);

  console.log(`Finished updating particle systems. Total points: ${allPoints.length}, Vehicles: ${vehicles.length}, TextParticles: ${textParticles.length}`);
}

// --- Adjust Particle Configuration ---
// You might need to adjust particleSampleFactor or the sampleFactor inside
// updateParticleSystems to get the desired density with textToPoints.
// let particleSampleFactor = 0.23; // <<< This is now less relevant, use sampleFactor in updateParticleSystems

// --- Adjust TextParticle Specific Config ---
// const textParticleBaseRadius = 1.5; // <<< You might make this smaller if textToPoints generates many points


// --- Helper Function to Update Vehicle Targets ---
function updateVehicleTargets(allPoints) {
  let targetCount = allPoints.length;
  let currentCount = vehicles.length;
  let diff = targetCount - currentCount;

  if (diff < 0) { // Fewer points needed, remove excess vehicles
    vehicles.splice(targetCount, -diff);
    console.log(`Vehicles reduced by ${-diff} to ${vehicles.length}`);
  } else if (diff > 0) { // More points needed, add new vehicles
    for (let i = 0; i < diff; i++) {
      // Start new vehicles randomly, target will be assigned below
      vehicles.push(new Vehicle(random(width), -random(5)));
    }
    console.log(`Vehicles increased by ${diff} to ${vehicles.length}`);
  }

  // Assign targets to all vehicles
  for (let i = 0; i < vehicles.length; i++) {
    if (allPoints[i]) {
      vehicles[i].target.x = allPoints[i].x;
      vehicles[i].target.y = allPoints[i].y;
    } else {
      // Should not happen if diff calculation is correct, but as fallback:
      vehicles[i].target.set(width / 2, height / 2);
      console.warn(`Vehicle ${i} missing target point!`);
    }
    // Apply force only if effect is switching *to* vehicles AND not in initial transition
    // This force is now handled by applyEscapeForce during transition start
    // if (!isTransitioning && currentEffect === 'vehicle') {
    //   let force = p5.Vector.random2D();
    //   force.mult(random(maxChangeForce / 2));
    //   vehicles[i].applyForce(force);
    // }
  }
}

// --- Helper Function to Update TextParticle Origins ---
function updateTextParticleOrigins(allPoints) {
  let targetCount = allPoints.length;
  let currentCount = textParticles.length;
  let diff = targetCount - currentCount;

  if (diff < 0) { // Fewer points needed, remove excess particles
    textParticles.splice(targetCount, -diff);
    console.log(`TextParticles reduced by ${-diff} to ${textParticles.length}`);
  } else if (diff > 0) { // More points needed, add new particles
    for (let i = 0; i < diff; i++) {
      // Get target for the new particle
      let targetPoint = allPoints[currentCount + i];
      if (!targetPoint) { // Fallback if point missing
        console.warn(`Missing target point for new TextParticle ${currentCount + i}`);
        targetPoint = { x: width / 2, y: height / 2 };
      }
      // Create particle with correct origin, but start randomly
      let p = new TextParticle(targetPoint.x, targetPoint.y);
      let startPos = (textParticles.length > 0) ? { x: textParticles[floor(random(textParticles.length))].x, y: textParticles[floor(random(textParticles.length))].y } : { x: random(width), y: -random(10) };
      p.x = random(width);  //startPos.x + random(-10, 10);
      p.y = random(-10, 0);
      textParticles.push(p);
    }
    console.log(`TextParticles increased by ${diff} to ${textParticles.length}`);
  }

  // Update original positions for all particles
  for (let i = 0; i < textParticles.length; i++) {
    if (allPoints[i]) {
      textParticles[i].originalX = allPoints[i].x;
      textParticles[i].originalY = allPoints[i].y;
    } else { // Fallback original position
      textParticles[i].originalX = width / 2;
      textParticles[i].originalY = height / 2;
      console.warn(`TextParticle ${i} missing target point for origin update!`);
    }
  }
}


// --- Vehicle Class (Modified show, behaviors, update) ---
class Vehicle {
  constructor(x, y, r = 1.5) {
    this.pos = createVector(random(width), random(-10, 0));
    this.target = createVector(x, y);
    this.vel = p5.Vector.random2D();
    this.acc = createVector();
    this.r = r + random(-0.5, 0.5); // Size variation
    this.maxspeed = 8; // Adjusted base max speed
    this.maxforce = 0.8; // Adjusted max force for smoother behavior
    // Individual brightness variation
    this.brightnessFactor = random(0.6, 1.0); // Factor to multiply verseColor brightness
    // <<< NEW: Gravity for falling effect >>>
    this.gravity = createVector(0, 0.6); // Downward force (adjust strength as needed)
    this.transitionMaxSpeed = 15; // Allow faster falling speed
    // <<< NEW: Horizontal drift during fall >>>
    this.horizontalDriftForce = createVector(random(-0.05, 0.05), 0);
  }

  behaviors() {
    // <<< MODIFIED: Only apply normal behaviors if NOT transitioning >>>
    if (!isTransitioning) {
      // --- Normal Behavior ---
      var arrive = this.arrive(this.target);
      var mouse = createVector(mouseX, mouseY);
      var flee = this.flee(mouse);

      arrive.mult(1.0);
      flee.mult(5.0); // Stronger flee

      this.applyForce(arrive);
      this.applyForce(flee);
    } else {
      // --- Transition Behavior (Falling) ---
      this.applyForce(this.gravity);
      // Add slight random horizontal push for variation
      this.applyForce(this.horizontalDriftForce);
      // Apply some drag so they don't accelerate indefinitely downwards
      this.vel.mult(0.99); // Slight drag
    }
  }

  applyForce(f) { this.acc.add(f); }

  update() {
    this.pos.add(this.vel);
    this.vel.add(this.acc);
    // Limit speed based on state
    this.vel.limit(isTransitioning ? this.transitionMaxSpeed : this.maxspeed);
    this.acc.mult(0); // Clear acceleration

    // --- Screen Wrapping ---
    if (isTransitioning) {
      // <<< REMOVED: Reset to top when falling off bottom >>>
      // if (this.pos.y > height + this.r * 2) { ... }

      // Wrap left/right (optional, keep if you like)
      if (this.pos.x < -this.r * 2) this.pos.x = width + this.r * 2;
      if (this.pos.x > width + this.r * 2) this.pos.x = -this.r * 2;

      // <<< REMOVED: Prevent going *above* the top during transition >>>
      // if (this.pos.y < -this.r * 2 && this.vel.y < 0) { ... }

    } else {
      // Normal behavior: No wrapping needed as 'arrive' keeps them in place
    }
  }

  // ... (show, arrive, flee methods remain the same) ...
  show() {
    noStroke();
    if (!verseColor) return; // Don't draw if color is invalid

    // Apply individual brightness variation
    let finalColor = lerpColor(color(0), verseColor, this.brightnessFactor);

    // Apply transition alpha
    let baseAlpha = alpha(finalColor); // Usually 255 unless verseColor has alpha
    // Use transitionAlphaMultiplier directly (calculated in calcTime)
    let currentParticleAlpha = baseAlpha * transitionAlphaMultiplier;
    finalColor.setAlpha(currentParticleAlpha);

    // <<< ADDED: Don't draw if completely off bottom during transition >>>
    if (isTransitioning && this.pos.y > height + this.r * 5) {
      return; // Stop drawing once well off screen
    }

    fill(finalColor);
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }

  arrive(target) {
    var desired = p5.Vector.sub(target, this.pos);
    var d = desired.mag();
    var speed = this.maxspeed;
    if (d < 100) { speed = map(d, 0, 100, 0, this.maxspeed); }
    desired.setMag(speed);
    var steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxforce);
    return steer;
  }

  flee(target) {
    var desired = p5.Vector.sub(target, this.pos);
    var d = desired.mag();
    if (d < 50) { // Flee radius
      desired.setMag(this.maxspeed);
      desired.mult(-1);
      var steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxforce * 1.5); // Stronger flee force
      return steer;
    } else { return createVector(0, 0); }
  }
}


// --- TextParticle Class (Modified draw, update) ---
class TextParticle {
  constructor(origX, origY) {
    this.originalX = origX;
    this.originalY = origY;
    this.x = random(width) + random(-2, 2);
    this.y = random(-5, 0);
    this.r = textParticleBaseRadius + random(-0.5, 0.5); // Size variation
    this.density = random(50) + 10; // Controls attraction/repulsion strength
    // Individual brightness variation
    this.brightnessFactor = random(0.6, 1.0); // Factor to multiply verseColor brightness
    // <<< MODIFIED: Renamed and adjusted fall speed >>>
    this.fallSpeed = random(5, 12); // Pixels per frame during transition (adjust as needed)
    this.horizontalDrift = random(-0.5, 0.5); // Slight side-to-side motion
  }

  draw() {
    noStroke();
    if (!verseColor) return; // Don't draw if color is invalid

    // Apply individual brightness variation
    let finalColor = lerpColor(color(0), verseColor, this.brightnessFactor);

    // Apply transition alpha
    let baseAlpha = alpha(finalColor); // Usually 255
    // Use transitionAlphaMultiplier directly
    let currentParticleAlpha = baseAlpha * transitionAlphaMultiplier;
    finalColor.setAlpha(currentParticleAlpha);

    // <<< ADDED: Don't draw if completely off bottom during transition >>>
    if (isTransitioning && this.y > height + this.r * 5) {
      return; // Stop drawing once well off screen
    }

    fill(finalColor);
    ellipse(this.x, this.y, this.r * 2);
  }

  update() {
    // <<< MODIFIED: Split behavior based on isTransitioning >>>
    if (isTransitioning) {
      // --- Transition Behavior (Falling) ---
      this.y += this.fallSpeed;
      this.x += this.horizontalDrift;

      // <<< REMOVED: Reset to top when falling off bottom >>>
      // if (this.y > height + this.r * 2) { ... }

      // Wrap left/right (optional, keep if you like)
      if (this.x < -this.r * 2) this.x = width + this.r * 2;
      if (this.x > width + this.r * 2) this.x = -this.r * 2;

    } else {
      // --- Normal Behavior (Only when NOT transitioning) ---
      let mouseDist = dist(this.x, this.y, mouseX, mouseY);
      let originDist = dist(this.x, this.y, this.originalX, this.originalY);

      // Mouse Repulsion
      if (mouseDist < textParticleImpactRange) {
        let repulsionAngle = atan2(this.y - mouseY, this.x - mouseX);
        let repulsionForce = map(mouseDist, 0, textParticleImpactRange, this.density * 0.8, 0);
        this.x += cos(repulsionAngle) * repulsionForce;
        this.y += sin(repulsionAngle) * repulsionForce;
      }
      // Attraction to Origin (if not repelled and far enough)
      else if (originDist > 0.5) {
        let attractionAngle = atan2(this.originalY - this.y, this.originalX - this.x);
        let attractionForce = originDist * 0.05; // Gentle pull
        this.x += cos(attractionAngle) * attractionForce;
        this.y += sin(attractionAngle) * attractionForce;
      }
    }
  }
}


// --- Noise Particle Class (Modified show for better contrast) ---
class NoiseParticle {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.vx = random(-0.2, 0.2);
    this.vy = random(-0.2, 0.2);
    this.noiseSize = random(noiseSizeMin, noiseSizeMax);
    // --- NEW: Fade properties ---
    this.currentVisibility = random(0, 1); // Start at random visibility
    this.targetVisibility = (random() > 0.5) ? 1 : 0; // Random initial target (1=visible, 0=invisible)
    this.timeUntilNextChange = millis() + random(noiseMinVisibleDuration, noiseMaxVisibleDuration); // When to flip target
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    // Wrap around screen edges
    if (this.x < -this.noiseSize) this.x = width + this.noiseSize;
    if (this.x > width + this.noiseSize) this.x = -this.noiseSize;
    if (this.y < -this.noiseSize) this.y = height + this.noiseSize;
    if (this.y > height + this.noiseSize) this.y = -this.noiseSize;
    // --- Visibility Update ---
    // Check if it's time to change target visibility
    if (millis() > this.timeUntilNextChange) {
      this.targetVisibility = 1 - this.targetVisibility; // Flip target (0 becomes 1, 1 becomes 0)
      this.timeUntilNextChange = millis() + random(noiseMinVisibleDuration, noiseMaxVisibleDuration); // Set time for next change
    }

    // Smoothly interpolate current visibility towards the target
    this.currentVisibility = lerp(this.currentVisibility, this.targetVisibility, noiseFadeSpeed);
    // Clamp visibility between 0 and 1 to avoid over/undershoot
    this.currentVisibility = constrain(this.currentVisibility, 0, 1);

  }

  show(bgColor) { // Pass the current *bottom* background color
    if (!(bgColor instanceof p5.Color)) { return; } // Skip if invalid color

    let n = noise(this.x * noiseScale * 0.8, this.y * noiseScale * 0.8, frameCount * noiseTimeScale);
    let perlinAlpha = map(n, 0, 1, 0, noiseAlphaMax);

    // --- Modulate Perlin alpha with current visibility ---
    let finalAlpha = perlinAlpha * this.currentVisibility;

    // Determine color based on background brightness for better contrast
    let bgBrightness = brightness(bgColor);
    let noiseColor;
    if (bgBrightness > 60) { // If background is relatively light
      // Make noise particle slightly darker than bg
      noiseColor = lerpColor(bgColor, color(0), 0.15); // Lerp towards black
    } else { // If background is dark
      // Make noise particle slightly lighter than bg
      noiseColor = lerpColor(bgColor, color(255), 0.15); // Lerp towards white
    }

    // Set fill using the calculated noise color and alpha
    fill(red(noiseColor), green(noiseColor), blue(noiseColor), finalAlpha);
    ellipse(this.x, this.y, this.noiseSize, this.noiseSize);
  }
}
